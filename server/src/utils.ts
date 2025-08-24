import path from 'node:path';
import {
  ChildProcess,
  spawn,
  SpawnOptions,
  SpawnOptionsWithoutStdio,
} from 'node:child_process';

const _rootDir = path.join(__dirname, '../..');

/* path helpers */
export const resolve = (...args: string[]) => {
  const paths = path.join(...args);
  if (path.isAbsolute(paths)) {
    return paths;
  }

  return path.join(_rootDir, paths);
};

export const exec = async function exec(
  command: string,
  options?: {
    dry?: boolean;
    cwd?: string;
    stdio?: 'inherit' | 'pipe';
    spawnOption?: SpawnOptions;
    processRef?: {
      value?: ChildProcess;
    };
    throwOnError?: boolean;
  }
) {
  return new Promise<{ code: number | null; stdout?: string; stderr?: string }>(
    (resolveFunc, rejectFunc) => {
      let hasError = false;

      const opt = {
        dry: false,
        cwd: resolve('.'),
        stdio: 'inherit' as const,
        spawnOption: {},
        processRef: null,
        throwOnError: false,
        ...options,
      };

      const spawnOpt = {
        shell: true,
        cwd: opt.cwd,
        stdio: opt.stdio,
        ...opt.spawnOption,
      };

      if (opt.dry) {
        console.log('[DRY RUN]:', command);
        if (opt.stdio === 'pipe') {
          resolveFunc({ code: 0, stdout: '', stderr: '' });
        } else {
          resolveFunc({ code: 0 });
        }

        return;
      }

      const ps = spawn(command, [], spawnOpt);

      if (opt.processRef) {
        opt.processRef.value = ps;
      }

      let stdoutStr = '';
      let stderrStr = '';
      if (opt.stdio === 'pipe') {
        ps.stdout?.on('data', data => {
          stdoutStr += data.toString();
        });
        ps.stderr?.on('data', data => {
          stderrStr += data.toString();
        });
      }

      ps.on('error', data => {
        hasError = true;
        console.error(data);
      });

      ps.on('exit', code => {
        let res: {
          code: number | null;
          stdout?: string;
          stderr?: string;
        } = { code };
        if (opt.stdio === 'pipe') {
          res = {
            code,
            stdout: stdoutStr,
            stderr: stderrStr,
          };
        }
        if (opt.throwOnError === false) {
          resolveFunc(res);
        } else {
          if (code === 0 && !hasError) {
            resolveFunc(res);
          } else {
            rejectFunc(res);
          }
        }
      });
    }
  );
};

const lockMap = new Map<
  string,
  { promise: Promise<void>; resolve: () => void }
>();
export const locker = {
  lock: (key: string) => {
    let resolve: () => void = () => {};
    const promise = new Promise<void>(res => {
      resolve = res;
    }).then(() => {
      lockMap.delete(key);
    });
    lockMap.set(key, {
      promise,
      resolve,
    });
  },
  unlock: (key: string) => {
    const lockItem = lockMap.get(key);
    if (lockItem) {
      lockItem.resolve();
      return lockItem.promise;
    }
    return Promise.resolve();
  },
  isLocked: (key: string) => {
    return lockMap.has(key);
  },
  wait: (key: string) => {
    return lockMap.get(key)?.promise ?? Promise.resolve();
  },
};
