#include "config.h"
#include <Preferences.h>

Config g_config;

static Preferences prefs;
static const char *NS = "spoolstation";

static String printersToJson() {
  JsonDocument doc;
  JsonArray arr = doc.to<JsonArray>();
  for (const auto &p : g_config.printers) {
    JsonObject o = arr.add<JsonObject>();
    o["name"] = p.name;
    o["host"] = p.host;
    o["port"] = p.port;
  }
  String s;
  serializeJson(doc, s);
  return s;
}

static void printersFromJson(const String &s) {
  JsonDocument doc;
  if (deserializeJson(doc, s) != DeserializationError::Ok) return;
  JsonArrayConst arr = doc.as<JsonArrayConst>();
  if (arr.isNull()) return;
  g_config.printers.clear();
  for (JsonObjectConst o : arr) {
    if (g_config.printers.size() >= MAX_PRINTERS) break;
    PrinterDef p;
    p.name = o["name"].as<String>();
    p.host = o["host"].as<String>();
    p.port = (uint16_t)(o["port"] | 7125);
    if (p.host.length()) g_config.printers.push_back(p);
  }
}

// Sorgt dafuer, dass printer_host/port mit printers[0] uebereinstimmen.
// Legt KEINEN Drucker aus leeren Werten an (unkonfiguriert -> keine Drucker).
static void normalizePrinters() {
  if (!g_config.printers.empty()) {
    g_config.printer_host = g_config.printers[0].host;
    g_config.printer_port = g_config.printers[0].port;
  } else if (g_config.printer_host.length()) {
    PrinterDef p;
    p.name = "Drucker";
    p.host = g_config.printer_host;
    p.port = g_config.printer_port;
    g_config.printers.push_back(p);
  }
}

void configLoad() {
  prefs.begin(NS, false);
  if (prefs.isKey("wifi_ssid"))    g_config.wifi_ssid       = prefs.getString("wifi_ssid", g_config.wifi_ssid);
  if (prefs.isKey("wifi_pass"))    g_config.wifi_pass       = prefs.getString("wifi_pass", g_config.wifi_pass);
  if (prefs.isKey("api_key"))      g_config.api_key         = prefs.getString("api_key", g_config.api_key);
  if (prefs.isKey("printer_host")) g_config.printer_host    = prefs.getString("printer_host", g_config.printer_host);
  if (prefs.isKey("printer_port")) g_config.printer_port    = prefs.getUShort("printer_port", g_config.printer_port);
  if (prefs.isKey("spoolman_url")) g_config.spoolman_url    = prefs.getString("spoolman_url", g_config.spoolman_url);
  if (prefs.isKey("device_name"))  g_config.device_name     = prefs.getString("device_name", g_config.device_name);
  if (prefs.isKey("enc_reverse"))  g_config.enc_reverse     = prefs.getBool("enc_reverse", g_config.enc_reverse);
  if (prefs.isKey("read_timeout")) g_config.read_timeout_ms = prefs.getULong("read_timeout", g_config.read_timeout_ms);
  if (prefs.isKey("lang"))         g_config.lang = prefs.getString("lang", g_config.lang);
  if (prefs.isKey("printers"))     printersFromJson(prefs.getString("printers", "[]"));
  prefs.end();
  normalizePrinters();
}

void configSave() {
  normalizePrinters();
  prefs.begin(NS, false);
  prefs.putString("wifi_ssid",    g_config.wifi_ssid);
  prefs.putString("wifi_pass",    g_config.wifi_pass);
  prefs.putString("api_key",      g_config.api_key);
  prefs.putString("printer_host", g_config.printer_host);
  prefs.putUShort("printer_port", g_config.printer_port);
  prefs.putString("spoolman_url", g_config.spoolman_url);
  prefs.putString("device_name",  g_config.device_name);
  prefs.putBool("enc_reverse",    g_config.enc_reverse);
  prefs.putULong("read_timeout",  g_config.read_timeout_ms);
  prefs.putString("lang",         g_config.lang);
  prefs.putString("printers",     printersToJson());
  prefs.end();
}

bool configIsConfigured() {
  return g_config.wifi_ssid.length() > 0;
}

void configFactoryReset() {
  prefs.begin(NS, false);
  prefs.clear();
  prefs.end();
  g_config = Config();  // Defaults wiederherstellen
}

bool configApplyJson(JsonObjectConst obj) {
  bool changed = false;

  if (!obj["printer_host"].isNull()) { g_config.printer_host = obj["printer_host"].as<String>(); changed = true; }
  if (!obj["printer_port"].isNull()) { g_config.printer_port = (uint16_t)obj["printer_port"].as<unsigned int>(); changed = true; }
  if (!obj["spoolman_url"].isNull()) { g_config.spoolman_url = obj["spoolman_url"].as<String>(); changed = true; }
  if (!obj["device_name"].isNull())  { g_config.device_name = obj["device_name"].as<String>(); changed = true; }
  if (!obj["enc_reverse"].isNull())  { g_config.enc_reverse = obj["enc_reverse"].as<bool>(); changed = true; }
  if (!obj["read_timeout_ms"].isNull()) { g_config.read_timeout_ms = obj["read_timeout_ms"].as<unsigned long>(); changed = true; }
  if (!obj["lang"].isNull()) {
    String l = obj["lang"].as<String>();
    if (l == "de" || l == "en" || l == "es") { g_config.lang = l; changed = true; }
  }

  JsonArrayConst arr = obj["printers"].as<JsonArrayConst>();
  if (!arr.isNull()) {
    g_config.printers.clear();
    for (JsonObjectConst o : arr) {
      if (g_config.printers.size() >= MAX_PRINTERS) break;
      PrinterDef p;
      p.name = o["name"].as<String>();
      p.host = o["host"].as<String>();
      p.port = (uint16_t)(o["port"] | 7125);
      if (p.host.length()) g_config.printers.push_back(p);
    }
    changed = true;
  }

  if (changed) {
    normalizePrinters();
    configSave();
  }
  return changed;
}

void configToJson(JsonObject obj) {
  obj["printer_host"]    = g_config.printer_host;
  obj["printer_port"]    = g_config.printer_port;
  obj["spoolman_url"]    = g_config.spoolman_url;
  obj["device_name"]     = g_config.device_name;
  obj["enc_reverse"]     = g_config.enc_reverse;
  obj["read_timeout_ms"] = g_config.read_timeout_ms;
  obj["lang"]            = g_config.lang;
  JsonArray arr = obj["printers"].to<JsonArray>();
  for (const auto &p : g_config.printers) {
    JsonObject o = arr.add<JsonObject>();
    o["name"] = p.name;
    o["host"] = p.host;
    o["port"] = p.port;
  }
}
