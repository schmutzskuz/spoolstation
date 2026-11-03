#include "ui.h"
#include "encoder.h"
#include "config.h"
#include "nfc.h"
#include "printer.h"
#include "printerpoll.h"
#include "wifi_mgr.h"
#include "state.h"
#include "version.h"
#include "i18n.h"

#include <LovyanGFX.hpp>
#include <math.h>

// ---------------------------------------------------------------------------
// Display GC9A01 auf VSPI
// ---------------------------------------------------------------------------
static const int PIN_DISP_SCLK = 18;
static const int PIN_DISP_MOSI = 23;
static const int PIN_DISP_RST  = 17;
static const int PIN_DISP_DC   = 16;
static const int PIN_DISP_CS   = 5;
static const int PIN_DISP_BLK  = 4;
static const int PIN_ENC_BTN   = 25;  // Encoder-Taster (fuer Werksreset-Geste)

class LGFX : public lgfx::LGFX_Device {
  lgfx::Panel_GC9A01 _panel;
  lgfx::Bus_SPI      _bus;
public:
  LGFX() {
    {
      auto cfg = _bus.config();
      cfg.spi_host    = SPI3_HOST;
      cfg.spi_mode    = 0;
      cfg.freq_write  = 40000000;
      cfg.freq_read   = 16000000;
      cfg.spi_3wire   = true;
      cfg.use_lock    = true;
      cfg.dma_channel = SPI_DMA_CH_AUTO;
      cfg.pin_sclk    = PIN_DISP_SCLK;
      cfg.pin_mosi    = PIN_DISP_MOSI;
      cfg.pin_miso    = -1;
      cfg.pin_dc      = PIN_DISP_DC;
      _bus.config(cfg);
      _panel.setBus(&_bus);
    }
    {
      auto cfg = _panel.config();
      cfg.pin_cs          = PIN_DISP_CS;
      cfg.pin_rst         = PIN_DISP_RST;
      cfg.pin_busy        = -1;
      cfg.panel_width     = 240;
      cfg.panel_height    = 240;
      cfg.offset_rotation = 0;
      cfg.readable        = false;
      cfg.invert          = true;
      cfg.rgb_order       = false;
      cfg.dlen_16bit      = false;
      cfg.bus_shared      = false;
      _panel.config(cfg);
    }
    setPanel(&_panel);
  }
};

static LGFX              tft;
static lgfx::LGFX_Sprite canvas(&tft);
static bool              useSprite = false;
static LovyanGFX        *gfx = &tft;   // Zielflaeche zum Zeichnen

// ---------------------------------------------------------------------------
// Farben (RGB565) – "Werkstatt": Graphit-Hintergrund, Messing als einziger Akzent.
// ---------------------------------------------------------------------------
static inline uint16_t rgb(uint8_t r, uint8_t g, uint8_t b) {
  return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}
static const uint16_t C_BG      = rgb(0x25, 0x27, 0x2A);  // Graphit
static const uint16_t C_BG2     = rgb(0x1C, 0x1D, 0x20);  // etwas dunkler (Tiefe)
static const uint16_t C_BRASS   = rgb(0xC8, 0xA0, 0x4A);  // Messing-Akzent
static const uint16_t C_SEG_OFF = rgb(0x3A, 0x3D, 0x42);  // leerer/unbekannter Slot
static const uint16_t C_TEXT    = rgb(0xEC, 0xEC, 0xEE);
static const uint16_t C_DIM     = rgb(0x9A, 0x9C, 0xA2);
static const uint16_t C_GREEN   = rgb(0x4C, 0xB7, 0x6A);
static const uint16_t C_RED     = rgb(0xE0, 0x5A, 0x5A);
static const uint16_t C_OUTLINE = rgb(0x6A, 0x6E, 0x76);  // helle Kontur fuer dunkle Filamente

static const int CX = 120, CY = 120;

// Farbkomponenten aus RGB565 zuruecklesen (fuer Mischen/Helligkeit).
static inline uint8_t r5(uint16_t c) { return ((c >> 11) & 0x1F) << 3; }
static inline uint8_t g5(uint16_t c) { return ((c >> 5) & 0x3F) << 2; }
static inline uint8_t b5(uint16_t c) { return (c & 0x1F) << 3; }

// Zwei Farben mischen (t=0 -> a, t=1 -> b).
static uint16_t mix(uint16_t a, uint16_t b, float t) {
  if (t < 0) t = 0; if (t > 1) t = 1;
  uint8_t r = r5(a) + (int)((r5(b) - r5(a)) * t);
  uint8_t g = g5(a) + (int)((g5(b) - g5(a)) * t);
  uint8_t bl = b5(a) + (int)((b5(b) - b5(a)) * t);
  return rgb(r, g, bl);
}

// Wahrgenommene Helligkeit (0..255).
static int luma(uint16_t c) { return (r5(c) * 77 + g5(c) * 150 + b5(c) * 29) >> 8; }
static bool isDark(uint16_t c) { return luma(c) < 60; }

