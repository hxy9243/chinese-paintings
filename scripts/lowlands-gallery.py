from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
P=Path(__file__).resolve().parents[1]
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',22)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
names=[('panorama','Lake approach'),('side-pass','Pavilion side pass'),('left-bank','Left foothills'),('right-bank','Right foothills'),('foreground','Extended foreground')]
board=Image.new('RGB',(1440,70+len(names)*441),'#e6ddbd');d=ImageDraw.Draw(board)
d.text((20,15),'Earlier flat banks',font=font,fill='#344331');d.text((740,15),'Low foothills and woodland',font=font,fill='#344331')
for j,(name,label)in enumerate(names):
 y=70+j*441
 for col,phase in enumerate(['before','after']):
  im=Image.open(P/f'renders/lowlands-{phase}/{name}.png').convert('RGB');im.thumbnail((720,405));board.paste(im,(col*720,y+30))
 d.text((20,y+3),label,font=small,fill='#344331')
board.save(P/'renders/lowlands-comparison.jpg',quality=93)
print('renders/lowlands-comparison.jpg')
