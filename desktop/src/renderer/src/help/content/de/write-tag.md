# Spule anlegen und Tag schreiben

Eine **Spule** ist ein konkretes Exemplar eines [Filaments](chapter:filament) mit eigenem Gewicht. Auf den NFC-Tag der Spule schreibst du die Filamentdaten; die Station erkennt die Spule dann am Gerät wieder.

## Spule anlegen

1. In der **Bibliothek** oben auf **„Spule"** klicken (oder beim Filament-Anlegen gleich „Anlegen + Spule hinzufügen").
2. Das passende **Filament** wählen.
3. Das **Leergewicht der Spule** eingeben (nur der leere Kern ohne Filament). Steht es schon im Filament, wird es übernommen.
4. **„Spule anlegen"** klicken.

Die neue Spule erscheint in der Bibliothek. Danach kannst du direkt einen Tag beschreiben.

## Einen Tag beschreiben und verknüpfen

Klebe zuerst einen leeren **NTAG215-Sticker** auf die Seitenwand der Spule, nah am Rand.

1. Die Spule in der Bibliothek öffnen und auf **„Tag schreiben"** klicken.
2. Den leeren Tag auf die Station legen.
3. Die App schreibt die Filamentdaten, liest den Tag zur Kontrolle noch einmal und **verknüpft** die Tag-UID mit der Spule in Spoolman.

![Spulen-Detail mit „Tag schreiben"](images/spool.png)

Fertig: Ab jetzt erkennt die Station die Spule, sobald du sie auflegst, und bucht beim Drucken den Verbrauch auf genau diese Spule.

> Eine UID gehört immer nur zu **einer** Spule. Beschreibst du einen Tag für eine andere Spule, wird die alte Verknüpfung automatisch entfernt.

## Rohdaten schreiben (ohne Spoolman)

Willst du nur schnell Daten auf einen Tag schreiben, ohne eine Spule in Spoolman anzulegen, nutze auf der **Station**-Seite **„Rohdaten schreiben"**. Dort gibst du Hersteller, Material, Farbe und Temperaturen direkt ein. Diese Tags sind dann aber **nicht** mit einer Spule verknüpft, es wird also kein Verbrauch gebucht.

## Wenn das Schreiben fehlschlägt

Hast du gerade erst eine Spule angelegt und das Schreiben scheitert (z. B. kein Tag aufgelegt), entfernt die App die eben angelegte Spule wieder, damit keine Karteileiche entsteht. Leg den Tag richtig auf und versuch es erneut. Mehr unter [Fehlerbehebung](chapter:troubleshooting).
