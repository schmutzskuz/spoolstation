# Drucker-Seite und mehrere Drucker

Die **Drucker**-Seite zeigt die Filament-Slots deines Druckers – so, wie der Snapmaker sie gerade belegt sieht. Die Anzeige aktualisiert sich etwa alle 5 Sekunden.

![Die Drucker-Seite mit den Slots](images/drucker.png)

## Was die Slots zeigen

Für jeden Slot (T1–T4) siehst du Farbe, Filamentname, Material, Düsen- und Betttemperatur und – wenn die Spule in Spoolman verknüpft ist – das **Restgewicht**. Oben stehen Druckername, Verbindungsstatus und, falls gerade gedruckt wird, der Fortschritt.

Ein leerer Slot wird als „Leer" angezeigt.

## Eine Spule zuweisen

Direkt auf der Drucker-Seite kannst du einem Slot eine Spule zuordnen, auch **ohne NFC-Tag**:

1. Beim Slot auf **„Spule zuweisen"** klicken.
2. Eine Spule aus Spoolman wählen.
3. Bestätigen – die Station setzt die Slot-Anzeige und bucht den Verbrauch auf diese Spule.

Mit **„Slot leeren"** gibst du den Slot wieder frei.

## Voraussetzungen

Die Slot-Daten kommen vom Drucker über Moonraker. Dafür muss der Snapmaker U1 die **Paxx Extended Firmware** mit aktivierter Spoolman-Integration laufen haben. Restgewicht und Verknüpfung funktionieren nur, wenn die Spulen in Spoolman gepflegt sind.

## Mehrere Drucker

Du kannst bis zu **vier Drucker** einrichten. Das machst du unter **Einstellungen → Drucker**:

1. **„Drucker hinzufügen"** klicken.
2. Name, IP und Port eingeben und mit **„Verbindung testen"** prüfen.
3. Der erste Drucker in der Liste ist der **Standard-Drucker**. Mit **„Als Standard"** änderst du das.

Die Druckerliste wird automatisch mit der Station synchronisiert (im NVS der Station gespeichert). Am Gerät dreht der Knopf dann durch die Slots aller Drucker, und das Display zeigt zusätzlich den Druckernamen.
