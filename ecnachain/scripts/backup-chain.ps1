# Backs up Geth chaindata (PowerShell). Requires tar (Windows 10+).
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Src = if ($args[0]) { $args[0] } else { Join-Path $Root "data\validator1" }
$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $Root "backups" }
$Stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$Out = Join-Path $BackupDir "ecna-chaindata-$Stamp.tar.gz"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$Geth = Join-Path $Src "geth"
if (-not (Test-Path $Geth)) {
    Write-Error "No geth datadir at $Geth — start the node once first."
    exit 1
}
Push-Location $Src
try {
    tar -czf $Out geth
    Write-Host "Wrote $Out"
} finally {
    Pop-Location
}
