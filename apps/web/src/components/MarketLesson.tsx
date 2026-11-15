import {useEffect,useMemo,useState} from 'react';
import {createMarketLesson,chooseStructure,predictConsequences,runMarket,viewMarketViewpoint,reviseDecision,runMarketTransfer,consequenceTable,LESSON_INPUTS,TRANSFER_MARKETS,MARKET_VIEWPOINTS} from '../../../../packages/economics/src/lesson.mjs';
import type {MarketLesson as Lesson,Role,Sign} from '../../../../packages/economics/src/lesson.mjs';
import {createStakeholderGraph,auditGraph} from '../../../../packages/economics/src/graph.mjs';
import {DEFAULT_EARNINGS_ASSUMPTIONS} from '../../../../packages/economics/src/earnings.mjs';
import {formatMinor} from '../../../../packages/economics/src/money.mjs';
import {REGIMES} from '../../../../packages/economics/src/competition.mjs';

const STRUCTURES=LESSON_INPUTS.map(i=>String(i.structure));
const ROLES:Role[]=['creators','learners','developers'];
const human=(s:string)=>s.replace(/-/g,' ');
const GRAPH=createStakeholderGraph({actors:[{id:'author',role:'creator',label:'Author'},{id:'press',role:'publisher',label:'Publisher'},{id:'school',role:'learner',label:'Student'},{id:'lab',role:'developer',label:'Model developer'},{id:'reader',role:'user',label:'Model user'},{id:'agency',role:'regulator',label:'Regulator'}],
 edges:[{kind:'permission',id:'publish-right',from:'author',to:'press',right:'distribute-copies'},{kind:'information',id:'book-to-student',from:'press',to:'school',content:'work'},{kind:'money',id:'student-pays',from:'school',to:'press',amountMinor:1200,currency:'USD'},
  {kind:'money',id:'royalty',from:'press',to:'author',amountMinor:180,currency:'USD'},{kind:'money',id:'lab-buys-copy',from:'lab',to:'press',amountMinor:1200,currency:'USD'},{kind:'information',id:'lab-shares-copies',from:'lab',to:'reader',content:'work'},
  {kind:'information',id:'model-to-user',from:'lab',to:'reader',content:'model'},{kind:'information',id:'rules',from:'agency',to:'lab',content:'rules'}]});
