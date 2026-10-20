from pathlib import Path
from io import BytesIO
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageOps

P = Path(__file__).resolve().parents[1]
S = P / 'renders'
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 21)
small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 17)
source = Image.open(P / 'reference/source.png').convert('RGB')

def before(name):
    return Image.open(BytesIO(subprocess.check_output(['git', 'show', f'1371ddf:renders/{name}.png'], cwd=P))).convert('RGB')

columns = ['Source painting', 'Previous revision', 'Current refinement']
rows = [
    ('Bridge hall', [source.crop((920,605,1080,724)), before('pavilion-detail'), Image.open(S/'pavilion-detail.png')]),
    ('Mountain ink and color', [source.crop((0,290,735,799)), before('painting').crop((0,290,610,720)), Image.open(S/'painting.png').crop((0,290,610,720))]),
]
canvas = Image.new('RGB', (1500,830), '#ded1a3')
draw = ImageDraw.Draw(canvas)
for k,label in enumerate(columns): draw.text((k*500+15,10),label,font=font,fill='#344d36')
for row,(label,images) in enumerate(rows):
    y = 45+row*390
    for col,im in enumerate(images):
        tile=ImageOps.contain(im.convert('RGB'),(480,340))
        canvas.paste(tile,(col*500+10+(480-tile.width)//2,y+28+(340-tile.height)//2))
    draw.text((15,y),label,font=small,fill='#344d36')
canvas.save(S/'refinement-comparison.jpg',quality=94)

gallery = Image.new('RGB',(1500,355),'#ded1a3');draw=ImageDraw.Draw(gallery)
for col,(name,label) in enumerate([('broadleaf','Broken broadleaf crowns'),('willow','Drooping willow sprays'),('bare','Bare forks and fine twigs')]):
    im=Image.open(S/f'trees-{name}.png').convert('RGB');im.thumbnail((500,313))
    gallery.paste(im,(col*500,40));draw.text((col*500+12,10),label,font=font,fill='#344d36')
gallery.save(S/'tree-gallery.jpg',quality=94)
print('Saved source / previous revision / current comparison and tree studies')
