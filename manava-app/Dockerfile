# Multi-stage build for the manava-app frontend.
# Stage 1 builds the Vite bundle; stage 2 serves the static output via Nginx.

FROM node:20-alpine AS build
WORKDIR /app
# Vite reads VITE_* env vars at build time — must be passed as ARG.
ARG VITE_API_BASE_URL=http://localhost:4000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
