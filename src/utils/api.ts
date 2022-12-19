import axios from 'axios'
import { RegistryPlayerInfo } from '../types'

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

//console.log(await createPlayer({ alias: 'ali', password: '123' }))
//console.log(await getAllPlayers())
//await updatePlayer('it60ajAF6bozsET99X3m', { alias: 'ali', password: '1234' })
