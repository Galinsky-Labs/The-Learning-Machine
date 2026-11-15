import {useEffect,useMemo,useState} from 'react';
import {reportProgress} from '../../../../packages/progress/src/progress.mjs';
import {createBuilder,applyAction,buildPolicy,draftToPolicyInput,describeRule,FACT_CHOICES} from '../../../../packages/policy-lab/src/rule-builder.mjs';
import type {Builder} from '../../../../packages/policy-lab/src/rule-builder.mjs';
import {STUDIO_SCENARIOS,comparePolicies,tradeoffMatrix,exportHistory,importHistory,forkRevision,replayHistory} from '../../../../packages/policy-lab/src/studio.mjs';
import type {StudioPolicy,History} from '../../../../packages/policy-lab/src/studio.mjs';
import {createWriteLawLesson,submitDraft,predictDraftOutcomes,runStressTest,respondToCounterexample,defendPolicy,PREDICTION_SCENARIOS} from '../../../../packages/policy-lab/src/write-law-lesson.mjs';
import type {WriteLawLesson} from '../../../../packages/policy-lab/src/write-law-lesson.mjs';

const EFFECTS=['permit','restrict','conditional','unresolved'];
const OUTCOMES=['permit','restrict','conditional','unresolved','disputed'];
const FACTS=Object.keys(FACT_CHOICES);
const parse=(fact:string,v:string)=>{const c=FACT_CHOICES[fact]!.find(x=>String(x)===v);return c===undefined?v:c};
function TermPicker({onAdd,label,withEffect}:{onAdd:(fact:string,value:unknown,effect:string)=>void;label:string;withEffect?:boolean}){
 const [fact,setFact]=useState(FACTS[0]!),[value,setValue]=useState(String(FACT_CHOICES[FACTS[0]!]![0])),[effect,setEffect]=useState('restrict');
 return <fieldset className="term-picker"><legend>{label}</legend>
  <label>Fact <select value={fact} onChange={e=>{setFact(e.target.value);setValue(String(FACT_CHOICES[e.target.value]![0]))}}>{FACTS.map(f=><option key={f}>{f}</option>)}</select></label>
  <label>Value <select value={value} onChange={e=>setValue(e.target.value)}>{FACT_CHOICES[fact]!.map(v=><option key={String(v)}>{String(v)}</option>)}</select></label>
  {withEffect&&<label>Then <select value={effect} onChange={e=>setEffect(e.target.value)}>{EFFECTS.map(x=><option key={x}>{x}</option>)}</select></label>}
  <button type="button" className="action" onClick={()=>onAdd(fact,parse(fact,value),effect)}>{label}</button></fieldset>;
}
export default function LawStudio({bill}:{bill:unknown}){
 const [hydrated,setHydrated]=useState(false);useEffect(()=>setHydrated(true),[]);
 const [builder,setBuilder]=useState<Builder>(()=>applyAction(createBuilder(),{type:'add-rule',effect:'permit'}));
 const [lesson,setLesson]=useState<WriteLawLesson>(()=>createWriteLawLesson());
 const [predictions,setPredictions]=useState<Record<string,string>>(Object.fromEntries(PREDICTION_SCENARIOS.map(s=>[s,'permit'])));
 const [finding,setFinding]=useState(''),[reason,setReason]=useState(''),[useCurrentDraft,setUseCurrentDraft]=useState(false),[stance,setStance]=useState('mixed'),[statement,setStatement]=useState('');
 const [scenarioId,setScenarioId]=useState(STUDIO_SCENARIOS[0]!.id),[portable,setPortable]=useState(''),[portableStatus,setPortableStatus]=useState(''),[error,setError]=useState('');
 const dispatch=(action:Record<string,unknown>&{type:string})=>{try{setBuilder(b=>applyAction(b,action));setError('')}catch(e){setError(e instanceof Error?e.message:'Invalid edit')}};
 const act=(fn:()=>WriteLawLesson)=>{try{setLesson(fn());setError('')}catch(e){setError(e instanceof Error?e.message:'Step unavailable')}};
 let current:StudioPolicy|null=null,draftError='';try{current=buildPolicy(builder)}catch(e){draftError=e instanceof Error?e.message:'Draft incomplete'}
 const history:History|null=lesson.history;
 useEffect(()=>{if(lesson.stage!=='draft')reportProgress('write-the-law',lesson.stage==='complete'?'complete':lesson.stage==='defend'?'revised':lesson.stage==='revise'?'observed':'predicted')},[lesson.stage]);
 const policies=useMemo(()=>history?Object.values(history.heads).map(id=>history.revisions.find(r=>r.id===id)!.policy):[],[history]);
 const compareSet=current&&policies.length?[policies[0]!,...(JSON.stringify(current)!==JSON.stringify(policies[0])?[current]:[])]:current?[current]:[];
 const comparison=compareSet.length?comparePolicies({proposal:bill,policies:compareSet},STUDIO_SCENARIOS.find(s=>s.id===scenarioId)!.facts):null;
 const matrix=compareSet.length?tradeoffMatrix(compareSet):null;
 const d=builder.present;
 return <section className="learning-card law-studio" aria-labelledby="studio-title" data-hydrated={hydrated?'true':'false'}>
  <p className="stage-label">Module 7 · Write the Law</p>
  <h2 id="studio-title">Draft your own rule, then let the scenarios argue with it.</h2>
  <p className="lesson-data">Your rule is a visitor-authored hypothesis. It is not current law or the proposal, and it stays in this browser unless you export it.</p>
  <section aria-labelledby="builder-title"><h3 id="builder-title">Rule builder</h3>
   <label>Policy title <input value={d.title} onChange={e=>dispatch({type:'set-title',title:e.target.value})}/></label>
   <label>When no rule applies <select value={d.defaultEffect} onChange={e=>dispatch({type:'set-default',effect:e.target.value})}>{EFFECTS.map(x=><option key={x}>{x}</option>)}</select></label>
   <div className="controls"><button type="button" className="action" onClick={()=>dispatch({type:'add-rule',effect:'permit'})}>Add rule</button>
    <button type="button" className="action" disabled={!builder.past.length} onClick={()=>dispatch({type:'undo'})}>Undo</button>
    <button type="button" className="action" disabled={!builder.future.length} onClick={()=>dispatch({type:'redo'})}>Redo</button></div>
   {d.rules.map(r=><fieldset key={r.id} className="studio-rule"><legend>{r.label}</legend>
    <p className="rule-sentence">{describeRule(r)}</p>
    <label>Effect <select value={r.effect} onChange={e=>dispatch({type:'set-effect',ruleId:r.id,effect:e.target.value})}>{EFFECTS.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Terms must <select value={r.group} onChange={e=>dispatch({type:'set-group',ruleId:r.id,group:e.target.value})}><option value="all">all match</option><option value="any">any match</option></select></label>
    <label>Annotation <input value={r.annotation} onChange={e=>dispatch({type:'set-annotation',ruleId:r.id,annotation:e.target.value})}/></label>
    <TermPicker label={`Add term to ${r.label}`} onAdd={(fact,value)=>dispatch({type:'add-term',ruleId:r.id,fact,operator:'eq',value})}/>
    <TermPicker label={`Add exclusion to ${r.label}`} onAdd={(fact,value)=>dispatch({type:'add-exclusion',ruleId:r.id,fact,operator:'eq',value})}/>
    <TermPicker label={`Add carve-out to ${r.label}`} withEffect onAdd={(fact,value,effect)=>dispatch({type:'add-carve-out',ruleId:r.id,fact,operator:'eq',value,effect,label:'Carve-out'})}/>
    <button type="button" className="action" onClick={()=>dispatch({type:'remove-rule',ruleId:r.id})}>Remove {r.label}</button>
   </fieldset>)}
   {draftError&&<p role="status" className="status-note">Draft not yet valid: {draftError}</p>}
  </section>
  <section aria-labelledby="studio-lesson"><h3 id="studio-lesson">Lesson stage: {lesson.stage}</h3>
   {lesson.stage==='draft'&&<button type="button" className="action action-primary" disabled={!current} onClick={()=>act(()=>submitDraft(lesson,draftToPolicyInput(builder.present)))}>Submit first draft</button>}
   {lesson.stage==='predict'&&<fieldset><legend>Predict your draft's outcome on three scenarios</legend>{PREDICTION_SCENARIOS.map(id=><label key={id}>{STUDIO_SCENARIOS.find(s=>s.id===id)!.label} <select value={predictions[id]} onChange={e=>setPredictions(p=>({...p,[id]:e.target.value}))}>{OUTCOMES.map(o=><option key={o}>{o}</option>)}</select></label>)}
    <button type="button" className="action action-primary" onClick={()=>act(()=>predictDraftOutcomes(lesson,predictions))}>Commit outcome predictions</button></fieldset>}
   {lesson.observed&&<ul aria-label="Predicted versus evaluated">{lesson.observed.map(o=><li key={o.scenarioId}>{o.scenarioId}: predicted {o.predicted}, evaluated {o.observed}{o.matched?'':' (differs)'}</li>)}</ul>}
   {lesson.stage==='stress'&&<button type="button" className="action action-primary" onClick={()=>act(()=>runStressTest(lesson))}>Run the stress test</button>}
   {lesson.stress&&<div role="region" aria-label="Stress-test findings"><p>{lesson.stress.checksRun} checks ({lesson.stress.balance.underProtect} for under-protecting creators, {lesson.stress.balance.overRestrict} for over-restricting learning). {lesson.stress.note}</p>
    {lesson.stress.findings.length===0?<p>No flagged counterexamples on these scenarios.</p>:<ul>{lesson.stress.findings.map(f=><li key={f.checkId+f.scenarioId}><strong>{f.checkId}</strong> ({f.scenarioId} → {f.outcome}): {f.question}</li>)}</ul>}
    {lesson.stress.hinges.length>0&&<p>Your rule hinges on: {[...new Set(lesson.stress.hinges.map(h=>h.fact))].join(', ')}.</p>}</div>}
   {lesson.stage==='revise'&&<fieldset><legend>Respond to a counterexample</legend>
    {lesson.stress!.findings.length>0&&<label>Finding <select aria-label="Stress-test finding" value={finding} onChange={e=>setFinding(e.target.value)}><option value="">Choose…</option>{[...new Set(lesson.stress!.findings.map(f=>f.checkId))].map(id=><option key={id}>{id}</option>)}</select></label>}
    <label><input type="checkbox" checked={useCurrentDraft} onChange={e=>setUseCurrentDraft(e.target.checked)}/> Save the builder's current draft as my revision (otherwise I keep the first draft)</label>
    <label className="response-label">Why?<textarea className="response" value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <button type="button" className="action action-primary" onClick={()=>act(()=>respondToCounterexample(lesson,{findingCheckId:finding||undefined,revisedPolicyInput:useCurrentDraft&&current?draftToPolicyInput(builder.present):null,reason}))}>Record response</button></fieldset>}
   {lesson.stage==='defend'&&<fieldset><legend>Defend your draft—dissent is welcome</legend>
    <label>Stance toward the proposal's direction <select value={stance} onChange={e=>setStance(e.target.value)}>{['supports-proposal-direction','opposes-proposal-direction','mixed','neither'].map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="response-label">Your statement<textarea className="response" value={statement} onChange={e=>setStatement(e.target.value)}/></label>
    <button type="button" className="action action-primary" onClick={()=>act(()=>defendPolicy(lesson,{stance,statement}))}>Finish the module</button></fieldset>}
   {lesson.stage==='complete'&&<p role="status" className="status-note">Module complete with {lesson.defense!.revisions} saved revision(s). Your stance ({lesson.defense!.stance}) was not scored.</p>}
  </section>
  {comparison&&<section aria-labelledby="compare-title"><h3 id="compare-title">Same facts, different rules</h3>
   <label>Scenario <select aria-label="Comparison scenario" value={scenarioId} onChange={e=>setScenarioId(e.target.value)}>{STUDIO_SCENARIOS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
   <table><caption>Outcomes on identical facts (digest {comparison.factsDigest})</caption><tbody>
    <tr><th scope="row">Present law</th><td>{comparison.presentLaw.outcome} — {comparison.presentLaw.reason}</td></tr>
    <tr><th scope="row">Proposal</th><td>{comparison.proposal.outcome} (not enacted law)</td></tr>
    {comparison.visitor.map((v,i)=><tr key={v.policyId+i}><th scope="row">{i===0&&policies.length?'Saved draft':'Current builder draft'} ({v.policyId})</th><td>{v.outcome}{v.decidedBy.length?` — decided by ${v.decidedBy.join(', ')}`:''}</td></tr>)}
   </tbody></table>
   {comparison.pairwise.map(p=><p key={p.variant} role="status">{p.outcomeChanged?`Changing ${p.responsibleRules.join(', ')||'the combination of rules'} moved the outcome from ${p.baseOutcome} to ${p.variantOutcome}.`:'Your edits do not change the outcome on this scenario.'}</p>)}
  </section>}
  {matrix&&<section aria-labelledby="tradeoff-title"><h3 id="tradeoff-title">Tradeoffs and uncertainty across all scenarios</h3>
   <table><caption>Outcome and who bears it, per scenario</caption><thead><tr><th scope="col">Scenario</th>{matrix.rows[0]!.outcomes.map((o,i)=><th scope="col" key={i}>{o.policyId}</th>)}</tr></thead>
    <tbody>{matrix.rows.map(r=><tr key={r.scenarioId}><th scope="row">{r.label}</th>{r.outcomes.map((o,i)=><td key={i}><span className={`outcome outcome-${o.outcome}`}>{o.outcome}</span> — creator {o.actors.creator}; learner {o.actors.learner}</td>)}</tr>)}</tbody></table>
   <p>{matrix.note}</p></section>}
  {history&&<section aria-labelledby="history-title"><h3 id="history-title">History, forks and portable export</h3>
   <ol>{history.revisions.map(r=><li key={r.id}>{r.id} on {r.branch}{r.parent?` (from ${r.parent})`:''}: {r.note} — evidence {replayHistory(history).find(x=>x.id===r.id)!.intact?'replays intact':'changed'}</li>)}</ol>
   <div className="controls"><button type="button" className="action" disabled={!current} onClick={()=>{try{setLesson(l=>({...l,history:forkRevision(l.history!,'r1','fork-'+(Object.keys(l.history!.heads).length),draftToPolicyInput(builder.present),'Alternative fork')}));setPortableStatus('Fork saved locally.')}catch(e){setError(e instanceof Error?e.message:'Fork failed')}}}>Fork the first draft with the current builder</button>
    <button type="button" className="action" onClick={()=>setPortable(exportHistory(history))}>Export history as text</button>
    <button type="button" className="action" onClick={()=>{try{const h=importHistory(portable);setPortableStatus(`Imported ${h.revisions.length} revisions; all evidence replays.`)}catch(e){setPortableStatus('Rejected: '+(e instanceof Error?e.message:'invalid'))}}}>Verify imported history</button></div>
   <label className="response-label">Portable history (stays on this device)<textarea className="response" value={portable} onChange={e=>setPortable(e.target.value)}/></label>{portableStatus&&<p role="status">{portableStatus}</p>}
  </section>}
  {error&&<p className="error" role="alert">{error}</p>}
 </section>;
}