// ---------------------------------------------------------------------------
// Zustaende
// ---------------------------------------------------------------------------
enum UiState { UI_HOME, UI_READING, UI_SENDING, UI_RESULT, UI_INFO, UI_PC, UI_SETUP, UI_RESET, UI_OTA };
static UiState  s_state = UI_HOME;
// s_slot ist ein flacher Index ueber alle Drucker: Drucker = s_slot/4, Kanal = s_slot%4.
static int      s_slot  = 0;

static int printerCount() { int n = (int)g_config.printers.size(); return n > 0 ? n : 1; }
static int totalSlots()   { return printerCount() * 4; }
static int curPrinter()   { return (s_slot / 4) % printerCount(); }
static int curChannel()   { return s_slot % 4; }

// Lesejob
static int      s_jobId      = 0;
static int      s_pcJobId    = -1;    // zuletzt beobachteter PC-Job (id)
static uint32_t s_readStart  = 0;
static uint32_t s_readTimeout = 10000;

// Ergebnis
static bool     s_resultOk   = false;
static String   s_resLine1, s_resLine2;
static uint32_t s_resultStart = 0;
static uint16_t s_resColor   = C_GREEN;  // Filamentfarbe fuer die Erfolgs-Spule
static float    s_resFill    = 0.6f;

// Pro Slot zuletzt gesendetes Filament
struct SlotFil {
  bool   set = false;
  String brand, type, colorHex;
};
static SlotFil  s_fil[MAX_PRINTERS * 4];

// Zeichnen-Steuerung
static bool     s_dirty    = true;
static uint32_t s_lastDraw = 0;

// Animation + Dimmen
static float    s_selAnim   = 0;      // animierter Auswahlindex (0..3), weich nachgefuehrt
static uint32_t s_anchorMs  = 0;      // Startzeit der aktuellen Szene (fuer Puls/Wellen)
static uint32_t s_lastInput = 0;      // letzte Bedienung (fuer Auto-Dimmen)
static uint8_t  s_bright    = 255;    // aktuelle Helligkeit (BLK)
static float    s_shake     = 0;      // Fehler-Wackeln (0..1, klingt ab)

// BLK per LEDC (PWM) dimmen.
static const int BLK_CH = 7;
static void setBacklight(uint8_t v) {
  s_bright = v;
  ledcWrite(BLK_CH, v);
}

// ---------------------------------------------------------------------------
// Hilfen
// ---------------------------------------------------------------------------
static uint16_t hexToColor(const String &hex) {
  if (hex.length() < 6) return C_DIM;
  long v = strtol(hex.c_str(), nullptr, 16);
  uint8_t r = (v >> 16) & 0xFF, g = (v >> 8) & 0xFF, b = v & 0xFF;
  return rgb(r, g, b);
}

static void polar(float angleDeg, float r, int &x, int &y) {
  float a = angleDeg * DEG_TO_RAD;
  x = CX + (int)lroundf(cosf(a) * r);
  y = CY + (int)lroundf(sinf(a) * r);
}

// Mittel-Winkel der Slots: T1 oben, T2 rechts, T3 unten, T4 links
static const float SLOT_ANGLE[4] = { 270.0f, 0.0f, 90.0f, 180.0f };

// ---------------------------------------------------------------------------
// Zeichenroutinen (jeweils in gfx, danach ggf. Sprite pushen)
// ---------------------------------------------------------------------------
static void beginFrame() { gfx->fillScreen(C_BG); }

static void endFrame() {
  if (useSprite) canvas.pushSprite(0, 0);
}

// Kleines Warnsymbol unten mittig im inneren Bereich – NUR wenn etwas nicht stimmt
// (kein WLAN oder Drucker nicht erreichbar). Verdeckt nie Beschriftungen/Segmente.
static void drawStatusGlyph(bool printerReachable) {
  bool wifi = wifiConnected();
  if (wifi && printerReachable) return;  // alles ok -> nichts anzeigen
  int gy = 200;
  if (!wifi) {
    // durchgestrichenes WLAN-Faecher
    for (int i = 1; i <= 3; i++) gfx->drawArc(CX, gy + 4, i * 3, i * 3, 215, 325, C_DIM);
    gfx->fillCircle(CX, gy + 4, 2, C_DIM);
    gfx->drawLine(CX - 8, gy - 6, CX + 8, gy + 8, C_RED);
  } else {
    // Drucker nicht erreichbar: kleines Drucker-Symbol in Rot
    gfx->drawRoundRect(CX - 8, gy - 3, 16, 10, 2, C_RED);
    gfx->drawFastHLine(CX - 4, gy - 6, 8, C_RED);
    gfx->fillRect(CX - 4, gy + 2, 8, 4, C_RED);
  }
}

