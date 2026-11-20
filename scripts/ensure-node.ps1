# Ensure Node.js is available on Windows (winget fallback).
$ErrorActionPreference = 'Stop'

function Log-Bootstrap([string]$Message) {
    $ts = (Get-Date).ToUniversalTime().ToString('HH:mm:ss')
    Write-Host "[bootstrap $ts] $Message"
}

if (Get-Command node -ErrorAction SilentlyContinue) {
    Log-Bootstrap ("Node $(node -v), npm $(npm -v) — already installed, skipping.")
    exit 0
}

Log-Bootstrap 'Node.js not found; installing via winget (download uses network; CPU may stay low).'
$winget = Get-Command winget -ErrorAction SilentlyContinue
if (-not $winget) {
    Write-Error 'winget is not available. Install Node.js from https://nodejs.org/'
    exit 1
}

Log-Bootstrap 'Running winget install OpenJS.NodeJS.LTS...'
& winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements

$paths = @(
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:LocalAppData\Programs\nodejs\node.exe"
)
foreach ($p in $paths) {
    if (Test-Path $p) {
        $dir = Split-Path $p
        $env:PATH = "$dir;$env:PATH"
        break
    }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error 'Node was installed but is not on PATH in this shell. Open a new terminal and run again.'
    exit 1
}

Log-Bootstrap ("Node install done: Node " + (node -v) + ", npm " + (npm -v))
