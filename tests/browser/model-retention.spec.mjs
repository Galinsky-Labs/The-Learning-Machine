import {test,expect} from '@playwright/test';
test('disposal keeps models, microscope labels provenance and transfer failures require a cited revision',async({page})=>{
 await page.goto('/model');await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
 await page.getByRole('button',{name:'Train neural network'}).click();
 await expect(page.getByTestId('store-examples')).toHaveText('18');
 await page.getByRole('button',{name:'Dispose of the training data'}).click();
 await expect(page.getByTestId('store-examples')).toHaveText('0');
 await expect(page.getByText(/exact training drawings stored inside/)).toBeVisible();
 await expect(page.getByRole('list',{name:'Retention disclosures'})).toContainText('does not guarantee');
 await expect(page.getByRole('table',{name:'Executed steps and their provenance'})).toContainText('illustration');
 await page.getByRole('button',{name:'Run the transfer challenge'}).click();
 await expect(page.getByRole('region',{name:'Transfer challenge results'})).toContainText('no ground truth');
 await page.getByLabel('How does this change your explanation of what the models learned?').fill('Moved and resized shapes fail, so the models learned pixel positions.');
 await page.getByRole('button',{name:'Record transfer revision'}).click();
 await expect(page.getByText(/Revision recorded after observation/)).toBeVisible();
});
