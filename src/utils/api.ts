import axios from 'axios'
import { RegistryPlayerInfo, GameMapPayload } from '../types'

export async function createPlayer(
    payload: RegistryPlayerInfo,
): Promise<string> {
    return await axios
        .post(
            `https://us-central1-againstall-6f76d.cloudfunctions.net/app/players`,
            payload,
        )
        .then(res => res.data)
}

export async function getAllPlayers(): Promise<RegistryPlayerInfo> {
    return await axios
        .get(
            `https://us-central1-againstall-6f76d.cloudfunctions.net/app/players`,
        )
        .then(res => res.data)
}

export async function updatePlayer(
    id: string,
    payload: RegistryPlayerInfo,
): Promise<string> {
    return await axios
        .put(
            `https://us-central1-againstall-6f76d.cloudfunctions.net/app/players/${id}`,
            payload,
        )
        .then(res => res.data)
}

export async function deletePlayer(
    id: string,
): Promise<string> {
    return await axios
        .delete(
            `https://us-central1-againstall-6f76d.cloudfunctions.net/app/players/${id}`,
        )
        .then(res => res.data)
}

export async function createGame(
    payload: GameMapPayload,
): Promise<string> {
    return await axios
        .post(
            `https://us-central1-againstall-6f76d.cloudfunctions.net/app/games`,
            payload,
        )
        .then(res => res.data)
}

export async function getAllGames(): Promise<GameMapPayload> {
    return await axios
        .get(
            `https://us-central1-againstall-6f76d.cloudfunctions.net/app/games`,
        )
        .then(res => res.data)
}

export async function updateGame(
    id: string,
    payload: GameMapPayload,
): Promise<string> {
    return await axios
        .put(
            `https://us-central1-againstall-6f76d.cloudfunctions.net/app/games/${id}`,
            payload,
        )
        .then(res => res.data)
}

export async function deleteGame(
    id: string,
): Promise<string> {
    return await axios
        .delete(
            `https://us-central1-againstall-6f76d.cloudfunctions.net/app/games/${id}`,
        )
        .then(res => res.data)
}

//console.log(await createPlayer({ alias: 'riki', password: '123' }))
//console.log(await getAllPlayers())
//console.log(await updatePlayer('DI97m4vhomFQfXwjpDLP', { alias: 'riki', password: '1234' }))
//console.log(await deletePlayer('DI97m4vhomFQfXwjpDLP'))

//console.log(await createGame({ map: ['riki', 'riki', 'M']}))
//console.log(await getAllGames())
//console.log(await updateGame('3PwNJbKQsOjyAdJ4QK4V',{ map: ['riki', 'riki', ' '] }))
//console.log(await deleteGame('3PwNJbKQsOjyAdJ4QK4V'))