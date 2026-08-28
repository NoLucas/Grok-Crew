; Pick one TTS before app files copy. Opening the exe must not start a download.
; Same on-disk ids as local_studio/voice_models.py. Skip when files already exist.
; A failed download must not stop the program install.

!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "WinMessages.nsh"

!ifndef BST_CHECKED
  !define BST_CHECKED 1
!endif

!ifndef BUILD_UNINSTALLER
Var GrokCrewVoiceDialog
Var GrokCrewVoiceKokoro
Var GrokCrewVoiceStep
Var GrokCrewVoiceZonos
Var GrokCrewVoiceModel
Var GrokCrewVoiceCode

!macro customInit
  StrCpy $GrokCrewVoiceModel "kokoro-82m"
!macroend

Function grokCrewExtractVoiceTools
  InitPluginsDir
  File /oname=$PLUGINSDIR\voice-catalog.json "${PROJECT_DIR}\installer\voice-catalog.json"
  File /oname=$PLUGINSDIR\download-voice.ps1 "${PROJECT_DIR}\installer\download-voice.ps1"
FunctionEnd

Function grokCrewRunVoiceScript
  Pop $0
  nsExec::Exec '"$0" -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\download-voice.ps1" -ModelId "$GrokCrewVoiceModel" -Catalog "$PLUGINSDIR\voice-catalog.json"'
  Pop $GrokCrewVoiceCode
FunctionEnd

Function grokCrewDownloadVoice
  Call grokCrewExtractVoiceTools
  Delete "$PLUGINSDIR\voice-error.txt"
  DetailPrint "Keeping voice $GrokCrewVoiceModel on this PC if it is not already there."
  ; Custom page has no install log yet. ExecToLog can fail before PowerShell runs.
  Push "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe"
  Call grokCrewRunVoiceScript
  ${If} $GrokCrewVoiceCode == 0
    Return
  ${EndIf}
  Push "$WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
  Call grokCrewRunVoiceScript
  ${If} $GrokCrewVoiceCode == 0
    Return
  ${EndIf}
  Push "powershell.exe"
  Call grokCrewRunVoiceScript
FunctionEnd

Function grokCrewVoicePage
  nsDialogs::Create 1018
  Pop $GrokCrewVoiceDialog
  ${If} $GrokCrewVoiceDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "어떤 TTS를 이 PC에 둘까요? exe를 연 것만으로는 받지 않습니다. 다음(그대로)은 Kokoro-82M입니다. Which voice should this PC keep? Opening the exe did not start a download."
  Pop $0

  ${NSD_CreateRadioButton} 0 28u 100% 12u "Kokoro-82M  — 기본 / default · 가벼움 · 다음"
  Pop $GrokCrewVoiceKokoro
  ${NSD_CreateRadioButton} 0 42u 100% 12u "Step Audio EditX  — NVIDIA 그래픽 필요 / needs NVIDIA GPU"
  Pop $GrokCrewVoiceStep
  ${NSD_CreateRadioButton} 0 56u 100% 12u "Zonos-v0.1  — 강한 그래픽 · 큰 받기 / strong GPU · large download"
  Pop $GrokCrewVoiceZonos

  ${If} $GrokCrewVoiceModel == "step-audio-editx"
    ${NSD_Check} $GrokCrewVoiceStep
  ${ElseIf} $GrokCrewVoiceModel == "zonos-v0.1"
    ${NSD_Check} $GrokCrewVoiceZonos
  ${Else}
    ${NSD_Check} $GrokCrewVoiceKokoro
    StrCpy $GrokCrewVoiceModel "kokoro-82m"
  ${EndIf}

  ${NSD_CreateLabel} 0 74u 100% 36u "이미 Videos\Grok Crew\voice-models 에 있으면 받지 않고 넘어갑니다. 받기에 실패해도 프로그램은 설치됩니다. 책상에서 다시 받을 수 있습니다."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function grokCrewVoicePageLeave
  ${NSD_GetState} $GrokCrewVoiceKokoro $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $GrokCrewVoiceModel "kokoro-82m"
  ${EndIf}
  ${NSD_GetState} $GrokCrewVoiceStep $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $GrokCrewVoiceModel "step-audio-editx"
  ${EndIf}
  ${NSD_GetState} $GrokCrewVoiceZonos $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $GrokCrewVoiceModel "zonos-v0.1"
  ${EndIf}

  Call grokCrewDownloadVoice
  ; Never abort the program install because a voice file did not land.
FunctionEnd

!macro customPageAfterChangeDir
  Page custom grokCrewVoicePage grokCrewVoicePageLeave
!macroend

!macro customInstall
  IfSilent 0 grokCrewSkipSilentVoice
    ${If} $GrokCrewVoiceModel == ""
      StrCpy $GrokCrewVoiceModel "kokoro-82m"
    ${EndIf}
    Call grokCrewDownloadVoice
  grokCrewSkipSilentVoice:
!macroend
!endif
