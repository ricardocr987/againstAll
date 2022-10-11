import { PathLike } from 'fs'
import path from 'path'

export class Paths {
  constructor(readonly root: PathLike) {}

  get rootDir() {
    return this.root.toString()
  }

  get dataDir() {
    return path.join(this.rootDir.toString(), 'data')
  }

  dataFile(name: string) {
    return path.join(this.dataDir, `${name}.json`)
  }
}
