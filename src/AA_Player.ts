import { PlayerEvents, PlayerStream } from './types.js'
import { intialAnswerSet, menuAnswerSet, movementSet } from './utils.js'
import { KafkaUtil } from './kafka.js'
import { config } from './config.js'
import { CommonPlayer } from './CommonPlayer.js'
import { Socket } from 'net'
import promptSync, { Prompt } from 'prompt-sync'
import { v4 as uuid } from 'uuid'

export class Player extends CommonPlayer {
    // Used to manage the user answers
    public prompt: Prompt = promptSync() // use to register the user inputs
    public answer: string = ''
    public password: string = ''

    // to create the player instance is needed the IPs and ports of the registry, engine and kafka
    constructor( 
        public ENGINE_HOST: string,
        public ENGINE_PORT: number,

        public REGISTRY_HOST: string,
        public REGISTRY_PORT: number,

        KAFKA_HOST: string,
        KAFKA_PORT: number,
    ) {
        super(KAFKA_HOST, KAFKA_PORT)
    }

    public async initUser(){
        while(!intialAnswerSet.has(this.answer)) {
            console.log('Are you already registered?: [y/n]')
            this.answer = this.prompt('')
        }
        this.askUserInfo()
        if(this.answer === 'n') this.startConnectionRegistry() // if he isnt registered, you are connected to the registry
        if(this.answer === 'y') this.startConnectionEngine() // if he is, he is connected to the registry
    }

    // alias & password ask
    public askUserInfo(){ 
        console.log('Introduce your username: ')
        this.playerInfo.alias = this.prompt('')
        console.log('Introduce your password: ')
        this.password = this.prompt('')
    }

    // clean of some properties filled before
    public clearInfo() {
        this.playerInfo.alias = ''
        this.password = ''
        this.answer = ''
    }

    public showMenu() {
        while(!menuAnswerSet.has(this.answer)){
            console.log('Menu:\n 1. Edit Profile \n 2. Join to a game \n 3. END')
            this.answer = this.prompt('')
            if (!menuAnswerSet.has(this.answer)) console.log('Please introduce 1,2 or 3')
        }
    }

    public startConnectionRegistry(fromEngine?: boolean) {
        console.log(`Connecting to ${this.REGISTRY_HOST}:${this.REGISTRY_PORT}`) 
        try {
            const socket = new Socket()
            socket.connect(this.REGISTRY_PORT, this.REGISTRY_HOST)
            socket.setEncoding('utf-8')
        
            socket.on('connect', () => {
                console.log(`Connected to Registry`) 

                // if it is called from Engine it is to edit the user, if not the user wants to register
                // the authentication (login) has to be done by engine, so the registry is only used to create/edit an account
                // we send to the server the event, alias and password in both cases
                if(fromEngine){
                    socket.write(`${PlayerEvents.EDIT_PROFILE}:${this.playerInfo.alias}:${this.password}`)
                }
                else {
                    socket.write(`${PlayerEvents.SIGN_UP}:${this.playerInfo.alias}:${this.password}`)
                }

                socket.on('data', (data) => { // here is entered when the player receives information from registry
                    if(data.toString().includes('OK')){ // if the message includes an OK it shows the menu, otherwise it is because an error has occurred and has to be handled
                        this.showMenu()
                        switch(this.answer){
                            case '1':
                                this.askUserInfo()
                                socket.write(`${PlayerEvents.EDIT_PROFILE}:${this.playerInfo.alias}:${this.password}`)
                                this.showMenu() // is needed because if not will enter in a infite loop, is needed to change this.answer variable
                                break
                            default: // if he wants to start a game, he will be disconnected from the registry and connected to the engine
                                this.endSocket(socket)
                        }
                    }
                    else { // handling of the error
                        const [event, _, errorMessage] = data.toString().split(':') // I create a vector of the server response, each position is splitted when it appears a : in the string
                        console.log(`[${event}]:${errorMessage}`)

                        this.endSocket(socket) // will finish the communication, but the execution will continue in socket('close... (below)
                    }
                }) 
            }) 
        
            socket.on('close', async () => { // when connection termination is confirmed (server response), after endSocket function 
                switch(this.answer){
                    case '2': // if it has arrived here it is because the player wants to play
                        await this.joinGame()
                        break
                    case '3':  // if it has arrived here it is because the player wants to close the connection
                        // Client sends END, Server confirms completion, Client kills process, here we kill the client process
                        console.log('Disconnected from Registry')
                        process.exit(0) // we kill the client process
                    default: // if it has arrived here it is because an error has occurred from the server, we restart the connection
                        this.clearInfo()
                        this.initUser()
                }
            }) 
        }
        catch(e) {
            console.log('Error: Could not connect to Registry server')
        }
    }

