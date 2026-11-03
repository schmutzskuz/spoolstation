#include <Arduino.h>
#include "version.h"
#include "config.h"
#include "wifi_mgr.h"
#include "nfc.h"
#include "api.h"
#include "ui.h"
#include "state.h"
#include "i18n.h"
#include "printerpoll.h"
#include "setupserial.h"
#include "ota.h"

// Aktuell am Geraet gewaehlter Slot (0..3). Wird vom UI/Encoder gesetzt,
// von der API (/api/status) gelesen.
volatile int g_currentSlot = 0;

// OTA-Anzeige + geplanter Neustart (siehe state.h).
volatile bool     g_otaActive = false;
volatile int      g_otaPct    = 0;
volatile bool     g_otaFailed = false;
volatile uint32_t g_rebootAt  = 0;

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("========================================");
  Serial.printf("  SpoolStation Firmware v%s\n", FW_VERSION);
  Serial.println("========================================");

  // Ergebnis des letzten OTA-Versuchs bestimmen (success/rolled_back) – vor dem WLAN.
  otaInitBoot();

  // Konfiguration aus NVS laden
  configLoad();
  i18nSet(g_config.lang);
  Serial.printf("[Config] Drucker %s:%u, Spoolman %s, Name %s\n",
                g_config.printer_host.c_str(), g_config.printer_port,
                g_config.spoolman_url.c_str(), g_config.device_name.c_str());

  // Display + Encoder, Startbildschirm
  uiInit();

  // NFC initialisieren und Hintergrund-Task starten
  nfcInit();
  nfcStartTask();

  // WLAN + mDNS (gibt IP/mDNS/Version im GOT_IP-Event aus)
  wifiBegin(g_config.device_name);

  // JSON-API starten (funktioniert, sobald WLAN steht)
  apiBegin();

  // Hintergrund-Abfrage der Drucker-Slots (zeigt, was wirklich geladen ist)
  pollStart();

  // Bereit-Meldung fuer den USB-Einrichtungsassistenten (nach Flash/Reset).
  setupSerialAnnounce();

  Serial.println("[Setup] fertig. Warte auf WLAN-Verbindung...");
}

void loop() {
  // Geplanter Neustart (z. B. nach OTA): HTTP-Antwort ist bis hier raus.
  if (g_rebootAt && (int32_t)(millis() - g_rebootAt) >= 0) {
    Serial.println("[Main] Neustart (geplant)");
    delay(50);
    ESP.restart();
  }

  setupSerialLoop();  // Einrichtung ueber USB (immer aktiv)
  wifiLoop();
  uiTick();
  delay(20);
}
