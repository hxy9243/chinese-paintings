from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
P=Path(__file__).resolve().parents[1]
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',22)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
canvas=Image.new('RGB',(1600,2400),'#ded1a3');d=ImageDraw.Draw(canvas)
d.text((16,9),'Source painting',font=font,fill='#344d36')
im=Image.open(P/'reference/source.png').convert('RGB');im.thumbnail((1600,720));canvas.paste(im,(0,42))
for row,(name,label)in enumerate([('painting','Panorama'),('arch','Bridge crown and approaches'),('mountains','Oblique mountain view'),('pavilion','Pavilion at the same world camera')]):
 y=774+row*402
 for column,version in enumerate(['before','after']):
  im=Image.open(P/f'qa/revision-{version}-{name}.png').convert('RGB');im.thumbnail((800,360));canvas.paste(im,(column*800,y+34))
  title='Previous revision'if version=='before'else'Current refinement'
  d.text((column*800+12,y+6),f'{label} · {title}',font=small,fill='#344d36')
canvas.save(P/'renders/revision-comparison.jpg',quality=94)
# A smaller bridge study preserves the entire source crossing above the
# identically posed previous/current elevation views.
canvas=Image.new('RGB',(1600,850),'#ded1a3');d=ImageDraw.Draw(canvas)
im=Image.open(P/'reference/crops/bridge-and-central-pavilion.png').convert('RGB');im=ImageOps.contain(im,(1600,425));canvas.paste(im,((1600-im.width)//2,36))
d.text((12,6),'Source bridge: the deck rises toward the roofed hall',font=font,fill='#344d36')
for column,version in enumerate(['before','after']):
 im=Image.open(P/f'qa/revision-{version}-arch.png').convert('RGB');im.thumbnail((800,360));canvas.paste(im,(column*800,490))
 d.text((column*800+12,460),'Previous revision'if version=='before'else'Current bridge crown',font=font,fill='#344d36')
canvas.save(P/'renders/crown-comparison.jpg',quality=94)
print('Saved source study and identical-camera revision comparisons')
