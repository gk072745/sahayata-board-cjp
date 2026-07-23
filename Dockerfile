FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server/package.json ./server/
RUN npm run install:server

COPY client ./client
COPY server ./server
COPY data ./data

ENV NODE_ENV=production
ENV DATA_DIR=/data
EXPOSE 4000

CMD ["npm", "start"]
