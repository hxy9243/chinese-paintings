from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops,ImageStat
import json,hashlib,subprocess,math
from datetime import datetime,timezone
P=Path(__file__).resolve().parents[1]
frames=P/'qa/runtime/pavilion-orbit';movie=P/'renders/pavilion-orbit.mp4';samples=P/'qa/orbit-encoded';samples.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert all((frames/f'{i:04d}.png').exists()for i in range(960))
reports=sorted([json.loads(p.read_text())for p in P.glob('qa/orbit-film-[0-9]*-[0-9]*.json')],key=lambda d:d['start'])
assert reports and reports[0]['start']==0 and reports[-1]['stop']==960
assert all(r['passed']and r['revision']=='blue-green-08'for r in reports)
assert all(a['stop']==b['start']for a,b in zip(reports,reports[1:]))
current={str(p.relative_to(P)):sha(p)for p in sorted(P.glob('src/*.js'))}
pilot=json.loads((P/'qa/orbit-film-pilot.json').read_text());assert pilot['passed']and pilot['sourceHashes']==current
assert all(r['sourceHashes']==current and r['route']==pilot['route']for r in reports)
subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','24','-i',str(frames/'%04d.png'),'-frames:v','960','-c:v','libx264','-threads','4','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(movie)],check=True)
stream=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-count_frames','-show_entries','stream=width,height,r_frame_rate,duration,nb_read_frames','-of','json',str(movie)]))['streams'][0]
assert stream['width']==1600 and stream['height']==720 and stream['r_frame_rate']=='24/1'and stream['nb_read_frames']=='960'and abs(float(stream['duration'])-40)<.001
subprocess.run(['ffmpeg','-v','error','-i',str(movie),'-f','null','-'],check=True,capture_output=True)
indices=[0,144,168,240,300,432,564,696,768,840,912,959]
select='+'.join(f'eq(n{chr(92)},{i})'for i in indices)
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(movie),'-vf','select='+select,'-fps_mode','vfr',str(samples/'%02d.png')],check=True)
files=sorted(samples.glob('*.png'));assert len(files)==len(indices)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18);board=Image.new('RGB',(1440,1000),'#ded8c2');draw=ImageDraw.Draw(board);checks=[]
for j,(i,file)in enumerate(zip(indices,files)):
 original=Image.open(frames/f'{i:04d}.png').convert('RGB');decoded=Image.open(file).convert('RGB');rms=math.sqrt(sum(v*v for v in ImageStat.Stat(ImageChops.difference(original,decoded)).rms)/3);assert rms<9,(i,rms)
 checks.append({'frame':i,'seconds':i/24,'rmseSRGB':rms});im=decoded.copy();im.thumbnail((480,216));x=j%3*480;y=j//3*250;board.paste(im,(x,y+30));draw.text((x+10,y+4),f'{i/24:.1f} seconds',font=font,fill='#344336')
board.save(P/'renders/pavilion-orbit-contact.jpg',quality=94)
(P/'qa/orbit-frame-hashes.json').write_text(json.dumps({'frames':{f'{i:04d}.png':sha(frames/f'{i:04d}.png')for i in range(960)},'coordinateClock':'absolute seconds = frame index / 24'},indent=2))
report={'passed':True,'createdUtc':datetime.now(timezone.utc).isoformat(),'file':str(movie.relative_to(P)),'bytes':movie.stat().st_size,'sha256':sha(movie),'fullDecodePassed':True,'samples':checks,'sourceHashes':current,'renderChunks':[[r['start'],r['stop']]for r in reports],**stream,'boundary':'Full decoding and encoded/source frame comparison validate the delivered film. They do not certify exact painting fidelity.'}
(P/'qa/orbit-delivery.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
