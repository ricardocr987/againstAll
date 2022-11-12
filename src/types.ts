export type Coordinate = {
    x: number
    y: number
}

export enum PlayerEvents {
    // Registry & engine authentication events
    SIGN_IN = "SIGN_IN",
    SIGN_UP = "SIGN_UP",
    EDIT_PROFILE = "EDIT_PROFILE",
    END = "END",
    // Game events
    REQUEST_TO_JOIN = "REQUEST_TO_JOIN",
    NEW_POSITION = "NEW_POSITION",
}

export enum RegistryEvents {
    SIGN_IN_OK = "SIGN_IN_OK",
    SIGN_UP_OK = "SIGN_UP_OK",
    EDIT_PROFILE_OK = "EDIT_PROFILE_OK",
    SIGN_IN_ERROR = "SIGN_IN_ERROR",
    SIGN_UP_ERROR = "SIGN_UP_ERROR",
    EDIT_PROFILE_ERROR = "EDIT_PROFILE_ERROR"
}

export enum EngineEvents {
    PLAYER_CONNECTED_OK = "PLAYER_CONNECTED_OK",
    PLAYER_CONNECTED_ERROR = "PLAYER_CONNECTED_ERROR",
    GAME_NOT_PLAYABLE = "GAME_NOT_PLAYABLE", // when a player send a NEW_POSITION when the game has not started or already finished
    GAME_STARTING = "GAME_STARTING",
    MOVEMENT_OK = "MOVEMENT_OK",
    MOVEMENT_ERROR = "MOVEMENT_ERROR",
    DEATH = "DEATH",
    KILL = "KILL",
    LEVEL_UP = "LEVEL_UP",
    GAME_ENDED = "GAME_ENDED",
}

export enum WeatherEvents{
    ASK = "ASK",
    ASK_ERROR = "ASK_ERROR"
}

export enum NpcEvents{
    END = "END",
    SING_IN = "SING_IN"
}

export type PlayerInfo = {
    alias: string
    position: Coordinate
    baseLevel: number
    coldEffect: number
    hotEffect: number
}

export type RegistryPlayerInfo = {
    alias: string
    password: string
}

export type NpcInfo = {
    alias: number
    level: number
}

export type WeatherI = {
    city: string
    temperature: number
}

export type WeatherInfo = {
    num: number
    city: string
    temperature: number
}

export type UnionStream = PlayerStream | EngineStream

export type PlayerStream = {
    event: PlayerEvents
    playerInfo: PlayerInfo
}

export type EngineStream = {
    event: EngineEvents
    playerAlias?: string // alias al que va destinado el mensaje
    messageToAll?: boolean // flag para identificar si el mensaje es para todos los jugadores o no
    map?: string[][] // no se tiene porque enviar en todos los mensajes, por eso la ?, significa que puede ser null
    error?: string // error explained
}
