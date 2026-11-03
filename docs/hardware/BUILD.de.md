# SpoolStation – Bauanleitung (Hardware)

Diese Anleitung zeigt Schritt für Schritt, wie du die SpoolStation baust: vom Verkabeln bis zur ersten Einrichtung mit der App. Du brauchst keine Vorkenntnisse, nur einen Lötkolben und etwas Geduld.

> 🌍 This guide is also available in [English](BUILD.en.md).

> 📷 **Fotos:** An mehreren Stellen stehen Platzhalter wie *Foto: `name.jpg`*. Die passenden Bilder machst du selbst und legst sie unter [`docs/images/`](../images/) ab; die Liste steht in [`docs/images/PHOTOS-TODO.md`](../images/PHOTOS-TODO.md). Ersetze den Platzhalter dann durch `![Beschreibung](../images/name.jpg)`.

**Was die SpoolStation macht:** Ein ESP32 mit NFC-Leser liest und beschreibt NFC-Tags auf deinen Filamentspulen. Am Gerät wählst du mit dem Drehknopf einen Drucker-Slot und schickst das Filament per Knopfdruck an deinen Snapmaker U1. Am PC verwaltest du mit der SpoolStation-App deine Spulen in Spoolman und beschreibst Tags.

**Ablauf:** Teile besorgen → Grundlagen lesen → Bauteile anlöten → in den Adapter schrauben → durchmessen → mit der App einrichten.

---

## 1. Teile und Werkzeug

### Elektronik

| Teil | Hinweis |
| --- | --- |
| ESP32 DevKit, 30 Pin (ESP32-WROOM-32) | mit USB-C und CH340-USB-Chip |
| ESP32-Schraubklemmen-Adapter, 30 Pin (schmale Version) | der ESP32 wird nur aufgesteckt, nicht gelötet |
| PN532 NFC-Modul V3 (rote Platine) | liest und schreibt die Tags |
| Rundes Display GC9A01, 1,28", 240 × 240 | Anzeige am Gerät |
| Drehencoder EC11 mit Drückfunktion + Drehknopf | Slot wählen, Lesen starten |
| NFC-Sticker NTAG215 (z. B. 25 mm) | kommen auf die Spulen; NTAG213 ist zu klein |

### Kleinteile

| Teil | Angabe |
| --- | --- |
| Silikonlitze | 0,25 mm² (24 AWG), mehrere Farben, mindestens Rot und Schwarz |
| Aderendhülsen, isoliert | 0,25 mm² (ca. 30 Stück) und 0,5 mm² (ca. 5 Stück) |
| Schrumpfschlauch | Sortiment 1,5–3 mm |
| USB-C-**Datenkabel** | muss Daten übertragen können, reine Ladekabel funktionieren nicht |
| USB-Netzteil | 5 V, mindestens 1 A, für den Dauerbetrieb |

### Werkzeug

- Lötkolben (regelbar, ca. 330 °C) und Lötzinn mit Flussmittel, 0,5–0,8 mm
- Seitenschneider und Abisolierzange
- Crimpzange für Aderendhülsen (0,25–10 mm²)
- Kleiner Schlitzschraubendreher (2–2,5 mm)
- **Multimeter mit Durchgangsprüfer (Piepser)**, Pflicht für Kapitel 5
- Optional: „Dritte Hand" oder Knetmasse zum Halten beim Löten

> 📷 *Foto: `parts-overview.jpg` – alle Teile und Werkzeuge übersichtlich ausgelegt.*

---

## 2. Grundlagen

Drei Regeln verhindern fast alle Schäden:

1. **Nie mit eingestecktem USB löten oder verkabeln.**
2. **Alles läuft mit 3,3 V.** Der Anschluss VIN (5 V) wird nicht benutzt.
3. **Jedes Bauteil braucht eine Verbindung zu GND** (Masse, Minus).

### Begriffe

