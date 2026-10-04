import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { expandMindMapDeletion } from '../src/mindmap.mjs';

// Expand the native delete action before its history snapshot, so keyboard,
// context menu, delete button and cut all share one undoable operation.
export function patchMindMapDeletion(source) {
  const candidates = [
    ['var deleteSelectedElements = (elements, appState, app) => {', 'elements', 'appState'],
    ['var oC=(e,o,t)=>{', 'e', 'o'],
  ];
  const match = candidates.find(([marker]) => source.includes(marker));
  if (!match) throw new Error('请先验证新版本的 Excalidraw 思维导图删除适配器');
  const [marker, elements, state] = match;
  if (source.split(marker).length !== 2) throw new Error('Excalidraw 删除入口不唯一');
  const patched = source.replace(marker, `${marker}\n${state}={...${state},selectedElementIds:(${expandMindMapDeletion.toString()})(${elements},${state}.selectedElementIds)};\n`);
  // Cut calls the same delete action. Copy the expanded selection too, so no
  // descendant is removed without being included in the clipboard.
  const cut = /(name:\s*"cut",[\s\S]*?perform:\s*\((\w+),\s*(\w+),[^)]*\)\s*=>\s*\{)/;
  if (!cut.test(patched)) throw new Error('Excalidraw 剪切入口未找到');
  return patched.replace(cut, (_, prefix, elements, state) => `${prefix}\n${state}={...${state},selectedElementIds:(${expandMindMapDeletion.toString()})(${elements},${state}.selectedElementIds)};\n`);
}
const entry = /[/\\]@excalidraw[/\\]excalidraw[/\\]dist[/\\](dev|prod)[/\\]index\.js$/;
export function mindMapDeletionPlugin() {
  return {
    name: 'unfold-mindmap-deletion',
    enforce: 'pre',
    config() {
      return {optimizeDeps: {esbuildOptions: {plugins: [{
        name: 'unfold-mindmap-deletion',
        setup(build) {
          build.onLoad({filter: entry}, ({path}) => ({contents: patchMindMapDeletion(readFileSync(path, 'utf8')), loader: 'js', resolveDir: dirname(path)}));
        },
      }]}}};
    },
    transform(source, id) {if (entry.test(id)) return {code: patchMindMapDeletion(source), map: null};},
  };
}
