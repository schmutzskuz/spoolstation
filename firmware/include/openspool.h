#pragma once
#include <Arduino.h>
#include <ArduinoJson.h>

// OpenSpool-Datensatz (alle Felder als String gehalten, da der Tag Strings
// speichert; beim Lesen werden auch Zahlen akzeptiert).
struct OpenSpool {
  String protocol;      // "openspool"
  String version;       // "1.0"
  String brand;
  String type;
  String subtype;
  String color_hex;     // ohne '#'
  String alpha;         // Hex, z. B. "FF"
  String min_temp;
  String max_temp;
  String bed_min_temp;
  String bed_max_temp;
  String spool_id;

  // Aus JSON-Objekt einlesen (Zahlen und Strings erlaubt).
  void fromJson(JsonObjectConst obj);

  // In JSON-Objekt schreiben. protocol/version werden mit Standard
  // "openspool"/"1.0" aufgefuellt, leere Felder weggelassen. color_hex ohne '#'.
  void toJson(JsonObject obj) const;

  // Kompaktes JSON fuer den Tag erzeugen (fuer NDEF-Write).
  String toCompactJson() const;
};
