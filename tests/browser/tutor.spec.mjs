import {test,expect} from '@playwright/test';
test('tutor is off by default, sends nothing, and authored hints work without any service',async({page})=>{
 const external=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4321'))external.push(r.url())});
 await page.goto('/');
 const panel=page.getByRole('region',{name:'Optional tutor'});
 await panel.scrollIntoViewIfNeeded();await expect(page.locator('[data-tutor-hydrated="true"]')).toBeVisible();
 await expect(panel.getByLabel('Use the AI tutor for this session')).not.toBeChecked();
 await panel.getByRole('button',{name:'Show an authored hint'}).click();
 await expect(panel.getByRole('status')).toContainText('Authored hint (no AI was used)');
 await panel.getByLabel('Use the AI tutor for this session').check();
 await panel.getByRole('button',{name:'Ask the tutor'}).click();
 await expect(panel.getByText(/No tutor service is configured|could not be reached/)).toBeVisible();
 expect(external).toEqual([]);
});
