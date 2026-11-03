// Hilfsfunktionen fuer Formular-Entwuerfe: Vergleich Entwurf vs. zuletzt geladener Stand.
// Bewusst klein und rein, damit die Kern-Invarianten testbar sind (siehe test/draft.test.ts).

// "Geaendert" gilt nur, wenn der Nutzer wirklich editiert hat UND sich der Entwurf
// vom zuletzt geladenen Serverstand unterscheidet – NIE Entwurf vs. "leer/ungeladen".
export function isDraftDirty(edited: boolean, draftJson: string, baseJson: string): boolean {
  return edited && draftJson !== baseJson
}

// Sicherheitsnetz: true, wenn das Speichern einer LEEREN Liste bestaetigt werden muss,
// weil der zuletzt geladene Stand bereits Eintraege hatte.
export function needsEmptyListConfirm(cleanLength: number, baseJson: string): boolean {
  return cleanLength === 0 && baseJson !== '' && baseJson !== '[]'
}
