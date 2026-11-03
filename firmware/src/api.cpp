#include "api.h"
#include "config.h"
#include "nfc.h"
#include "printer.h"
#include "wifi_mgr.h"
#include "state.h"
#include "version.h"
#include "i18n.h"
#include "ota.h"

#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <string>

static AsyncWebServer server(80);

// --- Hilfen ----------------------------------------------------------------

static bool authOk(AsyncWebServerRequest *req) {
  // Ohne gesetzten Schluessel ist die WLAN-API gesperrt (Einrichtung nur per USB).
  if (!g_config.api_key.length()) return false;
  if (!req->hasHeader("X-Api-Key")) return false;
  return req->getHeader("X-Api-Key")->value() == g_config.api_key;
}

static void sendJson(AsyncWebServerRequest *req, int code, JsonDocument &doc) {
  String out;
  serializeJson(doc, out);
  req->send(code, "application/json", out);
}

static void sendError(AsyncWebServerRequest *req, int code, const String &msg) {
  JsonDocument doc;
  doc["error"] = msg;
  sendJson(req, code, doc);
}

// Body-Sammler: haengt eingehende Chunks an ein std::string an req->_tempObject.
static void collectBody(AsyncWebServerRequest *req, uint8_t *data, size_t len,
                        size_t index, size_t total) {
  (void)total;
  if (index == 0 && req->_tempObject == nullptr) {
    req->_tempObject = new std::string();
  }
  auto *s = static_cast<std::string *>(req->_tempObject);
  if (s) s->append(reinterpret_cast<char *>(data), len);
}

static String takeBody(AsyncWebServerRequest *req) {
  if (req->_tempObject == nullptr) return String();
  auto *s = static_cast<std::string *>(req->_tempObject);
  String out = s->c_str();
  delete s;
  req->_tempObject = nullptr;
  return out;
}

// Fuellt ein JSON-Objekt mit dem aktuellen Job-Zustand.
static void jobToJson(JsonObject o, const NfcJob &job) {
  o["job_id"] = job.id;
  o["kind"]   = job.kind;
  o["state"]  = job.state;
  if (job.error.length()) o["error"] = job.error;

  if (job.hasResult) {
    JsonObject r = o["result"].to<JsonObject>();
    r["uid"]      = job.uid;
    r["uid_len"]  = job.uidLen;
    r["tag_type"] = job.tagType;
    r["empty"]    = job.empty;
    r["raw_json"] = job.rawJson;
    if (job.openspoolValid) {
      JsonObject os = r["openspool"].to<JsonObject>();
      job.openspool.toJson(os);
    }
  }
}

// --- Handler ---------------------------------------------------------------

static void handleStatus(AsyncWebServerRequest *req) {
  if (!authOk(req)) { sendError(req, 401, "unauthorized"); return; }
  JsonDocument doc;
  doc["name"]        = g_config.device_name;
  doc["version"]     = FW_VERSION;
  doc["api_version"] = FW_API_VERSION;   // Version der HTTP-API (App prueft Kompatibilitaet)
  doc["ip"]          = wifiIp();
  doc["rssi"]        = wifiRssi();
  doc["uptime_s"]    = (uint32_t)(millis() / 1000);
  doc["nfc_ok"]      = nfcIsOk();
  doc["busy"]        = nfcIsBusy();
  doc["slot"]        = g_currentSlot;
  doc["last_ota"]    = otaLastStatus();  // "" | "success" | "rolled_back"
  sendJson(req, 200, doc);
}

static void handleGetConfig(AsyncWebServerRequest *req) {
  if (!authOk(req)) { sendError(req, 401, "unauthorized"); return; }
  JsonDocument doc;
  configToJson(doc.to<JsonObject>());
  sendJson(req, 200, doc);
}

