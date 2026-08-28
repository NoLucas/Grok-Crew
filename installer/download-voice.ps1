# Downloads one TTS model into Videos\Grok Crew\voice-models — the same
# folder the packaged sidecar reads. Skip when that model is already there.
# Do not start a download until the installer calls this with a model id.
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
  $errFile = Join-Path (Split-Path -Parent $Catalog) "voice-error.txt"
  Set-Content -LiteralPath $errFile -Value $Message -Encoding UTF8
}

function Fail([string]$Message) {
  Write-VoiceError $Message
  Write-Error $Message
  exit 1
}

if (-not (Test-Path -LiteralPath $Catalog)) {
  Fail "Voice catalog is missing."
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
  Fail "Unknown voice model: $id"
}

$videos = [Environment]::GetFolderPath("MyVideos")
if (-not $videos) {
  $videos = Join-Path $env:USERPROFILE "Videos"
}
$root = Join-Path (Join-Path $videos ([string]$catalog.workspaceFolder)) "voice-models"
$modelDir = Join-Path $root $id
$activePath = Join-Path $root "active.json"
New-Item -ItemType Directory -Force -Path $modelDir | Out-Null

function RequiredNames($entry) {
  $names = @()
  foreach ($name in @($entry.files)) {
    if ($name) { $names += [string]$name }
  }
  foreach ($name in @($entry.weight_files)) {
    if ($name) { $names += [string]$name }
  }
  return $names
}

function HasAny([string]$folder, $names) {
  foreach ($name in @($names)) {
    if ($name -and (Test-Path -LiteralPath (Join-Path $folder ([string]$name)))) {
      return $true
    }
  }
  return $false
}

function HasAll([string]$folder, $names) {
  foreach ($name in @($names)) {
    if ($name -and -not (Test-Path -LiteralPath (Join-Path $folder ([string]$name)))) {
      return $false
    }
  }
  return $true
}

function ModelReady([string]$folder, $entry) {
  if (-not (HasAll $folder @($entry.files))) { return $false }
  $weights = @($entry.weight_files)
  if ($weights.Count -eq 0) { return $true }
  return (HasAny $folder $weights) -or (HasAny $folder @($entry.fallbacks))
}

function Write-Active([string]$activeId) {
  $payload = @{
    schema = [string]$catalog.schema
    active = $activeId
    chosen = $true
    error  = ""
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

if (ModelReady $modelDir $item) {
  Write-Host "Voice $id is already on this PC. Skip download."
  Write-Active $id
  exit 0
}

$saved = 0
$lastError = ""
$required = RequiredNames $item
$hf = [string]$catalog.hfResolve
foreach ($name in $required) {
  $url = $hf.Replace("{repo}", [string]$item.repo).Replace("{name}", $name)
  $dest = Join-Path $modelDir $name
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

if (-not (ModelReady $modelDir $item)) {
  foreach ($name in @($item.fallbacks)) {
    if (-not $name) { continue }
    $url = $hf.Replace("{repo}", [string]$item.repo).Replace("{name}", [string]$name)
    $dest = Join-Path $modelDir ([string]$name)
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

$receipt = @{
  schema = [string]$catalog.schema
  id     = $id
  label  = [string]$item.label
  repo   = [string]$item.repo
  bytes  = $saved
} | ConvertTo-Json -Compress
Set-Content -LiteralPath (Join-Path $modelDir "chosen.json") -Value ($receipt + "`n") -Encoding UTF8

if (-not (ModelReady $modelDir $item)) {
  Write-Active $id
  Fail "Could not download $id. $lastError"
}

Write-Active $id
Write-Host "Voice $id is ready."
exit 0
