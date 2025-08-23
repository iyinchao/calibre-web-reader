import express, { Request, Response } from 'express';
import * as dotenv from 'dotenv';
import path from 'path';
import { exec, locker } from './utils';

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const calibreLibraryPath = process.env.CALIBRE_LIBRARY_PATH;
const calibreDbPath = process.env.CALIBRE_DB_PATH;

(async () => {
  // do pre-checks:
  // 1. check calibredb cli exists
  {
    const { code } = await exec(`${calibreDbPath} --version`, {
      stdio: 'pipe',
    });
    if (code !== 0) {
      console.error(
        'Error: calibredb cli not found, please check CALIBRE_DB_PATH in your .env file.'
      );
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
      console.error(
        'Error: Calibre library path not found, please check CALIBRE_LIBRARY_PATH in your .env file.'
      );
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
      console.error(
        'Error: Calibre library is not valid, please check CALIBRE_LIBRARY_PATH in your .env file.'
      );
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
    const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
    console.log(`Serving static files from: ${clientDistPath}`);

    app.use(express.static(clientDistPath));

    // For any other request, serve the index.html file
    app.get('*', (req, res) => {
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
})();
