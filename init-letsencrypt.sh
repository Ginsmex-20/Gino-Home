#!/bin/bash
# SSL-Zertifikat einrichten (einmalig ausführen)
set -e

DOMAIN="ginohome.de"
EMAIL="ginohome26@gmail.com"
DATA_PATH="./certbot"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Let's Encrypt SSL für $DOMAIN   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# 1. Dummy-Zertifikat erstellen damit nginx starten kann
echo "1/5 Erstelle Platzhalter-Zertifikat..."
mkdir -p "$DATA_PATH/conf/live/$DOMAIN"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "$DATA_PATH/conf/live/$DOMAIN/privkey.pem" \
  -out "$DATA_PATH/conf/live/$DOMAIN/fullchain.pem" \
  -subj "/CN=localhost" 2>/dev/null
echo "   ✓ Platzhalter erstellt"

# 2. Frontend neu bauen (neue nginx.conf mit HTTPS)
echo "2/5 Frontend-Image neu bauen..."
sudo docker compose build --no-cache frontend
echo "   ✓ Frontend gebaut"

# 3. Alle Container starten
echo "3/5 Container starten..."
sudo docker compose up -d backend frontend
sleep 5
echo "   ✓ nginx läuft"

# 4. Echtes Zertifikat holen
echo "4/5 Let's Encrypt Zertifikat anfordern..."
sudo docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"
echo "   ✓ Zertifikat erhalten!"

# 5. nginx neu laden mit echtem Zertifikat
echo "5/5 nginx neu laden..."
sudo docker compose exec frontend nginx -s reload

# Certbot für automatische Erneuerung starten
sudo docker compose up -d certbot

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   ✅  HTTPS erfolgreich eingerichtet!        ║"
echo "║   👉  https://$DOMAIN            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Das Zertifikat wird automatisch alle 12h geprüft"
echo "und bei Bedarf (alle 90 Tage) erneuert."
echo ""
