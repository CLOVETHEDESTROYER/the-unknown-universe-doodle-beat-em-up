param()
$ErrorActionPreference = 'Stop'

# Pack Blender's transparent frames into Phaser sheets using a shared foot line.
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies @([System.Drawing.Bitmap].Assembly.Location, [System.Drawing.Rectangle].Assembly.Location, [System.Runtime.InteropServices.Marshal].Assembly.Location) @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class RunnerAlphaBounds {
    public static Rectangle Find(Bitmap image) {
        Rectangle area = new Rectangle(0, 0, image.Width, image.Height);
        BitmapData locked = image.LockBits(area, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        try {
            int stride = Math.Abs(locked.Stride);
            byte[] bytes = new byte[stride * image.Height];
            Marshal.Copy(locked.Scan0, bytes, 0, bytes.Length);
            int left = image.Width, top = image.Height, right = 0, bottom = 0;
            for (int y = 0; y < image.Height; y++) {
                for (int x = 0; x < image.Width; x++) {
                    if (bytes[y * stride + x * 4 + 3] == 0) continue;
                    if (x < left) left = x;
                    if (x + 1 > right) right = x + 1;
                    if (y < top) top = y;
                    if (y + 1 > bottom) bottom = y + 1;
                }
            }
            if (right <= left || bottom <= top) throw new Exception("Empty runner frame");
            return Rectangle.FromLTRB(left, top, right, bottom);
        } finally {
            image.UnlockBits(locked);
        }
    }
}
'@

$projectRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $projectRoot 'output/runner-blaster-v1/frames'
$destination = Join-Path $projectRoot 'public/characters/xgod/runner-blaster-v1'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$actions = @('idle', 'run', 'jump', 'attack', 'crouch')
$metadata = [ordered]@{
    frameWidth = 512
    frameHeight = 512
    origin = @(0.5, 0.9375)
    scale = 1.02
    naturalFacing = 'right'
    bodySize = @(96, 270)
    bodyOffset = @(208, 210)
    crouchBodySize = @(96, 160)
    crouchBodyOffset = @(208, 320)
    displayScale = 0.4
    actions = [ordered]@{}
}

foreach ($action in $actions) {
    $files = @(Get-ChildItem -LiteralPath $source -Filter "$action-??.png" | Sort-Object Name)
    if ($files.Count -eq 0) { throw "No frames for $action" }
    $height = [int]([Math]::Ceiling($files.Count / 4.0) * 512)
    $sheet = [System.Drawing.Bitmap]::new(2048, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($sheet)
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        for ($index = 0; $index -lt $files.Count; $index++) {
            $frame = [System.Drawing.Bitmap]::new($files[$index].FullName)
            try {
                $bounds = [RunnerAlphaBounds]::Find($frame)
                $x = [int]([Math]::Round(256 - 256 * 1.02)) + ($index % 4) * 512
                $y = [int]([Math]::Round(480 - $bounds.Bottom * 1.02)) + [int]([Math]::Floor($index / 4) * 512)
                $graphics.DrawImage($frame, $x, $y, [int]([Math]::Round(512 * 1.02)), [int]([Math]::Round(512 * 1.02)))
            } finally {
                $frame.Dispose()
            }
        }
        $sheet.Save((Join-Path $destination "$action.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $graphics.Dispose()
        $sheet.Dispose()
    }
    $metadata.actions[$action] = [ordered]@{ frames = $files.Count; fps = if ($action.EndsWith('idle')) { 6 } elseif ($action.EndsWith('run')) { 16 } else { 18 } }
}

$metadata | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $destination 'metadata.json')
