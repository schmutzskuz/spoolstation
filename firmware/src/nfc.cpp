#include "nfc.h"
#include "ndef.h"
#include <SPI.h>
#include <Adafruit_PN532.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

// --- Pins (CLAUDE.md), PN532 auf eigenem HSPI-Bus ---
static const int PIN_NFC_SCK  = 14;
static const int PIN_NFC_MISO = 27;
static const int PIN_NFC_MOSI = 13;
static const int PIN_NFC_SS   = 26;

static SPIClass       s_hspi(HSPI);
static Adafruit_PN532 s_nfc(PIN_NFC_SS, &s_hspi);

static bool s_ok = false;

// --- Job-/Kommando-Verwaltung ---
enum Cmd { CMD_NONE, CMD_READ, CMD_WRITE };

static SemaphoreHandle_t s_mutex = nullptr;
static NfcJob            s_job;             // geschuetzt durch s_mutex
static volatile Cmd      s_cmd = CMD_NONE;  // ausstehendes Kommando
static volatile bool     s_cancel = false;
static int               s_nextId = 1;

// Parameter des naechsten Jobs (unter Mutex gesetzt)
static uint32_t  s_paramTimeout = 10000;
static OpenSpool s_paramSpool;

static inline void lock()   { xSemaphoreTake(s_mutex, portMAX_DELAY); }
static inline void unlock() { xSemaphoreGive(s_mutex); }

// --- Hilfen ---------------------------------------------------------------

static String uidToHex(const uint8_t *uid, uint8_t len) {
  static const char *H = "0123456789ABCDEF";
  String s;
  s.reserve(len * 2);
  for (uint8_t i = 0; i < len; i++) {
    s += H[(uid[i] >> 4) & 0x0F];
    s += H[uid[i] & 0x0F];
  }
  return s;
}

// Wartet bis zu timeoutMs auf einen Tag. Fuellt uid/uidLen. Prueft zwischendurch
// auf Abbruch. Gibt true zurueck, wenn ein Tag erkannt wurde.
static bool waitForTag(uint8_t *uid, uint8_t *uidLen, uint32_t timeoutMs) {
  uint32_t start = millis();
  while (millis() - start < timeoutMs) {
    if (s_cancel) return false;
    // kurzer Timeout pro Versuch -> bleibt reaktionsfaehig fuer Abbruch
    if (s_nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, uidLen, 120)) {
      return true;
    }
  }
  return false;
}

// Liest den Nutzspeicher ab Seite 4 und extrahiert JSON.
// empty=true, wenn kein gueltiger NDEF-Record vorhanden ist.
static bool readTagJson(String &jsonOut, bool &empty) {
  uint8_t buf[320];
  size_t  have = 0;
  uint8_t page = 4;
  const uint8_t lastPage = 129;  // NTAG215 Nutzspeicher 4..129

  empty = false;
  while (page <= lastPage && have + 4 <= sizeof(buf)) {
    uint8_t tmp[4];
    if (!s_nfc.ntag2xx_ReadPage(page, tmp)) break;
    memcpy(buf + have, tmp, 4);
    have += 4;
    page++;

    String json;
    NdefParseResult r = ndefExtractJson(buf, have, json);
    if (r == NDEF_OK) { jsonOut = json; return true; }
    if (r == NDEF_EMPTY) { empty = true; jsonOut = ""; return true; }
    // NDEF_NEED_MORE -> weiterlesen
  }

  // Nichts Vollstaendiges gefunden -> als leer behandeln
  empty = true;
  jsonOut = "";
  return true;
}

// Schreibt die TLV-Bytes ab Seite 4. Sorgt bei blanken Tags fuer die
// Capability Container (Seite 3) eines NTAG215.
static bool writeTag(const std::vector<uint8_t> &tlv, String &err) {
  // Capability Container pruefen/setzen (nur wenn leer)
  uint8_t cc[4];
  if (s_nfc.ntag2xx_ReadPage(3, cc)) {
    if (cc[0] != 0xE1) {
      uint8_t ccNtag215[4] = {0xE1, 0x10, 0x3E, 0x00};  // Standard NTAG215
      s_nfc.ntag2xx_WritePage(3, ccNtag215);
    }
  }

  size_t  i = 0;
  uint8_t page = 4;
  const uint8_t lastPage = 129;
  while (i < tlv.size()) {
    if (page > lastPage) { err = "Tag zu klein fuer die Daten"; return false; }
    uint8_t p[4] = {0, 0, 0, 0};
    for (uint8_t j = 0; j < 4 && i + j < tlv.size(); j++) p[j] = tlv[i + j];
    if (!s_nfc.ntag2xx_WritePage(page, p)) {
      err = "Schreiben auf Seite " + String(page) + " fehlgeschlagen";
      return false;
    }
    page++;
    i += 4;
  }
  return true;
}

// --- Job-Ausfuehrung ------------------------------------------------------

