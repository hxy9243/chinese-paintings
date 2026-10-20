from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops,ImageStat
import json,hashlib,subprocess,sys,math
from datetime import datetime,timezone
P=Path(__file__).resolve().parents[1];style=sys.argv[1]if len(sys.argv)>1 else'ink';assert style in ['ink','clay']
frames=P/'qa/runtime/lowlands-flight'/style;movie=P/'renders'/('lowlands-flyby'+('-clay'if style=='clay'else'')+'.mp4');Q=P/'qa';samples=Q/'lowlands-encoded'/style;samples.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert all((frames/f'{i:04d}.png').exists()for i in range(720))
reports=[json.loads(p.read_text())for p in Q.glob(f'lowlands-flight-{style}-[0-9]*-[0-9]*.json')]
reports.sort(key=lambda d:d['start']);assert reports and reports[0]['start']==0 and reports[-1]['stop']==720
assert all(r['passed']and r['sceneRevision']=='blue-green-07'for r in reports)
assert all(a['stop']==b['start']for a,b in zip(reports,reports[1:]));assert all(r['route']==reports[0]['route']for r in reports)
subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','24','-i',str(frames/'%04d.png'),'-frames:v','720','-c:v','libx264','-threads','4','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(movie)],check=True)
stream=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-count_frames','-show_entries','stream=width,height,r_frame_rate,duration,nb_read_frames','-of','json',str(movie)]))['streams'][0]
assert stream['width']==1600 and stream['height']==900 and stream['r_frame_rate']=='24/1'and stream['nb_read_frames']=='720'and abs(float(stream['duration'])-30)<.001
subprocess.run(['ffmpeg','-v','error','-i',str(movie),'-f','null','-'],check=True,capture_output=True)
indices=[0,96,192,264,336,408,480,576,684,719]
select='+'.join(f'eq(n{chr(92)},{i})'for i in indices)
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(movie),'-vf','select='+select,'-fps_mode','vfr',str(samples/'%02d.png')],check=True)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19);board=Image.new('RGB',(1440,1216),'#ded8c2');d=ImageDraw.Draw(board);checks=[]
decoded_files=sorted(samples.glob('*.png'));assert len(decoded_files)==len(indices)
for j,(i,file)in enumerate(zip(indices,decoded_files)):
 original=Image.open(frames/f'{i:04d}.png').convert('RGB');decoded=Image.open(file).convert('RGB');rms=math.sqrt(sum(v*v for v in ImageStat.Stat(ImageChops.difference(original,decoded)).rms)/3);checks.append({'frame':i,'seconds':i/24,'rmseSRGB':rms});assert rms<9,(i,rms)
 im=decoded.copy();im.thumbnail((480,270));x=j%3*480;y=j//3*304;board.paste(im,(x,y+34));d.text((x+12,y+5),f'{i/24:.1f} seconds',font=font,fill='#344336')
board.save(P/f'renders/lowlands-flight-{style}-contact.jpg',quality=94)
(Q/f'lowlands-flight-{style}-frames.json').write_text(json.dumps({'frames':{f'{i:04d}.png':sha(frames/f'{i:04d}.png')for i in range(720)},'coordinateClock':'absolute seconds = frame index / 24','generatedFrames':720},indent=2))
report={'passed':True,'createdUtc':datetime.now(timezone.utc).isoformat(),'style':style,'file':str(movie.relative_to(P)),'bytes':movie.stat().st_size,'sha256':sha(movie),'fullDecodePassed':True,'samples':checks,'renderChunks':[[r['start'],r['stop']]for r in reports],**stream,'boundary':'Full decoding, encoded-frame inspection and source comparisons validate the delivered film; they do not certify exact painting fidelity.'};(Q/f'lowlands-flight-{style}-delivery.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
