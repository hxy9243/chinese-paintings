from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
P=Path(__file__).resolve().parents[1];a=Image.new('RGB',(1500,585),'#e6ddbd');d=ImageDraw.Draw(a);f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',22)
for i,count in enumerate([100,280,560]):
 im=Image.open(P/f'renders/tonal-brush-{i}.png').convert('RGB').resize((480,480));a.paste(im,(i*500+10,50));d.text((i*500+14,12),f'{count} cumulative strokes',font=f,fill='#303a28')
d.text((14,548),'Fixed seed: 610155. Darker levels retain every earlier deposit.',font=f,fill='#303a28');a.save(P/'renders/tonal-brush-study.jpg',quality=94)
