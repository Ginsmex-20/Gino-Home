FROM node:20-alpine

# Abhängigkeiten für better-sqlite3 (native addon)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Datenpfade via Umgebungsvariablen (werden durch Volume überschrieben)
ENV DB_PATH=/app/data/ginohome.db
ENV UPLOADS_PATH=/app/data/uploads
ENV PORT=3001

RUN mkdir -p /app/data/uploads

EXPOSE 3001

CMD ["node", "server.js"]
