import { PlayerEvents, PlayerStream, RegistryEvents } from './types.js'
import { intialAnswerSet, menuAnswerSet, movementSet } from './utils/utils.js'
import { KafkaUtil } from './utils/kafka.js'
import { config } from './utils/config.js'
import { CommonPlayer } from './CommonPlayer.js'
import { Socket } from 'net'
import prompts from 'prompts'
import { v4 as uuid } from 'uuid'

export class Player extends CommonPlayer {
    // Used to manage the user answers
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
            const response = await prompts({
                type: 'text',
                name: 'char',
                message: `Are you already registered?: [y/n]`,
            })
            this.answer = response.char
            if (!intialAnswerSet.has(this.answer)) console.log('Please introduce y or n')
        }
        await this.askUserInfo()
        if(this.answer === 'n') {
            const response = await prompts({
                type: 'text',
                name: 'char',
                message: `Do you want to join a game as a guest?: [y/n]`,
            })
            if(response.char == 'y') {
                this.startConnectionRegistry() // if he isnt registered, you are connected to the registry
            }
            else {
                this.joinGame(true) // if he is, he is connected to the registry
            }
        } 
        if(this.answer === 'y') this.startConnectionEngine() // if he is, he is connected to the registry
    }

    // alias & password ask
    public async askUserInfo(){ 
        const aliasResponse = await prompts({
            type: 'text',
            name: 'alias',
            message: `Introduce your username: `,
        })
        const pswResponse = await prompts({
            type: 'text',
            name: 'password',
            message: `Introduce your password: `,
        })
        this.playerInfo.alias = aliasResponse.alias
        this.password = pswResponse.password
    }

    // clean of some properties filled before
    public clearInfo() {
        this.playerInfo.alias = ''
        this.password = ''
        this.answer = ''
    }

    public async showMenu() {
        while(!menuAnswerSet.has(this.answer)){
            const response = await prompts(  {
                type: 'text',
                name: 'char',
                message: `Menu:\n 1. Edit Profile \n 2. Join to a game \n 3. END \n 4. Delete Profile \n`,
            })
            this.answer = response.char
            if (!menuAnswerSet.has(this.answer)) console.log('Please introduce 1,2,3 or 4')
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

                socket.on('data', async (data) => { // here is entered when the player receives information from registry
                    console.log(data)
                    if(data.toString().includes('OK')){ // if the message includes an OK it shows the menu, otherwise it is because an error has occurred and has to be handled
                        if(data.toString() === RegistryEvents.DELETE_PROFILE_OK) {
                            this.endSocket(socket)
                            process.exit(0)
                        }
                        if(data.toString() === RegistryEvents.EDIT_PROFILE_OK) {
                            await this.showMenu()
                            this.endSocket(socket)
                        }
                        else{
                            await this.showMenu()
                            switch(this.answer){
                                case '1':
                                    await this.askUserInfo()
                                    socket.write(`${PlayerEvents.EDIT_PROFILE}:${this.playerInfo.alias}:${this.password}`)
                                    this.answer = ''
                                    break
                                case '4':
                                    socket.write(`${PlayerEvents.DELETE_PROFILE}:${this.playerInfo.alias}:${this.password}`)
                                    break
                                default:
                                    this.endSocket(socket)
                                    break
                            }
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
                    case '4':  // if it has arrived here it is because the player wants to close the connection
                        // Client sends END, Server confirms completion, Client kills process, here we kill the client process
                        console.log('Disconnected from Registry')
                        process.exit(0) // we kill the client process
                    default: // if it has arrived here it is because an error has occurred from the server, we restart the connection
                        this.clearInfo()
                        this.initUser()
                }
            })

            socket.on('error', () => {
                console.log('Error: Could not connect to Registry server')
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
            
                socket.on('data', async (data) => {
                    if(data.toString().includes('OK')){
                        await this.showMenu()
                        this.endSocket(socket) // in all the menu posibilities, will end the socket connection
                    }
                    else {
                        const [event, _, errorMessage] = data.toString().split(':') // creates a vector of the server response, each position is splitted when it appears a : in the string
                        console.log(`[${event}]:${errorMessage}`)

                        if (errorMessage == 'NO_SPACE') {
                            const response = await prompts(  {
                                type: 'text',
                                name: 'port',
                                message: `Introduce a PORT to join another Engine instance:`,
                            })
                            this.ENGINE_PORT = Number(response.port)
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

            socket.on('error', () => {
                console.log('Error: Could not connect to Engine server')
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
            const response = await prompts({
                type: 'text',
                name: 'mov',
                message: `Introduce a movement [N, S, W, E, NW, NE, SW, SE]: `,
            })
            this.answer = response.mov
            if (!movementSet.has(this.answer)) console.log('Please introduce N, S, W, E, NW, NE, SW or SE')
        }

        this.changePosition(this.answer)
        this.answer = '' // because the upper while

        const event: PlayerStream = {
            id: uuid(),
            engineId: this.engineId,
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