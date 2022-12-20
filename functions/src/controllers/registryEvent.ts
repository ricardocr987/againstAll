import { Response } from "express"
import { db } from '../config/firebase'
import { RegistryEventRequest, RegistryEvent } from '../types'

const registryEventCollection = 'registryEvents'

const createRegistryEvent = async (req: RegistryEventRequest, res: Response) => {
    const { 
        timestamp,
        aliasProducer,
        ipProducer,
        event,
        description 
    } = req.body

    try {
        const registryEvent = db.collection(registryEventCollection).doc()
        const registryEventObject = {
            id: registryEvent.id,
            timestamp: timestamp,
            aliasProducer: aliasProducer,
            ipProducer: ipProducer,
            event: event,
            description: description,
        }
    
        await registryEvent.set(registryEventObject)
    
        res.status(200).send({
            status: 'success',
            message: 'registry event created successfully',
            data: registryEventObject
        })
    } catch(error: any) {
        res.status(500).json(error.message)
    }
  }
  
  const getAllRegistryEvents = async (req: RegistryEventRequest, res: Response) => {
    try {
        const allRegistryEvents: RegistryEvent[] = []
        const querySnapshot = await db.collection(registryEventCollection).get()
        querySnapshot.forEach((doc: any) => allRegistryEvents.push(doc.data()))
        return res.status(200).json(allRegistryEvents)
    } catch(error: any) { return res.status(500).json(error.message) }
  }
  
  const updateRegistryEvent = async (req: RegistryEventRequest, res: Response) => {
    const { 
        timestamp,
        aliasProducer,
        ipProducer,
        event,
        description 
    } = req.body
    const { registryEventId } = req.params

    try {
        const registryEvent = db.collection(registryEventCollection).doc(registryEventId)
        const currentData = (await registryEvent.get()).data() || {}
        
        const registryEventObject = {
            id: registryEventId,
            timestamp: timestamp || currentData.timestamp,
            aliasProducer: aliasProducer || currentData.aliasProducer,
            ipProducer: ipProducer || currentData.ipProducer,
            event: event || currentData.event,
            description: description || currentData.description,
        }
    
        await registryEvent.set(registryEventObject).catch(error => {
            return res.status(400).json({
                status: 'error',
                message: error.message
            })
        })
    
        return res.status(200).json({
            status: 'success',
            message: 'registry event updated successfully',
            data: registryEventObject
        })
    }
    catch(error: any) { return res.status(500).json(error.message) }
  }
  
const deleteRegistryEvent = async (req: RegistryEventRequest, res: Response) => {
    const { registryEventId } = req.params
  
    try {
        const registryEvent = db.collection(registryEventCollection).doc(registryEventId)
    
        await registryEvent.delete().catch(error => {
            return res.status(400).json({
                status: 'error',
                message: error.message
            })
        })
    
        return res.status(200).json({
            status: 'success',
            message: 'registry event deleted successfully',
        })
    }
    catch(error: any) { return res.status(500).json(error.message) }
}

export { createRegistryEvent, getAllRegistryEvents, updateRegistryEvent, deleteRegistryEvent }