param(
  [string]$SourceDirectory = "art/void-regent-v3/source",
  [string]$OutputDirectory = "public/bosses"
)

Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $root $SourceDirectory
$outputPath = Join-Path $root $OutputDirectory
$cellWidth = 768
$cellHeight = 512

foreach ($action in @("walk", "attack")) {
  $inputFile = Join-Path $sourcePath "$action-grid-final.png"
  $outputFile = Join-Path $outputPath "void_regent_${action}_v3.png"
  $source = [System.Drawing.Bitmap]::FromFile($inputFile)
  try {
    if ($source.Width -ne 1536 -or $source.Height -ne 1024) {
      throw "Expected a 1536x1024 2x2 source grid: $inputFile"
    }
    $sheet = [System.Drawing.Bitmap]::new($cellWidth * 4, $cellHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($sheet)
      try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        for ($frame = 0; $frame -lt 4; $frame++) {
          $column = $frame % 2
          $row = [math]::Floor($frame / 2)
          $src = [System.Drawing.Rectangle]::new($column * $cellWidth, $row * $cellHeight, $cellWidth, $cellHeight)
          $dst = [System.Drawing.Rectangle]::new($frame * $cellWidth, 0, $cellWidth, $cellHeight)
          $graphics.DrawImage($source, $dst, $src, [System.Drawing.GraphicsUnit]::Pixel)
        }
        if ($action -eq "attack") {
          # The source grid's release cape crosses its quadrant edge. Use its
          # separately generated full pose and remove the spill from recovery.
          $releaseFile = Join-Path $sourcePath "attack-release.png"
          $release = [System.Drawing.Bitmap]::FromFile($releaseFile)
          try {
            $graphics.FillRectangle([System.Drawing.Brushes]::Transparent, [System.Drawing.Rectangle]::new($cellWidth * 2, 0, $cellWidth, $cellHeight))
            $graphics.DrawImage($release, [System.Drawing.Rectangle]::new($cellWidth * 2 + 4, 3, 760, 505), [System.Drawing.Rectangle]::new(0, 0, $release.Width, $release.Height), [System.Drawing.GraphicsUnit]::Pixel)
            $graphics.FillRectangle([System.Drawing.Brushes]::Transparent, [System.Drawing.Rectangle]::new($cellWidth * 3, 0, 96, $cellHeight))
          } finally {
            $release.Dispose()
          }
        }
      } finally {
        $graphics.Dispose()
      }
      $sheet.Save($outputFile, [System.Drawing.Imaging.ImageFormat]::Png)
      Write-Output $outputFile
    } finally {
      $sheet.Dispose()
    }
  } finally {
    $source.Dispose()
  }
}
