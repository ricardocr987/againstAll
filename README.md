*Software necesario:*

- Node.js (16.17.1)
- npm (8.15.0)
- Docker (20.10.17)

*Pasos para desplegar:*

1. npm run start
2. ./scripts/start-kafka.sh
3. ./scripts/create-topics.sh
3. npm run start:registry
4. npm run start:engine
5. npm run start:player