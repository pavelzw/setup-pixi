import fs from 'fs/promises'
import path from 'path'
import * as os from 'os'
import * as core from '@actions/core'
import { options } from './options'

const removeEmptyParentDirs = (dirPath: string): Promise<void> => {
  return fs.readdir(dirPath).then((files) => {
    if (files.length === 0) {
      core.debug(`Removing empty directory ${dirPath}.`)
      return fs.rm(dirPath, { recursive: true }).then(() => {
        const parentDir = path.dirname(dirPath)
        if (parentDir !== dirPath) {
          return removeEmptyParentDirs(parentDir)
        }
      })
    }
    return Promise.resolve()
  })
}

const cleanupPixiBin = () => {
  const pixiBinPath = options.pixiBinPath
  const pixiBinDir = path.dirname(pixiBinPath)
  core.debug(`Cleaning up pixi binary ${pixiBinPath}.`)
  return fs.rm(pixiBinPath).then(() => removeEmptyParentDirs(pixiBinDir))
}

const cleanupEnv = () => {
  if (!options.runInstall) {
    core.debug('Skipping cleanup of .pixi directory.')
    return Promise.resolve()
  }
  const envDir = path.join(path.dirname(options.manifestPath), '.pixi')
  core.debug(`Cleaning up .pixi directory ${envDir}.`)
  return fs.rm(envDir, { recursive: true })
}

const determineCacheDir = () => {
  // rattler uses dirs::cache_dir https://docs.rs/dirs/latest/dirs/fn.cache_dir.html
  if (os.platform() === 'win32') {
    return process.env.LOCALAPPDATA!
  }
  if (os.platform() === 'linux') {
    return process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache')
  }
  return path.join(os.homedir(), 'Library', 'Caches')
}

const cleanupRattler = () => {
  const rattlerPath = path.join(os.homedir(), '.rattler')
  const cacheDir = determineCacheDir()
  const rattlerCachePath = path.join(cacheDir, 'rattler')
  core.debug(`Cleaning up rattler directories ${rattlerPath} and ${rattlerCachePath}.`)
  return Promise.all([
    fs.rm(rattlerPath, { recursive: true, force: true }),
    fs.rm(rattlerCachePath, { recursive: true, force: true })
  ])
}

const run = () => {
  const postCleanup = options.postCleanup
  if (postCleanup) {
    return Promise.all([cleanupPixiBin(), cleanupEnv(), cleanupRattler()])
  }
  core.debug('Skipping post-cleanup.')
  return Promise.resolve()
}

run()