static void handlePutConfig(AsyncWebServerRequest *req) {
  if (!authOk(req)) { takeBody(req); sendError(req, 401, "unauthorized"); return; }
  String body = takeBody(req);
  JsonDocument doc;
  if (deserializeJson(doc, body) != DeserializationError::Ok || !doc.is<JsonObject>()) {
    sendError(req, 400, "ungueltiges JSON");
    return;
  }
  configApplyJson(doc.as<JsonObjectConst>());
  i18nSet(g_config.lang);
  JsonDocument out;
  configToJson(out.to<JsonObject>());
  sendJson(req, 200, out);
}

static void handleNfcRead(AsyncWebServerRequest *req) {
  if (!authOk(req)) { takeBody(req); sendError(req, 401, "unauthorized"); return; }
  String body = takeBody(req);
  uint32_t timeout = g_config.read_timeout_ms;
  if (body.length()) {
    JsonDocument doc;
    if (deserializeJson(doc, body) == DeserializationError::Ok && !doc["timeout_ms"].isNull()) {
      timeout = doc["timeout_ms"].as<unsigned long>();
    }
  }
  int id = nfcStartRead(timeout);
  if (id < 0) { sendError(req, 409, "busy"); return; }
  JsonDocument doc;
  doc["job_id"] = id;
  sendJson(req, 202, doc);
}

static void handleNfcWrite(AsyncWebServerRequest *req) {
  if (!authOk(req)) { takeBody(req); sendError(req, 401, "unauthorized"); return; }
  String body = takeBody(req);
  JsonDocument doc;
  if (deserializeJson(doc, body) != DeserializationError::Ok || doc["openspool"].isNull()) {
    sendError(req, 400, "Feld 'openspool' fehlt oder ungueltiges JSON");
    return;
  }
  uint32_t timeout = g_config.read_timeout_ms;
  if (!doc["timeout_ms"].isNull()) timeout = doc["timeout_ms"].as<unsigned long>();

  OpenSpool os;
  os.fromJson(doc["openspool"].as<JsonObjectConst>());

  int id = nfcStartWrite(os, timeout);
  if (id < 0) { sendError(req, 409, "busy"); return; }
  JsonDocument out;
  out["job_id"] = id;
  sendJson(req, 202, out);
}

static void handleNfcJob(AsyncWebServerRequest *req) {
  if (!authOk(req)) { sendError(req, 401, "unauthorized"); return; }
  NfcJob job = nfcGetJob();
  JsonDocument doc;
  jobToJson(doc.to<JsonObject>(), job);
  sendJson(req, 200, doc);
}

static void handleNfcCancel(AsyncWebServerRequest *req) {
  if (!authOk(req)) { takeBody(req); sendError(req, 401, "unauthorized"); return; }
  takeBody(req);
  nfcCancel();
  JsonDocument doc;
  doc["ok"] = true;
  sendJson(req, 200, doc);
}

static void handlePrinterSend(AsyncWebServerRequest *req) {
  if (!authOk(req)) { takeBody(req); sendError(req, 401, "unauthorized"); return; }
  String body = takeBody(req);
  JsonDocument doc;
  if (deserializeJson(doc, body) != DeserializationError::Ok || doc["openspool"].isNull()) {
    sendError(req, 400, "Feld 'openspool' fehlt oder ungueltiges JSON");
    return;
  }
  int channel = doc["channel"] | 0;
  String uid  = doc["uid"].isNull() ? String("") : doc["uid"].as<String>();

  // Zieldrucker: optional {host,port} oder {printer_index}, sonst primaerer Drucker.
  String host = g_config.printer_host;
  uint16_t port = g_config.printer_port;
  if (!doc["host"].isNull()) host = doc["host"].as<String>();
  if (!doc["port"].isNull()) port = (uint16_t)doc["port"].as<unsigned int>();
  if (!doc["printer_index"].isNull()) {
    size_t idx = doc["printer_index"].as<unsigned int>();
    if (idx < g_config.printers.size()) {
      host = g_config.printers[idx].host;
      port = g_config.printers[idx].port;
    }
  }

  OpenSpool os;
  os.fromJson(doc["openspool"].as<JsonObjectConst>());

  PrinterResult pr = printerSend(host, port, channel, os, uid);

  JsonDocument out;
  out["ok"]          = pr.ok;
  out["http_status"] = pr.http_status;
  out["response"]    = pr.response;
  sendJson(req, 200, out);
}

