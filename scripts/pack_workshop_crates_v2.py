"""Pack built-in ImageGen originals; preserve alpha and use one scale per crate strip."""
import json
import shutil
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art/workshop-crates-v2'
PUBLIC = ROOT / 'public/workshop/crates-v2'


def main():
    manifest = json.loads((SOURCE / 'generation.json').read_text(encoding='utf-8'))
    PUBLIC.mkdir(parents=True, exist_ok=True)
    preview = Image.new('RGB', (1000, 680), '#122c31')
    for row, entry in enumerate(manifest['crates']):
        original = SOURCE / 'crates' / f"{entry['id']}-source.png"
        original.parent.mkdir(parents=True, exist_ok=True)
        if not original.exists():
            shutil.copyfile(entry['source'], original)
        image = Image.open(original).convert('RGBA')
        assert image.getextrema()[3][0] == 0, 'Generated crate must retain transparent alpha'
        w, h = image.size
        frames = [image.crop((i % 2 * w // 2, i // 2 * h // 2, (i % 2 + 1) * w // 2, (i // 2 + 1) * h // 2)) for i in range(4)]
        # Threshold only locates solid geometry; the complete generated alpha is retained.
        boxes = [frame.getchannel('A').point(lambda a: 255 if a > 220 else 0).getbbox() for frame in frames]
        scale = min(338 / max(b[2] - b[0] for b in boxes), 346 / max(b[3] - b[1] for b in boxes))
        strip = Image.new('RGBA', (384 * 4, 384))
        for i, (frame, box) in enumerate(zip(frames, boxes)):
            scaled = frame.resize((round(frame.width * scale), round(frame.height * scale)), Image.Resampling.LANCZOS)
            x = round(192 - (box[0] + box[2]) / 2 * scale)
            y = round(366 - box[3] * scale)
            slot = Image.new('RGBA', (384, 384))
            slot.alpha_composite(scaled, (x, y))
            strip.alpha_composite(slot, (i * 384, 0))
            thumb = slot.resize((240, 240), Image.Resampling.LANCZOS)
            preview.paste(thumb, (20 + i * 245, 50 + row * 310), thumb)
        strip.save(PUBLIC / f"{entry['id']}.webp", lossless=True, method=6)
        strip.crop((0, 0, 384, 384)).save(PUBLIC / f"{entry['id']}-poster.webp", lossless=True, method=6)
    ImageDraw.Draw(preview).text((25, 12), 'NORMAL / LEGENDARY - closed, charge, opening, open', fill='#fff1c7')
    preview.save(SOURCE / 'crate-preview.jpg', quality=90)

    cards_preview = Image.new('RGB', (1200, ((len(manifest['cards']) + 4) // 5) * 330), '#17292f')
    draw = ImageDraw.Draw(cards_preview)
    for i, entry in enumerate(manifest['cards']):
        original = SOURCE / 'cards' / f"{entry['id']}-source.png"
        original.parent.mkdir(parents=True, exist_ok=True)
        if not original.exists():
            shutil.copyfile(entry['source'], original)
        image = Image.open(original).convert('RGB')
        # Generated full-bleed art is preserved, with no crop or painted alterations.
        image.thumbnail((1024, 1536), Image.Resampling.LANCZOS)
        destination = PUBLIC / 'cards' / f"{entry['id']}.webp"
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, quality=88, method=6)
        thumb = image.copy()
        thumb.thumbnail((228, 292), Image.Resampling.LANCZOS)
        x, y = i % 5 * 240 + 6, i // 5 * 330 + 5
        cards_preview.paste(thumb, (x + (228 - thumb.width) // 2, y))
        draw.text((x + 6, y + 300), entry['id'], fill='#fff1c7')
    cards_preview.save(SOURCE / 'card-preview.jpg', quality=91)
    print(json.dumps({'crates': len(manifest['crates']), 'cards': len(manifest['cards']),
                      'runtime_mb': round(sum(p.stat().st_size for p in PUBLIC.rglob('*') if p.is_file()) / 1024**2, 2)}))


if __name__ == '__main__':
    main()
