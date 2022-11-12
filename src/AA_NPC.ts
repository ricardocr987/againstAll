import { Coordinate, NPCInfo, NpcEvents } from './types.js'
import { Socket } from 'net'
import promptSync, { Prompt } from 'prompt-sync'


export class NPC{
    public position: Coordinate
    public level: number
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
            x: this.randomIntFromInterval(0,19), // posicion horizontal
            y: this.randomIntFromInterval(0,19) // posicion vertical
        }
        this.level = Math.random() * 20 
        this.alias = 0
        this.action = 0
    }

    public initNPC(){
        while(!this.intialAnswerSet.has(this.answer)) this.answer = this.prompt("Do you want to add a new NPC?: [y/n]")
        this.alias=this.alias++
        //if(this.answer === 'n') this.startConnectionRegistry() // si no esta registrado se conecta al registry
        if(this.answer === 'y') this.startConnectionEngine() // si lo esta se conecta al engine directamente
    }

    public clearInfo(){
        this.level = 0
        this.answer = ''
    }

    public endSocket(socket: Socket){
        socket.write(NpcEvents.END)
        socket.end()
    }

    public startConnectionEngine(fromRegistry?: boolean) { // funcion que permite la conexion con el server engine
        console.log(`Connecting to ${this.BROKER_HOST}:${this.BROKER_PORT}`) 

        const socket = new Socket() 
        socket.connect(this.BROKER_PORT, this.BROKER_HOST) 
        socket.setEncoding("utf-8") 

        socket.on("connect", () => {
            console.log(`Connected to Engine`) 

            if(fromRegistry){
                this.answer = '2'
                this.endSocket(socket)
            }
            else {
                socket.write(`${NpcEvents.SING_IN}:${this.alias}:${this.level}`)
            }
        
            socket.on("data", (data) => {
                if(data.toString().includes("OK")){
                    this.joinGame()
                    switch(this.answer){
                        case '2': 
                            this.endSocket(socket)
                            break
                        default:
                            this.endSocket(socket)
                            break
                    }
                }
                else {
                    const [event, _, errorMessage] = data.toString().split(':') // creamos un vector de la respuesta del server
                    console.log(`[${event}]:${errorMessage}`)
                    this.endSocket(socket)
                }
            }) 
        }) 
      
        socket.on("close", () => { // cuando se confirma la finalizacion de la conexion (respuesta del servidor), matamos el proceso del cliente. Es decir: Cliente manda END, Servidor confirma finalizacion, se mata el proceso del cliente 
            switch(this.answer){
                case '1': // si ha llegado aqui es porque el jugador quiere editar perfil
                
                    break
                case '2':
                    this.joinGame()
                case '3':  // si ha llegado aqui es porque el jugador quiere cerrar la conexion
                    console.log("Disconnected from Engine") 
                    process.exit(0) // matamos el proceso del cliente. Es decir: Cliente manda END, Servidor confirma finalizacion, Cliente mata proceso
                default: // si ha llegado aqui es porque ha saltado algun error desde el servidor, reiniciamos todo el proceso
                    this.clearInfo()
                    this.initNPC()
            }
        }) 
    }

    public joinGame(){

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

    public get NPC(): NPCInfo{
        return{
            alias: this.alias,
            level: this.level
        }
    }

    public randomIntFromInterval(min: number, max: number) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min)
    }
}

function main() {
    const BROKER_HOST = "localhost" // aqui se escribira la ip del ordenador donde este lanzado el server (engine & registry), pero si lo haces todo desde el mismo pc en diferentes terminales es localhost
    const BROKER_PORT = 5670

    const npc = new NPC(BROKER_HOST, BROKER_PORT)
    npc.initNPC()
}

main()