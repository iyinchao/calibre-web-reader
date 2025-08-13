import path from 'node:path'
import {
  ChildProcess,
  spawn,
  SpawnOptions,
  SpawnOptionsWithoutStdio,
} from 'node:child_process'

const _rootDir = path.join(__dirname, '../..')

/* path helpers */
export const resolve = (...args: string[]) => {
  const paths = path.join(...args)
  if (path.isAbsolute(paths)) {
    return paths
  }

  return path.join(_rootDir, paths)
}

export const exec = async function exec(
  command: string,
  options?: {
    dry?: boolean
    cwd?: string
    stdio?: 'inherit' | 'pipe'
    spawnOption?: SpawnOptions
    processRef?: {
      value?: ChildProcess
    }
  }
) {
  return new Promise<{ code: number | null; stdout?: string; stderr?: string }>(
    (resolveFunc, rejectFunc) => {
      let hasError = false

      const opt = {
        dry: false,
        cwd: resolve('.'),
        stdio: 'inherit' as const,
        spawnOption: {},
        processRef: null,
        ...options,
      }

      const spawnOpt = {
        shell: true,
        cwd: opt.cwd,
        stdio: opt.stdio,
        ...opt.spawnOption,
      }

      if (opt.dry) {
        console.log('[DRY RUN]:', command)
        if (opt.stdio === 'pipe') {
          resolveFunc({ code: 0, stdout: '', stderr: '' })
        } else {
          resolveFunc({ code: 0 })
        }

        return
      }

      const ps = spawn(command, [], spawnOpt)

      if (opt.processRef) {
        opt.processRef.value = ps
      }

      let stdoutStr = ''
      let stderrStr = ''
      if (opt.stdio === 'pipe') {
        ps.stdout?.on('data', data => {
          stdoutStr += data.toString()
        })
        ps.stderr?.on('data', data => {
          stderrStr += data.toString()
        })
      }

      ps.on('error', data => {
        hasError = true
        console.error(data)
      })

      ps.on('exit', code => {
        let res: {
          code: number | null
          stdout?: string
          stderr?: string
        } = { code }
        if (opt.stdio === 'pipe') {
          res = {
            code,
            stdout: stdoutStr,
            stderr: stderrStr,
          }
        }
        if (code === 0 && !hasError) {
          resolveFunc(res)
        } else {
          rejectFunc(res)
        }
      })
    }
  )
}
