from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,subprocess
from datetime import datetime,timezone
P=Path(__file__).resolve().parents[1];movie=P/'renders/blue-green-flythrough.mp4';Q=P/'qa';samples=Q/'encoded';samples.mkdir(exist_ok=True)
stream=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-count_frames','-show_entries','stream=width,height,r_frame_rate,duration,nb_read_frames','-of','json',str(movie)]))['streams'][0]
assert stream['width']==1280 and stream['height']==576 and stream['r_frame_rate']=='24/1' and stream['nb_read_frames']=='480' and abs(float(stream['duration'])-20)<.001
subprocess.run(['ffmpeg','-v','error','-i',str(movie),'-f','null','-'],check=True,capture_output=True)
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(movie),'-vf',r'select=not(mod(n\,48))+eq(n\,479)','-fps_mode','vfr',str(samples/'%02d.png')],check=True)
a=Image.new('RGB',(1440,1000),'#ded1a3');d=ImageDraw.Draw(a);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
for j,p in enumerate(sorted(samples.glob('*.png'))):
 im=Image.open(p).convert('RGB');im.thumbnail((480,216));x=j%3*480;y=j//3*250;a.paste(im,(x,y+34));d.text((x+10,y+7),f'{j*2 if j<10 else 20} seconds',font=font,fill='#344d36')
a.save(P/'renders/encoded-contact-sheet.jpg',quality=93)
report={'passed':True,'createdUtc':datetime.now(timezone.utc).isoformat(),'file':movie.name,'bytes':movie.stat().st_size,'sha256':hashlib.sha256(movie.read_bytes()).hexdigest(),'fullDecodePassed':True,'sampledEncodedFrames':11,**stream,'boundary':'Decoded and sampled frames are inspected separately from subjective full-speed smoothness or exact source fidelity.'}
(Q/'delivery.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))

movie=P/'renders/distant-mist.mp4'
stream=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-count_frames','-show_entries','stream=width,height,r_frame_rate,duration,nb_read_frames','-of','json',str(movie)]))['streams'][0]
assert stream['width']==1280 and stream['height']==576 and stream['r_frame_rate']=='12/1' and stream['nb_read_frames']=='144' and abs(float(stream['duration'])-12)<.001
subprocess.run(['ffmpeg','-v','error','-i',str(movie),'-f','null','-'],check=True,capture_output=True)
fogSamples=Q/'fog-encoded';fogSamples.mkdir(exist_ok=True)
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(movie),'-vf',r'select=not(mod(n\,36))+eq(n\,143)','-fps_mode','vfr',str(fogSamples/'%02d.png')],check=True)
a=Image.new('RGB',(1440,500),'#ded1a3');d=ImageDraw.Draw(a)
for j,p in enumerate(sorted(fogSamples.glob('*.png'))):
 im=Image.open(p).convert('RGB');im.thumbnail((480,216));x=j%3*480;y=j//3*250;a.paste(im,(x,y+34));d.text((x+10,y+7),f'{min(j*3,12)} seconds',font=font,fill='#344d36')
a.save(P/'renders/fog-contact-sheet.jpg',quality=93)
report={'passed':True,'file':movie.name,'bytes':movie.stat().st_size,'sha256':hashlib.sha256(movie.read_bytes()).hexdigest(),'fullDecodePassed':True,'sampledEncodedFrames':5,'fixedCamera':True,'wind':0,'waterMotion':0,**stream}
(Q/'fog-delivery.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
