import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { BinaryFiles } from '@excalidraw/excalidraw/types';
export type Camera = { scrollX: number; scrollY: number; zoom: number };
export type AnimationStart = 'click' | 'with' | 'after';
export type Step = { id: string; title: string; show: string[]; hide: string[]; duration: number; start?: AnimationStart; camera?: Camera };
export type Project = { format: 'step-canvas'; version: 1; title: string; elements: readonly ExcalidrawElement[]; files: BinaryFiles; steps: Step[]; camera?: Camera };
export const newStep = (): Step => ({ id: crypto.randomUUID(), title: '', show: [], hide: [], duration: 450, start: 'click' });