// --- OTA-Update (POST /api/ota) --------------------------------------------
// Rohstrom der ota.bin im Body, SHA-256 im Header X-FW-SHA256. Wir streamen die
// Daten direkt in die freie OTA-Partition (nichts im RAM puffern). Pro Request
// haengt ein kleiner Zustand an req->_tempObject.
struct OtaReqState {
  bool   begun  = false;
  bool   failed = false;
  int    code   = 500;
  String err;
};

static void handleOtaBody(AsyncWebServerRequest *req, uint8_t *data, size_t len,
                          size_t index, size_t total) {
  if (index == 0 && req->_tempObject == nullptr) {
    auto *st = new OtaReqState();
    req->_tempObject = st;

    if (!authOk(req)) { st->failed = true; st->code = 401; st->err = "unauthorized"; return; }

    String sha;
    if (req->hasHeader("X-FW-SHA256")) sha = req->getHeader("X-FW-SHA256")->value();
    size_t size = total ? total : req->contentLength();

    String err;
    if (!otaStreamBegin(size, sha, err)) {
      st->failed = true; st->code = 400; st->err = err;
      return;
    }
    st->begun = true;
  }

  auto *st = static_cast<OtaReqState *>(req->_tempObject);
  if (!st || st->failed || !st->begun) return;  // Rest des Bodys verwerfen

  String err;
  if (len && !otaStreamWrite(data, len, err)) {
    st->failed = true; st->code = 500; st->err = err;
    otaStreamAbort();
  }
}

static void handleOtaDone(AsyncWebServerRequest *req) {
  auto *st = static_cast<OtaReqState *>(req->_tempObject);
  if (!st) { sendError(req, 400, "kein Body"); return; }

  if (st->failed) {
    sendError(req, st->code, st->err);
  } else {
    String err;
    if (otaStreamFinish(err)) {
      JsonDocument doc;
      doc["ok"]        = true;
      doc["rebooting"] = true;
      doc["version"]   = FW_VERSION;
      sendJson(req, 200, doc);
    } else {
      sendError(req, 500, err);
    }
  }

  delete st;
  req->_tempObject = nullptr;
}

// --- Setup ------------------------------------------------------------------

void apiBegin() {
  server.on("/api/status", HTTP_GET, handleStatus);
  server.on("/api/config", HTTP_GET, handleGetConfig);

  server.on("/api/config", HTTP_PUT, handlePutConfig, nullptr, collectBody);

  server.on("/api/nfc/read",  HTTP_POST, handleNfcRead,   nullptr, collectBody);
  server.on("/api/nfc/write", HTTP_POST, handleNfcWrite,  nullptr, collectBody);
  server.on("/api/nfc/job",   HTTP_GET,  handleNfcJob);
  server.on("/api/nfc/cancel",HTTP_POST, handleNfcCancel, nullptr, collectBody);

  server.on("/api/printer/send", HTTP_POST, handlePrinterSend, nullptr, collectBody);

  // OTA-Firmware-Update: Roh-Body (ota.bin) ueber handleOtaBody streamen,
  // Abschluss/Antwort in handleOtaDone (laeuft nach vollstaendigem Body).
  server.on("/api/ota", HTTP_POST, handleOtaDone, nullptr, handleOtaBody);

  server.onNotFound([](AsyncWebServerRequest *req) {
    sendError(req, 404, "not found");
  });

  server.begin();
  Serial.println("[API] Webserver auf Port 80 gestartet");
}
