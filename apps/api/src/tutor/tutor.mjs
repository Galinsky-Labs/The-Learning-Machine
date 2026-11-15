// TLM-087/088: evidence-grounded tutor with bias controls, consent, minimum context and limits.
export const TUTOR_LIMITS=Object.freeze({maxQuestionChars:400,maxEvidenceItems:8,maxEvidenceChars:600,maxOutputTokens:400,consentTtlMs:30*60*1000,requestsPerWindow:20,windowMs:10*60*1000});
export const CONSENT_SCOPES=Object.freeze(['send-lesson-context','send-my-question']);
const POLITICAL=/\b(you should (support|oppose|vote)|vote (for|against)|the (right|correct) (position|view) is|good (people|citizens) (support|oppose))\b/i;
const assert=(c,m,status=400)=>{if(!c)throw Object.assign(new Error(m),{status})};
export const SYSTEM_PROMPT=[
 'You are a Socratic tutor inside an educational site about a proposed U.S. "Right to Learn" bill.',
 'Respond with one or two short questions that help the learner reason from the EVIDENCE provided. Do not give the answer outright unless asked for an explanation.',
 'Use only the numbered evidence items. When you rely on one, cite it as [E1], [E2], and so on. If the evidence does not settle something, say it is uncertain.',
 'Do not tell the learner which policy position to hold. If you challenge a view, challenge the opposite view with equal rigor.',
 'The proposed bill is an incomplete draft, not enacted law. Never describe it as law. This is not legal advice.'
].join(' ');
// Builds the minimum context: authored lesson evidence only, plus the learner's question only with explicit consent.
export function buildTutorContext({consent,lesson,evidence,question}){
 assert(consent&&Array.isArray(consent.scopes),'Consent is required before any tutor request',403);
 assert(consent.scopes.includes('send-lesson-context'),'Consent to send lesson context is required',403);
 assert(lesson&&typeof lesson.prompt==='string'&&typeof lesson.stage==='string','Lesson node required');
 assert(Array.isArray(evidence)&&evidence.length>=1&&evidence.length<=TUTOR_LIMITS.maxEvidenceItems,'Provide 1–8 evidence items');
 for(const e of evidence)assert(e&&typeof e.id==='string'&&typeof e.text==='string'&&e.text.length<=TUTOR_LIMITS.maxEvidenceChars&&['measured','computed','simulated','sourced','authored'].includes(e.kind),'Evidence items need id, kind and text');
 let includedQuestion=null;
 if(question!==undefined&&question!==null&&question!==''){
  assert(consent.scopes.includes('send-my-question'),'Your question is only sent with explicit consent',403);
  assert(typeof question==='string'&&question.length<=TUTOR_LIMITS.maxQuestionChars,'Question too long');
  includedQuestion=question.replace(/[\u0000-\u001f]/g,' ').trim();
 }
 const lines=evidence.map((e,i)=>`[E${i+1}] (${e.kind}) ${e.text}`);
 const prompt=`Lesson stage: ${lesson.stage}\nLesson question: ${lesson.prompt}\nEVIDENCE:\n${lines.join('\n')}${includedQuestion?`\nLearner question: ${includedQuestion}`:''}`;
 return Object.freeze({prompt,evidenceIds:evidence.map((e,i)=>`E${i+1}`),sentFields:Object.freeze(['lesson.stage','lesson.prompt','evidence',...(includedQuestion?['question']:[])])});
}
// Post-checks a model reply. Ungrounded or persuasive replies are discarded in favour of the authored route.
export function checkTutorReply(text,context){
 const problems=[];
 const cited=[...text.matchAll(/\[(E\d+)\]/g)].map(m=>m[1]);
 if(cited.length===0)problems.push('cites no evidence');
 if(cited.some(id=>!context.evidenceIds.includes(id)))problems.push('cites evidence that was not provided');
 if(POLITICAL.test(text))problems.push('tells the learner which position to hold');
 if(/\b(the bill|the proposal|right to learn act) (is|became) (the )?law\b/i.test(text)&&!/not (enacted|law)/i.test(text))problems.push('presents the proposal as enacted law');
 if(text.length>2000)problems.push('too long');
 return Object.freeze({ok:problems.length===0,problems:Object.freeze(problems)});
}
export function offlineTutorTurn(lesson,reason){
 const hints=Array.isArray(lesson.hints)?lesson.hints:[];
 return Object.freeze({source:'offline-authored',label:'Authored hint (no AI was used)',text:hints[Math.min(lesson.hintLevel??0,hints.length-1)]??'What evidence would change your mind? Try predicting the result before running the experiment.',reason});
}
export function createRateLimiter({limit=TUTOR_LIMITS.requestsPerWindow,windowMs=TUTOR_LIMITS.windowMs}={}){
 const buckets=new Map();
 return (key,now)=>{const b=buckets.get(key)??{start:now,count:0};if(now-b.start>windowMs){b.start=now;b.count=0}b.count++;buckets.set(key,b);if(buckets.size>10000)buckets.clear();return b.count<=limit};
}
export async function tutorTurn({provider,consent,lesson,evidence,question,signal}){
 if(!provider?.available)return offlineTutorTurn(lesson,provider?.reason??'No provider configured.');
 const context=buildTutorContext({consent,lesson,evidence,question});
 try{
  const reply=await provider.generate({system:SYSTEM_PROMPT,prompt:context.prompt,maxTokens:TUTOR_LIMITS.maxOutputTokens,signal});
  const check=checkTutorReply(reply.text,context);
  if(!check.ok)return Object.freeze({...offlineTutorTurn(lesson,'The AI reply was withheld: '+check.problems.join('; ')),withheld:true});
  return Object.freeze({source:'ai-provider',label:`AI tutor (${provider.id}) — may be wrong; check the cited evidence`,text:reply.text,provider:provider.id,model:reply.model??null,sentFields:context.sentFields});
 }catch(error){return offlineTutorTurn(lesson,'The AI tutor was unavailable: '+(error instanceof Error?error.message:'error'))}
}
