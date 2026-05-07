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
- Safari-kompatibler User Agent (Google OAuth funktioniert nicht in WKWebView ohne Bridge)
- **Native Auth Bridge** (`AuthService.swift`):
  - Google Sign In via `ASWebAuthenticationSession` (echtes Safari)
  - Sign in with Apple via `AuthorizationServices.framework`
  - JS-API: `await window.GinoHomeNative.signIn('google' | 'apple')`

### Native Auth Bridge — Setup-Schritte (einmalig)

1. **Apple Developer Console** ([developer.apple.com/account](https://developer.apple.com/account/resources/identifiers/list))
   - App-ID `de.gino-home.app` öffnen
   - Capability **"Sign in with Apple"** aktivieren → Save
   - Provisioning Profile neu erstellen (Xcode macht das automatisch beim nächsten Build mit echtem Gerät)

2. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com/apis/credentials))
   - OAuth 2.0 Client ID `242636055004-oh3s00m3523bvmoqhh5upm32nnclab9s` öffnen
   - Bei "Authorized redirect URIs" hinzufügen:
     ```
     https://ginohome.de/auth/native-callback.html
     ```
   - Save

3. **Frontend deployen** (TrueNAS) — der neue Login-Screen mit Apple-Button kommt über den normalen Update-Flow.

### Wie die Bridge funktioniert

```
React Login.jsx
   └─ window.GinoHomeNative.signIn('google')
       └─ window.webkit.messageHandlers.nativeAuth.postMessage({...})
           └─ AuthService.handleMessage  (Swift)
               ├─ google → ASWebAuthenticationSession
               │    └─ Safari → google.com → redirect
               │        → https://ginohome.de/auth/native-callback.html#access_token=…
               │        → de.gino-home.app://oauth/google#access_token=…
               │        → Session-Callback liefert URL zurück
               └─ apple → ASAuthorizationAppleIDProvider
                    └─ Native Apple-Sheet → identityToken
   ← webView.evaluateJavaScript("window.handleNativeAuthResult({...})")
   ← Promise resolved → loginWithGoogle(token) bzw. loginWithApple(idToken, user)
   ← POST /api/auth/google bzw. /api/auth/apple
   ← JWT in localStorage → eingeloggt
```

## Geplant
- [ ] Face ID / Touch ID Gate vor WebView
- [ ] Push Notifications via APNs (Bridge zum Socket.io-Backend)
- [ ] Share Extension
- [ ] Universal Links / Deep Links für Routen wie `/groups/:id`
- [ ] Datei-Download-Handler (statt Browser-Standard)
- [ ] Native Bottom-Tab oder Side-Bar als Shell um die WebView (Apple verlangt Native-Funktionalität für reine WebView-Wrapper)
- [ ] Biometrische 2FA-Bestätigung
