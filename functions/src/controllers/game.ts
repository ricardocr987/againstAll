import { Response } from "express"
import { db } from '../config/firebase'
import { Game, GameRequest } from '../types'

const gameCollection = 'games'

const createGame = async (req: GameRequest, res: Response) => {
    const { map } = req.body
    try {
        const game = db.collection(gameCollection).doc()
        const gameObject = {
            id: game.id,
            map,
        }
    
        await game.set(gameObject)
    
        res.status(200).send({
            status: 'success',
            message: 'game created successfully',
            data: gameObject
        })
    } catch(error: any) {
        res.status(500).json(error.message)
    }
  }
  
  const getAllActiveGames = async (req: GameRequest, res: Response) => {
    try {
        const allGames: Game[] = []
        const querySnapshot = await db.collection(gameCollection).get()
        querySnapshot.forEach((doc: any) => allGames.push(doc.data()))
        return res.status(200).json(allGames)
    } catch(error: any) { return res.status(500).json(error.message) }
  }
  
  const updateGame = async (req: GameRequest, res: Response) => {
    const { body: { map }, params: { gameId } } = req
  
    try {
        const game = db.collection(gameCollection).doc(gameId)
        const currentData = (await game.get()).data() || {}
        
        const gameObject = {
            id: game.id,
            map: map || currentData.map,
        }
    
        await game.set(gameObject).catch(error => {
            return res.status(400).json({
            status: 'error',
            message: error.message
            })
        })
    
        return res.status(200).json({
            status: 'success',
            message: 'game updated successfully',
            data: gameObject
        })
    }
    catch(error: any) { return res.status(500).json(error.message) }
  }
  
const deleteGame = async (req: GameRequest, res: Response) => {
    const { gameId } = req.params
  
    try {
        const game = db.collection(gameCollection).doc(gameId)
    
        await game.delete().catch(error => {
            return res.status(400).json({
                status: 'error',
                message: error.message
            })
        })
    
        return res.status(200).json({
            status: 'success',
            message: 'game deleted successfully',
        })
    }
    catch(error: any) { return res.status(500).json(error.message) }
}

export { createGame, getAllActiveGames, updateGame, deleteGame }