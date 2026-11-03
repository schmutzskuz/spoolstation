#include "ndef.h"

static const char *MIME_TYPE = "application/json";

std::vector<uint8_t> ndefBuildMimeJson(const String &json) {
  std::vector<uint8_t> rec;
  const uint8_t typeLen = (uint8_t)strlen(MIME_TYPE);
  const uint8_t payLen  = (uint8_t)json.length();  // Short Record: 1 Byte

  // NDEF-Record-Header: MB=1, ME=1, SR=1, TNF=2 (MIME) -> 0xD2
  rec.push_back(0xD2);
  rec.push_back(typeLen);
  rec.push_back(payLen);
  for (uint8_t i = 0; i < typeLen; i++) rec.push_back((uint8_t)MIME_TYPE[i]);
  for (size_t i = 0; i < json.length(); i++) rec.push_back((uint8_t)json[i]);

  // In TLV verpacken: 0x03, Laenge, Record..., 0xFE (Terminator)
  std::vector<uint8_t> tlv;
  tlv.push_back(0x03);
  tlv.push_back((uint8_t)rec.size());  // Record < 255 Byte -> 1-Byte-Laenge
  tlv.insert(tlv.end(), rec.begin(), rec.end());
  tlv.push_back(0xFE);
  return tlv;
}

// Extrahiert den JSON-String aus einem einzelnen NDEF-Record.
static bool parseRecord(const uint8_t *r, size_t len, String &out) {
  if (len < 3) return false;

  uint8_t typeLen = r[1];
  uint8_t payLen  = r[2];  // Short Record
  if ((size_t)(3 + typeLen + payLen) > len) return false;

  const uint8_t *type = r + 3;
  const uint8_t *pay  = r + 3 + typeLen;

  out = "";
  if (typeLen == 1 && type[0] == 'T') {
    // Text-Record: Statusbyte + Sprachcode vor dem eigentlichen Text
    if (payLen < 1) return false;
    uint8_t status  = pay[0];
    uint8_t langLen = status & 0x3F;
    if ((size_t)(1 + langLen) > payLen) return false;
    for (size_t i = 1 + langLen; i < payLen; i++) out += (char)pay[i];
    return true;
  }

  // Alles andere (insb. MIME application/json): Payload ist direkt der Text
  out.reserve(payLen);
  for (size_t i = 0; i < payLen; i++) out += (char)pay[i];
  return true;
}

NdefParseResult ndefExtractJson(const uint8_t *data, size_t len, String &jsonOut) {
  size_t i = 0;
  while (i < len) {
    uint8_t t = data[i];

    if (t == 0x00) { i++; continue; }           // NULL-TLV ueberspringen
    if (t == 0xFE) return NDEF_EMPTY;            // Terminator -> kein NDEF

    if (t == 0x01 || t == 0x02) {               // Lock-/Memory-Control-TLV
      if (i + 1 >= len) return NDEF_NEED_MORE;
      uint8_t l = data[i + 1];
      i += 2 + l;
      continue;
    }

    if (t == 0x03) {                            // NDEF-Message-TLV
      if (i + 1 >= len) return NDEF_NEED_MORE;
      uint32_t l = data[i + 1];
      size_t hdr = 2;
      if (l == 0xFF) {                          // 3-Byte-Laengenformat
        if (i + 3 >= len) return NDEF_NEED_MORE;
        l = ((uint32_t)data[i + 2] << 8) | data[i + 3];
        hdr = 4;
      }
      size_t ndefStart = i + hdr;
      if (ndefStart + l > len) return NDEF_NEED_MORE;
      if (l == 0) return NDEF_EMPTY;
      return parseRecord(data + ndefStart, l, jsonOut) ? NDEF_OK : NDEF_EMPTY;
    }

    // Unbekanntes TLV -> als "kein NDEF" behandeln
    return NDEF_EMPTY;
  }
  return NDEF_NEED_MORE;
}
