import { get, set } from 'idb-keyval';
import type { Project } from './model';
export const loadProject = () => get<Project>('step-canvas-project');
export const saveProject = (project: Project) => set('step-canvas-project', project);
export function validateProject(value: unknown): asserts value is Project {
  const p = value as Project;
  if (!p || p.format !== 'step-canvas' || p.version !== 1 || typeof p.title !== 'string' || !Array.isArray(p.elements) || !Array.isArray(p.steps) || !p.files || typeof p.files !== 'object') throw new Error('请选择 Unfold 导出的 JSON 项目文件');
  const ids = new Set<string>();
  for (const e of p.elements) { if (typeof e.id !== 'string' || typeof e.type !== 'string' || !Number.isFinite(e.x) || !Number.isFinite(e.y)) throw new Error('画布对象格式不正确'); }
  for (const s of p.steps) {
    if (typeof s.id !== 'string' || ids.has(s.id) || typeof s.title !== 'string' || !Array.isArray(s.show) || !Array.isArray(s.hide) || ![...s.show,...s.hide].every(id => typeof id === 'string') || !Number.isFinite(s.duration) || s.duration < 0 || s.duration > 5000) throw new Error('演示步骤格式不正确');
    ids.add(s.id);
    if (s.start !== undefined && !['click','with','after'].includes(s.start)) throw new Error('动画开始方式格式不正确');
    if (s.camera && (!Number.isFinite(s.camera.scrollX) || !Number.isFinite(s.camera.scrollY) || !Number.isFinite(s.camera.zoom) || s.camera.zoom <= 0)) throw new Error('镜头格式不正确');
  }
}
