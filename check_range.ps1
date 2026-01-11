$lines = Get-Content 'c:/Dev/Lib/Vibe-Drawing/Vibe-Drawing/js/main.js'
# Check lines 780-800
for ($i = 779; $i -le 800; $i++) {
    Write-Output "$($i+1): $($lines[$i])"
}

