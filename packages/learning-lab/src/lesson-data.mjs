import {GRID_SIZE,PIXEL_COUNT,presetDrawing,createShapeDataset,addShapeExample} from './dataset.mjs';
import {stratifiedHoldout} from './split.mjs';
// Original, deterministic lesson drawings (no third-party images): shifted variants of authored shapes.
export function shiftDrawing(pixels,dx,dy){
 if(!Array.isArray(pixels)||pixels.length!==PIXEL_COUNT)throw new TypeError('Expected a 16×16 drawing');
 if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)>8||Math.abs(dy)>8)throw new RangeError('Shift must be an integer from -8 to 8');
 const next=Array(PIXEL_COUNT).fill(0);
 for(let r=0;r<GRID_SIZE;r++)for(let c=0;c<GRID_SIZE;c++){const sr=r-dy,sc=c-dx;if(sr>=0&&sr<GRID_SIZE&&sc>=0&&sc<GRID_SIZE&&pixels[sr*GRID_SIZE+sc])next[r*GRID_SIZE+c]=1}
 return Object.freeze(next);
}
const LESSON_RECIPES=Object.freeze([
 ['Line','horizontal',0,0],['Line','horizontal',0,-3],['Line','horizontal',0,3],['Line','diagonal',0,0],['Line','diagonal',2,0],['Line','horizontal',1,5],
 ['Square','square',0,0],['Square','square',1,1],['Square','square',-1,-1],['Square','square',2,0],['Square','square',0,2],['Square','square',-2,1],
 ['Cross','cross',0,0],['Cross','cross',2,2],['Cross','cross',-2,-2],['Cross','cross',3,0],['Cross','cross',0,-3],['Cross','cross',-3,2]
]);
export function buildLessonDataset(){
 let dataset=createShapeDataset();
 for(const [label,kind,dx,dy] of LESSON_RECIPES)dataset=addShapeExample(dataset,label,shiftDrawing(presetDrawing(kind),dx,dy));
 return dataset;
}
export const LESSON_SPLIT_SEED=11;
export function buildLessonSplit(dataset=buildLessonDataset()){return stratifiedHoldout(dataset,{seed:LESSON_SPLIT_SEED,testFraction:0.34})}
