#pragma once
#include <Arduino.h>

// Startet WLAN (Zugangsdaten aus der NVS-Config) und mDNS.
// hostname wird fuer <hostname>.local und den mDNS-Service verwendet.
void wifiBegin(const String &hostname);

// Im loop() aufrufen: kuemmert sich um Wiederverbindung.
void wifiLoop();

bool    wifiConnected();
String  wifiIp();        // "0.0.0.0" wenn nicht verbunden
int32_t wifiRssi();      // 0 wenn nicht verbunden
String  wifiHostname();  // "<name>.local"
