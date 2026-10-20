from pathlib import Path
import json,hashlib,subprocess
P=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
checks={}
for name in ['orbit-after','orbit-style','orbit-wind','orbit-protection','orbit-film-pilot','orbit-film-replay','orbit-delivery','orbit-player']:
 d=json.loads((P/f'qa/{name}.json').read_text());assert d['passed'],name;checks[name]=True
pilot=json.loads((P/'qa/orbit-film-pilot.json').read_text())
assert pilot['checks']['exactPaintingCameraReturn']and pilot['checks']['returnMatchesPaintingViewPixels']
assert abs(pilot['checks']['actualAccumulatedOrbitDegrees']-360)<1e-8
current={str(p.relative_to(P)):sha(p)for p in sorted(P.glob('src/*.js'))}
for name in ['orbit-film-pilot','orbit-film-replay','orbit-delivery']:
 assert json.loads((P/f'qa/{name}.json').read_text())['sourceHashes']==current,name
study=json.loads((P/'qa/orbit-after.json').read_text());scene=study['scene']
previous=json.loads((P/'qa/lowlands-after.json').read_text())['metadata']
assert {k:v for k,v in scene['stats'].items()if k!='revision'}=={k:v for k,v in previous['stats'].items()if k!='revision'}
assert scene['triangles']==previous['triangles']
canonical=json.loads((P/'reference/analysis.json').read_text())['sha256'];assert sha(P/'reference/source.png')==canonical
archive={}
for file in ['lowlands-manifest.json','renders/lowlands-flyby.mp4','pavilion-film-manifest.json','renders/pavilion-flyby.mp4']:
 old=subprocess.check_output(['git','show',f'102474a:{file}'],cwd=P);assert hashlib.sha256(old).hexdigest()==sha(P/file),file;archive[file]=sha(P/file)
sources=[*P.glob('src/*.js'),*P.glob('scripts/orbit*'),P/'index.html',P/'orbit.html',P/'README.md',P/'package.json',P/'package-lock.json']
artifacts=[*P.glob('renders/orbit-*/*.png'),*P.glob('renders/orbit-*.png'),P/'renders/orbit-comparison.jpg',*P.glob('renders/pavilion-orbit*.png'),P/'renders/pavilion-orbit-contact.jpg',P/'renders/pavilion-orbit.mp4']
reports=[*P.glob('qa/orbit-*.json'),*P.glob('qa/orbit-encoded/*.png')]
m={'title':'Circle the pavilion and return to the painting','revision':'blue-green-08','baseCommit':subprocess.check_output(['git','rev-parse','102474a'],cwd=P,text=True).strip(),'sourcePaintingSha256':canonical,'geometryUnchanged':True,'scene':scene,'ink':study['ink'],'film':pilot['route'],'validation':checks,'archiveHashesUnchanged':archive,'sources':{str(p.relative_to(P)):sha(p)for p in sources},'artifacts':{str(p.relative_to(P)):{'bytes':p.stat().st_size,'sha256':sha(p)}for p in artifacts},'reports':{str(p.relative_to(P)):sha(p)for p in reports},'limits':['Original painting camera and framing are reproduced; geometry remains a 3D interpretation.','Blur is local to low bank/water contacts; it is not a simulation of physical ink diffusion.','Targeted camera, feature-isolation, replay and encoded-film checks do not certify every camera angle or exact historical painting fidelity.']}
(P/'orbit-manifest.json').write_text(json.dumps(m,indent=2));print(json.dumps({'revision':m['revision'],'geometryUnchanged':True,'film':m['film']['film'],'checks':checks,'artifacts':len(artifacts)},indent=2))
