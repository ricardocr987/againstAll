import { PlayerInfo, EngineStream, EngineEvents } from './types.js'
import { randomIntFromInterval, printBoard } from './utils.js'

// aggregates same functionalities for players and NPCs
export abstract class CommonPlayer {
    // PlayerInfo
    public playerInfo: PlayerInfo

    public timestamp: number = Date.now()
    public messagesRead: string[] = []

    // Flags to identify the phase of the game
    public startedGame = false
    public finishedGame = false

    constructor(
        public KAFKA_HOST: string,
        public KAFKA_PORT: number,
    ) {
        this.playerInfo = {
            alias: 'NPC', // initilized like this, if it is a Player will be overwritten
            position: {
                x: randomIntFromInterval(0, 19), // 0-19
                y: randomIntFromInterval(0, 19) // 0-19
            },
            baseLevel: 1,
            coldEffect: randomIntFromInterval(-10, 10),
            hotEffect: randomIntFromInterval(-10, 10),
        }

        console.log('Player Info: ', this.playerInfo)
    }

    // true if the message includes the alias explicitly or if it a message for all
    public isEngineStreamReceiver (engineMessage: EngineStream): boolean { 
        return engineMessage.playerAlias === this.playerInfo.alias || engineMessage.messageToAll === true
    }

    public async processMessage(message: EngineStream){
        switch (message.event){

            case EngineEvents.GAME_NOT_PLAYABLE: // when someone try to send a NEW_POSITION event and the game hasnt started or already finished
                console.log(message.playerAlias, ': ', message.error)
                // if (this.finishedGame) kafka.pauseConsumer()

                break
            
            case EngineEvents.GAME_ENDED:
                //kafka.pauseConsumer()
                this.finishedGame = true

                console.log('The game has ended')

                break
            
            case EngineEvents.DEATH:
                //kafka.pauseConsumer()
                this.finishedGame = true

                console.log('You lost, someone or a mine killed you')
                process.exit(0)

                break

            case EngineEvents.MOVEMENT_OK:
                if (message.event2) {
                    switch (message.event2) { // se podria eliminar este switch y direcrtamente mostrar el mapa
                        case EngineEvents.KILL:
                            // podria mostrar algun mensaje o informacion sobre el playerInfo
                            break
            
                        case EngineEvents.LEVEL_UP:
                            this.playerInfo.baseLevel++

                            break

                        case EngineEvents.TIE:
                            if (message.position) this.playerInfo.position = message.position

                            break
            
                    }
                }

                break

            case EngineEvents.MOVEMENT_ERROR:
                if (message.position) this.playerInfo.position = message.position
                console.log(message.playerAlias, ': ', message.error)

                break
        }
        if (message.map) printBoard(message.map)
    }

    public changePosition(answer: string) {
        switch(answer){
            case 'N':
                this.moveN()
                break
            case 'S':
                this.moveS()
                break
            case 'W':
                this.moveW()
                break
            case 'E':
                this.moveE()
                break
            case 'NW':
                this.moveNW()
                break
            case 'NE':
                this.moveNE()
                break
            case 'SW':
                this.moveSW()
                break
            case 'SE':
                this.moveSE()
                break
        }
    }

    // external coordinates are connected to each other
    public moveN() {
        this.playerInfo.position.x--
        if (this.playerInfo.position.x < 0) this.playerInfo.position.x = 19
    }

    public moveS() {
        this.playerInfo.position.x++
        if (this.playerInfo.position.x > 19) this.playerInfo.position.x = 0
    }

    public moveW() {
        this.playerInfo.position.y--
        if (this.playerInfo.position.y < 0) this.playerInfo.position.y = 19
    }

    public moveE() {
        this.playerInfo.position.y++
        if (this.playerInfo.position.y > 19) this.playerInfo.position.y = 0
    }

    public moveNW() {
        this.playerInfo.position.x--
        if (this.playerInfo.position.x < 0) this.playerInfo.position.x = 19
        
        this.playerInfo.position.y--
        if (this.playerInfo.position.y < 0) this.playerInfo.position.y = 19
    }

    public moveNE() {
        this.playerInfo.position.x--
        if (this.playerInfo.position.x < 0) this.playerInfo.position.x = 19

        this.playerInfo.position.y++
        if (this.playerInfo.position.y > 19) this.playerInfo.position.y = 0
    }

    public moveSW() {
        this.playerInfo.position.x++
        if (this.playerInfo.position.x > 19) this.playerInfo.position.x = 0

        this.playerInfo.position.y--
        if (this.playerInfo.position.y < 0) this.playerInfo.position.y = 19
    }

    public moveSE() {
        this.playerInfo.position.x++
        if (this.playerInfo.position.x > 19) this.playerInfo.position.x = 0

        this.playerInfo.position.y++
        if (this.playerInfo.position.y > 19) this.playerInfo.position.y = 0
    }

    public modifyLevel(amount: number) {
        this.playerInfo.baseLevel += amount
    }
}