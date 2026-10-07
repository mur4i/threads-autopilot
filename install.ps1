# threads-autopilot installer for Windows (PowerShell 5.1+).
# Usage: irm https://raw.githubusercontent.com/mur4i/threads-autopilot/main/install.ps1 | iex
param([string]$HomeDir = $env:USERPROFILE, [switch]$SkipTools, [switch]$SkipLogin, [switch]$NoShortcut)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$repoZip = 'https://github.com/mur4i/threads-autopilot/archive/refs/heads/main.zip'

# Keep this file ASCII (irm | iex breaks on a BOM): Portuguese accents are \uXXXX escapes.
$pt = (Get-Culture).Name -like 'pt*' -or (Get-UICulture).Name -like 'pt*'
function T($en, $ptText) { if ($pt) { [regex]::Unescape($ptText) } else { $en } }
function Step($text) { Write-Host "`n> $text" -ForegroundColor Cyan }
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function RefreshPath {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
function WingetInstall($id, $name) {
  if (-not (Has 'winget')) { throw (T "winget not found. Install $name by hand and run this again." "winget n\u00e3o encontrado. Instale o $name na m\u00e3o e rode de novo.") }
  Write-Host (T "  installing $name..." "  instalando $name...")
  winget install --id $id -e --accept-source-agreements --accept-package-agreements --silent | Out-Host
  RefreshPath
}

if (-not $SkipTools) {
  Step (T 'Checking tools' 'Conferindo os programas')
  if (Has 'node') { Write-Host "  Node $(node -v) ok" } else { WingetInstall 'OpenJS.NodeJS.LTS' 'Node.js' }
  if (-not (Has 'node')) { throw (T 'Node.js is still not found. Close this window and run the installer again.' 'O Node.js ainda n\u00e3o foi encontrado. Feche esta janela e rode o instalador de novo.') }
  if (Has 'agy') { Write-Host '  Antigravity CLI (agy) ok' } else { WingetInstall 'Google.AntigravityCLI' 'Antigravity CLI' }
  $browsers = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  )
  if (-not ($browsers | Where-Object { Test-Path $_ })) { throw (T 'No Chrome or Edge found. Install Google Chrome and run this again.' 'Nenhum Chrome ou Edge encontrado. Instale o Google Chrome e rode de novo.') }
  Write-Host (T '  browser ok' '  navegador ok')
}

Step (T 'Downloading the skill' 'Baixando a skill')
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
  Write-Host ((T '  installed in ' '  instalada em ') + $t)
}
Remove-Item $tmp -Recurse -Force

if (-not $SkipLogin) {
  Step (T 'Sign in to Threads' 'Login no Threads')
  Write-Host (T '  A browser window will open. Sign in with your account, then CLOSE the window.' '  Vai abrir uma janela do navegador. Entre com a sua conta e depois FECHE a janela.') -ForegroundColor Yellow
  Push-Location $targets[0]
  try { node scripts/login.mjs } finally { Pop-Location }
}

if (-not $NoShortcut -and (Has 'agy')) {
  Step (T 'Creating the desktop shortcut' 'Criando o atalho na \u00e1rea de trabalho')
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
  $intro = if ($pt) {
    @(
      'echo  Converse com a IA em portugu\u00eas, do jeito que voc\u00ea fala no WhatsApp.',
      'echo  Escreva o pedido e aperte Enter. Exemplos:',
      'echo.',
      'echo    posta no Threads: bom dia, pessoal!',
      'echo    responde o \u00faltimo post do @fulano dizendo: que massa!',
      'echo    curte e reposta este post: (cole o link do post)',
      'echo.',
      'echo  Antes de publicar, a IA mostra como vai ficar e pergunta se pode. Responda sim ou n\u00e3o.',
      'echo  Na primeira vez, ela pede pra voc\u00ea entrar com a sua conta Google.'
    ) | ForEach-Object { [regex]::Unescape($_) }
  } else {
    @(
      'echo  Talk to the AI in plain words and press Enter. Examples:',
      'echo.',
      'echo    post on Threads: good morning, everyone!',
      'echo    reply to the latest post by @someone saying: love it!',
      'echo    like and repost this post: (paste the post link)',
      'echo.',
      'echo  Before publishing, the AI shows a preview and asks you. Answer yes or no.',
      'echo  The first time, it asks you to sign in with your Google account.'
    )
  }
  # UTF-8 without BOM plus chcp 65001, so the Portuguese text shows right in cmd.
  $lines = @('@echo off', 'chcp 65001 >nul', 'title Threads Autopilot',
    "set `"PATH=$(EnvPath $nodeDir);$(EnvPath (Split-Path $agy));%PATH%`"",
    'cd /d "%~dp0..\.."', 'echo.') + $intro + @('echo.', "`"$(EnvPath $agy)`"")
  [IO.File]::WriteAllText($launcher, (($lines -join "`r`n") + "`r`n"), (New-Object Text.UTF8Encoding $false))
  $desktop = if ($HomeDir -eq $env:USERPROFILE) { [Environment]::GetFolderPath('Desktop') } else { Join-Path $HomeDir 'Desktop' }
  New-Item -ItemType Directory -Path $desktop -Force | Out-Null
  $shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop 'Threads Autopilot.lnk'))
  $shortcut.TargetPath = $env:ComSpec
  $shortcut.Arguments = "/k `"$launcher`""
  $shortcut.WorkingDirectory = $HomeDir
  $shortcut.IconLocation = "$agy,0"
  $shortcut.Save()
  Write-Host (T '  "Threads Autopilot" is on your desktop' '  O atalho "Threads Autopilot" est\u00e1 na \u00e1rea de trabalho')
}

Step (T 'Done' 'Pronto')
Write-Host (T '  Double-click "Threads Autopilot" on your desktop and ask, for example: post on Threads: good morning!' '  D\u00ea dois cliques em "Threads Autopilot" na \u00e1rea de trabalho e pe\u00e7a, por exemplo: posta no Threads: bom dia!')
Write-Host (T '  The AI shows you a preview and only posts after you say yes.' '  A IA mostra como vai ficar e s\u00f3 posta depois do seu sim.')
