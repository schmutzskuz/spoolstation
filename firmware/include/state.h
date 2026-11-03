#pragma once
#include <Arduino.h>

// Aktuell am Geraet gewaehlter Slot (0..3). Wird ueber den Drehencoder gesetzt,
// von der API (/api/status) gelesen.
extern volatile int g_currentSlot;

// OTA-Anzeige: von ota.cpp (laeuft im Webserver-Task) gesetzt, von ui.cpp gelesen.
extern volatile bool g_otaActive;   // true -> Display zeigt den Update-Fortschritt
extern volatile int  g_otaPct;      // 0..100
extern volatile bool g_otaFailed;   // true -> kurze Fehleranzeige

// Geplanter Neustart: millis()-Zeitpunkt, 0 = keiner. In loop() ausgewertet
// (damit die HTTP-Antwort vor dem Reboot noch rausgeht).
extern volatile uint32_t g_rebootAt;
