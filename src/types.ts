import avro from 'avsc' 

export const playerStreamSchema = avro.Type.forSchema({
    "name": "playerStreamSchema",
    "type": "record",
    "fields": [
        {
          "name": "event",
          "type": "string",
        },
        {
          "name": "alias",
          "type": "string",
        },
        {
            "name": "position",
            "type": {
                "type": "record",
                "name": "Coordinate",
                "fields": [
                    {
                        "name": "x",
                        "type": "int"
                    },
                    {
                        "name": "y",
                        "type": "int"
                    },
                ]
            }
        }
    ]
})

export type Coordinate = {
    x: number
    y: number
}

// Event types that sockets will emit
export enum PlayerEvents {
    SIGN_IN = "SIGN_IN",
    SIGN_UP = "SIGN_UP",
    EDIT_PROFILE = "EDIT_PROFILE",
    END = "END",
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
    MOVEMENT_OK = "MOVEMENT_OK",
    MOVEMENT_ERROR = "MOVEMENT_ERROR",
    DEATH = "DEATH",
    KILL = "KILL",
    GAME_ENDED = "GAME_ENDED"
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

export type WeatherInfo = {
    num: number
    city: string
    temperature: number
}

export type WeatherI = {
    num: number
    city: string
}

export type UnionStream = PlayerStream | EngineStream

export type PlayerStream = {
    event: string
    alias: string
    position: Coordinate
    sessionId: number
}

export type EngineStream = {
    engine: string
    alias: string
    position: Coordinate
}