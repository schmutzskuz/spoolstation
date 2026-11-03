# SpoolStation – Build guide (hardware)

This guide shows you step by step how to build the SpoolStation: from wiring to the first setup with the app. You don't need any prior knowledge, just a soldering iron and a little patience.

> 🌍 Diese Anleitung gibt es auch auf [Deutsch](BUILD.de.md).

> 📷 **Photos:** In several places you'll find placeholders like *Photo: `name.jpg`*. Take the matching pictures yourself and put them in [`docs/images/`](../images/); the list is in [`docs/images/PHOTOS-TODO.md`](../images/PHOTOS-TODO.md). Then replace the placeholder with `![Description](../images/name.jpg)`.

**What the SpoolStation does:** An ESP32 with an NFC reader reads and writes NFC tags on your filament spools. At the device you pick a printer slot with the rotary knob and send the filament to your Snapmaker U1 with a press. On the PC you use the SpoolStation app to manage your spools in Spoolman and write tags.

**Overview:** gather parts → read the basics → solder the components → screw them into the adapter → check with a multimeter → set up with the app.

---

## 1. Parts and tools

### Electronics

| Part | Note |
| --- | --- |
| ESP32 DevKit, 30-pin (ESP32-WROOM-32) | with USB-C and a CH340 USB chip |
| ESP32 screw-terminal adapter, 30-pin (narrow version) | the ESP32 just plugs in, no soldering |
| PN532 NFC module V3 (red board) | reads and writes the tags |
| Round GC9A01 display, 1.28", 240 × 240 | the device's screen |
| EC11 rotary encoder with push function + knob | choose a slot, start reading |
| NTAG215 NFC stickers (e.g. 25 mm) | go on the spools; NTAG213 is too small |

### Small parts

| Part | Spec |
| --- | --- |
| Silicone wire | 0.25 mm² (24 AWG), several colours, at least red and black |
| Insulated ferrules | 0.25 mm² (approx. 30 pcs) and 0.5 mm² (approx. 5 pcs) |
| Heat-shrink tubing | assortment 1.5–3 mm |
| USB-C **data cable** | must carry data; charge-only cables won't work |
| USB power supply | 5 V, at least 1 A, for continuous operation |

### Tools

- Soldering iron (adjustable, approx. 330 °C) and solder with flux, 0.5–0.8 mm
- Side cutters and a wire stripper
- Crimping tool for ferrules (0.25–10 mm²)
- Small flat-head screwdriver (2–2.5 mm)
- **Multimeter with continuity test (beeper)**, required for chapter 5
- Optional: a "helping hand" or putty to hold parts while soldering

> 📷 *Photo: `parts-overview.jpg` – all parts and tools laid out clearly.*

---

## 2. The basics

Three rules prevent almost all damage:

1. **Never solder or wire with USB plugged in.**
2. **Everything runs on 3.3 V.** The VIN (5 V) pin is not used.
3. **Every component needs a connection to GND** (ground, minus).

### Terms

- **Pin:** a connection on the board. The label is printed on the PCB (a magnifier or phone camera helps). "D18" on the board is the same as "GPIO 18" in this guide.
- **3V3:** 3.3 volts come out here. This powers the display and the NFC module.
- **GND:** ground. The common reference point for all components.
- **EN / BOOT:** the two little buttons on the ESP32. EN = reset, BOOT = flash mode (only needed if flashing stalls).
- **Wire (stranded):** a cable made of many fine strands, flexible and resistant to breaking.
- **Ferrule:** a metal sleeve with a plastic collar for the wire end in the screw terminal. It prevents stray strands and short circuits.

### The two ends of each wire

- **Component end:** strip 3 mm, twist, tin, solder.
- **Terminal end:** strip 8 mm, twist, crimp on a ferrule, screw into the adapter. **Never tin it** – solder compresses under the screw and the terminal works loose.

> 📷 *Photo: `ferrule.jpg` – a finished terminal end with a crimped ferrule.*

### Soldering in brief

1. Soldering iron to approx. 330 °C, clean the tip.
2. Hold the tip so it touches **the pin and the copper ring at the same time**, wait 1–2 seconds.
3. Hold the solder against the **opposite side** of the pin; it flows on its own.
4. Remove the solder first, then the tip. 2–3 seconds in total.
5. A good joint is **shiny and cone-shaped**. Two pins must never be bridged by solder.