// Spule in Seitenansicht (vereinfachte SpoolGraphic): zwei Flansche + Wickel,
// Fuellstand 0..1 faerbt den Wickel in der Filamentfarbe.
static void drawSpoolSide(int cx, int cy, int w, int h, uint16_t col, float fill, bool present) {
  int hw = w / 2, hh = h / 2;
  uint16_t flange = present ? mix(col, C_BG, 0.55f) : C_SEG_OFF;
  // Flansche (links/rechts) als abgerundete Balken
  gfx->fillRoundRect(cx - hw, cy - hh, 6, h, 2, flange);
  gfx->fillRoundRect(cx + hw - 6, cy - hh, 6, h, 2, flange);
  // Kern/Wickel
  int coreX = cx - hw + 7, coreW = w - 14;
  gfx->fillRect(coreX, cy - hh + 3, coreW, h - 6, C_BG2);
  if (present && fill > 0.01f) {
    int fillH = (int)((h - 6) * (fill < 0.08f ? 0.08f : fill));
    uint16_t c = col;
    gfx->fillRect(coreX, cy + hh - 3 - fillH, coreW, fillH, c);
    if (isDark(c)) gfx->drawRect(coreX, cy + hh - 3 - fillH, coreW, fillH, C_OUTLINE);
  }
  // Nabe
  gfx->fillCircle(cx, cy, 3, C_BG2);
  gfx->drawCircle(cx, cy, 3, C_DIM);
}

// Ein Bogensegment mit Lücke, heller Kontur fuer dunkle Farben.
static void drawSegment(float angle, int rIn, int rOut, uint16_t col, bool dark, bool outline) {
  gfx->fillArc(CX, CY, rIn, rOut, angle - 36, angle + 36, col);
  if (dark || outline) {
    // Kontur innen/aussen, damit Schwarz auf Graphit sichtbar bleibt
    gfx->drawArc(CX, CY, rOut, rOut, angle - 36, angle + 36, C_OUTLINE);
    gfx->drawArc(CX, CY, rIn, rIn, angle - 36, angle + 36, C_OUTLINE);
  }
}

static void drawSlotRing(const PrinterSlots &ps) {
  float selF = s_selAnim;  // animierter Auswahlindex
  for (int i = 0; i < 4; i++) {
    float a = SLOT_ANGLE[i];
    // Naehe zur Auswahl (0..1) -> Segment waechst animiert
    float dist = fabsf(i - selF);
    if (dist > 2) dist = 4 - dist;      // umlaufend
    float selAmt = 1.0f - fminf(dist, 1.0f);
    int rIn  = 96 - (int)(selAmt * 10);  // selektiert deutlich dicker
    int rOut = 112 + (int)(selAmt * 3);

    bool present = ps.slots[i].colorHex.length() || ps.slots[i].present;
    uint16_t fil = ps.slots[i].colorHex.length() ? hexToColor(ps.slots[i].colorHex) : C_SEG_OFF;
    bool dark = present && isDark(fil);

    if (!present) {
      // leerer/unbekannter Slot: duenner grauer Bogen
      gfx->fillArc(CX, CY, 104, 110, a - 34, a + 34, C_SEG_OFF);
    } else {
      drawSegment(a, rIn, rOut, fil, dark, false);
    }

    // Beschriftung mit Kontrast zur Segmentfarbe
    int lx, ly; polar(a, 104, lx, ly);
    uint16_t txtCol = present ? (isDark(fil) ? C_TEXT : C_BG) : C_DIM;
    gfx->setFont(&fonts::DejaVu18);
    gfx->setTextDatum(middle_center);
    gfx->setTextColor(txtCol);
    gfx->drawString(String(i + 1), lx, ly);
  }

  // Messing-Markierung aussen am gewaehlten Segment (weich mitgefuehrt)
  float selA = SLOT_ANGLE[0];
  {
    // Winkel aus animiertem Index interpolieren (kuerzester Weg)
    int i0 = ((int)floorf(selF)) & 3;
    int i1 = (i0 + 1) & 3;
    float f = selF - floorf(selF);
    float a0 = SLOT_ANGLE[i0], a1 = SLOT_ANGLE[i1];
    float da = a1 - a0; if (da > 180) da -= 360; if (da < -180) da += 360;
    selA = a0 + da * f;
  }
  gfx->fillArc(CX, CY, 115, 119, selA - 15, selA + 15, C_BRASS);
}

// Text zentriert zeichnen; ist er breiter als maxW, laeuft er weich durch (Marquee).
static void drawScrollText(const String &s, int cx, int cy, int maxW, uint16_t col, const lgfx::IFont *font) {
  gfx->setFont(font);
  gfx->setTextColor(col);
  int w = gfx->textWidth(s);
  if (w <= maxW) {
    gfx->setTextDatum(middle_center);
    gfx->drawString(s, cx, cy);
    return;
  }
  // Durchlaufen: Position aus der Zeit, mit Pause an den Enden
  int span = w - maxW;
  float t = (millis() % 4000) / 4000.0f;         // 4 s Zyklus
  float e = t < 0.5f ? (t * 2) : (2 - t * 2);     // hin und zurueck
  int off = (int)(e * span);
  gfx->setTextDatum(middle_left);
  int clipL = cx - maxW / 2;
  gfx->setClipRect(clipL, cy - 12, maxW, 24);
  gfx->drawString(s, clipL - off, cy);
  gfx->clearClipRect();
}

