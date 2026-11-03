# Troubleshooting / FAQ

Here are fixes for the most common problems. Often a glance at the connection status at the top of the app already helps.

## Station not found

- Is the station on the **same Wi-Fi** as the PC? The station only does **2.4 GHz**.
- Enter the address **manually** on the Station page (fixed IP from your router or `spoolstation.local`).
- Check the current IP on the device with a **long press**.
- Is the **Windows firewall** blocking the program? Allow SpoolStation for **private networks**.
- Tip: give the station a **fixed IP** in your router so it never changes.

## NFC not ready

If the top shows "NFC not ready", the station didn't find the PN532 module:

- The **DIP switch** must be set to SPI: switch 1 OFF, switch 2 ON.
- Check the wiring, especially **MISO → GPIO 27** and **MOSI → GPIO 13** (these two are easy to swap).
- The module needs **3.3 V** and GND.

## Tag not recognised

- Use **NTAG215** only (NTAG213 is too small).
- Place the tag **flat and centred** on the reading surface, 2–4 cm away.
- No **metal** right under the tag.
- Stick the sticker on the **side wall** of the spool, close to the rim.

## Printer not reachable

- Are the **IP and port** correct (default 7125)? Test the connection under Settings → Printers.
- Is the Snapmaker U1 running the **Paxx Extended Firmware** with the Spoolman integration enabled?
- Is the printer on the same network and powered on?

## Spoolman not reachable

- Check the **Spoolman URL** (e.g. `http://192.168.1.50:7912`). If Spoolman isn't reachable, try port **8000**.
- Is the Spoolman server running (e.g. on the Raspberry Pi)?
- Try the URL once in a browser.

## Flashing stalls / display stays black

Some cheap boards have no auto-reset capacitor and don't start on their own after flashing:

1. Hold the **BOOT** button on the ESP32 while connecting/flashing.
2. If the display stays black afterwards, press **EN** once and click **"Try again"**.
3. If that doesn't help: use a different **USB data cable** (charge-only cables won't work) and plug straight into the PC, not through a hub.

## CH340 driver missing

If no port shows up to select while flashing, the **CH340 USB driver** is probably missing:

- Install the driver from the maker **WCH** (CH340/CH341).
- Then re-plug the ESP32 and click "Connect" again.

## Wi-Fi list is empty

- The station only sees **2.4 GHz networks**. Pure 5 GHz networks don't appear.
- If your router uses the same name for 2.4 and 5 GHz, pick the entry anyway – the station connects to the 2.4 GHz band.
- Use **"Scan again"** to refresh the list, or type the network name by hand.

## App and station don't match

If the app shows "Version mismatch", the app and firmware are at different levels. Update both: the app first, then the station firmware (see [Updates](chapter:updates)).
