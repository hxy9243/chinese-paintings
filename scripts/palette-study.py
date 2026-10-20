from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,statistics
P=Path(__file__).resolve().parents[1];im=Image.open(P/'reference/source.png').convert('RGB')
patches=[('blue crest',331,347),('blue shoulder',107,433),('distant blue',1100,420),('green rock face',150,535),('green foreground',394,679),('ochre hillside',1480,499),('upper silk',800,100),('lower silk',800,230),('olive lake',815,531),('deep lake',890,738),('roof ink',974,646)]
rows=[]
for label,x,y in patches:
 data=list(im.crop((x-5,y-5,x+6,y+6)).getdata());rgb=[round(statistics.median(v[i]for v in data))for i in range(3)];rows.append({'region':label,'center':[x,y],'patchSize':11,'medianSRGB':rgb,'hex':'#'+''.join(f'{v:02x}'for v in rgb)})
(P/'research/palette-samples.json').write_text(json.dumps({'method':'Median 11 by 11 sRGB photograph patches. These are appearance guides, not physical pigment measurements.','source':'reference/source.png','samples':rows},indent=2))
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17);b=Image.new('RGB',(1000,430),'#e5dcc0');d=ImageDraw.Draw(b);d.text((22,18),'Source photograph: local color samples',font=f,fill='#333a27')
for i,row in enumerate(rows):
 x=22+(i%6)*160;y=60+(i//6)*175;d.rectangle((x,y,x+140,y+105),fill=row['hex']);d.text((x,y+112),row['region'],font=f,fill='#333a27');d.text((x,y+139),row['hex'],font=f,fill='#565b43')
b.save(P/'renders/source-palette.jpg',quality=93)
