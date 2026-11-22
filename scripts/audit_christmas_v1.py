"""Check the exported Christmas pack, independently of the game's asset index."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/seasonal/christmas-v1'
manifest = json.loads((OUT / 'manifest.json').read_text(encoding='utf-8'))
errors, checks = [], []


def check(condition, message):
    checks.append(message)
    if not condition:
        errors.append(message)


total_frames = 0
for name, spec in manifest['sheets'].items():
    image = Image.open(OUT / spec['image']).convert('RGBA')
    w, h = spec['frameWidth'], spec['frameHeight']
    check(image.size == (w * spec['columns'], h * spec['rows']), name + ': exact sheet dimensions')
    check(spec['frameCount'] == spec['columns'] * spec['rows'], name + ': frame count')
    hashes = []
    for i in range(spec['frameCount']):
        frame = image.crop((i % spec['columns'] * w, i // spec['columns'] * h,
                            (i % spec['columns'] + 1) * w, (i // spec['columns'] + 1) * h))
        alpha = frame.getchannel('A')
        box = alpha.getbbox()
        check(box is not None, f'{name}:{i}: nonempty artwork')
        if box:
            check(box[0] >= 8 and box[1] >= 8 and box[2] <= w - 8 and box[3] <= h - 8,
                  f'{name}:{i}: transparent margin; no clipped edge')
        minimum, maximum = alpha.getextrema()
        # Light/glow sprites are intentionally translucent, even at their core.
        check(minimum == 0 and maximum >= (64 if name == 'effects' else 250),
              f'{name}:{i}: transparent background and visible foreground')
        hashes.append(hashlib.sha256(frame.tobytes()).hexdigest())
    check(len(set(hashes)) == len(hashes), name + ': all authored poses are distinct exports')
    for action, animation in spec['animations'].items():
        check(bool(animation['frames']) and all(0 <= n < spec['frameCount'] for n in animation['frames']),
              f'{name}:{action}: animation indices valid')
        check(animation['frameRate'] > 0, f'{name}:{action}: valid playback speed')
    total_frames += spec['frameCount']

check(total_frames == 124, 'complete frame coverage: 68 hero + 24 elf + 20 effect + 12 prop frames')
check(len(manifest['backgrounds']) == 3, 'three environment exports')
for bg in manifest['backgrounds']:
    image = Image.open(OUT / bg['image'])
    check(image.size == (bg['width'], bg['height']), bg['name'] + ': environment dimensions match')
    check(image.width >= image.height * 2, bg['name'] + ': panoramic environment')
check(len(manifest['props']) == 12, 'twelve individually addressable props')
for prop in manifest['props']:
    check((OUT / prop['image']).is_file(), prop['name'] + ': individual prop exists')
check(len(manifest['story']) == 12, 'twelve storyboard panels')
for panel in manifest['story']:
    check((OUT / panel['image']).is_file(), panel['id'] + ': storyboard panel exists')
    check(bool(panel['caption']) and panel['durationMs'] >= 1000, panel['id'] + ': caption and timing present')
    Image.open(OUT / panel['image']).verify()
for field in ['portrait', 'idle', 'card']:
    check(field in manifest['hero'] and (OUT / manifest['hero'][field]).is_file(), field + ': hero presentation export')

window = manifest['releaseWindow']
start = datetime.fromisoformat(window['startsAt'].replace('Z', '+00:00'))
end = datetime.fromisoformat(window['endsAtExclusive'].replace('Z', '+00:00'))
check(start == datetime(2026, 11, 26, 7, tzinfo=timezone.utc), 'Thanksgiving start at Denver midnight')
check(start.weekday() == 3 and 22 <= start.day <= 28, 'Thanksgiving is the fourth Thursday in November')
check(end == datetime(2026, 12, 26, 7, tzinfo=timezone.utc) and end > start, 'exclusive expiry includes all Christmas Day')
check(window['runtimeIntegrated'] and window.get('automaticCalendarAvailability'), 'release status records the integrated calendar preview')

report = {'status': 'passed' if not errors else 'failed', 'checks': len(checks),
          'frames': total_frames, 'backgrounds': len(manifest['backgrounds']), 'storyPanels': len(manifest['story']),
          'errors': errors, 'scope': 'Static export integrity; not a gameplay integration test.'}
(ROOT / 'art/seasonal/christmas-v1/export-audit.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
raise SystemExit(1 if errors else 0)
