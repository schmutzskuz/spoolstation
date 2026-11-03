# Printer page and multiple printers

The **Printer** page shows your printer's filament slots – the way the Snapmaker currently sees them. The view refreshes about every 5 seconds.

![The Printer page with the slots](images/drucker.png)

## What the slots show

For each slot (T1–T4) you see the colour, filament name, material, nozzle and bed temperature and – if the spool is linked in Spoolman – the **remaining weight**. At the top you see the printer name, connection status and, if a print is running, the progress.

An empty slot is shown as "Empty".

## Assigning a spool

Right on the Printer page you can assign a spool to a slot, even **without an NFC tag**:

1. Click **"Assign spool"** on the slot.
2. Pick a spool from Spoolman.
3. Confirm – the station sets the slot and logs usage against that spool.

Use **"Clear slot"** to free the slot again.

## Requirements

The slot data comes from the printer via Moonraker. For that, the Snapmaker U1 needs to run the **Paxx Extended Firmware** with the Spoolman integration enabled. Remaining weight and linking only work if your spools are maintained in Spoolman.

## Multiple printers

You can set up to **four printers**. Do this under **Settings → Printers**:

1. Click **"Add printer"**.
2. Enter the name, IP and port and check it with **"Test connection"**.
3. The first printer in the list is the **default printer**. Use **"As default"** to change that.

The printer list is synced with the station automatically (stored in the station's NVS). At the device the knob then cycles through the slots of all printers, and the display also shows the printer name.
