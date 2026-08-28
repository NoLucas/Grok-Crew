; Pick one TTS before app files copy. Opening the exe must not start a download.
; Same on-disk ids as local_studio/voice_models.py. Skip when files already exist.

!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "WinMessages.nsh"

!ifndef BST_CHECKED
  !define BST_CHECKED 1
!endif

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

Function grokCrewDownloadVoice
  Call grokCrewExtractVoiceTools
  DetailPrint "Keeping voice $GrokCrewVoiceModel on this PC (Videos\Grok Crew\voice-models)."
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\download-voice.ps1" -ModelId "$GrokCrewVoiceModel" -Catalog "$PLUGINSDIR\voice-catalog.json"'
  Pop $GrokCrewVoiceCode
FunctionEnd

Function grokCrewVoicePage
  !insertmacro MUI_HEADER_TEXT "이 PC의 목소리 / Voice for this PC" "고른 뒤에만 받습니다. 그다음 프로그램 파일을 복사합니다."
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

  ${NSD_CreateLabel} 0 74u 100% 28u "이미 Videos\Grok Crew\voice-models 에 같은 모델이 있으면 다시 받지 않습니다. 받기 실패면 설치를 끝내지 않습니다. Same files already on disk are skipped. A failed download stops the install."
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

  grokCrewVoiceTry:
    Call grokCrewDownloadVoice
    ${If} $GrokCrewVoiceCode == 0
      Return
    ${EndIf}
    MessageBox MB_ABORTRETRYIGNORE|MB_ICONEXCLAMATION "그 목소리를 이 PC에 두지 못했습니다. 다시 받기 / 다른 모델 / 설치 취소. Could not keep that voice. Retry, pick another (Ignore), or cancel (Abort)." IDABORT grokCrewVoiceStop IDRETRY grokCrewVoiceTry
    Abort
  grokCrewVoiceStop:
    Quit
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
    ${If} $GrokCrewVoiceCode != 0
      DetailPrint "Silent voice download failed. Installer will not finish."
      Abort
    ${EndIf}
  grokCrewSkipSilentVoice:
!macroend
