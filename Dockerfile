# Stage 1: build (needs devDependencies like vite)
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: run (production only)
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server/index.js"]
