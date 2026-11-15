// TLM-065: stakeholders with three separate edge types. Permission, information and money never stand in for each other.
export const ROLES=Object.freeze(['creator','publisher','learner','developer','user','regulator']);
export const EDGE_KINDS=Object.freeze(['permission','information','money']);
export const RIGHTS=Object.freeze(['read','copy-for-learning','retain-archive','distribute-copies','distribute-model','publish-outputs','regulate']);
export const CONTENT=Object.freeze(['work','model','output','usage-data','rules']);
const assert=(c,m)=>{if(!c)throw new TypeError(m)};
const id=(v,l)=>{assert(typeof v==='string'&&/^[a-z][a-z0-9-]{0,47}$/.test(v),'Invalid '+l);return v};
const FIELDS={permission:['kind','id','from','to','right'],information:['kind','id','from','to','content'],money:['kind','id','from','to','amountMinor','currency']};
export function createStakeholderGraph({actors,edges}){
 assert(Array.isArray(actors)&&actors.length>=2&&actors.length<=24,'Graph needs 2–24 actors');
 const byId=new Map();
 for(const a of actors){assert(a&&typeof a==='object','Invalid actor');id(a.id,'actor id');assert(ROLES.includes(a.role),'Unknown role for '+a.id);assert(typeof a.label==='string'&&a.label.trim(),'Actor label required');assert(!byId.has(a.id),'Duplicate actor '+a.id);byId.set(a.id,Object.freeze({id:a.id,role:a.role,label:a.label}))}
 assert(Array.isArray(edges)&&edges.length<=200,'Too many edges');
 const ids=new Set();
 const frozen=edges.map(e=>{
  assert(e&&EDGE_KINDS.includes(e.kind),'Unknown edge kind');
  const keys=Object.keys(e).sort(),expected=[...FIELDS[e.kind]].sort();
  assert(keys.length===expected.length&&keys.every((k,i)=>k===expected[i]),`A ${e.kind} edge may carry only ${expected.join(', ')}`);
  id(e.id,'edge id');assert(!ids.has(e.id),'Duplicate edge '+e.id);ids.add(e.id);
  assert(byId.has(e.from)&&byId.has(e.to),'Edge '+e.id+' references an unknown actor');assert(e.from!==e.to,'Self edge '+e.id);
  if(e.kind==='permission'){assert(RIGHTS.includes(e.right),'Unknown right');if(e.right==='regulate')assert(byId.get(e.from).role==='regulator','Only a regulator grants regulate')}
  if(e.kind==='information')assert(CONTENT.includes(e.content),'Unknown content');
  if(e.kind==='money'){assert(Number.isSafeInteger(e.amountMinor)&&e.amountMinor>0,'Money edges carry a positive integer minor-unit amount');assert(/^[A-Z]{3}$/.test(e.currency),'Currency code required')}
  return Object.freeze({...e});
 });
 return Object.freeze({actors:Object.freeze([...byId.values()]),edges:Object.freeze(frozen)});
}
export const edgesOfKind=(graph,kind)=>{assert(EDGE_KINDS.includes(kind),'Unknown edge kind');return graph.edges.filter(e=>e.kind===kind)};
const RIGHT_FOR_CONTENT={work:['read','copy-for-learning','retain-archive','distribute-copies'],model:['distribute-model'],output:['publish-outputs'],'usage-data':[],rules:['regulate']};
// Lists information flows that no declared permission covers. Payment is never treated as permission.
export function auditGraph(graph){
 const permissions=edgesOfKind(graph,'permission'),findings=[];
 for(const flow of edgesOfKind(graph,'information')){
  const needed=RIGHT_FOR_CONTENT[flow.content];
  if(needed.length===0)continue;
  const covered=permissions.some(p=>p.to===flow.from&&needed.includes(p.right))||graph.actors.find(a=>a.id===flow.from)?.role==='creator'||(flow.content==='rules'&&graph.actors.find(a=>a.id===flow.from)?.role==='regulator');
  if(!covered){
   const paid=edgesOfKind(graph,'money').some(m=>m.from===flow.from);
   findings.push(Object.freeze({edgeId:flow.id,finding:'no-declared-permission',note:paid?'Money was paid, but payment alone is not modelled as permission.':'No permission edge covers this flow.'}));
  }
 }
 return Object.freeze({findings:Object.freeze(findings),summary:{actors:graph.actors.length,permission:permissions.length,information:edgesOfKind(graph,'information').length,money:edgesOfKind(graph,'money').length},
  note:'Findings describe the declared graph only; they are not legal conclusions.'});
}
