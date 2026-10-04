import { convertToExcalidrawElements, newElementWith } from '@excalidraw/excalidraw';
import type { ExcalidrawElement, FontFamilyValues } from '@excalidraw/excalidraw/element/types';
import { layoutTree, parseOutline } from './mindmap.mjs';

type Element = ExcalidrawElement;
type Meta = { mapId: string; parentId: string | null; kind: 'node' | 'edge' };
const colors = ['#6965db', '#2f9e79', '#d78b27', '#dc6a83', '#388bbd'];
export function mindMapMeta(element: Element): Meta | undefined {
  const value = element.customData?.unfoldMindMap;
  return value && typeof value.mapId === 'string' && (value.kind === 'node' || value.kind === 'edge') && (value.parentId === null || typeof value.parentId === 'string') ? value : undefined;
}
export function selectedMindMapNode(elements: readonly Element[], selected: string[]) {
  const ids = new Set(selected);
  const nodes = elements.filter(e => !e.isDeleted && mindMapMeta(e)?.kind === 'node' && (ids.has(e.id) || elements.some(label => !label.isDeleted && 'containerId' in label && label.containerId === e.id && ids.has(label.id))));
  return nodes.length === 1 ? nodes[0] : undefined;
}
function nodeElements(id: string, text: string, mapId: string, parentId: string | null, color: string) {
  return convertToExcalidrawElements([{
    id, type: 'rectangle', x: 0, y: 0, width: Math.min(330, Math.max(parentId ? 150 : 180, [...text].reduce((n, ch) => n + (ch.charCodeAt(0) > 255 ? 20 : 11), 40))), height: parentId ? 56 : 68,
    strokeColor: color, backgroundColor: parentId ? '#ffffff' : '#eeecff', fillStyle: 'solid', roughness: 0, strokeWidth: 2, roundness: {type: 3},
    customData: { unfoldMindMap: {mapId, parentId, kind: 'node'} },
    label: {text, fontFamily: 10 as FontFamilyValues, fontSize: parentId ? 18 : 22},
  }], {regenerateIds: false});
}
function edgeElements(parent: Element, child: Element) {
  const x = parent.x + parent.width + 8;
  const y = parent.y + parent.height / 2;
  const dx = child.x - 8 - x;
  const dy = child.y + child.height / 2 - y;
  return convertToExcalidrawElements([{
    id: crypto.randomUUID(), type: 'arrow', x, y, width: dx, height: Math.abs(dy), points: [[0, 0], [dx, dy]],
    start: {id: parent.id}, end: {id: child.id}, startArrowhead: null, endArrowhead: null,
    strokeColor: child.strokeColor, strokeWidth: 2, roughness: 0,
    customData: {unfoldMindMap: {mapId: mindMapMeta(child)!.mapId, parentId: child.id, kind: 'edge'}},
  }], {regenerateIds: false}).filter(e => e.type === 'arrow');
}

