FROM node:22.14.0-bullseye-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    git

COPY package*.json tsconfig.json src ./

RUN npm install