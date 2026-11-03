# Third-party notices

SpoolStation itself is licensed under the [MIT License](LICENSE). It builds on the
third-party software listed below, each under its own license. This file lists the
main dependencies bundled with or linked into the firmware and the desktop app.

The exact, pinned versions are in [`firmware/platformio.ini`](firmware/platformio.ini)
and [`desktop/package.json`](desktop/package.json) / `desktop/package-lock.json`.

## A note on provenance

- **No GPL code is included.** The Android app *SpoolPainter*
  (github.com/ni4223/SpoolPainter, GPL-3.0) was used only as a **feature reference**;
  no source code from it was copied into this project.
- The **OpenSpool** tag format and the Snapmaker/Moonraker printer interface are data
  formats and protocols; they were re-implemented from public documentation and the
  references below, not copied.
- **wasikuss/snapmaker-u1-remote-rfid-reader** (MIT) was used as a design reference for
  the tag format and the printer call. No source code was copied; it is credited here
  and in the README. Its MIT notice is reproduced below as acknowledgement.

## Firmware (ESP32)

| Library | License | Project |
| --- | --- | --- |
| Arduino core for ESP32 (Espressif) | LGPL-2.1 / Apache-2.0 | https://github.com/espressif/arduino-esp32 |
| LovyanGFX | FreeBSD (BSD-2-Clause) | https://github.com/lovyan03/LovyanGFX |
| Adafruit PN532 | BSD | https://github.com/adafruit/Adafruit-PN532 |
| Adafruit BusIO | MIT | https://github.com/adafruit/Adafruit_BusIO |
| ArduinoJson | MIT | https://github.com/bblanchon/ArduinoJson |
| ESPAsyncWebServer (mathieucarbou fork) | LGPL-3.0 | https://github.com/mathieucarbou/ESPAsyncWebServer |
| AsyncTCP (mathieucarbou fork) | LGPL-3.0 | https://github.com/mathieucarbou/AsyncTCP |

**LGPL note:** some firmware libraries (ESPAsyncWebServer, AsyncTCP, and the Arduino ESP32
core) are licensed under the LGPL. The **complete source code of this firmware is contained
in this repository** (see [`firmware/`](firmware/)), so the firmware can be rebuilt from
source with these libraries replaced or updated – satisfying the LGPL's relinking requirement.

## Desktop app (Electron / React)

### Runtime dependencies

| Package | License | Project |
| --- | --- | --- |
| electron | MIT | https://github.com/electron/electron |
| electron-updater | MIT | https://github.com/electron-userland/electron-builder |
| electron-store | MIT | https://github.com/sindresorhus/electron-store |
| react, react-dom | MIT | https://github.com/facebook/react |
| i18next | MIT | https://github.com/i18next/i18next |
| react-i18next | MIT | https://github.com/i18next/react-i18next |
| bonjour-service | MIT | https://github.com/onlxltd/bonjour-service |
| esptool-js | Apache-2.0 | https://github.com/espressif/esptool-js |
| @fontsource-variable/archivo (package) | MIT | https://github.com/fontsource/font-files |
| Archivo font | SIL Open Font License 1.1 | https://github.com/Omnibus-Type/Archivo |
| lucide-react | ISC | https://github.com/lucide-icons/lucide |

### Build / development dependencies

| Package | License | Project |
| --- | --- | --- |
| electron-vite | MIT | https://github.com/alex8088/electron-vite |
| electron-builder | MIT | https://github.com/electron-userland/electron-builder |
| vite | MIT | https://github.com/vitejs/vite |
| @vitejs/plugin-react | MIT | https://github.com/vitejs/vite-plugin-react |
| typescript | Apache-2.0 | https://github.com/microsoft/TypeScript |
| tailwindcss | MIT | https://github.com/tailwindlabs/tailwindcss |
| autoprefixer, postcss | MIT | https://github.com/postcss/postcss |
| class-variance-authority | Apache-2.0 | https://github.com/joe-bell/cva |
| clsx | MIT | https://github.com/lukeed/clsx |
| tailwind-merge | MIT | https://github.com/dcastil/tailwind-merge |
| vitest | MIT | https://github.com/vitest-dev/vitest |
| @playwright/test | Apache-2.0 | https://github.com/microsoft/playwright |

Each package's full license text is distributed with that package in its
`node_modules` folder (or its repository linked above).

## Acknowledgement: wasikuss/snapmaker-u1-remote-rfid-reader (inspiration/reference, MIT)

This project drew inspiration from wasikuss/snapmaker-u1-remote-rfid-reader and used it as a
reference for the tag format and the printer call. **No source code was copied from it.** Its
MIT notice is reproduced below as acknowledgement.

```
MIT License

Copyright (c) 2026 wasikuss

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

> The copyright line above reflects the upstream MIT license. If you redistribute,
> check the current notice at the source repository and copy it verbatim.
