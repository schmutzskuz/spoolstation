#pragma once

// Einrichtung ueber USB-Seriell (115200), parallel zur normalen Log-Ausgabe.
// Antworten der Station sind mit dem Praefix "@@SS " markiert und sind JSON.
// Befehle kommen als JSON-Zeilen (ein Objekt mit Feld "cmd"), z. B.:
//   {"cmd":"hello"}
//   {"cmd":"scan_wifi"}
//   {"cmd":"set_wifi","ssid":"...","password":"..."}
//   {"cmd":"set_key","key":"..."}
//   {"cmd":"set_config","printers":[...],"spoolman_url":"...","lang":"de"}
//   {"cmd":"get_info"} | {"cmd":"reboot"} | {"cmd":"factory_reset"}
// Nur ueber USB erreichbar, nicht ueber WLAN.
//
// Protokoll-Version (api_version) wird in hello/get_info gemeldet.
static const int SETUP_API_VERSION = 1;

// Beim Start einmal eine Bereit-Meldung senden ("@@SS {ready:true,...}"), damit
// der PC nach dem Flashen/Reset nicht auf eine feste Zeit warten muss.
void setupSerialAnnounce();

void setupSerialLoop();
