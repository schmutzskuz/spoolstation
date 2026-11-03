# Using the device

The station has just two controls: a **rotary knob** that you can also press. That's all you need to operate it right at the device, no PC required.

## Home screen

![Home screen with the four slots](images/display-start.png)

The outer ring of four segments represents **slots 1 to 4** of your printer, each in the **real filament colour**. In the centre a spool is drawn; how full it is shows the remaining weight. Below it you see the slot number, filament name, material and remaining weight.

An empty or unknown slot is drawn as a thin grey arc.

## Turn – choose a slot

Turn the knob to select a slot. The selected segment grows and gets a brass marker on the outside. If you set up several printers, the knob cycles through the slots of all printers; the display then also shows the printer name.

> Does the knob turn "the wrong way"? You can flip it: **Settings → Station configuration → Reverse direction** (or right on the device via the Station page).

## Short press – read and send

![Reading: place the spool](images/display-lesen.png)

A short press starts a **read**. A brass arc empties like a countdown, NFC waves pulse and the text "Place spool" appears. Put the spool with the NFC tag onto the reading surface.

![Success: slot loaded](images/display-erfolg.png)

When the tag is recognised the spool fills in the filament colour, a checkmark appears and the filament is **sent automatically to the selected printer slot**. After a few seconds the display returns.

If something goes wrong the display shakes briefly and shows a red circle with a clear message.

## Long press – info screen

Hold the knob longer (more than 1.5 seconds) to open the **info screen** with the IP address, mDNS name (`spoolstation.local`), Wi-Fi signal and firmware version. Handy when you're looking for the station's address.

## Jobs from the PC

If you start a read or write from the PC, the device shows "PC – place tag" and the knob is locked meanwhile. Afterwards you see the same success or error animation as on the device.

## Automatic dimming

After 60 seconds without input the display gently dims. The next turn or press brings it back to full brightness instantly.

## Factory reset

To wipe everything from the station (Wi-Fi, API key, printers, Spoolman URL), do a **factory reset**:

1. **Unplug** the station.
2. **Hold the knob pressed** while plugging it back in.
3. Keep holding (about 10 seconds) until the confirmation prompt appears.
4. Confirm with the knob.

The station is then back to new and starts in setup mode. Your Spoolman database and the tags on your spools are not affected.
