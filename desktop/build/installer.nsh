; Schreibt die im Installer gewaehlte Sprache nach HKCU\Software\SpoolStation.
; Das PC-Programm liest diesen Wert beim ersten Start (siehe main/index.ts).
; $LANGUAGE ist die vom Nutzer gewaehlte NSIS-Sprach-LCID.

!include "LogicLib.nsh"

!macro customInstall
  ${If} $LANGUAGE == 1031
    WriteRegStr HKCU "Software\SpoolStation" "Language" "de"
  ${ElseIf} $LANGUAGE == 1034
    WriteRegStr HKCU "Software\SpoolStation" "Language" "es"
  ${Else}
    WriteRegStr HKCU "Software\SpoolStation" "Language" "en"
  ${EndIf}
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\SpoolStation"
!macroend
