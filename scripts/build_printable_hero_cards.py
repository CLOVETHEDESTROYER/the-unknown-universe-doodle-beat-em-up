"""Build eight-character duplex sheets from approved fronts and recovered QR back.
Requires reportlab, pymupdf, Pillow and opencv-python.
"""
from pathlib import Path
import sys, json
sys.path.insert(0,str(Path('output/pdf-deps').resolve()))
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.pagesizes import letter
from PIL import Image
import pymupdf,cv2
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf';OUT.mkdir(parents=True,exist_ok=True)
URL='https://the-unknown-universe-doodle-beat-em.vercel.app/'
BACK=ROOT/'art/printable-cards/card-back.png'
fronts=[('X God','xgod-current-v2.webp'),('Barrett','barrett-card.png'),('Nico','nico-card.png'),('Ezra','ezra-card.png'),('Teleportation C','teleportation-c-card.png'),('Z-God','z-god-card.png'),('Killer Kai','killer-kai-card-v2.webp'),('Elytron','elytron-card.png')]
CW,CH=180,252

def art(c,p,x,y):
 im=Image.open(p).convert('RGB');w,h=im.size;s=min(CW/w,CH/h)
 c.drawImage(ImageReader(im),x+(CW-w*s)/2,y+(CH-h*s)/2,w*s,h*s)
 c.linkURL(URL,(x,y,x+CW,y+CH),relative=0,thickness=0)

def marks(c,x,y):
 c.setStrokeColorRGB(.65,.65,.65);c.setLineWidth(.3)
 c.rect(x,y,CW,CH)

pdf=OUT/'unknown-universe-eight-hero-cards-duplex.pdf'
c=canvas.Canvas(str(pdf),pagesize=letter);c.setTitle('The Unknown Universe - Eight Hero Cards - Duplex')
for back in [False,True]:
 for i,(name,file) in enumerate(fronts):
  row,col=divmod(i,3)
  if back:col=2-col
  x=36+col*CW;y=18+(2-row)*CH
  art(c,BACK if back else ROOT/'public/cards'/file,x,y);marks(c,x,y)
 c.showPage()
c.save()
individual=OUT/'unknown-universe-eight-hero-cards-individual.pdf'
c=canvas.Canvas(str(individual),pagesize=(CW,CH));c.setTitle('The Unknown Universe - Individual Fronts and Backs')
for name,file in fronts:
 for p in [ROOT/'public/cards'/file,BACK]:art(c,p,0,0);c.showPage()
c.save()
# Separate sheets support printers with manual duplex workflows.
with pymupdf.open(pdf) as duplex:
 for page_index,side in enumerate(['fronts','backs']):
  with pymupdf.open() as sheet:
   sheet.insert_pdf(duplex,from_page=page_index,to_page=page_index)
   sheet.save(OUT/f'unknown-universe-eight-hero-cards-{side}.pdf')
results=[]
for path in [pdf,individual]:
 doc=pymupdf.open(path)
 for i,page in enumerate(doc):
  pix=page.get_pixmap(matrix=pymupdf.Matrix(300/72,300/72));png=OUT/f'{path.stem}-page-{i+1}.png';pix.save(str(png))
  if (path==pdf and i==1) or (path==individual and i%2==1):
   img=cv2.imread(str(png))
   if path==pdf:
    # Decode every occupied back cell independently at final 300-dpi print scale.
    for j in range(len(fronts)):
     row,col=divmod(j,3);col=2-col
     x=round((36+col*CW)*300/72);y=round((18+row*CH)*300/72)
     crop=img[y:y+1050,x:x+750]
     decoded,_,_=cv2.QRCodeDetector().detectAndDecode(crop)
     assert decoded==URL,(j,decoded)
    results.append(f'All {len(fronts)} sheet-back QR codes decode at 300 DPI')
   else:
    decoded,_,_=cv2.QRCodeDetector().detectAndDecode(img);assert decoded==URL
 results.append({'file':path.name,'pages':len(doc)})
(OUT/'verification.json').write_text(json.dumps({'url':URL,'checks':results},indent=2))
(OUT/'PRINT-INSTRUCTIONS.txt').write_text('US Letter paper. Print unknown-universe-eight-hero-cards-duplex.pdf at Actual size / 100%, portrait, flip on LONG edge.\nPage 1 fronts; page 2 mirrored backs. Eight 2.5 x 3.5 inch trim boxes; one empty position.\nElytron: bottom-center front and matching bottom-center QR back.\nSeparate fronts and backs PDFs are also included for manual duplex printing.\nDo not fit or scale to page. Test one sheet on plain paper before cardstock.\nCard art is contained without cropping; white margins preserve differing source proportions.\nIndividual PDF: alternating front/back pages at 2.5 x 3.5 inches for print shops.\nQR codes open '+URL+'\n')
print(json.dumps(results,indent=2))