- **Pin:** Anschluss am Board. Die Beschriftung steht auf der Platine (Lupe oder Handykamera hilft). „D18" auf dem Board ist dasselbe wie „GPIO 18" in dieser Anleitung.
- **3V3:** Hier kommen 3,3 Volt heraus. Damit werden Display und NFC-Modul versorgt.
- **GND:** Masse. Der gemeinsame Bezugspunkt aller Bauteile.
- **EN / BOOT:** die zwei kleinen Taster auf dem ESP32. EN = Neustart, BOOT = Flash-Modus (nur nötig, wenn das Aufspielen hängt).
- **Litze:** Kabel aus vielen feinen Drähtchen, biegsam und bruchfest.
- **Aderendhülse:** Metallröhrchen mit Kunststoffkragen für das Litzenende in der Schraubklemme. Es verhindert abstehende Drähtchen und Kurzschlüsse.

### Die zwei Enden jeder Litze

- **Bauteil-Ende:** 3 mm abisolieren, verdrillen, verzinnen, anlöten.
- **Klemmen-Ende:** 8 mm abisolieren, verdrillen, Aderendhülse aufcrimpen, in den Adapter schrauben. **Nie verzinnen**, Zinn gibt unter der Schraube nach und die Klemme wird locker.

> 📷 *Foto: `ferrule.jpg` – ein fertig gecrimptes Klemmen-Ende mit Aderendhülse.*

### Löten in Kürze

1. Lötkolben auf ca. 330 °C, Spitze sauber machen.
2. Spitze so halten, dass sie **Pin und Kupferring gleichzeitig** berührt, 1–2 Sekunden warten.
3. Lötzinn an die **gegenüberliegende Seite** des Pins halten, es fließt von selbst.
4. Erst Zinn weg, dann Spitze weg. Insgesamt 2–3 Sekunden.
5. Gute Lötstelle: **glänzend und kegelförmig**. Zwei Pins dürfen nie durch Zinn verbunden sein.

Vor jeder Lötstelle an einer Litze: **Schrumpfschlauch aufschieben**, danach über die Lötstelle ziehen und kurz erwärmen.

---

## 3. Pinbelegung

Diese Belegung ist verbindlich, die Firmware erwartet genau diese Pins. Schneide alle Litzen zunächst auf **15 cm**, gekürzt wird später im Gehäuse.

