import {useEffect,useState} from 'react';
import {createProgressStore,MODULE_IDS} from '../../../../packages/progress/src/progress.mjs';
import type {Loaded} from '../../../../packages/progress/src/progress.mjs';
// TLM-089: optional local progress. No account; off until switched on; explicit clear; portable export/import.
const NAMES:Record<string,string>={vision:'Vision lab','teach-machine':'Teach a Machine','model-internals':'What Did the Machine Learn?',music:'Music lab','legal-cases':'Legal cases',market:'Creator, Student and Market','write-the-law':'Write the Law',capstone:'Capstone'};
const storage=()=>{try{return globalThis.localStorage}catch{return null}};
export default function ProgressControls({releaseDigest}:{releaseDigest:string}){
 const [state,setState]=useState<Loaded>({status:'disabled',modules:{}}),[text,setText]=useState(''),[message,setMessage]=useState(''),[hydrated,setHydrated]=useState(false);
 const store=()=>createProgressStore(storage(),{releaseDigest});
 useEffect(()=>{(globalThis as {__TLM_RELEASE__?:string}).__TLM_RELEASE__=releaseDigest;const r=store().load();setState(r);if(r.discarded)setMessage('Saved progress was unreadable and has been discarded: '+r.reason);setHydrated(true)},[]);
 const refresh=()=>setState(store().load());
 return <section className="learning-card progress-controls" aria-labelledby="progress-title" data-progress-hydrated={hydrated?'true':'false'}>
  <h2 id="progress-title">Your progress (optional, this browser only)</h2>
  <p>Progress is not saved unless you switch it on. It stays in this browser; there is no account.</p>
  <label><input type="checkbox" checked={state.status!=='disabled'} onChange={e=>{const s=store();if(e.target.checked){s.enable();setMessage('Local progress is on.')}else{setMessage(s.clear().note)}refresh()}}/> Save my progress in this browser</label>
  {state.status!=='disabled'&&<>
   <ul aria-label="Saved module progress">{MODULE_IDS.map(id=><li key={id}>{NAMES[id]}: {state.modules[id]?.stage??'not started'}</li>)}</ul>
   {state.releaseChanged&&<p className="status-note">This progress was saved with an earlier version of the lessons.</p>}
   <div className="controls"><button type="button" className="action" onClick={()=>{setText(store().exportText());setMessage('Copy this text to keep a portable record.')}}>Export progress</button>
    <button type="button" className="action" onClick={()=>{try{store().importText(text);refresh();setMessage('Progress imported.')}catch(e){setMessage(e instanceof Error?e.message:'Import failed')}}}>Import progress</button>
    <button type="button" className="action" onClick={()=>{setMessage(store().clear().note);setText('');refresh()}}>Clear saved progress</button></div>
   <label className="response-label">Portable progress text<textarea className="response" value={text} onChange={e=>setText(e.target.value)}/></label>
  </>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