Before each joint on a wire: **slide on heat-shrink tubing**, then pull it over the joint and warm it briefly.

---

## 3. Pinout

This assignment is mandatory – the firmware expects exactly these pins. Cut all wires to **15 cm** for now; you'll shorten them later in the enclosure.

| Component | Pin on the part | Terminal on the adapter | Suggested colour |
| --- | --- | --- | --- |
| Display | VCC | 3V3 (together with NFC VCC) | red |
| Display | GND | GND next to VIN | black |
| Display | SCL | GPIO 18 | yellow |
| Display | SDA | GPIO 23 | green |
| Display | RES (RST) | GPIO 17 (sometimes "TX2") | white |
| Display | DC | GPIO 16 (sometimes "RX2") | grey |
| Display | CS | GPIO 5 | purple |
| Display | BLK (if present) | GPIO 4 | brown |
| NFC PN532 | VCC | 3V3 (together with display VCC) | red |
| NFC PN532 | GND | GND next to 3V3 (together with the knob) | black |
| NFC PN532 | SCK | GPIO 14 | yellow |
| NFC PN532 | MISO | GPIO 27 | blue |
| NFC PN532 | MOSI | GPIO 13 | green |
| NFC PN532 | SS | GPIO 26 | purple |
| NFC PN532 | IRQ, RSTO | leave unconnected | – |
| Knob | Out A | GPIO 32 | orange |
| Knob | Out B | GPIO 33 | blue |
| Knob | GND (both GND legs bridged) | GND next to 3V3 (together with NFC) | black |
| Knob | Switch | GPIO 25 | white |

The **VIN terminal stays free**. On the display SCL and SDA are named like I2C, but it's actually SPI. The display and the NFC module run on two separate SPI buses.

---

## 4. Wiring

### Step 1: Prepare the adapter

1. Check that your ESP32 has **15 pins** on each side.
2. Plug the ESP32 into the adapter so the labels line up (e.g. 3V3 to 3V3). The USB socket points to the edge.
3. Mark a dot with a marker next to the USB socket so you never insert the ESP32 the wrong way round.
4. If the adapter has no labels, write the needed pin numbers next to the terminals with a marker.
5. Pull the ESP32 back out. It stays out until everything is wired and measured.

On the 30-pin ESP32, with the USB socket pointing down, 3V3 is bottom right (next to one GND) and VIN bottom left (next to the other GND). Check it on your board anyway.

### Step 2: NFC module

1. **Set the DIP switch to SPI:** per the table on the board, SPI = "0 1". So **switch 1 away from ON, switch 2 to ON**. Without this the module won't be found.
2. Insert the wires **from the chip side** into the SCK, MISO, MOSI, SS, VCC, GND holes and solder them on the back. The included pin header is not needed. Leave IRQ and RSTO free.
3. The smooth back is the **reading surface**. Later in the enclosure it faces up towards the spool.
4. Mark the wires with a tape flag "NFC"; the colours repeat on the display.

> 📷 *Photo: `nfc-dip.jpg` – the DIP switch in the SPI position.*
> 📷 *Photo: `nfc-soldered.jpg` – the NFC module with the wires soldered on.*

### Step 3: Display

1. Read the labels on the back, usually `VCC GND SCL SDA RES DC CS BLK`.
2. If the display has pins: tin the pin, lay the tinned wire against the side, heat both briefly. If it only has holes: solder directly as with the NFC module.
3. **Mind the heat:** no more than 3 seconds per pin.
4. Tag the wires "DISPLAY".

> 📷 *Photo: `display-soldered.jpg` – the display with the wires soldered on.*

### Step 4: Rotary knob

The EC11 has three legs on one side and two on the other:

| Side | Leg | Meaning |
| --- | --- | --- |
| Three-leg side | outer | Out A |
| Three-leg side | middle | GND |
| Three-leg side | outer | Out B |
| Two-leg side | one | Switch (button) |
| Two-leg side | the other | GND |

1. **GND bridge:** solder a short piece of wire from the middle leg of the three-leg side to the GND leg of the two-leg side.
2. Solder on four long wires: Out A, Out B, Switch and a black one to one of the GND legs.
3. If the knob later turns the wrong way, it doesn't matter – you can flip the direction in the app.

