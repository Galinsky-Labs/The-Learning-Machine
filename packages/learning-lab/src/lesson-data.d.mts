import type {ShapeDataset,DrawingPixels} from './dataset.mjs';
import type {HoldoutSplit} from './split.mjs';
export function shiftDrawing(pixels:DrawingPixels,dx:number,dy:number):DrawingPixels;
export function buildLessonDataset():ShapeDataset;
export const LESSON_SPLIT_SEED:number;
export function buildLessonSplit(dataset?:ShapeDataset):HoldoutSplit;
