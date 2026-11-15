import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// TLM-091 automated part: WCAG 2.2 A/AA rules on every page, with no exclusions.
const PAGES=['/','/vision','/shapes','/model','/audio','/law','/market','/studio','/capstone','/policy'];
for(const path of PAGES){
 test(`axe WCAG 2.2 AA: ${path}`,async({page})=>{
  test.setTimeout(60000);
  await page.goto(path);await page.waitForLoadState('networkidle');
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  expect(result.violations.map(v=>`${v.id}: ${v.nodes.length} node(s) — ${v.help}`)).toEqual([]);
 });
}
test('reduced motion is honoured and every page has one main landmark and a level-one heading',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const path of PAGES){
  await page.goto(path);
  expect(await page.evaluate(()=>[document.querySelectorAll('main').length,document.querySelectorAll('h1').length]),path).toEqual([1,1]);
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
 }
});
