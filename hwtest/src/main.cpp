/*
 * SpoolStation - Verkabelungs-Test (hwtest)
 * -----------------------------------------
 * Prueft die drei Hardware-Komponenten getrennt, ohne dass sie sich
 * gegenseitig blockieren:
 *   1. GC9A01 Rund-Display ueber VSPI (eigener Bus)
 *   2. PN532 NFC-Leser ueber HSPI (eigener Bus, eigene SPIClass)
 *   3. EC11 Drehencoder mit Taster (Quadratur per Interrupt, Taster entprellt)
 *
 * Pinbelegung exakt laut CLAUDE.md.
 *
 * Nicht-blockierend: Der NFC-Leser wird mit kurzem Timeout gepollt, der
 * Encoder laeuft komplett ueber Interrupts, das Display wird nur bei
 * tatsaechlicher Aenderung neu gezeichnet.
 */

#include <Arduino.h>
#include <SPI.h>
#include <LovyanGFX.hpp>
#include <Adafruit_PN532.h>

// ---------------------------------------------------------------------------
// Pins (CLAUDE.md)
// ---------------------------------------------------------------------------
// Display (VSPI)
static const int PIN_DISP_SCLK = 18;
static const int PIN_DISP_MOSI = 23;
static const int PIN_DISP_RST  = 17;
static const int PIN_DISP_DC   = 16;
static const int PIN_DISP_CS   = 5;
static const int PIN_DISP_BLK  = 4;   // HIGH = Hintergrundbeleuchtung an

// PN532 (HSPI, eigene SPIClass)
static const int PIN_NFC_SCK   = 14;
static const int PIN_NFC_MISO  = 27;
static const int PIN_NFC_MOSI  = 13;
static const int PIN_NFC_SS    = 26;

// Encoder EC11
static const int PIN_ENC_A     = 32;
static const int PIN_ENC_B     = 33;
static const int PIN_ENC_BTN   = 25;  // gedrueckt = LOW

// ---------------------------------------------------------------------------
// Display: LovyanGFX-Konfiguration fuer GC9A01 auf VSPI
// ---------------------------------------------------------------------------
class LGFX : public lgfx::LGFX_Device {
  lgfx::Panel_GC9A01 _panel;
  lgfx::Bus_SPI      _bus;

public:
  LGFX() {
    {
      auto cfg = _bus.config();
      cfg.spi_host    = SPI3_HOST;      // VSPI
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
      cfg.pin_cs           = PIN_DISP_CS;
      cfg.pin_rst          = PIN_DISP_RST;
      cfg.pin_busy         = -1;
      cfg.panel_width      = 240;
      cfg.panel_height     = 240;
      cfg.offset_x         = 0;
      cfg.offset_y         = 0;
      cfg.offset_rotation  = 0;
      cfg.readable         = false;
      cfg.invert           = true;      // GC9A01 braucht i.d.R. Farbinvertierung
      cfg.rgb_order        = false;
      cfg.dlen_16bit       = false;
      cfg.bus_shared       = false;     // eigener Bus, nicht mit NFC geteilt
      _panel.config(cfg);
    }
    setPanel(&_panel);
  }
};

static LGFX tft;

// ---------------------------------------------------------------------------
// NFC: PN532 auf eigenem HSPI-Bus
// ---------------------------------------------------------------------------
static SPIClass        hspi(HSPI);
static Adafruit_PN532  nfc(PIN_NFC_SS, &hspi);
static bool            nfcOk = false;

// ---------------------------------------------------------------------------
// Encoder: Quadratur-Zustandsautomat per Interrupt
// ---------------------------------------------------------------------------
// Uebergangstabelle: Index = (alt<<2 | neu), Wert = +1 / -1 / 0
static const int8_t QUAD_TABLE[16] = {
   0, -1,  1,  0,
   1,  0,  0, -1,
  -1,  0,  0,  1,
   0,  1, -1,  0
};

