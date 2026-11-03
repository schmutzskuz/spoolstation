#pragma once
#include <Arduino.h>
#include <ArduinoJson.h>
#include <vector>

// Ein Drucker (Name, Adresse, Moonraker-Port).
struct PrinterDef {
  String   name;
  String   host;
  uint16_t port = 7125;
};

static const size_t MAX_PRINTERS = 4;

// Laufzeit-Konfiguration, persistent im NVS (Preferences).
// Keine persoenlichen Standardwerte: alles leer, Einrichtung ueber USB (Serial).
struct Config {
  // Zugangsdaten (nur im NVS, nie im Code/Repo). Setzen nur ueber USB-Serial.
  String   wifi_ssid       = "";
  String   wifi_pass       = "";
  String   api_key         = "";

  String   printer_host    = "";    // = printers[0] (Kompatibilitaet)
  uint16_t printer_port    = 7125;
  String   spoolman_url    = "";
  String   device_name     = "spoolstation";
  bool     enc_reverse     = false;
  uint32_t read_timeout_ms = 10000;
  String   lang            = "de";  // Display-Sprache: de | en | es
  // Bis zu MAX_PRINTERS Drucker. printers[0] spiegelt printer_host/printer_port.
  std::vector<PrinterDef> printers;
};

// Globale Konfiguration (in config.cpp definiert).
extern Config g_config;

// Aus NVS laden (fehlende Werte = Standard aus der Struct-Definition).
void configLoad();

// Komplett in NVS schreiben.
void configSave();

// true, wenn die Station eingerichtet ist (mindestens WLAN-SSID gesetzt).
bool configIsConfigured();

// NVS-Namespace komplett loeschen (Werksreset) und Defaults wiederherstellen.
void configFactoryReset();

// Teilmenge aus einem JSON-Objekt uebernehmen (nur vorhandene Schluessel).
// WICHTIG: akzeptiert KEINE Zugangsdaten (wifi/api_key) – die kommen nur per USB.
// Gibt true zurueck, wenn mindestens ein gueltiger Wert uebernommen wurde.
bool configApplyJson(JsonObjectConst obj);

// Aktuelle Konfiguration in ein JSON-Objekt schreiben (ohne Zugangsdaten).
void configToJson(JsonObject obj);
