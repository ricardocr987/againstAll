import { Coordinate, PlayerInfo, PlayerEvents } from './types.js'
import promptSync, { Prompt } from 'prompt-sync'
import { KafkaUtil } from './kafka.js'


export class NPC{
    public position: Coordinate
    public baseLevel: number
    public alias: number 
    public action: number
    public answer: string = ''
    public prompt: Prompt = promptSync()
    public intialAnswerSet: Set<string> = new Set<string>(['y', 'n'])
    public movementSet: Set<string> = new Set<string>(['N', 'S', 'W', 'E', 'NW', 'NE', 'SW', 'SE'])

    constructor(
        public BROKER_HOST: string,
        public BROKER_PORT: number
    ){
        this.position = {
            x: Math.floor(Math.random() * 20) + 1, // posicion horizontal
            y: Math.floor(Math.random() * 20) + 1 // posicion vertical
        }
        this.baseLevel = Math.random() * 20 
        this.alias = 0
        this.action = 0
    }

    public initNPC(){
        while(!this.intialAnswerSet.has(this.answer)) this.answer = this.prompt("Do you want to add a new NPC?: [y/n]")
        this.alias=this.alias++
        //if(this.answer === 'n') this.startConnectionRegistry() // si no esta registrado se conecta al registry
        //if(this.answer === 'y') this.startConnectionEngine() // si lo esta se conecta al engine directamente
    }

    public movement(){
        while(!this.movementSet.has(this.answer)){
            this.action = Math.random()*8
        }
        switch(this.action){
            case 0:
                this.moveN()
                break
            case 1:
                this.moveS()
                break
            case 2:
                this.moveW()
                break
            case 3:
                this.moveE()
                break
            case 4:
                this.moveNW()
                break
            case 5:
                this.moveNE()
                break
            case 6:
                this.moveSW()
                break
            case 7:
                this.moveSE()
                break
        }
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

function main() {
    const BROKER_HOST = "localhost" // aqui se escribira la ip del ordenador donde este lanzado el server (engine & registry), pero si lo haces todo desde el mismo pc en diferentes terminales es localhost
    const BROKER_PORT = 5670

    const npc = new NPC(BROKER_HOST, BROKER_PORT)
    npc.initNPC()
}

main()