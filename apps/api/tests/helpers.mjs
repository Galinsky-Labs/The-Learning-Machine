import {readFileSync} from 'node:fs';
import {createApp} from '../src/app.mjs';
import {createMemoryStore} from '../src/store-memory.mjs';
import {totp} from '../src/crypto.mjs';
export const catalog=JSON.parse(readFileSync(new URL('../../../content/us-law/authorities.json',import.meta.url),'utf8'));
export const lesson=JSON.parse(readFileSync(new URL('../../../content/modules/intro-visual-reasoning.json',import.meta.url),'utf8'));
export async function setup({store=createMemoryStore(),tutorProvider}={}){
 let now=Date.UTC(2026,10,15,12);const clock=()=>now;
 const app=createApp({store,config:{sessionSecret:'x'.repeat(40),bootstrapToken:'boot-token-123'},clock,tutorProvider,catalog});
 const call=(method,path,body,token)=>app({method,path,body,headers:token?{authorization:'Bearer '+token}:{},ip:'1.2.3.4'});
 const boot=await call('POST','/auth/bootstrap',{token:'boot-token-123',email:'owner@example.org',password:'correct horse battery'});
 const login=async(emailAddress,password,secret)=>(await call('POST','/auth/login',{email:emailAddress,password,totp:totp(secret,now)})).body.token;
 const admin=await login('owner@example.org','correct horse battery',boot.body.totpSecret);
 const mk=async(role,emailAddress)=>{const u=await call('POST','/users',{email:emailAddress,role,password:'another long password'},admin);return login(emailAddress,'another long password',u.body.totpSecret)};
 return {app,call,store,boot,admin,author:await mk('author','author@example.org'),author2:await mk('author','second@example.org'),reviewer:await mk('reviewer','reviewer@example.org'),advance:(ms)=>{now+=ms},clock};
}
