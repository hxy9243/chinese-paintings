import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'dist');
execFileSync('npm',['run','build'],{cwd:path.join(root,'artworks/qingming'),env:{...process.env,PAINTING_BASE:'/qingming/'},stdio:'inherit'});
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
fs.cpSync(path.join(root,'apps/gallery'),out,{recursive:true});
fs.cpSync(path.join(root,'artworks/qingming/dist'),path.join(out,'qingming'),{recursive:true});
const source=path.join(root,'artworks/thousand-miles'),dest=path.join(out,'thousand-miles');fs.mkdirSync(dest);
for(const entry of fs.readdirSync(source)){
 if(!['src','vendor','reference','renders','models','qa'].includes(entry)&&!entry.endsWith('.html')&&!entry.endsWith('-manifest.json'))continue;
 fs.cpSync(path.join(source,entry),path.join(dest,entry),{recursive:true,filter:file=>!/(\/frames\/|\/fog-frames\/|\/runtime\/|\.gitkeep$)/.test(file+'/')});
}
console.log('Combined static output: '+out);
