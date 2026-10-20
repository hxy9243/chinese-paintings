from pathlib import Path
import subprocess
P=Path(__file__).resolve().parents[1]
subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','24','-i',str(P/'renders/frames/%04d.png'),'-c:v','libx264','-threads','4','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(P/'renders/blue-green-flythrough.mp4')],check=True)
print('Encoded 20-second blue-green camera journey')

assert all((P/'renders/fog-frames'/f'{i:04d}.png').exists()for i in range(144))
subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','12','-i',str(P/'renders/fog-frames/%04d.png'),'-c:v','libx264','-threads','4','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(P/'renders/distant-mist.mp4')],check=True)
print('Encoded 12-second fixed-camera mist study')
