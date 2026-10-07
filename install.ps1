# threads-autopilot installer for Windows (PowerShell 5.1+).
# Usage: irm https://raw.githubusercontent.com/mur4i/threads-autopilot/main/install.ps1 | iex
param([string]$HomeDir = $env:USERPROFILE, [switch]$SkipTools, [switch]$SkipLogin, [switch]$NoShortcut)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$repoZip = 'https://github.com/mur4i/threads-autopilot/archive/refs/heads/main.zip'

function Step($text) { Write-Host "`n> $text" -ForegroundColor Cyan }
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function RefreshPath {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
function WingetInstall($id, $name) {
  if (-not (Has 'winget')) { throw "winget not found. Install $name by hand and run this again." }
  Write-Host "  installing $name (winget $id)..."
  winget install --id $id -e --accept-source-agreements --accept-package-agreements --silent | Out-Host
  RefreshPath
}

if (-not $SkipTools) {
  Step 'Checking tools'
  if (Has 'node') { Write-Host "  Node $(node -v) ok" } else { WingetInstall 'OpenJS.NodeJS.LTS' 'Node.js' }
  if (-not (Has 'node')) { throw 'Node.js is still not on PATH. Close this window, open a new PowerShell and run the command again.' }
  if (Has 'agy') { Write-Host '  Antigravity CLI (agy) ok' } else { WingetInstall 'Google.AntigravityCLI' 'Antigravity CLI' }
  $browsers = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  )
  if (-not ($browsers | Where-Object { Test-Path $_ })) { throw 'No Chrome or Edge found. Install Google Chrome and run this again.' }
  Write-Host '  browser ok'
}

Step 'Downloading the skill'
$tmp = Join-Path $env:TEMP "threads-autopilot-$(Get-Random)"
New-Item -ItemType Directory -Path $tmp | Out-Null
Invoke-WebRequest -Uri $repoZip -OutFile "$tmp\skill.zip" -UseBasicParsing
Expand-Archive "$tmp\skill.zip" -DestinationPath $tmp
$src = Get-ChildItem $tmp -Directory | Select-Object -First 1

# agy CLI, Antigravity IDE and other agents that read ~/.agents/skills.
$targets = @('.gemini\config\skills', '.gemini\antigravity\skills', '.agents\skills') | ForEach-Object { Join-Path $HomeDir "$_\threads-autopilot" }
foreach ($t in $targets) {
  if (Test-Path $t) { Remove-Item $t -Recurse -Force }
  New-Item -ItemType Directory -Path $t -Force | Out-Null
  Copy-Item "$($src.FullName)\*" $t -Recurse -Force
  Write-Host "  installed in $t"
}
Remove-Item $tmp -Recurse -Force

if (-not $SkipLogin) {
  Step 'Sign in to Threads'
  Write-Host '  A browser window will open. Sign in with your account, then CLOSE the window.' -ForegroundColor Yellow
  Push-Location $targets[0]
  try { node scripts/login.mjs } finally { Pop-Location }
}

if (-not $NoShortcut -and (Has 'agy')) {
  Step 'Creating the desktop shortcut'
  # Explorer may still hold the old PATH, so the launcher pins where node and agy live.
  # Paths go through %VARS% so a non-ASCII user name survives cmd's code page.
  function EnvPath($p) {
    foreach ($v in 'LOCALAPPDATA', 'APPDATA', 'USERPROFILE', 'ProgramFiles') {
      $value = [Environment]::GetEnvironmentVariable($v)
      if ($value -and $p.StartsWith($value, [StringComparison]::OrdinalIgnoreCase)) { return "%$v%" + $p.Substring($value.Length) }
    }
    $p
  }
  $agy = (Get-Command agy).Source
  $nodeDir = Split-Path (Get-Command node).Source
  $launcherDir = Join-Path $HomeDir '.config\threads-autopilot'
  New-Item -ItemType Directory -Path $launcherDir -Force | Out-Null
  $launcher = Join-Path $launcherDir 'open-agy.cmd'
  Set-Content -Path $launcher -Encoding ASCII -Value @(
    '@echo off',
    'title Threads Autopilot',
    "set `"PATH=$(EnvPath $nodeDir);$(EnvPath (Split-Path $agy));%PATH%`"",
    'cd /d "%~dp0..\.."',
    'echo Ask anything, for example: post "hello from my agent" on Threads',
    'echo.',
    "`"$(EnvPath $agy)`""
  )
  $desktop = if ($HomeDir -eq $env:USERPROFILE) { [Environment]::GetFolderPath('Desktop') } else { Join-Path $HomeDir 'Desktop' }
  New-Item -ItemType Directory -Path $desktop -Force | Out-Null
  $shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop 'Threads Autopilot.lnk'))
  $shortcut.TargetPath = $env:ComSpec
  $shortcut.Arguments = "/k `"$launcher`""
  $shortcut.WorkingDirectory = $HomeDir
  $shortcut.IconLocation = "$agy,0"
  $shortcut.Save()
  Write-Host '  "Threads Autopilot" is on your desktop'
}

Step 'Done'
Write-Host '  Double-click "Threads Autopilot" on your desktop and ask: post "hello from my agent" on Threads'
Write-Host '  The agent shows you a preview and only posts after you say yes.'
