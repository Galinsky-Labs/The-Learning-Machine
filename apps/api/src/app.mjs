import {compileLearningModule} from '@learning-machine/content';
import {validateUsLawPack} from '@learning-machine/evidence';
import {hashPassword,verifyPassword,newTotpSecret,verifyTotp,signToken,verifyToken,randomId,sha256,canonicalJson} from './crypto.mjs';
import {tutorTurn,createRateLimiter,CONSENT_SCOPES,TUTOR_LIMITS} from './tutor/tutor.mjs';
// Optional private publisher API (TLM-081..085) and opt-in tutor gateway (TLM-086..088).
// The public static site never requires this service.
export const ROLES=Object.freeze({author:['draft:write','source:submit','media:submit','read'],reviewer:['draft:approve','source:review','media:review','read'],publisher:['release:create','release:activate','user:create','read','draft:approve','source:review','media:review']});
export const MEDIA_LICENSES=Object.freeze(['original-work','cc0','cc-by-4.0','public-domain','licensed-with-proof']);
const MEDIA_TYPES=Object.freeze({'image/png':[0x89,0x50,0x4e,0x47],'image/jpeg':[0xff,0xd8,0xff],'audio/wav':[0x52,0x49,0x46,0x46],'audio/ogg':[0x4f,0x67,0x67,0x53]});
const MAX_MEDIA_BYTES=2*1024*1024,SESSION_MS=8*60*60*1000;
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(status,message)=>{throw new HttpError(status,message)};
const need=(c,status,message)=>{if(!c)fail(status,message)};
const plain=(v)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const email=(v)=>{need(typeof v==='string'&&/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i.test(v),400,'A valid email is required');return v.toLowerCase()};

