# Fehlerbehebung / FAQ

Hier findest du Lösungen für die häufigsten Probleme. Oft hilft schon ein Blick auf den Verbindungsstatus oben in der App.

## Station wird nicht gefunden

- Hängt die Station im **gleichen WLAN** wie der PC? Die Station kann nur **2,4 GHz**.
- Gib die Adresse auf der Station-Seite **manuell** ein (feste IP aus dem Router oder `spoolstation.local`).
- Prüfe am Gerät über **lang drücken** die aktuelle IP-Adresse.
- Blockiert die **Windows-Firewall** das Programm? Erlaube SpoolStation für **private Netzwerke**.
- Tipp: Gib der Station im Router eine **feste IP**, dann ändert sie sich nie.

## NFC nicht bereit

Steht oben „NFC nicht bereit", hat die Station das PN532-Modul nicht gefunden:

- Der **DIP-Schalter** muss auf SPI stehen: Schalter 1 OFF, Schalter 2 ON.
- Prüfe die Verkabelung, besonders **MISO → GPIO 27** und **MOSI → GPIO 13** (die beiden werden leicht vertauscht).
- Das Modul braucht **3,3 V** und GND.

## Tag wird nicht erkannt

- Nur **NTAG215** verwenden (NTAG213 ist zu klein).
- Den Tag **flach und mittig** auf die Lesefläche legen, Abstand 2–4 cm.
- Kein **Metall** direkt unter dem Tag.
- Klebe den Sticker auf die **Seitenwand** der Spule, nah am Rand.

## Drucker nicht erreichbar

- Stimmen **IP und Port** (Standard 7125)? Teste die Verbindung unter Einstellungen → Drucker.
- Läuft auf dem Snapmaker U1 die **Paxx Extended Firmware** mit aktivierter Spoolman-Integration?
- Hängt der Drucker im gleichen Netz und ist eingeschaltet?

## Spoolman nicht erreichbar

- Prüfe die **Spoolman-URL** (z. B. `http://192.168.1.50:7912`). Ist Spoolman nicht erreichbar, probiere Port **8000**.
- Läuft der Spoolman-Server (z. B. auf dem Raspberry Pi)?
- Teste die URL einmal im Browser.

## Flashen hängt / Display bleibt schwarz

Manche günstigen Boards haben keinen Auto-Reset-Kondensator und starten nach dem Flashen nicht von selbst:

1. Beim Verbinden/Flashen die **BOOT**-Taste am ESP32 gedrückt halten.
2. Bleibt das Display danach schwarz, einmal die **EN**-Taste drücken und **„Erneut versuchen"** klicken.
3. Hilft das nicht: anderes **USB-Datenkabel** verwenden (reine Ladekabel gehen nicht) und direkt an den PC stecken, nicht über einen Hub.

## CH340-Treiber fehlt

Erscheint beim Flashen kein Anschluss zur Auswahl, fehlt wahrscheinlich der **CH340-USB-Treiber**:

- Installiere den Treiber des Herstellers **WCH** (CH340/CH341).
- Danach den ESP32 neu anstecken und erneut „Verbinden".

## WLAN-Liste ist leer

- Die Station sieht nur **2,4-GHz-Netze**. Reine 5-GHz-Netze erscheinen nicht.
- Nutzt dein Router denselben Namen für 2,4 und 5 GHz, wähle trotzdem den Eintrag – die Station verbindet sich mit dem 2,4-GHz-Band.
- Über **„Erneut suchen"** die Liste aktualisieren oder den Netzwerknamen von Hand eingeben.

## App und Station passen nicht zusammen

Zeigt die App „Version passt nicht", sind App und Firmware unterschiedlich weit. Aktualisiere beide: erst die App, dann die Station-Firmware (siehe [Updates](chapter:updates)).
