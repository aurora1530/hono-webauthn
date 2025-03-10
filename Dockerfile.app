FROM node:22.14.0-bullseye-slim

WORKDIR /app

COPY package*.json tsconfig.json src ./

RUN npm install