import {test,expect} from '@playwright/test';
test('lessons keep working offline after one online visit, and optional services are never required',async({page,context})=>{
 test.setTimeout(90000);
 await page.goto('/');await page.waitForFunction(()=>navigator.serviceWorker?.controller||navigator.serviceWorker?.ready.then(()=>true));
 await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 for(const path of ['/market','/capstone'])await page.goto(path).then(()=>page.waitForLoadState('networkidle'));
 await context.setOffline(true);
 await page.goto('/capstone');
 await expect(page.getByRole('heading',{level:1})).toContainText('What would you decide');
 await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
 await page.getByRole('button',{name:'Check my reasoning'}).click();
 await expect(page.getByRole('status').filter({hasText:'Not complete yet'})).toBeVisible();
 await context.setOffline(false);
});
test('low-power device plan is used when the browser reports few resources',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2});Object.defineProperty(navigator,'deviceMemory',{get:()=>1})});
 await page.goto('/model');await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
 await expect(page.getByRole('note',{name:'Device limits'})).toContainText('low-power');
 await page.getByRole('button',{name:'Train neural network'}).click();
 await expect(page.getByRole('status').filter({hasText:/Trained with reference-float64/})).toBeVisible();
});
