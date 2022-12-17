import * as functions from 'firebase-functions'
import * as express from 'express'
import { addPlayer, getAllPlayers, updatePlayer, deletePlayer } from './entryController'

const app = express()

app.get('/', (req, res) => res.status(200).send('Hey there!'))
app.post('/players', addPlayer)
app.get('/players', getAllPlayers)
app.patch('/players/:playerId', updatePlayer)
app.delete('/players/:playerId', deletePlayer)

exports.app = functions.https.onRequest(app)