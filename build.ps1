Set-Location $PSScriptRoot
# Discord raid-share Bot URL (env DISCORD_BOT_URL; never written in the source).
# If empty, the settings tab shows an input for the Bot URL instead.
#   e.g. $env:DISCORD_BOT_URL = 'https://...'; ./build.ps1
# (Keep this file ASCII-only: Windows PowerShell 5.1 reads BOM-less files as ANSI.)
$botUrl = "$env:DISCORD_BOT_URL".Trim().TrimEnd('/')
if ($botUrl) {
    if ($botUrl -notmatch '^(https://|http://localhost|http://127\.0\.0\.1)') { throw 'DISCORD_BOT_URL must start with https://' }
    if ($botUrl -match '[\s''"\\|&]') { throw 'DISCORD_BOT_URL contains an invalid character' }
}
$content = Get-Content src/head.html -Raw -Encoding UTF8
$js = ''
Get-ChildItem src/js/[0-9]*.js | Sort-Object Name | ForEach-Object {
    $js += Get-Content $_.FullName -Raw -Encoding UTF8
}
if ($botUrl) { $js = $js.Replace('__DISCORD_BOT_URL__', $botUrl); Write-Host "Discord Bot URL: embedded" }
else { Write-Host "Discord Bot URL: (not set)" }
$content += $js
$content += Get-Content src/tail.html -Raw -Encoding UTF8
[System.IO.File]::WriteAllText("$PSScriptRoot/eft-tool.html", $content, [System.Text.UTF8Encoding]::new($false))
Write-Host "Build complete: eft-tool.html"