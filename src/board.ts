import { randomIntFromInterval } from './utils/utils.js'
import { PlayerInfo, Coordinate } from './types.js'

export class GameBoard {
    public board: string[][] = this.getEmptyBoard()
    public filledBoard: boolean = false

    public getEmptyBoard(): string[][] {
        const board: string[][] = []

        for (let i = 0; i < 20; i++) { 
            board.push([' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',]) // row
        }

        return board
    }

    // fill map with mines and food
    public fillBoard () {
        const minesNumber = randomIntFromInterval(0, 30)
        const foodNumber = randomIntFromInterval(0, 30)

        for (let i = 0; i < minesNumber; i++) {
            const position = this.getFreeRandomPosition()
            this.modifyBoard('M', position)
        }

        for (let i = 0; i < foodNumber; i++) {
            const position = this.getFreeRandomPosition()
            this.modifyBoard('A', position)
        }

        this.filledBoard = true
        this.printBoard()
    }

    public fillCitiesBoard (cityInfo: Record<string, number>, cities: string[]) {
        for (let i = 0; i < 20; i++) {
            if (i < 10) {
                for(let j = 0; j < 20; j++) {
                    const position: Coordinate = { x: i, y: j }
                    if (j < 10) {
                        this.modifyCityBoard(cityInfo[cities[0]].toString(), position)
                    }
                    else {
                        this.modifyCityBoard(cityInfo[cities[1]].toString(), position)
                    }
                }
            }
            else {
                for(let j = 0; j < 20; j++) {
                    const position: Coordinate = { x: i, y: j }
                    if (j < 10) {
                        this.modifyCityBoard(cityInfo[cities[2]].toString(), position)
                    }
                    else {
                        this.modifyCityBoard(cityInfo[cities[3]].toString(), position)
                    }
                }
            }
        }
        this.printBoard()
    }

    // returns always a free coordinate
    public getFreeRandomPosition (): Coordinate {
        let position = {
            x: randomIntFromInterval(0,19),
            y: randomIntFromInterval(0,19) 
        }

        while(true) {
            if (this.board[position.x][position.y] === ' ') break
            position = {
                x: randomIntFromInterval(0,19),
                y: randomIntFromInterval(0,19)
            }
        }

        return position
    }

    // it overrides the content of a position by introducing the new content 
    public modifyBoard(toIntroduce: string, position: Coordinate, connectedPlayers?: Record<string, PlayerInfo>) { 
        this.board[position.x][position.y] = toIntroduce // modifies the content of the map
        if (connectedPlayers && connectedPlayers[toIntroduce]) connectedPlayers[toIntroduce].position = position // if the string is the player alias, also changes his position
        // position updated in the playersInfo map
    }

    // it overrides the content of a position by introducing the new content 
    public modifyCityBoard(toIntroduce: string, position: Coordinate) { 
        this.board[position.x][position.y] = toIntroduce // modifies the content of the map 
    }

    public setBoard(map: string[][]) {
        this.board = map
    }

    public printBoard() {
        console.table(this.board)
    }
}