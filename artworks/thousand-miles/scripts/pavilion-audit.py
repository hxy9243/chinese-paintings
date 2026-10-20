from pathlib import Path
import json,hashlib,subprocess
P=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
base=json.loads((P/'scene-manifest.json').read_text());base_files={**base['sources'],**{k:v['sha256']for k,v in base['artifacts'].items()}};bad=[f for f,h in base_files.items()if sha(P/f)!=h];assert not bad,bad
checks={}
for style in ['ink','clay']:
 for kind in ['pilot','replay','delivery']:
  d=json.loads((P/f'qa/pavilion-flight-{style}-{kind}.json').read_text());assert d['passed'],(style,kind);checks[f'{style}_{kind}']=True
player=json.loads((P/'qa/pavilion-player.json').read_text());assert player['passed'];checks['player']=True
sources=['src/pavilion-flight.js','scripts/pavilion-film.cjs','scripts/pavilion-delivery.py','scripts/pavilion-player-check.cjs','scripts/pavilion-audit.py','pavilion-flight.html']
artifacts=[P/'renders/pavilion-flyby.mp4',P/'renders/pavilion-flyby-clay.mp4',*P.glob('renders/pavilion-flight-*.png'),*P.glob('renders/pavilion-flight-*-contact.jpg')]
reports=[*P.glob('qa/pavilion-flight-*.json'),P/'qa/pavilion-player.json']
pilot=json.loads((P/'qa/pavilion-flight-ink-pilot.json').read_text())
d={'title':'Around the bridge pavilion','baseSceneRevision':base['revision'],'baseSceneCommit':subprocess.check_output(['git','log','-1','--format=%H','--','scene-manifest.json'],cwd=P,text=True).strip(),'baseSceneManifestSha256':sha(P/'scene-manifest.json'),'unchangedBaseSourceAndArtifactHashes':len(base_files),'sceneGeometryAndPaletteChanged':False,'film':pilot['route']['film'],'cameraKeys':pilot['route']['keys'],'validation':checks,'sources':{f:sha(P/f)for f in sources},'artifacts':{str(p.relative_to(P)):{'bytes':p.stat().st_size,'sha256':sha(p)}for p in artifacts},'reports':{str(p.relative_to(P)):sha(p)for p in reports},'notes':['Independent 30-second camera film; the original viewer journey remains available.','Both versions use the same absolute-time camera path. Ink retains the existing world-space brush finish and environmental motion.','Camera far plane is extended only for the film, with matching depth decoding, to avoid clipping the wide sky.','Hidden geometry and fine painting detail retain the scene interpretation; route checks are not an exhaustive mesh collision proof.']}
(P/'pavilion-film-manifest.json').write_text(json.dumps(d,indent=2));print(json.dumps({'title':d['title'],'baseSceneRevision':d['baseSceneRevision'],'unchangedBaseHashes':len(base_files),'validation':checks,'artifactCount':len(artifacts)},indent=2))
