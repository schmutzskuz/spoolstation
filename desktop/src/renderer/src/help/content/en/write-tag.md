# Creating a spool and writing a tag

A **spool** is a specific instance of a [filament](chapter:filament) with its own weight. You write the filament data onto the spool's NFC tag; the station then recognises the spool at the device.

## Creating a spool

1. In the **Library**, click **"Spool"** at the top (or use "Create + add spool" straight after adding a filament).
2. Pick the matching **filament**.
3. Enter the **empty spool weight** (just the bare core without filament). If it's already set on the filament, it's carried over.
4. Click **"Create spool"**.

The new spool appears in the library. You can then write a tag right away.

## Writing a tag and linking it

First stick a blank **NTAG215 sticker** onto the side wall of the spool, close to the rim.

1. Open the spool in the library and click **"Write tag"**.
2. Place the blank tag on the station.
3. The app writes the filament data, reads the tag back to verify and **links** the tag UID to the spool in Spoolman.

![Spool detail with "Write tag"](images/spool.png)

Done: from now on the station recognises the spool as soon as you place it, and logs usage against exactly this spool when printing.

> A UID always belongs to only **one** spool. If you write a tag for a different spool, the old link is removed automatically.

## Writing raw data (without Spoolman)

If you just want to quickly write data to a tag without creating a spool in Spoolman, use **"Write raw data"** on the **Station** page. There you enter manufacturer, material, colour and temperatures directly. Those tags are **not** linked to a spool, so no usage is logged.

## When writing fails

If you've just created a spool and the write fails (e.g. no tag placed), the app removes the spool it just created so you don't end up with an orphan. Place the tag properly and try again. More under [Troubleshooting](chapter:troubleshooting).
