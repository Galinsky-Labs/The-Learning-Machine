import {useEffect,useState} from 'react';
import {reportProgress} from '../../../../packages/progress/src/progress.mjs';
import {EVIDENCE,CAPSTONE_EXERCISES,POSITIONS,assessCapstone} from '../../../../packages/policy-lab/src/capstone.mjs';
import type {CapstoneAssessment} from '../../../../packages/policy-lab/src/capstone.mjs';

export default function Capstone(){
 const [hydrated,setHydrated]=useState(false);useEffect(()=>setHydrated(true),[]);
 const [exerciseId,setExerciseId]=useState(CAPSTONE_EXERCISES[0]!.id),[position,setPosition]=useState('undecided');
 const [evidence,setEvidence]=useState<string[]>([]),[reasoning,setReasoning]=useState(''),[counter,setCounter]=useState(''),[response,setResponse]=useState('');
 const [result,setResult]=useState<CapstoneAssessment|null>(null),[error,setError]=useState('');
 const exercise=CAPSTONE_EXERCISES.find(e=>e.id===exerciseId)!;
 useEffect(()=>{if(result)reportProgress('capstone',result.complete?'complete':'explained')},[result]);
 function assess(){try{setResult(assessCapstone(exerciseId,{position,reasoning,evidenceIds:evidence,counterargument:counter,response}));setError('')}catch(e){setError(e instanceof Error?e.message:'Cannot assess')}}
 return <section className="learning-card capstone" aria-labelledby="capstone-title" data-hydrated={hydrated?'true':'false'}>
  <p className="stage-label">Module 8 · Right to Learn capstone</p>
  <h2 id="capstone-title">A new situation. Your call—and your reasons.</h2>
  <label>Exercise <select value={exerciseId} onChange={e=>{setExerciseId(e.target.value);setResult(null)}}>{CAPSTONE_EXERCISES.map(e=><option key={e.id} value={e.id}>{e.id.replace(/-/g,' ')}</option>)}</select></label>
  <p className="status-note">{exercise.prompt}</p>
  <fieldset><legend>Your position (undecided is a valid answer)</legend>{POSITIONS.map(p=><label key={p}><input type="radio" name="position" checked={position===p} onChange={()=>setPosition(p)}/> {p.replace(/-/g,' ')}</label>)}</fieldset>
  {(Object.keys(EVIDENCE) as (keyof typeof EVIDENCE)[]).map(domain=><fieldset key={domain}><legend>{domain} evidence you observed</legend>
   {Object.entries(EVIDENCE[domain]).map(([id,text])=><label key={id}><input type="checkbox" checked={evidence.includes(id)} onChange={e=>setEvidence(list=>e.target.checked?[...list,id]:list.filter(x=>x!==id))}/> {text}</label>)}</fieldset>)}
  <label className="response-label">How does the evidence apply here?<textarea className="response" value={reasoning} onChange={e=>setReasoning(e.target.value)}/></label>
  <label className="response-label">The strongest argument against your position<textarea className="response" value={counter} onChange={e=>setCounter(e.target.value)}/></label>
  <label className="response-label">Your response to it<textarea className="response" value={response} onChange={e=>setResponse(e.target.value)}/></label>
  <div className="controls"><button type="button" className="action action-primary" onClick={assess}>Check my reasoning</button></div>
  {error&&<p className="error" role="alert">{error}</p>}
  {result&&<div role="region" aria-label="Reasoning checklist"><ul>{result.criteria.map(c=><li key={c.id}>{c.met?'✓':'○'} {c.description}</li>)}</ul>
   <p role="status">{result.complete?'Capstone complete.':'Not complete yet—strengthen the unchecked items.'} {result.note}</p></div>}
 </section>;
}
