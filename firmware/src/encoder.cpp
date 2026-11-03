#include "encoder.h"
#include "config.h"

static const int PIN_ENC_A   = 32;
static const int PIN_ENC_B   = 33;
static const int PIN_ENC_BTN = 25;

static const uint32_t LONG_PRESS_MS = 1500;
static const uint32_t DEBOUNCE_MS   = 30;

// Quadratur-Zustandstabelle: Index = (alt<<2 | neu)
static const int8_t QUAD_TABLE[16] = {
   0, -1,  1,  0,
   1,  0,  0, -1,
  -1,  0,  0,  1,
   0,  1, -1,  0
};

static volatile long    s_count  = 0;   // Rasterschritte
static volatile int     s_sub    = 0;   // 4 Teilschritte = 1 Raste
static volatile uint8_t s_oldAB  = 0;

static long     s_lastTaken = 0;

// Taster-Status
static int      s_btnStable   = HIGH;
static int      s_btnLastRead = HIGH;
static uint32_t s_btnChangedAt = 0;
static uint32_t s_pressStart   = 0;
static bool     s_firedLong    = false;
static BtnEvent s_pendingBtn   = BTN_NONE;

static void IRAM_ATTR encoderISR() {
  uint8_t ab = (digitalRead(PIN_ENC_A) << 1) | digitalRead(PIN_ENC_B);
  s_oldAB = ((s_oldAB << 2) | ab) & 0x0F;
  s_sub += QUAD_TABLE[s_oldAB];
  if (s_sub >= 4)      { s_count++; s_sub = 0; }
  else if (s_sub <= -4){ s_count--; s_sub = 0; }
}

void encoderInit() {
  pinMode(PIN_ENC_A, INPUT_PULLUP);
  pinMode(PIN_ENC_B, INPUT_PULLUP);
  pinMode(PIN_ENC_BTN, INPUT_PULLUP);
  s_oldAB = (digitalRead(PIN_ENC_A) << 1) | digitalRead(PIN_ENC_B);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_A), encoderISR, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_B), encoderISR, CHANGE);
}

void encoderUpdate() {
  int reading = digitalRead(PIN_ENC_BTN);
  uint32_t now = millis();

  if (reading != s_btnLastRead) {
    s_btnChangedAt = now;
    s_btnLastRead  = reading;
  }

  if ((now - s_btnChangedAt) > DEBOUNCE_MS && reading != s_btnStable) {
    s_btnStable = reading;
    if (s_btnStable == LOW) {        // frisch gedrueckt
      s_pressStart = now;
      s_firedLong  = false;
    } else {                         // losgelassen
      if (!s_firedLong) s_pendingBtn = BTN_SHORT;
    }
  }

  // Langer Druck: sobald Schwelle erreicht und noch gehalten
  if (s_btnStable == LOW && !s_firedLong && (now - s_pressStart) >= LONG_PRESS_MS) {
    s_firedLong  = true;
    s_pendingBtn = BTN_LONG;
  }
}

long encoderTakeDelta() {
  noInterrupts();
  long c = s_count;
  interrupts();
  long delta = c - s_lastTaken;
  s_lastTaken = c;
  if (g_config.enc_reverse) delta = -delta;
  return delta;
}

BtnEvent encoderTakeButton() {
  BtnEvent e = s_pendingBtn;
  s_pendingBtn = BTN_NONE;
  return e;
}
