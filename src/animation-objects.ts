import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
export function expandObjects(elements: readonly ExcalidrawElement[], ids: string[]) {
  const expanded = new Set(ids);
  for (const element of elements) {
    if ('containerId' in element && element.containerId && expanded.has(element.containerId)) expanded.add(element.id);
  }
  return [...expanded].filter(id => elements.some(e => e.id === id && !e.isDeleted));
}
export function animationObjects(elements: readonly ExcalidrawElement[], ids: string[]) {
  const members = new Set(ids);
  return elements.filter(e => !e.isDeleted && members.has(e.id) && !('containerId' in e && e.containerId && members.has(e.containerId)));
}
export function objectLabel(element: ExcalidrawElement, elements: readonly ExcalidrawElement[]) {
  if ('text' in element) return element.text.trim().slice(0, 24) || '文字';
  const text = elements.find(e => 'containerId' in e && e.containerId === element.id && !e.isDeleted);
  if (text && 'text' in text) return text.text.trim().slice(0, 24) || '文字';
  const labels: Record<string, string> = {rectangle:'矩形',ellipse:'椭圆',diamond:'菱形',arrow:'箭头',line:'线条',freedraw:'手绘',image:'图片',frame:'画框'};
  return labels[element.type] || '对象';
}
