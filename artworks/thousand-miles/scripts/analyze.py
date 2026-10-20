from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib
P=Path(__file__).resolve().parents[1];im=Image.open(P/'reference/source.png').convert('RGB')
regions=[('left-mineral-mountains',[0,290,735,799]),('bridge-and-central-pavilion',[680,595,1300,760]),('left-shore-architecture',[0,388,295,560]),('right-shore-settlement',[1510,490,1779,720]),('olive-lake-and-jade-shallows',[635,270,1330,600]),('right-mineral-peaks',[1250,290,1779,799]),('distant-tower-peaks',[1600,110,1779,380])]
colors={'azurite blue':'#298ac4','malachite green':'#82bfa0','jade shallows':'#7ead8a','olive lake':'#707344','ochre silk':'#a58e4f','umber architecture':'#413d28'}
gallery=Image.new('RGB',(1500,1080),'#d9c99b');d=ImageDraw.Draw(gallery);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
for i,(name,bbox)in enumerate(regions):
 crop=im.crop(bbox);crop.save(P/'reference/crops'/f'{name}.png');crop.thumbnail((480,290));x=i%3*500;y=i//3*350;gallery.paste(crop,(x,y+38));d.text((x+10,y+8),name.replace('-',' '),font=font,fill='#413d28')
for i,(name,color)in enumerate(colors.items()):
 x=1000+(i%2)*245;y=740+(i//2)*100;d.rectangle((x,y,x+220,y+48),fill=color);d.text((x,y+53),name,font=font,fill='#413d28')
gallery.save(P/'reference/element-study.jpg',quality=93)
record={'sourceFilename':'Screenshot from 2026-10-15 12-49-45.png','source':'User-supplied screenshot; no historical attribution inferred','dimensions':im.size,'sha256':hashlib.sha256((P/'reference/source.png').read_bytes()).hexdigest(),'regions':[{'name':n,'bbox':b}for n,b in regions],'palette':colors,'interpretation':'True 3D reinterpretation. Depth, hidden sides and close architecture are inferred. Source image is used for comparison only, not projected onto the scene.'}
(P/'reference/analysis.json').write_text(json.dumps(record,indent=2));print(json.dumps(record,indent=2))
