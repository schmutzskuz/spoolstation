# Adding a filament

Before you create a spool, the matching **filament** has to exist in Spoolman. A filament describes the type (manufacturer, material, colour, temperatures) – a spool is then a specific instance of it with a weight.

You add filaments in the **Library**. Click **"Filament"** at the top there. There are two ways.

## From the database (recommended)

SpoolStation knows a large online filament database (SpoolmanDB). This is the fastest route, because temperatures, density and empty weight are already correct.

1. Choose the **"From database"** tab.
2. Type the manufacturer or name into the search box, e.g. `Polymaker PLA` or `Prusament`.
3. Click the matching entry. The fields fill in automatically.
4. Adjust anything you need (e.g. the colour).
5. Click **"Create filament"** or **"Create + add spool"**.

## Adding manually

If you can't find your filament in the database, add it by hand:

1. Choose the **"Manual"** tab.
2. Enter the **manufacturer** (e.g. `JAYO`). If it doesn't exist yet, it's created automatically.
3. Enter the **name**, **material** (PLA, PETG …) and optionally a **subtype** (Matte, Silk …).
4. Pick a **colour**. For multi-colour filament you can enter several colours.
5. Add print settings (nozzle and bed temperature), diameter, density and empty weight.
6. Click **"Create filament"**.

> If a filament with the same name and material already exists, the app asks whether to use the existing one. That keeps duplicates out.

After that you can go straight to [creating a spool and writing a tag](chapter:write-tag).
