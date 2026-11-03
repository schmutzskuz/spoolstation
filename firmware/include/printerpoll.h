#pragma once
#include "printer.h"

// Hintergrund-Abfrage der Drucker-Slots. Laeuft in einem eigenen FreeRTOS-Task,
// damit die HTTP-Aufrufe die fluessige Display-Animation nicht blockieren.
// Es wird immer der aktive Drucker abgefragt (alle 10 s und nach jedem Senden).

void         pollStart();                         // Task starten
void         pollSetPrinter(int printerIndex);    // aktiven Drucker setzen (loest sofortige Abfrage aus)
void         pollRequestNow();                    // sofortige Abfrage anstossen (z. B. nach Senden)
PrinterSlots pollGetSlots(int printerIndex);      // letzter bekannter Stand (thread-sichere Kopie)
