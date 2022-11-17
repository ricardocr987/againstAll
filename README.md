*Software necesario:*

- Node.js (16.17.1)
- npm (8.15.0)
- Docker (20.10.17)

*Pasos para desplegar:*

1. docker-compose up
2. ./create-topics.sh 
3. Incluir IP del ordenador en el archivo config en el broker, es donde esta lanzado kafka
4. Modificar env.default con los puertos y hosts
5. npm run start
6. npm run start:registry
7. npm run start:weather
8. npm run start:engine
9. npm run start:player
