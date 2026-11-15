import {test,expect} from '@playwright/test';
test('reference network trains without downloading TensorFlow.js and exposes real parameters',async({page})=>{
 const scripts=[];page.on('request',r=>{if(/tfjs|dist\./.test(r.url()))scripts.push(r.url())});
 const posts=[];page.on('request',r=>{if(r.method()!=='GET'&&r.method()!=='HEAD')posts.push(r.url())});
 await page.goto('/model');
 await expect(page).toHaveTitle(/What Did the Machine Learn/);
 await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
 await page.getByRole('button',{name:'Train neural network'}).click();
 await expect(page.getByRole('status').filter({hasText:/Trained with reference-float64/})).toBeVisible();
 await expect(page.getByRole('table',{name:/Stored parameters/})).toBeVisible();
 await page.getByLabel('Show the exact 16 × 16 numbers').check();
 await expect(page.getByRole('table',{name:/Hidden unit 1 stored weights/})).toBeVisible();
 await page.getByRole('button',{name:'Replay with the reference network'}).click();
 await expect(page.getByText(/Replay: exact-match/)).toBeVisible();
 await page.getByRole('button',{name:'Copy current model into the restore box'}).click();
 await page.getByRole('button',{name:'Restore and verify'}).click();
 await expect(page.getByText(/identical to the current model/)).toBeVisible();
 expect(scripts.filter(u=>/tfjs/.test(u))).toEqual([]);expect(posts).toEqual([]);
});
test('optional TensorFlow.js engine trains locally within tolerance of the reference',async({page})=>{
 await page.goto('/model');await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
 await page.getByLabel(/Optional TensorFlow.js/).check();
 await page.getByLabel('Epochs').fill('20');
 await page.getByRole('button',{name:'Train neural network'}).click();
 await expect(page.getByRole('status').filter({hasText:/Trained with (tfjs-cpu|reference-float64)/})).toBeVisible({timeout:20000});
 await page.getByRole('button',{name:'Replay with the reference network'}).click();
 await expect(page.getByText(/Replay: (within-tolerance|exact-match)/)).toBeVisible();
});
