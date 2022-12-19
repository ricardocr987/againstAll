export type RegistryPlayer = {
    alias: string
    password: string
}

export type PlayerRequest = {
  body: RegistryPlayer,
  params: { playerId: string }
}

export type Game = {
    id: string
    map: string[][]
}

export type GameRequest = {
    body: Game,
    params: { gameId: string }
}