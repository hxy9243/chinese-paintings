import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(path.join(root,'artworks/qingming/package.json'));
const {createServer}=await import(pathToFileURL(require.resolve('vite')));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.ts':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.glb':'model/gltf-binary'};
let vite;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');let name;
 try{name=decodeURIComponent(url.pathname);}catch{res.writeHead(400).end();return;}
 if(name==='/qingming'||name==='/thousand-miles'){res.writeHead(302,{Location:name+'/'+url.search+url.hash}).end();return;}
 if(name==='/'&&url.searchParams.get('view')==='3d'){res.writeHead(302,{Location:'/qingming/'+url.search}).end();return;}
 if(name.startsWith('/qingming/')){vite.middlewares(req,res);return;}
 const landscape=name.startsWith('/thousand-miles/');
 const base=path.join(root,landscape?'artworks/thousand-miles':'apps/gallery');
 const relative=landscape?name.slice('/thousand-miles/'.length):name.slice(1);
 if(landscape && relative && !/^(src\/|vendor\/|reference\/|renders\/|models\/|qa\/|[^/]+\.(html|json)$)/.test(relative)){res.writeHead(404).end();return;}
 const file=path.resolve(base,relative||'index.html');
 if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
vite=await createServer({root:path.join(root,'artworks/qingming'),base:'/qingming/',server:{middlewareMode:true,hmr:{server},fs:{allow:[root]}}});
const port=Number(process.env.PORT??5180);
server.listen(port,'127.0.0.1',()=>console.log(`Living Paintings: http://127.0.0.1:${port}/`));
async function stop(){await vite.close();server.close(()=>process.exit());}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
