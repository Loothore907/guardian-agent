param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $PnpmArguments
)

$ErrorActionPreference = "Stop"
$workspaceBin = Join-Path (Get-Location) "node_modules\.bin"

function Add-WorkspaceBinToPath {
  if (Test-Path -LiteralPath $workspaceBin) {
    $env:Path = "$workspaceBin;$env:Path"
  }
}

$systemNode = Get-Command node -ErrorAction SilentlyContinue
$systemPnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if ($null -ne $systemNode -and $null -ne $systemPnpm) {
  Add-WorkspaceBinToPath
  & $systemPnpm.Source @PnpmArguments
  exit $LASTEXITCODE
}

$runtimeRoot = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies"
$nodeBin = Join-Path $runtimeRoot "node\bin"
$nodeExecutable = Join-Path $nodeBin "node.exe"
$pnpmExecutable = Join-Path $runtimeRoot "bin\fallback\pnpm.cmd"

if (-not (Test-Path -LiteralPath $nodeExecutable) -or -not (Test-Path -LiteralPath $pnpmExecutable)) {
  throw "Node.js and pnpm are unavailable. Install the versions documented in README.md."
}

$env:Path = "$nodeBin;$env:Path"
Add-WorkspaceBinToPath
if ([string]::IsNullOrEmpty($env:CI) -and [Console]::IsInputRedirected) {
  $env:CI = "true"
}
& $pnpmExecutable @PnpmArguments
exit $LASTEXITCODE
