#include "wifi_mgr.h"
#include "version.h"
#include "config.h"
#include "ota.h"
#include <WiFi.h>
#include <ESPmDNS.h>

static String   s_hostname = "spoolstation";
static bool     s_mdnsStarted = false;
static uint32_t s_lastReconnect = 0;

static void startMdns() {
  if (s_mdnsStarted) {
    MDNS.end();
    s_mdnsStarted = false;
  }
  if (MDNS.begin(s_hostname.c_str())) {
    // Service _spoolstation._tcp auf Port 80 (die JSON-API)
    MDNS.addService("spoolstation", "tcp", 80);
    MDNS.addServiceTxt("spoolstation", "tcp", "version", FW_VERSION);
    s_mdnsStarted = true;
    Serial.printf("[mDNS] aktiv als %s.local\n", s_hostname.c_str());
  } else {
    Serial.println("[mDNS] Start fehlgeschlagen");
  }
}

static void onWifiEvent(WiFiEvent_t event) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      Serial.println();
      Serial.println("================ WLAN verbunden ================");
      Serial.printf("  IP-Adresse:      %s\n", WiFi.localIP().toString().c_str());
      Serial.printf("  mDNS-Name:       %s.local\n", s_hostname.c_str());
      Serial.printf("  Firmware-Version: %s\n", FW_VERSION);
      Serial.printf("  RSSI:            %d dBm\n", WiFi.RSSI());
      Serial.println("================================================");
      startMdns();
      // OTA: dieser Start war sauber (WLAN steht) -> Firmware als gueltig markieren,
      // damit der Bootloader beim naechsten Neustart nicht zurueckrollt.
      {
        static bool marked = false;
        if (!marked) { marked = true; otaMarkValidIfPending(); }
      }
      break;

    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      Serial.println("[WLAN] getrennt - versuche Wiederverbindung...");
      break;

    default:
      break;
  }
}

void wifiBegin(const String &hostname) {
  s_hostname = hostname.length() ? hostname : String("spoolstation");

  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(s_hostname.c_str());
  WiFi.setAutoReconnect(true);
  WiFi.onEvent(onWifiEvent);

  // Ohne hinterlegte Zugangsdaten nicht verbinden (Einrichtungsmodus).
  if (!g_config.wifi_ssid.length()) {
    Serial.println("[WLAN] keine Zugangsdaten -> Einrichtungsmodus (USB)");
    return;
  }
  Serial.printf("[WLAN] verbinde mit SSID \"%s\" ...\n", g_config.wifi_ssid.c_str());
  WiFi.begin(g_config.wifi_ssid.c_str(), g_config.wifi_pass.c_str());
}

void wifiLoop() {
  if (!g_config.wifi_ssid.length()) return;  // Einrichtungsmodus
  // Fallback zur ereignisbasierten Wiederverbindung: alle 10 s pruefen.
  if (WiFi.status() != WL_CONNECTED) {
    uint32_t now = millis();
    if (now - s_lastReconnect > 10000) {
      s_lastReconnect = now;
      WiFi.reconnect();
    }
  }
}

bool wifiConnected() { return WiFi.status() == WL_CONNECTED; }

String wifiIp() {
  return wifiConnected() ? WiFi.localIP().toString() : String("0.0.0.0");
}

int32_t wifiRssi() { return wifiConnected() ? WiFi.RSSI() : 0; }

String wifiHostname() { return s_hostname + ".local"; }
