import {readFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
// TLM-092: per-page initial JavaScript budget, measured on the production build (lazy chunks such as TensorFlow.js excluded).
const dist=fileURLToPath(new URL('../apps/web/dist/',import.meta.url));
export const BUDGET_BYTES=Number(process.env.TLM_JS_BUDGET||350_000);
function pages(dir){return readdirSync(dir).flatMap(n=>{const p=join(dir,n);return statSync(p).isDirectory()?pages(p):n==='index.html'?[p]:[]})}
function staticImports(file,seen){
 if(seen.has(file)||!existsSync(file))return;seen.add(file);
 const text=readFileSync(file,'utf8');
 for(const m of text.matchAll(/(?:^|[;\n}])\s*import\s*(?:[\w*{}\s,$]+from\s*)?["']([^"']+)["']/g)){
  if(m[1].startsWith('.'))staticImports(join(file,'..',m[1]),seen);
 }
}
export function measure(){
 return pages(dist).map(page=>{
  const html=readFileSync(page,'utf8'),entries=[...html.matchAll(/(?:component-url|renderer-url|src)="(\/_astro\/[^"]+\.js)"/g)].map(m=>join(dist,m[1]));
  const seen=new Set();for(const e of entries)staticImports(e,seen);
  const bytes=[...seen].reduce((n,f)=>n+statSync(f).size,0);
  return {page:'/'+page.slice(dist.length).replace(/index\.html$/,''),scripts:seen.size,bytes,withinBudget:bytes<=BUDGET_BYTES};
 });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fileURLToPath(new URL('file://'+process.argv[1]))){
 const rows=measure();for(const r of rows)console.log(`${r.withinBudget?'ok  ':'OVER'} ${r.page.padEnd(12)} ${(r.bytes/1024).toFixed(1)} KiB in ${r.scripts} scripts`);
 if(rows.some(r=>!r.withinBudget)){console.error(`Initial JavaScript budget ${BUDGET_BYTES} bytes exceeded`);process.exitCode=1}
}
