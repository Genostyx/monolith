import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(new URL('./dist/',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let p=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(p,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});}).listen(4173,'127.0.0.1',()=>process.stdout.write('MONOLITH ready: http://127.0.0.1:4173\n'));
