# Reading tags and sending to the printer

On the **Station** page you read and write tags right from the PC and see the station's status.

![The Station page](images/station.png)

## Connecting to the station

At the top of the Station page you connect to the device:

- **"Search"** finds the station automatically on the network (via mDNS).
- Alternatively, enter the **address** directly, e.g. the fixed IP from your router or `spoolstation.local`.

Once connected, the status area shows the name, IP, Wi-Fi signal, uptime and whether the NFC module is ready.

## Reading a tag

1. Click **"Read tag"**.
2. Place the spool with the tag on the station.
3. The app shows the UID and the stored data (manufacturer, material, colour, temperatures).

If the spool is in Spoolman you can open it directly. If no valid tag is detected, it times out after a few seconds and you get a message.

## Sending a spool to a printer slot

You don't have to write a tag to load a filament – you can also send a spool straight from the library to a slot:

1. Open the spool in the **Library**.
2. Click **"To printer slot"**.
3. Pick the printer and **slot (T1–T4)**.
4. Click **"Send"**.

The station sets the slot on the printer and links the spool so usage is logged. At the device itself it's even simpler: turn to the slot, place the spool, short press – done (see [Using the device](chapter:device)).

## Clearing a slot

On the **Printer** page you can free a slot again with **"Clear slot"**. That unlinks the spool from the slot and stops usage logging.
