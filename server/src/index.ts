import express, { Request, Response } from 'express';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { exec as execRaw, execDooD, locker } from './utils';
import { ChildProcess } from 'child_process';
import { Stats } from 'fs';

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

let exec = execRaw;
if (process.env.CALIBRE_RUN_MODE === 'DooD') {
  console.log('Running in DooD mode');
  exec = (...args) => {
    return execDooD(
      process.env.DOOD_CALIBRE_WEB_CONTAINER ?? 'calibre-web',
      ...args
    );
  };
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

  // Middleware to handle both file serving and metadata requests for the library
  app.use(
    '/api/library',
    async (req: Request, res: Response, next: express.NextFunction) => {
      // Check for the meta query parameter
      if (req.query.meta === 'true') {
        const filePath = req.path; // req.path already contains the path part after /api/library
        if (!filePath) {
          return res.status(400).send({ error: 'File path is required.' });
        }

        // Prevent directory traversal attacks
        const safeFilePath = path
          .normalize(decodeURI(filePath))
          .replace(/^(\.\.[/\\])+/, '');
        const fullPath = path.join(calibreLibraryPath, safeFilePath);

        try {
          const stats = await fs.stat(fullPath);
          if (!stats.isFile()) {
            return res.status(404).send({ error: 'Path is not a file.' });
          }
          const size = stats.size;
          const format = path.extname(fullPath).replace('.', '');
          const fileBuffer = await fs.readFile(fullPath);
          const hash = crypto
            .createHash('sha256')
            .update(fileBuffer)
            .digest('hex');

          return res.status(200).send({
            size,
            format,
            bookHash: hash,
          });
        } catch (error: unknown) {
          if ((error as { code: string }).code === 'ENOENT') {
            return res.status(404).send({ error: 'File not found.' });
          }
          console.error(`Error processing file ${fullPath}:`, error);
          return res.status(500).send({ error: 'Internal server error.' });
        }
      } else {
        // If no meta query, pass to the next middleware (e.g., static file server)
        next();
      }
    }
  );

  if (
    process.env.CALIBRE_RUN_MODE === 'DooD' &&
    process.env.DOOD_CALIBRE_LIBRARY_FROM === 'outside'
  ) {
    app.get('/api/library/*filePath', async (req: Request, res: Response) => {
      const requestFilePath = Array.isArray(req.params.filePath)
        ? req.params.filePath.join('/')
        : req.params.filePath;
      const file = `${process.env.DOOD_CALIBRE_LIBRARY_PATH}/${requestFilePath}`;

      const processRef: { value?: ChildProcess } = {};
      exec(`cat "${file}"`, {
        processRef: processRef,
        stdio: 'pipe',
      });
      const ps = processRef.value;
      if (!ps || !ps.stdout) {
        res.status(500).send({
          ok: false,
          error: 'Failed to open file.',
          errorDetail: `Failed open file: ${file}.`,
        });
        return;
      }
      ps.stdout.on('error', () => {
        if (!res.headersSent) {
          res.status(500).send({
            ok: false,
            error: 'Failed reading file.',
            errorDetail: `Failed reading file: ${file}.`,
          });
        } else {
          res.end();
        }
      });
      ps.on('close', code => {
        if (code !== 0) {
          if (!res.headersSent) {
            res.status(404).send({
              ok: false,
              error: 'File not found or could not be read.',
              errorDetail: `Failed reading file: ${file}.`,
            });
          } else {
            res.end();
          }
        }
      });
      res.setHeader('Content-Type', 'application/octet-stream');
      ps.stdout.pipe(res);
    });
  } else {
    app.use('/api/library', express.static(calibreLibraryPath));
  }

  // Serve client files in production
  // if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../../client/dist');
  console.log(`Serving static files from: ${clientDistPath}`);

  app.use(express.static(clientDistPath));

  // For any other request, serve the index.html file
  // see: https://expressjs.com/en/guide/migrating-5.html#path-syntax
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
  // }

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