export function arrangeMindMap(scene: readonly Element[], mapId: string) {
  const nodes = scene.filter(e => !e.isDeleted && mindMapMeta(e)?.kind === 'node' && mindMapMeta(e)?.mapId === mapId);
  if (!nodes.length) return [...scene];
  const root = nodes.find(e => !nodes.some(parent => parent.id === mindMapMeta(e)?.parentId)) || nodes[0];
  const positions = layoutTree(nodes.map(e => ({id: e.id, parentId: mindMapMeta(e)!.parentId, width: e.width, height: e.height})), {x: root.x, y: root.y});
  const moved = new Map<string, Element>();
  for (const node of nodes) moved.set(node.id, newElementWith(node, {...positions.get(node.id), angle: 0}));
  const updates = scene.map(e => {
    if (moved.has(e.id)) return moved.get(e.id)!;
    if (!e.isDeleted && e.type === 'text' && e.containerId && moved.has(e.containerId)) {
      const node = moved.get(e.containerId)!;
      return newElementWith(e, {x: node.x + (node.width - e.width) / 2, y: node.y + (node.height - e.height) / 2, angle: 0});
    }
    return e;
  });
  const existing = new Map(scene.filter(e => !e.isDeleted && mindMapMeta(e)?.mapId === mapId && mindMapMeta(e)?.kind === 'edge').map(e => [mindMapMeta(e)!.parentId, e]));
  const edges: Element[] = [];
  for (const child of moved.values()) {
    const parent = moved.get(mindMapMeta(child)!.parentId || '');
    if (!parent) continue;
    const old = existing.get(child.id);
    if (old?.type === 'arrow') {
      const x = parent.x + parent.width + 8, y = parent.y + parent.height / 2;
      const dx = child.x - 8 - x, dy = child.y + child.height / 2 - y;
      edges.push(newElementWith(old, {x, y, width: Math.abs(dx), height: Math.abs(dy), points: [[0, 0], [dx, dy]] as typeof old.points, angle: 0, startBinding: {elementId: parent.id, focus: 0, gap: 8}, endBinding: {elementId: child.id, focus: 0, gap: 8}}));
    } else edges.push(...edgeElements(parent, child));
  }
  const liveEdgeIds = new Set(edges.map(e => e.id));
  const finalNodes = updates.filter(e => !(mindMapMeta(e)?.mapId === mapId && mindMapMeta(e)?.kind === 'edge'));
  // Maintain reverse bindings so native drag/resize keeps the connectors attached.
  const boundNodes = finalNodes.map(e => moved.has(e.id) ? newElementWith(e, {boundElements: [...(e.boundElements || []).filter(b => b.type !== 'arrow' || !scene.some(edge => edge.id === b.id && mindMapMeta(edge)?.mapId === mapId)), ...edges.filter(edge => edge.type === 'arrow' && (edge.startBinding?.elementId === e.id || edge.endBinding?.elementId === e.id)).map(edge => ({id: edge.id, type: 'arrow' as const}))]}) : e);
  const removedEdges = scene.filter(e => mindMapMeta(e)?.mapId === mapId && mindMapMeta(e)?.kind === 'edge' && !liveEdgeIds.has(e.id)).map(e => e.isDeleted ? e : newElementWith(e, {isDeleted: true}));
  return [...edges, ...removedEdges, ...boundNodes];
}

export function createMindMap(outline: string, scene: readonly Element[]) {
  const tree = parseOutline(outline);
  const mapId = crypto.randomUUID();
  const branchColors = new Map<string, string>();
  let branch = 0;
  const elements = tree.flatMap(node => {
    const color = node.parentId === tree[0].id ? colors[branch++ % colors.length] : branchColors.get(node.parentId || '') || colors[0];
    branchColors.set(node.id, color);
    return nodeElements(node.id, node.text, mapId, node.parentId, color);
  });
  const root = elements.find(e => e.id === tree[0].id)!;
  const x = scene.filter(e => !e.isDeleted).reduce((max, e) => Math.max(max, e.x + e.width), -160) + 160;
  const positioned = elements.map(e => e.id === root.id ? newElementWith(e, {x, y: 300}) : e);
  return {elements: arrangeMindMap([...scene, ...positioned], mapId), rootId: root.id, mapId};
}
export function addMindMapNode(scene: readonly Element[], selected: Element, sibling: boolean) {
  const meta = mindMapMeta(selected)!;
  const parentId = sibling ? meta.parentId : selected.id;
  if (!parentId) throw new Error('中心主题没有同级主题，请添加子主题');
  if (scene.filter(e => !e.isDeleted && mindMapMeta(e)?.mapId === meta.mapId && mindMapMeta(e)?.kind === 'node').length >= 100) throw new Error('每张思维导图最多支持 100 个主题');
  const id = crypto.randomUUID();
  const elements = nodeElements(id, '新主题', meta.mapId, parentId, selected.strokeColor);
  return {elements: arrangeMindMap([...scene, ...elements], meta.mapId), nodeId: id};
}
