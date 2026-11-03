# Hardware

The station is quick to build: an ESP32, an NFC module, a round display and a rotary knob. Here you'll find the parts list and the pinout as an overview. Open the **full build guide** with photos, soldering tips and the enclosure via the button below.

## Parts list

- **ESP32 DevKit** (ESP32-WROOM-32, 30-pin) with USB-C and a CH340 chip
- **ESP32 screw-terminal adapter** (30-pin, narrow version) – the ESP32 just plugs in
- **PN532 NFC module V3** (red board)
- **Round GC9A01 display**, 1.28", 240 × 240
- **EC11 rotary encoder** with push function and a knob
- **NTAG215** NFC stickers (one per spool)
- Silicone wire, ferrules, heat-shrink tubing, a **USB-C data cable** and a 5 V power supply

## Pinout

This assignment is mandatory – the firmware expects exactly these pins.

| Function | GPIO | Note |
| --- | --- | --- |
| Display SCLK (SCL) | 18 | display bus |
| Display MOSI (SDA) | 23 | display bus |
| Display RST (RES) | 17 | |
| Display DC | 16 | |
| Display CS | 5 | |
| Display backlight (BLK) | 4 | if present |
| PN532 SCK | 14 | NFC bus |
| PN532 MISO | 27 | NFC bus |
| PN532 MOSI | 13 | NFC bus |
| PN532 SS | 26 | NFC bus |
| Encoder A | 32 | |
| Encoder B | 33 | |
| Encoder button | 25 | pressed = LOW |

The display and the NFC module run on **3.3 V**; the VIN (5 V) terminal stays free. Every part needs a connection to **GND**.

## Important: DIP switch on the NFC module

The PN532 module must be set to **SPI**, otherwise it won't be found: **switch 1 OFF, switch 2 ON**.

## First setup

Wiring is done with USB unplugged. Once everything is checked with a multimeter, plug the ESP32 in and set the station up entirely through the app – see [Getting started](chapter:getting-started). You don't need a programming environment.

> The full build guide with pictures, continuity checks and troubleshooting opens in your browser.