static void drawHome() {
  beginFrame();
  PrinterSlots ps = pollGetSlots(curPrinter());
  drawSlotRing(ps);
  drawStatusGlyph(ps.reachable);

  const SlotInfo &si = ps.slots[curChannel()];
  const SlotFil  &f  = s_fil[s_slot];

  bool present = si.present;
  uint16_t col = si.colorHex.length() ? hexToColor(si.colorHex) : (f.set ? hexToColor(f.colorHex) : C_SEG_OFF);
  float fill = 0.5f;
  if (si.remaining >= 0) fill = si.remaining / 1000.0f;  // grobe Annahme 1 kg voll
  if (fill > 1) fill = 1;

  // Spule in der Mitte
  drawSpoolSide(CX, 82, 56, 40, col, fill, present || f.set);

  // Slot-Nummer gross
  gfx->setTextDatum(middle_center);
  gfx->setFont(&fonts::DejaVu24);
  gfx->setTextColor(C_TEXT);
  String slotLabel = (printerCount() > 1 ? g_config.printers[curPrinter()].name + " · " : String("")) +
                     String(tr("slot")) + " " + (curChannel() + 1);
  drawScrollText(slotLabel, CX, 128, 150, C_TEXT, &fonts::DejaVu24);

  // Name / Material / Restgewicht
  String name = present ? (si.name.length() ? si.name : si.material) : (f.set ? f.brand : String(tr("empty_dash")));
  String sub;
  if (present) { sub = si.material; if (si.remaining >= 0) sub += "   " + String(si.remaining) + " g"; }
  else if (f.set) sub = f.type;

  drawScrollText(name, CX, 158, 170, present || f.set ? C_TEXT : C_DIM, &fonts::DejaVu18);
  if (sub.length()) {
    gfx->setFont(&fonts::DejaVu18);
    gfx->setTextColor(C_DIM);
    gfx->setTextDatum(middle_center);
    gfx->drawString(sub, CX, 182);
  }
  endFrame();
}

// Pulsierende NFC-Wellen (Messing) um einen Punkt – Ringe wandern nach aussen.
static void drawNfcWaves(int cx, int cy) {
  float t = (millis() - s_anchorMs) / 900.0f;
  for (int k = 0; k < 3; k++) {
    float p = t + k / 3.0f;
    p -= floorf(p);                 // 0..1
    int r = 8 + (int)(p * 34);
    uint16_t c = mix(C_BRASS, C_BG, p);  // nach aussen ausblenden
    gfx->drawCircle(cx, cy, r, c);
    gfx->drawCircle(cx, cy, r + 1, c);
  }
  gfx->fillCircle(cx, cy, 5, C_BRASS);
}

static void drawReading() {
  beginFrame();

  uint32_t elapsed = millis() - s_readStart;
  if (elapsed > s_readTimeout) elapsed = s_readTimeout;
  float frac = 1.0f - (float)elapsed / (float)s_readTimeout;  // verbleibend

  // Countdown als Messing-Bogen, der sich leert (oben beginnend, im Uhrzeigersinn)
  gfx->fillArc(CX, CY, 108, 114, 0, 360, C_SEG_OFF);
  if (frac > 0.001f) gfx->fillArc(CX, CY, 108, 114, 270, 270 + 360.0f * frac, C_BRASS);

  drawNfcWaves(CX, 86);

  gfx->setTextDatum(middle_center);
  gfx->setFont(&fonts::DejaVu18);
  gfx->setTextColor(C_TEXT);
  gfx->drawString(tr("load_spool"), CX, 140);

  int rest = (int)((s_readTimeout - elapsed + 999) / 1000);
  gfx->setFont(&fonts::DejaVu18);
  gfx->setTextColor(C_DIM);
  gfx->drawString(String(rest) + " s", CX, 170);
  endFrame();
}

static void drawSending() {
  beginFrame();
  // rotierender Messing-Bogen
  float a = (millis() / 3) % 360;
  gfx->fillArc(CX, CY, 108, 114, 0, 360, C_SEG_OFF);
  gfx->fillArc(CX, CY, 108, 114, a, a + 90, C_BRASS);
  gfx->setTextDatum(middle_center);
  gfx->setFont(&fonts::DejaVu18);
  gfx->setTextColor(C_TEXT);
  gfx->drawString(tr("sending"), CX, 118);
  endFrame();
}

static void drawCheck(int cx, int cy, int r, uint16_t col, float prog) {
  // Haken zeichnet sich ein (prog 0..1)
  int ax = cx - r / 2,     ay = cy + 2;
  int bx = cx - r / 6,     by = cy + r / 2;
  int ex = cx + r / 2,     ey = cy - r / 2;
  float p1 = fminf(prog * 2.0f, 1.0f);
  float p2 = fmaxf(prog * 2.0f - 1.0f, 0.0f);
  int m1x = ax + (int)((bx - ax) * p1), m1y = ay + (int)((by - ay) * p1);
  int m2x = bx + (int)((ex - bx) * p2), m2y = by + (int)((ey - by) * p2);
  for (int o = -2; o <= 2; o++) {
    gfx->drawLine(ax, ay + o, m1x, m1y + o, col);
    if (p2 > 0) gfx->drawLine(bx, by + o, m2x, m2y + o, col);
  }
}

static void drawCross(int cx, int cy, int r, uint16_t col) {
  for (int o = -2; o <= 2; o++) {
    gfx->drawLine(cx - r / 2, cy - r / 2 + o, cx + r / 2, cy + r / 2 + o, col);
    gfx->drawLine(cx - r / 2, cy + r / 2 + o, cx + r / 2, cy - r / 2 + o, col);
  }
}

