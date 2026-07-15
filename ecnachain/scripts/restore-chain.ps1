param(
    [Parameter(Mandatory = $true)][string]$Archive,
    [string]$Dest = ""
)
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $Dest) { $Dest = Join-Path $Root "data\validator1" }
$Chaindata = Join-Path $Dest "geth\chaindata"
if (Test-Path $Chaindata) {
    Write-Error "Refusing to overwrite $Chaindata — remove or pick another DEST."
    exit 1
}
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
tar -xzf $Archive -C $Dest
Write-Host "Restored into $Dest — genesis must match backup."
