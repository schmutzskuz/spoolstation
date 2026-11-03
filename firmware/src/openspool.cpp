#include "openspool.h"

// Liest einen Wert als String, egal ob er im JSON als String oder Zahl steht.
static String asStr(JsonVariantConst v) {
  if (v.isNull()) return String();
  return v.as<String>();
}

// '#' am Anfang entfernen, Rest unveraendert lassen.
static String stripHash(const String &s) {
  if (s.length() && s[0] == '#') return s.substring(1);
  return s;
}

void OpenSpool::fromJson(JsonObjectConst obj) {
  protocol     = asStr(obj["protocol"]);
  version      = asStr(obj["version"]);
  brand        = asStr(obj["brand"]);
  type         = asStr(obj["type"]);
  subtype      = asStr(obj["subtype"]);
  color_hex    = stripHash(asStr(obj["color_hex"]));
  alpha        = asStr(obj["alpha"]);
  min_temp     = asStr(obj["min_temp"]);
  max_temp     = asStr(obj["max_temp"]);
  bed_min_temp = asStr(obj["bed_min_temp"]);
  bed_max_temp = asStr(obj["bed_max_temp"]);
  spool_id     = asStr(obj["spool_id"]);
}

void OpenSpool::toJson(JsonObject obj) const {
  obj["protocol"] = protocol.length() ? protocol : String("openspool");
  obj["version"]  = version.length() ? version : String("1.0");
  if (brand.length())        obj["brand"]        = brand;
  if (type.length())         obj["type"]         = type;
  if (subtype.length())      obj["subtype"]      = subtype;
  if (color_hex.length())    obj["color_hex"]    = stripHash(color_hex);
  if (alpha.length())        obj["alpha"]        = alpha;
  if (min_temp.length())     obj["min_temp"]     = min_temp;
  if (max_temp.length())     obj["max_temp"]     = max_temp;
  if (bed_min_temp.length()) obj["bed_min_temp"] = bed_min_temp;
  if (bed_max_temp.length()) obj["bed_max_temp"] = bed_max_temp;
  if (spool_id.length())     obj["spool_id"]     = spool_id;
}

String OpenSpool::toCompactJson() const {
  JsonDocument doc;
  JsonObject o = doc.to<JsonObject>();
  toJson(o);
  String out;
  serializeJson(doc, out);
  return out;
}
