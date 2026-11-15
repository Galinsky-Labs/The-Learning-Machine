import {readFileSync} from 'node:fs';
import {compileLearningModule} from '../packages/content/src/compiler.mjs';
const paths=['content/modules/intro-visual-reasoning.json'];
for(const path of paths){const m=JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));const compiled=compileLearningModule(m);console.log(compiled.lessonId+' compiled with '+compiled.nodes.length+' nodes, sha256='+compiled.digest);}
import {validateCatalog,plainLanguageReport} from '../packages/content/src/i18n.mjs';
const catalog=JSON.parse(readFileSync(new URL('../content/i18n/catalog.json',import.meta.url),'utf8'));
const authorityIds=JSON.parse(readFileSync(new URL('../content/us-law/authorities.json',import.meta.url),'utf8')).authorities.map(a=>a.id);
const i18nProblems=validateCatalog(catalog,{authorityIds});
const dense=Object.entries(catalog.entries).filter(([,e])=>!e.official&&!plainLanguageReport(e[catalog.sourceLocale]).plain).map(([k])=>k+': not plain language');
if(i18nProblems.length||dense.length){for(const p of [...i18nProblems,...dense])console.error(p);process.exit(1)}
console.log(`Text catalog validated: ${Object.keys(catalog.entries).length} entries in ${Object.keys(catalog.locales).length} locales; official text untranslated.`);
