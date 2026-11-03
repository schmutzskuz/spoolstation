# Contributing

Thanks for your interest in SpoolStation! This is a small hobby project, but issues and
pull requests are welcome.

## Reporting bugs and ideas

- Use the **issue templates** (bug report / feature request). For bugs, please include your
  **app version**, **firmware version**, **printer model** and a short **log excerpt**.

## Development

- **App:** `cd desktop && npm install`, then `npm run dev`. Before a pull request, please run
  `npm run typecheck` and `npm run test` (both must pass). UI strings go through i18next –
  no hard-coded text, and keep `de`, `en` and `es` in sync (the `locales` test checks this).
- **Firmware:** `cd firmware && pio run` ([PlatformIO](https://platformio.org/)). Keep the
  pinout as documented in the build guide.
- **Versions:** don't edit version numbers by hand. `version.json` is the single source of
  truth; bump it with `npm run version:bump -- patch|minor|major` and rebuild the firmware.

## Conventions

- Match the surrounding code style; keep changes focused.
- Never commit credentials (Wi-Fi, API keys). They live only on the station (NVS) and are set
  over USB during setup.

## License

By contributing, you agree that your contributions are licensed under the project's
[MIT License](LICENSE).
