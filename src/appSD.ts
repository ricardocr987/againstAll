import express from "express"
import { resolve } from "path";

import fich from "../data/registry.json" assert { type: "json" }

const app = express()
const port = 3000
//var i: number
/*
app.use('/', (req, res, next) =>{
    
    //res.json({message: "Hola mundo"})   
    res.json({message: "Hola gente"})

    next();
})
*/
app.get("/",(req:any, res: any) => {
    return res.status(200).send(fich);

    //res.json('Hola Mundo')
    //res.json("holllll")

    //res.send('HEy')
});



// Ejecutar la aplicacion
app.listen(port, () => {
    console.log(`Ejecutando la aplicación API REST de SD en el puerto ${port}`);
});
