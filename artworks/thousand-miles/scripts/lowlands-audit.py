from pathlib import Path
import json,hashlib,subprocess
P=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
checks={}
for name in ['lowlands-after','lowlands-check','lowlands-flight-ink-pilot','lowlands-flight-ink-replay','lowlands-flight-ink-delivery','lowlands-player']:
 d=json.loads((P/f'qa/{name}.json').read_text());assert d['passed'],name;checks[name]=True
scene=json.loads((P/'qa/lowlands-after.json').read_text())['metadata']
assert scene['stats']['revision']=='blue-green-07'
pilot=json.loads((P/'qa/lowlands-flight-ink-pilot.json').read_text())
previous=json.loads((P/'qa/pavilion-flight-ink-pilot.json').read_text())
assert pilot['route']==previous['route']
canonical=json.loads((P/'reference/analysis.json').read_text())['sha256']
assert sha(P/'reference/source.png')==canonical
archive={}
for f in ['scene-manifest.json','pavilion-film-manifest.json','renders/pavilion-flyby.mp4','renders/pavilion-flyby-clay.mp4']:
 old=subprocess.check_output(['git','show',f'f45c470:{f}'],cwd=P)
 assert sha(P/f)==hashlib.sha256(old).hexdigest(),f
 archive[f]=sha(P/f)
sources=[*P.glob('src/*.js'),*P.glob('scripts/lowlands*'),P/'index.html',P/'lowlands.html',P/'README.md',P/'package.json',P/'package-lock.json']
artifacts=[*P.glob('renders/lowlands-*/*.png'),*P.glob('renders/lowlands-*.png'),*P.glob('renders/lowlands-*.jpg'),P/'renders/lowlands-flyby.mp4']
reports=[*P.glob('qa/lowlands-*.json'),*P.glob('qa/lowlands-encoded/*/*.png')]
m={'title':'Wooded foothills and pavilion flight','revision':'blue-green-07','baseCommit':subprocess.check_output(['git','rev-parse','f45c470'],cwd=P,text=True).strip(),'sourcePaintingSha256':canonical,'scene':scene,'filmRoute':pilot['route'],'validation':checks,'sourceImageProjectedOnGeometry':False,'archiveHashesUnchanged':archive,'sources':{str(p.relative_to(P)):sha(p)for p in sources},'artifacts':{str(p.relative_to(P)):{'bytes':p.stat().st_size,'sha256':sha(p)}for p in artifacts},'reports':{str(p.relative_to(P)):sha(p)for p in reports},'limits':['A 3D interpretation, with inferred foreground extension and unseen sides.','Existing revision 6 records remain archived; this manifest covers the current live scene and updated ink film.','Targeted geometry, replay, wind, camera and encoded-film checks do not certify every camera angle or exact painting fidelity.']}
(P/'lowlands-manifest.json').write_text(json.dumps(m,indent=2))
print(json.dumps({'revision':m['revision'],'trees':scene['stats']['trees'],'lowlandTrees':scene['stats']['lowlandTrees'],'foothills':scene['stats']['lowlandFoothills'],'artifacts':len(artifacts),'checks':checks},indent=2))
