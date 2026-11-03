# Bedienung am Gerät

Die Station hat nur zwei Bedienelemente: einen **Drehknopf**, den du auch drücken kannst. Damit erledigst du alles direkt am Gerät, ohne PC.

## Startbildschirm

![Startbildschirm mit den vier Slots](images/display-start.png)

Außen siehst du einen Ring aus vier Segmenten – das sind die **Slots 1 bis 4** deines Druckers, jeweils in der **echten Filamentfarbe**. In der Mitte ist eine Spule abgebildet; ihr Füllstand zeigt das Restgewicht. Darunter stehen Slot-Nummer, Filamentname, Material und Restgewicht.

Ein leerer oder unbekannter Slot wird als dünner grauer Bogen dargestellt.

## Drehen – Slot wählen

Dreh den Knopf, um einen Slot auszuwählen. Das gewählte Segment wird dicker und bekommt außen eine Messing-Markierung. Hast du mehrere Drucker eingerichtet, dreht der Knopf durch alle Slots aller Drucker; das Display zeigt dann zusätzlich den Druckernamen.

> Dreht der Knopf „falsch herum"? Das lässt sich umstellen: **Einstellungen → Stationskonfiguration → Drehrichtung umkehren** (oder direkt am Gerät über die Station-Seite).

## Kurz drücken – lesen und senden

![Lesen: Spule auflegen](images/display-lesen.png)

Ein kurzer Druck startet das **Lesen**. Ein Messing-Bogen leert sich wie ein Countdown, dazu pulsieren NFC-Wellen und der Text „Spule auflegen" erscheint. Leg die Spule mit dem NFC-Tag auf die Lesefläche.

![Erfolg: Slot geladen](images/display-erfolg.png)

Wird der Tag erkannt, füllt sich die Spule in der Filamentfarbe, ein Haken erscheint und das Filament wird **automatisch an den gewählten Drucker-Slot** geschickt. Nach wenigen Sekunden springt die Anzeige zurück.

Klappt etwas nicht, wackelt die Anzeige kurz und zeigt einen roten Kreis mit einer klaren Meldung.

## Lang drücken – Info-Seite

Hältst du den Knopf länger (mehr als 1,5 Sekunden), erscheint die **Info-Seite** mit IP-Adresse, mDNS-Name (`spoolstation.local`), WLAN-Signal und Firmware-Version. Das ist praktisch, wenn du die Adresse der Station suchst.

## Aufträge vom PC

Startest du am PC einen Lese- oder Schreibvorgang, zeigt das Gerät „PC – Tag auflegen" und der Drehknopf ist währenddessen gesperrt. Danach siehst du dieselbe Erfolgs- oder Fehleranimation wie am Gerät.

## Automatisches Dimmen

Nach 60 Sekunden ohne Bedienung dimmt das Display sanft ab. Beim nächsten Drehen oder Drücken wird es sofort wieder hell.

## Werksreset

Willst du der Station alles „abgewöhnen" (WLAN, API-Schlüssel, Drucker, Spoolman-URL), machst du einen **Werksreset**:

1. Station **vom Strom trennen**.
2. Den **Drehknopf gedrückt halten** und dabei wieder einstecken.
3. Weiter gedrückt halten (etwa 10 Sekunden), bis die Sicherheitsabfrage erscheint.
4. Mit dem Knopf bestätigen.

Danach ist die Station wieder wie neu und startet im Einrichtungsmodus. Deine Spoolman-Datenbank und die Tags auf den Spulen bleiben davon unberührt.
