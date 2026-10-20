from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
P=Path(__file__).resolve().parents[1]
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',22)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
names=[('painting','Painting view'),('trees','Layered tree washes'),('shore','Soft water and bank boundary'),('water','Flowing lake strokes')]
board=Image.new('RGB',(1440,70+len(names)*360),'#e6ddbd');d=ImageDraw.Draw(board)
d.text((20,15),'Previous ink finish',font=font,fill='#344331');d.text((740,15),'Layered foliage and wet ink edges',font=font,fill='#344331')
for j,(name,label)in enumerate(names):
 y=70+j*360
 for col,phase in enumerate(['before','after']):
  im=Image.open(P/f'renders/orbit-{phase}/{name}.png').convert('RGB');im.thumbnail((720,324));board.paste(im,(col*720,y+30))
 d.text((20,y+3),label,font=small,fill='#344331')
board.save(P/'renders/orbit-comparison.jpg',quality=93)
print('renders/orbit-comparison.jpg')
