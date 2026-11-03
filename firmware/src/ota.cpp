#include "ota.h"
#include "state.h"

#include <Update.h>
#include <esp_ota_ops.h>
#include <esp_partition.h>
#include <Preferences.h>
#include "mbedtls/sha256.h"

static const char *NVS_NS = "ota";

static String  s_last = "";          // "" | "success" | "rolled_back"
static bool    s_active = false;
static bool    s_ok = true;          // false, sobald ein Schreibfehler auftrat
static String  s_expectedSha;
static size_t  s_total = 0;
static size_t  s_written = 0;
static uint32_t s_targetAddr = 0;
static mbedtls_sha256_context s_sha;
static bool    s_shaInit = false;

const char *otaLastStatus() { return s_last.c_str(); }
bool otaInProgress() { return s_active; }

void otaInitBoot() {
  Preferences p;
  if (!p.begin(NVS_NS, false)) return;
  if (p.getBool("pending", false)) {
    uint32_t target = p.getUInt("target", 0);
    const esp_partition_t *running = esp_ota_get_running_partition();
    if (running && running->address == target) s_last = "success";
    else s_last = "rolled_back";
    p.putBool("pending", false);  // Merker verbrauchen
    Serial.printf("[OTA] letzter Versuch: %s (Ziel 0x%06X, laeuft 0x%06X)\n",
                  s_last.c_str(), (unsigned)target,
                  (unsigned)(running ? running->address : 0));
  }
  p.end();
}

void otaMarkValidIfPending() {
  const esp_partition_t *running = esp_ota_get_running_partition();
  esp_ota_img_states_t st;
  if (running && esp_ota_get_state_partition(running, &st) == ESP_OK &&
      st == ESP_OTA_IMG_PENDING_VERIFY) {
    esp_ota_mark_app_valid_cancel_rollback();
    Serial.println("[OTA] Firmware als gueltig markiert");
  }
}

static void cleanupSha() {
  if (s_shaInit) { mbedtls_sha256_free(&s_sha); s_shaInit = false; }
}

bool otaStreamBegin(size_t totalSize, const String &expectedSha256, String &err) {
  if (s_active) { err = "OTA bereits aktiv"; return false; }

  String sha = expectedSha256;
  sha.trim();
  sha.toLowerCase();
  if (sha.length() != 64) { err = "SHA-256 im Header fehlt oder ungueltig"; return false; }
  if (totalSize == 0) { err = "Groesse unbekannt (Content-Length fehlt)"; return false; }

  const esp_partition_t *next = esp_ota_get_next_update_partition(NULL);
  if (!next) { err = "keine freie OTA-Partition"; return false; }
  s_targetAddr = next->address;

  if (!Update.begin(totalSize, U_FLASH)) {
    err = String("Update.begin fehlgeschlagen: ") + Update.errorString();
    return false;
  }

  s_expectedSha = sha;
  s_total = totalSize;
  s_written = 0;
  s_ok = true;
  mbedtls_sha256_init(&s_sha);
  mbedtls_sha256_starts(&s_sha, 0);  // 0 = SHA-256 (nicht SHA-224)
  s_shaInit = true;

  s_active = true;
  g_otaFailed = false;
  g_otaPct = 0;
  g_otaActive = true;  // Display auf Fortschritt umschalten
  Serial.printf("[OTA] Start, %u Bytes -> Partition 0x%06X\n",
                (unsigned)totalSize, (unsigned)s_targetAddr);
  return true;
}

bool otaStreamWrite(const uint8_t *data, size_t len, String &err) {
  if (!s_active) { err = "OTA nicht aktiv"; return false; }
  if (Update.write(const_cast<uint8_t *>(data), len) != len) {
    err = String("Schreibfehler: ") + Update.errorString();
    s_ok = false;
    return false;
  }
  mbedtls_sha256_update(&s_sha, data, len);
  s_written += len;
  if (s_total) {
    int pct = (int)((uint64_t)s_written * 100 / s_total);
    g_otaPct = pct > 100 ? 100 : pct;
  }
  return true;
}

static String toHex(const uint8_t *b, size_t n) {
  static const char *h = "0123456789abcdef";
  String s;
  s.reserve(n * 2);
  for (size_t i = 0; i < n; i++) { s += h[b[i] >> 4]; s += h[b[i] & 0x0F]; }
  return s;
}

bool otaStreamFinish(String &err) {
  if (!s_active) { err = "OTA nicht aktiv"; return false; }

  uint8_t digest[32] = {0};
  if (s_shaInit) { mbedtls_sha256_finish(&s_sha, digest); cleanupSha(); }
  String got = toHex(digest, sizeof(digest));

  if (!s_ok) {
    Update.abort(); s_active = false; g_otaFailed = true;
    err = "Schreibfehler – alte Firmware bleibt";
    return false;
  }
  if (s_written != s_total) {
    Update.abort(); s_active = false; g_otaFailed = true;
    err = "unvollstaendig – alte Firmware bleibt";
    return false;
  }
  if (got != s_expectedSha) {
    Update.abort(); s_active = false; g_otaFailed = true;
    err = "SHA-256 stimmt nicht – alte Firmware bleibt";
    Serial.printf("[OTA] SHA-Mismatch: %s != %s\n", got.c_str(), s_expectedSha.c_str());
    return false;
  }

  if (!Update.end(true)) {  // true => Boot-Partition auf das neue Image setzen
    s_active = false; g_otaFailed = true;
    err = String("Abschluss fehlgeschlagen: ") + Update.errorString();
    return false;
  }

  // Merker fuer die Rollback-Erkennung beim naechsten Boot.
  Preferences p;
  if (p.begin(NVS_NS, false)) {
    p.putBool("pending", true);
    p.putUInt("target", s_targetAddr);
    p.end();
  }

  g_otaPct = 100;
  // s_active bleibt true (Display zeigt 100 %), bis der geplante Reboot greift.
  g_rebootAt = millis() + 1200;  // HTTP-Antwort vorher rausschicken lassen
  Serial.println("[OTA] erfolgreich geschrieben, Neustart in Kuerze");
  return true;
}

void otaStreamAbort() {
  if (!s_active) return;
  Update.abort();
  cleanupSha();
  s_active = false;
  g_otaFailed = true;
  Serial.println("[OTA] abgebrochen");
}
