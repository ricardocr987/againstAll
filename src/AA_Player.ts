import { Coordinate } from './types'

export class Player {
    public position: Coordinate = this.getInitialPosition()
    public baseLevel: number = 1
    public coldEffect: number = this.getColdEffect()
    public hotEffect: number = this.getHotEffect()

    constructor(
        public alias: string,
        public password: string
    ) {}

    public getInitialPosition(): Coordinate{
        return {
            x: Math.floor(Math.random() * 20) + 1, // posicion horizontal
            y: Math.floor(Math.random() * 20) + 1 // posicion vertical
        }
    }

    public getColdEffect(): number{
        return Math.floor(Math.random() * 20) - 10;
    }

    public getHotEffect(): number{
        return Math.floor(Math.random() * 20) - 10;
    }

    public moveN() { // si level = 0, throw error para terminar su partida y que no pueda moverse? preferible que se desconecte de la partida nada mas morir
        this.position.x - 1
    }

    public moveS() {
        this.position.x + 1
    }

    public moveW() {
        this.position.y - 1
    }

    public moveE() {
        this.position.y + 1
    }

    public moveNW() {
        this.position.x - 1
        this.position.y - 1
    }

    public moveNE() {
        this.position.x + 1
        this.position.y + 1
    }

    public moveSW() {
        this.position.x + 1
        this.position.y - 1
    }

    public moveSE() {
        this.position.x - 1
        this.position.y + 1
    }
}

// Crear instancia jugar en otro fichero
// export const player = new Player("NOMBRE", "PASSWORD")
// export default player
