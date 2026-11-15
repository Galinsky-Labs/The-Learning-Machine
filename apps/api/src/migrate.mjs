import {readFileSync,readdirSync} from 'node:fs';
import pg from 'pg';
// Applies SQL migrations in order. Uses DATABASE_URL_DIRECT for DDL when provided (Neon recommends the non-pooled host).
export async function migrate(connectionString){
 const client=new pg.Client({connectionString,ssl:/sslmode=require/.test(connectionString)?{rejectUnauthorized:true}:undefined});
 await client.connect();
 try{
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const dir=new URL('./migrations/',import.meta.url),applied=new Set((await client.query('SELECT name FROM schema_migrations')).rows.map(r=>r.name));
  for(const name of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort()){
   if(applied.has(name))continue;
   await client.query('BEGIN');
   try{await client.query(readFileSync(new URL(name,dir),'utf8'));await client.query('INSERT INTO schema_migrations (name) VALUES ($1)',[name]);await client.query('COMMIT');console.log('applied migration',name)}
   catch(e){await client.query('ROLLBACK');throw e}
  }
 }finally{await client.end()}
}
const url=process.env.DATABASE_URL_DIRECT||process.env.DATABASE_URL;
if(import.meta.url===`file://${process.argv[1]}`){
 if(!url){console.log('No DATABASE_URL: skipping migrations (API will report the database as not configured).');}
 else await migrate(url).catch(e=>{console.error('migration failed:',e.message);process.exit(1)});
}