export function createApp({store,config,clock=()=>Date.now(),tutorProvider,catalog}){
 need(config&&typeof config.sessionSecret==='string'&&config.sessionSecret.length>=32,500,'SESSION_SECRET must be at least 32 characters');
 const limiter=createRateLimiter();
 const auth=(headers,permission)=>{
  const token=(headers.authorization??'').replace(/^Bearer /,'');
  const session=verifyToken(token,config.sessionSecret,clock());
  need(session&&session.mfa===true,401,'Sign in with password and authenticator code');
  need(ROLES[session.role]?.includes(permission),403,'Your role does not allow this action');
  return session;
 };
 const record=async(actor,action,target)=>store.audit(actor,action,target);
 async function createUser({emailAddress,role,password}){
  need(Object.hasOwn(ROLES,role),400,'Unknown role');
  const totpSecret=newTotpSecret(),user={id:randomId('usr'),email:email(emailAddress),role,passwordHash:hashPassword(password),totpSecret};
  await store.createUser(user);
  return {id:user.id,email:user.email,role,totpSecret,otpauth:`otpauth://totp/TheLearningMachine:${encodeURIComponent(user.email)}?secret=${totpSecret}&issuer=TheLearningMachine`};
 }
 const routes={
  'GET /health':async()=>{let db='not-configured';if(store){try{db=await store.health()}catch{db='down'}}return {status:db==='down'?503:200,body:{ok:db!=='down',service:'the-learning-machine-api',db,tutor:tutorProvider?.available?tutorProvider.id:'offline-only'}}},
  // ---- TLM-081: authentication, MFA and roles ----
  'POST /auth/bootstrap':async({body})=>{
   need(config.bootstrapToken&&body.token===config.bootstrapToken,403,'Bootstrap is disabled or the token is wrong');
   need((await store.countUsers())===0,409,'Bootstrap is only possible before any account exists');
   const created=await createUser({emailAddress:body.email,role:'publisher',password:body.password});await record(created.id,'bootstrap','publisher');
   return {status:201,body:created};
  },
  'POST /auth/login':async({body})=>{
   const user=await store.getUserByEmail(typeof body.email==='string'?body.email.toLowerCase():'');
   const ok=user&&verifyPassword(body.password,user.passwordHash)&&verifyTotp(user.totpSecret,body.totp,clock());
   need(ok,401,'Email, password or authenticator code is incorrect');
   await record(user.id,'login','session');
   return {body:{token:signToken({sub:user.id,role:user.role,mfa:true,exp:clock()+SESSION_MS},config.sessionSecret),role:user.role,expiresInMs:SESSION_MS}};
  },
  'POST /users':async({body,headers})=>{const s=auth(headers,'user:create');const created=await createUser({emailAddress:body.email,role:body.role,password:body.password});await record(s.sub,'create-user',created.id);return {status:201,body:created}},
  // ---- TLM-082: curriculum authoring and preview ----
  'POST /drafts':async({body,headers})=>{
   const s=auth(headers,'draft:write');
   let compiled;try{compiled=compileLearningModule(body.module)}catch(e){fail(422,'Lesson does not compile: '+e.message)}
   const draft={id:compiled.lessonId,module:body.module,digest:compiled.digest,authorId:s.sub,status:'draft',reviewerId:null,updatedAt:new Date(clock()).toISOString()};
   const existing=await store.getRecord('draft',draft.id);need(!existing||existing.authorId===s.sub,403,'Another author owns this draft');
   await store.putRecord('draft',draft.id,draft);await record(s.sub,'save-draft',draft.id);
   return {status:201,body:{id:draft.id,digest:draft.digest,status:draft.status}};
  },
  'GET /drafts/:id/preview':async({params,headers})=>{auth(headers,'read');const d=await store.getRecord('draft',params.id);need(d,404,'No such draft');return {body:{status:d.status,compiled:compileLearningModule(d.module)}}},
  'POST /drafts/:id/approve':async({params,headers})=>{
   const s=auth(headers,'draft:approve');const d=await store.getRecord('draft',params.id);need(d,404,'No such draft');
   need(d.authorId!==s.sub,403,'An author cannot approve their own draft');
   await store.putRecord('draft',d.id,{...d,status:'approved',reviewerId:s.sub});await record(s.sub,'approve-draft',d.id);return {body:{id:d.id,status:'approved'}};
  },
  // ---- TLM-083: evidence integrity and source review ----
  'POST /sources':async({body,headers})=>{
   const s=auth(headers,'source:submit');const a=body.authority;need(plain(a),400,'Authority record required');
   const others=catalog.authorities.filter(x=>x.id!==a.id);
   try{validateUsLawPack({...catalog,authorities:[...others,a]})}catch(e){fail(422,'Source rejected: '+e.message)}
   const source={id:a.id,authority:a,digest:sha256(canonicalJson(a)),submittedBy:s.sub,status:'submitted',reviewedBy:null,note:null};
   await store.putRecord('source',a.id,source);await record(s.sub,'submit-source',a.id);return {status:201,body:{id:a.id,digest:source.digest,status:'submitted'}};
  },
  'POST /sources/:id/review':async({params,body,headers})=>{
   const s=auth(headers,'source:review');const src=await store.getRecord('source',params.id);need(src,404,'No such source');
   need(src.submittedBy!==s.sub,403,'Sources need an independent reviewer');
   need(sha256(canonicalJson(src.authority))===src.digest,409,'Source integrity check failed');
   need(['approve','reject'].includes(body.decision)&&typeof body.note==='string'&&body.note.trim().length>=5,400,'Decision and a review note are required');
   await store.putRecord('source',src.id,{...src,status:body.decision==='approve'?'approved':'rejected',reviewedBy:s.sub,note:body.note.slice(0,1000)});
   await record(s.sub,'review-source:'+body.decision,src.id);return {body:{id:src.id,status:body.decision==='approve'?'approved':'rejected'}};
  },
  // ---- TLM-084: media rights registry and secure import ----
  'POST /media':async({body,headers})=>{
   const s=auth(headers,'media:submit');
   need(Object.hasOwn(MEDIA_TYPES,body.mime),415,'Only PNG, JPEG, WAV and Ogg media are accepted');
   need(MEDIA_LICENSES.includes(body.license),400,'Declare a supported license');
   need(typeof body.rightsHolder==='string'&&body.rightsHolder.trim().length>=2,400,'Rights holder required');
   if(body.license==='licensed-with-proof')need(typeof body.proof==='string'&&body.proof.trim().length>=10,400,'Licensed media needs proof of license');
   need(typeof body.dataBase64==='string'&&/^[A-Za-z0-9+/]+=*$/.test(body.dataBase64),400,'Media data must be base64');
   const bytes=Buffer.from(body.dataBase64,'base64');need(bytes.length>0&&bytes.length<=MAX_MEDIA_BYTES,413,'Media must be 1 byte to 2 MB');
   need(MEDIA_TYPES[body.mime].every((b,i)=>bytes[i]===b),415,'File contents do not match the declared type');
   const digest=sha256(bytes),id='med_'+digest.slice(0,16);
   const media={id,sha256:digest,mime:body.mime,bytes:bytes.length,license:body.license,rightsHolder:body.rightsHolder.trim(),proof:body.proof??null,uploadedBy:s.sub,status:'submitted',dataBase64:body.dataBase64};
   await store.putRecord('media',id,media);await record(s.sub,'submit-media',id);
   return {status:201,body:{id,sha256:digest,status:'submitted'}};
  },
  'POST /media/:id/review':async({params,body,headers})=>{
   const s=auth(headers,'media:review');const m=await store.getRecord('media',params.id);need(m,404,'No such media');
   need(m.uploadedBy!==s.sub,403,'Media needs an independent rights reviewer');need(['approve','reject'].includes(body.decision),400,'Decision required');
   need(sha256(Buffer.from(m.dataBase64,'base64'))===m.sha256,409,'Media integrity check failed');
   await store.putRecord('media',m.id,{...m,status:body.decision==='approve'?'approved':'rejected',reviewedBy:s.sub});await record(s.sub,'review-media:'+body.decision,m.id);
   return {body:{id:m.id,status:body.decision==='approve'?'approved':'rejected'}};
  },
  // ---- TLM-085: immutable packaging, atomic publication and rollback ----
  'POST /releases':async({headers})=>{
   const s=auth(headers,'release:create');
   const drafts=(await store.listRecords('draft')).filter(d=>d.status==='approved'),sources=(await store.listRecords('source')).filter(x=>x.status==='approved'),media=(await store.listRecords('media')).filter(m=>m.status==='approved');
   need(drafts.length>0,409,'A release needs at least one approved lesson');
   for(const d of drafts)need(compileLearningModule(d.module).digest===d.digest,409,'Draft '+d.id+' changed after approval');
   const manifest={schemaVersion:'1.0.0',modules:drafts.map(d=>({id:d.id,digest:d.digest,module:d.module})),sources:sources.map(x=>({id:x.id,digest:x.digest,authority:x.authority})),media:media.map(m=>({id:m.id,sha256:m.sha256,mime:m.mime,license:m.license,rightsHolder:m.rightsHolder}))};
   const digest=sha256(canonicalJson(manifest)),release={id:'rel_'+digest.slice(0,12),digest,manifest,createdBy:s.sub,createdAt:new Date(clock()).toISOString()};
   await store.insertRelease(release);await record(s.sub,'create-release',release.id);
   return {status:201,body:{id:release.id,digest,modules:manifest.modules.length,sources:manifest.sources.length,media:manifest.media.length}};
  },
  'POST /releases/:id/activate':async({params,body,headers})=>{
   const s=auth(headers,'release:activate');const r=await store.getRelease(params.id);need(r,404,'No such release');
   need(sha256(canonicalJson(r.manifest))===r.digest,409,'Release digest does not match its manifest');
   await store.activate(r.id,s.sub,typeof body.reason==='string'&&body.reason.trim()?body.reason.slice(0,300):'activate');await record(s.sub,'activate',r.id);
   return {body:{active:r.id}};
  },
  'POST /releases/rollback':async({headers})=>{
   const s=auth(headers,'release:activate');const history=await store.activationHistory();
   need(history.length>=2,409,'There is no earlier release to roll back to');
   const current=history.at(-1).releaseId,previous=[...history].reverse().find(h=>h.releaseId!==current);need(previous,409,'No different earlier release');
   await store.activate(previous.releaseId,s.sub,'rollback from '+current);await record(s.sub,'rollback',previous.releaseId);
   return {body:{active:previous.releaseId,rolledBackFrom:current}};
  },
  'GET /releases/active':async()=>{
   const h=await store.activationHistory();if(!h.length)return {status:404,body:{error:'No release has been published'}};
   const r=await store.getRelease(h.at(-1).releaseId);return {body:{id:r.id,digest:r.digest,createdAt:r.createdAt,manifest:r.manifest}};
  },
  // ---- TLM-086..088: opt-in tutor ----
  'POST /tutor/consent':async({body})=>{
   need(body.acknowledged===true,400,'Read and acknowledge what is sent before enabling the tutor');
   need(Array.isArray(body.scopes)&&body.scopes.length>0&&body.scopes.every(x=>CONSENT_SCOPES.includes(x)),400,'Unknown consent scope');
   const exp=clock()+TUTOR_LIMITS.consentTtlMs;
   return {status:201,body:{consentToken:signToken({kind:'tutor-consent',scopes:[...new Set(body.scopes)],exp},config.sessionSecret),expiresAt:new Date(exp).toISOString(),scopes:body.scopes}};
  },
  'POST /tutor/turn':async({body,ip})=>{
   need(limiter(ip??'unknown',clock()),429,'Tutor request limit reached; the authored hints remain available');
   const consent=verifyToken(body.consentToken,config.sessionSecret,clock());
   need(consent?.kind==='tutor-consent',403,'Tutor consent is missing or expired');
   const turn=await tutorTurn({provider:tutorProvider,consent,lesson:body.lesson,evidence:body.evidence,question:body.question});
   return {body:turn};
  },
 };
 const compiledRoutes=Object.entries(routes).map(([key,handler])=>{const [method,path]=key.split(' ');const names=[];const re=new RegExp('^'+path.replace(/:([a-z]+)/g,(_,n)=>{names.push(n);return '([A-Za-z0-9_.-]{1,128})'})+'$');return {method,re,names,handler}});
 return async function handle({method,path,headers={},body=null,ip}){
  try{
   const route=compiledRoutes.find(r=>r.method===method&&r.re.test(path));
   if(!route)return {status:404,body:{error:'Not found'}};
   const m=path.match(route.re),params=Object.fromEntries(route.names.map((n,i)=>[n,m[i+1]]));
   if(method==='POST')need(plain(body),400,'JSON object body required');
   if(route.handler!==routes['GET /health']&&route.handler!==routes['POST /tutor/consent']&&route.handler!==routes['POST /tutor/turn']&&route.handler!==routes['GET /releases/active'])need(store,503,'Publisher database is not configured');
   const out=await route.handler({params,body:body??{},headers,ip});
   return {status:out.status??200,body:out.body};
  }catch(e){
   const status=e.status??500;
   return {status,body:{error:status===500?'Internal error':e.message}};
  }
 };
}
