Software necesario:

- Node.js (16.17.1) -> Busca un tutorial para instalar nvm (node version manager) o si no quieres complicarte instala la version que tengo yo ahora
- npm (8.15.0)
- Docker (20.10.17)

Pasos para desplegar:

1. npm run start (npm i: instala dependencias (librerias) && npm run build: transpila el codigo de typescript a javascript)
2. npm run start:registry (los puertos y el host estan por ahora definidos en el codigo no se introducen por consola)
3. (En otro terminal) npm run start:player (contestas a las preguntas del cliente para crear un jugadopr) y deberia de crearse una carpeta data que tiene la informacion del jugador en un archivo