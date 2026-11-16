param(
    [string]$SourcePath = "C:\Users\dudha\.gemini\antigravity\brain\bd8b4d22-1384-46d9-82cb-c11959995aab\.user_uploaded\media_1794836418242_10cd187e.png"
)

Add-Type -AssemblyName System.Drawing

Write-Host "Loading source image from $SourcePath..."
$sourceBmp = [System.Drawing.Bitmap]::FromFile($SourcePath)

# 1. Generate Transparent Logo: client/public/logo.png and server/public/logo.png
$transparent512 = New-Object System.Drawing.Bitmap(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gTrans = [System.Drawing.Graphics]::FromImage($transparent512)
$gTrans.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gTrans.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gTrans.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gTrans.Clear([System.Drawing.Color]::Transparent)

# Draw black glyph centered with slight padding (480x480 inside 512x512)
$gTrans.DrawImage($sourceBmp, 16, 16, 480, 480)
$gTrans.Dispose()

$transparent512.Save("client\public\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$transparent512.Save("server\public\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Created transparent logo: client/public/logo.png and server/public/logo.png"

# 2. Function to generate a White Box Tile with the Black Glyph
function Create-WhiteBoxIcon([int]$size, [float]$glyphScale = 0.70) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Rounded rectangle path for the white box
    $cornerRadius = [Math]::Round($size * 0.22)
    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $diameter = $cornerRadius * 2

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    # Fill White Box
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillPath($whiteBrush, $path)
    $whiteBrush.Dispose()

    # Subtle border for contrast on light backgrounds
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(35, 0, 0, 0), [Math]::Max(1.0, $size * 0.015))
    $g.DrawPath($borderPen, $path)
    $borderPen.Dispose()
    $path.Dispose()

    # Center the black glyph inside the white box
    $glyphSize = [Math]::Round($size * $glyphScale)
    $offset = [Math]::Round(($size - $glyphSize) / 2)
    $g.DrawImage($sourceBmp, $offset, $offset, $glyphSize, $glyphSize)

    $g.Dispose()
    return $bmp
}

# 3. Create 512x512 Boxed Logo PNG
$box512 = Create-WhiteBoxIcon 512 0.70
$box512.Save("client\public\logo-box.png", [System.Drawing.Imaging.ImageFormat]::Png)
$box512.Save("server\public\logo-box.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Created boxed logo: client/public/logo-box.png and server/public/logo-box.png"

# 4. Generate Multi-Resolution ICO file for Windows
$iconSizes = @(256, 128, 64, 48, 32, 16)
$iconBitmaps = @()
$pngStreams = @()

foreach ($sz in $iconSizes) {
    $bmp = Create-WhiteBoxIcon $sz 0.70
    $iconBitmaps += $bmp
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngStreams += $ms
}

# Write standard Windows .ICO header and directory entries
$icoStream = New-Object System.IO.FileStream("logo.ico", [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
$bw = New-Object System.IO.BinaryWriter($icoStream)

# ICONHEADER
$bw.Write([UInt16]0) # Reserved (must be 0)
$bw.Write([UInt16]1) # Type (1 for ICO)
$bw.Write([UInt16]$iconSizes.Count) # Number of images

# Calculate offset for first image data
$offset = 6 + ($iconSizes.Count * 16)

# ICONDIRENTRY for each size
for ($i = 0; $i -lt $iconSizes.Count; $i++) {
    $sz = $iconSizes[$i]
    $stream = $pngStreams[$i]
    $dataLen = [UInt32]$stream.Length

    $widthByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $heightByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }

    $bw.Write($widthByte)     # Width
    $bw.Write($heightByte)    # Height
    $bw.Write([byte]0)        # ColorCount
    $bw.Write([byte]0)        # Reserved
    $bw.Write([UInt16]1)      # Planes
    $bw.Write([UInt16]32)     # BitCount (32-bit ARGB)
    $bw.Write($dataLen)       # BytesInRes
    $bw.Write([UInt32]$offset)# ImageOffset

    $offset += $dataLen
}

# Write image data
for ($i = 0; $i -lt $iconSizes.Count; $i++) {
    $bytes = $pngStreams[$i].ToArray()
    $bw.Write($bytes)
    $pngStreams[$i].Dispose()
    $iconBitmaps[$i].Dispose()
}

$bw.Flush()
$bw.Close()
$icoStream.Dispose()
$box512.Dispose()
$transparent512.Dispose()
$sourceBmp.Dispose()

Write-Host "Successfully generated logo.ico containing resolutions: 256, 128, 64, 48, 32, 16"
