FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

ENV PORT=3000
EXPOSE 3000

# Non eseguire come amministratore (più sicuro)
USER node

# Docker controlla da solo che l'app sia viva
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["node", "index.js"]