| Bauteil | Pin am Bauteil | Klemme am Adapter | Farbvorschlag |
| --- | --- | --- | --- |
| Display | VCC | 3V3 (zusammen mit NFC VCC) | Rot |
| Display | GND | GND neben VIN | Schwarz |
| Display | SCL | GPIO 18 | Gelb |
| Display | SDA | GPIO 23 | Grün |
| Display | RES (RST) | GPIO 17 (manchmal „TX2") | Weiß |
| Display | DC | GPIO 16 (manchmal „RX2") | Grau |
| Display | CS | GPIO 5 | Lila |
| Display | BLK (falls vorhanden) | GPIO 4 | Braun |
| NFC PN532 | VCC | 3V3 (zusammen mit Display VCC) | Rot |
| NFC PN532 | GND | GND neben 3V3 (zusammen mit Drehknopf) | Schwarz |
| NFC PN532 | SCK | GPIO 14 | Gelb |
| NFC PN532 | MISO | GPIO 27 | Blau |
| NFC PN532 | MOSI | GPIO 13 | Grün |
| NFC PN532 | SS | GPIO 26 | Lila |
| NFC PN532 | IRQ, RSTO | frei lassen | – |
| Drehknopf | Out A | GPIO 32 | Orange |
| Drehknopf | Out B | GPIO 33 | Blau |
| Drehknopf | GND (beide GND-Beinchen gebrückt) | GND neben 3V3 (zusammen mit NFC) | Schwarz |
| Drehknopf | Switch | GPIO 25 | Weiß |

Die Klemme **VIN bleibt frei**. SCL und SDA heißen am Display zwar wie bei I2C, es ist aber SPI. Display und NFC-Modul hängen an zwei getrennten SPI-Bussen.

---

## 4. Verkabeln

### Schritt 1: Adapter vorbereiten

1. Prüfen, dass dein ESP32 auf jeder Seite **15 Pins** hat.
2. ESP32 in den Adapter stecken, so dass die Beschriftungen zusammenpassen (z. B. 3V3 an 3V3). Die USB-Buchse zeigt zur Kante.
3. Neben der USB-Buchse einen Edding-Punkt auf den Adapter machen, damit du den ESP32 nie verkehrt herum einsteckst.
4. Hat der Adapter keine Beschriftung: die benötigten Pin-Nummern mit Edding neben die Klemmen schreiben.
5. ESP32 wieder herausziehen. Er bleibt draußen, bis alles verkabelt und gemessen ist.

Beim 30-Pin-ESP32 liegt 3V3 unten rechts (neben einem GND), VIN unten links (neben dem anderen GND), wenn die USB-Buchse nach unten zeigt. Prüf es trotzdem an deinem Board.

### Schritt 2: NFC-Modul

1. **DIP-Schalter auf SPI stellen:** Laut Tabelle auf der Platine ist SPI = „0 1". Also **Schalter 1 weg von ON, Schalter 2 auf ON**. Ohne diese Einstellung wird das Modul nicht gefunden.
2. Die Litzen **von der Chip-Seite** in die Löcher SCK, MISO, MOSI, SS, VCC, GND stecken und auf der Rückseite verlöten. Die mitgelieferte Stiftleiste wird nicht gebraucht. IRQ und RSTO bleiben frei.
3. Die glatte Rückseite ist die **Lesefläche**. Sie zeigt später im Gehäuse nach oben zur Spule.
4. Die Litzen mit einem Klebeband-Fähnchen „NFC" markieren, die Farben wiederholen sich beim Display.

> 📷 *Foto: `nfc-dip.jpg` – der DIP-Schalter in SPI-Stellung.*
> 📷 *Foto: `nfc-soldered.jpg` – das NFC-Modul mit angelöteten Litzen.*

### Schritt 3: Display

1. Beschriftung auf der Rückseite lesen, meist `VCC GND SCL SDA RES DC CS BLK`.
2. Hat das Display Stifte: Stift verzinnen, verzinnte Litze seitlich anlegen, beides kurz erhitzen. Hat es nur Löcher: wie beim NFC-Modul direkt einlöten.
3. **Vorsicht Hitze:** pro Pin höchstens 3 Sekunden.
4. Fähnchen „DISPLAY" an die Litzen.

> 📷 *Foto: `display-soldered.jpg` – das Display mit angelöteten Litzen.*

### Schritt 4: Drehknopf

Der EC11 hat drei Beinchen auf der einen Seite und zwei auf der anderen:

| Seite | Beinchen | Bedeutung |
| --- | --- | --- |
| Dreier-Seite | außen | Out A |
| Dreier-Seite | Mitte | GND |
| Dreier-Seite | außen | Out B |
| Zweier-Seite | eines | Switch (Taster) |
| Zweier-Seite | anderes | GND |

1. **GND-Brücke:** Ein kurzes Stück Litze vom mittleren Beinchen der Dreier-Seite zum GND-Beinchen der Zweier-Seite löten.
2. Vier lange Litzen anlöten: Out A, Out B, Switch und eine schwarze an eines der GND-Beinchen.
3. Dreht der Knopf später falsch herum, ist das egal. Die Richtung lässt sich in der App umstellen.

> 📷 *Foto: `encoder-bridge.jpg` – die GND-Brücke und die vier Litzen am Encoder.*

### Schritt 5: Klemmen-Enden und Adapter

1. Klemmen-Enden mit Aderendhülsen versehen (siehe Kapitel 2). Zugprobe machen.
2. **Zwei Litzen in eine 0,5-mm²-Aderendhülse:**
   - 3V3: Display VCC + NFC VCC
   - GND neben 3V3: NFC GND + Drehknopf GND
3. Display GND kommt allein in die GND-Klemme neben VIN.
4. Alle Litzen nach der Tabelle in Kapitel 3 festschrauben und abhaken.

> 📷 *Foto: `adapter-wired.jpg` – der fertig verdrahtete Adapter, alle Klemmen belegt.*

---

## 5. Durchmessen (ESP32 noch nicht eingesteckt)

Multimeter auf Durchgang (Piepser):

1. 3V3-Klemme gegen beide GND-Klemmen: **darf nicht piepen.**
2. Für jede Zeile der Tabelle: Pin am Bauteil gegen Schraube der Klemme: **muss piepen.**
3. Jede benutzte Klemme gegen ihre Nachbarklemmen: **darf nicht piepen.**

> 📷 *Foto: `multimeter.jpg` – die Durchgangsprüfung am Adapter.*

### Checkliste vor dem ersten Einschalten

- [ ] DIP-Schalter am NFC-Modul auf SPI
- [ ] VIN-Klemme frei
- [ ] 3V3: Display VCC + NFC VCC
- [ ] GND neben VIN: Display GND; GND neben 3V3: NFC GND + Drehknopf GND
- [ ] Alle Messungen bestanden
- [ ] Keine abstehenden Drähtchen, alle Lötstellen isoliert
- [ ] ESP32 richtig herum eingesteckt (USB am Edding-Punkt)

Wird beim Einschalten etwas warm oder riecht es: **sofort USB ziehen** und erneut messen.

---

## 6. Einrichten mit der App

Die komplette Einrichtung läuft über die SpoolStation-App. Du brauchst keine Programmierumgebung und keine Konfigurationsdateien.

1. SpoolStation-App installieren und starten.
2. Der Einrichtungsassistent fragt nach Sprache, Spoolman-Adresse und Drucker.
3. **„Neue Station einrichten (USB)"** wählen und den ESP32 per USB-Datenkabel anstecken.
4. **„Verbinden"** klicken und den Anschluss mit **CH340** auswählen. Die App spielt die Firmware auf.
   - Hängt es bei „Verbinden": die **BOOT-Taste** am ESP32 gedrückt halten.
   - Bleibt das Display danach schwarz: einmal die **EN-Taste** drücken und „Erneut versuchen" klicken.
5. WLAN aus der Liste wählen und Passwort eingeben. Die Station unterstützt **nur 2,4-GHz-WLAN**.
6. Die Station startet neu, verbindet sich und erscheint in der App. Fertig.

Erscheint kein Anschluss: anderes USB-Kabel probieren (reine Ladekabel ohne Datenleitungen funktionieren nicht) oder den CH340-Treiber des Herstellers WCH installieren.

**Tipp:** Gib der Station im Router eine feste IP-Adresse, dann ändert sie sich nie.

> 📷 *Foto: `assembled.jpg` – die fertige, verkabelte Station mit laufendem Display.*

Mehr zur Bedienung und zur Einrichtung steht in der **Hilfe direkt in der App**.

---

## 7. Bedienung am Gerät

| Aktion | Wirkung |
| --- | --- |
| Drehen | Drucker-Slot wählen |
| Kurz drücken | Lesen starten, Spule auflegen; das Filament geht danach automatisch an den Drucker |
| Lang drücken | Info-Seite (IP, WLAN-Signal, Firmware-Version) |
| Beim Einstecken 10 s gedrückt halten | Werksreset (mit Sicherheitsabfrage) |

Den NFC-Sticker klebst du auf die **Seitenwand der Spule**, nah am Rand. Die Spule flach und mittig auf die Lesefläche legen, Reichweite etwa 2–4 cm.

---

## 8. Fehlersuche

| Problem | Häufigste Ursache | Lösung |
| --- | --- | --- |
| Display bleibt schwarz | VCC/GND fehlt, BLK nicht angeschlossen | 3V3- und GND-Klemmen nachziehen und durchmessen |
| Display zeigt Pixelsalat | SCL/SDA oder CS/DC vertauscht | Mit der Tabelle in Kapitel 3 vergleichen |
| „NFC nicht bereit" | DIP-Schalter nicht auf SPI, MISO/MOSI vertauscht | DIP-Schalter prüfen; MISO → 27, MOSI → 13 |
| Tag wird nicht gelesen | Tag zu weit weg, Metall in der Nähe, falscher Tag-Typ | Direkt auflegen, NTAG215 verwenden |
| Drehknopf zählt falsch herum | Out A und Out B vertauscht | In der App „Drehrichtung umkehren" |
| Drücken wird nicht erkannt | Switch an falschem Beinchen | Die zwei Beinchen der Zweier-Seite prüfen |
| ESP32 startet ständig neu | Schwaches USB-Kabel oder USB-Hub | Kurzes Kabel direkt am PC oder Netzteil |
| App findet die Station nicht | Firewall, anderes Netz | Feste IP eintragen; Windows-Firewall für private Netzwerke zulassen |

---

## 9. Gehäuse

*Platzhalter: Die Druckdateien (STL/3MF) und die Montageanleitung für das Gehäuse folgen. Sie werden hier verlinkt, sobald sie fertig sind.*

> 📷 *Foto: `enclosure.jpg` – die Station im fertigen Gehäuse (folgt mit den Druckdateien).*
