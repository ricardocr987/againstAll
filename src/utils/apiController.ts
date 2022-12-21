import axios from 'axios'
import { RegistryPlayerPayload, GameMapPayload, RegistryEventPayload, RegistryPlayerAPIResponse, RegistryPlayerInfo, RegistryEventResponse, GameMapResponse } from '../types'

class APIController {
    constructor(){}
    async createPlayer(
        payload: RegistryPlayerPayload,
    ): Promise<RegistryPlayerAPIResponse> {
        return await axios.post(`https://us-central1-againstall-6f76d.cloudfunctions.net/app/players`, payload).then(res => res.data)
    }
    
    async getAllPlayers(): Promise<RegistryPlayerInfo[]> {
        return await axios.get(`https://us-central1-againstall-6f76d.cloudfunctions.net/app/players`).then(res => res.data)
    }
    
    async updatePlayer(
        payload: RegistryPlayerInfo,
    ): Promise<RegistryPlayerAPIResponse> {
        return await axios.put(`https://us-central1-againstall-6f76d.cloudfunctions.net/app/players/${payload.id}`, payload).then(res => res.data)
    }
    
    async deletePlayer(
        id: string,
    ): Promise<RegistryPlayerAPIResponse> {
        return await axios.delete(`https://us-central1-againstall-6f76d.cloudfunctions.net/app/players/${id}`).then(res => res.data)
    }
    
    async createGame(
        payload: GameMapPayload,
    ): Promise<GameMapResponse> {
        return await axios.post(`https://us-central1-againstall-6f76d.cloudfunctions.net/app/games`, payload).then(res => res.data)
    }
    
    async getAllGames(): Promise<GameMapPayload[]> {
        return await axios.get(`https://us-central1-againstall-6f76d.cloudfunctions.net/app/games`).then(res => res.data)
    }
    
    async updateGame(
        id: string,
        payload: GameMapPayload,
    ): Promise<GameMapResponse> {
        return await axios.put(`https://us-central1-againstall-6f76d.cloudfunctions.net/app/games/${id}`, payload).then(res => res.data)
    }
    
    async deleteGame(
        id: string,
    ): Promise<GameMapResponse> {
        return await axios.delete(`https://us-central1-againstall-6f76d.cloudfunctions.net/app/games/${id}`).then(res => res.data)
    }
    
    async createRegistryEvent(
        payload: RegistryEventPayload,
    ): Promise<RegistryEventResponse> {
        return await axios.post(`https://us-central1-againstall-6f76d.cloudfunctions.net/app/registryEvents`, payload).then(res => res.data)
    }
    
    async getAllRegistryEvents(): Promise<RegistryEventPayload[]> {
        return await axios.get(`https://us-central1-againstall-6f76d.cloudfunctions.net/app/registryEvents`).then(res => res.data)
    }
    
    async updateRegistryEvent(
        id: string,
        payload: RegistryEventPayload,
    ): Promise<RegistryEventResponse> {
        return await axios.put(`https://us-central1-againstall-6f76d.cloudfunctions.net/app/registryEvents/${id}`, payload).then(res => res.data)
    }
    
    async deleteRegistryEvent(
        id: string,
    ): Promise<RegistryEventResponse> {
        return await axios.delete(`https://us-central1-againstall-6f76d.cloudfunctions.net/app/registryEvents/${id}`).then(res => res.data)
    }
}

const apiController = new APIController()
export default apiController


//console.log(await apiController.createPlayer({ alias: 'riki', password: '123' }))
//console.log(await apiController.getAllPlayers())
//console.log(await apiController.updatePlayer({ id: 'jVpom32l0R0LdV9OIjLa', alias: 'riki', password: '1234' }))
//console.log(await apiController.deletePlayer('l0QRagfOwqlaZjN8XpUM'))

//console.log(await apiController.createGame({ map: ['riki', 'riki', 'M'] }))
//console.log(await apiController.getAllGames())
//console.log(await apiController.updateGame('1BW0nP3qF4fNiMQwFGmG',{ map: ['riki', 'riki', ' '] }))
//console.log(await apiController.deleteGame('1BW0nP3qF4fNiMQwFGmG'))

/*console.log(await apiController.createRegistryEvent({
    timestamp: Date.now().toString(),
    aliasProducer: 'riki',
    ipProducer: '192.0.0.0',
    event: 'login',
    description: 'login',
}))
console.log(await apiController.getAllRegistryEvents())*/
/*console.log(await apiController.updateRegistryEvent('PwaxtxU4PFXyNwuRjmTM',{
    timestamp: Date.now().toString(),
    aliasProducer: 'riki',
    ipProducer: '192.0.0.2',
    event: 'login',
    description: 'login',
}))
console.log(await apiController.deleteRegistryEvent('PwaxtxU4PFXyNwuRjmTM'))*/