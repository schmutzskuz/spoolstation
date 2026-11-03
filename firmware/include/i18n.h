#pragma once
#include <Arduino.h>

// Sprache der Display-Texte (de/en/es). Umschaltbar ueber die Konfiguration.
void   i18nSet(const String &code);  // "de" | "en" | "es" (Fallback de)
String i18nCode();                   // aktueller Code

// Uebersetzten UTF-8-Text zu einem Schluessel liefern (nie nullptr).
const char *tr(const char *key);
