import {useState} from 'react';
import {translate} from '../../../../packages/content/src/i18n.mjs';
import type {Catalog} from '../../../../packages/content/src/i18n.mjs';
const KEYS=['module.vision','module.teach','module.model','module.music','module.law','module.market','module.studio','module.capstone'];
export default function PlainGuide({catalog}:{catalog:Catalog}){
 const [locale,setLocale]=useState(catalog.sourceLocale);
 const t=(key:string)=>translate(catalog,locale,key);
 const clause=t('official.copyrightClause');
 return <section className="learning-card plain-guide" aria-labelledby="guide-title" lang={locale}>
  <h2 id="guide-title">{t('guide.title').text}</h2>
  <label lang="en">Language <select value={locale} onChange={e=>setLocale(e.target.value)}>{Object.entries(catalog.locales).map(([code,name])=><option key={code} value={code} lang={code}>{name}</option>)}</select></label>
  <p>{t('guide.intro').text}</p>
  <ul>{KEYS.map(k=><li key={k}>{t(k).text}</li>)}</ul>
  <p className="status-note">{t('notice.notLaw').text} {t('notice.translation').text}</p>
  <figure><blockquote lang="en">{clause.text}</blockquote><figcaption>U.S. Const. art. I, § 8, cl. 8{clause.label?` — ${clause.label}`:''}</figcaption></figure>
 </section>;
}
