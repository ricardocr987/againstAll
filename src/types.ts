export type Coordinate = {
    x: number
    y: number
}

// Event types that sockets will emit
export enum Events {
    SIGN_IN = 'signin',
    SIGN_UP = 'signup',
    EDIT_PROFILE = 'editprofile',
    END = 'end',
    //MOVEMENT = 'movement',
    //DEATH = 'death'
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