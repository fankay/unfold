import { convertToExcalidrawElements } from '@excalidraw/excalidraw';
import type { Project } from './model';
export function seed(): Project {
  const elements = convertToExcalidrawElements([
    { id: 'heading', type: 'text', x: 240, y: 100, text: '一个请求的旅程', fontSize: 36, fontFamily: 2, strokeColor: '#6965db' },
    { id: 'user', type: 'ellipse', x: 130, y: 260, width: 140, height: 110, backgroundColor: '#e7f5ff', fillStyle: 'hachure', strokeWidth: 2, label: { text: '用户', fontSize: 24, fontFamily: 2 } },
    { id: 'request', type: 'arrow', x: 285, y: 315, width: 130, height: 0, points: [[0,0],[130,0]], strokeWidth: 2 },
    { id: 'server', type: 'rectangle', x: 440, y: 240, width: 190, height: 150, backgroundColor: '#eee9ff', fillStyle: 'hachure', strokeWidth: 2, roundness: { type: 3 }, label: { text: 'API 服务', fontSize: 24, fontFamily: 2 } },
    { id: 'query', type: 'arrow', x: 650, y: 315, width: 130, height: 0, points: [[0,0],[130,0]], strokeWidth: 2 },
    { id: 'database', type: 'rectangle', x: 800, y: 255, width: 160, height: 125, backgroundColor: '#e7f5ff', fillStyle: 'hachure', strokeWidth: 2, roundness: { type: 3 }, label: { text: '数据库', fontSize: 24, fontFamily: 2 } },
    { id: 'note', type: 'text', x: 370, y: 450, text: '从一个请求，到一次完整的数据流转。', fontFamily: 2, fontSize: 20, strokeColor: '#868e96' },
  ], { regenerateIds: false });
  const ids = (roots: string[]) => elements.filter(e => roots.includes(e.id) || ('containerId' in e && roots.includes(e.containerId || ''))).map(e => e.id);
  return { format: 'step-canvas', version: 1, title: '系统架构讲解', elements, files: {}, steps: [
    { id: 's1', title: '用户发起请求', show: ids(['user']), hide: [], duration: 450 },
    { id: 's2', title: '服务处理请求', show: ids(['request','server']), hide: [], duration: 450 },
    { id: 's3', title: '数据持久化', show: ids(['query','database']), hide: [], duration: 450 },
    { id: 's4', title: '回顾完整架构', show: ids(['note']), hide: [], duration: 450 },
  ] };
}
