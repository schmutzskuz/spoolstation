#pragma once

// Initialisiert Display + Encoder und zeigt den Startbildschirm.
void uiInit();

// Muss regelmaessig aus loop() aufgerufen werden: verarbeitet Encoder,
// steuert den Zustandsautomaten und zeichnet flackerfrei (Sprite).
void uiTick();
