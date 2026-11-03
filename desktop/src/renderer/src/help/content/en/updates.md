# Updates

SpoolStation keeps itself up to date: the **app** via GitHub releases and the **station firmware** over the air (OTA). The app and the firmware share one version number.

## App update

The app checks for a new version at launch and regularly afterwards, and downloads it in the background. When it's ready, a banner **"Version X is ready"** appears at the top with the changes and a **"Restart and install"** button.

Under **Settings → Updates** you can set:

- **Check for updates automatically** on/off.
- **Channel**: Stable or Beta (pre-releases).
- **"Check now"** for an immediate check.

> App updates only work in the **installed** program, not in a development build.

## Updating the station firmware (OTA)

When there's newer firmware, you'll see it on the **Station** page under "Station firmware" and as a hint in the status bar. One click is enough:

1. Click **"Update firmware"**.
2. The app verifies the checksum, uploads the firmware (the display shows a progress arc "Installing update – do not power off") and waits for the reboot.
3. Afterwards the app confirms the new version.

If something goes wrong during the update, the **old firmware stays** – the station won't be bricked. In that case the app clearly reports that it rolled back.

With **"Choose firmware file…"** you can also flash your own `ota.bin`. Only use a file that's really meant for this station.

## One-time USB update for old firmware

Very old firmware doesn't know OTA yet. In that case the Station page shows the hint **"This firmware can't be updated over Wi-Fi yet. Please update once over USB."** with a button that opens the wizard in **"Update firmware, keep settings"** mode.

This path rewrites **only the firmware**; Wi-Fi, API key and printers are preserved. Plug the station in over USB and follow the wizard. From then on every further update works conveniently over the air.