static void drawResult() {
  beginFrame();
  uint32_t el = millis() - s_resultStart;

  // Fehler: kurzes Wackeln (horizontaler Versatz, klingt ab)
  int dx = 0;
  if (!s_resultOk && s_shake > 0.01f) dx = (int)(sinf(el / 40.0f) * 7 * s_shake);

  if (s_resultOk) {
    // Spule fuellt sich in der Filamentfarbe, Haken zeichnet sich ein
    float grow = fminf(el / 300.0f, 1.0f);
    drawSpoolSide(CX + dx, 78, 56, 42, s_resColor, s_resFill * grow, true);
    float cp = fminf(fmaxf((el - 250) / 350.0f, 0.0f), 1.0f);
    if (cp > 0) {
      gfx->fillCircle(CX + 20 + dx, 56, 15, C_GREEN);
      drawCheck(CX + 20 + dx, 56, 18, C_BG, cp);
    }
  } else {
    gfx->fillCircle(CX + dx, 80, 34, C_RED);
    drawCross(CX + dx, 80, 36, C_BG);
  }

  gfx->setTextDatum(middle_center);
  drawScrollText(s_resLine1, CX + dx, 148, 180, C_TEXT, &fonts::DejaVu24);
  gfx->setFont(&fonts::DejaVu18);
  gfx->setTextColor(s_resultOk ? C_DIM : C_RED);
  drawScrollText(s_resLine2, CX + dx, 178, 190, s_resultOk ? C_DIM : C_RED, &fonts::DejaVu18);
  endFrame();
}

static void drawInfo() {
  beginFrame();
  gfx->drawCircle(CX, CY, 116, C_SEG_OFF);
  gfx->setTextDatum(middle_center);

  gfx->setFont(&fonts::DejaVu24);
  gfx->setTextColor(C_BRASS);
  gfx->drawString(tr("info"), CX, 46);

  gfx->setFont(&fonts::DejaVu18);
  gfx->setTextColor(C_TEXT);
  gfx->drawString(wifiConnected() ? wifiIp() : String(tr("no_wifi")), CX, 84);

  gfx->setTextColor(C_DIM);
  gfx->drawString(wifiHostname(), CX, 110);

  int32_t rssi = wifiRssi();
  String sig = String(tr("signal")) + ": ";
  if (!wifiConnected())   sig += "--";
  else if (rssi >= -60)   sig += tr("sig_good");
  else if (rssi >= -72)   sig += tr("sig_mid");
  else                    sig += tr("sig_low");
  if (wifiConnected())    sig += " (" + String(rssi) + " dBm)";
  gfx->drawString(sig, CX, 136);

  gfx->setTextColor(C_DIM);
  gfx->drawString(String(tr("firmware")) + " v" + FW_VERSION, CX, 162);

  gfx->setFont(&fonts::DejaVu12);
  gfx->setTextColor(C_DIM);
  gfx->drawString(tr("press_back"), CX, 196);
  endFrame();
}

static void drawPcBusy() {
  beginFrame();
  gfx->drawArc(CX, CY, 112, 114, 0, 360, C_SEG_OFF);
  drawNfcWaves(CX, 88);
  gfx->setTextDatum(middle_center);
  gfx->setFont(&fonts::DejaVu24);
  gfx->setTextColor(C_BRASS);
  gfx->drawString(tr("pc"), CX, 140);
  gfx->setFont(&fonts::DejaVu18);
  gfx->setTextColor(C_TEXT);
  gfx->drawString(tr("put_tag"), CX, 170);
  endFrame();
}

// Einrichtungsmodus: Station ist noch nicht konfiguriert -> "Mit PC verbinden".
static void drawSetup() {
  beginFrame();
  gfx->drawArc(CX, CY, 116, 116, 0, 360, C_SEG_OFF);
  // kleines USB-Stecker-Symbol
  gfx->fillRoundRect(CX - 7, 50, 14, 22, 3, C_BRASS);
  gfx->drawFastVLine(CX, 40, 10, C_BRASS);
  gfx->fillCircle(CX - 3, 58, 2, C_BG);
  gfx->fillCircle(CX + 3, 58, 2, C_BG);

  gfx->setTextDatum(middle_center);
  gfx->setFont(&fonts::DejaVu18);
  gfx->setTextColor(C_BRASS);
  gfx->drawString(tr("setup_title"), CX, 92);

  gfx->setFont(&fonts::DejaVu24);
  gfx->setTextColor(C_TEXT);
  gfx->drawString(tr("setup_usb"), CX, 124);
  gfx->setFont(&fonts::DejaVu18);
  gfx->setTextColor(C_DIM);
  gfx->drawString(tr("setup_usb2"), CX, 150);

  gfx->setFont(&fonts::DejaVu12);
  gfx->setTextColor(C_DIM);
  gfx->drawString(tr("setup_hint"), CX, 182);
  gfx->drawString(tr("setup_hint2"), CX, 198);
  endFrame();
}

