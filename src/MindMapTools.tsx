import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CaptureUpdateAction, FONT_FAMILY, getCommonBounds } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { ChevronDown, GitBranch, Plus, X, Network } from 'lucide-react';
import { addMindMapNode, arrangeMindMap, createMindMap, mindMapMeta, renameMindMapNode, selectedMindMapNode } from './mindmap-canvas';
import type { Project } from './model';
import { mindMapKeyAction } from './mindmap.mjs';

const example = '我的计划\n  目标\n    想要达成什么\n  行动\n    第一步\n    第二步\n  资源\n    时间与工具';
export default function MindMapTools({api, canvas, toolbarSlot, canvasMode, project, selected, notify, onOpen}: {api: ExcalidrawImperativeAPI | null; canvas: HTMLDivElement | null; toolbarSlot: HTMLDivElement | null; canvasMode: {editing: boolean; selection: boolean}; project: Project; selected: string[]; notify: (text: string) => void; onOpen: () => void}) {
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(false);
  const [outline, setOutline] = useState(example);
  const [error, setError] = useState('');
  const anchor = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState<{id: string; value: string} | null>(null);
  const draftRef = useRef(draft);
  const [interacting, setInteracting] = useState(false);
  const node = selectedMindMapNode(project.elements, selected);
  const camera = project.camera || {scrollX: 0, scrollY: 0, zoom: 1};
  const editingNode = project.elements.find(e => !e.isDeleted && e.id === draft?.id);
  const editingLabel = project.elements.find(e => !e.isDeleted && e.type === 'text' && e.containerId === draft?.id);
  function beginEdit(id: string) {
    const label = api?.getSceneElements().find(e => e.type === 'text' && e.containerId === id);
    if (label?.type !== 'text') return;
    const value = {id, value: label.originalText};
    draftRef.current = value; setDraft(value);
  }
  function keepVisible(element: ExcalidrawElement) {
    if (!api || !canvas) return;
    const state = api.getAppState(), zoom = state.zoom.value;
    const left = (element.x + state.scrollX) * zoom, top = (element.y + state.scrollY) * zoom;
    const marginLeft = canvas.clientWidth <= 640 ? 20 : 240;
    if (left < marginLeft || top < 145 || left + element.width * zoom + 48 > canvas.clientWidth || top + element.height * zoom + 65 > canvas.clientHeight) {
      const mapId = mindMapMeta(element)?.mapId;
      api.scrollToContent(api.getSceneElements().filter(e => mindMapMeta(e)?.mapId === mapId), {fitToContent: true, maxZoom: zoom, animate: false, canvasOffsets: {left: marginLeft, right: 64, top: 145, bottom: 90}});
    }
  }
  function finishEdit(follow?: 'child' | 'sibling') {
    const current = draftRef.current;
    if (!api || !current) return;
    // Clear synchronously: unmount/blur must not commit or insert a second time.
    draftRef.current = null; setDraft(null);
    const scene = renameMindMapNode(api.getSceneElementsIncludingDeleted(), current.id, current.value);
    const topic = scene.find(e => !e.isDeleted && e.id === current.id);
    api.updateScene({elements: scene, appState: {selectedElementIds: {[current.id]: true}}, captureUpdate: CaptureUpdateAction.IMMEDIATELY});
    if (topic) {
      if (follow) add(follow === 'sibling' && !!mindMapMeta(topic)?.parentId, topic);
      else keepVisible(topic);
    }
  }
  useEffect(() => {if (draft?.id) {editor.current?.focus(); editor.current?.select();}}, [draft?.id]);
  useEffect(() => {
    if (!canvas) return;
    const down = (event: PointerEvent) => {if (event.target instanceof HTMLCanvasElement) setInteracting(true);};
    const up = () => setInteracting(false);
    canvas.addEventListener('pointerdown', down, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    window.addEventListener('blur', up);
    return () => {canvas.removeEventListener('pointerdown', down, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', up, true); window.removeEventListener('blur', up);};
  }, [canvas]);
  useEffect(() => {
    if (!api || open) return;
    const keydown = (event: KeyboardEvent) => {
      if (draftRef.current) return;
      if (event.target instanceof Element && event.target.closest('input,textarea,select,button,[contenteditable="true"],[role="dialog"]')) return;
      const state = api.getAppState();
      if (state.editingTextElement || state.editingLinearElement || state.activeTool.type !== 'selection') return;
      const current = selectedMindMapNode(api.getSceneElements(), Object.keys(state.selectedElementIds).filter(id => state.selectedElementIds[id]));
      if (!current) return;
      const action = mindMapKeyAction(event, {hasParent: !!mindMapMeta(current)?.parentId});
      if (!action) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (action === 'edit') beginEdit(current.id);
      else add(action === 'sibling', current);
    };
    window.addEventListener('keydown', keydown, true);
    return () => window.removeEventListener('keydown', keydown, true);
  }, [api, canvas, open]);
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
  function create(value = outline, edit = false) {
    if (!api) return;
    try {
      const result = createMindMap(value, api.getSceneElementsIncludingDeleted());
      api.updateScene({elements: result.elements, appState: {selectedElementIds: {[result.rootId]: true}}, captureUpdate: CaptureUpdateAction.IMMEDIATELY});
      api.setActiveTool({type: 'selection'});
      api.scrollToContent(result.elements.filter(e => mindMapMeta(e)?.mapId === result.mapId), {fitToContent: true, maxZoom: 1, animate: false});
      setOpen(false);
      setMenu(false);
      if (edit) beginEdit(result.rootId);
      else notify('思维导图已创建，选中主题即可添加分支');
    } catch (e) {setError(e instanceof Error ? e.message : '创建失败');}
  }
  function add(sibling: boolean, topic = node) {
    if (!api || !topic) return;
    try {
      const current = api.getSceneElements().find(e => e.id === topic.id);
      if (!current) return;
      const result = addMindMapNode(api.getSceneElementsIncludingDeleted(), current, sibling);
      api.updateScene({elements: result.elements, appState: {selectedElementIds: {[result.nodeId]: true}}, captureUpdate: CaptureUpdateAction.IMMEDIATELY});
      api.setActiveTool({type: 'selection'});
      const added = result.elements.find(e => e.id === result.nodeId)!;
      keepVisible(added);
      setMenu(false);
      beginEdit(result.nodeId);
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
  const canvasControls = canvas && createPortal(<div className="mindmap-canvas-controls" aria-label="画布思维导图工具">
      {node && !draft && !interacting && !canvasMode.editing && canvasMode.selection && (() => {
        const [left, top, right, bottom] = getCommonBounds([node]);
        const centerY = ((top + bottom) / 2 + camera.scrollY) * camera.zoom;
        return <><button className="mindmap-add child" aria-label="添加子主题" title="添加子主题 · Tab" style={{left: (right + camera.scrollX) * camera.zoom + 10, top: centerY - 16}} onPointerDown={e => {e.preventDefault(); e.stopPropagation();}} onClick={e => {e.stopPropagation(); add(false);}}><Plus size={17}/></button>
          {mindMapMeta(node)?.parentId && <button className="mindmap-add sibling" aria-label="添加同级主题" title="添加同级主题 · Enter" style={{left: ((left + right) / 2 + camera.scrollX) * camera.zoom - 16, top: (bottom + camera.scrollY) * camera.zoom + 10}} onPointerDown={e => {e.preventDefault(); e.stopPropagation();}} onClick={e => {e.stopPropagation(); add(true);}}><Plus size={16}/></button>}
          <div className="mindmap-node-hint" style={{left: (left + camera.scrollX) * camera.zoom, top: (bottom + camera.scrollY) * camera.zoom + (mindMapMeta(node)?.parentId ? 49 : 12)}}>{mindMapMeta(node)?.parentId ? 'Tab 子主题 · Enter 同级 · F2 编辑' : 'Tab / Enter 子主题 · F2 编辑'}</div>
        </>;
      })()}
      {draft && editingNode && (() => {
        const label = editingLabel?.type === 'text' ? editingLabel : undefined;
        const font = Object.entries(FONT_FAMILY).find(([, id]) => id === label?.fontFamily)?.[0] || '思源黑体';
        return <textarea ref={editor} className="mindmap-inline-editor" aria-label="主题文字" maxLength={200} spellCheck={false} value={draft.value} style={{left: (editingNode.x + camera.scrollX) * camera.zoom + 4, top: (editingNode.y + camera.scrollY) * camera.zoom + 4, width: Math.max(80, editingNode.width * camera.zoom - 8), height: Math.max(36, editingNode.height * camera.zoom - 8), fontSize: (label?.fontSize || 18) * camera.zoom, fontFamily: `"${font}", sans-serif`, color: label?.strokeColor || editingNode.strokeColor, background: editingNode.backgroundColor === 'transparent' ? '#fff' : editingNode.backgroundColor, lineHeight: label?.lineHeight || 1.5}} onPointerDown={e => e.stopPropagation()} onChange={e => {const value = {id: draft.id, value: e.target.value}; draftRef.current = value; setDraft(value);}} onBlur={() => finishEdit()} onKeyDown={e => {
          e.stopPropagation();
          const action = mindMapKeyAction({...e, isComposing: e.nativeEvent.isComposing}, {editing: true, hasParent: !!mindMapMeta(editingNode)?.parentId});
          if (!action) return;
          e.preventDefault(); finishEdit(action === 'finish' ? undefined : action as 'child' | 'sibling');
        }}/>;
      })()}
    </div>, canvas);
  return <>{canvasControls}{toolbarSlot && createPortal(<div className="mindmap-tools" ref={anchor} onPointerDown={e => e.stopPropagation()}>
    <button disabled={!api} title="创建中心主题，用 +、Tab 和 Enter 添加分支" onClick={() => {onOpen(); create('中心主题', true);}}><GitBranch size={17}/><span>思维导图</span></button>
    <button className="mindmap-more" aria-label="更多思维导图工具" aria-expanded={menu} onClick={() => {setMenu(!menu); onOpen();}}><ChevronDown size={13}/></button>
    {menu && <div className="mindmap-menu" role="group" aria-label="思维导图工具">
      <button onClick={() => {setOpen(true); setMenu(false); setError('');}}><Plus size={15}/>从大纲创建</button>
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
      <div className="mindmap-dialog-actions"><button onClick={() => setOpen(false)}>取消</button><button className="primary" onClick={() => create()} disabled={!api || !outline.trim()}><GitBranch size={16}/>创建到画布</button></div>
    </dialog>
  </div>, toolbarSlot)}</>;
}
