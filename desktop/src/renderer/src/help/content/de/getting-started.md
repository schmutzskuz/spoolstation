# Erste Schritte

Willkommen bei SpoolStation. Mit der SpoolStation verwaltest du deine Filamentspulen, beschreibst NFC-Tags und schickst Filamente an deinen Snapmaker U1. Die kleine „Station" ist ein Gerät mit NFC-Leser, das du selbst baust oder fertig hast; dieses Programm am PC steuert alles.

## Was du brauchst

- Die **SpoolStation-App** (dieses Programm).
- Eine **Station** (das NFC-Gerät mit Display und Drehknopf). Wie du sie baust, steht im Kapitel [Hardware](chapter:hardware).
- Einen **Spoolman-Server** in deinem Netzwerk. Spoolman ist eine kostenlose Software, die deine Spulen in einer Datenbank verwaltet.
- Einen **Snapmaker U1** mit **Paxx Extended Firmware** und aktivierter Spoolman-Integration (nur nötig, wenn du Filamente an den Drucker senden willst).

Station, Spoolman und Drucker hängen alle im **gleichen WLAN**. Die Station funkt nur im **2,4-GHz-Netz**.

## Die App einrichten

Beim ersten Start öffnet sich der **Einrichtungsassistent**. Er führt dich in wenigen Schritten durch alles:

1. **Sprache** wählen.
2. **Spoolman-Adresse** eingeben und mit „Verbindung testen" prüfen (z. B. `http://192.168.1.50:7912`).
3. **Drucker** eintragen (Name und IP-Adresse) und testen. Diesen Schritt kannst du überspringen, wenn du keinen Drucker nutzt.
4. **Station einrichten** – entweder eine neue Station per USB flashen oder eine vorhandene koppeln.

Den Assistenten findest du jederzeit wieder unter **Einstellungen → „Station einrichten"**.

![Die Einstellungen mit Verbindungen und Druckern](images/einstellungen.png)

## Eine neue Station per USB einrichten

Hast du einen fabrikneuen oder leeren ESP32, wählst du im Assistenten **„Neue Station einrichten (USB)"**:

1. ESP32 mit einem **USB-Datenkabel** anstecken (reine Ladekabel funktionieren nicht).
2. **„Verbinden"** klicken und den Anschluss mit **CH340** auswählen.
3. Die App spielt die Firmware auf – das dauert ein bis zwei Minuten, bitte nicht abziehen.
4. **WLAN** aus der Liste wählen und das Passwort eingeben.
5. **„Einrichten"** klicken. Die Station startet neu und erscheint danach in der App.

> Hängt es beim Verbinden oder bleibt das Display schwarz? Dann hat dein Board keinen Auto-Reset. Halte beim Flashen die **BOOT**-Taste gedrückt und drücke danach einmal **EN**. Mehr dazu im Kapitel [Fehlerbehebung](chapter:troubleshooting).

## Eine vorhandene Station koppeln

Ist die Station schon eingerichtet (z. B. auf einem anderen PC), wählst du **„Vorhandene Station koppeln"**. Du kannst sie per USB neu einrichten oder einfach über das Netzwerk verbinden, indem du Adresse und API-Schlüssel eingibst.

## So ist die App aufgebaut

Links in der Seitenleiste findest du die Bereiche:

- **Drucker** – zeigt die Slots deines Druckers. Siehe [Drucker-Seite](chapter:printers).
- **Station** – Verbindung zur Station, Tags lesen und schreiben. Siehe [Tag lesen und senden](chapter:read-send).
- **Bibliothek** – alle Spulen, Filamente und Hersteller. Siehe [Bibliothek verwalten](chapter:library).
- **Einstellungen** – Verbindungen, Drucker, Sprache, Updates.
- **Hilfe** – diese Seite.

Oben siehst du dauerhaft den **Verbindungsstatus** zu Station, Drucker und Spoolman. Neben jeder Bereichs-Überschrift gibt es ein kleines **„?"**, das dich direkt zum passenden Hilfe-Kapitel bringt.
