#pragma once
#include <Arduino.h>
#include "openspool.h"

struct PrinterResult {
  bool   ok          = false;
  int    http_status = 0;
  String response    = "";
};

// Schickt das Filament an einen Drucker-Slot:
//   1. POST /printer/filament_detect/set  (Anzeige + CARD_UID als Byte-Array)
//   2. Falls spool_id vorhanden: POST /printer/gcode/script  SET_SPOOL_ID
//      (verknuepft Tag<->Spule in Spoolman und aktiviert die Verbrauchsbuchung)
// uidHex ist die UID als Grossbuchstaben-Hex ohne Trenner (wird fuer CARD_UID
// in ein Byte-Array umgewandelt). host/port bestimmen den Zieldrucker.
PrinterResult printerSend(const String &host, uint16_t port, int channel,
                          const OpenSpool &os, const String &uidHex);

// Ein Slot, wie er tatsaechlich im Drucker geladen ist (aus den AFC_lane-Objekten).
struct SlotInfo {
  bool   present   = false;
  String name;               // filament_name
  String material;           // material (PLA, PETG, ...)
  String colorHex;           // "RRGGBB" (ohne #), leer = unbekannt
  long   spoolId   = 0;      // 0 = keine Spoolman-Spule
  long   remaining = -1;     // Restgewicht in g aus Spoolman, -1 = unbekannt
};

struct PrinterSlots {
  bool     reachable = false;
  SlotInfo slots[4];
};

// Fragt die vier Slots eines Druckers ab (GET /printer/objects/query?AFC_lane E0..E3,
// ArduinoJson-Filter), gleiche Regeln wie das PC-Programm (AFC_lane ist Hauptquelle,
// "NONE"/leer/0 wird ignoriert). Fuer belegte Slots (spool_id > 0) wird das
// Restgewicht aus Spoolman nachgeladen (GET /api/v1/spool/{id}, nur remaining_weight).
// Blockiert (HTTP) – sollte aus einem Hintergrund-Task aufgerufen werden.
PrinterSlots printerQuerySlots(const String &host, uint16_t port, const String &spoolmanUrl);
