import {useState} from 'react';
import ModelLab from './ModelLab.tsx';
import type {RetentionEvent} from './ModelRetention.tsx';
import {createModelLesson,recordModelHypothesis,commitRetentionPredictions,recordRetentionObservations,continueToExplanation,submitRetentionExplanation,recordModelLessonTransfer,modelLessonProgress,viewModelLessonExplanation,MODEL_LESSON_QUESTION,MODEL_LESSON_EXPLANATION} from '../../../../packages/learning-lab/src/model-lesson.mjs';
import type {ModelLessonState} from '../../../../packages/learning-lab/src/model-lesson.mjs';

const STAGE_NAMES:Record<string,string>={hypothesize:'Hypothesize',predict:'Predict',experiment:'Experiment',observe:'Observe',explain:'Explain',transfer:'Transfer'};
const QUESTION_TEXT:Record<string,string>={networkStillWorks:'The neural network still classifies after disposal',memorizerHoldsCopies:'The memorizer still holds exact training drawings',networkHoldsCopies:'The neural network holds exact training drawings'};
export default function ModelLesson(){
 const [lesson,setLesson]=useState<ModelLessonState>(()=>createModelLesson());
 const [hypothesis,setHypothesis]=useState(''),[explanation,setExplanation]=useState(''),[error,setError]=useState('');
 const [predictions,setPredictions]=useState({networkStillWorks:false,memorizerHoldsCopies:false,networkHoldsCopies:false});
 const act=(fn:()=>ModelLessonState)=>{try{setLesson(fn());setError('')}catch(e){setError(e instanceof Error?e.message:'That step is not available yet')}};
 function onRetention(event:RetentionEvent){
  setLesson(current=>{
   try{
    if(event.type==='disposed'&&current.stage==='experiment')return recordRetentionObservations(current,event.observations);
    if(event.type==='revised'&&current.stage==='transfer')return recordModelLessonTransfer(current,event.revision);
   }catch{}
   return current;
  });
 }
 const progress=modelLessonProgress(lesson);
 return <>
  <section className="learning-card model-lesson" aria-labelledby="model-lesson-title">
   <p className="stage-label">Module 3 · What Did the Machine Learn?</p>
   <h2 id="model-lesson-title">{MODEL_LESSON_QUESTION}</h2>
   <nav aria-label="What Did the Machine Learn? lesson progress"><ol className="lesson-steps">{progress.map(p=><li key={p.stage} aria-current={p.current?'step':undefined}>{STAGE_NAMES[p.stage]}{p.complete?' — done':p.current?' — now':''}</li>)}</ol></nav>
   {lesson.stage==='hypothesize'&&<div><label className="response-label">Your hypothesis — any answer is welcome<textarea className="response" value={hypothesis} onChange={e=>setHypothesis(e.target.value)}/></label>
    <div className="controls"><button type="button" className="action action-primary" onClick={()=>act(()=>recordModelHypothesis(lesson,hypothesis))}>Record hypothesis</button></div></div>}
   {lesson.stage==='predict'&&<fieldset><legend>Commit your predictions before seeing any result</legend>
    {(Object.keys(predictions) as (keyof typeof predictions)[]).map(k=><label key={k}><input type="checkbox" checked={predictions[k]} onChange={e=>setPredictions(p=>({...p,[k]:e.target.checked}))}/> {QUESTION_TEXT[k]}</label>)}
    <div className="controls"><button type="button" className="action action-primary" onClick={()=>act(()=>commitRetentionPredictions(lesson,predictions))}>Commit predictions</button></div></fieldset>}
   {lesson.stage==='experiment'&&<p className="status-note">Now run the experiment below: train the network, then dispose of the training data. The lesson continues when disposal is observed.</p>}
   {lesson.stage==='observe'&&lesson.observations&&<div role="region" aria-label="Your predictions beside the observations">
    <table><caption>Predicted versus observed (computed in this browser)</caption><thead><tr><th scope="col">Question</th><th scope="col">You predicted</th><th scope="col">Observed</th></tr></thead><tbody>
     {lesson.observations.comparisons.map(c=><tr key={c.question}><th scope="row">{QUESTION_TEXT[c.question]}</th><td>{c.predicted?'yes':'no'}</td><td>{c.observed?'yes':'no'}{c.matched?'':' (differs from your prediction)'}</td></tr>)}</tbody></table>
    <p>Store after disposal: {lesson.observations.storeExampleCountAfterDisposal} drawings. The network was {(lesson.observations.confidenceGap*100).toFixed(1)} percentage points more confident on training drawings than on unseen drawings.</p>
    <div className="controls"><button type="button" className="action action-primary" onClick={()=>act(()=>continueToExplanation(lesson))}>Explain what you saw</button></div></div>}
   {lesson.stage==='explain'&&<div>
    <label className="response-label">In your own words, what does the model retain, and what can you not be sure of?<textarea className="response" value={explanation} onChange={e=>setExplanation(e.target.value)}/></label>
    {lesson.challenges.length>0&&<div role="region" aria-label="Socratic challenge"><ul>{lesson.challenges.map(c=><li key={c.claim}>{c.question}</li>)}</ul><p>You may revise your wording, or keep it and continue.</p></div>}
    <div className="controls"><button type="button" className="action action-primary" onClick={()=>act(()=>submitRetentionExplanation(lesson,explanation))}>Submit explanation</button>
     {lesson.challenges.length>0&&<button type="button" className="action" onClick={()=>act(()=>submitRetentionExplanation(lesson,explanation,{acknowledgeChallenge:true}))}>Keep my wording and continue</button>}</div></div>}
   {lesson.stage==='transfer'&&<p className="status-note">Last step: run the transfer challenge below and record a revision based on what happened.</p>}
   {lesson.stage==='complete'&&<p role="status" className="status-note">You completed “What Did the Machine Learn?” Your explanation and revision are your own; there is no agreement score.</p>}
   <div className="controls"><button type="button" className="action" onClick={()=>setLesson(l=>viewModelLessonExplanation(l))}>See direct explanation</button></div>
   {lesson.directExplanationViewed&&<p className="status-note">{MODEL_LESSON_EXPLANATION}</p>}
   {error&&<p className="error" role="alert">{error}</p>}
  </section>
  <ModelLab onRetentionEvent={onRetention}/>
 </>;
}
