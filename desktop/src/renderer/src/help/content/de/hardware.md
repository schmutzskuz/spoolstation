# Hardware

Die Station ist schnell gebaut: ein ESP32, ein NFC-Modul, ein rundes Display und ein Drehknopf. Hier findest du die Teileliste und die Pinbelegung als Überblick. Die **vollständige Bauanleitung** mit Fotos, Löt-Tipps und Gehäuse öffnest du über den Knopf unten.

## Teileliste

- **ESP32 DevKit** (ESP32-WROOM-32, 30 Pin) mit USB-C und CH340-Chip
- **ESP32-Schraubklemmen-Adapter** (30 Pin, schmale Version) – der ESP32 wird nur aufgesteckt
- **PN532 NFC-Modul V3** (rote Platine)
- **Rundes Display GC9A01**, 1,28", 240 × 240
- **Drehencoder EC11** mit Drückfunktion und Drehknopf
- **NTAG215**-NFC-Sticker (einer pro Spule)
- Silikonlitze, Aderendhülsen, Schrumpfschlauch, ein **USB-C-Datenkabel** und ein 5-V-Netzteil

## Pinbelegung

Diese Belegung ist verbindlich – die Firmware erwartet genau diese Pins.

| Funktion | GPIO | Hinweis |
| --- | --- | --- |
| Display SCLK (SCL) | 18 | Display-Bus |
| Display MOSI (SDA) | 23 | Display-Bus |
| Display RST (RES) | 17 | |
| Display DC | 16 | |
| Display CS | 5 | |
| Display Backlight (BLK) | 4 | falls vorhanden |
| PN532 SCK | 14 | NFC-Bus |
| PN532 MISO | 27 | NFC-Bus |
| PN532 MOSI | 13 | NFC-Bus |
| PN532 SS | 26 | NFC-Bus |
| Encoder A | 32 | |
| Encoder B | 33 | |
| Encoder Taster | 25 | gedrückt = LOW |

Display und NFC-Modul werden mit **3,3 V** versorgt; der Anschluss VIN (5 V) bleibt frei. Jedes Bauteil braucht eine Verbindung zu **GND**.

## Wichtig: DIP-Schalter am NFC-Modul

Das PN532-Modul muss auf **SPI** stehen, sonst wird es nicht gefunden: **Schalter 1 auf OFF, Schalter 2 auf ON**.

## Erste Einrichtung

Verkabelt wird ohne eingestecktes USB. Ist alles durchgemessen, steckst du den ESP32 ein und richtest die Station komplett über die App ein – siehe [Erste Schritte](chapter:getting-started). Eine Programmierumgebung brauchst du nicht.

> Die komplette Bauanleitung mit Bildern, Durchmessen und Fehlersuche öffnet sich im Browser.
