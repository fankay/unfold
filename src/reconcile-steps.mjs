/**
 * Keep animation references in sync with the editable scene. Deleted elements
 * remain in Excalidraw's scene as tombstones and must not reserve step numbers.
 * @template {{show: string[], hide: string[], camera?: unknown}} T
 * @param {readonly {id: string, isDeleted?: boolean}[]} elements
 * @param {T[]} steps
 * @returns {T[]}
 */
export function reconcileSteps(elements, steps) {
  if (!steps.length) return steps;
  const live = new Set(elements.filter(element => !element.isDeleted).map(element => element.id));
  if (!live.size) return [];
  let changed = false;
  const result = [];
  for (const step of steps) {
    const show = step.show.filter(id => live.has(id));
    const hide = step.hide.filter(id => live.has(id));
    // Preserve intentionally camera-only steps from older project files, but
    // discard object steps whose entire target set was removed.
    const cameraOnly = !step.show.length && !step.hide.length && step.camera;
    if (!show.length && !hide.length && !cameraOnly) { changed = true; continue; }
    if (show.length !== step.show.length || hide.length !== step.hide.length) {
      changed = true;
      result.push({...step, show, hide});
    } else result.push(step);
  }
  return changed ? result : steps;
}
