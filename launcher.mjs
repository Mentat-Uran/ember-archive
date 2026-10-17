import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
if(!fs.existsSync(path.join(root,'index.html'))){console.error('Build missing. Run npm install and npm run build first.');process.exit(1);}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.md':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{let target;try{target=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}const file=path.resolve(root,'.'+(target==='/'?'/index.html':target));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache'});fs.createReadStream(file).pipe(res);});});
let port=4173;
server.on('error',e=>{if(e.code==='EADDRINUSE'&&port<4183){port++;server.listen(port,'127.0.0.1');}else{console.error(e.message);process.exit(1);}});
server.on('listening',()=>{const url=`http://localhost:${port}/`;console.log(`\n  EMBER ARCHIVE / 余烬试炼\n\n  ${url}\n\n  Keep this window open while playing. Close it to stop the server.\n`);if(!process.argv.includes('--no-open')){if(process.platform==='win32')spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Start-Process '${url}'`],{stdio:'ignore',windowsHide:true});else if(process.platform==='darwin')spawn('open',[url],{stdio:'ignore'});else spawn('xdg-open',[url],{stdio:'ignore'});}});
server.listen(port,'127.0.0.1');
