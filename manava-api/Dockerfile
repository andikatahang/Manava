# Multi-stage build: deps -> build -> runtime.
# Runtime image is a slim Node 20 Alpine with only prod deps.

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
EXPOSE 4000 5555
# Run migrations, start Prisma Studio in background, then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && (npx prisma studio --hostname 0.0.0.0 --port 5555 --browser none &) && node dist/index.js"]
