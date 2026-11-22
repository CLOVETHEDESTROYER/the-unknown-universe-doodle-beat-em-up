"""Pack Killer Klause's three distinct four-pose melee combo attacks."""
import json
from pack_christmas_v1 import ART, OUT, register


def pack():
    return register('klause-combo-v2', 'killer-klause', 'combo-v2.png', 4, 3, 640, {
        'lead-jab': ([0, 1, 2, 3], 14, 0),
        'heavy-hook': ([4, 5, 6, 7], 12, 0),
        'gift-launcher-uppercut': ([8, 9, 10, 11], 12, 0)},
        target_height=420, baselines=[[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11]])


def main():
    frames = pack()
    manifest_path = OUT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['sheets']['klause-combo-v2'] = {
        'image': 'killer-klause/combo-v2.png', 'columns': 4, 'rows': 3,
        'frameWidth': 640, 'frameHeight': 640, 'frameCount': 12,
        'origin': [.5, .9375], 'worldStandingHeight': 240,
        'animations': {'lead-jab': {'frames': [0, 1, 2, 3], 'frameRate': 14, 'repeat': 0},
                       'heavy-hook': {'frames': [4, 5, 6, 7], 'frameRate': 12, 'repeat': 0},
                       'gift-launcher-uppercut': {'frames': [8, 9, 10, 11], 'frameRate': 12, 'repeat': 0}}}
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    template = (ART / 'review-template.html').read_text(encoding='utf-8')
    (OUT / 'review.html').write_text(template.replace('/*__MANIFEST__*/{}', json.dumps(manifest)), encoding='utf-8')
    print(f'Packed {len(frames)} Klause combo poses.')


if __name__ == '__main__':
    main()
