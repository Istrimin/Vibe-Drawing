$lines = Get-Content 'c:/Dev/Lib/Vibe-Drawing/Vibe-Drawing/js/main.js'
# Check line 790 (index 789 since 0-indexed)
$line790 = $lines[789]
Write-Output "Line 790 content:"
Write-Output $line790
Write-Output "---"
Write-Output "Line 789:"
$lines[788]
Write-Output "---"
Write-Output "Line 791:"
$lines[790]

