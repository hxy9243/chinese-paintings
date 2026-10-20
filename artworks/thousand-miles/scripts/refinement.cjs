const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=vulkan', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  try {
    await page.goto('http://127.0.0.1:8781/?capture=1', { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForFunction(() => window.inkLab?.ready, null, { timeout: 120000 });
    const previousTerrain = execFileSync('git', ['show', 'ec8caa4:src/terrain.js'], { cwd: root, encoding: 'utf8' });
    const geometry = await page.evaluate(async previousSource => {
      const T = await import('three'), current = await import('./src/terrain.js');
      const previous = await import('data:text/javascript;base64,' + btoa(previousSource));
      const sections = [];
      for (const i of [0,1,2,3,4,5,6,7,8,9,13,14,15,16,17,18,19,21,22]) {
        const [x,z,h,wx] = current.peaks[i];
        const span = (field,coordinates) => {
          const [x,z,,wx]=coordinates;
          const heights = Array.from({ length: 201 }, (_, j) => field(x + (j / 100 - 1) * wx, z));
          const maximum = Math.max(...heights), threshold = (maximum + 1.6) * .90 - 1.6;
          return heights.filter(y => y >= threshold).length / 100;
        };
        sections.push({ peak: i, previousWidth: span(previous.terrainHeight,previous.peaks[i]), refinedWidth: span(current.terrainHeight,current.peaks[i]) });
      }
      const median = values => values.sort((a,b) => a-b)[Math.floor(values.length / 2)];
      const hall = valley.model.bridge.hall; hall.updateWorldMatrix(true, true);
      const rays = [];
      for (const x of [-.45,0,.45]) {
        const a = hall.localToWorld(new T.Vector3(x,1.4,4.5)), b = hall.localToWorld(new T.Vector3(x,1.4,-4.5));
        const ray = new T.Raycaster(a,b.clone().sub(a).normalize(),.01,a.distanceTo(b));
        rays.push({ passage: 'porch to lake', offset: x, intersections: ray.intersectObject(valley.model.bridge.group,true).length });
      }
      for (const z of [-.55,0,.55]) {
        const a = hall.localToWorld(new T.Vector3(-5.5,1.4,z)), b = hall.localToWorld(new T.Vector3(5.5,1.4,z));
        const ray = new T.Raycaster(a,b.clone().sub(a).normalize(),.01,a.distanceTo(b));
        rays.push({ passage: 'bridge through hall', offset: z, intersections: ray.intersectObject(valley.model.bridge.group,true).length });
      }
      const roofMeshes=hall.children.filter(o=>o.isMesh&&o.material===valley.model.materials.roof),roofSections=[];
      for(const x of [-1,0,1])for(const z of [-3.5,-2.8,2.8,3.5]){
        const origin=hall.localToWorld(new T.Vector3(x,1.8,z)),direction=new T.Vector3(0,1,0).transformDirection(hall.matrixWorld),ray=new T.Raycaster(origin,direction,.01,6);
        const distances=ray.intersectObjects(roofMeshes,true).map(hit=>hit.distance),unique=distances.filter((d,i)=>i===0||Math.abs(d-distances[i-1])>.03);
        roofSections.push({x,z,undersideSurfaces:unique.length});
      }
      const land=valley.model.mountains.children[0],heightErrors=[];
      for(const p of [...current.peaks.slice(0,10).map(([x,z])=>({x,z})),...valley.model.forest.records.slice(0,12)]){
        const ray=new T.Raycaster(new T.Vector3(p.x,200,p.z),new T.Vector3(0,-1,0),0,300),hit=ray.intersectObject(land,false)[0];
        heightErrors.push(hit?Math.abs(hit.point.y-current.terrainHeight(p.x,p.z)):1e6);
      }
      return { sections, summitSectionMethod:'Each revision is sampled at its own authored center and width. Positions have changed; this measures broad crowns, not reference landmark registration or painting-style similarity.', previousMedianSummitWidth: median(sections.map(s=>s.previousWidth)), refinedMedianSummitWidth: median(sections.map(s=>s.refinedWidth)), widerCrowns: sections.filter(s=>s.refinedWidth>s.previousWidth).length, pavilion: hall.userData.referenceForm, passages: rays, porchRoofSections:roofSections,maximumTerrainSamplingError:Math.max(...heightErrors), treeFamilies: valley.model.stats.treeFamilies, triangles: valley.metadata().triangles };
    }, previousTerrain);
    const shots = [];
    for (const name of ['pavilion-detail', 'trees-broadleaf', 'trees-willow', 'trees-bare', 'mountain-crowns']) {
      const shot = await page.evaluate(async name => {
        const T = await import('three'), v = valley, H = v.model.bridge.hall.position;
        inkLab.frame(0, { viewName: 'bridge', width: 1280, height: 800, seconds: 2 });
        let target, position;
        if (name === 'pavilion-detail') {
          target = [H.x,H.y+2.35,H.z]; position = [H.x,H.y+4.7,H.z+24];
        } else if (name === 'mountain-crowns') {
          target = [-90,27,-15]; position = [-25,43,83];
        } else {
          const family = name.split('-')[1];
          const { leftEdge } = await import('./src/terrain.js');
          const candidates = v.model.forest.records.filter(t=>t.family===family&&t.y<7&&t.z>-10&&t.z<65&&t.x<0);
          const score=t=>Math.abs(t.x-leftEdge(t.z))+Math.abs(t.z-35)*.08;
          const tree = candidates.sort((a,b)=>score(a)-score(b))[0];
          if (!tree) throw Error('No tree found: '+family);
          target=[tree.x,tree.y+tree.height*.56,tree.z];position=[tree.x+14,tree.y+tree.height*.62,tree.z+2.8];
          position[1]=Math.max(position[1],v.model.height(position[0],position[2])+1.2);
        }
        v.camera.fov=46;v.camera.position.set(...position);v.controls.target.set(...target);v.camera.lookAt(v.controls.target);v.camera.updateProjectionMatrix();v.render();
        return { image:v.renderer.domElement.toDataURL(),name,position,target,finite:inkLab.readback().pigment.every(Number.isFinite) };
      }, name);
      fs.writeFileSync(path.join(root,'renders',name+'.png'), Buffer.from(shot.image.split(',')[1],'base64'));
      delete shot.image; shots.push(shot);
    }
    const report = { passed: !errors.length && geometry.passages.every(r=>r.intersections===0) && geometry.porchRoofSections.every(s=>s.undersideSurfaces===1) && geometry.maximumTerrainSamplingError<.001 && Object.values(geometry.treeFamilies).every(n=>n>20) && shots.every(s=>s.finite), errors, geometry, shots, boundary:'Summit sections are retained as historical diagnostics. Current mountain shapes use hand-read reference crest profiles; qa/shape-study.json records their registration. Passage rays and captures are structural evidence. They do not certify an exact match to the painting.' };
    fs.writeFileSync(path.join(root,'qa/refinement.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
    if (!report.passed) process.exitCode=1;
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