    public startConnectionEngine() { // function that allows connection to the server engine, only for authentication
        console.log(`Connecting to ${this.ENGINE_HOST}:${this.ENGINE_PORT}`) 
        try {
            const socket = new Socket() 
            socket.connect(this.ENGINE_PORT, this.ENGINE_HOST) 
            socket.setEncoding('utf-8') 

            socket.on('connect', () => {
                console.log(`Connected to Engine`) 
                socket.write(`${PlayerEvents.SIGN_IN}:${this.playerInfo.alias}:${this.password}`)
            
                socket.on('data', (data) => {
                    if(data.toString().includes('OK')){
                        this.showMenu()
                        this.endSocket(socket) // in all the menu posibilities, will end the socket connection
                    }
                    else {
                        const [event, _, errorMessage] = data.toString().split(':') // creates a vector of the server response, each position is splitted when it appears a : in the string
                        console.log(`[${event}]:${errorMessage}`)

                        if (errorMessage == 'NO_SPACE') {
                            console.log('Introduce a PORT to join another Engine instance:')
                            this.ENGINE_PORT = Number(this.prompt(''))
                            this.answer = 'CONNECT_OTHER_ENGINE'
                        }
                        this.endSocket(socket)
                    }
                }) 
            }) 
        
            socket.on('close', async () => { // when connection termination is confirmed (server response), after endSocket function
                switch(this.answer){
                    case 'CONNECT_OTHER_ENGINE':
                        this.startConnectionEngine()
                    break
                    case '1': // if it has arrived here it is because the player wants to edit the profile
                        this.startConnectionRegistry(true)
                        break
                    case '2': // if it has arrived here it is because the player wants to play
                        await this.joinGame()
                        break
                    case '3':  // if it has arrived here it is because the player wants to close the connection
                    // Client sends END, Server confirms completion, Client kills process, here we kill the client process
                        console.log('Disconnected from Engine (authentication)') 
                        process.exit(0) // we kill the client process
                    default: // if it has arrived here it is because an error has occurred from the server, we restart the connection
                        this.clearInfo()
                        this.initUser()
                }
            })
        }
        catch(e) {
            console.log('Error: Could not connect to Engine server')
        }
    }

    // used in the different circumstances to finish the socket communication
    public endSocket(socket: Socket){
        socket.write(PlayerEvents.END)
        socket.end()
    }

    public async newMomevent(kafka: KafkaUtil) {
        while(!movementSet.has(this.answer)){
            console.log('Introduce a movement [N, S, W, E, NW, NE, SW, SE]: ')
            this.answer = this.prompt('')
            if (!movementSet.has(this.answer)) console.log('Please introduce N, S, W, E, NW, NE, SW or SE')
        }

        this.changePosition(this.answer)
        this.answer = '' // because the upper while

        const event: PlayerStream = {
            id: uuid(),
            event: PlayerEvents.NEW_POSITION,
            playerInfo: this.playerInfo
        }

        console.log(this.playerInfo)

        await kafka.sendRecord(event)
    }
}

async function main() {
    const ENGINE_SERVER_HOST = config.ENGINE_SERVER_HOST || 'localhost' // aqui se escribira la ip del ordenador donde este lanzado el server (engine & registry), pero si lo haces todo desde el mismo pc en diferentes terminales es localhost
    const ENGINE_SERVER_PORT = Number(config.ENGINE_SERVER_PORT) || 5886

    const REGISTRY_SERVER_HOST = config.REGISTRY_SERVER_HOST || 'localhost'
    const REGISTRY_SERVER_PORT = Number(config.REGISTRY_SERVER_PORT) || 6579

    const KAFKA_HOST = config.KAFKA_HOST || 'localhost'
    const KAFKA_PORT = Number(config.KAFKA_PORT) || 9092 // docker-compose (KAFKA_LISTENERS)

    const player = new Player(ENGINE_SERVER_HOST, ENGINE_SERVER_PORT, REGISTRY_SERVER_HOST, REGISTRY_SERVER_PORT, KAFKA_HOST, KAFKA_PORT)
    await player.initUser()
}

await main()