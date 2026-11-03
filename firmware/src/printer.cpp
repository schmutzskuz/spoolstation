#include "printer.h"
#include "config.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <math.h>

// "NONE"/leer gilt als nicht vorhanden; sonst der getrimmte String.
static String cleanStr(const char *v) {
  if (!v) return String();
  String s(v);
  s.trim();
  if (s.equalsIgnoreCase("NONE")) return String();
  return s;
}

// Farbe als Grossbuchstaben-Hex ohne '#' ("#RRGGBB"/"RRGGBB" -> "RRGGBB"), sonst leer.
static String normHex(const char *v) {
  String s = cleanStr(v);
  if (!s.length()) return String();
  if (s[0] == '#') s = s.substring(1);
  if (s.length() != 6) return String();
  for (size_t i = 0; i < 6; i++) if (!isxdigit((int)s[i])) return String();
  s.toUpperCase();
  return s;
}

// Restgewicht einer Spule aus Spoolman (nur remaining_weight per Filter).
static long spoolmanRemaining(const String &spoolmanUrl, long id) {
  if (!spoolmanUrl.length() || id <= 0) return -1;
  String url = spoolmanUrl + "/api/v1/spool/" + String(id);
  WiFiClient client;
  HTTPClient http;
  http.setConnectTimeout(3000);
  http.setTimeout(4000);
  if (!http.begin(client, url)) return -1;
  int code = http.GET();
  long rem = -1;
  if (code == 200) {
    JsonDocument filter;
    filter["remaining_weight"] = true;
    JsonDocument doc;
    DeserializationError e = deserializeJson(doc, http.getStream(), DeserializationOption::Filter(filter));
    if (!e && !doc["remaining_weight"].isNull()) rem = (long)lroundf(doc["remaining_weight"].as<float>());
  }
  http.end();
  return rem;
}

PrinterSlots printerQuerySlots(const String &host, uint16_t port, const String &spoolmanUrl) {
  PrinterSlots out;
  if (!WiFi.isConnected()) return out;

  String url = "http://" + host + ":" + String(port) +
               "/printer/objects/query?AFC_lane%20E0&AFC_lane%20E1&AFC_lane%20E2&AFC_lane%20E3";
  WiFiClient client;
  HTTPClient http;
  http.setConnectTimeout(3000);
  http.setTimeout(5000);
  if (!http.begin(client, url)) return out;
  int code = http.GET();
  if (code != 200) { http.end(); return out; }

  // Filter: nur die benoetigten Felder jeder Lane -> wenig RAM.
  JsonDocument filter;
  JsonObject fstatus = filter["result"]["status"].to<JsonObject>();
  for (int i = 0; i < 4; i++) {
    JsonObject lane = fstatus[String("AFC_lane E") + i].to<JsonObject>();
    lane["lane"]          = true;
    lane["filament_name"] = true;
    lane["material"]      = true;
    lane["color"]         = true;
    lane["spool_id"]      = true;
  }
  JsonDocument doc;
  DeserializationError e = deserializeJson(doc, http.getStream(), DeserializationOption::Filter(filter));
  http.end();
  if (e) return out;

  out.reachable = true;
  JsonObjectConst status = doc["result"]["status"];
  for (int i = 0; i < 4; i++) {
    JsonObjectConst lane = status[String("AFC_lane E") + i];
    if (lane.isNull()) continue;
    int idx = lane["lane"] | i;  // Zuordnung ueber das Feld 'lane', nicht die Reihenfolge
    if (idx < 0 || idx > 3) idx = i;
    SlotInfo &s = out.slots[idx];
    s.name     = cleanStr(lane["filament_name"]);
    s.material = cleanStr(lane["material"]);
    s.colorHex = normHex(lane["color"]);
    long sid   = lane["spool_id"] | 0;
    s.spoolId  = sid > 0 ? sid : 0;
    s.present  = s.name.length() || s.material.length() || s.colorHex.length() || s.spoolId > 0;
  }

  // Restgewicht fuer belegte Slots nachladen.
  for (int i = 0; i < 4; i++)
    if (out.slots[i].spoolId > 0) out.slots[i].remaining = spoolmanRemaining(spoolmanUrl, out.slots[i].spoolId);

  return out;
}

