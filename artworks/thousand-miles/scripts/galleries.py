from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
P=Path(__file__).resolve().parents[1];S=P/'renders';font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
def gallery(items,out,cols=2,cell=(720,324),labels=None):
 rows=(len(items)+cols-1)//cols;w,h=cell;a=Image.new('RGB',(cols*w,rows*(h+34)),'#ded1a3');d=ImageDraw.Draw(a)
 for i,item in enumerate(items):
  p,label=item;im=Image.open(p).convert('RGB');im.thumbnail(cell);x=i%cols*w;y=i//cols*(h+34);a.paste(im,(x,y+34));d.text((x+10,y+6),label,font=font,fill='#344d36')
 a.save(S/out,quality=93)
gallery([(P/'reference/source.png','Source painting'),(S/'painting.png','Full 3D interpretation')],'source-comparison.jpg',cell=(800,360))
gallery([(S/f'{n}.png',label)for n,label in [('painting','Painting panorama'),('bridge','Timber bridge'),('arch','Pavilion on the bridge crown'),('pavilion','Symmetric pavilion'),('entry','Wooded bank road'),('gallery','Inside the pavilion'),('left','Left shore settlement'),('right','Right shore settlement'),('mountains','Mineral mountain folds'),('lake','Olive lake and remote shores'),('mist','Drifting distant mist'),('painting-clay','Clay geometry')]],'scene-gallery.jpg')
gallery([(S/f'{name}-zoom-{factor}.png',f'{name} · camera distance {factor:.0%}')for name in ['bridge','mountains']for factor in [1,.78,.57]],'zoom-gallery.jpg',cols=3,cell=(480,270))
indices=[round(i/20*479)for i in range(21)]
preview=[S/'frames'/f'{i:04d}.png'for i in indices]
if all(p.exists()for p in preview):
 gallery([(p,f'{i} seconds')for i,p in enumerate(preview)],'route-preview.jpg',cols=3,cell=(480,216))
 # These are selections from the rendered movie frames, not a second render.
 import json
 metadata=json.loads((P/'qa/capture-motion.json').read_text());metadata['derivedFrom']='renders/frames: exact rendered movie source frames';metadata['sampleFrames']=indices
 (P/'qa/capture-preview.json').write_text(json.dumps(metadata,indent=2))
else:
 preview=sorted(S.glob('preview-*.png'))
 if preview:gallery([(p,f'{i} seconds')for i,p in enumerate(preview)],'route-preview.jpg',cols=3,cell=(480,216))
