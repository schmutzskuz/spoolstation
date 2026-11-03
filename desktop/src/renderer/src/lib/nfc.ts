// Kleine, abhaengigkeitsfreie Helfer fuer NFC-Auftraege (testbar).

// Nach dem Start eines Lese-/Schreibauftrags weiterpollen, wenn der Start ok war
// ODER die Station mit 409 antwortet. 409 bedeutet "laeuft bereits" (z. B. durch
// Doppelsenden/StrictMode) – dann haengen wir uns an den laufenden Job an, statt
// faelschlich "Station ist beschaeftigt" zu melden.
export function shouldPollAfterStart(startOk: boolean, status?: number): boolean {
  return startOk || status === 409
}
