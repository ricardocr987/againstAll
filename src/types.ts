export enum PlayerEvents {
    // Registry & engine authentication events
    SIGN_IN = 'SIGN_IN',
    SIGN_UP = 'SIGN_UP',
    EDIT_PROFILE = 'EDIT_PROFILE',
    DELETE_PROFILE = 'DELETE_PROFILE',
    END = 'END',
    // Kafka event
    INITIAL_MESSAGE = 'INITIAL_MESSAGE',
    NEW_POSITION = 'NEW_POSITION',
}

export enum RegistryEvents {
    SIGN_IN_OK = 'SIGN_IN_OK',
    SIGN_UP_OK = 'SIGN_UP_OK',
    EDIT_PROFILE_OK = 'EDIT_PROFILE_OK',
    DELETE_PROFILE_OK = 'DELETE_PROFILE_OK',

    SIGN_IN_ERROR = 'SIGN_IN_ERROR',
    SIGN_UP_ERROR = 'SIGN_UP_ERROR',
    EDIT_PROFILE_ERROR = 'EDIT_PROFILE_ERROR',
    DELETE_PROFILE_ERROR = 'DELETE_PROFILE_ERROR',
}

export enum EngineEvents {
    // EVENTS WITH PLAYER:
    PLAYER_CONNECTED_OK = 'PLAYER_CONNECTED_OK', // player connected successfully with the engine (sockets)
    PLAYER_CONNECTED_ERROR = 'PLAYER_CONNECTED_ERROR', // player couldnt connect with registry (sockets)
    GAME_NOT_PLAYABLE = 'GAME_NOT_PLAYABLE', // when a player send a NEW_POSITION and the game has not started or already finished
    GAME_STARTED = 'GAME_STARTED', // engine send to the players a stream to inform them that the game has just started 
    MOVEMENT_OK = 'MOVEMENT_OK', // the movement sent by the player was successfully updated in the engine
    MOVEMENT_ERROR = 'MOVEMENT_ERROR', // the movement couldnt be updated
    DEATH = 'DEATH', // someone killed the player
    KILL = 'KILL', // the player killed someone
    LEVEL_UP = 'LEVEL_UP', // the player has eaten food and leveled up
    GAME_ENDED = 'GAME_ENDED', // the game is finished
    WINNER = 'WINNER', // when the player wins, will receive this message
    TIE = 'TIE', // when a player try to kill another and they tie
}

export type Coordinate = {
    x: number
    y: number
}

export type PlayerInfo = {
    alias: string
    position: Coordinate
    baseLevel: number
    coldEffect: number
    hotEffect: number
}

export type RegistryPlayerInfo = {
    id: string
    alias: string
    password: string
}

// Union of the different types of stream used in kafka
export type UnionStream = PlayerStream | EngineStream

// Kafka Player Stream
export type PlayerStream = {
    id: string
    engineId: string
    timestamp: number
    event: PlayerEvents // event type
    playerInfo: PlayerInfo // all player info
}

// Kafka EngineStream
export type EngineStream = {
    id: string
    engineId: string
    event: EngineEvents // event type
    event2?: EngineEvents // secondary event type, MOVEMENT_OK could include another event (KILL, DEATH, etc.)
    playerAlias?: string // player alias who will receive the stream (? means that could be undefined)
    messageToAll?: boolean // flag  to identify if the message is for every player (example: GAME_FINISHED)
    map?: string[][] // updated map
    error?: string // error explained
    position?: Coordinate // there are some cases that the player wont move, this is the last position that the player had
}


// Payloads API
export type RegistryPlayerPayload = {
    alias: string
    password: string
}

export type GameMapPayload = {
    map: string[]
    cities?: string[]
    temperatures?: number[]
}

export type RegistryEventPayload = {
    timestamp: string,
    aliasProducer: string,
    ipProducer: string,
    event: string,
    description: string,
}

export type RegistryPlayerAPIResponse = {
    status: string,
    message: string,
    data: RegistryPlayerInfo
}

export type RegistryEventResponse = {
    status: string,
    message: string,
    data: RegistryEventPayload & { id: string }
}

export type GameMapResponse = {
    status: string,
    message: string,
    data: GameMapPayload & { id: string }
}