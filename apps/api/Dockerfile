FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

FROM node:20-alpine AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Security best practice: run as non-root user
USER node

COPY --chown=node:node --from=builder /usr/src/app ./

EXPOSE 8080

CMD ["node", "src/server.js"]

