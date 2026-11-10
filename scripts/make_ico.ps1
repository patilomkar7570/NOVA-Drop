Add-Type -AssemblyName System.Drawing

$inputPath = Join-Path $PSScriptRoot "..\server\public\logo.png"
$outputPath = Join-Path $PSScriptRoot "..\logo.ico"

$bmp = [System.Drawing.Bitmap]::FromFile($inputPath)
$resized = New-Object System.Drawing.Bitmap $bmp, (New-Object System.Drawing.Size(256, 256))
$hIcon = $resized.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)

$fs = New-Object System.IO.FileStream $outputPath, ([System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()

Write-Host "Created $outputPath"
