#pragma once
#include <Arduino.h>

enum BtnEvent {
  BTN_NONE = 0,
  BTN_SHORT,   // kurzer Druck (beim Loslassen, < 1,5 s)
  BTN_LONG     // langer Druck (sobald 1,5 s erreicht sind)
};

// Initialisiert Encoder-Pins und Interrupts (A/B). Taster wird gepollt.
void encoderInit();

// Muss regelmaessig aus loop() aufgerufen werden (Taster-Entprellung).
void encoderUpdate();

// Anzahl Rasterschritte seit dem letzten Aufruf (danach auf 0 zurueckgesetzt).
// enc_reverse aus der Konfiguration wird hier bereits beruecksichtigt.
long encoderTakeDelta();

// Letztes Taster-Ereignis (danach zurueckgesetzt).
BtnEvent encoderTakeButton();