volatile long  encCount   = 0;   // Rasterschritte (ein Schritt pro Raste)
volatile int   encSub     = 0;   // Zwischenstand (4 Teilschritte = 1 Raste)
volatile uint8_t encOldAB = 0;

void IRAM_ATTR encoderISR() {
  uint8_t ab = (digitalRead(PIN_ENC_A) << 1) | digitalRead(PIN_ENC_B);
  encOldAB = ((encOldAB << 2) | ab) & 0x0F;
  encSub += QUAD_TABLE[encOldAB];
  if (encSub >= 4) { encCount++; encSub = 0; }
  else if (encSub <= -4) { encCount--; encSub = 0; }
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen Display
// ---------------------------------------------------------------------------
static void drawStartupRings() {
  tft.fillScreen(TFT_BLACK);
  const int cx = 120, cy = 120;
  // Drei farbige Ringe
  for (int i = 0; i < 8; i++) {
    tft.drawCircle(cx, cy, 118 - i, TFT_RED);
    tft.drawCircle(cx, cy,  88 - i, TFT_GREEN);
    tft.drawCircle(cx, cy,  58 - i, TFT_BLUE);
  }
  tft.setTextDatum(middle_center);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setFont(&fonts::Font4);
  tft.drawString("Display OK", cx, cy);
}

// Vollstaendiger Neuaufbau des Hauptbildschirms (nur bei Aenderung aufgerufen)
static void drawMainScreen(const String &nfcLine1, const String &nfcLine2,
                           long counter, const String &btnLine) {
  tft.fillScreen(TFT_BLACK);
  const int cx = 120;

  // Rahmen-Ring als Orientierung
  tft.drawCircle(cx, 120, 118, TFT_DARKGREY);

  // NFC-Status oben
  tft.setTextDatum(top_center);
  tft.setFont(&fonts::Font2);
  tft.setTextColor(nfcOk ? TFT_GREEN : TFT_RED, TFT_BLACK);
  tft.drawString(nfcLine1, cx, 32);
  tft.setTextColor(TFT_CYAN, TFT_BLACK);
  tft.drawString(nfcLine2, cx, 52);

  // Grosser Zaehler in der Mitte
  tft.setTextDatum(middle_center);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setFont(&fonts::Font7);
  tft.drawString(String(counter), cx, 120);

  // Taster-Hinweis unten
  tft.setTextDatum(bottom_center);
  tft.setFont(&fonts::Font2);
  tft.setTextColor(TFT_YELLOW, TFT_BLACK);
  tft.drawString(btnLine, cx, 206);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println(F("=== SpoolStation hwtest ==="));

  // --- Display ---
  pinMode(PIN_DISP_BLK, OUTPUT);
  digitalWrite(PIN_DISP_BLK, HIGH);   // Beleuchtung an
  tft.init();
  tft.setRotation(0);
  drawStartupRings();
  Serial.println(F("[Display] initialisiert, Ringe + 'Display OK' gezeichnet."));

  // --- Encoder ---
  pinMode(PIN_ENC_A, INPUT_PULLUP);
  pinMode(PIN_ENC_B, INPUT_PULLUP);
  pinMode(PIN_ENC_BTN, INPUT_PULLUP);
  encOldAB = (digitalRead(PIN_ENC_A) << 1) | digitalRead(PIN_ENC_B);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_A), encoderISR, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_B), encoderISR, CHANGE);
  Serial.println(F("[Encoder] bereit (Interrupts auf A/B)."));

  // --- NFC (eigener HSPI-Bus) ---
  hspi.begin(PIN_NFC_SCK, PIN_NFC_MISO, PIN_NFC_MOSI, PIN_NFC_SS);
  nfc.begin();
  uint32_t ver = nfc.getFirmwareVersion();
  if (ver) {
    nfcOk = true;
    uint8_t chip = (ver >> 24) & 0xFF;
    uint8_t vHi  = (ver >> 16) & 0xFF;
    uint8_t vLo  = (ver >> 8)  & 0xFF;
    Serial.printf("[PN532] gefunden: Chip PN5%02X, Firmware %d.%d\n", chip, vHi, vLo);
    nfc.SAMConfig();          // Lesemodus
    nfc.setPassiveActivationRetries(0x01);
  } else {
    nfcOk = false;
    Serial.println(F("PN532 NICHT GEFUNDEN - DIP-Schalter und Kabel pruefen"));
  }

  // Startbild 1,5 s stehen lassen, dann Hauptbildschirm
  delay(1500);
  String s1 = nfcOk ? F("PN532 OK") : F("PN532 FEHLT");
  String s2 = nfcOk ? F("Tag auflegen...") : F("DIP/Kabel pruefen");
  drawMainScreen(s1, s2, encCount, F("Knopf drehen/druecken"));
}

