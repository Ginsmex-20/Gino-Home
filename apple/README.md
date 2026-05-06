# Gino-Home — iOS / macOS App

Native SwiftUI shell that loads `https://ginohome.de` in a WKWebView.

## Warum WebView statt voll-nativer Port?

Damit ein TrueNAS-Update (`update.sh` → `git pull` + `docker compose up --build -d`) automatisch alle Clients aktualisiert: Web, Electron, iOS, macOS. Ein voll-nativer SwiftUI-Port oder Capacitor-App würde für jede Feature-Änderung App-Store-Review bedeuten (1-7 Tage). Die Native-Schale wird nur selten geändert (Login, Push, Native-Menüs).

## Build

```bash
cd apple
python3 generate_xcodeproj.py     # erzeugt GinoHome.xcodeproj
open GinoHome.xcodeproj
```

Oder per CLI:

```bash
xcodebuild -project GinoHome.xcodeproj -scheme GinoHome \
  -destination "platform=iOS Simulator,name=iPhone 17" build
```

Mac Catalyst:

```bash
xcodebuild -project GinoHome.xcodeproj -scheme GinoHome \
  -destination "platform=macOS,variant=Mac Catalyst" build
```

## Targets

- **iOS 17+** (iPhone + iPad)
- **macOS 14+** via Mac Catalyst
- Bundle ID: `de.gino-home.app` (passt zur Electron-App)
- Dev Team: `Z39M824865`

## Struktur

```
apple/
├── generate_xcodeproj.py   ← pbxproj-Generator (kein Xcode-GUI nötig)
└── GinoHome/
    ├── GinoHomeApp.swift     ← @main entry point
    ├── AppConfig.swift       ← URL der Web-App
    ├── ContentView.swift     ← Splash + WebView + Error-State
    ├── WebView.swift         ← UIViewRepresentable um WKWebView
    ├── WebCoordinator.swift  ← Navigation, Reload, Errors
    ├── Info.plist
    ├── GinoHome.entitlements ← App Sandbox + Network Client
    └── Assets.xcassets/
```

## Wenn neue Swift-Dateien hinzukommen

`generate_xcodeproj.py` öffnen → in `SOURCES = [...]` einen neuen Eintrag ergänzen → `python3 generate_xcodeproj.py` laufen lassen → fertig.

## Native Features

Aktuell:
- WKWebView lädt ginohome.de
- Pull-to-refresh
- Splash-Screen während Initial-Load
- Offline/Error-Fallback
- Persistente Cookies (Login bleibt erhalten)
- `tel:`, `mailto:`, `sms:` Links öffnen native Apps
- Custom User Agent: `… GinoHome-iOS/1.0`

Geplant (Native-Schicht erweitern → schrittweise je App-Store-Update):
- [ ] Face ID / Touch ID Gate vor WebView
- [ ] Push Notifications via APNs (Bridge zum Socket.io-Backend)
- [ ] Share Extension
- [ ] Universal Links / Deep Links für Routen wie `/groups/:id`
- [ ] Datei-Download-Handler (statt Browser-Standard)
- [ ] Native Bottom-Tab oder Side-Bar als Shell um die WebView (Apple verlangt Native-Funktionalität für reine WebView-Wrapper)
- [ ] Biometrische 2FA-Bestätigung