// Wandelt einen Hex-String ("04A1B2...") in ein Byte-Array um.
static void hexToBytes(const String &hex, JsonArray out) {
  for (size_t i = 0; i + 1 < (size_t)hex.length(); i += 2) {
    char b[3] = { hex[i], hex[i + 1], 0 };
    out.add((uint8_t)strtol(b, nullptr, 16));
  }
}

// Hilfsfunktion: Integer aus String, leer -> kein Wert (Rueckgabe false).
static bool toInt(const String &s, long &out) {
  if (!s.length()) return false;
  char *end = nullptr;
  long v = strtol(s.c_str(), &end, 10);
  if (end == s.c_str()) return false;
  out = v;
  return true;
}

static PrinterResult httpPostJson(const String &url, const String &body) {
  PrinterResult res;
  WiFiClient client;
  HTTPClient http;
  http.setConnectTimeout(3000);
  http.setTimeout(4000);
  if (!http.begin(client, url)) {
    res.ok = false;
    res.response = "HTTP begin fehlgeschlagen fuer " + url;
    return res;
  }
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  res.http_status = code;
  res.response    = http.getString();
  res.ok          = (code >= 200 && code < 300);
  http.end();
  return res;
}

PrinterResult printerSend(const String &host, uint16_t port, int channel,
                          const OpenSpool &os, const String &uidHex) {
  PrinterResult result;

  if (!WiFi.isConnected()) {
    result.ok = false;
    result.response = "Drucker nicht erreichbar (kein WLAN)";
    return result;
  }

  const String base = "http://" + host + ":" + String(port);

  // --- Schritt 1: filament_detect/set ---
  JsonDocument doc;
  JsonObject root = doc.to<JsonObject>();
  root["channel"] = channel;
  JsonObject info = root["info"].to<JsonObject>();

  if (os.brand.length())   info["VENDOR"]    = os.brand;
  if (os.type.length())    info["MAIN_TYPE"] = os.type;
  if (os.subtype.length()) info["SUB_TYPE"]  = os.subtype;
  if (os.color_hex.length()) {
    info["RGB_1"] = (long)strtol(os.color_hex.c_str(), nullptr, 16);
  }
  if (os.alpha.length()) {
    info["ALPHA"] = (long)strtol(os.alpha.c_str(), nullptr, 16);  // Tag speichert Hex ("FF")
  }
  long v;
  if (toInt(os.min_temp, v))     info["HOTEND_MIN_TEMP"] = v;
  if (toInt(os.max_temp, v))     info["HOTEND_MAX_TEMP"] = v;
  if (toInt(os.bed_min_temp, v)) info["BED_TEMP"]        = v;

  if (uidHex.length()) {
    JsonArray cu = info["CARD_UID"].to<JsonArray>();
    hexToBytes(uidHex, cu);
  }

  String body;
  serializeJson(doc, body);

  PrinterResult step1 = httpPostJson(base + "/printer/filament_detect/set", body);

  result.http_status = step1.http_status;
  result.response    = "filament_detect: " + step1.response;
  result.ok          = step1.ok;

  if (!step1.ok) return result;

  // --- Schritt 2: SET_SPOOL_ID (nur wenn eine echte spool_id vorhanden ist) ---
  long spoolId;
  if (toInt(os.spool_id, spoolId) && spoolId > 0) {
    String script = "SET_SPOOL_ID CHANNEL=" + String(channel) + " SPOOL_ID=" + String(spoolId);
    JsonDocument gdoc;
    gdoc["script"] = script;
    String gbody;
    serializeJson(gdoc, gbody);

    PrinterResult step2 = httpPostJson(base + "/printer/gcode/script", gbody);
    result.http_status = step2.http_status;
    result.response += " | SET_SPOOL_ID: " + step2.response;
    result.ok = step2.ok;
  }

  return result;
}
