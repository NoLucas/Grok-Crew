# Keep one TTS model in Videos\Grok Crew\voice-models — the same folder the
# packaged sidecar reads. If that model is already on this PC, skip.
# A failed download must not stop the program install.
param(
  [Parameter(Mandatory = $true)][string]$ModelId,
  [Parameter(Mandatory = $true)][string]$Catalog
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
} catch {
}

function Write-VoiceError([string]$Message) {
  try {
    $errFile = Join-Path (Split-Path -Parent $Catalog) "voice-error.txt"
    Set-Content -LiteralPath $errFile -Value $Message -Encoding UTF8
  } catch {
  }
}

function Finish([int]$Code, [string]$Message) {
  if ($Message) {
    Write-Host $Message
    if ($Code -ne 0) { Write-VoiceError $Message }
  }
  exit 0
}

if (-not (Test-Path -LiteralPath $Catalog)) {
  Finish 0 "Voice catalog is missing. Continue the program install."
}

$catalog = Get-Content -LiteralPath $Catalog -Raw -Encoding UTF8 | ConvertFrom-Json
$known = @("kokoro-82m", "step-audio-editx", "zonos-v0.1")
$id = ([string]$ModelId).Trim().ToLowerInvariant()
if ($known -notcontains $id) {
  $id = [string]$catalog.default
}
if ($known -notcontains $id) {
  $id = "kokoro-82m"
}

$item = $catalog.models.$id
if (-not $item) {
  Finish 0 "Unknown voice model: $id. Continue the program install."
}

function VoiceRoots {
  $names = New-Object System.Collections.Generic.List[string]
  foreach ($base in @(
    [Environment]::GetFolderPath("MyVideos"),
    [Environment]::GetFolderPath("CommonVideos"),
    (Join-Path $env:USERPROFILE "Videos"),
    (Join-Path $env:USERPROFILE "OneDrive\Videos"),
    (Join-Path $env:USERPROFILE "OneDrive\문서\Videos"),
    (Join-Path $env:PUBLIC "Videos")
  )) {
    if (-not $base) { continue }
    $root = Join-Path (Join-Path $base ([string]$catalog.workspaceFolder)) "voice-models"
    if (-not $names.Contains($root)) { $names.Add($root) }
  }
  return $names
}

function HasNamed([string]$folder, $names) {
  foreach ($name in @($names)) {
    if ($name -and (Test-Path -LiteralPath (Join-Path $folder ([string]$name)))) {
      return $true
    }
  }
  return $false
}

function VoiceAlreadyKept([string]$folder, $entry) {
  if (-not (Test-Path -LiteralPath $folder)) { return $false }
  if (Test-Path -LiteralPath (Join-Path $folder "chosen.json")) { return $true }
  $active = Join-Path (Split-Path -Parent $folder) "active.json"
  if (Test-Path -LiteralPath $active) {
    try {
      $payload = Get-Content -LiteralPath $active -Raw -Encoding UTF8 | ConvertFrom-Json
      if ([string]$payload.active -eq $id -and [bool]$payload.chosen) { return $true }
    } catch {
    }
  }
  if (HasNamed $folder @($entry.files)) { return $true }
  if (HasNamed $folder @($entry.weight_files)) { return $true }
  if (HasNamed $folder @($entry.fallbacks)) { return $true }
  $found = Get-ChildItem -LiteralPath $folder -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -in ".pth", ".pt", ".safetensors", ".onnx" -and $_.Length -gt 1024 }
  return [bool]$found
}

$roots = VoiceRoots
$primary = $roots[0]
$modelDir = Join-Path $primary $id
$activePath = Join-Path $primary "active.json"

foreach ($root in $roots) {
  $candidate = Join-Path $root $id
  if (VoiceAlreadyKept $candidate $item) {
    $modelDir = $candidate
    $activePath = Join-Path $root "active.json"
    break
  }
}

function Write-Active([string]$activeId, [string]$ErrorText) {
  $dir = Split-Path -Parent $activePath
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $payload = @{
    schema = [string]$catalog.schema
    active = $activeId
    chosen = $true
    error  = [string]$ErrorText
  } | ConvertTo-Json -Compress
  Set-Content -LiteralPath $activePath -Value ($payload + "`n") -Encoding UTF8
}

