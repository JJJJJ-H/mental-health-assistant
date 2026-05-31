. "$PSScriptRoot\Initialize-DevShell.ps1"

$pathKeys = [System.Environment]::GetEnvironmentVariables().Keys |
  Where-Object { $_ -cmatch "^(Path|PATH)$" }

Write-Output "PATH_KEYS=$($pathKeys -join ',')"
Write-Output "CODE_PAGE=$(& "$env:SystemRoot\System32\chcp.com")"
Write-Output "GIT=$((Get-Command git).Source)"
Write-Output "NODE=$((Get-Command node).Source)"
Write-Output "RG=$((Get-Command rg).Source)"
rg --version | Select-Object -First 1

$samplePath = "$PSScriptRoot\..\knowledge\sleep-hygiene.md"
$defaultRead = (Get-Content $samplePath -TotalCount 4) -join "`n"
$utf8Read = (Get-Content $samplePath -Encoding utf8 -TotalCount 4) -join "`n"
if ($defaultRead -cne $utf8Read) {
  throw "UTF-8 file reading is not configured correctly."
}

$process = Start-Process -FilePath "$env:SystemRoot\System32\cmd.exe" `
  -ArgumentList "/c", "exit 0" `
  -WindowStyle Hidden `
  -PassThru `
  -Wait

if ($process.ExitCode -ne 0) {
  throw "Start-Process failed with exit code $($process.ExitCode)."
}

Write-Output "START_PROCESS_EXIT=$($process.ExitCode)"
Write-Output "DEV_SHELL_OK"
