// In-memory store with the same contract as the Postgres store (used by tests and local development).
const clone=(v)=>structuredClone(v);
export function createMemoryStore(){
 const users=new Map(),records=new Map(),releases=new Map(),activations=[],audit=[];
 return {
  kind:'memory',
  async health(){return 'memory'},
  async countUsers(){return users.size},
  async createUser(u){if([...users.values()].some(x=>x.email===u.email))throw Object.assign(new Error('Email already registered'),{status:409});users.set(u.id,clone(u));return clone(u)},
  async getUserByEmail(email){const u=[...users.values()].find(x=>x.email===email);return u?clone(u):null},
  async putRecord(kind,id,body){records.set(kind+':'+id,clone(body));return clone(body)},
  async getRecord(kind,id){const r=records.get(kind+':'+id);return r?clone(r):null},
  async listRecords(kind){return [...records.entries()].filter(([k])=>k.startsWith(kind+':')).map(([,v])=>clone(v)).sort((a,b)=>a.id.localeCompare(b.id))},
  async insertRelease(r){if(releases.has(r.id)||[...releases.values()].some(x=>x.digest===r.digest))throw Object.assign(new Error('Release already exists'),{status:409});releases.set(r.id,Object.freeze(clone(r)));return clone(r)},
  async getRelease(id){const r=releases.get(id);return r?clone(r):null},
  async listReleases(){return [...releases.values()].map(clone)},
  async activate(releaseId,by,reason){activations.push({seq:activations.length+1,releaseId,activatedBy:by,reason});},
  async activationHistory(){return activations.map(clone)},
  async audit(actor,action,target){audit.push({actor,action,target})},
  async auditLog(){return audit.map(clone)},
  async close(){}
 };
}
