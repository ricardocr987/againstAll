import express from "express"
import { resolve } from "path";

const app = express()
const port = 3000
var i: number
/*
app.use('/', (req, res, next) =>{
    
    //res.json({message: "Hola mundo"})   
    res.json({message: "Hola gente"})

    next();
})
*/
app.get("/",(req, res) => {

res.json('Hola Mundo')
res.json("holllll")
function write(valor: any){
    res.send(valor)
}

write('Hola que tal')

res.send('HEy')
});



// Ejecutar la aplicacion
app.listen(port, () => {
    console.log(`Ejecutando la aplicación API REST de SD en el puerto ${port}`);
});
