export type Coordinate = {
    x: number
    y: number
}

// Event types that sockets will emit
export enum PlayerEvents {
    SIGN_IN = 'SIGN_IN',
    SIGN_UP = 'SIGN_UP',
    EDIT_PROFILE = 'EDIT_PROFILE',
    END = 'END',
    NEW_POSITION = 'NEW_POSITION',
}

export enum RegistryEvents {
    SIGN_IN_OK = 'SIGN_IN_OK',
    SIGN_UP_OK = 'SIGN_UP_OK',
    EDIT_PROFILE_OK = 'EDIT_PROFILE_OK',
    SIGN_IN_ERROR = 'SIGN_IN_ERROR',
    SIGN_UP_ERROR = 'SIGN_UP_ERROR',
    EDIT_PROFILE_ERROR = 'EDIT_PROFILE_ERROR',
}

export enum EngineEvents {
    MOVEMENT_OK = 'MOVEMENT_OK',
    MOVEMENT_ERROR = 'MOVEMENT_ERROR',
}

export type PlayerMessage = { 
    alias: string
    newPosition: Coordinate
    //timestamp
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

/*
export interface ServerToClientEvents {
    noArg: () => void 
    basicEmit: (a: number, b: string, c: Buffer) => void 
    withAck: (d: string, callback: (e: number) => void) => void 
}

export interface ClientToServerEvents {
    hello: () => void 
}

export interface InterServerEvents {
    ping: () => void 
}

export interface SocketData {
    name: string 
    age: number 
}*/