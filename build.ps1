Set-Location $PSScriptRoot
$content = Get-Content src/head.html -Raw -Encoding UTF8
Get-ChildItem src/js/[0-9]*.js | Sort-Object Name | ForEach-Object {
    $content += Get-Content $_.FullName -Raw -Encoding UTF8
}
$content += Get-Content src/tail.html -Raw -Encoding UTF8
[System.IO.File]::WriteAllText("$PSScriptRoot/eft-tool.html", $content, [System.Text.UTF8Encoding]::new($false))
Write-Host "Build complete: eft-tool.html"
