import { PathLike } from 'fs'
import path from 'path'

class Paths {
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

export const paths: Paths = new Paths(`./`) // is simply an object to make it easy to get the path to e.g. the database

export function randomIntFromInterval(min: number, max: number) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) )
}

export const intialAnswerSet: Set<string> = new Set<string>(['y', 'n'])
export const menuAnswerSet: Set<string> = new Set<string>(['1', '2', '3', '4'])
export const movementSet: Set<string> = new Set<string>(['N', 'S', 'W', 'E', 'NW', 'NE', 'SW', 'SE'])
export const movementsArray: string[] = ['N', 'S', 'W', 'E', 'NW', 'NE', 'SW', 'SE']
