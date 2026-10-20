from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import json
P=Path(__file__).resolve().parents[1];R=P/'renders';f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',22)
shapes=json.loads((P/'research/mountain-shape-landmarks.json').read_text());ref=Image.open(P/'reference/source.png').convert('RGB');annotated=ref.copy();d=ImageDraw.Draw(annotated)
for form in shapes['forms']:
 points=[tuple(p)for p in form['trace']];d.line(points,fill='#efdc91',width=3)
 for x,y in points:d.ellipse((x-2,y-2,x+2,y+2),fill='#302b20')
annotated.save(R/'source-crest-traces.jpg',quality=95)
gray=ImageOps.grayscale(ref).convert('RGB');gray.save(R/'source-grayscale.jpg',quality=95)
items=[(R/'source-grayscale.jpg','Source painting: shape and value'),(R/'shape-clay-painting.png','Current geometry: neutral clay'),(P/'qa/revision-before-painting-clay.png','Previous geometry: same neutral light'),(P/'qa/revision-after-painting-clay.png','New geometry: individually traced crests'),(P/'qa/revision-before-mountains-clay.png','Previous: oblique view'),(P/'qa/revision-after-mountains-clay.png','New: oblique view')]
a=Image.new('RGB',(1600,1182),'#d9d8d3');d=ImageDraw.Draw(a)
for i,(file,label)in enumerate(items):
 im=Image.open(file).convert('RGB');im.thumbnail((800,360));x=i%2*800;y=i//2*394;a.paste(im,(x,y+34));d.text((x+12,y+5),label,font=f,fill='#30332c')
a.save(R/'mountain-shape-comparison.jpg',quality=94)
