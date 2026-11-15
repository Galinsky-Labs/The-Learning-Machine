import {createHmac,randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
// TLM-081: password hashing, signed session tokens and RFC 6238 TOTP, all from node:crypto.
export const sha256=(data)=>createHash('sha256').update(data).digest('hex');
export function canonicalJson(value){
 if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalJson(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export function hashPassword(password){
 if(typeof password!=='string'||password.length<12||password.length>200)throw new RangeError('Password must be 12–200 characters');
 const salt=randomBytes(16),hash=scryptSync(password,salt,32,{N:16384,r:8,p:1});
 return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}
export function verifyPassword(password,stored){
 if(typeof password!=='string'||typeof stored!=='string')return false;
 const [kind,salt,hash]=stored.split('$');if(kind!=='scrypt'||!salt||!hash)return false;
 const expected=Buffer.from(hash,'base64'),actual=scryptSync(password,Buffer.from(salt,'base64'),expected.length,{N:16384,r:8,p:1});
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
const B32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function newTotpSecret(){const bytes=randomBytes(20);let bits='';for(const b of bytes)bits+=b.toString(2).padStart(8,'0');let out='';for(let i=0;i+5<=bits.length;i+=5)out+=B32[parseInt(bits.slice(i,i+5),2)];return out}
function base32Decode(s){let bits='';for(const c of s.replace(/=+$/,'').toUpperCase()){const v=B32.indexOf(c);if(v<0)throw new TypeError('Invalid base32');bits+=v.toString(2).padStart(5,'0')}const out=[];for(let i=0;i+8<=bits.length;i+=8)out.push(parseInt(bits.slice(i,i+8),2));return Buffer.from(out)}
export function totp(secret,timeMs,step=30){
 const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(timeMs/1000/step)));
 const mac=createHmac('sha1',base32Decode(secret)).update(counter).digest(),o=mac[mac.length-1]&0xf;
 return String(((mac.readUInt32BE(o)&0x7fffffff)%1_000_000)).padStart(6,'0');
}
export function verifyTotp(secret,code,timeMs){
 if(typeof code!=='string'||!/^\d{6}$/.test(code))return false;
 return [-1,0,1].some(w=>{const c=totp(secret,timeMs+w*30000);return timingSafeEqual(Buffer.from(c),Buffer.from(code))});
}
export function signToken(payload,secret){
 const body=Buffer.from(JSON.stringify(payload)).toString('base64url'),sig=createHmac('sha256',secret).update(body).digest('base64url');
 return body+'.'+sig;
}
export function verifyToken(token,secret,nowMs){
 if(typeof token!=='string'||!token.includes('.'))return null;
 const [body,sig]=token.split('.'),expected=createHmac('sha256',secret).update(body).digest('base64url');
 if(!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;
 let payload;try{payload=JSON.parse(Buffer.from(body,'base64url').toString())}catch{return null}
 return payload&&typeof payload.exp==='number'&&payload.exp>nowMs?payload:null;
}
export const randomId=(prefix)=>prefix+'_'+randomBytes(9).toString('base64url');
