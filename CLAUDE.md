# SpoolStation – Projektspezifikation für Claude Code

Diese Datei ist die verbindliche Spezifikation. Halte dich exakt an Pins, IPs, Formate und API.
Wenn du etwas Abweichendes herausfindest (z. B. durch Recherche im Paxx-Firmware-Code), passe
diese Datei an und sag dem Nutzer, was du geändert hast.

## Projektstand (Stand 2026-11-03, FW 0.9.2 / App 0.9.2)

### Fertig und gebaut
- **Firmware** (`firmware/`, kompiliert): Display-Design „Werkstatt" (echte Filamentfarben, Messing-Auswahl,
  Spulengrafik, weiche Animationen, NFC-Wellen, Erfolg/Fehler, Auto-Dimmen); Drucker-Slot-Polling im
  Hintergrund-Task (AFC_lane + Spoolman-Restgewicht); PC-Aufträge zeigen Erfolg/Fehler am Gerät;
  Texte de/en/es; **Einrichtung über USB** (keine `secrets.h` mehr, Zugangsdaten nur NVS, `@@SS`-Protokoll,
  Boot-Signal `@@SS ready`, robustes `scan_wifi`); Werksreset per Encoder (10 s); OTA-Partitionen
  (`ota_0`/`ota_1`) + Rollback-Markierung; Build erzeugt `factory.bin`/`ota.bin`/`firmware-manifest.json`.
  **OTA-Update über WLAN** (`POST /api/ota`, SHA-256-Prüfung, Fortschrittsbogen am Display „Update wird
  installiert / Nicht ausschalten", Neustart, Rollback-Erkennung → `/api/status.last_ota`); `/api/status`
  meldet `api_version`. **WLAN-OTA an echter Hardware bestätigt** (0.9.1 → 0.9.2 gelaufen).
- **PC-Programm** (`desktop/`, baut): Drucker-Seite mit Kopf (Name, Status, Druckzustand/Fortschritt,
  Tabs, Leer-Hinweis); Bibliothek (Liste + Filament-/Spulen-/Hersteller-Detail, responsiv via
  Container-Breite); Einstellungen (Formular-/Polling-Fix, Drucker-Liste, Sprache); Mehrsprachigkeit
  (i18next, keine hartkodierten Strings, Intl-Zahlen/Daten, Installer-Sprachwahl + Registry);
  Tag schreiben/lesen über **Job-Store** (StrictMode-sicher, 409 hängt sich an laufenden Job an);
  **Einrichtungsassistent** (USB-Flashen mit esptool-js/Web Serial, Provisionierung, Koppeln USB/Netzwerk);
  **Updater** (App-Update via electron-updater/GitHub-Releases mit Banner + Einstellungen; Firmware-OTA auf
  der Station-Seite inkl. Release-Abgleich, mitgelieferter Firmware und „Firmware-Datei auswählen…";
  USB-Weg „Firmware aktualisieren, Einstellungen behalten"; alte Firmware ohne OTA-Endpunkt → Hinweis + USB;
  **klickbare Update-Hinweise** in der Statusleiste mit Versions-Tooltip, die zur jeweiligen Stelle springen;
  App-Version in der Sidebar aus `APP_VERSION`).
- **Tests** (vitest, 52 grün): `moonraker` (parseSlots/parseState), `locales` (Schlüssel-Parität de/en/es),
  `draft`, `nfc` (409-Logik), `jobStore` (Start-once/Tracking), `stationSerial` (Parser + simulierte Station),
  `fwUpdate` (Versionsvergleich, Manifest-Prüfung, OTA-Ablauf gegen simulierte Station).
- **Vorschau-Renders** (vor dem Flashen/Review): App-Seiten `npm run shot` → `desktop/.shots/`,
  Display-Zustände `node scripts/shot-display.mjs` → `firmware/preview/.shots/` (beide gitignored).

### Bekannte offene Punkte
- **USB-Flashen/Provisionierung an echter Hardware**: Flashen + Auto-Reset + WLAN-Scan laufen (letzter Test);
  der Rest (`set_wifi` → Schlüssel → Config → „Fertig") ist noch **nicht voll an Hardware bestätigt**.
- **OTA an echter Hardware**: Der **WLAN-OTA-Schreibweg ist bestätigt** (0.9.1 → 0.9.2 per „Firmware-Datei
  auswählen…"/mitgelieferte Firmware gelaufen). Noch **nicht geprüft**: echtes Bootloader-**Rollback** bei
  kaputter Firmware (greift nur, wenn der Bootloader es aktiviert hat – Arduino-Standardbootloader evtl.
  nicht; unabhängig davon meldet `last_ota` beim nächsten Start korrekt `success`/`rolled_back`, NVS-Merker
  Ziel- vs. laufende Partition) und der USB-Weg „Firmware aktualisieren, Einstellungen behalten" an echter
  Hardware. **Update-Quelle (`schmutzskuz/spoolstation`) existiert noch nicht** → App zeigt bis dahin
  „Update-Quelle nicht eingerichtet"/„Noch kein Online-Release" bzw. nutzt die mitgelieferte Firmware
  (App-Auto-Update greift erst mit echten GitHub-Releases und nur im installierten Programm).
- Manche **CH340-Boards ohne Auto-Reset-Kondensator** starten nach dem Flash nicht selbst → im Assistenten
  **EN-Taste** drücken + „Erneut versuchen".
- **Port-Auswahl** bei mehreren USB-Seriell-Geräten: aktuell Auto-Pick (bekannte VID bevorzugt), der
  Renderer bekommt die Liste (`serial:ports`), aber es gibt noch keinen Auswahldialog.
- `factory.bin`/`resources/firmware/` sind **gitignored** → vor Paketieren/Testen immer `pio run`.

### Wichtige Entscheidungen (letzte Tage)
- **Keine `secrets.h`**: WLAN/Passwort/API-Schlüssel nur im NVS, setzbar **nur über USB**; die WLAN-API ist
  ohne gesetzten `api_key` komplett gesperrt (401). Standardwerte in der Config sind leer.
- **Job-Store** trennt *Starten* (genau einmal) von *Verfolgen* (jeder Mount) → React-StrictMode-Remounts
  können den Tag-Dialog nicht mehr hängen lassen; 409 = „läuft schon" statt Fehler.
- **Responsives Detail-Panel**: echte Container-Breite messen (`useNarrow`), nicht Viewport-Breakpoints.
- **Display-Vorschau** ist ein JS-Spiegel der Zeichnung (`firmware/preview/display.html`), kein echtes
  LovyanGFX-PC-Target.
- **Serieller Reset-Handshake** nach dem Flashen: Firmware sendet `@@SS ready`; die App pulst EN korrekt
  (DTR/RTS) und wartet mit `waitForStation` auf ready/hello (mehrere Versuche) statt auf feste Zeit.
- **Eine Versionsquelle, eine Update-Quelle**: `version.json` (version + api_version) und `update.config.json`
  (owner/repo) im Hauptordner sind die einzigen Stellen; alles andere wird von `npm run version:bump`
  generiert bzw. zur Laufzeit gelesen. Sichtbare Versionen immer aus `APP_VERSION`/`FW_VERSION`, nie
  hartkodiert (die Sidebar war das – gefixt).
- **OTA-Kompatibilität über `api_version`**: Meldet die Station kein `api_version` (alte FW) oder gibt der
  Endpunkt 404, bietet die App **kein** fehlschlagendes WLAN-Update an, sondern den klaren USB-Weg
  „Firmware aktualisieren, Einstellungen behalten" (`flashFirmwareKeepSettings`: nur App-Partition +
  otadata-Reset, NVS bleibt).
- **Rollback-Erkennung ohne Bootloader-Abhängigkeit**: NVS-Merker (Ziel- vs. laufende Partition beim
  nächsten Boot) → `last_ota` ist korrekt, egal ob der Bootloader echtes Auto-Rollback kann.

### Bauen, Flashen, Testen (Windows/PowerShell)
- **Firmware bauen** (immer zuerst, damit die App die aktuelle `factory.bin` mitbringt):
  ```bash
  cd firmware
  pio run
  ```
  Erzeugt `firmware/dist/factory.bin` + `ota.bin` + Manifest und kopiert alle drei nach
  `desktop/resources/firmware/`. Eigenen ESP32 direkt flashen: `pio run -t upload`. Serielle Ausgabe: `pio device monitor`.
- **Version bumpen** (gemeinsam für App + Firmware, aus dem Hauptordner):
  ```bash
  npm run version:bump -- patch   # oder minor | major | sync
  ```
  Schreibt `version.json` → `firmware/include/version.h`, `desktop/package.json`, `package.json`,
  `desktop/src/shared/version.ts` und legt ein CHANGELOG-Gerüst an. Danach Firmware neu bauen.
- **PC-Programm**:
  ```bash
  cd desktop
  npm install            # einmalig
  npm run dev            # Entwicklung
  npm run typecheck      # TypeScript
  npm run test           # bzw. npx vitest run
  npm run build          # Produktionsbuild prüfen
  npm run build:win      # Windows-Installer (NSIS) nach desktop/release/
  npm run shot           # App-Vorschau-PNGs
  node scripts/shot-display.mjs   # Display-Vorschau-PNGs
  ```
- **Station komplett neu aufsetzen**: `pio run` → App starten → Assistent (Erststart oder
  Einstellungen → „Station einrichten") → „Neue Station einrichten (USB)" → „Komplett neu" → Port wählen →
  flashen → WLAN wählen/Passwort → „Einrichten". **Verloren geht** der NVS der Station (altes WLAN,
  alter API-Schlüssel, Drucker, Spoolman-URL, Sprache); Spoolman-Datenbank, Drucker und Tag-Daten bleiben.

## Arbeitsregeln

- Antworte auf Deutsch, locker und verständlich. Der Nutzer ist erfahrener Webentwickler,
  aber Anfänger bei Elektronik: Erkläre Hardware-Schritte kleinschrittig.
- Code immer vollständig: keine Stubs, keine TODOs, keine Platzhalter wie "// hier Logik".
- Nach jedem Schritt selbst kompilieren/bauen (`pio run` bzw. `npm run build`) und Fehler beheben,
  bevor du dem Nutzer meldest, dass du fertig bist. Hochladen auf den ESP32 macht der Nutzer selbst.
- Klare Empfehlungen statt Optionslisten.
- Nach jedem funktionierenden Schritt einen Git-Commit vorschlagen.
- Zugangsdaten (WLAN, API-Schlüssel) nie committen und nie fest im Code: sie liegen nur im NVS der
  Station und werden per USB-Einrichtung gesetzt (keine `secrets.h` mehr).
- Betriebssystem des Nutzers: Windows, Terminal PowerShell in VS Code. Befehle für PowerShell schreiben
  (curl dort als `curl.exe`).

## Ordnerstruktur

```
spoolstation/
  CLAUDE.md
  reference/wasikuss-reader/   altes MicroPython-Projekt (nur Referenz, nicht ändern)
  hwtest/                      PlatformIO-Testprogramm für die Verkabelung
  firmware/                    PlatformIO-Firmware der Station
  desktop/                     Electron-PC-Programm
```

## Netzwerk

> Die Adressen unten sind **Beispielwerte** aus einem konkreten Setup. Sie stehen nirgends fest im
> Code: Drucker/Spoolman/Station werden im PC-Programm bzw. per USB-Einrichtung gesetzt und liegen
> nur im NVS/electron-store. Beim Testen ggf. an das eigene Netz anpassen.

| Gerät | Adresse (Beispiel) |
| --- | --- |
| Snapmaker U1 (Paxx Extended Firmware, Spoolman-Integration aktiv) | 192.168.1.42, Moonraker-Port 7125 |
| Spoolman (Raspberry Pi 4) | http://192.168.1.50:7912 (Standard, im Programm änderbar; falls nicht erreichbar Port 8000) |
| Station (ESP32) | DHCP, feste Zuweisung im Router; mDNS `spoolstation.local` |
| Router | beliebiger WLAN-Router mit 2,4 GHz |

## Hardware

- ESP32 DevKit, ESP32-WROOM-32, USB-C, CH340 (PlatformIO-Board `esp32dev`)
- PN532 NFC-Modul V3 (rot), DIP-Schalter auf SPI (1 = OFF, 2 = ON), Versorgung 3,3 V
- GC9A01 rundes TFT 1,28", 240×240, SPI, Versorgung 3,3 V
- EC11 Drehencoder mit Taster, ohne Widerstände (interne Pull-ups nutzen), gegen GND schaltend
- Tags: NTAG215 (504 Byte Nutzspeicher, Seiten 4–129, 7-Byte-UID)

### Pinbelegung (verbindlich)

| Funktion | GPIO | Bus/Hinweis |
| --- | --- | --- |
| Display SCLK (SCL) | 18 | VSPI |
| Display MOSI (SDA) | 23 | VSPI |
| Display RST (RES) | 17 | |
| Display DC | 16 | |
| Display CS | 5 | |
| Display Backlight (BLK) | 4 | HIGH = an; falls Modul kein BLK hat, ignorieren |
| PN532 SCK | 14 | HSPI, eigene `SPIClass(HSPI)` |
| PN532 MISO | 27 | HSPI |
| PN532 MOSI | 13 | HSPI |
| PN532 SS | 26 | HSPI |
| Encoder A | 32 | INPUT_PULLUP |
| Encoder B | 33 | INPUT_PULLUP |
| Encoder Taster | 25 | INPUT_PULLUP, gedrückt = LOW |

Nicht benutzen: GPIO 0, 2, 12, 15 (Strapping), 6–11 (Flash), 34–39 (nur Eingang, keine Pull-ups).

## Firmware (`firmware/`)

### Technik

- PlatformIO, Framework Arduino, `platform = espressif32` (aktuelle stabile Version festpinnen),
  `board = esp32dev`, `monitor_speed = 115200`, `board_build.partitions = min_spiffs.csv` falls Platz nötig.
- Bibliotheken (in `lib_deps` mit Version festpinnen):
  - Display: **LovyanGFX** (Panel GC9A01, Konfiguration im Code, Bus VSPI). Sprites für flackerfreie Darstellung.
  - NFC: **Adafruit PN532** mit Hardware-SPI über eigene `SPIClass hspi(HSPI); hspi.begin(14, 27, 13, 26);`
    und Konstruktor `Adafruit_PN532(26, &hspi)`. Falls die Bibliotheksversion das nicht kann,
    eine passende Version wählen oder den Treiber anpassen.
  - Webserver: **ESPAsyncWebServer** (Fork `mathieucarbou/ESPAsyncWebServer`) + **AsyncTCP** (gleicher Fork)
  - JSON: **ArduinoJson** 7.x
  - mDNS: `ESPmDNS` aus dem Core
  - Konfiguration: `Preferences` (NVS)
  - Encoder: eigene Implementierung (Quadratur-Zustandsautomat per Interrupt, Taster mit Software-Entprellung
    und Kurz/Lang-Erkennung). Keine Encoder-Bibliothek.
- NFC-Zugriffe laufen in einem eigenen FreeRTOS-Task bzw. nicht-blockierend; der Webserver-Callback
  darf nie auf einen Tag warten. Display und NFC dürfen sich nicht gegenseitig blockieren.
- **Keine Zugangsdaten im Code.** WLAN-SSID/Passwort und API-Schlüssel liegen ausschließlich im NVS
  und werden per USB-Einrichtung gesetzt (s. „Einrichtung über USB"). Standardwerte sind leer; eine
  unkonfigurierte Station startet im Einrichtungsmodus.

### Konfiguration (NVS, über API änderbar)

| Schlüssel | Standard | Setzbar über |
| --- | --- | --- |
| `wifi_ssid` | `""` (leer) | **nur USB** |
| `wifi_pass` | `""` (leer) | **nur USB** |
| `api_key` | `""` (leer) | **nur USB** |
| `printer_host` | `""` (leer) | USB + WLAN-API |
| `printer_port` | `7125` | USB + WLAN-API |
| `spoolman_url` | `""` (leer) | USB + WLAN-API |
| `device_name` | `spoolstation` | USB + WLAN-API |
| `enc_reverse` | `false` | USB + WLAN-API |
| `read_timeout_ms` | `10000` | USB + WLAN-API |
| `lang` | `de` – Geräteanzeige (`de`/`en`/`es`); PC sendet seine Sprache automatisch mit | USB + WLAN-API |
| `printers` | JSON-Array bis 4 Drucker `[{name, host, port}]`; leer, wenn nichts eingerichtet. `printers[0]` spiegelt `printer_host`/`printer_port`. | USB + WLAN-API |

Zugangsdaten (`wifi_*`, `api_key`) werden aus Sicherheitsgründen **nicht** über die WLAN-API
(`PUT /api/config`) oder `GET /api/config` übertragen, sondern nur über die USB-Einrichtung.
Ist kein `api_key` gesetzt, ist die WLAN-API komplett gesperrt (401).

**Mehrere Drucker:** Die Station speichert bis zu 4 Drucker (`printers`) im NVS. Das PC-Programm pflegt die
Liste (Einstellungen: hinzufügen/bearbeiten/löschen/Verbindung testen, erster = Standard) und synchronisiert
sie per `PUT /api/config` (`{"printers": [...]}`). `GET /api/config` liefert `printers` zurück. Am Gerät
dreht der Encoder durch alle Slots aller Drucker (flacher Index); das Display zeigt bei mehr als einem
Drucker den Druckernamen + Slot (z. B. `U1 · Slot 3`), bei nur einem Drucker wie bisher nur `T1`–`T4`.
Die Slot-Anzahl pro Drucker ergibt sich im PC-Programm aus den `AFC_lane`-Objekten des jeweiligen Druckers.

### Einrichtung über USB (Serial-Protokoll)

Die Station wird komplett aus dem PC-Programm eingerichtet – auch ein fabrikneuer ESP32, ohne
VS Code, ohne Webseite, ohne `secrets.h`. Ohne Konfiguration startet sie im Einrichtungsmodus
(Display „Mit PC verbinden (USB)").

- Transport: USB-Seriell, 115200, **parallel** zur normalen Log-Ausgabe.
- Antworten der Station sind mit dem Präfix **`@@SS `** markiert und sind JSON; alles andere sind
  Logzeilen und wird vom PC ignoriert. Befehle kommen als **JSON-Zeilen** (ein Objekt mit `cmd`).
- **Nur über USB erreichbar, nicht über WLAN.** `api_version` (derzeit `1`) in `hello`/`get_info`.

| Befehl | Parameter | Antwort (`@@SS {…}`) |
| --- | --- | --- |
| `hello` | – | `{ok, cmd, info:{device, fw, api_version, configured, mac, has_key, device_name, lang}}` |
| `scan_wifi` | – | `{ok, cmd, networks:[{ssid, rssi, enc}]}` |
| `set_wifi` | `{ssid, password}` | testet die Verbindung (bis 15 s); Erfolg `{ok:true, ip, rssi}` und speichert, sonst `{ok:false, error}` |
| `set_key` | `{key}` | `{ok}` (Schlüssel ≥ 8 Zeichen) |
| `set_config` | `{printers, spoolman_url, lang, device_name, …}` | `{ok, changed, config}` (keine Zugangsdaten) |
| `get_info` | – | `{ok, info, ip?, config}` |
| `reboot` | – | `{ok}` dann Neustart |
| `factory_reset` | – | `{ok}` dann NVS löschen + Neustart |

Firmware: `firmware/src/setupserial.cpp` (`setupSerialLoop()` aus `loop()`), Protokoll-Version
`SETUP_API_VERSION` in `include/setupserial.h`. PC-Seite: `desktop/src/renderer/src/lib/stationSerial.ts`
(Parser + Befehle, über ein abstraktes `LineIO` testbar) + `lib/webSerial.ts` (Web-Serial-Adapter).
Werksreset auch am Gerät: Encoder beim Einstecken 10 s gedrückt halten → Sicherheitsabfrage → NVS löschen.

### Partitionen / OTA

`firmware/partitions_ota.csv` (4 MB Flash): zwei App-Partitionen `ota_0`/`ota_1` (je 1,75 MB) für
OTA-Update und Rollback (vorbereitet). Nach einem sauberen Start **mit WLAN** markiert sich die
Firmware per `esp_ota_mark_app_valid_cancel_rollback()` als gültig (nur wenn der Image-Status
`PENDING_VERIFY` ist). Das eigentliche OTA-Schreiben kommt separat (Prompt B).

### Build-Artefakte

`firmware/scripts/post_build.py` (PlatformIO `extra_scripts = post:…`) erzeugt nach jedem Build in
`firmware/dist/`:

- **`factory.bin`** – Bootloader + Partitionen + `boot_app0` + App, per esptool `merge_bin` zusammengefügt,
  flashbar ab `0x0` (für fabrikneue/komplett neu aufzuspielende ESP32).
- **`ota.bin`** – nur die App (für spätere OTA-Updates).
- **`firmware-manifest.json`** – `version`, `api_version`, Dateien mit Größe und SHA-256.

Zusätzlich werden `factory.bin` + Manifest nach `desktop/resources/firmware/` kopiert, damit das
PC-Programm die aktuelle Firmware offline mitbringt (electron-builder `extraResources`; beide Ordner
sind gitignored, müssen also per Firmware-Build erzeugt werden, bevor die App paketiert wird).

### Tag-Format: OpenSpool in NDEF

- NDEF-Message im TLV (Typ `0x03`) ab Seite 4, abgeschlossen mit Terminator-TLV `0xFE`.
- Genau ein Record: Header `0xD2` (MB, ME, SR, TNF = 2 MIME), Typ `application/json`, Payload = JSON.
- JSON muss < 255 Byte bleiben (Short Record), damit auch der alte wasikuss-Reader es liest.
- Beim Lesen zusätzlich Text-Records (`0xD1`, Typ `T`) mit JSON akzeptieren (wie im alten Projekt).
- Felder (OpenSpool, kompatibel zu SpoolPainter; Format im SpoolPainter-Quellcode
  github.com/ni4223/SpoolPainter gegenprüfen und diese Liste ggf. korrigieren):

```json
{
  "protocol": "openspool",
  "version": "1.0",
  "brand": "Polymaker",
  "type": "PLA",
  "subtype": "Matte",
  "color_hex": "1E90FF",
  "alpha": "FF",
  "min_temp": "190",
  "max_temp": "220",
  "bed_min_temp": "50",
  "bed_max_temp": "60",
  "spool_id": "42"
}
```

- `color_hex` ohne `#` schreiben, beim Lesen mit oder ohne `#` akzeptieren.
- Zahlen beim Lesen sowohl als String als auch als Zahl akzeptieren.
- Nach jedem Schreibvorgang Tag erneut lesen und vergleichen (Verify).
- UID-Darstellung überall: Großbuchstaben-Hex ohne Trennzeichen, z. B. `04A1B2C3D4E5F6`.

### API der Station (JSON, keine Weboberfläche)

Alle Endpunkte unter `http://<station>/api/...`. Jede Anfrage braucht den Header `X-Api-Key: <API_KEY>`,
sonst 401. CORS nicht nötig (Aufrufe kommen aus dem Electron-Main-Prozess).

| Methode | Pfad | Body | Antwort |
| --- | --- | --- | --- |
| GET | `/api/status` | – | `{name, version, ip, rssi, uptime_s, nfc_ok, busy, slot}` |
| GET | `/api/config` | – | alle Konfigurationswerte |
| PUT | `/api/config` | Teilmenge der Werte | neue Konfiguration |
| POST | `/api/nfc/read` | `{timeout_ms?}` | `{job_id}` (202) oder 409 wenn busy |
| POST | `/api/nfc/write` | `{openspool: {...}, timeout_ms?}` | `{job_id}` (202) oder 409 |
| GET | `/api/nfc/job` | – | aktueller/letzter Job (siehe unten) |
| POST | `/api/nfc/cancel` | – | `{ok:true}` |
| POST | `/api/printer/send` | `{channel, openspool, uid}` (optional `host`+`port` oder `printer_index` für den Zieldrucker; sonst Standard-Drucker) | `{ok, http_status, response}` |

Job-Objekt:

```json
{
  "job_id": 7,
  "kind": "read",
  "state": "waiting | done | error | timeout | cancelled",
  "error": "Beschreibung bei error",
  "result": {
    "uid": "04A1B2C3D4E5F6",
    "uid_len": 7,
    "tag_type": "NTAG215",
    "empty": false,
    "raw_json": "{...}",
    "openspool": { }
  }
}
```

Das PC-Programm pollt `/api/nfc/job` alle 300 ms, bis `state` nicht mehr `waiting` ist.

### Drucker-Schnittstelle (aus dem alten Projekt übernommen)

Referenz: `reference/wasikuss-reader/src/printer.py`.

- `POST http://<printer_host>:<printer_port>/printer/filament_detect/set`
- Header `Content-Type: application/json`
- Body:

```json
{
  "channel": 0,
  "info": {
    "VENDOR": "<brand>",
    "MAIN_TYPE": "<type>",
    "SUB_TYPE": "<subtype>",
    "RGB_1": 1980671,
    "ALPHA": 255,
    "HOTEND_MIN_TEMP": 190,
    "HOTEND_MAX_TEMP": 220,
    "BED_TEMP": 50,
    "CARD_UID": [4, 161, 178, 195, 212, 229, 246]
  }
}
```

- `channel` ist 0-basiert: Anzeige T1–T4 = channel 0–3. Erlaubt 0–3.
- Alle Zahlenfelder als echte JSON-Zahlen (int) senden, nicht als String – auch wenn sie im Tag als
  String stehen. Die Firmware weist unbekannte Keys ab.
- `RGB_1` = `color_hex` als Ganzzahl (Basis 16). Weitere Farben `RGB_2`..`RGB_5` optional
  (brauchen beim Lesen `COLOR_NUMS` ≥ 2..5) – für uns nicht nötig.
- `ALPHA` = int 0–255. Tag speichert Alpha als Hex-String (z. B. `"FF"`) → vor dem Senden mit Basis 16
  in int wandeln (`0xFF` = 255).
- `HOTEND_MIN_TEMP` / `HOTEND_MAX_TEMP` / `BED_TEMP` = int. `BED_TEMP` = `bed_min_temp`.
- Optional, von der Firmware akzeptiert, für uns nicht nötig: `SKU` (int). Nicht senden: `CARD_TYPE`
  und alle Read-only-Felder (`ARGB_COLOR`, `OFFICIAL`, `MANUFACTURER`, `COLOR_NUMS`, … – werden abgewiesen).
- Felder, die im Tag fehlen, weglassen.
- Erfolgsantwort der Firmware: `{"state": "success"}`, Fehler: `{"state": "error", "message": "..."}`.
  (Der Referenz-Code liest die Rohantwort noch per Socket; wir prüfen stattdessen das `state`-Feld.)
- **`CARD_UID` (geklärt gegen Paxx-Doku `docs/design/filament_detect.md`): JSON-Array von Byte-Ints**
  (`list[int]`, „Array of byte ints"), z. B. `[161, 178, 195, 212]` – **kein** Hex-String. Das deckt sich
  mit dem alten Projekt. `CARD_UID` meldet nur „Tag physisch vorhanden" und ist unabhängig von den
  Filament-Daten; ein UID-only-Set ist möglich (z. B. wenn der Tag nicht dekodiert werden konnte).
- **Wichtig – zwei verschiedene UID-Darstellungen für dieselbe UID:**
  - Richtung Drucker (`filament_detect/set`, Feld `CARD_UID`): **Byte-Int-Array** wie oben.
  - Richtung Spoolman (Zusatzfeld `card_uids`, Tag-Anzeige, UID im Programm): **Großbuchstaben-Hex ohne
    Trenner** (z. B. `04A1B2C3D4E5F6`), bestätigt durch die Spoolman-Design-Doku.
  - Die Tag→Spule-Auflösung macht die Paxx-Komponente `spoollink` selbst anhand von `card_uids` (Hex);
    `filament_detect/set` löst **keine** automatische Spoolman-Zuordnung aus. Unser PC-Programm/Gerät
    übernimmt die Spoolman-Suche also selbst (wie in „Spoolman-Anbindung" beschrieben) und schickt das
    fertige Filament dann per `filament_detect/set` an den Slot.

### Spoolman-Verbrauchsbuchung über `spoollink` (zweiter Schritt, verbindlich)

`filament_detect/set` setzt nur die Slot-Anzeige und bucht **keinen** Verbrauch in Spoolman und verknüpft
den Tag nicht mit der Spule. Dafür gibt es die Moonraker-Methode `spoollink_resolve_spool`, die von außen
**nicht** direkt per HTTP erreichbar ist (sie ist eine Klipper↔Moonraker-Remote-Methode). Der offizielle
Weg von außen ist das G-Code-Makro **`SET_SPOOL_ID`** (definiert in `spoollink/klipper.cfg` der Paxx-Firmware),
aufgerufen über `POST /printer/gcode/script`.

Quellen geprüft: `overlays/.../moonraker/components/spoollink.py` und `overlays/.../spoollink/klipper.cfg`
(Branch `develop`). Makro-Parameter:

- `CHANNEL` – Kanalindex 0–3 (direkt verwendet). Alternativ `LANE` (AFC-Lite-Name wie `E0`); wir nehmen `CHANNEL`.
- `SPOOL_ID` – Spoolman-Spulen-ID, Standard `0`.
- **`CARD_UID` ist KEIN Makro-Parameter.** Das Makro liest die UID aus
  `printer.filament_detect.info[CHANNEL].CARD_UID` (das Byte-Array, das wir zuvor per `filament_detect/set`
  gesetzt haben) und wandelt es selbst in den Hex-String um.

Verhalten:

- `SPOOL_ID` > 0: ruft `spoollink_resolve_spool(channel, spool_id, card_uid)`. `spoollink` holt die Spule per
  `GET api/v1/spool/{id}`, hängt die UID bei dieser Spule in `card_uids` an (falls noch nicht vorhanden),
  entfernt sie bei allen anderen Spulen und schiebt die Filamentdaten per internem `spoollink/set` an Klipper.
  **Erst damit ist der Slot sauber mit der Spule verknüpft und der Verbrauch wird gebucht.**
- `SPOOL_ID=0`: leert den Kanal (`SET_PRINT_FILAMENT_CONFIG ... FILAMENT_SPOOL_ID=0 FORCE=1`) und entkoppelt
  die UID per `spoollink_unlink_card`. So setzen wir einen Slot zurück.

**Verbindlicher Ablauf der Station pro Slot-Zuweisung (Reihenfolge wichtig):**

1. `POST /printer/filament_detect/set` mit `channel` + `info` inkl. `CARD_UID` (Byte-Array) – setzt Anzeige
   und hinterlegt die UID im `filament_detect`-Objekt.
2. `POST /printer/gcode/script` mit `SET_SPOOL_ID CHANNEL=<n> SPOOL_ID=<id>` – verknüpft Tag↔Spule und
   aktiviert die Verbrauchsbuchung. Die `spool_id` kommt aus dem Tag; fehlt sie, **ermittelt die Station
   die `spool_id` selbst** über die `card_uids`-Suche in Spoolman (siehe „Spoolman-Anbindung") und setzt
   sie hier ein. Es gibt keinen externen „nur per card_uid auflösen"-Weg – `SET_SPOOL_ID` ohne echte
   `SPOOL_ID` (= 0) würde den Slot stattdessen leeren.

Beispiel (PowerShell: `curl.exe`):

```bash
curl -s http://192.168.1.42:7125/printer/gcode/script ^
  -H "Content-Type: application/json" ^
  -d "{\"script\": \"SET_SPOOL_ID CHANNEL=0 SPOOL_ID=42\"}"
```

Antwort: `/printer/gcode/script` liefert bei Erfolg `{"result": "ok"}` – das bestätigt nur, dass das Makro
lief, **nicht**, dass eine Spule gefunden wurde. Kann kein Kanal bestimmt werden, gibt Moonraker einen
G-Code-Fehler zurück (Makro verlangt `CHANNEL=<index>`). Die eigentliche Auflösung läuft danach asynchron in
`spoollink`: Erfolg/„keine Spule"/„mehrere Spulen" landen nur im Log bzw. werden an Klipper gemeldet, nicht
in der HTTP-Antwort. Zum Verifizieren danach `GET /printer/objects/query?filament_detect` abfragen und den
Kanal prüfen. Da die Station die `spool_id` ohnehin selbst ermittelt, ist der „mehrere Spulen"-Fehlerfall
für uns praktisch ausgeschlossen.

### Drucker-Slots auslesen (Moonraker-Query, für die „Drucker"-Seite)

Geprüft gegen den Paxx-Code (`klippy/extras/spoollink.py`, `moonraker/components/spoollink.py`,
`docs/design/filament_detect.md`, Branch `develop`):

- Die Slots liest man über **`GET http://<printer_host>:<printer_port>/printer/objects/query?filament_detect`**.
  Antwortstruktur: `result.status.filament_detect.info` ist ein **Array mit Index 0..3** (T1–T4).
  Pro Slot u. a.: `VENDOR`, `MAIN_TYPE`, `SUB_TYPE`, `RGB_1` (int), `ALPHA`, `HOTEND_MIN_TEMP`,
  `HOTEND_MAX_TEMP`, `BED_TEMP`, `CARD_UID` (Byte-Array), `CARD_TYPE`, `COLOR_NUMS`, `OFFICIAL` u. a.
  (Read-only zusätzlich: `ARGB_COLOR`, `MANUFACTURER`, `DIAMETER`, `WEIGHT`, …).
- Das `filament_detect`-Objekt selbst enthält **kein `spool_id`**. Die Spulen-ID pro Slot liefern
  stattdessen die **AFC_lane-Objekte** (AFC-Lite-Integration, geprüft gegen `klippy/extras/AFC_lane.py`
  und `tweaks/klipper/afc.cfg`, Branch `develop`):
  - Objektnamen: **`AFC_lane E0`, `AFC_lane E1`, `AFC_lane E2`, `AFC_lane E3`** (Lane-Index 0–3 = Kanal/T1–T4).
  - `AFC_lane.get_status()` liefert u. a. `spool_id` (**0, wenn keine Spule zugeordnet**), `lane` (Index 0–3),
    `material`, `color`, `filament_name`, `map` (`"T<tool>"`). Ein `weight`/`remaining_weight` gibt es dort
    **nicht** – das Restgewicht holt das PC-Programm über `GET /spool/{id}` aus Spoolman.
  - Die AFC_lane-Objekte existieren nur, wenn die **AFC-Lite-Feature** aktiv ist. Daher vorgehen:
    1. `GET /printer/objects/list` holen und prüfen, ob `AFC_lane …`-Objekte vorhanden sind.
    2. Falls ja: in der Query zusätzlich abfragen
       (`GET /printer/objects/query?filament_detect&AFC_lane%20E0&AFC_lane%20E1&…`) und
       `result.status["AFC_lane E<n>"].spool_id` dem Kanal `lane` zuordnen.
- **Werte-Auswertung pro Slot (verbindlich, geprüft gegen die reale Druckerantwort):**
  - **`AFC_lane` ist die Hauptquelle** für `name` (aus `filament_name`), `material` (aus `material`),
    `color` (aus `color`, Format `#RRGGBB`) und `spool_id`. Die Zuordnung Lane → Slot läuft über das
    Feld **`lane` (0..3)**, nicht über die Reihenfolge. `spool_id` **0 = keine** Spoolman-Spule.
    Das AFC-Feld `name` ist der Lane-Name (`E0`) und wird **nicht** als Anzeigename verwendet.
  - **`filament_detect` liefert nur** `HOTEND_MIN_TEMP`/`HOTEND_MAX_TEMP`/`BED_TEMP`, `SUB_TYPE` und
    `CARD_UID` – und **nur wenn `VENDOR` und `MAIN_TYPE` gültig sind** (nicht `"NONE"`/leer). Ist der
    Eintrag `"NONE"`, wird der **ganze `filament_detect`-Eintrag dieses Slots ignoriert, auch `RGB_1`**.
  - Ohne AFC-Lite (keine `AFC_lane`-Objekte) dient ein gültiger `filament_detect`-Eintrag als Fallback
    für Name/Material/Farbe.
  - Die Anzahl der Slots ergibt sich aus den vorhandenen `AFC_lane`-Objekten (sonst 4).
- **Zuordnung Slot → Spoolman-Spule (im PC-Programm), in dieser Reihenfolge:**
  1. **Direkt vom Drucker:** `spool_id` aus dem `AFC_lane`-Objekt → `GET /spool/{id}` (Rest + Link).
  2. Über `CARD_UID` (aus gültigem `filament_detect`) → Großbuchstaben-Hex → Spule suchen, deren
     `extra.card_uids` diese UID enthält.
  3. **Fallback**: lokal gemerkte, tag-lose Zuweisung (electron-store: `printer_host` → Slot-Index → `spool_id`).
- Die „Drucker"-Seite pollt diese Query alle 5 s; `printer_host`/`printer_port` je Drucker kommen aus der
  Stationskonfiguration (`GET /api/config`, Feld `printers`, siehe unten).
- **Spule zuweisen (ohne Tag):** genau der verbindliche Zwei-Schritt-Ablauf oben – `filament_detect/set`
  mit den Filamentdaten der Spule (ohne `CARD_UID`), dann `SET_SPOOL_ID CHANNEL=<n> SPOOL_ID=<id>`.

### Bedienung am Gerät (Display-Design „Werkstatt")

- Stil: Graphit-Hintergrund (#25272A), Messing (#C8A04A) als einziger Akzent; Farbe kommt nur aus den
  Filamenten. LovyanGFX mit Vollbild-Sprite (bei RAM-Mangel 8-Bit oder Direktzeichnen), Ziel ~30 fps,
  Antialiasing für Bögen. Vorschau am PC: `firmware/preview/display.html` + `desktop/scripts/shot-display.mjs`
  (PNGs nach `firmware/preview/.shots/`, gitignored) – vor dem Flashen das Design dort prüfen.
- Startbildschirm: Außenring aus vier Bogensegmenten (Slot 1–4) in den **echten Filamentfarben** des
  Druckers (aus der Slot-Abfrage, s. o.), mit Lücken; sehr dunkle Farben bekommen eine helle Kontur.
  Leerer/unbekannter Slot: dünner grauer Bogen. Gewählter Slot: Segment dicker, außen eine
  Messing-Markierung (weich mitgeführt). Beschriftung 1–4 mit Kontrast zur Segmentfarbe.
  Mitte: Spule in Seitenansicht (wie SpoolGraphic, vereinfacht) in Filamentfarbe, Füllgrad nach
  Restgewicht; darunter „Slot N", Filamentname, Material und Restgewicht. Lange Namen laufen weich durch.
- WLAN-/Status: **kein** Punkt mehr über den Beschriftungen. Nur wenn etwas nicht stimmt (kein WLAN
  oder Drucker nicht erreichbar) erscheint unten mittig im inneren Bereich ein kleines Symbol.
- Drehen: Auswahl wandert mit weicher Animation (Easing ~150–200 ms), Segment wächst/schrumpft,
  Messing-Markierung gleitet mit. Richtung per `enc_reverse` umkehrbar.
- Kurz drücken: Lesen – Countdown als Messing-Bogen, der sich leert, dazu pulsierende NFC-Wellen,
  Text „Spule auflegen". Nach Erfolg: Spule füllt sich in der Filamentfarbe, ein Haken zeichnet sich
  ein, „Slot N geladen" + Filamentname; danach sofort an den Drucker senden, nach ~3 s zurück.
  Fehler: kurzes Wackeln, roter Kreis/Kreuz, klare Meldung.
- Lang drücken (> 1,5 s): Info-Seite (IP, mDNS-Name, Signal, Firmware-Version) im selben Stil.
- Läuft ein Job vom PC: eigener Bildschirm „PC – Tag auflegen" (NFC-Wellen), Encoder gesperrt.
  Nach Abschluss zeigt das Gerät dieselbe Erfolgs-/Fehleranimation wie am Gerät: Schreiben →
  „Tag geschrieben" mit Haken und Filamentname/Farbe, Lesen → „Tag gelesen" mit Filamentname/Farbe,
  Fehler wie beim Lesen; nach 3 s zurück.
- Nach 60 s ohne Bedienung: Display sanft dimmen (BLK per PWM/LEDC); bei Drehen/Drücken sofort hell.
- Texte auf Deutsch/Englisch/Spanisch (s. „Sprachen"), Umlaute und ñ korrekt (DejaVu-Schrift).

## Spoolman-Anbindung (PC-Programm)

API-Doku: https://donkie.github.io/Spoolman/ – Basis `<spoolman_url>/api/v1`.

- Spulen: `GET/POST /spool`, `GET/PATCH/DELETE /spool/{id}`
- Filamente: `GET/POST /filament`, `GET/PATCH /filament/{id}`
- Hersteller: `GET/POST /vendor`
- Externe Filamentdatenbank (SpoolmanDB): `GET /external/filament`
- Zusatzfelder: `GET /field/spool`, `POST /field/spool/{key}`

Zuordnung Tag ↔ Spule, kompatibel zur Paxx-Firmware (snapmakeru1-extended-firmware.pages.dev/design/spoolman.html):

- Spulen-Zusatzfeld `card_uids` (Typ text): kommagetrennte UIDs, Großbuchstaben-Hex ohne Trenner.
- Filament-Zusatzfeld `variant` (Typ text): Subtyp wie "Matte" oder "Silk".
- Werte in `extra` sind doppelt JSON-kodiert: `AABBCCDD,11223344` wird als `"\"AABBCCDD,11223344\""` gespeichert.
- Fehlende Felder beim ersten Verbinden anlegen, mit `default_value` `"\"\""`.
- Eine UID gehört immer nur zu einer Spule: Beim Verknüpfen UID bei der Zielspule anhängen (PATCH),
  danach alle Spulen (`limit=1000&allow_archived=true`) durchsuchen und die UID überall sonst entfernen.
- Beim Lesen: zuerst `spool_id` aus dem Tag, sonst Suche über `card_uids`.
- Mapping Spoolman → OpenSpool: `filament.vendor.name` → brand, `filament.material` → type,
  `filament.extra.variant` → subtype, `filament.color_hex` → color_hex,
  `filament.settings_extruder_temp` → min_temp/max_temp (±10 °C wenn nur ein Wert vorhanden),
  `filament.settings_bed_temp` → bed_min_temp/bed_max_temp, `spool.id` → spool_id.
- Neue Spule mit fehlgeschlagenem Tag-Schreiben: angelegte Spule (und neu angelegtes Filament/Vendor,
  falls nur dafür erzeugt) wieder löschen.

## PC-Programm (`desktop/`)

- **Electron + React + TypeScript**, Build mit **electron-vite**, UI mit **Tailwind CSS + shadcn/ui**,
  Icons lucide-react, Paketierung **electron-builder** (Windows NSIS-Installer nach `desktop/release/`).
- Keine nativen Node-Module (kein node-gyp, keine Build Tools nötig).
- mDNS-Suche mit **bonjour-service** im Main-Prozess, Service `_spoolstation._tcp`.
- **Einrichtungsassistent** (`SetupWizard`, Erststart + Einstellungen → „Station einrichten"):
  Sprache, Spoolman + Test, Drucker + Test, dann Station per USB neu aufsetzen (flashen mit
  **esptool-js** über **Web Serial**, dann WLAN/Schlüssel/Config über das USB-Protokoll) oder eine
  vorhandene Station koppeln (USB oder Netzwerk mit Schlüssel). Web Serial: Electron-Handler
  `select-serial-port` + Permissions im Main-Prozess; API-Schlüssel wird mit `crypto` erzeugt
  (32 Byte hex) und in App **und** Station gespeichert. Mitgelieferte `factory.bin` via IPC
  `firmware:get` aus den App-Ressourcen.
- Alle HTTP-Aufrufe (Station, Spoolman, Drucker) im Main-Prozess mit `fetch`; Renderer spricht nur
  über eine typisierte Preload-Bridge (`contextIsolation: true`, `nodeIntegration: false`).
- Einstellungen lokal speichern (electron-store): Spoolman-URL, Station-Adresse, API-Schlüssel, Theme.
- Design: ruhig und modern, Dark Mode Standard (umschaltbar), Seitenleiste mit
  "Station", "Spulen", "Filamente", "Einstellungen"; Verbindungsstatus zu Station und Spoolman
  dauerhaft sichtbar; Filamentfarben immer als Farbfeld; Lade- und Fehlerzustände überall; Deutsch.
- Funktionsumfang wie die Android-App SpoolPainter (github.com/ni4223/SpoolPainter):
  Spulen anzeigen/bearbeiten/anlegen, Filamente anzeigen/anlegen, Filamentdatenbank durchsuchen und
  übernehmen, Tag schreiben und mit Spule verknüpfen, Tag lesen und Spule finden, Rohdaten schreiben
  ohne Spoolman, Spule optional direkt an einen Drucker-Slot senden (`/api/printer/send`).

## Sprachen (Mehrsprachigkeit)

Deutsch, Englisch und Spanisch – für **PC-Programm und Station**. Spanisch und Englisch natürlich
formulieren (keine 1:1-Übersetzung) und 3D-Druck-Fachbegriffe der jeweiligen Community verwenden:
Spule/spool/bobina, Düse/nozzle/boquilla, Bett/bed/cama, Slot/slot/hueco, Hersteller/manufacturer/fabricante.

### PC-Programm

- **i18next + react-i18next**. Übersetzungen als JSON unter `desktop/src/locales/{de,en,es}.json`,
  init in `desktop/src/renderer/src/i18n.ts` (de = Referenzsprache, Fallback en).
- **Keine hartkodierten Strings** – alle sichtbaren Texte inkl. Fehlermeldungen, Toasts, Dialoge,
  Tooltips über `t('…')`. Nicht-React-Dateien (`lib/spool.ts`, `lib/actions.ts`) nutzen `i18n.t` direkt.
  Der Fenstertitel bleibt der Produktname „SpoolStation".
- **Zahlen/Gewichte/Daten** über `Intl` in der aktiven Sprache (de/es Dezimalkomma, en Punkt) – siehe
  `formatNumber`/`formatWeight`/`formatDate` in `lib/spool.ts`. Eingabefelder akzeptieren Komma **und**
  Punkt als Dezimaltrenner.
- **Sprachwechsel** in den Einstellungen, sofort wirksam ohne Neustart (`settings.lang`, electron-store).
  Beim Wechsel sendet das Programm die Sprache per `PUT /api/config {"lang": …}` an die Station.
- **Erststart ohne gespeicherte Sprache:** Installer-Sprache aus der Registry
  (`HKCU\Software\SpoolStation`, Wert `Language` = `de`/`en`/`es`), sonst Windows-Systemsprache
  (`app.getLocale()`), sonst Englisch. Main-Prozess liest die Registry per `reg query`
  (`ipcMain` `system:initialLanguage`).
- **Test:** `desktop/test/locales.test.ts` (vitest) prüft, dass de/en/es dieselben Schlüssel haben
  (keine fehlenden/überflüssigen) und keine leeren Werte enthalten.

### Installer (electron-builder NSIS)

- `multiLanguageInstaller: true`, `installerLanguages: [en_US, de_DE, es_ES]` → Sprachauswahl-Dialog
  am Anfang. `build/installer.nsh` schreibt die gewählte Sprache (`$LANGUAGE`-LCID 1031=de, 1034=es,
  sonst en) via `customInstall` nach `HKCU\Software\SpoolStation` (`Language`), Deinstallation entfernt
  den Schlüssel. Konfiguriert in `desktop/electron-builder.yml` (`nsis.include`).

### Station (Firmware)

- Alle Display-Texte in de/en/es über `tr(key)` (Tabelle in `firmware/src/i18n.cpp`,
  `firmware/include/i18n.h`). Sprache als NVS-Config `lang` (Standard `de`), per `PUT /api/config`
  setzbar; `i18nSet()` nach `configLoad`/`configApplyJson`.
- Die Display-Schrift (DejaVu in LovyanGFX) deckt Latin-1 ab, also deutsche Umlaute und
  `ñ á é í ó ú ü ¿ ¡`.
- Firmware-Version bei Textänderungen erhöhen (über `npm run version:bump`, nicht `version.h` von Hand).

## Updates und Versionen

### Gemeinsame Versionsquelle

- **`version.json`** im Hauptordner ist die **einzige Quelle der Wahrheit**: `{ "version": "x.y.z",
  "api_version": <n> }`. `version` = gemeinsame Semver-Version von App und Firmware; `api_version` =
  Version der HTTP-API der Station (`/api/*`), für die Kompatibilitätsprüfung.
- **`npm run version:bump -- patch|minor|major|sync`** (Skript `scripts/version-bump.mjs`) erhöht die
  Version und schreibt sie nach `firmware/include/version.h` (`FW_VERSION`, `FW_API_VERSION`),
  `desktop/package.json`, `package.json` (Hauptordner) und `desktop/src/shared/version.ts`
  (`APP_VERSION`, `STATION_API_VERSION`); legt zudem ein CHANGELOG-Gerüst an. `sync` = nur neu
  schreiben ohne Erhöhen (z. B. nachdem `api_version` von Hand in `version.json` geändert wurde).
  `version.h` und `version.ts` sind **auto-generiert** – nicht von Hand ändern.
- **Kompatibilität:** `/api/status` meldet `api_version`. Die App vergleicht sie mit `STATION_API_VERSION`;
  bei Abweichung erscheint ein Hinweis in der Statusleiste und auf der Station-Seite („App und Station
  passen nicht ganz zusammen – bitte beide aktualisieren").

### Update-Quelle (eine Stelle)

- **`update.config.json`** im Hauptordner: `{ "owner": "...", "repo": "..." }`. **Einzige** Stelle für
  das öffentliche GitHub-Repository mit den Releases. Beide Felder leer ⇒ Updates komplett deaktiviert,
  die App zeigt unauffällig „Update-Quelle nicht eingerichtet" und versucht nichts. Zur Laufzeit gelesen
  (`main/updateConfig.ts`), im Installer als Ressource mitgeliefert (`electron-builder.yml` extraResources).
  Aktuell eingetragen: `schmutzskuz/spoolstation` (Repo existiert noch nicht → bis dahin „nicht eingerichtet"
  bzw. mitgelieferte Firmware).

### App-Update (electron-updater, GitHub Releases)

- `main/updater.ts`: prüft **beim Start** (nach 4 s) und **alle 6 h**, lädt im Hintergrund
  (`autoDownload`), meldet dann „Version X bereit" + Release-Notes und bietet „Neu starten und installieren"
  (`quitAndInstall`). Feed per `setFeedURL({provider:'github', owner, repo})` aus `update.config.json`.
- **Einstellungen** (Seite Einstellungen → „Updates"): automatisch prüfen an/aus, Kanal **stabil/Beta**
  (`allowPrerelease`), „Jetzt prüfen". Gespeichert in electron-store (`updateAutoCheck`, `updateChannel`).
- **Fehler** werden still in Codes übersetzt (`offline`, `rate-limit`, `no-release`, `corrupt`, `generic`)
  und verständlich angezeigt, nichts stürzt ab. Updates laufen nur im **installierten** Programm (im Dev
  nur Hinweis). UI: Banner oben (`components/UpdateBanner.tsx`) + `context/UpdaterContext.tsx`.

### Firmware-Update der Station (OTA)

- **Firmware** (`firmware/src/ota.cpp`, Endpunkt in `api.cpp`): `POST /api/ota` (API-Schlüssel nötig),
  ota.bin als **Roh-Body-Stream** (nichts im RAM gepuffert, direkt in die freie OTA-Partition), **SHA-256**
  im Header **`X-FW-SHA256`** wird geprüft – nur bei Übereinstimmung wird die Boot-Partition gesetzt und
  neu gestartet, sonst bleibt die alte Firmware. Display zeigt im Werkstatt-Design „Update wird installiert"
  mit Fortschrittsbogen + „Nicht ausschalten" (`UI_OTA`, Backlight bleibt an). Geplanter Neustart über
  `g_rebootAt` in `loop()` (Antwort geht vorher raus).
- **Rollback:** Vor dem Reboot merkt sich die Firmware im NVS (`ota`-Namespace) Ziel-Partition + `pending`.
  Beim nächsten Boot (`otaInitBoot()`, vor dem WLAN) vergleicht sie die laufende mit der Zielpartition:
  gleich ⇒ `last_ota="success"`, sonst ⇒ `last_ota="rolled_back"`. Das greift **unabhängig** davon, ob der
  Bootloader echtes Auto-Rollback kann. `/api/status.last_ota` meldet es; ein sauberer Start mit WLAN
  markiert die App per `esp_ota_mark_app_valid_cancel_rollback()` als gültig.
- **PC-Programm** (`main/firmwareUpdate.ts`, Karte auf der Station-Seite `components/FirmwareCard.tsx`):
  vergleicht die Station-Version mit dem **neuesten Release** (`firmware-manifest.json` als Release-Asset)
  **und** der **mitgelieferten** Firmware (`resources/firmware/`), zeigt „Station-Update verfügbar"
  (Statusleiste + Station-Seite) mit Änderungen. Ablauf: ota.bin laden (Release/mitgeliefert/Datei),
  **SHA-256 prüfen**, mit echtem **Fortschritt** hochladen (`http`-Stream in 16-KB-Häppchen), auf den
  Neustart warten und die neue Version bestätigen; bei Rollback klare Meldung. „**Firmware-Datei
  auswählen…**" für eine eigene `ota.bin` (mit Warnung, SHA wird selbst gebildet); **offline** dient die
  mitgelieferte Firmware als Fallback. „Noch kein Online-Release" (`no-release`) ist eine **neutrale graue
  Info**, keine Warnung. Mehrere Stationen sind nicht gebaut, aber nichts verhindert es (alle Aufrufe laufen
  gegen ein übergebenes `{host, apiKey}`).
- **Alte Firmware ohne OTA** (meldet kein `api_version`, z. B. 0.9.0, oder Endpunkt gibt 404): die
  Station-Seite zeigt statt „Update abgelehnt" den klaren Hinweis „Diese Firmware kann noch nicht per WLAN
  aktualisiert werden. Bitte einmal per USB aktualisieren." + Button, der den Assistenten direkt im Modus
  **„Firmware aktualisieren, Einstellungen behalten"** öffnet.
- **USB-Weg „Firmware behalten"** (`lib/flasher.ts` `flashFirmwareKeepSettings`, Assistent-Methode
  `fw-update`): schreibt nur die App-Partition (`ota.bin` → `ota_0` bei `0x10000`) und setzt `otadata`
  (`0xe000`) auf leer (Bootloader startet `ota_0`); der **NVS-Bereich (`0x9000`) bleibt** → WLAN, API-Schlüssel
  und Drucker bleiben erhalten. `firmware:getOta` liefert die mitgelieferte `ota.bin`.

### Lokal testen, bevor es das GitHub-Repo gibt

- **Station-OTA ohne GitHub:** Firmware bauen (`cd firmware; pio run`) → `firmware/dist/ota.bin` nehmen
  (oder gezielt eine veränderte Version bauen, z. B. Versions-Bump + sichtbare Textänderung). In der App auf
  der **Station-Seite → „Firmware der Station" → „Firmware-Datei auswählen…"** diese `ota.bin` wählen,
  Warnung bestätigen. Die App prüft SHA-256, lädt hoch (Fortschrittsbogen am Display), wartet auf den
  Neustart und zeigt die neue Version bzw. bei Fehler/Rollback die passende Meldung.
- **„Update verfügbar" ohne echtes Release:** Eine Station mit **älterer** Version flashen und eine **neuere**
  Firmware mitliefern lassen (bauen nach einem `version:bump`), dann erscheint „Station-Update verfügbar
  (mitgeliefert)". So lässt sich der ganze Ablauf inkl. Fortschritt/Rollback ohne Internet durchspielen.
- **App-Update** lässt sich erst mit echten GitHub-Releases testen (nur im installierten Programm aktiv).
