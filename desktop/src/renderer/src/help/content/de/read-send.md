# Tag lesen und Spule an Drucker senden

Auf der **Station**-Seite liest und schreibst du Tags direkt vom PC aus und siehst den Zustand der Station.

![Die Station-Seite](images/station.png)

## Mit der Station verbinden

Oben auf der Station-Seite verbindest du dich mit dem Gerät:

- **„Suchen"** findet die Station automatisch im Netzwerk (per mDNS).
- Alternativ gibst du die **Adresse** direkt ein, z. B. die feste IP aus deinem Router oder `spoolstation.local`.

Ist die Verbindung da, zeigt der Statusbereich Name, IP, WLAN-Signal, Laufzeit und ob das NFC-Modul bereit ist.

## Einen Tag lesen

1. Auf **„Tag lesen"** klicken.
2. Die Spule mit dem Tag auf die Station legen.
3. Die App zeigt die UID und die gespeicherten Daten (Hersteller, Material, Farbe, Temperaturen).

Steht die Spule in Spoolman, kannst du sie direkt öffnen. Wird kein gültiger Tag erkannt, läuft nach einigen Sekunden die Zeit ab und du bekommst eine Meldung.

## Eine Spule an einen Drucker-Slot senden

Du musst keinen Tag beschreiben, um ein Filament zu laden – du kannst eine Spule auch direkt aus der Bibliothek an einen Slot schicken:

1. In der **Bibliothek** die Spule öffnen.
2. Auf **„An Drucker-Slot"** klicken.
3. Drucker und **Slot (T1–T4)** wählen.
4. **„Senden"** klicken.

Die Station setzt die Slot-Anzeige am Drucker und verknüpft die Spule, sodass der Verbrauch gebucht wird. Am Gerät selbst geht das noch einfacher: Slot drehen, Spule auflegen, kurz drücken – fertig (siehe [Bedienung am Gerät](chapter:device)).

## Slot leeren

Auf der **Drucker**-Seite kannst du einen Slot mit **„Slot leeren"** wieder freigeben. Das entkoppelt die Spule vom Slot und stoppt die Verbrauchsbuchung.
