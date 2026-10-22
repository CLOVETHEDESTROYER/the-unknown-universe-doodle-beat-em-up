"""Build content-addressed WebP delivery copies; preserve source art and frame geometry.

Requires Pillow with WebP support. Run after packing/changing runtime artwork.
Sprite pixels are lossless. Display-only images use quality 90 with exact alpha.
"""
import hashlib
import io
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
OUT = PUBLIC / 'performance-v1'
OUT.mkdir(exist_ok=True)
mobile = json.loads((ROOT / 'gameplay/mobileAssetManifest.json').read_text(encoding='utf-8'))
manifest = {'images': {}, 'atlases': {}}
original_bytes = optimized_bytes = 0


def encode(source, lossless=False):
    global original_bytes, optimized_bytes
    path = PUBLIC / source.lstrip('/')
    with Image.open(path) as image:
        # No resizing: Phaser origins, repeat distances and frame offsets stay intact.
        image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
        output = io.BytesIO()
        image.save(output, format='WEBP', lossless=lossless, quality=90, method=6, exact=True)
        data = output.getvalue()
    name = hashlib.sha256(data).hexdigest()[:20] + '.webp'
    (OUT / name).write_bytes(data)
    original_bytes += path.stat().st_size
    optimized_bytes += len(data)
    return '/performance-v1/' + name


images = set(mobile['images'].values())
patterns = ['platformer/*.png', 'cards/*.png', 'powerups/v1/*.png',
            'characters/*/reward.png', 'characters/z-god-v1/reward.png']
for pattern in patterns:
    images.update('/' + p.relative_to(PUBLIC).as_posix() for p in PUBLIC.glob(pattern))
images.update('/' + name for name in [
    'GameStartScreen.png', 'Level1Intro.png', 'gold_pickup.png', 'heart_sprite.png',
    'xgod_sword_reward_fit.png', 'ink_shield_power.png', 'characters/xgod/ink-marker-blaster-v1.png',
    'doodles/gravity_core.png', 'doodles/dinio_orb.png', 'doodles/dinio_shot.png',
    'doodles/doghost_orb.png', 'doodles/teleportation_c_orb.png', 'doodles/shadow_oval.png',
    'doodles/impact-vfx-generated.png', 'doodles/tell-ring-generated.png', 'doodles/attack_slash.png',
    'bosses/boss_fire_orb_v2.png', 'bosses/boss_ink_orb_v2.png', 'bosses/boss_bullet_v2.png'])
for source in sorted(images):
    manifest['images'][source.lstrip('/')] = encode(source)

# Reuse the established mobile trimming instead of touching sprite source cells.
for source in sorted({sheet['url'] for sheet in mobile['sheets'].values()}):
    path = PUBLIC / source.lstrip('/')
    atlas = json.loads(path.read_text(encoding='utf-8'))
    for texture in atlas['textures']:
        image_source = (path.parent / texture['image']).relative_to(PUBLIC).as_posix()
        texture['image'] = encode(image_source, lossless=True)
    data = json.dumps(atlas, separators=(',', ':')).encode()
    name = hashlib.sha256(data).hexdigest()[:20] + '.json'
    (OUT / name).write_bytes(data)
    manifest['atlases'][source.lstrip('/')] = '/performance-v1/' + name

(ROOT / 'gameplay/performanceAssetManifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'images': len(manifest['images']), 'atlases': len(manifest['atlases']),
                  'sourceMiB': round(original_bytes / 1048576, 2),
                  'deliveryMiB': round(optimized_bytes / 1048576, 2),
                  'savedPercent': round((1 - optimized_bytes / original_bytes) * 100, 1)}))
