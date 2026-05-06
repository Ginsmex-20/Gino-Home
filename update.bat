@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: ═══════════════════════════════════════════════════════════════════
::  Gino-Home — Update Skript (Windows)
::  Doppelklick → alles wird aktualisiert
:: ═══════════════════════════════════════════════════════════════════

:: ── ⚙️  KONFIGURATION (einmal anpassen) ─────────────────────────────
set TRUENAS_USER=truenas_admin
set TRUENAS_HOST=192.168.178.20
set TRUENAS_PATH=/mnt/Tow_TB_HDD/gino-home

:: GitHub Repo (für Actions-Link)
set GITHUB_REPO=Ginsmex-20/Gino-Home
:: ─────────────────────────────────────────────────────────────────────

cls
echo.
echo  ══════════════════════════════════════════════
echo    Gino-Home Update
echo  ══════════════════════════════════════════════
echo.

:: ── 1. Commit + Push ────────────────────────────────────────────────
echo  [1/3] Code zu GitHub pushen...
echo.

cd /d "%~dp0"

git add .

:: Commit-Nachricht abfragen
set /p COMMIT_MSG= Commit-Nachricht (Enter = "Update"):
if "!COMMIT_MSG!"=="" set COMMIT_MSG=Update

git commit -m "!COMMIT_MSG!" 2>nul
if errorlevel 1 (
    echo  -- Keine neuen Aenderungen zum committen --
) else (
    echo  [OK] Commit erstellt
)

git push
if errorlevel 1 (
    echo  [FEHLER] Push fehlgeschlagen^^!
    pause
    exit /b 1
)
echo  [OK] Code gepusht
echo.

:: ── 2. TrueNAS updaten (SSH) ─────────────────────────────────────────
echo  [2/3] Website auf TrueNAS aktualisieren...
echo.

ssh %TRUENAS_USER%@%TRUENAS_HOST% "cd %TRUENAS_PATH% && bash update.sh"

if errorlevel 1 (
    echo.
    echo  [FEHLER] SSH-Verbindung fehlgeschlagen^^!
    echo  Pruefen: Ist TrueNAS erreichbar? Ist der Pfad korrekt?
    echo  Host: %TRUENAS_HOST%
    echo  Pfad: %TRUENAS_PATH%
    echo.
    pause
    exit /b 1
)

:: ── 3. Fertig ────────────────────────────────────────────────────────
echo.
echo  [3/3] Update abgeschlossen^^!
echo.
echo  ══════════════════════════════════════════════
echo    ✅ Gino-Home ist aktuell^^!
echo.
echo    🌐 Website:  https://ginohome.de
echo    📱 App/iOS:  Automatisch aktuell (laedt Website)
echo.
echo    💻 Neue .exe bauen (nur wenn Electron geaendert):
echo    https://github.com/%GITHUB_REPO%/actions
echo  ══════════════════════════════════════════════
echo.

pause
