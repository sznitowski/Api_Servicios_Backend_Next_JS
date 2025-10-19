# docker/Dockerfile
# Multi-stage build para NestJS

# 1) Stage de build (con dev deps)
FROM node:20-alpine AS builder
WORKDIR /app

# Solo reinstalar deps cuando cambian package*.json
COPY package*.json ./
RUN npm ci

# Copiar el resto del código y compilar
COPY . .
RUN npm run build

# 2) Stage de runtime (solo prod deps)
FROM node:20-alpine AS runtime
WORKDIR /app

# Usuario no root
RUN addgroup -S app && adduser -S app -G app

ENV NODE_ENV=production

# Instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar el build generado en el stage anterior
COPY --chown=app:app --from=builder /app/dist ./dist

USER app
EXPOSE 5000
CMD ["node", "dist/main.js"]
