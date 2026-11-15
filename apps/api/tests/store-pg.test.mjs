import test from 'node:test';import assert from 'node:assert/strict';
import {createPgStore} from '../src/store-pg.mjs';
import {migrate} from '../src/migrate.mjs';
import {setup,lesson} from './helpers.mjs';
import pg from 'pg';
// Runs only when TEST_DATABASE_URL points at a disposable Postgres database.
const url=process.env.TEST_DATABASE_URL;
test('Postgres store: migrations, full publish flow and database-enforced release immutability',{skip:!url&&'TEST_DATABASE_URL not set'},async()=>{
 const c=new pg.Client({connectionString:url});await c.connect();await c.query('DROP TABLE IF EXISTS audit_log, activations, releases, records, users, schema_migrations CASCADE');await c.end();
 await migrate(url);await migrate(url);
 const store=createPgStore(url);
 try{
  const t=await setup({store});
  await t.call('POST','/drafts',{module:lesson},t.author);await t.call('POST','/drafts/intro-visual-reasoning/approve',{},t.reviewer);
  const r=await t.call('POST','/releases',{},t.admin);assert.equal(r.status,201);
  await t.call('POST','/releases/'+r.body.id+'/activate',{},t.admin);
  assert.equal((await t.call('GET','/releases/active')).body.digest,r.body.digest);
  const db=new pg.Client({connectionString:url});await db.connect();
  await assert.rejects(db.query('UPDATE releases SET manifest=$1',[{}]),/immutable/);
  await assert.rejects(db.query('DELETE FROM releases'),/immutable/);
  await db.end();
  assert.ok((await store.auditLog()).some(a=>a.action==='create-release'));
 }finally{await store.close()}
});
