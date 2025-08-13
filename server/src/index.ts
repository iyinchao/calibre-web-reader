import express, { Request, Response } from 'express'
import * as dotenv from 'dotenv'
import { exec } from './utils'

// Load environment variables from .env file
dotenv.config()

const app = express()
const port = process.env.PORT || 3000

const calibreLibraryPath = process.env.CALIBRE_LIBRARY_PATH
const calibreDbPath = process.env.CALIBRE_DB_PATH

;(async () => {
  // do pre-checks:
  // 1. check calibredb cli exists
  {
    const { code } = await exec(`${calibreDbPath} --version`, {
      stdio: 'pipe',
    })
    if (code !== 0) {
      console.error(
        'Error: calibredb cli not found, please check CALIBRE_DB_PATH in your .env file.'
      )
      process.exit(1)
    } else {
      console.log(`✅ calibredb Command Path: ${calibreDbPath}`)
    }
  }
  // 2. check the calibrare library path exists
  {
    const { code } = await exec(`ls ${calibreLibraryPath}`, {
      stdio: 'pipe',
    })
    if (code !== 0 || !calibreLibraryPath) {
      console.error(
        'Error: Calibre library path not found, please check CALIBRE_LIBRARY_PATH in your .env file.'
      )
      process.exit(1)
    }
  }
  // 3. check the calibre library is valid
  {
    const { code } = await exec(
      `${calibreDbPath} --with-library="${calibreLibraryPath}" list --for-machine`,
      {
        stdio: 'pipe',
      }
    )
    if (code !== 0) {
      console.error(
        'Error: Calibre library is not valid, please check CALIBRE_LIBRARY_PATH in your .env file.'
      )
      process.exit(1)
    } else {
      console.log(`✅ Calibre Library Path: ${calibreLibraryPath}`)
    }
  }

  app.get('/api/list', async (req: Request, res: Response) => {
    const { code, stdout } = await exec(
      `${calibreDbPath} --with-library="${calibreLibraryPath}" list --for-machine --fields=all`,
      { stdio: 'pipe' }
    )
    res.send(stdout)
  })

  app.use('/library', express.static(calibreLibraryPath))

  const server = app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`)
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Error: port ${port} is already in use.`)
      process.exit(1)
    }
  })
})()
