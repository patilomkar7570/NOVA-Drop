Add-Type -AssemblyName System.Drawing
$path = 'C:\Users\dudha\.gemini\antigravity\brain\bd8b4d22-1384-46d9-82cb-c11959995aab\.user_uploaded\media_1794323214440_cac32439.png'
$bmp = [System.Drawing.Bitmap]::FromFile($path)
Write-Host "Width: $($bmp.Width), Height: $($bmp.Height)"
$corner = $bmp.GetPixel(5, 5)
Write-Host "Corner: R=$($corner.R), G=$($corner.G), B=$($corner.B), A=$($corner.A)"
$bmp.Dispose()
