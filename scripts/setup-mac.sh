#!/bin/bash
# ═══════════════════════════════════════════════════════
# Gino-Home — MacBook + iOS Setup Script
# Auf dem MacBook ausführen: bash scripts/setup-mac.sh
# ═══════════════════════════════════════════════════════

set -e
echo ""
echo "🏠 Gino-Home — macOS + iOS Setup"
echo "══════════════════════════════════"
echo ""

# Node.js prüfen
if ! command -v node &> /dev/null; then
  echo "❌ Node.js nicht gefunden. Bitte installieren:"
  echo "   https://nodejs.org  (LTS Version)"
  exit 1
fi
echo "✅ Node.js $(node -v) gefunden"

# Xcode prüfen
if ! command -v xcode-select &> /dev/null || ! xcode-select -p &> /dev/null; then
  echo "❌ Xcode nicht gefunden. Bitte installieren:"
  echo "   App Store → Xcode"
  exit 1
fi
echo "✅ Xcode gefunden"

# Homebrew prüfen (kein sudo nötig)
if ! command -v brew &> /dev/null; then
  echo "📦 Homebrew wird installiert..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Homebrew zum PATH hinzufügen (Apple Silicon Mac)
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi
echo "✅ Homebrew gefunden"

# CocoaPods über Homebrew (kein sudo nötig!)
if ! command -v pod &> /dev/null; then
  echo "📦 CocoaPods wird installiert (kein Passwort nötig)..."
  brew install cocoapods
fi
echo "✅ CocoaPods gefunden"

echo ""
echo "📦 Dependencies installieren..."
npm install

echo ""
echo "📦 Capacitor & iOS Pakete installieren..."
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/ios \
            @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard \
            @capacitor/haptics @capacitor/app

echo ""
echo "🔨 React App bauen..."
VITE_ELECTRON=true npm run build

echo ""
echo "📱 Capacitor iOS initialisieren..."
if [ ! -d "ios" ]; then
  npx cap add ios
  echo "✅ iOS Plattform hinzugefügt"
else
  echo "ℹ️  iOS Ordner existiert bereits"
fi

echo ""
echo "🔄 Capacitor sync..."
npx cap sync ios

cd ..

echo ""
echo "══════════════════════════════════════════════"
echo "✅ Setup abgeschlossen!"
echo ""
echo "📋 Nächste Schritte:"
echo ""
echo "1️⃣  Railway URL eintragen:"
echo "   frontend/capacitor.config.ts → server.url"
echo "   frontend/src/api/client.js   → DEINE-RAILWAY-URL"
echo ""
echo "2️⃣  Xcode öffnen:"
echo "   cd frontend && npx cap open ios"
echo ""
echo "3️⃣  In Xcode:"
echo "   • Oben links → Signing & Capabilities"
echo "   • Team → Dein Apple Developer Account"
echo "   • Bundle ID: de.ginsmex.ginohome"
echo "   • Gerät anschließen → ▶ Play drücken"
echo ""
echo "4️⃣  macOS Electron App bauen:"
echo "   npm run build:mac"
echo "   → dist-app/Gino-Home-1.0.0.dmg"
echo "══════════════════════════════════════════════"
