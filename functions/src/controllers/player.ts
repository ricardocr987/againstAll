import { Response } from "express"
import { db } from '../config/firebase'
import { RegistryPlayer, PlayerRequest } from '../types'
import * as functions from 'firebase-functions'

const playerCollection = 'players'

const playerExists = async (
    playerId: string,
) => {
    const pastPlayers = await db
        .collection(playerCollection)
        .where('playerId', '==', playerId)
        .get()

    return !pastPlayers.empty
}

const createPlayer = async (req: PlayerRequest, res: Response) => {
    const { alias, password } = req.body
    if (await playerExists(alias)) {
        throw new functions.https.HttpsError(
            'already-exists',
            `There's another player with this alias.`,
        )
    }
    try {
        const player = db.collection(playerCollection).doc()
        const playerObject = {
            id: player.id,
            alias,
            password,
        }
    
        await player.set(playerObject)
    
        res.status(200).send({
            status: 'success',
            message: 'player added successfully',
            data: playerObject
        })
    } catch(error: any) {
        res.status(500).json(error.message)
    }
}
  
const getAllPlayers = async (req: PlayerRequest, res: Response) => {
    try {
        const allPlayers: RegistryPlayer[] = []
        const querySnapshot = await db.collection(playerCollection).get()
        querySnapshot.forEach((doc: any) => allPlayers.push(doc.data()))
        return res.status(200).json(allPlayers)
    } catch(error: any) { return res.status(500).json(error.message) }
}

const getPlayerByAlias = async (req: PlayerRequest, res: Response) => {
    try {
        const playersQuerySnapshot = await db
            .collection(playerCollection)
            .get();
        const players: RegistryPlayer[] = [];
        playersQuerySnapshot.forEach(async doc => {
            const data: any = doc.data();
            if (data.id === req.params.playerId) {
                players.push(data);
            }
        });
        res.status(200).json(players);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}
  
const updatePlayer = async (req: PlayerRequest, res: Response) => {
    const { body: { alias, password }, params: { playerId } } = req
  
    try {
        const player = db.collection(playerCollection).doc(playerId)
        const currentData = (await player.get()).data() || {}
        
        const playerObject = {
            alias: alias || currentData.alias,
            password: password || currentData.password,
        }
    
        await player.set(playerObject).catch(error => {
            return res.status(400).json({
            status: 'error',
            message: error.message
            })
        })
    
        return res.status(200).json({
            status: 'success',
            message: 'player updated successfully',
            data: playerObject
        })
    }
    catch(error: any) { return res.status(500).json(error.message) }
}
  
const deletePlayer = async (req: PlayerRequest, res: Response) => {
    const { playerId } = req.params
  
    try {
        const player = db.collection(playerCollection).doc(playerId)
    
        await player.delete().catch(error => {
            return res.status(400).json({
                status: 'error',
                message: error.message
            })
        })
    
        return res.status(200).json({
            status: 'success',
            message: 'player deleted successfully',
        })
    }
    catch(error: any) { return res.status(500).json(error.message) }
}

export { createPlayer, getAllPlayers, getPlayerByAlias, updatePlayer, deletePlayer }