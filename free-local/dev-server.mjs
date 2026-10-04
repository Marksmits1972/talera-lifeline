import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {manifest,icon,updatePage,speechCheckPage} from './app-assets.js';
import {makePages,htmlHeaders} from './pages.js';
const pages=await makePages();
createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname.replace('.browser.js','.js');
  if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  if(path==='/speech-check'){res.writeHead(200,htmlHeaders);res.end(speechCheckPage);return;}
  if(path==='/update'){res.writeHead(200,htmlHeaders);res.end(pages.timeline.replace('</body>','<script type="module" src="/app-update.js"></script></body>'));return;}
  if(path==='/app-update.js'){res.writeHead(200,{'content-type':'text/javascript','cache-control':'no-store'});res.end(await readFile(new URL('update.browser.js',import.meta.url),'utf8'));return;}
  if(['/manifest.webmanifest','/icon.svg','/sw.js'].includes(path)){res.writeHead(200,{'content-type':path==='/icon.svg'?'image/svg+xml':path==='/sw.js'?'text/javascript':'application/manifest+json'});res.end(path==='/sw.js'?await readFile(new URL('sw.browser.js',import.meta.url),'utf8'):path==='/icon.svg'?icon:manifest);return;}
  if(['/icon-192.png','/icon-512.png'].includes(path)){res.writeHead(200,{'content-type':'image/png'});res.end(await readFile(new URL(path.slice(1),import.meta.url)));return;}
  if(path==='/local/catalog.js'){res.writeHead(200,{'content-type':'text/javascript'});res.end(await readFile(new URL('catalog.js',import.meta.url),'utf8'));return;}
  if(path==='/local/copy.browser.js'){res.writeHead(200,{'content-type':'text/javascript'});res.end(await readFile(new URL('copy.browser.js',import.meta.url),'utf8'));return;}
  const match=path.match(/^\/local\/(story-editor|date-picker|overview|timeline-actions|video|tell-media|analysis|storage|media|bridge|backup|backup-ui|recorder|photos|experience|dates|presentation|speech|speech-worker|speech-worklet|guided|title|title-worker)\.js$/);
  if(match){res.writeHead(200,{'content-type':'text/javascript'});res.end(await readFile(new URL(match[1]+'.browser.js',import.meta.url),'utf8'));return;}
  if(path==='/'||path==='/tell'||path==='/tell/'){res.writeHead(200,htmlHeaders);res.end(path==='/'?pages.timeline:pages.tell);return;}
  res.writeHead(404);res.end();
}).listen(4173,'127.0.0.1',()=>console.log('Local Free proof: http://127.0.0.1:4173'));
