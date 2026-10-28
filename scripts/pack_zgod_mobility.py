"""Pack the two generated Z God sheets with the shared alpha/anchor pipeline."""
from pathlib import Path
from pack_xgod_mobility import pack

ROOT = Path(__file__).resolve().parents[1]

if __name__ == '__main__':
    pack(ROOT / 'art/zgod-mobility-v1', ROOT / 'public/characters/z-god-v1/mobility-v1',
         ('double-jump', 'ground-punch'))
