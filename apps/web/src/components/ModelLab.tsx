import {useEffect,useMemo,useRef,useState} from 'react';
import {buildLessonDataset,buildLessonSplit} from '../../../../packages/learning-lab/src/lesson-data.mjs';
import {trainNeuralNetwork,evaluateNetworkHoldout,NEURAL_LIMITS} from '../../../../packages/learning-lab/src/neural.mjs';
import type {NeuralModel} from '../../../../packages/learning-lab/src/neural.mjs';
import {inspectParameters,weightGrid,parameterChange,serializeModel,deserializeModel,parameterChecksum} from '../../../../packages/learning-lab/src/inspector.mjs';
import {createModelExperimentTrace,replayModelExperiment} from '../../../../packages/learning-lab/src/model-trace.mjs';
import type {ReplayResult} from '../../../../packages/learning-lab/src/model-trace.mjs';

type Backend='reference'|'tfjs';
const fmt=(n:number,d=4)=>Number.isFinite(n)?n.toFixed(d):'—';
export function WeightHeatmap({grid,label}:{grid:readonly (readonly number[])[];label:string}){
 const canvas=useRef<HTMLCanvasElement|null>(null);
 const peak=Math.max(1e-12,...grid.flat().map(Math.abs));
 useEffect(()=>{
  const ctx=canvas.current?.getContext('2d');if(!ctx)return;
  grid.forEach((row,r)=>row.forEach((v,c)=>{const t=Math.min(1,Math.abs(v)/peak),shade=Math.round(255-t*200);ctx.fillStyle=v>=0?`rgb(${shade},${shade},255)`:`rgb(255,${shade},${shade})`;ctx.fillRect(c*12,r*12,12,12)}));
 },[grid,peak]);
 return <figure className="weight-heatmap"><canvas ref={canvas} width={192} height={192} role="img" aria-label={`${label}: blue cells are positive stored weights, red cells negative; strongest magnitude ${peak.toFixed(4)}`}/><figcaption>{label}. Colour scale is relative to the largest stored magnitude ({peak.toFixed(4)}).</figcaption></figure>;
}
export default function ModelLab(){
 const dataset=useMemo(()=>buildLessonDataset(),[]),split=useMemo(()=>buildLessonSplit(dataset),[dataset]);
 const [backend,setBackend]=useState<Backend>('reference'),[preferGpu,setPreferGpu]=useState(false);
 const [hiddenUnits,setHiddenUnits]=useState(8),[epochs,setEpochs]=useState(60);
 const [model,setModel]=useState<NeuralModel|null>(null),[status,setStatus]=useState('Not trained yet. Nothing has been downloaded.'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [unit,setUnit]=useState(0),[showNumbers,setShowNumbers]=useState(false);
 const [restoreText,setRestoreText]=useState(''),[restoreResult,setRestoreResult]=useState(''),[replay,setReplay]=useState<ReplayResult|null>(null);
 const [hydrated,setHydrated]=useState(false);useEffect(()=>setHydrated(true),[]);
 const controller=useRef<AbortController|null>(null);
 async function train(){
  setBusy(true);setError('');setReplay(null);setRestoreResult('');
  const abort=new AbortController();controller.current=abort;
  setStatus(backend==='tfjs'?'Loading optional TensorFlow.js locally, then training…':'Training the built-in reference network…');
  try{
   const loader=async()=>{const {loadTensorflow}=await import('../../../../packages/learning-lab/src/tf-loader.mjs');return loadTensorflow({preferGpu})};
   const trained=await trainNeuralNetwork(dataset,split,{hiddenUnits,epochs},{backend,loadTensorflow:loader,signal:abort.signal});
   setModel(trained);setUnit(0);
   setStatus(`Trained with ${trained.backend}: ${trained.epochs} of ${trained.requestedEpochs} epochs (${trained.stoppedReason}).`);
  }catch(e){setError(e instanceof Error?e.message:'Training failed');setStatus('Training failed; the previous model, if any, is unchanged.')}
  finally{setBusy(false);controller.current=null}
 }
 const report=model?inspectParameters(model):null,change=model?parameterChange(model):null,held=model?evaluateNetworkHoldout(model,dataset,split):null;
 const grid=model?weightGrid(model,Math.min(unit,model.hiddenUnits-1)):null,trace=model?createModelExperimentTrace(model,dataset,split):null;
 function exportModel(){if(!model)return;const blob=new Blob([serializeModel(model)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='learning-machine-model.json';a.click();URL.revokeObjectURL(a.href)}
 function restore(){
  try{
   const restored=deserializeModel(restoreText);
   setRestoreResult(`Restored ${restored.algorithm} with checksum ${parameterChecksum(restored)}${model&&parameterChecksum(model)===parameterChecksum(restored)?' — identical to the current model.':'.'}`);
  }catch(e){setRestoreResult('Rejected: '+(e instanceof Error?e.message:'invalid model'))}
 }
 return <section className="learning-card model-lab" aria-labelledby="model-lab-title" data-hydrated={hydrated?'true':'false'}>
  <p className="stage-label">Model internals laboratory</p>
  <h2 id="model-lab-title">Train a small neural network and open it up</h2>
  <p>The training set is {split.trainIds.length} original drawings of lines, squares and crosses; {split.testIds.length} more are held out. Everything runs in this tab.</p>
  <fieldset><legend>Training engine</legend>
   <label><input type="radio" name="backend" checked={backend==='reference'} onChange={()=>setBackend('reference')}/> Built-in reference network (no download, exact replay)</label>
   <label><input type="radio" name="backend" checked={backend==='tfjs'} onChange={()=>setBackend('tfjs')}/> Optional TensorFlow.js (loaded from this site only when you train)</label>
   {backend==='tfjs'&&<label><input type="checkbox" checked={preferGpu} onChange={e=>setPreferGpu(e.target.checked)}/> Try the WebGL GPU backend first</label>}
   <label>Hidden units <input type="number" min={NEURAL_LIMITS.minHidden} max={NEURAL_LIMITS.maxHidden} value={hiddenUnits} onChange={e=>setHiddenUnits(Number(e.target.value))}/></label>
   <label>Epochs <input type="number" min={1} max={NEURAL_LIMITS.maxEpochs} value={epochs} onChange={e=>setEpochs(Number(e.target.value))}/></label>
  </fieldset>
  <div className="controls"><button type="button" className="action action-primary" disabled={!hydrated||busy} onClick={train}>Train neural network</button>
   <button type="button" className="action" disabled={!busy} onClick={()=>controller.current?.abort()}>Cancel training</button></div>
  <p role="status" className="status-note">{status}</p>{error&&<p className="error" role="alert">{error}</p>}
  {model&&report&&change&&held&&grid&&trace&&<>
   {model.fallbackReason&&<p className="status-note">TensorFlow.js was not used: {model.fallbackReason}. The built-in reference network trained instead, so the lesson continues.</p>}
   <section aria-labelledby="training-facts"><h3 id="training-facts">What happened</h3><ul>
    <li>Engine: <strong>{model.backend}</strong>; epochs completed: {model.epochs}; stop reason: {model.stoppedReason}.</li>
    <li>Training loss fell from {fmt(model.history[0]?.loss??NaN)} to {fmt(model.history.at(-1)?.loss??NaN)} (computed).</li>
    <li>Held-out accuracy: {held.correctCount} of {held.exampleCount} unseen drawings (computed).</li>
    <li>Wall-clock training time on this device: {model.trainingWallClockMs.toFixed(1)} ms (measured once; varies by device).</li></ul></section>
   <section aria-labelledby="parameter-inspector"><h3 id="parameter-inspector">Parameter inspector</h3>
    <table><caption>Stored parameters, read directly from the trained model ({report.totalParameters} numbers)</caption><thead><tr><th scope="col">Layer</th><th scope="col">Shape</th><th scope="col">Min</th><th scope="col">Max</th><th scope="col">Mean |w|</th><th scope="col">Changed by training</th></tr></thead>
     <tbody>{report.layers.map((l,i)=><tr key={l.name}><th scope="row">{l.name}</th><td>{l.weightShape.join(' × ')} + {l.biasLength}</td><td>{fmt(l.min)}</td><td>{fmt(l.max)}</td><td>{fmt(l.meanAbs)}</td><td>{change[i]!.changedParameters} of {change[i]!.parameterCount} (max Δ {fmt(change[i]!.maxAbsChange)})</td></tr>)}</tbody></table>
    <label>Hidden unit to view <select value={unit} onChange={e=>setUnit(Number(e.target.value))}>{Array.from({length:model.hiddenUnits},(_,i)=><option key={i} value={i}>Unit {i+1}</option>)}</select></label>
    <WeightHeatmap grid={grid} label={`Hidden unit ${unit+1} input weights`}/>
    <label><input type="checkbox" checked={showNumbers} onChange={e=>setShowNumbers(e.target.checked)}/> Show the exact 16 × 16 numbers</label>
    {showNumbers&&<div className="weight-table"><table><caption>Hidden unit {unit+1} stored weights by row and column</caption><tbody>{grid.map((row,r)=><tr key={r}><th scope="row">Row {r+1}</th>{row.map((v,c)=><td key={c}>{v.toFixed(3)}</td>)}</tr>)}</tbody></table></div>}
   </section>
   <section aria-labelledby="reproducibility"><h3 id="reproducibility">Reproducibility trace</h3>
    <p>Seed {trace.options.seed}, {trace.completedEpochs} epochs, learning rate {trace.options.learningRate}, dataset digest <code>{trace.datasetDigest}</code>, parameter checksum <code>{trace.parameterChecksum}</code>.</p>
    <ul>{trace.determinism.map(note=><li key={note}>{note}</li>)}</ul>
    <button type="button" className="action" onClick={()=>setReplay(replayModelExperiment(trace,model,dataset))}>Replay with the reference network</button>
    {replay&&<p role="status">Replay: <strong>{replay.status}</strong> — {replay.explanation} (largest difference {replay.maxAbsDifference.toExponential(2)} across {replay.comparedParameters} parameters)</p>}
   </section>
   <section aria-labelledby="serialization"><h3 id="serialization">Export and restore the parameters</h3>
    <div className="controls"><button type="button" className="action" onClick={exportModel}>Download parameters as JSON</button>
     <button type="button" className="action" onClick={()=>setRestoreText(serializeModel(model))}>Copy current model into the restore box</button></div>
    <label className="response-label">Serialized model to restore<textarea className="response" value={restoreText} onChange={e=>setRestoreText(e.target.value)}/></label>
    <button type="button" className="action" onClick={restore}>Restore and verify</button>{restoreResult&&<p role="status">{restoreResult}</p>}
   </section>
  </>}
 </section>;
}
