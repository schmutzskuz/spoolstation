# Changelog

Alle nennenswerten Änderungen an SpoolStation (App + Firmware).
Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionen folgen [Semantic Versioning](https://semver.org/lang/de/).
App und Firmware teilen sich eine Versionsnummer.

## 1.0.0 – 2026-11-03

Erste öffentliche Version.

### Station (Firmware)
- Display-Design „Werkstatt": echte Filamentfarben, Spulengrafik, Slot-Ring, weiche
  Animationen, NFC-Wellen, Erfolg-/Fehlerzustände, automatisches Dimmen.
- NFC lesen/schreiben (NTAG215, OpenSpool-Format in NDEF) in einem eigenen Task.
- Filament an Drucker-Slots senden und Verbrauch in Spoolman buchen
  (`filament_detect/set` + `SET_SPOOL_ID`).
- Drucker-Slots im Hintergrund abfragen (AFC_lane + Spoolman-Restgewicht).
- Bis zu vier Drucker, Bedienung komplett über den Drehencoder.
- Einrichtung ausschließlich über USB (keine `secrets.h`); Zugangsdaten nur im NVS.
- HTTP-API mit API-Schlüssel; WLAN-API ohne Schlüssel gesperrt.
- OTA-Update über WLAN mit SHA-256-Prüfung und Rollback-Erkennung.
- Werksreset am Gerät (Encoder beim Einschalten halten).
- Texte auf Deutsch, Englisch und Spanisch.

### App (Desktop, Windows)
- Drucker-Seite mit Live-Slots, Zuweisen und Leeren.
- Bibliothek: Spulen, Filamente und Hersteller anlegen, bearbeiten, wiegen, Verbrauch
  buchen, archivieren, duplizieren und löschen.
- Filamentdatenbank (SpoolmanDB) zum schnellen Anlegen.
- Tags schreiben und mit Spulen verknüpfen, Tags lesen, Rohdaten schreiben.
- Einrichtungsassistent: ESP32 per USB flashen und provisionieren (esptool-js/Web Serial).
- App-Update über GitHub-Releases, Firmware-OTA von der Station-Seite inkl. USB-Fallback
  für alte Firmware.
- **Neu:** Hilfe-Bereich in der App (Markdown je Sprache, mit Suche) und ein „?" neben
  jedem Bereich, das zum passenden Kapitel springt.
- Mehrsprachigkeit (Deutsch, Englisch, Spanisch), Dark-/Light-Mode.

### Projekt
- Bauanleitung (`docs/hardware/BUILD.de.md` / `BUILD.en.md`), README (de/en),
  Lizenz (MIT) und Drittanbieter-Hinweise.
- GitHub Actions für CI und Releases.