// Werksreset-Sicherheitsabfrage (Encoder beim Start gedrueckt gehalten).
static void drawReset(float held) {
  beginFrame();
  gfx->fillArc(CX, CY, 104, 112, 0, 360, C_SEG_OFF);
  if (held > 0) gfx->fillArc(CX, CY, 104, 112, 270, 270 + 360.0f * held, C_RED);
  gfx->setTextDatum(middle_center);
  gfx->setFont(&fonts::DejaVu24);
  gfx->setTextColor(C_RED);
  gfx->drawString(tr("reset_title"), CX, 110);
  gfx->setFont(&fonts::DejaVu18);
  gfx->setTextColor(C_DIM);
  gfx->drawString(tr("reset_hint"), CX, 150);
  endFrame();
}

// Firmware-Update (OTA): Fortschrittsbogen im bestehenden Design, Hinweis
// "nicht ausschalten". Bei Fehler kurz ein rotes Kreuz. Daten kommen aus den
// g_ota*-Flags (gesetzt im Webserver-Task).
static void drawOta() {
  beginFrame();
  int pct = g_otaPct; if (pct < 0) pct = 0; if (pct > 100) pct = 100;

  // Fortschrittsbogen (fuellt sich oben beginnend im Uhrzeigersinn)
  gfx->fillArc(CX, CY, 104, 114, 0, 360, C_SEG_OFF);
  if (!g_otaFailed && pct > 0)
    gfx->fillArc(CX, CY, 104, 114, 270, 270 + 360.0f * (pct / 100.0f), C_BRASS);

  gfx->setTextDatum(middle_center);
  if (g_otaFailed) {
    gfx->fillCircle(CX, 82, 26, C_RED);
    drawCross(CX, 82, 28, C_BG);
    gfx->setFont(&fonts::DejaVu18);
    gfx->setTextColor(C_RED);
    gfx->drawString(tr("ota_failed"), CX, 140);
  } else {
    gfx->setFont(&fonts::DejaVu24);
    gfx->setTextColor(C_TEXT);
    gfx->drawString(String(pct) + " %", CX, 92);
    gfx->setFont(&fonts::DejaVu18);
    gfx->setTextColor(C_BRASS);
    drawScrollText(tr("ota_title"), CX, 140, 190, C_BRASS, &fonts::DejaVu18);
    gfx->setFont(&fonts::DejaVu12);
    gfx->setTextColor(C_DIM);
    gfx->drawString(tr("ota_keep"), CX, 168);
  }
  endFrame();
}

static float s_resetHeld = 0;  // 0..1 fuer die Reset-Anzeige
static uint32_t s_resetStart = 0;
static bool btnDown() { return digitalRead(PIN_ENC_BTN) == LOW; }

static void render() {
  switch (s_state) {
    case UI_HOME:    drawHome();    break;
    case UI_READING: drawReading(); break;
    case UI_SENDING: drawSending(); break;
    case UI_RESULT:  drawResult();  break;
    case UI_INFO:    drawInfo();    break;
    case UI_PC:      drawPcBusy();  break;
    case UI_SETUP:   drawSetup();   break;
    case UI_RESET:   drawReset(s_resetHeld); break;
    case UI_OTA:     drawOta();     break;
  }
}

// ---------------------------------------------------------------------------
// Ablauflogik
// ---------------------------------------------------------------------------
static void showResult(bool ok, const String &l1, const String &l2,
                       uint16_t color = C_GREEN, float fill = 0.6f) {
  s_resultOk    = ok;
  s_resLine1    = l1;
  s_resLine2    = l2;
  s_resColor    = color;
  s_resFill     = fill;
  s_shake       = ok ? 0.0f : 1.0f;
  s_resultStart = millis();
  s_anchorMs    = millis();
  s_state       = UI_RESULT;
  s_dirty       = true;
}

static String shortenResp(const String &s) {
  String t = s;
  t.replace("\n", " ");
  if (t.length() > 22) t = t.substring(0, 22) + "…";
  return t;
}

// Ergebnis eines vom PC gestarteten Jobs anzeigen (gleiche Animation wie am Geraet).
static void showPcResult(const NfcJob &job) {
  if (job.state == "done") {
    if (job.kind == "write") {
      uint16_t col = job.openspool.color_hex.length() ? hexToColor(job.openspool.color_hex) : C_BRASS;
      String name = job.openspool.brand + " " + job.openspool.type; name.trim();
      showResult(true, tr("tag_written"), name.length() ? name : String(tr("sent")), col, 0.7f);
    } else {  // read
      if (job.empty) { showResult(false, tr("tag_empty"), tr("no_data")); return; }
      uint16_t col = (job.openspoolValid && job.openspool.color_hex.length()) ? hexToColor(job.openspool.color_hex) : C_BRASS;
      String name = job.openspoolValid ? (job.openspool.brand + " " + job.openspool.type) : String(""); name.trim();
      showResult(true, tr("tag_read"), name.length() ? name : job.uid, col, 0.7f);
    }
  } else if (job.state == "timeout") {
    showResult(false, tr("no_tag"), tr("timed_out"));
  } else if (job.state == "error") {
    showResult(false, tr("error"), shortenResp(job.error));
  } else {  // cancelled o. ae.
    s_state = UI_HOME; s_dirty = true;
  }
}

