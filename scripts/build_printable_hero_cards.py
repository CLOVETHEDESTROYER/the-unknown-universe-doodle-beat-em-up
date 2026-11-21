"""Build printable hero card fronts and QR backs for US Letter duplex printing.

Requires reportlab, pymupdf, Pillow and opencv-python.
"""
from pathlib import Path
import sys
import json

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'output/pdf-deps'))

from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.pagesizes import letter
from PIL import Image
import pymupdf
import cv2

OUT = ROOT / 'output/pdf'
OUT.mkdir(parents=True, exist_ok=True)
URL = 'https://the-unknown-universe-doodle-beat-em.vercel.app/'
BACK = ROOT / 'art/printable-cards/card-back.png'
PREFIX = 'unknown-universe-nine-hero-cards'
REGULAR_FRONTS = [
    'xgod-current-v2.webp',
    'barrett-card.png',
    'nico-card.png',
    'ezra-card.png',
    'teleportation-c-card.png',
    'z-god-card.png',
    'killer-kai-card-v2.webp',
    'kaden-card.png',
    'shadow-kid-card-v1.png',
]
EDITIONS = {
    'regular': REGULAR_FRONTS,
    'thanksgiving': [*REGULAR_FRONTS[:-1], 'turkey-king-card.png'],
}
CW, CH = 180, 252
PRINT_SCALE = 300 / 72


def art(c, path, x, y):
    with Image.open(path) as source:
        image = source.convert('RGB')
    width, height = image.size
    scale = min(CW / width, CH / height)
    width, height = width * scale, height * scale
    c.drawImage(ImageReader(image), x + (CW - width) / 2, y + (CH - height) / 2, width, height)
    c.linkURL(URL, (x, y, x + CW, y + CH), relative=0, thickness=0)


def slot(index, back):
    row, col = divmod(index, 3)
    if back:
        col = 2 - col
    return 36 + col * CW, 18 + (2 - row) * CH


def build_duplex(edition, fronts):
    path = OUT / f'{PREFIX}-{edition}-duplex.pdf'
    c = canvas.Canvas(str(path), pagesize=letter)
    c.setTitle(f'The Unknown Universe - Nine Hero Cards - {edition.title()}')
    for back in (False, True):
        for index, filename in enumerate(fronts):
            x, y = slot(index, back)
            art(c, BACK if back else ROOT / 'public/cards' / filename, x, y)
            c.setStrokeColorRGB(.65, .65, .65)
            c.setLineWidth(.3)
            c.rect(x, y, CW, CH)
        c.showPage()
    c.save()
    return path


def verify_duplex(path, count):
    with pymupdf.open(path) as document:
        assert len(document) == 2
        for index, page in enumerate(document, start=1):
            assert (page.rect.width, page.rect.height) == letter
            assert len(page.get_links()) == count
            pixmap = page.get_pixmap(matrix=pymupdf.Matrix(PRINT_SCALE, PRINT_SCALE))
            preview = OUT / f'{path.stem}-page-{index}.png'
            pixmap.save(preview)
        printed = cv2.imread(str(preview))
        detector = cv2.QRCodeDetector()
        for index in range(count):
            x, y = slot(index, back=True)
            left = round(x * PRINT_SCALE)
            top = round((letter[1] - y - CH) * PRINT_SCALE)
            width, height = round(CW * PRINT_SCALE), round(CH * PRINT_SCALE)
            crop = printed[top:top + height, left:left + width]
            decoded, _, _ = detector.detectAndDecode(crop)
            assert decoded == URL, (path.name, index + 1, decoded)
    return {'file': path.name, 'pages': 2, 'verifiedQRBacks': count}


results = []
for edition, fronts in EDITIONS.items():
    assert len(fronts) == 9
    results.append(verify_duplex(build_duplex(edition, fronts), len(fronts)))

(OUT / 'verification.json').write_text(json.dumps({'url': URL, 'checks': results}, indent=2), encoding='utf-8')
(OUT / 'PRINT-INSTRUCTIONS.txt').write_text(
    f'Regular edition: {PREFIX}-regular-duplex.pdf (Mystery Shadow Kid in the bottom-right slot).\n'
    f'Thanksgiving edition: {PREFIX}-thanksgiving-duplex.pdf (Turkey King in the bottom-right slot).\n'
    'Each PDF has the nine fronts on page 1 and the mirrored QR backs on page 2.\n'
    'Print on US Letter at Actual size / 100%, portrait, flip on LONG edge.\n'
    'Trim each card at the 2.5 x 3.5 inch box.\n',
    encoding='utf-8',
)
print(json.dumps(results, indent=2))
