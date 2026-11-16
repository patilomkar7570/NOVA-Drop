Add-Type -AssemblyName System.Drawing

$inputPath = "C:\Users\dudha\.gemini\antigravity\brain\bd8b4d22-1384-46d9-82cb-c11959995aab\.user_uploaded\media_1794323214440_cac32439.png"
$outputPathIco = Join-Path $PSScriptRoot "..\logo.ico"
$outputPathBoxPng = Join-Path $PSScriptRoot "..\client\public\logo-box.png"
$outputPathServerBoxPng = Join-Path $PSScriptRoot "..\server\public\logo-box.png"

$src = [System.Drawing.Bitmap]::FromFile($inputPath)

# Create 256x256 high-res boxed canvas
$size = 256
$dest = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($dest)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Draw crisp white square with gentle rounded corners (radius 48 for modern tile look)
$rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
$cornerRad = 44
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc(0, 0, $cornerRad * 2, $cornerRad * 2, 180, 90)
$path.AddArc($size - $cornerRad * 2, 0, $cornerRad * 2, $cornerRad * 2, 270, 90)
$path.AddArc($size - $cornerRad * 2, $size - $cornerRad * 2, $cornerRad * 2, $cornerRad * 2, 0, 90)
$path.AddArc(0, $size - $cornerRad * 2, $cornerRad * 2, $cornerRad * 2, 90, 90)
$path.CloseFigure()

$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$g.FillPath($brush, $path)

# Draw black symbol with padding (e.g. 24px padding so it fits harmoniously)
$pad = 28
$innerRect = New-Object System.Drawing.Rectangle $pad, $pad, ($size - $pad * 2), ($size - $pad * 2)
$g.DrawImage($src, $innerRect)

$g.Dispose()
$src.Dispose()

# Save PNGs
$dest.Save($outputPathBoxPng, [System.Drawing.Imaging.ImageFormat]::Png)
$dest.Save($outputPathServerBoxPng, [System.Drawing.Imaging.ImageFormat]::Png)

# Save ICO
$hIcon = $dest.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream $outputPathIco, ([System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$dest.Dispose()

Write-Host "Created boxed logo.ico and logo-box.png successfully!"
