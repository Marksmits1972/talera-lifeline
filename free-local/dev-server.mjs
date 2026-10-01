import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {makePages,htmlHeaders} from './pages.js';
const pages=await makePages();
createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  if(path==='/local/copy.browser.js'){res.writeHead(200,{'content-type':'text/javascript'});res.end(await readFile(new URL('copy.browser.js',import.meta.url),'utf8'));return;}
  const match=path.match(/^\/local\/(storage|media|bridge)\.js$/);
  if(match){res.writeHead(200,{'content-type':'text/javascript'});res.end(await readFile(new URL(match[1]+'.browser.js',import.meta.url),'utf8'));return;}
  if(path==='/'||path==='/tell'||path==='/tell/'){res.writeHead(200,htmlHeaders);res.end(path==='/'?pages.timeline:pages.tell);return;}
  res.writeHead(404);res.end();
}).listen(4173,'127.0.0.1',()=>console.log('Local Free proof: http://127.0.0.1:4173'));