> 📷 *Photo: `encoder-bridge.jpg` – the GND bridge and the four wires on the encoder.*

### Step 5: Terminal ends and the adapter

1. Fit the terminal ends with ferrules (see chapter 2). Do a pull test.
2. **Two wires into one 0.5 mm² ferrule:**
   - 3V3: display VCC + NFC VCC
   - GND next to 3V3: NFC GND + knob GND
3. The display GND goes on its own into the GND terminal next to VIN.
4. Screw every wire down according to the table in chapter 3 and tick it off.

> 📷 *Photo: `adapter-wired.jpg` – the finished adapter with all terminals populated.*

---

## 5. Checking with a multimeter (ESP32 not yet inserted)

Multimeter on continuity (beeper):

1. 3V3 terminal against both GND terminals: **must not beep.**
2. For every row of the table: pin on the component against the terminal screw: **must beep.**
3. Every used terminal against its neighbours: **must not beep.**

> 📷 *Photo: `multimeter.jpg` – the continuity check on the adapter.*

### Checklist before the first power-up

- [ ] DIP switch on the NFC module set to SPI
- [ ] VIN terminal free
- [ ] 3V3: display VCC + NFC VCC
- [ ] GND next to VIN: display GND; GND next to 3V3: NFC GND + knob GND
- [ ] All measurements passed
- [ ] No stray strands, all joints insulated
- [ ] ESP32 inserted the right way round (USB at the marked dot)

If anything gets warm or smells on power-up: **pull USB immediately** and measure again.

---

## 6. Setting up with the app

The entire setup runs through the SpoolStation app. You don't need a programming environment or any config files.

1. Install and start the SpoolStation app.
2. The setup wizard asks for the language, the Spoolman address and a printer.
3. Choose **"Set up new station (USB)"** and plug the ESP32 in with a USB data cable.
4. Click **"Connect"** and pick the port labelled **CH340**. The app flashes the firmware.
   - If it stalls at "Connect": hold the **BOOT** button on the ESP32.
   - If the display then stays black: press **EN** once and click "Try again".
5. Pick your Wi-Fi from the list and enter the password. The station only supports **2.4 GHz Wi-Fi**.
6. The station reboots, connects and appears in the app. Done.

If no port shows up: try a different USB cable (charge-only cables without data lines won't work) or install the CH340 driver from the maker WCH.

**Tip:** give the station a fixed IP address in your router so it never changes.

> 📷 *Photo: `assembled.jpg` – the finished, wired station with the display running.*

See the **in-app Help** for more on operation and setup.

---

## 7. Using the device

| Action | Effect |
| --- | --- |
| Turn | choose a printer slot |
| Short press | start reading, place the spool; the filament then goes to the printer automatically |
| Long press | info screen (IP, Wi-Fi signal, firmware version) |
| Hold while plugging in for 10 s | factory reset (with a confirmation prompt) |

Stick the NFC sticker on the **side wall of the spool**, close to the rim. Place the spool flat and centred on the reading surface; range is about 2–4 cm.

---

## 8. Troubleshooting

| Problem | Most common cause | Fix |
| --- | --- | --- |
| Display stays black | missing VCC/GND, BLK not connected | re-tighten the 3V3 and GND terminals and measure |
| Display shows garbled pixels | SCL/SDA or CS/DC swapped | compare with the table in chapter 3 |
| "NFC not ready" | DIP switch not on SPI, MISO/MOSI swapped | check the DIP switch; MISO → 27, MOSI → 13 |
| Tag isn't read | tag too far, metal nearby, wrong tag type | place it directly, use NTAG215 |
| Knob counts the wrong way | Out A and Out B swapped | enable "Reverse direction" in the app |
| Press isn't detected | Switch on the wrong leg | check the two legs of the two-leg side |
| ESP32 keeps rebooting | weak USB cable or USB hub | short cable straight to the PC or power supply |
| App can't find the station | firewall, different network | set a fixed IP; allow the Windows firewall for private networks |

---

## 9. Enclosure

*Placeholder: the print files (STL/3MF) and the assembly instructions for the enclosure are coming. They will be linked here once they're ready.*

> 📷 *Photo: `enclosure.jpg` – the station in its finished enclosure (coming with the print files).*
