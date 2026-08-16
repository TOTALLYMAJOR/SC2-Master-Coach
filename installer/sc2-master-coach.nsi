Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"

!define APPNAME "SC2 Master Coach"
!define COMPANY "MBMapps"
!define VERSION "1.3.1"
!define EXE "SC2 Master Coach.exe"
!define APPID "SC2MasterCoach"

Name "${APPNAME}"
OutFile "${__FILEDIR__}\out\SC2-Master-Coach-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\${APPNAME}"
RequestExecutionLevel user
SetCompressor /SOLID lzma
VIProductVersion "1.3.1.0"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "CompanyName" "${COMPANY}"
VIAddVersionKey "FileDescription" "SC2 tactical coaching and replay intelligence"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"

!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch SC2 Master Coach"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Function EnsureWebView2
  ClearErrors
  SetRegView 32
  ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${If} $0 == ""
    ReadRegStr $0 HKLM "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${EndIf}
  ${If} $0 == ""
    DetailPrint "Installing Microsoft Edge WebView2 Runtime..."
    InitPluginsDir
    SetOutPath "$PLUGINSDIR"
    File /oname=MicrosoftEdgeWebview2Setup.exe "${__FILEDIR__}\MicrosoftEdgeWebview2Setup.exe"
    ExecWait '"$PLUGINSDIR\MicrosoftEdgeWebview2Setup.exe" /silent /install'
  ${Else}
    DetailPrint "WebView2 Runtime detected: $0"
  ${EndIf}
FunctionEnd

Section "Install"
  Call EnsureWebView2
  SetOutPath "$INSTDIR"
  File /r "${__FILEDIR__}\..\dist\SC2 Master Coach\*.*"

  CreateDirectory "$SMPROGRAMS\${APPNAME}"
  CreateShortcut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\${EXE}"
  CreateShortcut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\${EXE}"

  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPID}" "DisplayName" "${APPNAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPID}" "Publisher" "${COMPANY}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPID}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPID}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPID}" "InstallLocation" "$INSTDIR"

  ; Double-clicking a .SC2Replay launches directly into Replay Intelligence.
  WriteRegStr HKCU "Software\Classes\.SC2Replay" "" "SC2MasterCoach.Replay"
  WriteRegStr HKCU "Software\Classes\SC2MasterCoach.Replay" "" "StarCraft II Replay"
  WriteRegStr HKCU "Software\Classes\SC2MasterCoach.Replay\shell\open\command" "" '"$INSTDIR\${EXE}" "%1"'
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\${APPNAME}.lnk"
  Delete "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk"
  RMDir "$SMPROGRAMS\${APPNAME}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPID}"
  DeleteRegKey HKCU "Software\Classes\SC2MasterCoach.Replay"
  DeleteRegKey HKCU "Software\Classes\.SC2Replay"
  RMDir /r "$INSTDIR"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
SectionEnd
