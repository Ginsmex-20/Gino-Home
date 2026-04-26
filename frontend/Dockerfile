# ── Stage 1: Build ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Für Web-Deployment: API läuft über nginx-Proxy auf /api
# (kein VITE_API_BASE_URL nötig — client.js gibt standardmäßig /api zurück)
RUN npm run build

# ── Stage 2: Serve mit nginx ─────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
