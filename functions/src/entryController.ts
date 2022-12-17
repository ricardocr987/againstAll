import { Response } from "express"
import { db } from './config/firebase'

type RegistryPlayer = {
    alias: string
    password: string
}

type Request = {
  body: RegistryPlayer,
  params: { aliasId: string }
}

const addPlayer = async (req: Request, res: Response) => {
  const { alias, password } = req.body
  try {
    const player = db.collection('players').doc()
    const playerObject = {
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

const getAllPlayers = async (req: Request, res: Response) => {
  try {
    const allPlayers: RegistryPlayer[] = []
    const querySnapshot = await db.collection('players').get()
    querySnapshot.forEach((doc: any) => allPlayers.push(doc.data()))
    return res.status(200).json(allPlayers)
  } catch(error: any) { return res.status(500).json(error.message) }
}

const updatePlayer = async (req: Request, res: Response) => {
  const { body: { alias, password }, params: { aliasId } } = req

  try {
    const player = db.collection('entries').doc(aliasId)
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

const deletePlayer = async (req: Request, res: Response) => {
  const { aliasId } = req.params

  try {
    const player = db.collection('players').doc(aliasId)

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

export { addPlayer, getAllPlayers, updatePlayer, deletePlayer }