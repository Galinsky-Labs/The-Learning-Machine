import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {createApp} from './app.mjs';
import {createPgStore} from './store-pg.mjs';
import {createAnthropicProvider} from './tutor/providers.mjs';
const env=process.env;
const catalog=JSON.parse(readFileSync(new URL('../../../content/us-law/authorities.json',import.meta.url),'utf8'));
const store=env.DATABASE_URL?createPgStore(env.DATABASE_URL):null;
const tutorProvider=createAnthropicProvider({apiKey:env.ANTHROPIC_API_KEY,model:env.TUTOR_MODEL||'claude-opus-5-5'});
const sessionSecret=env.SESSION_SECRET||(env.NODE_ENV==='production'?null:'local-development-secret-not-for-production-use');
if(!sessionSecret){console.error('SESSION_SECRET is required in production');process.exit(1)}
const app=createApp({store,config:{sessionSecret,bootstrapToken:env.ADMIN_BOOTSTRAP_TOKEN||null},tutorProvider,catalog});
const allowed=new Set((env.CORS_ORIGINS||'https://the-learning-machine.onrender.com').split(',').map(s=>s.trim()).filter(Boolean));
const security={'content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff','referrer-policy':'no-referrer','cache-control':'no-store','strict-transport-security':'max-age=31536000','content-security-policy':"default-src 'none'; frame-ancestors 'none'"};
const MAX_BODY=3*1024*1024;
createServer((req,res)=>{
 const origin=req.headers.origin,cors=origin&&allowed.has(origin)?{'access-control-allow-origin':origin,'vary':'Origin','access-control-allow-headers':'authorization, content-type','access-control-allow-methods':'GET, POST'}:{};
 if(req.method==='OPTIONS'){res.writeHead(204,{...security,...cors});return res.end()}
 let size=0;const chunks=[];
 req.on('data',c=>{size+=c.length;if(size>MAX_BODY){res.writeHead(413,{...security,...cors});res.end('{"error":"Body too large"}');req.destroy();return}chunks.push(c)});
 req.on('end',async()=>{
  if(res.writableEnded)return;
  let body=null;
  if(chunks.length){try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{res.writeHead(400,{...security,...cors});return res.end('{"error":"Invalid JSON"}')}}
  const url=new URL(req.url,'http://local');
  const out=await app({method:req.method,path:url.pathname,headers:req.headers,body,ip:req.socket.remoteAddress});
  // Request content is never logged; only method, route status and timing.
  res.writeHead(out.status,{...security,...cors});res.end(JSON.stringify(out.body));
 });
}).listen(Number(env.PORT)||10000,'0.0.0.0',()=>console.log(`the-learning-machine-api listening; database ${store?'configured':'not configured'}; tutor ${tutorProvider.available?'provider '+tutorProvider.id:'offline-only'}`));
