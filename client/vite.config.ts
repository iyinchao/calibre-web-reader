import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';
import { execSync } from 'child_process';
import path from 'path';
import chokidar from 'chokidar';
import { glob } from 'node:fs/promises';

const foliateJsDir = path.resolve(__dirname, '3rdparty/foliate-js');
const outputDir = path.resolve(__dirname, 'public/3rdparty/foliate-js');

function installFoliateJs() {
  console.log('Installing foliate-js...');
  try {
    execSync('npm install', {
      cwd: foliateJsDir,
      stdio: 'inherit',
    });
    console.log('foliate-js install complete.');
  } catch (error) {
    console.error('Failed to install foliate-js:', error);
  }
}

function buildFoliateJs() {
  console.log('Building foliate-js...');
  try {
    execSync('pnpm run build', {
      cwd: foliateJsDir,
      stdio: 'inherit',
    });
    execSync(`mkdir -p ${outputDir}/ui`, { stdio: 'inherit' });
    execSync(`cp ${foliateJsDir}/*.js ${outputDir}/`, { stdio: 'inherit' });
    execSync(`cp ${foliateJsDir}/ui/*.js ${outputDir}/ui/`, {
      stdio: 'inherit',
    });
    execSync(`cp -r ${foliateJsDir}/vendor ${outputDir}/`, {
      stdio: 'inherit',
    });
    console.log('foliate-js build and copy complete.');
  } catch (error) {
    console.error('Failed to build foliate-js:', error);
  }
}

function foliateJsPlugin(): Plugin {
  return {
    name: 'vite-plugin-foliate-js',
    async buildStart() {
      installFoliateJs();
      // if (process.env.NODE_ENV === 'production') {
      buildFoliateJs();
      // }
    },
    // TODO: watch & rebuild
    // TODO: compress foliate
    async configureServer(server) {
      const watchPaths = [
        path.join(foliateJsDir, 'rollup/*.js'),
        path.join(foliateJsDir, 'ui/*.js'),
        path.join(foliateJsDir, '*.js'),
      ];

      const watcher = chokidar.watch(await Array.fromAsync(glob(watchPaths)), {
        awaitWriteFinish: true,
        ignoreInitial: true,
      });

      watcher
        .on('ready', () => {
          console.log('Initial scan complete. Watching for changes in:');
          console.log(watcher.getWatched());
        })
        .on('error', error => {
          console.error('Watcher error:', error);
        });

      const handleFileChange = (filePath: string) => {
        console.log(`File changed: ${filePath}. Rebuilding foliate-js...`);
        buildFoliateJs();
        server.ws.send({
          type: 'full-reload',
          path: '*',
        });
      };

      watcher.on('add', handleFileChange).on('change', handleFileChange);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [UnoCSS(), react(), foliateJsPlugin()],
    server: {
      proxy: {
        // Proxy all API requests to the backend server
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
