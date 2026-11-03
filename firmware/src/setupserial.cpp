#include "setupserial.h"
#include "config.h"
#include "version.h"
#include "i18n.h"
#include <WiFi.h>
#include <ArduinoJson.h>
#include <vector>
#include <algorithm>

static String s_buf;

// Eine @@SS-markierte JSON-Antwort senden.
static void reply(JsonDocument &doc) {
  String out;
  serializeJson(doc, out);
  Serial.print("@@SS ");
  Serial.println(out);
}

static void replyErr(const String &cmd, const String &msg) {
  JsonDocument d;
  d["ok"] = false;
  d["cmd"] = cmd;
  d["error"] = msg;
  reply(d);
}

static void fillInfo(JsonObject o) {
  o["device"]      = "SpoolStation";
  o["fw"]          = FW_VERSION;
  o["api_version"] = SETUP_API_VERSION;
  o["configured"]  = configIsConfigured();
  o["mac"]         = WiFi.macAddress();
  o["has_key"]     = g_config.api_key.length() > 0;
  o["device_name"] = g_config.device_name;
  o["lang"]        = g_config.lang;
}

static void cmdHello(const String &cmd) {
  JsonDocument d;
  d["ok"] = true;
  d["cmd"] = cmd;
  fillInfo(d["info"].to<JsonObject>());
  reply(d);
}

static void cmdScanWifi(const String &cmd) {
  // Radio sicher in den STA-Modus bringen und kurz warten (sonst oft 0 Treffer).
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(false, false);
  delay(150);

  int n = WiFi.scanNetworks(false /*sync*/, false /*keine versteckten*/);
  if (n < 0) { delay(400); n = WiFi.scanNetworks(false, false); }  // ein Nachversuch

  struct Net { String ssid; int32_t rssi; bool enc; };
  std::vector<Net> nets;
  for (int i = 0; i < n; i++) {
    String ssid = WiFi.SSID(i);
    if (!ssid.length()) continue;  // versteckt -> weglassen
    int32_t rssi = WiFi.RSSI(i);
    bool enc = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
    bool dup = false;
    for (auto &e : nets) if (e.ssid == ssid) { dup = true; if (rssi > e.rssi) { e.rssi = rssi; e.enc = enc; } break; }
    if (!dup) nets.push_back({ ssid, rssi, enc });
  }
  std::sort(nets.begin(), nets.end(), [](const Net &a, const Net &b) { return a.rssi > b.rssi; });

  JsonDocument d;
  d["ok"] = true;
  d["cmd"] = cmd;
  JsonArray arr = d["networks"].to<JsonArray>();
  for (size_t i = 0; i < nets.size() && i < 20; i++) {
    JsonObject o = arr.add<JsonObject>();
    o["ssid"] = nets[i].ssid;
    o["rssi"] = nets[i].rssi;
    o["enc"]  = nets[i].enc;
  }
  WiFi.scanDelete();
  reply(d);
}

static void cmdSetWifi(const String &cmd, JsonObjectConst obj) {
  String ssid = obj["ssid"].as<String>();
  String pass = obj["password"].as<String>();
  if (!ssid.length()) { replyErr(cmd, "ssid fehlt"); return; }

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), pass.c_str());
  uint32_t start = millis();
  wl_status_t st = WL_IDLE_STATUS;
  while (millis() - start < 15000) {
    st = WiFi.status();
    if (st == WL_CONNECTED || st == WL_CONNECT_FAILED || st == WL_NO_SSID_AVAIL) break;
    delay(200);
  }

  JsonDocument d;
  d["cmd"] = cmd;
  if (WiFi.status() == WL_CONNECTED) {
    // Erfolg -> dauerhaft speichern
    g_config.wifi_ssid = ssid;
    g_config.wifi_pass = pass;
    configSave();
    d["ok"] = true;
    d["ip"] = WiFi.localIP().toString();
    d["rssi"] = WiFi.RSSI();
  } else {
    d["ok"] = false;
    const char *reason = "unbekannt";
    switch (WiFi.status()) {
      case WL_NO_SSID_AVAIL: reason = "WLAN nicht gefunden"; break;
      case WL_CONNECT_FAILED: reason = "falsches Passwort?"; break;
      case WL_DISCONNECTED:  reason = "keine Verbindung"; break;
      default: break;
    }
    d["error"] = reason;
    WiFi.disconnect();
  }
  reply(d);
}

static void cmdSetKey(const String &cmd, JsonObjectConst obj) {
  String key = obj["key"].as<String>();
  if (key.length() < 8) { replyErr(cmd, "key zu kurz"); return; }
  g_config.api_key = key;
  configSave();
  JsonDocument d; d["ok"] = true; d["cmd"] = cmd; reply(d);
}

static void cmdSetConfig(const String &cmd, JsonObjectConst obj) {
  // Nur Nicht-Geheimnisse (printers, spoolman_url, lang, device_name, …).
  bool changed = configApplyJson(obj);
  JsonDocument d;
  d["ok"] = true;
  d["cmd"] = cmd;
  d["changed"] = changed;
  configToJson(d["config"].to<JsonObject>());
  reply(d);
}

static void cmdGetInfo(const String &cmd) {
  JsonDocument d;
  d["ok"] = true;
  d["cmd"] = cmd;
  fillInfo(d["info"].to<JsonObject>());
  if (WiFi.status() == WL_CONNECTED) d["ip"] = WiFi.localIP().toString();
  configToJson(d["config"].to<JsonObject>());
  reply(d);
}

void setupSerialAnnounce() {
  JsonDocument d;
  JsonObject root = d.to<JsonObject>();
  root["ready"] = true;
  fillInfo(root);
  reply(d);
}

static void handleLine(const String &line) {
  String t = line; t.trim();
  if (!t.length()) return;
  JsonDocument doc;
  if (deserializeJson(doc, t) != DeserializationError::Ok) { replyErr("?", "ungueltiges JSON"); return; }
  JsonObjectConst obj = doc.as<JsonObjectConst>();
  String cmd = obj["cmd"].as<String>();
  if (!cmd.length()) { replyErr("?", "cmd fehlt"); return; }

  if      (cmd == "hello")         cmdHello(cmd);
  else if (cmd == "scan_wifi")     cmdScanWifi(cmd);
  else if (cmd == "set_wifi")      cmdSetWifi(cmd, obj);
  else if (cmd == "set_key")       cmdSetKey(cmd, obj);
  else if (cmd == "set_config")    cmdSetConfig(cmd, obj);
  else if (cmd == "get_info")      cmdGetInfo(cmd);
  else if (cmd == "reboot")        { JsonDocument d; d["ok"]=true; d["cmd"]=cmd; reply(d); delay(200); ESP.restart(); }
  else if (cmd == "factory_reset") { configFactoryReset(); JsonDocument d; d["ok"]=true; d["cmd"]=cmd; reply(d); delay(200); ESP.restart(); }
  else                             replyErr(cmd, "unbekannter Befehl");
}

void setupSerialLoop() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n') { handleLine(s_buf); s_buf = ""; }
    else if (c != '\r') { if (s_buf.length() < 2048) s_buf += c; }
  }
}
