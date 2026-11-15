import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCatalog,translate,plainLanguageReport} from '../src/i18n.mjs';
const catalog=JSON.parse(readFileSync(new URL('../../../content/i18n/catalog.json',import.meta.url),'utf8'));
const authorities=JSON.parse(readFileSync(new URL('../../../content/us-law/authorities.json',import.meta.url),'utf8')).authorities.map(a=>a.id);
test('shipped catalog is complete, placeholder-equivalent and keeps official text untranslated',()=>{
 assert.deepEqual(validateCatalog(catalog,{authorityIds:authorities}),[]);
});
test('missing locale falls back visibly to English; unknown keys fail closed',()=>{
 const r=translate(catalog,'fr','guide.title');assert.equal(r.text,'Plain-language guide');assert.equal(r.fallback,true);assert.match(r.label,/English/);
 assert.equal(translate(catalog,'es','guide.title').text,'Guía en lenguaje sencillo');
 assert.throws(()=>translate(catalog,'es','missing.key'),/Unknown text key/);
 const broken={...catalog,entries:{...catalog.entries,'x':{en:'Hello {name}',es:'Hola'}}};
 assert.deepEqual(validateCatalog(broken),['x: placeholders differ in es']);
 assert.deepEqual(validateCatalog({...catalog,entries:{y:{en:'Only English'}}}),['y: missing es']);
});
test('source equivalence: translations never replace official legal authority',()=>{
 const r=translate(catalog,'es','official.copyrightClause');
 assert.equal(r.official,true);assert.equal(r.locale,'en');assert.match(r.label,/Official English text/);assert.equal(r.sourceId,'constitution-copyright-clause');
 const forged={...catalog,entries:{...catalog.entries,'official.copyrightClause':{...catalog.entries['official.copyrightClause'],es:'Traducción no oficial'}}};
 assert.ok(validateCatalog(forged)[0].includes('must not be translated'));
 const unknown={...catalog,entries:{z:{official:true,en:'Text',sourceId:'invented'}}};
 assert.deepEqual(validateCatalog(unknown,{authorityIds:authorities}),['z: official text cites an unknown source']);
});
test('plain-language screen passes the guide text and flags dense prose',()=>{
 for(const [key,entry] of Object.entries(catalog.entries))if(!entry.official)assert.equal(plainLanguageReport(entry.en).plain,true,key);
 assert.equal(plainLanguageReport('Notwithstanding the aforementioned considerations regarding intermediate reproductions undertaken contemporaneously with computational analysis, nonexpressive utilization characteristically remains jurisprudentially indeterminate absent particularized adjudication.').plain,false);
});
