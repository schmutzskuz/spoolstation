#include "printerpoll.h"
#include "config.h"
#include <WiFi.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/semphr.h>

static PrinterSlots      s_cache[MAX_PRINTERS];     // letzter bekannter Stand je Drucker
static SemaphoreHandle_t s_mutex = nullptr;
static volatile int      s_active   = 0;            // welcher Drucker gepollt wird
static volatile bool     s_pollNow  = true;         // sofortige Abfrage anstossen

static int printerCount() {
  int n = (int)g_config.printers.size();
  return n > 0 ? n : 1;
}

static void getTarget(int idx, String &host, uint16_t &port) {
  if (idx >= 0 && idx < (int)g_config.printers.size()) {
    host = g_config.printers[idx].host;
    port = g_config.printers[idx].port;
  } else {
    host = g_config.printer_host;
    port = g_config.printer_port;
  }
}

static void pollTask(void *) {
  for (;;) {
    // Bis zu 10 s warten, aber frueher aufwachen, wenn eine Abfrage angefragt wurde.
    for (int i = 0; i < 50 && !s_pollNow; i++) vTaskDelay(pdMS_TO_TICKS(200));
    s_pollNow = false;

    if (!WiFi.isConnected()) { vTaskDelay(pdMS_TO_TICKS(500)); continue; }

    int idx = s_active;
    if (idx < 0 || idx >= printerCount()) idx = 0;

    String host; uint16_t port;
    getTarget(idx, host, port);

    PrinterSlots res = printerQuerySlots(host, port, g_config.spoolman_url);

    if (xSemaphoreTake(s_mutex, portMAX_DELAY) == pdTRUE) {
      // Nicht erreichbar: letzten Stand behalten (wird im UI grau dargestellt),
      // nur das reachable-Flag aktualisieren.
      if (res.reachable) s_cache[idx] = res;
      else               s_cache[idx].reachable = false;
      xSemaphoreGive(s_mutex);
    }
  }
}

void pollStart() {
  if (s_mutex) return;
  s_mutex = xSemaphoreCreateMutex();
  xTaskCreatePinnedToCore(pollTask, "printerPoll", 8192, nullptr, 1, nullptr, APP_CPU_NUM);
}

void pollSetPrinter(int printerIndex) {
  if (printerIndex == s_active) return;
  s_active  = printerIndex;
  s_pollNow = true;
}

void pollRequestNow() { s_pollNow = true; }

PrinterSlots pollGetSlots(int printerIndex) {
  PrinterSlots copy;
  if (printerIndex < 0 || printerIndex >= MAX_PRINTERS) return copy;
  if (s_mutex && xSemaphoreTake(s_mutex, pdMS_TO_TICKS(50)) == pdTRUE) {
    copy = s_cache[printerIndex];
    xSemaphoreGive(s_mutex);
  }
  return copy;
}