// ---------------------------------------------------------------------------
// Loop (nicht-blockierend)
// ---------------------------------------------------------------------------
void loop() {
  static long   lastCounter   = 0;
  static String lastNfc1      = "";
  static String lastNfc2      = "";
  static String lastBtn       = "";
  static bool   needRedraw    = false;

  // beim ersten Durchlauf die Startwerte uebernehmen
  static bool   first = true;
  if (first) {
    first = false;
    lastCounter = encCount;
    lastNfc1 = nfcOk ? "PN532 OK" : "PN532 FEHLT";
    lastNfc2 = nfcOk ? "Tag auflegen..." : "DIP/Kabel pruefen";
    lastBtn  = "Knopf drehen/druecken";
  }

  // --- Encoder-Zaehler ---
  noInterrupts();
  long c = encCount;
  interrupts();
  if (c != lastCounter) {
    long diff = c - lastCounter;
    Serial.printf("[Encoder] %s%ld  -> Stand: %ld\n",
                  diff > 0 ? "+" : "", diff, c);
    lastCounter = c;
    needRedraw  = true;
  }

  // --- Taster entprellt ---
  static int  btnStable   = HIGH;
  static int  btnLastRead  = HIGH;
  static unsigned long btnChangedAt = 0;
  int reading = digitalRead(PIN_ENC_BTN);
  if (reading != btnLastRead) {
    btnChangedAt = millis();
    btnLastRead  = reading;
  }
  if ((millis() - btnChangedAt) > 30 && reading != btnStable) {
    btnStable = reading;
    if (btnStable == LOW) {              // frisch gedrueckt
      Serial.println(F("[Taster] Taste gedrueckt"));
      lastBtn    = "Taste gedrueckt!";
      needRedraw = true;
    } else {
      lastBtn    = "Knopf drehen/druecken";
      needRedraw = true;
    }
  }

  // --- NFC pollen (kurzer Timeout -> blockiert Display/Encoder nicht) ---
  static unsigned long lastPoll = 0;
  if (nfcOk && (millis() - lastPoll) > 150) {
    lastPoll = millis();
    uint8_t uid[7];
    uint8_t uidLen = 0;
    // 50 ms Timeout: kehrt schnell zurueck, wenn kein Tag da ist
    if (nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLen, 50)) {
      String hexUid = "";
      for (uint8_t i = 0; i < uidLen; i++) {
        if (uid[i] < 0x10) hexUid += "0";
        hexUid += String(uid[i], HEX);
        if (i < uidLen - 1) hexUid += " ";
      }
      hexUid.toUpperCase();

      const char *typ = (uidLen == 7) ? "NTAG2xx" : "anderes";
      Serial.printf("[NFC] Tag: UID=%s  Laenge=%u  Typ=%s\n",
                    hexUid.c_str(), uidLen, typ);

      lastNfc1   = String("UID (") + uidLen + "B, " + typ + ")";
      lastNfc2   = hexUid;
      needRedraw = true;
    }
  }

  // --- Display nur bei Aenderung neu zeichnen ---
  if (needRedraw) {
    needRedraw = false;
    drawMainScreen(lastNfc1, lastNfc2, lastCounter, lastBtn);
  }

  delay(5);   // kleine Pause, haelt den Watchdog zufrieden
}
