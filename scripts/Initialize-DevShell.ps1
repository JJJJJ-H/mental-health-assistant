$rgDir = Join-Path $HOME ".local\tools\ripgrep\ripgrep-15.1.0-x86_64-pc-windows-msvc"
$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")

Remove-Item Env:PATH -ErrorAction SilentlyContinue
$env:Path = (@($rgDir, $machinePath, $userPath) | Where-Object { $_ }) -join ";"

& "$env:SystemRoot\System32\chcp.com" 65001 | Out-Null
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$global:OutputEncoding = [Console]::OutputEncoding

$global:PSDefaultParameterValues["Get-Content:Encoding"] = "utf8"
$global:PSDefaultParameterValues["Set-Content:Encoding"] = "utf8"
$global:PSDefaultParameterValues["Out-File:Encoding"] = "utf8"
