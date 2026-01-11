$content = Get-Content 'c:/Dev/Lib/Vibe-Drawing/Vibe-Drawing/js/main.js' -Raw
$openParens = ($content.ToCharArray() | Where-Object { $_ -eq '(' }).Count
$closeParens = ($content.ToCharArray() | Where-Object { $_ -eq ')' }).Count
Write-Output "Open parentheses: $openParens"
Write-Output "Close parentheses: $closeParens"
Write-Output "Difference: $($openParens - $closeParens)"

