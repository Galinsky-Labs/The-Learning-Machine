import {useEffect,useState} from 'react';
// TLM-086..088: optional tutor. Off by default; nothing is sent until the visitor reads what is sent and opts in.
// Without a configured API (PUBLIC_TUTOR_API_URL) or provider key, only the authored hints are used.
type Node={stage:string;prompt:string;hints:string[]};
type Evidence={id:string;kind:'computed'|'authored'|'measured'|'simulated'|'sourced';text:string};
type Turn={source:string;label:string;text:string;reason?:string};
const API=((import.meta as unknown as {env?:Record<string,string|undefined>}).env?.PUBLIC_TUTOR_API_URL??'').replace(/\/$/,'');
export default function TutorPanel({node,evidence}:{node:Node;evidence:Evidence[]}){
 const [hydrated,setHydrated]=useState(false);useEffect(()=>setHydrated(true),[]);
 const [enabled,setEnabled]=useState(false),[includeQuestion,setIncludeQuestion]=useState(false),[question,setQuestion]=useState('');
 const [consent,setConsent]=useState<string|null>(null),[turn,setTurn]=useState<Turn|null>(null),[hintLevel,setHintLevel]=useState(0),[status,setStatus]=useState('');
 const offline=()=>{const i=Math.min(hintLevel,node.hints.length-1);setTurn({source:'offline-authored',label:'Authored hint (no AI was used)',text:node.hints[i]??'Try predicting before you test.'});setHintLevel(i+1)};
 async function ask(){
  if(!enabled||!API){offline();if(enabled&&!API)setStatus('No tutor service is configured for this site, so an authored hint was shown.');return}
  try{
   let token=consent;
   if(!token){const r=await fetch(API+'/tutor/consent',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({acknowledged:true,scopes:includeQuestion?['send-lesson-context','send-my-question']:['send-lesson-context']})});if(!r.ok)throw new Error('consent '+r.status);token=(await r.json()).consentToken as string;setConsent(token)}
   const r=await fetch(API+'/tutor/turn',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({consentToken:token,lesson:{...node,hintLevel},evidence,question:includeQuestion&&question.trim()?question.trim():undefined})});
   if(!r.ok)throw new Error('tutor '+r.status);setTurn(await r.json());setStatus('');
  }catch(e){offline();setStatus('The optional tutor could not be reached, so an authored hint was shown.')}
 }
 return <section className="learning-card tutor-panel" aria-labelledby="tutor-title" data-tutor-hydrated={hydrated?'true':'false'}>
  <h2 id="tutor-title">Optional tutor</h2>
  <p>Every lesson works without it. Authored hints are always available and nothing leaves this page unless you switch the AI tutor on.</p>
  <details><summary>Exactly what would be sent if you switch it on</summary><ul><li>The lesson stage and question: “{node.prompt}”</li>{evidence.map(e=><li key={e.id}>Evidence ({e.kind}): {e.text}</li>)}<li>Your question, only if you also tick the box below.</li></ul><p>No account, name, drawings, audio or camera frames are sent. Consent lasts 30 minutes.</p></details>
  <label><input type="checkbox" checked={enabled} onChange={e=>{setEnabled(e.target.checked);setConsent(null)}}/> Use the AI tutor for this session</label>
  {enabled&&<label><input type="checkbox" checked={includeQuestion} onChange={e=>{setIncludeQuestion(e.target.checked);setConsent(null)}}/> Also send my own question</label>}
  {enabled&&includeQuestion&&<label className="response-label">Your question<textarea className="response" maxLength={400} value={question} onChange={e=>setQuestion(e.target.value)}/></label>}
  <div className="controls"><button type="button" className="action" onClick={ask}>{enabled?'Ask the tutor':'Show an authored hint'}</button></div>
  {turn&&<div role="status" className="status-note"><strong>{turn.label}:</strong> {turn.text}</div>}{status&&<p>{status}</p>}
 </section>;
}
