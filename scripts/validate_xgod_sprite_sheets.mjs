import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '..');

const sheets = [
  { file: 'public/player_walk_v5.png', frames: 8, width: 512, height: 512 },
  { file: 'public/player_walk_blender_v2.png', frames: 16, width: 512, height: 512 },
  { file: 'public/player_walk_blender_v3.png', frames: 16, width: 512, height: 512 },
  { file: 'public/player_dash_v2.png', frames: 4, width: 320, height: 360 },
  { file: 'public/player_dash_blender_v1.png', frames: 4, width: 512, height: 512 },
  { file: 'public/player_jump_v2.png', frames: 6, width: 240, height: 360 },
  { file: 'public/player_jump_blender_v1.png', frames: 6, width: 512, height: 512 },
  { file: 'public/player_unarmed_attack_v2.png', frames: 3, width: 400, height: 400 },
  { file: 'public/player_sword_walk_v2.png', frames: 8, width: 260, height: 360 },
  { file: 'public/player_sword_attack_v3.png', frames: 3, width: 500, height: 400 },
  { file: 'public/player_sword_jump_v2.png', frames: 6, width: 300, height: 360 }
];

function readPngDimensions(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature || buffer.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error('not a valid PNG with an IHDR chunk');
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25]
  };
}

let failures = 0;
for (const sheet of sheets) {
  const filePath = path.join(repoRoot, sheet.file);
  try {
    const png = readPngDimensions(await readFile(filePath));
    const expectedWidth = sheet.frames * sheet.width;
    const hasAlpha = png.colorType === 4 || png.colorType === 6;
    const valid = png.width === expectedWidth && png.height === sheet.height && hasAlpha;
    const label = `${sheet.file}: ${png.width}x${png.height}, ${sheet.frames} cells of ${sheet.width}x${sheet.height}`;
    console.log(`${valid ? 'PASS' : 'FAIL'} ${label}`);
    if (!valid) {
      failures += 1;
      console.error(`  Expected ${expectedWidth}x${sheet.height} with alpha.`);
    }
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${sheet.file}: ${error.message}`);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log('X-God source sheets match the active Phaser import contract.');
}
