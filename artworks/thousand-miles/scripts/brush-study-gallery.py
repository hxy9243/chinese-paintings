from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[1]
frames=root/'qa/runtime/brush-study'
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
title=ImageFont.truetype(font_path,28)
label=ImageFont.truetype(font_path,21)
small=ImageFont.truetype(font_path,17)
paper='#e7dfc1'
ink='#354332'

rows=[('Panorama: both studies','painting','combined'),('Close-up: marks follow the mountain folds','mountains','folds'),('Close-up: separate mineral-color layers','mountains','minerals'),('Reverse view: both studies','back','combined')]
sheet=Image.new('RGB',(1600,1780),paper)
draw=ImageDraw.Draw(sheet)
draw.text((24,18),'Mountain brush and mineral study',font=title,fill=ink)
draw.text((24,60),'Established finish on the left. Optional study on the right. Matched camera and scene time.',font=small,fill=ink)
for i,(caption,view,style) in enumerate(rows):
    y=108+i*408
    draw.text((24,y),caption,font=label,fill=ink)
    for col,name in enumerate(['established',style]):
        image=Image.open(frames/f'{view}-{name}.png').convert('RGB').resize((800,360),Image.Resampling.LANCZOS)
        sheet.paste(image,(col*800,y+34))
draw.text((24,1746),'Appearance experiment only: scene geometry and camera route are preserved. Both controls are off by default.',font=small,fill=ink)
sheet.save(root/'renders/brush-study-comparison.jpg',quality=92,subsampling=0)

detail=Image.new('RGB',(1600,548),paper)
d=ImageDraw.Draw(detail)
d.text((20,12),'Established finish',font=label,fill=ink)
d.text((820,12),'Fold-following brush + layered mineral color',font=label,fill=ink)
for col,name in enumerate(['established','combined']):
    image=Image.open(frames/f'mountains-{name}.png').convert('RGB').crop((300,120,1260,720)).resize((800,500),Image.Resampling.LANCZOS)
    detail.paste(image,(col*800,48))
detail.save(root/'renders/brush-study-closeup.jpg',quality=94,subsampling=0)
print(root/'renders/brush-study-comparison.jpg')
print(root/'renders/brush-study-closeup.jpg')
