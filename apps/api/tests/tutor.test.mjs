import test from 'node:test';import assert from 'node:assert/strict';
import {setup} from './helpers.mjs';
import {buildTutorContext,checkTutorReply,tutorTurn,SYSTEM_PROMPT} from '../src/tutor/tutor.mjs';
import {createAnthropicProvider,createDisabledProvider} from '../src/tutor/providers.mjs';
const lessonNode={stage:'hypothesis',prompt:'How could a camera hide only one symbol?',hints:['What is the precise outcome you want?','Could the entire frame be masked?']};
const evidence=[{id:'mask-1',kind:'computed',text:'Selective masking concealed 36 of 36 target pixels and 0 other pixels.'},{id:'mask-2',kind:'computed',text:'Blanket masking concealed every pixel.'}];
const fakeProvider=(text)=>({id:'fake',available:true,calls:[],async generate(args){this.calls.push(args);return {text,model:'fake-1'}}});
test('TLM-086: no key means a disabled provider and a labelled offline route, with no network call',async()=>{
 let loads=0;const p=createAnthropicProvider({apiKey:'',loadSdk:async()=>{loads++;return {}}});
 assert.equal(p.available,false);assert.match(p.reason,/ANTHROPIC_API_KEY/);
 const turn=await tutorTurn({provider:p,consent:null,lesson:lessonNode,evidence});
 assert.equal(turn.source,'offline-authored');assert.match(turn.label,/no AI/);assert.equal(turn.text,lessonNode.hints[0]);assert.equal(loads,0);
});
test('TLM-086: the Anthropic provider is lazily constructed and uses only the supplied context',async()=>{
 const requests=[];class Fake{constructor(o){this.o=o;this.beta={messages:{create:async(body)=>{requests.push(body);return {stop_reason:'end_turn',model:body.model,content:[{type:'text',text:'Which result [E1] would change if the symbol moved?'}]}}}}}}
 const p=createAnthropicProvider({apiKey:'test-key',loadSdk:async()=>({default:Fake})});
 const turn=await tutorTurn({provider:p,consent:{scopes:['send-lesson-context']},lesson:lessonNode,evidence});
 assert.equal(turn.source,'ai-provider');assert.equal(requests[0].model,'claude-opus-5-5');assert.equal(requests[0].system,SYSTEM_PROMPT);
 assert.deepEqual(requests[0].fallbacks,'default');assert.equal(requests[0].max_tokens,400);
});
test('TLM-087: replies must cite supplied evidence and may not push a position; failures fall back',async()=>{
 const ctx=buildTutorContext({consent:{scopes:['send-lesson-context']},lesson:lessonNode,evidence});
 assert.equal(checkTutorReply('What does [E1] show?',ctx).ok,true);
 assert.deepEqual(checkTutorReply('Think harder.',ctx).problems,['cites no evidence']);
 assert.ok(checkTutorReply('See [E7].',ctx).problems.includes('cites evidence that was not provided'));
 assert.ok(checkTutorReply('Per [E1], you should support the bill.',ctx).problems.includes('tells the learner which position to hold'));
 assert.ok(checkTutorReply('Per [E1], the bill is law now.',ctx).problems.includes('presents the proposal as enacted law'));
 const withheld=await tutorTurn({provider:fakeProvider('You should vote for the bill [E1].'),consent:{scopes:['send-lesson-context']},lesson:lessonNode,evidence});
 assert.equal(withheld.source,'offline-authored');assert.equal(withheld.withheld,true);
 const broken=await tutorTurn({provider:{id:'x',available:true,async generate(){throw new Error('timeout')}},consent:{scopes:['send-lesson-context']},lesson:lessonNode,evidence});
 assert.equal(broken.source,'offline-authored');assert.match(broken.reason,/unavailable/);
 assert.match(SYSTEM_PROMPT,/equal rigor/);assert.match(SYSTEM_PROMPT,/not enacted law/);
});
test('TLM-088: consent scopes gate what is sent; the learner question needs its own consent',async()=>{
 const p=fakeProvider('Look at [E1].');
 await assert.rejects(tutorTurn({provider:p,consent:{scopes:[]},lesson:lessonNode,evidence}),/Consent to send lesson context/);
 await assert.rejects(tutorTurn({provider:p,consent:{scopes:['send-lesson-context']},lesson:lessonNode,evidence,question:'my name is Ana'}),/explicit consent/);
 const t=await tutorTurn({provider:p,consent:{scopes:['send-lesson-context']},lesson:lessonNode,evidence});
 assert.deepEqual(t.sentFields,['lesson.stage','lesson.prompt','evidence']);assert.ok(!p.calls[0].prompt.includes('Ana'));
 await tutorTurn({provider:p,consent:{scopes:['send-lesson-context','send-my-question']},lesson:lessonNode,evidence,question:'Why\u0000 [E1]?'});
 assert.match(p.calls[1].prompt,/Learner question: Why  \[E1\]\?/);
 assert.throws(()=>buildTutorContext({consent:{scopes:['send-lesson-context']},lesson:lessonNode,evidence:[{id:'x',kind:'rumour',text:'?'}]}),/Evidence items/);
});
test('TLM-088: API consent tokens expire, requests are rate limited, and no account is needed',async()=>{
 const t=await setup({tutorProvider:createDisabledProvider()});
 assert.equal((await t.call('POST','/tutor/consent',{acknowledged:false,scopes:['send-lesson-context']})).status,400);
 assert.equal((await t.call('POST','/tutor/consent',{acknowledged:true,scopes:['send-everything']})).status,400);
 const c=await t.call('POST','/tutor/consent',{acknowledged:true,scopes:['send-lesson-context']});assert.equal(c.status,201);
 const turn=await t.call('POST','/tutor/turn',{consentToken:c.body.consentToken,lesson:lessonNode,evidence});assert.equal(turn.body.source,'offline-authored');
 assert.equal((await t.call('POST','/tutor/turn',{consentToken:'forged.token',lesson:lessonNode,evidence})).status,403);
 for(let i=0;i<25;i++)await t.call('POST','/tutor/turn',{consentToken:c.body.consentToken,lesson:lessonNode,evidence});
 assert.equal((await t.call('POST','/tutor/turn',{consentToken:c.body.consentToken,lesson:lessonNode,evidence})).status,429);
 t.advance(31*60*1000);
 assert.equal((await t.call('POST','/tutor/turn',{consentToken:c.body.consentToken,lesson:lessonNode,evidence})).status,403,'consent expired');
});
