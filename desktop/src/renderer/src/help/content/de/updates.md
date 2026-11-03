# Updates

SpoolStation hält sich selbst aktuell: die **App** über GitHub-Releases und die **Station-Firmware** per Funk (OTA). App und Firmware teilen sich eine Versionsnummer.

## App-Update

Die App prüft beim Start und danach regelmäßig, ob es eine neue Version gibt, und lädt sie im Hintergrund herunter. Ist sie bereit, erscheint oben ein Banner **„Version X ist bereit"** mit den Neuerungen und einem Knopf **„Neu starten und installieren"**.

Unter **Einstellungen → Updates** stellst du ein:

- **Automatisch nach Updates suchen** an/aus.
- **Kanal**: Stabil oder Beta (Vorabversionen).
- **„Jetzt prüfen"** für eine sofortige Suche.

> App-Updates funktionieren nur im **installierten** Programm, nicht in einer Entwicklerversion.

## Station-Firmware aktualisieren (OTA)

Gibt es eine neuere Firmware, siehst du das auf der **Station**-Seite unter „Firmware der Station" und als Hinweis in der Statusleiste. Ein Klick genügt:

1. Auf **„Firmware aktualisieren"** klicken.
2. Die App prüft die Prüfsumme, lädt die Firmware hoch (am Display läuft ein Fortschrittsbogen „Update wird installiert – Nicht ausschalten") und wartet auf den Neustart.
3. Danach bestätigt die App die neue Version.

Geht beim Update etwas schief, bleibt die **alte Firmware erhalten** – die Station wird dabei nicht unbrauchbar. Die App meldet in dem Fall klar, dass zurückgerollt wurde.

Über **„Firmware-Datei auswählen…"** kannst du auch eine eigene `ota.bin` einspielen. Verwende dabei nur eine Datei, die wirklich für diese Station gedacht ist.

## Einmaliges USB-Update bei alter Firmware

Sehr alte Firmware kennt das Funk-Update noch nicht. Dann zeigt die Station-Seite den Hinweis **„Diese Firmware kann noch nicht per WLAN aktualisiert werden. Bitte einmal per USB aktualisieren."** mit einem Knopf, der den Assistenten im Modus **„Firmware aktualisieren, Einstellungen behalten"** öffnet.

Dieser Weg schreibt **nur die Firmware neu**; WLAN, API-Schlüssel und Drucker bleiben erhalten. Stecke die Station per USB an und folge dem Assistenten. Ab dann geht jedes weitere Update bequem per Funk.
