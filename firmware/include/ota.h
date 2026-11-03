#pragma once
#include <Arduino.h>

// OTA-Update der Station (ueber WLAN, Endpunkt POST /api/ota).
//
// Ablauf: Die App streamt die ota.bin (nur App-Partition) in den Request-Body,
// die SHA-256 der Datei steht im Header X-FW-SHA256. Wir schreiben den Stream in
// die freie OTA-Partition, pruefen am Ende die SHA-256 und setzen nur bei
// Uebereinstimmung die Boot-Partition. Danach Neustart. Startet die neue Firmware
// nicht sauber, rollt der Bootloader auf die alte zurueck; das melden wir beim
// naechsten Start ueber otaLastStatus() in /api/status (last_ota).

// Beim Boot einmal aufrufen (vor dem WLAN): erkennt anhand eines NVS-Merkers, ob
// der letzte OTA-Versuch die neue Firmware gestartet hat ("success") oder der
// Bootloader auf die alte zurueckgerollt ist ("rolled_back").
void otaInitBoot();

// Status des letzten OTA-Versuchs fuer /api/status: "" | "success" | "rolled_back".
const char *otaLastStatus();

// Markiert die laufende App als gueltig (Rollback abbestellen), wenn ihr
// Image-Status PENDING_VERIFY ist. Aus dem WLAN-GOT_IP-Event aufrufen.
void otaMarkValidIfPending();

// --- Streaming-OTA (aus dem /api/ota-Handler aufgerufen) ---
// expectedSha256: 64-stelliger Hex-String aus dem Header X-FW-SHA256.
// Rueckgabe false => Fehler (err gesetzt).
bool otaStreamBegin(size_t totalSize, const String &expectedSha256, String &err);
bool otaStreamWrite(const uint8_t *data, size_t len, String &err);
// Prueft SHA-256, setzt bei Erfolg die Boot-Partition und plant den Neustart.
bool otaStreamFinish(String &err);
void otaStreamAbort();

// Laeuft gerade ein OTA-Schreibvorgang?
bool otaInProgress();
