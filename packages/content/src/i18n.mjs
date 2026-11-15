// TLM-090: plain-language, localization-ready text. Translations explain; official legal text is never replaced.
const assert=(c,m)=>{if(!c)throw new TypeError(m)};
const placeholders=(s)=>[...s.matchAll(/\{([a-zA-Z]+)\}/g)].map(m=>m[1]).sort().join(',');
export function validateCatalog(catalog,{authorityIds=null}={}){
 assert(catalog&&catalog.schemaVersion==='1.0.0'&&typeof catalog.locales==='object'&&catalog.entries&&typeof catalog.entries==='object','Invalid catalog');
 const src=catalog.sourceLocale,locales=Object.keys(catalog.locales);assert(locales.includes(src),'Source locale missing');
 const problems=[];
 for(const [key,entry] of Object.entries(catalog.entries)){
  if(typeof entry[src]!=='string'||!entry[src].trim()){problems.push(key+': missing source text');continue}
  if(entry.official){
   for(const l of locales)if(l!==src&&l in entry)problems.push(key+': official text must not be translated ('+l+')');
   if(authorityIds&&!authorityIds.includes(entry.sourceId))problems.push(key+': official text cites an unknown source');
   continue;
  }
  for(const l of locales){
   if(typeof entry[l]!=='string'||!entry[l].trim())problems.push(key+': missing '+l);
   else if(placeholders(entry[l])!==placeholders(entry[src]))problems.push(key+': placeholders differ in '+l);
  }
 }
 return problems;
}
export function translate(catalog,locale,key,params={}){
 const entry=catalog.entries[key];assert(entry,'Unknown text key '+key);
 const src=catalog.sourceLocale;
 if(entry.official)return Object.freeze({text:entry[src],locale:src,official:true,fallback:locale!==src,label:locale===src?null:'Official English text (not translated)',sourceId:entry.sourceId});
 const has=typeof entry[locale]==='string'&&entry[locale].trim().length>0;
 const raw=has?entry[locale]:entry[src];
 const text=raw.replace(/\{([a-zA-Z]+)\}/g,(_,n)=>{assert(n in params,'Missing value for {'+n+'}');return String(params[n])});
 return Object.freeze({text,locale:has?locale:src,official:false,fallback:!has,label:has?null:'Shown in English: no translation yet'});
}
// A simple plain-language screen: average sentence length and share of very long words.
export function plainLanguageReport(text){
 const sentences=text.split(/(?<=[.!?:])\s+/).filter(s=>/\w/.test(s)),words=text.match(/[\p{L}\p{N}'’]+/gu)??[];
 const avg=words.length/Math.max(1,sentences.length),long=words.filter(w=>w.length>=13).length/Math.max(1,words.length);
 return Object.freeze({averageSentenceWords:Math.round(avg*10)/10,longWordShare:Math.round(long*1000)/1000,plain:avg<=22&&long<=0.08});
}
