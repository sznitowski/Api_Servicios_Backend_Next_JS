# ===== STAGE 1: build =====
FROM node:20-alpine AS build
WORKDIR /app

# Sólo package* para cachear deps
COPY package*.json ./
RUN npm ci

# Copiar código y compilar
COPY . .
# Si tu build usa tsconfig-paths, asegurate que esté en deps
RUN npm run build

# ===== STAGE 2: runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Crear usuario no-root
RUN addgroup -S app && adduser -S app -G app
USER app

# Copiamos sólo lo necesario
COPY --chown=app:app package*.json ./
RUN npm ci --omit=dev

COPY --chown=app:app dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
