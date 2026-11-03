#pragma once
#include <Arduino.h>
#include "openspool.h"

// Zustand eines NFC-Jobs. "idle" = seit dem Start noch kein Job.
struct NfcJob {
  int    id    = 0;
  String kind  = "";       // "read" | "write"
  String state = "idle";   // idle | waiting | done | error | timeout | cancelled
  String error = "";

  // Ergebnis (nur bei state == "done" gefuellt)
  bool      hasResult     = false;
  String    uid           = "";
  int       uidLen        = 0;
  String    tagType       = "";
  bool      empty         = false;
  String    rawJson       = "";
  bool      openspoolValid = false;
  OpenSpool openspool;
};

// Initialisiert PN532 auf eigenem HSPI-Bus. Gibt true zurueck, wenn der
// Chip gefunden wurde.
bool nfcInit();

// Startet den Hintergrund-Task (FreeRTOS), der Lese-/Schreibjobs abarbeitet.
void nfcStartTask();

bool nfcIsOk();      // PN532 beim Start gefunden?
bool nfcIsBusy();    // laeuft gerade ein Job (state == "waiting")?

// Startet einen Lesejob. Gibt die job_id zurueck oder -1, wenn gerade busy.
int nfcStartRead(uint32_t timeoutMs);

// Startet einen Schreibjob mit dem gegebenen OpenSpool-Datensatz.
// Gibt die job_id zurueck oder -1, wenn gerade busy.
int nfcStartWrite(const OpenSpool &os, uint32_t timeoutMs);

// Bricht einen laufenden Job ab (sofern moeglich).
void nfcCancel();

// Liefert eine Kopie des aktuellen/letzten Jobs (threadsicher).
NfcJob nfcGetJob();
