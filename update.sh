#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  Gino-Home — Server Update Script
#  Dieses Skript liegt auf TrueNAS im Projekt-Ordner.
#  Es wird vom Windows-Update-Skript per SSH aufgerufen.
# ═══════════════════════════════════════════════════════════════════

set -e

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Automatisch den Ordner finden in dem dieses Skript liegt
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo -e "${CYAN}══════════════════════════════════════${NC}"
echo -e "${CYAN}   Gino-Home Server Update${NC}"
echo -e "${CYAN}══════════════════════════════════════${NC}"
echo ""

# ── 1. Git Pull ─────────────────────────────────────────────────────
echo -e "${YELLOW}▶ Code aktualisieren (git pull)...${NC}"
git pull
echo -e "${GREEN}✓ Code aktuell${NC}"
echo ""

# ── 2. Frontend zwangsweise neu bauen (Vite-Bundle mit neuem Hash) ──
# BuildKit erkennt manchmal Source-Aenderungen nicht zuverlaessig,
# deshalb fuer Frontend immer --no-cache. Backend/tunnel/certbot
# bleiben mit Cache (schnell), die haben i.d.R. keine Build-Probleme.
echo -e "${YELLOW}▶ Frontend Container neu bauen (--no-cache)...${NC}"
docker compose build --no-cache frontend
echo -e "${GREEN}✓ Frontend Image frisch${NC}"
echo ""

# ── 3. Container starten ─────────────────────────────────────────────
echo -e "${YELLOW}▶ Container starten...${NC}"
docker compose up --build -d
echo -e "${GREEN}✓ Container laufen${NC}"
echo ""

# ── 3. Status anzeigen ───────────────────────────────────────────────
echo -e "${YELLOW}▶ Container Status:${NC}"
docker compose ps
echo ""

echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Update abgeschlossen!${NC}"
echo -e "${GREEN}  🌐 https://ginohome.de${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo ""
