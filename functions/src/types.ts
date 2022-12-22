export type RegistryPlayer = {
    alias: string
    password: string
}

export type PlayerRequest = {
  body: RegistryPlayer,
  params: { playerId: string }
}

export type Game = {
    map: string[],
    cities: string[],
    temperatures: number[]
}

export type GameRequest = {
    body: Game,
    params: { gameId: string }
}

export type RegistryEvent = {
    timestamp: string,
    aliasProducer: string,
    ipProducer: string,
    event: string,
    description: string,
}

export type RegistryEventRequest = {
    body: RegistryEvent,
    params: { registryEventId: string }
}