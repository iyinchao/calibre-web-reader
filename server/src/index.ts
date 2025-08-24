import express, { Request, Response } from 'express';
import * as dotenv from 'dotenv';
import path from 'path';
import { exec, locker } from './utils';

console.log('entered');

// --- Smart dotenv loading for development ---
// In development, we load .env.example first as a base, then override with .env.
// This ensures all required env vars have a default value.
// In production, variables are expected to be provided by the environment (e.g., Docker).
if (process.env.NODE_ENV === 'development') {
  // 1. Load base configuration from .env.example.
  dotenv.config({ path: path.resolve(__dirname, '../../.env.example') });

  // 2. Load user-specific overrides from .env.
  // The `override: true` flag ensures that any values in this file
  // will overwrite the base configuration from the previous step.
  dotenv.config({
    path: path.resolve(__dirname, '../../.env'),
    override: true,
  });
}

let calibreLibraryPath = '';
let calibreDbPath = '';
if (process.env.NODE_ENV === 'development') {
  if (process.env.CALIBRE_RUN_MODE === 'self') {
    calibreLibraryPath = process.env.SELF_CALIBRE_LIBRARY_PATH ?? '';
    calibreDbPath = process.env.SELF_CALIBRE_DB_PATH ?? 'calibredb';
  } else if (process.env.CALIBRE_RUN_MODE === 'DooD') {
    calibreLibraryPath = process.env.DOOD_CALIBRE_LIBRARY_PATH ?? '';
    calibreDbPath = process.env.DOOD_CALIBRE_DB_PATH ?? 'calibredb';
  } else {
    calibreLibraryPath = process.env.HOST_CALIBRE_LIBRARY_PATH ?? '';
    calibreDbPath = process.env.HOST_CALIBRE_DB_PATH ?? 'calibredb';
  }
} else {
  // for production:
  calibreLibraryPath = process.env.CALIBRE_LIBRARY_PATH ?? '';
  calibreDbPath = process.env.CALIBRE_DB_PATH ?? 'calibredb';
}

const app = express();
const port = process.env.SERVICE_PORT || 3000;

(async () => {
  // do pre-checks:
  // 1. check calibredb cli exists
  {
    const { code } = await exec(`${calibreDbPath} --version`, {
      stdio: 'pipe',
    });
    if (code !== 0) {
      console.error('Error: calibredb cli not found.');
      process.exit(1);
    } else {
      console.log(`✅ calibredb Command Path: ${calibreDbPath}`);
    }
  }
  // 2. check the calibrare library path exists
  {
    const { code } = await exec(`ls ${calibreLibraryPath}`, {
      stdio: 'pipe',
    });
    if (code !== 0 || !calibreLibraryPath) {
      console.error('Error: Calibre library path not found.');
      process.exit(1);
    }
  }
  // 3. check the calibre library is valid
  {
    const { code } = await exec(
      `${calibreDbPath} --with-library="${calibreLibraryPath}" list --for-machine`,
      {
        stdio: 'pipe',
      }
    );
    if (code !== 0) {
      console.error('Error: Calibre library is invalid.');
      process.exit(1);
    } else {
      console.log(`✅ Calibre Library Path: ${calibreLibraryPath}`);
    }
  }

  app.get('/api/list', async (req: Request, res: Response) => {
    await locker.wait('calibredb');
    locker.lock('calibredb');
    try {
      const { code, stdout, stderr } = await exec(
        `${calibreDbPath} --with-library="${calibreLibraryPath}" list --for-machine --fields=all`,
        { stdio: 'pipe' }
      ).finally(() => {
        locker.unlock('calibredb');
      });

      if (code !== 0) {
        res.status(500).send({
          ok: false,
          error: 'Get calibre db data failed.',
          errorDetail: `Code: ${code}\nMessage: ${stderr}`,
        });
        return;
      }

      try {
        const data = JSON.parse(stdout ?? '') ?? [];

        if (!Array.isArray(data)) {
          throw new Error('Failed to convert calibre db data');
        }

        // convert path to match api
        const convertdData = data.map(({ cover, formats, ...rest }) => {
          return {
            cover: path.resolve(
              '/api/library',
              path.relative(calibreLibraryPath, cover)
            ),
            formats:
              formats?.map((p: string) =>
                path.resolve(
                  '/api/library',
                  path.relative(calibreLibraryPath, p)
                )
              ) ?? [],
            ...rest,
          };
        });

        res.status(200).send(convertdData);
      } catch (e: unknown) {
        res.status(500).send({
          ok: false,
          error: (e as Error).message,
        });
      }
    } catch (e: unknown) {
      const typedError = e as { code: number; stderr: string };
      res.status(500).send({
        ok: false,
        error: 'Get calibre db data failed.',
        errorDetail: `Code: ${typedError.code}\nMessage: ${typedError.stderr}`,
      });
    }
  });

  app.use('/api/library', express.static(calibreLibraryPath));

  // Serve client files in production
  if (process.env.NODE_ENV === 'production') {
    const clientDistPath = path.join(__dirname, '../../client/dist');
    console.log(`Serving static files from: ${clientDistPath}`);

    app.use(express.static(clientDistPath));

    // For any other request, serve the index.html file
    // see: https://expressjs.com/en/guide/migrating-5.html#path-syntax
    app.get('/{*splat}', (req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  const server = app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Error: port ${port} is already in use.`);
      process.exit(1);
    }
  });
})().catch(e => {
  console.error(e);
});
