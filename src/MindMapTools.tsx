import { useEffect, useRef, useState } from 'react';
import { CaptureUpdateAction } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { GitBranch, Plus, X, Network } from 'lucide-react';
import { addMindMapNode, arrangeMindMap, createMindMap, mindMapMeta, selectedMindMapNode } from './mindmap-canvas';
import type { Project } from './model';

const example = '我的计划\n  目标\n    想要达成什么\n  行动\n    第一步\n    第二步\n  资源\n    时间与工具';
export default function MindMapTools({api, project, selected, notify, onOpen}: {api: ExcalidrawImperativeAPI | null; project: Project; selected: string[]; notify: (text: string) => void; onOpen: () => void}) {
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(false);
  const [outline, setOutline] = useState(example);
  const [error, setError] = useState('');
  const anchor = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const node = selectedMindMapNode(project.elements, selected);
  useEffect(() => {
    if (!menu) return;
    const close = (event: PointerEvent) => {if (!anchor.current?.contains(event.target as Node)) setMenu(false);};
    const escape = (event: KeyboardEvent) => {if (event.key === 'Escape') setMenu(false);};
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', escape);
    return () => {window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', escape);};
  }, [menu]);
  useEffect(() => {
    if (open) {dialog.current?.showModal(); input.current?.focus();}
    else dialog.current?.close();
  }, [open]);
  function create() {
    if (!api) return;
    try {
      const result = createMindMap(outline, api.getSceneElementsIncludingDeleted());
      api.updateScene({elements: result.elements, appState: {selectedElementIds: {[result.rootId]: true}}, captureUpdate: CaptureUpdateAction.IMMEDIATELY});
      api.setActiveTool({type: 'selection'});
      api.scrollToContent(result.elements.filter(e => mindMapMeta(e)?.mapId === result.mapId), {fitToContent: true, maxZoom: 1, animate: false});
      setOpen(false);
      notify('思维导图已创建，双击主题即可修改文字');
    } catch (e) {setError(e instanceof Error ? e.message : '创建失败');}
  }
  function add(sibling: boolean) {
    if (!api || !node) return;
    try {
      const current = api.getSceneElements().find(e => e.id === node.id);
      if (!current) return;
      const result = addMindMapNode(api.getSceneElementsIncludingDeleted(), current, sibling);
      api.updateScene({elements: result.elements, appState: {selectedElementIds: {[result.nodeId]: true}}, captureUpdate: CaptureUpdateAction.IMMEDIATELY});
      api.scrollToContent(result.elements.filter(e => !e.isDeleted && mindMapMeta(e)?.mapId === mindMapMeta(node)?.mapId), {fitToContent: true, maxZoom: 1, animate: false});
      setMenu(false);
      notify('已添加新主题，双击即可修改文字');
    } catch (e) {notify(e instanceof Error ? e.message : '添加失败');}
  }
  function arrange() {
    if (!api || !node) return;
    try {
      api.updateScene({elements: arrangeMindMap(api.getSceneElementsIncludingDeleted(), mindMapMeta(node)!.mapId), captureUpdate: CaptureUpdateAction.IMMEDIATELY});
      setMenu(false);
      notify('布局已整理');
    } catch (e) {notify(e instanceof Error ? e.message : '整理失败');}
  }
  return <div className="mindmap-tools" ref={anchor}>
    <button className={menu ? 'chosen' : ''} aria-expanded={menu} onClick={() => {setMenu(!menu); onOpen();}}><GitBranch size={17}/><span>思维导图</span></button>
    {menu && <div className="mindmap-menu" role="group" aria-label="思维导图工具">
      <button onClick={() => {setOpen(true); setMenu(false); setError('');}}><Plus size={15}/>新建思维导图</button>
      {node ? <><div className="mindmap-menu-divider"/><button onClick={() => add(false)}><GitBranch size={15}/>添加子主题</button><button disabled={!mindMapMeta(node)?.parentId} onClick={() => add(true)}><Plus size={15}/>添加同级主题</button><button onClick={arrange}><Network size={15}/>整理布局</button></> : <p>选中一个主题，可继续添加分支</p>}
    </div>}
    <dialog ref={dialog} className="mindmap-dialog" aria-labelledby="mindmap-heading" onCancel={() => setOpen(false)} onClick={e => {if (e.target === e.currentTarget) setOpen(false);}}>
      <div className="mindmap-dialog-heading"><div><h2 id="mindmap-heading">创建思维导图</h2><p>一行一个主题，用缩进表示层级。</p></div><button className="icon-button" aria-label="关闭思维导图创建窗口" onClick={() => setOpen(false)}><X size={18}/></button></div>
      <label htmlFor="mindmap-outline">主题大纲</label>
      <textarea id="mindmap-outline" ref={input} value={outline} maxLength={20000} spellCheck={false} onChange={e => {setOutline(e.target.value); setError('');}} onKeyDown={e => {
        if (e.key === 'Tab' && !e.shiftKey) {
          e.preventDefault(); const start = e.currentTarget.selectionStart, end = e.currentTarget.selectionEnd;
          setOutline(value => value.slice(0, start) + '  ' + value.slice(end));
          requestAnimationFrame(() => input.current?.setSelectionRange(start + 2, start + 2));
        }
      }}/>
      <p className="mindmap-help">按 Tab 或输入两个空格添加一层缩进。创建后双击主题编辑文字。</p>
      {error && <p className="mindmap-error" role="alert">{error}</p>}
      <div className="mindmap-dialog-actions"><button onClick={() => setOpen(false)}>取消</button><button className="primary" onClick={create} disabled={!api || !outline.trim()}><GitBranch size={16}/>创建到画布</button></div>
    </dialog>
  </div>;
}