function CandidateUrls([string]$Url) {
  if ($Url -match "\?") { return @($Url) }
  return @(($Url + "?download=true"), $Url)
}

function Download-File([string]$Url, [string]$Dest) {
  $parent = Split-Path -Parent $Dest
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  $part = "$Dest.part"
  $ua = [string]$catalog.userAgent
  $last = ""
  foreach ($tryUrl in (CandidateUrls $Url)) {
    if (Test-Path -LiteralPath $part) { Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue }
    $curl = Join-Path $env:SystemRoot "System32\curl.exe"
    try {
      if (Test-Path -LiteralPath $curl) {
        & $curl -L --fail --retry 2 --connect-timeout 30 --max-time 7200 --user-agent $ua -o $part $tryUrl
        if ($LASTEXITCODE -ne 0) {
          if (Test-Path -LiteralPath $part) { Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue }
          throw "curl failed for $tryUrl"
        }
      } else {
        $request = [System.Net.HttpWebRequest]::Create($tryUrl)
        $request.UserAgent = $ua
        $request.AllowAutoRedirect = $true
        $request.Timeout = 120000
        $request.ReadWriteTimeout = 7200000
        $response = $request.GetResponse()
        try {
          $input = $response.GetResponseStream()
          $output = [System.IO.File]::Open($part, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
          try {
            $input.CopyTo($output)
          } finally {
            $output.Dispose()
            $input.Dispose()
          }
        } finally {
          $response.Dispose()
        }
      }
      if (Test-Path -LiteralPath $Dest) { Remove-Item -LiteralPath $Dest -Force }
      Move-Item -LiteralPath $part -Destination $Dest
      return
    } catch {
      $last = [string]$_.Exception.Message
    }
  }
  throw $last
}

if (VoiceAlreadyKept $modelDir $item) {
  Write-Active $id ""
  Finish 0 "Voice $id is already on this PC. Skip download."
}

New-Item -ItemType Directory -Force -Path $modelDir | Out-Null

$saved = 0
$lastError = ""
$required = @()
foreach ($name in @($item.files)) { if ($name) { $required += [string]$name } }
foreach ($name in @($item.weight_files)) { if ($name) { $required += [string]$name } }
$hf = [string]$catalog.hfResolve
foreach ($name in $required) {
  $url = $hf.Replace("{repo}", [string]$item.repo).Replace("{name}", $name)
  $dest = Join-Path $modelDir $name
  if (Test-Path -LiteralPath $dest) { continue }
  try {
    Write-Host "Downloading $name"
    Download-File $url $dest
    $saved += (Get-Item -LiteralPath $dest).Length
    $lastError = ""
  } catch {
    $lastError = [string]$_.Exception.Message
    if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Force -ErrorAction SilentlyContinue }
  }
}

if (-not (VoiceAlreadyKept $modelDir $item)) {
  foreach ($name in @($item.fallbacks)) {
    if (-not $name) { continue }
    $dest = Join-Path $modelDir ([string]$name)
    if (Test-Path -LiteralPath $dest) { break }
    $url = $hf.Replace("{repo}", [string]$item.repo).Replace("{name}", [string]$name)
    try {
      Write-Host "Downloading fallback $name"
      Download-File $url $dest
      $saved += (Get-Item -LiteralPath $dest).Length
      $lastError = ""
      break
    } catch {
      $lastError = [string]$_.Exception.Message
      if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Force -ErrorAction SilentlyContinue }
    }
  }
}

if (VoiceAlreadyKept $modelDir $item) {
  $receipt = @{
    schema = [string]$catalog.schema
    id     = $id
    label  = [string]$item.label
    repo   = [string]$item.repo
    bytes  = $saved
  } | ConvertTo-Json -Compress
  Set-Content -LiteralPath (Join-Path $modelDir "chosen.json") -Value ($receipt + "`n") -Encoding UTF8
  Write-Active $id ""
  Finish 0 "Voice $id is ready."
}

Finish 0 "Could not download $id. Continue the program install. $lastError"