static void startRead() {
  int id = nfcStartRead(g_config.read_timeout_ms);
  if (id < 0) return;  // busy (sollte am Geraet nicht passieren)
  s_jobId       = id;
  s_readStart   = millis();
  s_readTimeout = g_config.read_timeout_ms;
  s_anchorMs    = millis();
  s_state       = UI_READING;
  s_dirty       = true;
}

static void finishRead(const NfcJob &j) {
  if (j.empty) { showResult(false, tr("tag_empty"), tr("no_data")); return; }
  if (!j.openspoolValid) { showResult(false, tr("tag_invalid"), tr("no_openspool")); return; }

  // Daten vorhanden -> an den Drucker senden (CLAUDE.md "Drucker-Schnittstelle")
  s_state = UI_SENDING;
  render();  // "Sende an Drucker…" sofort zeigen (printerSend blockiert kurz)

  OpenSpool os = j.openspool;
  const PrinterDef &prt = g_config.printers[curPrinter()];
  PrinterResult pr = printerSend(prt.host, prt.port, curChannel(), os, j.uid);

  // zuletzt gesendetes Filament merken
  s_fil[s_slot].set      = true;
  s_fil[s_slot].brand    = os.brand.length() ? os.brand : String("?");
  s_fil[s_slot].type     = os.type.length()  ? os.type  : String("?");
  s_fil[s_slot].colorHex = os.color_hex;

  // Nach dem Senden den Drucker sofort neu abfragen (Slot-Anzeige aktualisieren).
  pollRequestNow();

  String name = os.brand + " " + os.type;
  name.trim();
  // "Slot 2 geladen" + Filamentname/Material
  String dest = String(tr("slot")) + " " + (curChannel() + 1) + " " + tr("loaded");
  uint16_t col = os.color_hex.length() ? hexToColor(os.color_hex) : C_BRASS;
  if (pr.ok) showResult(true, dest, name.length() ? name : String(tr("sent")), col, 0.7f);
  else       showResult(false, tr("printer_err"), shortenResp(pr.response));
}

static void pollRead() {
  NfcJob j = nfcGetJob();
  if (j.id != s_jobId) return;      // unser Job noch nicht aktiv

  if (j.state == "waiting") return; // laeuft noch -> Countdown weiter

  if (j.state == "done")            finishRead(j);
  else if (j.state == "timeout")    showResult(false, tr("no_tag"), tr("timed_out"));
  else if (j.state == "error")      showResult(false, tr("error"), shortenResp(j.error));
  else /* cancelled */            { s_state = UI_HOME; s_dirty = true; }
}

// ---------------------------------------------------------------------------
// Oeffentliche API
// ---------------------------------------------------------------------------
void uiInit() {
  // Backlight per PWM (zum sanften Dimmen).
  ledcSetup(BLK_CH, 5000, 8);
  ledcAttachPin(PIN_DISP_BLK, BLK_CH);
  ledcWrite(BLK_CH, 255);
  s_lastInput = millis();
  s_anchorMs  = millis();
  s_selAnim   = curChannel();
  tft.init();
  tft.setRotation(0);

  // Vollbild-Sprite fuer flackerfreie Darstellung; bei zu wenig RAM
  // automatisch auf direktes Zeichnen zurueckfallen.
  canvas.setColorDepth(16);
  if (canvas.createSprite(240, 240)) {
    useSprite = true;
    gfx = &canvas;
  } else {
    canvas.setColorDepth(8);
    if (canvas.createSprite(240, 240)) {
      useSprite = true;
      gfx = &canvas;
    } else {
      useSprite = false;
      gfx = &tft;
    }
  }

  encoderInit();

  // Werksreset-Geste: Taster beim Start gedrueckt -> Sicherheitsabfrage.
  if (btnDown()) { s_state = UI_RESET; s_resetStart = millis(); }
  // Noch nicht eingerichtet -> Einrichtungsmodus.
  else if (!configIsConfigured()) { s_state = UI_SETUP; }

  render();
}

