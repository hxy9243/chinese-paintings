import {createRequire} from 'node:module';import fs from 'node:fs';import crypto from 'node:crypto';
const require=createRequire(new URL('../artworks/qingming/package.json',import.meta.url));const sharp=require('sharp');
const out='docs/style-lab';
const files=['artworks/qingming/public/reference/chicago-river-bend.png','artworks/thousand-miles/reference/source.png'];
const evidence=[];
for(const file of files){const data=fs.readFileSync(file),meta=await sharp(data).metadata();evidence.push({file,sha256:crypto.createHash('sha256').update(data).digest('hex'),width:meta.width,height:meta.height});}
await sharp(files[0]).extract({left:560,top:190,width:650,height:380}).png().toFile(`${out}/qingming-reference-pixels.png`);
await sharp('artworks/thousand-miles/reference/crops/left-mineral-mountains.png').resize({width:650}).png().toFile(`${out}/blue-green-reference-pixels.png`);
fs.writeFileSync(`${out}/reference-evidence.json`,JSON.stringify({evidence,qingmingCrop:{left:560,top:190,width:650,height:380},source:'https://scrolls.uchicago.edu/view-scroll/52',blueGreenProvenance:'Repository analysis.json: user-supplied screenshot; no historical attribution inferred',registration:'Not fitted; comparison is diagnostic, not a fidelity pass'},null,2));
