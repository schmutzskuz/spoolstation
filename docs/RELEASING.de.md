# Release erstellen

Diese Anleitung beschreibt, wie du eine neue Version von SpoolStation veröffentlichst.
App und Firmware teilen sich **eine** Versionsnummer. Ein Tag `vX.Y.Z` löst den
Release-Workflow (`.github/workflows/release.yml`) aus: Firmware bauen, Windows-Installer
bauen und ein GitHub-Release mit allen Dateien anlegen.

> Alle Befehle laufen im Projekt-Hauptordner (`F:\Claude\spoolstation`), sofern nicht anders
> angegeben. Terminal: PowerShell.

## Überblick

1. Version erhöhen (`version:bump`).
2. Firmware neu bauen (`pio run`).
3. CHANGELOG ausfüllen.
4. Prüfen (Typecheck, Tests, Build).
5. Committen.
6. Tag setzen und pushen.
7. Release auf GitHub prüfen.

## Schritt für Schritt

### 1. Sauberer Ausgangspunkt

```powershell
git status
git pull
```

Es sollten keine ungespeicherten Änderungen offen sein und `main` aktuell sein.

### 2. Version erhöhen

```powershell
npm run version:bump -- patch   # oder minor | major
```

Das aktualisiert `version.json` und daraus `firmware/include/version.h`,
`desktop/package.json`, `package.json` und `desktop/src/shared/version.ts` und legt im
`CHANGELOG.md` ein Gerüst für die neue Version an. **Versionen nie von Hand ändern.**

> Nur wenn sich die **HTTP-API der Station** geändert hat: `api_version` in `version.json`
> von Hand erhöhen und danach `npm run version:bump -- sync` ausführen.

### 3. Firmware neu bauen

```powershell
cd firmware
pio run
cd ..
```

Wichtig, weil die neue Versionsnummer in `factory.bin`/`ota.bin` eingebacken wird und die
aktuelle Firmware in die App kopiert wird. (Im Release baut die CI die Firmware ohnehin
neu – dieser Schritt dient dem lokalen Prüfen.)

### 4. CHANGELOG ausfüllen

Öffne `CHANGELOG.md` und ersetze unter der neuen Version das „_Noch auszufüllen._" durch die
tatsächlichen Änderungen. Der Text dieses Abschnitts wird automatisch zu den
**Release-Notes** auf GitHub.

### 5. Prüfen

```powershell
cd desktop
npm run typecheck
npm run test
npm run build
cd ..
```

Alles muss grün sein (das prüft später auch die CI).

### 6. Committen

```powershell
git add -A
git commit -m "Release vX.Y.Z"
```

### 7. Tag setzen und pushen

```powershell
git push origin main
git tag vX.Y.Z
git push origin vX.Y.Z
```

Der Tag-Push startet den Release-Workflow.

### 8. Release prüfen

- **Actions:** `https://github.com/schmutzskuz/spoolstation/actions` – der Lauf „Release"
  muss grün sein (Jobs: Firmware, Windows-Installer, Publish).
- **Release:** `https://github.com/schmutzskuz/spoolstation/releases/tag/vX.Y.Z` – es müssen
  diese Dateien hängen:
  - `SpoolStation.Setup.X.Y.Z.exe` (+ `.blockmap`)
  - `latest.yml` (für das automatische App-Update)
  - `factory.bin`, `ota.bin`, `firmware-manifest.json`

Fertig: Bestehende Installationen bekommen das App-Update automatisch; die Station bietet
das Firmware-Update per Funk an.

## Einen fehlgeschlagenen Release korrigieren

1. **Ursache finden:** Auf GitHub unter *Actions* den fehlgeschlagenen „Release"-Lauf
   öffnen und im roten Job das Log lesen.
2. **Fehler beheben** und den Fix committen:
   ```powershell
   git add -A
   git commit -m "fix: <was war kaputt>"
   git push origin main
   ```
3. **Tag auf den Fix verschieben** – nur solange noch **kein** Release veröffentlicht wurde:
   ```powershell
   git tag -f vX.Y.Z
   git push -f origin vX.Y.Z
   ```
   Der Tag-Push startet den Workflow erneut, diesmal mit dem korrigierten Stand.
4. **Falls schon ein (kaputtes) Release veröffentlicht wurde:** auf GitHub unter *Releases*
   das Release **löschen**, dann wie in Schritt 3 den Tag neu pushen. Alternativ sauberer:
   gleich eine neue Patch-Version machen (`version:bump -- patch`, Schritte 2–7).

> **Nur erneut ausführen statt neu bauen?** Wenn der Fehler *nicht* am Code lag (z. B. ein
> kurzzeitiger Netzwerkfehler beim Download), reicht auf GitHub beim fehlgeschlagenen Lauf
> „Re-run failed jobs". Lag es am Code, muss erst der Fix rein (Schritte 2–3).

## Beta-Versionen (optional)

Für Vorabversionen einen Prerelease-Tag verwenden (z. B. `v1.1.0-beta.1`) und das Release auf
GitHub als *Pre-release* markieren. Nutzer mit Update-Kanal **Beta** (Einstellungen → Updates)
bekommen es dann; der Stabil-Kanal bleibt unberührt.