void uiTick() {
  // Werksreset-Geste hat Vorrang: Taster beim Start halten (10 s).
  if (s_state == UI_RESET) {
    s_lastInput = millis();
    if (s_bright < 255) setBacklight(255);
    if (!btnDown()) {  // losgelassen -> abbrechen
      s_state = configIsConfigured() ? UI_HOME : UI_SETUP;
      s_resetHeld = 0; s_dirty = true;
    } else {
      uint32_t held = millis() - s_resetStart;
      s_resetHeld = held / 10000.0f; if (s_resetHeld > 1) s_resetHeld = 1;
      if (held >= 10000) { configFactoryReset(); delay(150); ESP.restart(); }
      if (millis() - s_lastDraw >= 33) { render(); s_lastDraw = millis(); }
    }
    return;
  }

  // Firmware-Update laeuft -> Fortschritt zeigen, alles andere sperren, Display hell
  // halten ("nicht ausschalten"). Nach einem Fehler kurz anzeigen, dann zurueck.
  if (g_otaActive) {
    s_lastInput = millis();
    if (s_bright < 255) setBacklight(255);
    s_state = UI_OTA;
    static uint32_t failShown = 0;
    if (g_otaFailed) {
      if (!failShown) failShown = millis();
      if (millis() - failShown > 3000) {
        g_otaActive = false; g_otaFailed = false; failShown = 0;
        s_state = UI_HOME; s_dirty = true;
      }
    } else {
      failShown = 0;
    }
    uint32_t now = millis();
    if (now - s_lastDraw >= 50) { render(); s_lastDraw = now; }
    return;
  }

  encoderUpdate();

  // Nicht eingerichtet -> Einrichtungsmodus (USB). Encoder-Eingaben verwerfen.
  if (!configIsConfigured()) {
    if (s_state != UI_SETUP) { s_state = UI_SETUP; s_dirty = true; }
    encoderTakeDelta(); encoderTakeButton();
    if (s_dirty) { render(); s_dirty = false; }
    return;
  } else if (s_state == UI_SETUP) {
    s_state = UI_HOME; s_dirty = true;
  }

  // PC-Job erkennen (nicht vom Geraet gestartet) -> sperren
  NfcJob job = nfcGetJob();
  bool pcBusy = nfcIsBusy() && job.id != s_jobId;

  if (pcBusy) {
    if (s_state != UI_PC) { s_state = UI_PC; s_anchorMs = millis(); s_pcJobId = job.id; s_dirty = true; }
  } else if (s_state == UI_PC) {
    // PC-Job beendet -> Erfolg/Fehler zeigen (wie am Geraet), sonst zurueck.
    if (job.id == s_pcJobId && job.state != "waiting" && job.state != "idle") showPcResult(job);
    else { s_state = UI_HOME; s_dirty = true; }
  }

  uint32_t now = millis();

  if (s_state == UI_PC) {           // Encoder gesperrt (nur NFC-Wellen animieren)
    encoderTakeDelta();
    encoderTakeButton();
    if (now - s_lastDraw >= 33) { render(); s_dirty = false; s_lastDraw = now; }
    return;
  }

  long     d  = encoderTakeDelta();
  BtnEvent be = encoderTakeButton();

  // Jede Bedienung: Display sofort hell, Dimm-Timer zuruecksetzen.
  if (d != 0 || be != BTN_NONE) {
    s_lastInput = now;
    if (s_bright < 255) setBacklight(255);
  }

  // Auswahl weich nachfuehren (Easing), Fehler-Wackeln abklingen lassen.
  {
    float target = curChannel();
    float diff = target - s_selAnim;
    if (diff > 2) diff -= 4; else if (diff < -2) diff += 4;
    s_selAnim += diff * 0.28f;
    if (s_selAnim < 0) s_selAnim += 4; else if (s_selAnim >= 4) s_selAnim -= 4;
  }
  if (s_shake > 0) { s_shake -= 0.06f; if (s_shake < 0) s_shake = 0; }

  switch (s_state) {
    case UI_HOME:
      if (d != 0) {
        int total = totalSlots();
        s_slot = (int)(((s_slot + d) % total + total) % total);
        g_currentSlot = curChannel();
        pollSetPrinter(curPrinter());  // anderen Drucker ggf. sofort abfragen
        s_dirty = true;
      }
      if (be == BTN_LONG)       { s_state = UI_INFO; s_dirty = true; }
      else if (be == BTN_SHORT) { startRead(); }
      else {
        // Neue Poll-Daten (Slot-Farben/Restgewicht) ~jede Sekunde uebernehmen.
        static uint32_t lastHome = 0;
        if (millis() - lastHome > 1000) { lastHome = millis(); s_dirty = true; }
      }
      break;

    case UI_READING:
      if (be != BTN_NONE) {           // Druck bricht ab
        nfcCancel();
        s_state = UI_HOME;
        s_dirty = true;
      } else {
        pollRead();
        s_dirty = true;               // Countdown animieren
      }
      break;

    case UI_SENDING:
      // wird synchron in finishRead() abgehandelt; hier nichts zu tun
      break;

    case UI_RESULT:
      if (be != BTN_NONE || (millis() - s_resultStart) > 3000) {
        s_state = UI_HOME;
        s_dirty = true;
      }
      break;

    case UI_INFO:
      if (be != BTN_NONE) { s_state = UI_HOME; s_dirty = true; }
      else {
        // RSSI gelegentlich auffrischen
        static uint32_t lastInfo = 0;
        if (millis() - lastInfo > 1000) { lastInfo = millis(); s_dirty = true; }
      }
      break;

    case UI_PC:
      break;
  }

  // Auto-Dimmen nach 60 s ohne Bedienung (sanft herunter).
  if (now - s_lastInput > 60000 && s_bright > 48) setBacklight(s_bright - 6);

  // Welche Zustaende animieren? -> mit ~30 fps zeichnen.
  float sd = (float)curChannel() - s_selAnim;
  if (sd > 2) sd -= 4; else if (sd < -2) sd += 4;
  bool selMoving = fabsf(sd) > 0.02f;
  bool animating = s_state == UI_READING || s_state == UI_SENDING ||
                   (s_state == UI_RESULT && now - s_resultStart < 1600) ||
                   selMoving || s_shake > 0;

  if (animating) {
    if (now - s_lastDraw >= 33) { render(); s_dirty = false; s_lastDraw = now; }
  } else if (s_dirty) {
    render();
    s_dirty    = false;
    s_lastDraw = now;
  }
}
