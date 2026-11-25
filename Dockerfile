FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Dentro del contenedor hay que escuchar en todas las interfaces; fuera de Docker el valor por defecto es 127.0.0.1.
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "server.js"]
