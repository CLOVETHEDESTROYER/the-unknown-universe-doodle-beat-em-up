param()
$ErrorActionPreference = 'Stop'

# Normalize the generated hand-drawn-over-Blender strips to a shared foot anchor.
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies @([System.Drawing.Bitmap].Assembly.Location, [System.Drawing.Rectangle].Assembly.Location, [System.Runtime.InteropServices.Marshal].Assembly.Location) @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class DinioFrameScan {
    public static Bitmap ExtractWalk(Bitmap source, int index) {
        const int slot = 362;
        const int pad = 60;
        int globalStart = index * slot - pad;
        Bitmap frame = new Bitmap(slot + 2 * pad, source.Height, PixelFormat.Format32bppArgb);
        BitmapData input = source.LockBits(new Rectangle(0, 0, source.Width, source.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        BitmapData output = frame.LockBits(new Rectangle(0, 0, frame.Width, frame.Height), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        try {
            int inputStride = Math.Abs(input.Stride), outputStride = Math.Abs(output.Stride);
            byte[] inputBytes = new byte[inputStride * source.Height];
            byte[] outputBytes = new byte[outputStride * frame.Height];
            Marshal.Copy(input.Scan0, inputBytes, 0, inputBytes.Length);
            for (int y = 0; y < source.Height; y++) {
                // Heads lean right while adjacent tails curl left. The seam
                // follows the empty space between them instead of a straight
                // column, preserving every snout and tail tip.
                double shift = y <= 340 ? 45 : y >= 400 ? -45 : 45 - (y - 340) * 1.5;
                int left = index == 0 ? 0 : (int)Math.Round(index * slot + shift);
                int right = index == 5 ? source.Width : (int)Math.Round((index + 1) * slot + shift);
                int srcRow = input.Stride < 0 ? (source.Height - 1 - y) * inputStride : y * inputStride;
                int dstRow = output.Stride < 0 ? (frame.Height - 1 - y) * outputStride : y * outputStride;
                for (int x = Math.Max(left, globalStart); x < Math.Min(right, globalStart + frame.Width); x++) {
                    if (x < 0 || x >= source.Width) continue;
                    Buffer.BlockCopy(inputBytes, srcRow + x * 4, outputBytes, dstRow + (x - globalStart) * 4, 4);
                }
            }
            Marshal.Copy(outputBytes, 0, output.Scan0, outputBytes.Length);
        } finally {
            frame.UnlockBits(output);
            source.UnlockBits(input);
        }
        return frame;
    }

    public static int[] Analyze(Bitmap image, int xStart, int xEnd) {
        Rectangle area = new Rectangle(0, 0, image.Width, image.Height);
        BitmapData locked = image.LockBits(area, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        try {
            int stride = Math.Abs(locked.Stride);
            byte[] bytes = new byte[stride * image.Height];
            Marshal.Copy(locked.Scan0, bytes, 0, bytes.Length);
            int left = xEnd, top = image.Height, right = xStart, bottom = 0;
            for (int y = 0; y < image.Height; y++) {
                int row = locked.Stride < 0 ? (image.Height - 1 - y) * stride : y * stride;
                for (int x = xStart; x < xEnd; x++) {
                    if (bytes[row + x * 4 + 3] <= 32) continue;
                    left = Math.Min(left, x);
                    top = Math.Min(top, y);
                    right = Math.Max(right, x + 1);
                    bottom = Math.Max(bottom, y + 1);
                }
            }
            if (right <= left || bottom <= top) throw new Exception("Empty Dinio frame");
            int footStart = bottom - Math.Max(10, (bottom - top) / 9);
            long weightedX = 0, weight = 0;
            for (int y = footStart; y < bottom; y++) {
                int row = locked.Stride < 0 ? (image.Height - 1 - y) * stride : y * stride;
                for (int x = left; x < right; x++) {
                    int alpha = bytes[row + x * 4 + 3];
                    if (alpha <= 48) continue;
                    weightedX += (long)x * alpha;
                    weight += alpha;
                }
            }
            int footX = weight > 0 ? (int)(weightedX / weight) : (left + right) / 2;
            return new[] { left, top, right, bottom, footX };
        } finally {
            image.UnlockBits(locked);
        }
    }
}
'@

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $projectRoot 'art/dinio/hybrid-v1'
$destination = Join-Path $projectRoot 'public/companions/dinio/hybrid-v1'
New-Item -ItemType Directory -Force -Path $destination | Out-Null

$jobs = @(
    @{ Name = 'walk'; Input = 'walk-source.png'; Edges = @(0, 362, 724, 1086, 1448, 1810, 2172); FrameWidth = 320; AnchorX = 160 },
    @{ Name = 'attack'; Input = 'attack-source.png'; Edges = @(0, 660, 1400, 2006); FrameWidth = 448; AnchorX = 160 }
)

foreach ($job in $jobs) {
    $image = [System.Drawing.Bitmap]::new((Join-Path $sourceRoot $job.Input))
    try {
        $frames = @()
        $measurements = @()
        for ($index = 0; $index -lt $job.Edges.Count - 1; $index++) {
            if ($job.Name -eq 'walk') {
                $frames += ,([DinioFrameScan]::ExtractWalk($image, $index))
            } else {
                $edge = $job.Edges[$index]
                $frames += ,($image.Clone([System.Drawing.Rectangle]::new($edge, 0, $job.Edges[$index + 1] - $edge, $image.Height), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb))
            }
            $measurements += ,([DinioFrameScan]::Analyze($frames[$index], 0, $frames[$index].Width))
        }
        $maxHeight = ($measurements | ForEach-Object { $_[3] - $_[1] } | Measure-Object -Maximum).Maximum
        $scale = 280.0 / $maxHeight
        $sheet = [System.Drawing.Bitmap]::new($job.FrameWidth * $measurements.Count, 320, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($sheet)
        try {
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            for ($index = 0; $index -lt $measurements.Count; $index++) {
                $measure = $measurements[$index]
                $targetX = [int]([Math]::Round($job.AnchorX - $measure[4] * $scale)) + $index * $job.FrameWidth
                $targetY = [int]([Math]::Round(300 - $measure[3] * $scale))
                $targetWidth = [int]([Math]::Round($frames[$index].Width * $scale))
                $targetHeight = [int]([Math]::Round($frames[$index].Height * $scale))
                $graphics.DrawImage($frames[$index], $targetX, $targetY, $targetWidth, $targetHeight)
            }
            $sheet.Save((Join-Path $destination "$($job.Name).png"), [System.Drawing.Imaging.ImageFormat]::Png)
        } finally {
            $graphics.Dispose()
            $sheet.Dispose()
        }
        Write-Output "$($job.Name): $($measurements.Count) frames, scale $([Math]::Round($scale,3)), max source height $maxHeight"
    } finally {
        foreach ($frame in $frames) { $frame.Dispose() }
        $image.Dispose()
    }
}