static void doRead() {
  lock();
  uint32_t timeout = s_paramTimeout;
  unlock();

  uint8_t uid[7];
  uint8_t uidLen = 0;

  if (!waitForTag(uid, &uidLen, timeout)) {
    lock();
    s_job.state = s_cancel ? "cancelled" : "timeout";
    if (!s_cancel) s_job.error = "Kein Tag innerhalb der Zeit erkannt";
    unlock();
    return;
  }

  String json;
  bool   empty = false;
  readTagJson(json, empty);

  lock();
  s_job.hasResult = true;
  s_job.uid       = uidToHex(uid, uidLen);
  s_job.uidLen    = uidLen;
  s_job.tagType   = (uidLen == 7) ? "NTAG215" : "unbekannt";
  s_job.empty     = empty;
  s_job.rawJson   = json;
  s_job.openspoolValid = false;
  if (!empty && json.length()) {
    JsonDocument doc;
    if (deserializeJson(doc, json) == DeserializationError::Ok && doc.is<JsonObject>()) {
      s_job.openspool.fromJson(doc.as<JsonObjectConst>());
      s_job.openspoolValid = true;
    }
  }
  s_job.state = "done";
  unlock();
}

static void doWrite() {
  lock();
  uint32_t  timeout = s_paramTimeout;
  OpenSpool os      = s_paramSpool;
  unlock();

  String json = os.toCompactJson();
  std::vector<uint8_t> tlv = ndefBuildMimeJson(json);

  uint8_t uid[7];
  uint8_t uidLen = 0;
  if (!waitForTag(uid, &uidLen, timeout)) {
    lock();
    s_job.state = s_cancel ? "cancelled" : "timeout";
    if (!s_cancel) s_job.error = "Kein Tag zum Beschreiben erkannt";
    unlock();
    return;
  }

  String err;
  if (!writeTag(tlv, err)) {
    lock();
    s_job.state = "error";
    s_job.error = err;
    unlock();
    return;
  }

  // Verify: erneut lesen und JSON vergleichen
  String readback;
  bool   empty = false;
  readTagJson(readback, empty);

  lock();
  s_job.hasResult = true;
  s_job.uid       = uidToHex(uid, uidLen);
  s_job.uidLen    = uidLen;
  s_job.tagType   = (uidLen == 7) ? "NTAG215" : "unbekannt";
  s_job.empty     = false;
  s_job.rawJson   = readback;
  s_job.openspool = os;
  s_job.openspoolValid = true;

  if (empty || readback != json) {
    s_job.state = "error";
    s_job.error = "Verify fehlgeschlagen (Rueckgelesenes stimmt nicht)";
  } else {
    s_job.state = "done";
  }
  unlock();
}

// --- Task -----------------------------------------------------------------

static void nfcTask(void *arg) {
  (void)arg;
  for (;;) {
    Cmd cmd = s_cmd;
    if (cmd == CMD_READ) {
      s_cmd = CMD_NONE;
      doRead();
      s_cancel = false;
    } else if (cmd == CMD_WRITE) {
      s_cmd = CMD_NONE;
      doWrite();
      s_cancel = false;
    }
    vTaskDelay(pdMS_TO_TICKS(20));
  }
}

// --- Oeffentliche API ------------------------------------------------------

bool nfcInit() {
  s_mutex = xSemaphoreCreateMutex();

  s_hspi.begin(PIN_NFC_SCK, PIN_NFC_MISO, PIN_NFC_MOSI, PIN_NFC_SS);
  s_nfc.begin();
  uint32_t ver = s_nfc.getFirmwareVersion();
  if (ver) {
    s_ok = true;
    uint8_t chip = (ver >> 24) & 0xFF;
    uint8_t vHi  = (ver >> 16) & 0xFF;
    uint8_t vLo  = (ver >> 8)  & 0xFF;
    Serial.printf("[PN532] gefunden: Chip PN5%02X, Firmware %d.%d\n", chip, vHi, vLo);
    s_nfc.SAMConfig();
    s_nfc.setPassiveActivationRetries(0x02);
  } else {
    s_ok = false;
    Serial.println("[PN532] NICHT GEFUNDEN - DIP-Schalter (SPI) und Kabel pruefen");
  }
  return s_ok;
}

void nfcStartTask() {
  if (!s_ok) return;
  xTaskCreatePinnedToCore(nfcTask, "nfcTask", 8192, nullptr, 1, nullptr, 1);
}

bool nfcIsOk() { return s_ok; }

bool nfcIsBusy() {
  lock();
  bool busy = (s_job.state == "waiting");
  unlock();
  return busy;
}

int nfcStartRead(uint32_t timeoutMs) {
  if (!s_ok) return -1;
  lock();
  if (s_job.state == "waiting") { unlock(); return -1; }
  int id = s_nextId++;
  s_job = NfcJob();
  s_job.id    = id;
  s_job.kind  = "read";
  s_job.state = "waiting";
  s_paramTimeout = timeoutMs;
  s_cancel = false;
  unlock();
  s_cmd = CMD_READ;
  return id;
}

int nfcStartWrite(const OpenSpool &os, uint32_t timeoutMs) {
  if (!s_ok) return -1;
  lock();
  if (s_job.state == "waiting") { unlock(); return -1; }
  int id = s_nextId++;
  s_job = NfcJob();
  s_job.id    = id;
  s_job.kind  = "write";
  s_job.state = "waiting";
  s_paramTimeout = timeoutMs;
  s_paramSpool   = os;
  s_cancel = false;
  unlock();
  s_cmd = CMD_WRITE;
  return id;
}

void nfcCancel() { s_cancel = true; }

NfcJob nfcGetJob() {
  lock();
  NfcJob copy = s_job;
  unlock();
  return copy;
}
