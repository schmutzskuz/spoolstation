# Getting started

Welcome to SpoolStation. With SpoolStation you manage your filament spools, write NFC tags and send filaments to your Snapmaker U1. The little "station" is a device with an NFC reader that you build yourself; this desktop app drives everything.

## What you need

- The **SpoolStation app** (this program).
- A **station** (the NFC device with a display and a rotary knob). See the [Hardware](chapter:hardware) chapter for how to build it.
- A **Spoolman server** on your network. Spoolman is free software that keeps your spools in a database.
- A **Snapmaker U1** running the **Paxx Extended Firmware** with the Spoolman integration enabled (only needed if you want to send filaments to the printer).

The station, Spoolman and the printer all live on the **same Wi-Fi**. The station only connects to a **2.4 GHz** network.

## Setting up the app

On first launch the **setup wizard** opens and walks you through everything in a few steps:

1. Pick a **language**.
2. Enter your **Spoolman address** and check it with "Test connection" (e.g. `http://192.168.1.50:7912`).
3. Add a **printer** (name and IP address) and test it. You can skip this if you don't use a printer.
4. **Set up the station** – either flash a new station over USB or pair an existing one.

You can reopen the wizard any time under **Settings → "Set up station"**.

![Settings with connections and printers](images/einstellungen.png)

## Setting up a new station over USB

For a brand-new or blank ESP32, choose **"Set up new station (USB)"** in the wizard:

1. Plug the ESP32 in with a **USB data cable** (charge-only cables won't work).
2. Click **"Connect"** and pick the port labelled **CH340**.
3. The app flashes the firmware – this takes a minute or two, don't unplug it.
4. Pick your **Wi-Fi** from the list and enter the password.
5. Click **"Set up"**. The station reboots and then shows up in the app.

> Does it stall while connecting, or does the display stay black? Then your board has no auto-reset. Hold the **BOOT** button while flashing and press **EN** once afterwards. See [Troubleshooting](chapter:troubleshooting) for more.

## Pairing an existing station

If the station is already set up (e.g. on another PC), choose **"Pair existing station"**. You can re-provision it over USB or simply connect over the network by entering its address and API key.

## How the app is laid out

The sidebar on the left has these sections:

- **Printer** – shows your printer's slots. See [Printer page](chapter:printers).
- **Station** – connection to the station, reading and writing tags. See [Reading tags and sending](chapter:read-send).
- **Library** – all your spools, filaments and manufacturers. See [Managing the library](chapter:library).
- **Settings** – connections, printers, language, updates.
- **Help** – this page.

At the top you always see the **connection status** for the station, printer and Spoolman. Next to each section heading there's a small **"?"** that takes you straight to the matching help chapter.
