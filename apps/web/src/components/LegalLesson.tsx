import {useEffect,useMemo,useState} from 'react';
import {CASE_LIBRARY,runCaseLibrary} from '../../../../packages/policy-lab/src/case-library.mjs';
import {buildTruthLayerView,inspectSource} from '../../../../packages/policy-lab/src/truth-layers.mjs';
import type {TruthLayerView,InspectedSource} from '../../../../packages/policy-lab/src/truth-layers.mjs';
import {LEGAL_LESSONS,OUTCOME_OPTIONS,createLegalLesson,recordLegalHypothesis,commitLegalPrediction,runLegalExperiment,continueLegalExplanation,submitLegalExplanation,transferCandidates,runLegalTransfer,viewLegalExplanation} from '../../../../packages/policy-lab/src/legal-lesson.mjs';
import type {LegalLessonState} from '../../../../packages/policy-lab/src/legal-lesson.mjs';

type LessonId='education'|'acquisition';
const caseOf=(id:string)=>CASE_LIBRARY.find(c=>c.id===id)!;
const human=(s:string)=>s.replace(/-/g,' ');
function SourceInspector({view,catalog}:{view:TruthLayerView;catalog:unknown}){
 const [open,setOpen]=useState<InspectedSource|null>(null);
 return <section aria-labelledby={`truth-${view.caseId}`} className="truth-layers"><h3 id={`truth-${view.caseId}`}>Truth layers and sources</h3>
  {view.layers.map(layer=><div key={layer.layer} className={`truth-layer layer-${layer.layer}`}><h4>{human(layer.layer)}</h4><p className="layer-description">{layer.description}</p>
   {layer.items.length===0?<p>None in this case.</p>:<ul>{layer.items.map((item:any,i:number)=>layer.layer==='current-law'
    ?<li key={item.id}><button type="button" className="link-button" onClick={()=>setOpen(inspectSource(catalog,item.id))}>Inspect {item.citation}</button> — {item.title}</li>
    :layer.layer==='proposed-bill'?<li key={i}>Status: {item.status}; enacted law: {item.enactedLaw?'yes':'no'}; authoritative full text loaded: {item.authoritativeFullText?'yes':'no'}. {item.notice}</li>
    :<li key={i}>{String(item)}</li>)}</ul>}
  </div>)}
  {open&&<div role="dialog" aria-modal="false" aria-labelledby="source-detail-title" className="source-detail"><h4 id="source-detail-title">{open.title} ({open.citation})</h4>
   <dl><dt>Kind</dt><dd>{open.kind}{open.stance?` · ${open.stance}`:''}</dd><dt>Forum</dt><dd>{open.forum}</dd><dt>Date</dt><dd>{open.issuedOn??'statute (no single decision date)'}</dd>
    <dt>Research status</dt><dd>{human(open.researchStatus)} (catalog curated {open.catalogCuratedOn})</dd><dt>Why it matters</dt><dd>{open.relevance}</dd><dt>Scope limits</dt><dd>{open.scopeLimitations}</dd>
    {open.caution&&<><dt>Caution</dt><dd>{open.caution}</dd></>}<dt>Source</dt><dd><a href={open.sourceUrl} rel="noreferrer noopener" target="_blank">{open.sourceUrl}</a></dd></dl>
   <button type="button" className="action" onClick={()=>setOpen(null)}>Close source</button></div>}
 </section>;
}
export default function LegalLesson({catalog,bill}:{catalog:unknown;bill:unknown}){
 const [hydrated,setHydrated]=useState(false);useEffect(()=>setHydrated(true),[]);
 const [lessonId,setLessonId]=useState<LessonId>('education');
 const [caseId,setCaseId]=useState<string>(LEGAL_LESSONS.education.caseIds[0]!);
 const [state,setState]=useState<LegalLessonState>(()=>createLegalLesson('education',LEGAL_LESSONS.education.caseIds[0]!));
 const [hypothesis,setHypothesis]=useState(''),[prediction,setPrediction]=useState(''),[explanation,setExplanation]=useState(''),[error,setError]=useState('');
 const [transferId,setTransferId]=useState(''),[transferPrediction,setTransferPrediction]=useState('');
 const library=useMemo(()=>runCaseLibrary(catalog,bill),[catalog,bill]);
 const act=(fn:()=>LegalLessonState)=>{try{setState(fn());setError('')}catch(e){setError(e instanceof Error?e.message:'Step unavailable')}};
 function start(nextLesson:LessonId,nextCase:string){setLessonId(nextLesson);setCaseId(nextCase);setState(createLegalLesson(nextLesson,nextCase));setPrediction('');setTransferId('');setTransferPrediction('');setError('')}
 const current=caseOf(state.caseId),options=OUTCOME_OPTIONS[current.evaluator].options;
 const view=state.run?buildTruthLayerView(state.run,current.input,catalog,bill):null;
 const candidates=state.stage==='transfer'?transferCandidates(state):[];
 const transferCase=transferId?caseOf(transferId):null;
 return <section className="learning-card legal-lesson" aria-labelledby="legal-lesson-title" data-hydrated={hydrated?'true':'false'}>
  <p className="stage-label">Legal cases · {LEGAL_LESSONS[lessonId].title}</p>
  <h2 id="legal-lesson-title">{LEGAL_LESSONS[lessonId].question}</h2>
  <fieldset><legend>Choose a lesson and a case</legend>
   <label>Lesson <select value={lessonId} onChange={e=>{const l=e.target.value as LessonId;start(l,LEGAL_LESSONS[l].caseIds[0]!)}}>{(Object.keys(LEGAL_LESSONS) as LessonId[]).map(l=><option key={l} value={l}>{LEGAL_LESSONS[l].title}</option>)}</select></label>
   <label>Case <select value={caseId} onChange={e=>start(lessonId,e.target.value)}>{LEGAL_LESSONS[lessonId].caseIds.map(id=><option key={id} value={id}>{caseOf(id).context}</option>)}</select></label>
  </fieldset>
  <p><strong>Common intuition to test:</strong> “{current.intuition}”</p>
  <p className="lesson-stage" aria-live="polite">Stage: {state.stage}</p>
  {state.stage==='hypothesize'&&<div><label className="response-label">What do you think, and why? Any view is welcome.<textarea className="response" value={hypothesis} onChange={e=>setHypothesis(e.target.value)}/></label>
   <div className="controls"><button type="button" className="action action-primary" onClick={()=>act(()=>recordLegalHypothesis(state,hypothesis))}>Record legal hypothesis</button></div></div>}
  {state.stage==='predict'&&<fieldset><legend>Predict what the bounded evaluator will report</legend>
   {options.map(o=><label key={o}><input type="radio" name="legal-prediction" value={o} checked={prediction===o} onChange={()=>setPrediction(o)}/> {human(o)}</label>)}
   <div className="controls"><button type="button" className="action action-primary" onClick={()=>act(()=>commitLegalPrediction(state,prediction))}>Commit prediction</button></div></fieldset>}
  {state.stage==='experiment'&&<div className="controls"><button type="button" className="action action-primary" onClick={()=>act(()=>runLegalExperiment(state,catalog,bill))}>Evaluate this case</button></div>}
  {state.observation&&<div role="region" aria-label="Prediction beside the evaluated outcome"><p>You predicted <strong>{human(state.observation.predicted)}</strong>. The evaluator reports <strong>{human(state.observation.observed)}</strong>{state.observation.matched?'.':' — different from your prediction.'}</p></div>}
  {view&&<SourceInspector view={view} catalog={catalog}/>}
  {state.stage==='observe'&&<div className="controls"><button type="button" className="action action-primary" onClick={()=>act(()=>continueLegalExplanation(state))}>Explain the result</button></div>}
  {state.stage==='explain'&&<div><label className="response-label">Explain the result in your own words. You may disagree with it—say why.<textarea className="response" value={explanation} onChange={e=>setExplanation(e.target.value)}/></label>
   {state.challenges.length>0&&<div role="region" aria-label="Socratic legal challenge"><ul>{state.challenges.map(c=><li key={c.claim}>{c.question}</li>)}</ul></div>}
   <div className="controls"><button type="button" className="action action-primary" onClick={()=>act(()=>submitLegalExplanation(state,explanation))}>Submit legal explanation</button>
    {state.challenges.length>0&&<button type="button" className="action" onClick={()=>act(()=>submitLegalExplanation(state,explanation,{acknowledgeChallenge:true}))}>Keep my wording and continue</button>}</div></div>}
  {state.stage==='transfer'&&<fieldset><legend>Transfer: try a case that challenges the opposite intuition</legend>
   <label>Transfer case <select value={transferId} onChange={e=>{setTransferId(e.target.value);setTransferPrediction('')}}><option value="">Choose…</option>{candidates.map(id=><option key={id} value={id}>{caseOf(id).context}</option>)}</select></label>
   {transferCase&&<><p>Intuition: “{transferCase.intuition}”</p>{OUTCOME_OPTIONS[transferCase.evaluator].options.map(o=><label key={o}><input type="radio" name="transfer-prediction" checked={transferPrediction===o} onChange={()=>setTransferPrediction(o)}/> {human(o)}</label>)}</>}
   <div className="controls"><button type="button" className="action action-primary" onClick={()=>act(()=>runLegalTransfer(state,transferId,transferPrediction,catalog,bill))}>Evaluate transfer case</button></div></fieldset>}
  {state.stage==='complete'&&state.transfer&&<p role="status" className="status-note">Transfer: you predicted {human(state.transfer.prediction)}; the evaluator reports {human(state.transfer.observed)}. Lesson complete — agreement is not required.</p>}
  <div className="controls"><button type="button" className="action" onClick={()=>act(()=>viewLegalExplanation(state,catalog,bill))}>See direct explanation</button></div>
  {state.directExplanation&&<p className="status-note">{state.directExplanation}</p>}
  {error&&<p className="error" role="alert">{error}</p>}
  <details className="case-library"><summary>All {library.total} adversarial cases ({library.balance['favors-learning']} challenge pro-learning intuitions, {library.balance['favors-restriction']} challenge pro-restriction intuitions)</summary>
   <table><caption>Case library results (golden checks: {library.passed} of {library.total} reproduce)</caption><thead><tr><th scope="col">Context</th><th scope="col">Intuition challenged</th><th scope="col">Evaluated outcome</th></tr></thead>
    <tbody>{library.cases.map(c=><tr key={c.id}><th scope="row">{c.context}</th><td>{c.intuition}</td><td>{Object.values(c.observed).map(v=>Array.isArray(v)?v.join(', ')||'none':human(String(v))).join(' · ')}</td></tr>)}</tbody></table></details>
  <p className="lesson-data">Educational fixtures over a dated source catalog. Not legal advice. The Right to Learn proposal is an incomplete draft, not enacted law.</p>
 </section>;
}
