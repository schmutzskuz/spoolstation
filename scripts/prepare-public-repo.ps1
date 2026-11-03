# prepare-public-repo.ps1
#
# Erstellt aus dem Arbeits-Repo einen sauberen, oeffentlichen Ordner OHNE Git-Historie
# und ohne lokale/entwicklungsspezifische Dateien, initialisiert dort ein frisches
# Git-Repo (Branch main), setzt Name/E-Mail NUR lokal in diesem Repo, legt den Remote
# an und macht den ersten Commit "SpoolStation 1.0.0". Es wird NICHT gepusht – das
# machst du danach selbst (siehe docs/RELEASING.de.md bzw. die Schritt-fuer-Schritt-Anleitung).
#
# Aufruf (PowerShell, im Arbeits-Repo):
#   powershell -ExecutionPolicy Bypass -File scripts\prepare-public-repo.ps1

$ErrorActionPreference = 'Stop'

# Quelle = dieses Repo (ein Ordner ueber scripts\), Ziel = Schwesterordner "spoolstation".
$src = Split-Path -Parent $PSScriptRoot
$parent = Split-Path -Parent $src
$dst = Join-Path $parent 'spoolstation'

Write-Host "Quelle: $src"
Write-Host "Ziel:   $dst"
Write-Host ""

# Remote aus update.config.json ableiten (einzige Quelle fuer owner/repo).
$remoteUrl = 'https://github.com/schmutzskuz/spoolstation.git'
try {
  $cfg = Get-Content (Join-Path $src 'update.config.json') -Raw | ConvertFrom-Json
  if ($cfg.owner -and $cfg.repo) { $remoteUrl = "https://github.com/$($cfg.owner)/$($cfg.repo).git" }
} catch { }
Write-Host "Remote: $remoteUrl"

# Zielordner vorbereiten.
if (Test-Path $dst) {
  $answer = Read-Host "Zielordner existiert bereits. Komplett loeschen und neu erstellen? (j/N)"
  if ($answer -ne 'j' -and $answer -ne 'J') { Write-Host "Abgebrochen."; exit 1 }
  Remove-Item $dst -Recurse -Force
}
New-Item -ItemType Directory -Path $dst | Out-Null

# Kopieren mit robocopy. Ausgeschlossen werden Historie, Abhaengigkeiten, Build-Ordner,
# Screenshots, lokale Debug-/Editor-Dateien und das reference/-Verzeichnis.
$excludeDirs = @(
  '.git', '.claude', '.vscode',
  'node_modules', '.pio', '.pioenvs', '.piolibdeps',
  'out', 'release', 'dist',
  '.shots', '.debug',
  'reference',
  (Join-Path $src 'desktop\resources\firmware')
)
$excludeFiles = @(
  '*.log', 'secrets.h', 'API.txt', '*.key', '*.secret',
  'AGENTS.md', '.DS_Store', 'Thumbs.db'
)

$roboArgs = @($src, $dst, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP')
$roboArgs += '/XD'; $roboArgs += $excludeDirs
$roboArgs += '/XF'; $roboArgs += $excludeFiles

Write-Host "Kopiere …"
& robocopy @roboArgs | Out-Null
# robocopy: Exitcodes 0-7 = Erfolg, >=8 = Fehler.
if ($LASTEXITCODE -ge 8) { throw "robocopy ist mit Code $LASTEXITCODE fehlgeschlagen." }

# reference/ zusaetzlich in .gitignore absichern (falls spaeter doch hineinkopiert).
$giPath = Join-Path $dst '.gitignore'
$gi = Get-Content $giPath -Raw -ErrorAction SilentlyContinue
if ($gi -notmatch '(?m)^\s*reference/\s*$') {
  Add-Content $giPath "`n# Lokale Referenz-/Archivdateien (nicht veroeffentlichen)`nreference/`nAGENTS.md`n"
}

# Commit-Identitaet (nur lokal in diesem Repo).
$defaultName = 'Florian'
$name = Read-Host "Git-Name fuer Commits [$defaultName]"
if ([string]::IsNullOrWhiteSpace($name)) { $name = $defaultName }
$email = Read-Host "GitHub-noreply-E-Mail (z. B. 12345+schmutzskuz@users.noreply.github.com)"
if ([string]::IsNullOrWhiteSpace($email)) { throw "E-Mail ist erforderlich." }

# Frisches Git-Repo anlegen.
Push-Location $dst
try {
  git init -b main | Out-Null
  git config user.name  $name
  git config user.email $email
  git add -A
  git commit -m "SpoolStation 1.0.0" | Out-Null
  git remote add origin $remoteUrl
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Fertig. Sauberes Repo liegt unter:" -ForegroundColor Green
Write-Host "  $dst"
Write-Host ""
Write-Host "Naechste Schritte:"
Write-Host "  1. In den Ordner wechseln:  cd `"$dst`""
Write-Host "  2. Hochladen:               git push -u origin main"
Write-Host "  (Details in docs/RELEASING.de.md)"
