#include "i18n.h"

static int s_lang = 0;  // 0=de, 1=en, 2=es

struct Entry {
  const char *key;
  const char *de;
  const char *en;
  const char *es;
};

// UTF-8. DejaVu-Schrift deckt Umlaute, á é í ó ú ü ñ ¿ ¡ ab.
static const Entry TABLE[] = {
  {"load_spool",   "Spule auflegen",   "Load spool",       "Coloca la bobina"},
  {"put_tag",      "Tag auflegen",     "Place tag",        "Coloca la etiqueta"},
  {"sending",      "Sende an Drucker", "Sending to printer","Enviando a impresora"},
  {"pc",           "PC",               "PC",               "PC"},
  {"empty_dash",   "— leer —",         "— empty —",        "— vacía —"},
  {"slot",         "Slot",             "Slot",             "Hueco"},
  {"info",         "Info",             "Info",             "Info"},
  {"no_wifi",      "kein WLAN",        "no Wi-Fi",         "sin Wi-Fi"},
  {"signal",       "Signal",           "Signal",           "Señal"},
  {"sig_good",     "gut",              "good",             "buena"},
  {"sig_mid",      "mittel",           "medium",           "media"},
  {"sig_low",      "schwach",          "weak",             "débil"},
  {"firmware",     "Firmware",         "Firmware",         "Firmware"},
  {"press_back",   "Drücken = zurück", "Press = back",     "Pulsar = atrás"},
  {"tag_empty",    "Tag leer",         "Tag empty",        "Etiqueta vacía"},
  {"no_data",      "Keine Daten",      "No data",          "Sin datos"},
  {"tag_invalid",  "Ungültiger Tag",   "Invalid tag",      "Etiqueta no válida"},
  {"no_openspool", "Kein OpenSpool",   "No OpenSpool",     "Sin OpenSpool"},
  {"printer_err",  "Drucker-Fehler",   "Printer error",    "Error de impresora"},
  {"sent",         "Gesendet",         "Sent",             "Enviado"},
  {"to",           "an",               "to",               "a"},
  {"no_tag",       "Kein Tag",         "No tag",           "Sin etiqueta"},
  {"timed_out",    "Zeit abgelaufen",  "Timed out",        "Tiempo agotado"},
  {"error",        "Fehler",           "Error",            "Error"},
  {"cancelled",    "Abgebrochen",      "Cancelled",        "Cancelado"},
  {"loaded",       "geladen",          "loaded",           "cargado"},
  {"printer_off",  "Drucker weg",      "Printer offline",  "Impresora no disp."},
  {"tag_written",  "Tag geschrieben",  "Tag written",      "Etiqueta escrita"},
  {"tag_read",     "Tag gelesen",      "Tag read",         "Etiqueta leída"},
  {"setup_title",  "Einrichtung",      "Setup",            "Configuración"},
  {"setup_usb",    "Mit PC verbinden", "Connect to PC",    "Conecta al PC"},
  {"setup_usb2",   "per USB",          "via USB",          "por USB"},
  {"setup_hint",   "App öffnen und",   "Open the app and", "Abre la app y"},
  {"setup_hint2",  "Station einrichten","set up station",  "configura estación"},
  {"reset_title",  "Werksreset?",      "Factory reset?",   "¿Restablecer?"},
  {"reset_hint",   "Halten = löschen", "Hold = erase",     "Mantén = borrar"},
  {"ota_title",    "Update wird installiert", "Installing update", "Instalando actualización"},
  {"ota_keep",     "Nicht ausschalten","Do not power off", "No apagar"},
  {"ota_failed",   "Update fehlgeschlagen", "Update failed", "Error al actualizar"},
};
static const size_t COUNT = sizeof(TABLE) / sizeof(TABLE[0]);

void i18nSet(const String &code) {
  if (code == "en") s_lang = 1;
  else if (code == "es") s_lang = 2;
  else s_lang = 0;
}

String i18nCode() {
  return s_lang == 1 ? "en" : s_lang == 2 ? "es" : "de";
}

const char *tr(const char *key) {
  for (size_t i = 0; i < COUNT; i++) {
    if (strcmp(TABLE[i].key, key) == 0) {
      return s_lang == 1 ? TABLE[i].en : s_lang == 2 ? TABLE[i].es : TABLE[i].de;
    }
  }
  return key;  // unbekannt -> Schluessel selbst
}
