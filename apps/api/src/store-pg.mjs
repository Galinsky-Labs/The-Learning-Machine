import pg from 'pg';
// Postgres store (Neon in production). All writes are single statements or explicit transactions.
export function createPgStore(connectionString,{max=4}={}){
 const pool=new pg.Pool({connectionString,max,ssl:/sslmode=require/.test(connectionString)?{rejectUnauthorized:true}:undefined});
 const q=(text,values)=>pool.query(text,values);
 const user=(r)=>r&&{id:r.id,email:r.email,role:r.role,passwordHash:r.password_hash,totpSecret:r.totp_secret};
 return {
  kind:'postgres',
  async health(){await q('SELECT 1');return 'up'},
  async countUsers(){return Number((await q('SELECT count(*)::int AS n FROM users')).rows[0].n)},
  async createUser(u){try{await q('INSERT INTO users (id,email,role,password_hash,totp_secret) VALUES ($1,$2,$3,$4,$5)',[u.id,u.email,u.role,u.passwordHash,u.totpSecret]);return u}catch(e){if(e.code==='23505')throw Object.assign(new Error('Email already registered'),{status:409});throw e}},
  async getUserByEmail(email){return user((await q('SELECT * FROM users WHERE email=$1',[email])).rows[0])??null},
  async putRecord(kind,id,body){await q('INSERT INTO records (kind,id,body,updated_at) VALUES ($1,$2,$3,now()) ON CONFLICT (kind,id) DO UPDATE SET body=EXCLUDED.body, updated_at=now()',[kind,id,body]);return body},
  async getRecord(kind,id){return (await q('SELECT body FROM records WHERE kind=$1 AND id=$2',[kind,id])).rows[0]?.body??null},
  async listRecords(kind){return (await q('SELECT body FROM records WHERE kind=$1 ORDER BY id',[kind])).rows.map(r=>r.body)},
  async insertRelease(r){try{await q('INSERT INTO releases (id,digest,manifest,created_by,created_at) VALUES ($1,$2,$3,$4,$5)',[r.id,r.digest,r.manifest,r.createdBy,r.createdAt]);return r}catch(e){if(e.code==='23505')throw Object.assign(new Error('Release already exists'),{status:409});throw e}},
  async getRelease(id){const r=(await q('SELECT * FROM releases WHERE id=$1',[id])).rows[0];return r?{id:r.id,digest:r.digest,manifest:r.manifest,createdBy:r.created_by,createdAt:new Date(r.created_at).toISOString()}:null},
  async listReleases(){return (await q('SELECT id,digest,created_by,created_at FROM releases ORDER BY created_at')).rows.map(r=>({id:r.id,digest:r.digest,createdBy:r.created_by,createdAt:new Date(r.created_at).toISOString()}))},
  async activate(releaseId,by,reason){const c=await pool.connect();try{await c.query('BEGIN');await c.query('LOCK TABLE activations IN EXCLUSIVE MODE');await c.query('INSERT INTO activations (release_id,activated_by,reason) VALUES ($1,$2,$3)',[releaseId,by,reason]);await c.query('COMMIT')}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}},
  async activationHistory(){return (await q('SELECT seq,release_id,activated_by,reason FROM activations ORDER BY seq')).rows.map(r=>({seq:Number(r.seq),releaseId:r.release_id,activatedBy:r.activated_by,reason:r.reason}))},
  async audit(actor,action,target){await q('INSERT INTO audit_log (actor,action,target) VALUES ($1,$2,$3)',[actor,action,target])},
  async auditLog(){return (await q('SELECT actor,action,target FROM audit_log ORDER BY seq')).rows},
  async close(){await pool.end()}
 };
}
