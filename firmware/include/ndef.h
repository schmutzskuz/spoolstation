#pragma once
#include <Arduino.h>
#include <vector>

// Baut eine komplette TLV-Struktur (0x03 ... 0xFE) mit genau einem
// NDEF-MIME-Record (Typ "application/json", Header 0xD2, Short Record)
// fuer den uebergebenen JSON-String. Ergebnis ist der Byte-Puffer, der
// ab Seite 4 auf den Tag geschrieben wird (noch nicht auf 4er-Vielfaches
// aufgefuellt).
std::vector<uint8_t> ndefBuildMimeJson(const String &json);

// Ergebnis des Parsens.
enum NdefParseResult {
  NDEF_NEED_MORE,  // Puffer reicht noch nicht fuer einen vollstaendigen Record
  NDEF_EMPTY,      // kein NDEF vorhanden (Terminator/leer/ungueltig)
  NDEF_OK          // JSON erfolgreich extrahiert
};

// Versucht aus dem rohen Tag-Speicher (ab Seite 4) den JSON-Payload zu
// extrahieren. Akzeptiert MIME-Records (0xD2) und Text-Records (0xD1, Typ "T").
NdefParseResult ndefExtractJson(const uint8_t *data, size_t len, String &jsonOut);
