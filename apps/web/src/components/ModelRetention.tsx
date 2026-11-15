import {useMemo,useState} from 'react';
import type {ShapeDataset,DrawingPixels} from '../../../../packages/learning-lab/src/dataset.mjs';
import type {HoldoutSplit} from '../../../../packages/learning-lab/src/split.mjs';
import type {NeuralModel} from '../../../../packages/learning-lab/src/neural.mjs';
import {trainLinearClassifier,trainNearestExampleMemorizer} from '../../../../packages/learning-lab/src/classifier.mjs';
import {createLocalTrainingStore,storeModel,disposeTrainingData,inspectStore,auditRetention} from '../../../../packages/learning-lab/src/retention.mjs';
import type {TrainingStore} from '../../../../packages/learning-lab/src/retention.mjs';
import {traceNetworkForward,validateMicroscopeTrace} from '../../../../packages/learning-lab/src/microscope.mjs';
import {TRANSFER_TASKS,runTransferChallenge,recordTransferRevision} from '../../../../packages/learning-lab/src/transfer.mjs';
import type {TransferModelKey,TransferResult} from '../../../../packages/learning-lab/src/transfer.mjs';

const MODEL_NAMES:Record<TransferModelKey,string>={memorizer:'Nearest-example memorizer',linear:'Linear classifier',network:'Neural network'};
const KEYS:TransferModelKey[]=['memorizer','linear','network'];
function Drawing({pixels,label}:{pixels:DrawingPixels;label:string}){
 return <svg viewBox="0 0 16 16" width="64" height="64" role="img" aria-label={label} className="mini-drawing">{pixels.map((v,i)=>v?<rect key={i} x={i%16} y={Math.floor(i/16)} width="1" height="1"/>:null)}</svg>;
}
export type RetentionProps={dataset:ShapeDataset;split:HoldoutSplit;network:NeuralModel;onProgress?:(step:'disposed'|'microscope'|'transfer'|'revised',detail?:string)=>void};
export default function ModelRetention({dataset,split,network,onProgress}:RetentionProps){
 const models=useMemo(()=>({memorizer:trainNearestExampleMemorizer(dataset,split),linear:trainLinearClassifier(dataset,split),network}),[dataset,split,network]);
 const audits=useMemo(()=>KEYS.map(k=>[k,auditRetention(models[k],dataset,split)] as const),[models,dataset,split]);
 const [store,setStore]=useState<TrainingStore>(()=>{let s=createLocalTrainingStore(dataset,split);for(const k of KEYS)s=storeModel(s,k,models[k]);return s});
 const report=inspectStore(store);
 const [probeId,setProbeId]=useState(dataset.examples[0]!.id);
 const probe=dataset.examples.find(e=>e.id===probeId)!;
 const trace=useMemo(()=>validateMicroscopeTrace(traceNetworkForward(network,probe.pixels)),[network,probe]);
 const [predictions,setPredictions]=useState<Record<string,Record<TransferModelKey,boolean>>>(()=>Object.fromEntries(TRANSFER_TASKS.map(t=>[t.id,{memorizer:true,linear:true,network:true}])));
 const [transfer,setTransfer]=useState<TransferResult|null>(null),[revisionText,setRevisionText]=useState(''),[cited,setCited]=useState(''),[revision,setRevision]=useState(''),[error,setError]=useState('');
 function dispose(){setStore(disposeTrainingData(store));onProgress?.('disposed')}
 function run(){const r=runTransferChallenge(models,predictions);setTransfer(r);setCited(r.unexpectedFailures[0]?.taskId??'');setRevision('');onProgress?.('transfer')}
 function revise(){
  try{if(!transfer)return;const r=recordTransferRevision(transfer,revisionText,{citedTaskId:cited||undefined});setRevision(r.revision);setError('');onProgress?.('revised',r.revision)}
  catch(e){setError(e instanceof Error?e.message:'Revision not recorded')}
 }
 return <div className="model-retention">
  <section aria-labelledby="retention-title"><h3 id="retention-title">Dispose of the training data</h3>
   <p>The page keeps its drawings, split and three trained models in one local application store. Dispose of the drawings and see what remains.</p>
   <table><caption>Application store contents</caption><tbody>
    <tr><th scope="row">Training and test drawings</th><td data-testid="store-examples">{report.exampleCount}</td></tr>
    <tr><th scope="row">Train/test split</th><td>{report.hasSplit?'present':'removed'}</td></tr>
    {report.models.map(m=><tr key={m.name}><th scope="row">{MODEL_NAMES[m.name as TransferModelKey]}</th><td>retained — {m.storesExamplesVerbatim?`${m.storedExampleCount} exact training drawings stored inside`:`${m.parameterCount} learned numbers, no drawings stored`}</td></tr>)}
   </tbody></table>
   <button type="button" className="action" disabled={Boolean(store.disposal)} onClick={dispose}>Dispose of the training data</button>
   {store.disposal&&<p role="status">Removed {store.disposal.removedExampleCount} drawings from the application store. {store.disposal.modelsRetained} models were kept.</p>}
   <h4>What the retained models still reveal (measured before disposal)</h4>
   <ul>{audits.map(([k,a])=><li key={k}><strong>{MODEL_NAMES[k]}:</strong> {a.summary}</li>)}</ul>
   <ul className="disclosures" aria-label="Retention disclosures">{report.disclosures.map(d=><li key={d}>{d}</li>)}</ul>
  </section>
  <section aria-labelledby="microscope-title"><h3 id="microscope-title">Microscope: one forward pass</h3>
   <label>Drawing to trace <select value={probeId} onChange={e=>{setProbeId(e.target.value);onProgress?.('microscope')}}>{dataset.examples.map(e=><option key={e.id} value={e.id}>{e.id} ({e.label})</option>)}</select></label>
   <Drawing pixels={probe.pixels} label={`Drawing ${probe.id}, labelled ${probe.label}`}/>
   <table><caption>Executed steps and their provenance</caption><thead><tr><th scope="col">Step</th><th scope="col">Provenance</th><th scope="col">Result</th></tr></thead><tbody>
    {trace.steps.map(s=><tr key={s.id}><th scope="row">{s.label}</th><td><span className={`kind kind-${s.kind}`}>{s.kind}</span></td><td>
     {s.kind==='measured'?`${s.value!.toFixed(3)} ${s.unit} (${s.clock}). ${s.description}`:s.kind==='illustration'?s.disclosure:s.id==='input'?s.description:s.id==='softmax'?s.values!.map((v,i)=>`${s.labels![i]} ${(v*100).toFixed(1)}%`).join(', '):`${s.operation}: [${s.values!.slice(0,8).map(v=>v.toFixed(3)).join(', ')}${s.values!.length>8?', …':''}]${s.description?' '+s.description:''}`}
    </td></tr>)}</tbody></table>
  </section>
  <section aria-labelledby="transfer-title"><h3 id="transfer-title">Transfer challenge</h3>
   <p>Before running, predict whether each model will label each new drawing correctly. These drawings appear in neither the training nor the held-out set.</p>
   {TRANSFER_TASKS.map(t=><fieldset key={t.id}><legend>{t.prompt}</legend><Drawing pixels={t.pixels} label={t.prompt}/>
    {t.label===null?<p>No prediction is needed: there is no correct label.</p>:KEYS.map(k=><label key={k}><input type="checkbox" checked={predictions[t.id]![k]} onChange={e=>{setPredictions(p=>({...p,[t.id]:{...p[t.id]!,[k]:e.target.checked}}));setTransfer(null)}}/> {MODEL_NAMES[k]} will answer “{t.label}”</label>)}
   </fieldset>)}
   <button type="button" className="action action-primary" onClick={run}>Run the transfer challenge</button>
   {transfer&&<div role="region" aria-label="Transfer challenge results">
    <table><caption>Computed answers on novel drawings</caption><thead><tr><th scope="col">Drawing</th>{KEYS.map(k=><th scope="col" key={k}>{MODEL_NAMES[k]}</th>)}</tr></thead><tbody>
     {transfer.rows.map(r=><tr key={r.taskId}><th scope="row">{r.taskId}{r.ambiguous?' (no ground truth)':` (expected ${r.expectedLabel})`}</th>{KEYS.map(k=>{const o=r.outcomes[k];return <td key={k}>{o.predictedLabel}{o.correct===null?'':o.correct?' ✓ correct':' ✗ wrong'}{o.surprise?' — surprised you':''}</td>})}</tr>)}
    </tbody></table>
    <p>{transfer.ambiguityNote}</p>
    <p role="status">{transfer.revisionRequired?`${transfer.unexpectedFailures.length} result(s) failed where you expected success. Revise your explanation using one of them.`:'Your predictions held. You may still record what you would test next.'}</p>
    {transfer.revisionRequired&&<label>Failure you are responding to <select value={cited} onChange={e=>setCited(e.target.value)}>{[...new Set(transfer.unexpectedFailures.map(f=>f.taskId))].map(id=><option key={id} value={id}>{id}</option>)}</select></label>}
    <label className="response-label">How does this change your explanation of what the models learned?<textarea className="response" value={revisionText} onChange={e=>setRevisionText(e.target.value)}/></label>
    <button type="button" className="action" onClick={revise}>Record transfer revision</button>
    {error&&<p className="error" role="alert">{error}</p>}{revision&&<p role="status">Revision recorded after observation: “{revision}”</p>}
   </div>}
  </section>
 </div>;
}
