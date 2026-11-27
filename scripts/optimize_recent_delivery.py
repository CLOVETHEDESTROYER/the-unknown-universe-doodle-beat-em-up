"""Optimize display art and add lossless sprite copies, keeping source geometry."""
import hashlib
import io
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
manifest_path = ROOT / 'gameplay/performanceAssetManifest.json'
manifest = json.loads(manifest_path.read_text())
sources = [PUBLIC / 'cards/shadow-kid-card-v1.png', PUBLIC / 'cards/kaden-card.png']
sources += [PUBLIC / 'cards/xgod-current-v2.webp', PUBLIC / 'seasonal/christmas-v1/killer-klause/card.webp']
for pattern in ['powerups/gun-upgrades-v1/*.png', 'characters/xgod/drawn-v1/*.png', 'bosses/flow-v3/*.png']:
    sources.extend(PUBLIC.glob(pattern))
before = after = 0
for source in sorted(sources):
    image = Image.open(source).convert('RGBA')
    card = source.parent.name == 'cards' or source.name == 'card.webp'
    if card:
        # Roster posters are display art, never animation/collision inputs.
        # Keep originals available for full-size artwork; ship a crisp thumbnail.
        image.thumbnail((512, 768), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    sprite = source.relative_to(PUBLIC).as_posix().startswith(('characters/', 'bosses/'))
    image.save(buffer, format='WEBP', lossless=sprite, quality=90, exact=True, method=6)
    data = buffer.getvalue()
    # Decoding the delivery asset must preserve size, RGBA pixels and alpha.
    decoded = Image.open(io.BytesIO(data)).convert('RGBA')
    assert decoded.size == image.size, source
    if sprite:
        assert decoded.tobytes() == image.tobytes(), source
    else:
        assert decoded.getchannel('A').tobytes() == image.getchannel('A').tobytes(), source
    if len(data) >= source.stat().st_size:
        continue
    name = hashlib.sha256(data).hexdigest()[:20] + '.webp'
    (PUBLIC / 'performance-v1' / name).write_bytes(data)
    manifest['images'][source.relative_to(PUBLIC).as_posix()] = '/performance-v1/' + name
    before += source.stat().st_size
    after += len(data)
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(f'Delivery: {before / 1048576:.2f} MiB -> {after / 1048576:.2f} MiB; sprite pixels unchanged')
