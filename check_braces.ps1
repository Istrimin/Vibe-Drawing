$content = Get-Content 'c:/Dev/Lib/Vibe-Drawing/Vibe-Drawing/js/main.js' -Raw
$openBraces = ($content.ToCharArray() | Where-Object { $_ -eq '{' }).Count
$closeBraces = ($content.ToCharArray() | Where-Object { $_ -eq '}' }).Count
Write-Output "Open braces: $openBraces"
Write-Output "Close braces: $closeBraces"
Write-Output "Difference: $($openBraces - $closeBraces)"

