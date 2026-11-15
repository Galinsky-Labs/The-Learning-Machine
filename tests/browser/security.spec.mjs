import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
// TLM-093: the production security headers are applied to every page here, and pages must work without CSP violations
// or any third-party request.
const headers=JSON.parse(readFileSync(new URL('../../apps/web/security-headers.json',import.meta.url),'utf8'));
const PAGES=['/','/vision','/shapes','/model','/audio','/law','/market','/studio','/capstone','/policy'];
test.beforeEach(async({page})=>{
 await page.route('**/*',async route=>{
  if(route.request().resourceType()!=='document')return route.continue();
  const response=await route.fetch();await route.fulfill({response,headers:{...response.headers(),...Object.fromEntries(Object.entries(headers).map(([k,v])=>[k.toLowerCase(),v]))}});
 });
});
test('every page renders under the production CSP and makes no third-party requests',async({page})=>{
 test.setTimeout(90000);
 const violations=[],external=[];
 page.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))violations.push(m.text())});
 page.on('request',r=>{const u=new URL(r.url());if(!['127.0.0.1','localhost'].includes(u.hostname)&&!u.protocol.startsWith('data')&&!u.protocol.startsWith('blob'))external.push(r.url())});
 for(const path of PAGES){await page.goto(path);await page.waitForLoadState('networkidle')}
 await page.goto('/model');await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
 await page.getByRole('button',{name:'Train neural network'}).click();
 await expect(page.getByRole('status').filter({hasText:/Trained with/})).toBeVisible();
 expect(violations.filter(v=>!/astro-dev-toolbar|@vite|\/@id\//.test(v))).toEqual([]);
 expect(external).toEqual([]);
});
test('the policy blocks framing, plugins and off-site connections',async()=>{
 const csp=headers['Content-Security-Policy'];
 for(const d of ["frame-ancestors 'none'","object-src 'none'","form-action 'none'","default-src 'self'"])expect(csp).toContain(d);
 expect(csp).not.toMatch(/\*|https?:\/\/(?!the-learning-machine-api\.onrender\.com)/);
});