export default function MarketLesson(){
 const [hydrated,setHydrated]=useState(false);useEffect(()=>setHydrated(true),[]);
 const [lesson,setLesson]=useState<Lesson>(()=>createMarketLesson());
 const [structure,setStructure]=useState(STRUCTURES[0]!),[predictions,setPredictions]=useState<Record<Role,Sign>>({creators:'gains',learners:'pays',developers:'unchanged'});
 const [revisedTo,setRevisedTo]=useState(STRUCTURES[0]!),[cited,setCited]=useState(''),[reason,setReason]=useState(''),[market,setMarket]=useState<'small-entrant'|'large-entrant'>('large-entrant'),[cheapest,setCheapest]=useState(REGIMES[0]!),[error,setError]=useState('');
 const audit=useMemo(()=>auditGraph(GRAPH),[]),table=useMemo(()=>consequenceTable(),[]);
 const act=(fn:()=>Lesson)=>{try{setLesson(fn());setError('')}catch(e){setError(e instanceof Error?e.message:'Step unavailable')}};
 const kinds=['permission','information','money'] as const;
 return <section className="learning-card market-lesson" aria-labelledby="market-title" data-hydrated={hydrated?'true':'false'}>
  <p className="stage-label">Module 6 · Creator, Student and Market</p>
  <h2 id="market-title">If learning from a work were permitted, who would pay, who would earn, and who decides?</h2>
  <p className="lesson-data">All amounts are illustrative lesson inputs in integer cents, not market data. There is no correct policy and no agreement score.</p>
  <details><summary>Stakeholder graph: permission, information and money kept separate</summary>
   {kinds.map(k=><table key={k}><caption>{human(k)} flows</caption><thead><tr><th scope="col">Edge</th><th scope="col">From</th><th scope="col">To</th><th scope="col">Carries</th></tr></thead>
    <tbody>{GRAPH.edges.filter(e=>e.kind===k).map(e=><tr key={e.id}><th scope="row">{e.id}</th><td>{e.from}</td><td>{e.to}</td><td>{e.kind==='permission'?human(e.right):e.kind==='information'?e.content:formatMinor(e.amountMinor,e.currency)}</td></tr>)}</tbody></table>)}
   <ul aria-label="Graph audit findings">{audit.findings.map(f=><li key={f.edgeId}>{f.edgeId}: {f.note}</li>)}</ul><p>{audit.note}</p>
  </details>
  <p className="lesson-stage" aria-live="polite">Stage: {lesson.stage}</p>
  {lesson.stage==='decide'&&<fieldset><legend>Which access structure would you recommend?</legend>
   <label>Structure <select value={structure} onChange={e=>setStructure(e.target.value)}>{STRUCTURES.map(s=><option key={s} value={s}>{human(s)}</option>)}</select></label>
   <div className="controls"><button type="button" className="action action-primary" onClick={()=>act(()=>chooseStructure(lesson,structure))}>Choose structure</button></div></fieldset>}
  {lesson.stage==='predict'&&<fieldset><legend>Predict each group's money position under {human(lesson.decision!)}</legend>
   {ROLES.map(r=><label key={r}>{r} <select value={predictions[r]} onChange={e=>setPredictions(p=>({...p,[r]:e.target.value as Sign}))}>{['gains','pays','unchanged'].map(o=><option key={o}>{o}</option>)}</select></label>)}
   <div className="controls"><button type="button" className="action action-primary" onClick={()=>act(()=>predictConsequences(lesson,predictions))}>Commit predictions</button></div></fieldset>}
  {lesson.stage==='run'&&<div className="controls"><button type="button" className="action action-primary" onClick={()=>act(()=>runMarket(lesson))}>Run the ledger</button></div>}
  {lesson.observation&&<div role="region" aria-label="Computed consequences">
   <table><caption>Your predictions beside the balanced ledger ({lesson.observation.result.ledger.events.length} transfers, conserved)</caption><thead><tr><th scope="col">Group</th><th scope="col">Predicted</th><th scope="col">Computed</th><th scope="col">Net</th></tr></thead>
    <tbody>{lesson.observation.consequences.map(c=><tr key={c.id}><th scope="row">{c.role}</th><td>{c.predicted}</td><td>{c.observed}{c.matched?'':' (differs)'}</td><td>{formatMinor(c.netMinor)}</td></tr>)}</tbody></table>
   <ul>{lesson.observation.result.ledger.events.map(e=><li key={e.id}>{e.from} → {e.to}: {formatMinor(e.amountMinor)} — {e.memo}</li>)}</ul>
   <h3>Creator earnings if outputs substitute for some sales</h3><p>{lesson.observation.earnings.conditional}</p><p className="status-note">{lesson.observation.earnings.statement} {lesson.observation.earnings.disclaimer}</p>
   <table><caption>Assumptions behind the earnings range</caption><thead><tr><th scope="col">Assumption</th><th scope="col">Range</th><th scope="col">Evidence class</th></tr></thead><tbody>{DEFAULT_EARNINGS_ASSUMPTIONS.map(a=><tr key={a.id}><th scope="row">{a.label}</th><td>{a.low}–{a.high} {a.unit}</td><td>{a.evidenceClass}</td></tr>)}</tbody></table>
  </div>}
  {(lesson.stage==='viewpoints'||lesson.stage==='revise')&&<fieldset><legend>Look through at least two viewpoints (the facts stay the same)</legend>
   <div className="controls">{MARKET_VIEWPOINTS.map(v=><button key={v} type="button" className="action" aria-pressed={lesson.lastView?.viewpoint===v} onClick={()=>act(()=>viewMarketViewpoint(lesson,v))}>View as {v}</button>)}</div>
   {lesson.lastView&&<div role="region" aria-label="Viewpoint"><p><strong>{lesson.lastView.label}</strong> cares about {lesson.lastView.interest}. Core facts digest <code>{lesson.lastView.coreDigest}</code>.</p><p>{lesson.lastView.opposition.argument}</p><p>Premise challenge: {lesson.lastView.premiseChallenge}</p><p>Self-check: {lesson.lastView.selfCheck}</p></div>}
   <p>Viewpoints seen: {lesson.viewpointsSeen.join(', ')||'none'}</p></fieldset>}
  {lesson.stage==='revise'&&<fieldset><legend>Revise—or keep—your recommendation, citing a computed consequence</legend>
   <label>Recommendation <select value={revisedTo} onChange={e=>setRevisedTo(e.target.value)}>{STRUCTURES.map(s=><option key={s} value={s}>{human(s)}</option>)}</select></label>
   <label>Consequence you rely on <select value={cited} onChange={e=>setCited(e.target.value)}><option value="">Choose…</option>{table.map(c=><option key={c.id} value={c.id}>{human(c.structure)} · {c.role}: {formatMinor(c.netMinor)}</option>)}</select></label>
   <label className="response-label">Why?<textarea className="response" value={reason} onChange={e=>setReason(e.target.value)}/></label>
   <div className="controls"><button type="button" className="action action-primary" onClick={()=>act(()=>reviseDecision(lesson,{structure:revisedTo,citedConsequenceId:cited,reason}))}>Record revision</button></div></fieldset>}
  {lesson.stage==='transfer'&&<fieldset><legend>Transfer: which access regime is cheapest for a new entrant?</legend>
   <label>Market <select value={market} onChange={e=>setMarket(e.target.value as 'small-entrant'|'large-entrant')}>{Object.keys(TRANSFER_MARKETS).map(m=><option key={m} value={m}>{human(m)}</option>)}</select></label>
   <label>Your prediction <select value={cheapest} onChange={e=>setCheapest(e.target.value)}>{REGIMES.map(r=><option key={r} value={r}>{human(r)}</option>)}</select></label>
   <div className="controls"><button type="button" className="action action-primary" onClick={()=>act(()=>runMarketTransfer(lesson,market,cheapest))}>Compute entry costs</button></div></fieldset>}
  {lesson.stage==='complete'&&lesson.transfer&&<div role="status" className="status-note"><p>Cheapest for the entrant: {human(lesson.transfer.result.cheapestForEntrant)} (you predicted {human(lesson.transfer.predictedCheapest)}). {lesson.transfer.result.creatorSideNote}</p><p>Module complete. Your recommendation{lesson.revision?.changed?' changed':' stayed the same'}, backed by {lesson.revision?.citedConsequenceId}.</p></div>}
  {error&&<p className="error" role="alert">{error}</p>}
 </section>;
}
