import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { CaptureUpdateAction, Excalidraw, restoreElements } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI, AppState } from '@excalidraw/excalidraw/types';
import { Play, Upload, Download, ChevronLeft, ChevronRight, X, Check, Maximize } from 'lucide-react';
import type { AnimationStart, Camera as CameraState, Project } from './model';
import { newStep } from './model';
import AnimationControls, { type Effect } from './AnimationControls';
import AnimationBadges from './AnimationBadges';
import { expandObjects } from './animation-objects';
import { cameraAt, visibilityAt, playbackGroups, createTimeline, sampleTimeline } from './playback.mjs';
import { reconcileSteps } from './reconcile-steps.mjs';
import { saveProject, validateProject } from './storage';
const readCamera = (state: AppState): CameraState => ({ scrollX: state.scrollX, scrollY: state.scrollY, zoom: state.zoom.value });
export default function App({ initial }: { initial: Project }) {
  const [project, setProject] = useState(() => ({...initial, steps: reconcileSteps(initial.elements, initial.steps)}));
  const projectRef = useRef(project); projectRef.current = project;
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [active, setActive] = useState(-1);
  const activeGroup = useRef(-1);
  const groups = useMemo(()=>playbackGroups(project.steps),[project.steps]);
  const [playing, setPlaying] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [target, setTarget] = useState('new');
  const [canvas, setCanvas] = useState<HTMLDivElement | null>(null);
  const playingRef = useRef(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState('本地自动保存');
  const frame = useRef(0);
  const editCamera = useRef<CameraState | undefined>(undefined);
  const fileInput = useRef<HTMLInputElement>(null);
  const initialData = useMemo(() => ({ elements: initial.elements, files: initial.files, appState: { viewBackgroundColor: '#ffffff', scrollX: initial.camera?.scrollX ?? 0, scrollY: initial.camera?.scrollY ?? 0, zoom: { value: (initial.camera?.zoom ?? 1) as AppState['zoom']['value'] } } }), [initial]);
  const options = useMemo(() => ({canvasActions:{loadScene:false,saveToActiveFile:false}}), []);
  const onCanvasChange = useCallback<NonNullable<import('@excalidraw/excalidraw/types').ExcalidrawProps['onChange']>>((elements,state,files) => {
    if (playingRef.current) return;
    const ids=Object.keys(state.selectedElementIds).filter(id=>state.selectedElementIds[id]);
    setSelected(old=>old.join()===ids.join()?old:ids);
    setProject(p=>{
      const steps = reconcileSteps(elements, p.steps);
      return p.elements===elements && p.files===files && p.steps===steps && p.camera?.scrollX===state.scrollX && p.camera?.scrollY===state.scrollY && p.camera?.zoom===state.zoom.value ? p : {...p,elements,files,steps,camera:readCamera(state)};
    });
  }, []);
  useEffect(() => {
    if (target !== 'new' && !project.steps.some(step=>step.id===target)) setTarget('new');
    if (!project.steps.length) setActive(0);
  }, [project.steps, target]);
  useEffect(() => {
    setSaved('保存中…');
    const timer = setTimeout(() => { saveProject(project).then(() => setSaved('已保存到此浏览器')).catch(() => setSaved('保存失败，请导出备份')); }, 600);
    return () => clearTimeout(timer);
  }, [project]);
  useEffect(() => { if (!notice) return; const timer=setTimeout(()=>setNotice(''),3500); return ()=>clearTimeout(timer); },[notice]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  function renderStep(index: number) {
    if (!api) return;
    cancelAnimationFrame(frame.current);
    const p = projectRef.current;
    const visible = visibilityAt(p.elements, p.steps, index);
    const camera = cameraAt(p.steps,index,editCamera.current || readCamera(api.getAppState()));
    api.updateScene({elements:p.elements.map(e=>({...e,opacity:visible.has(e.id)?e.opacity:0})),appState:{scrollX:camera.scrollX,scrollY:camera.scrollY,zoom:{value:camera.zoom as AppState['zoom']['value']},selectedElementIds:{}},captureUpdate:CaptureUpdateAction.NEVER});
    setActive(index);
  }
  function playGroup(index: number) {
    if (!api || !groups[index]) return;
    cancelAnimationFrame(frame.current);
    activeGroup.current=index;
    const p=projectRef.current;
    const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:450;
    const group=playbackGroups(p.steps,duration)[index];
    const camera=readCamera(api.getAppState());
    const timeline=createTimeline(p.elements,p.steps,group.cues,new Map(api.getSceneElements().map(e=>[e.id,e.opacity])),camera,editCamera.current || camera,duration);
    const started=performance.now();
    let lastActive=-2;
    const tick=(now:number)=>{
      const elapsed=Math.min(now-started,group.duration);
      const state=sampleTimeline(timeline,elapsed);
      api.updateScene({elements:p.elements.map(e=>({...e,opacity:state.opacity.get(e.id) ?? 0})),appState:{scrollX:state.camera.scrollX,scrollY:state.camera.scrollY,zoom:{value:state.camera.zoom as AppState['zoom']['value']},selectedElementIds:{}},captureUpdate:CaptureUpdateAction.NEVER});
      if (state.active !== undefined && state.active !== lastActive) {lastActive=state.active;setActive(state.active);}
      if (elapsed<group.duration) frame.current=requestAnimationFrame(tick);
    };
    // Update the controls immediately, before the first animation frame.
    setActive(group.cues.filter(cue=>cue.at===0).at(-1)!.index);
    frame.current=requestAnimationFrame(tick);
  }
  function next() {
    if (activeGroup.current<groups.length-1) playGroup(activeGroup.current+1);
    // An automatic chain can still be running inside the last click group.
    // Finish that chain before treating another advance as the end of the show.
    else if (active<project.steps.length-1) renderStep(project.steps.length-1);
    else stop();
  }
  function previous() {
    if (activeGroup.current<0) return;
    activeGroup.current-=1;
    renderStep(activeGroup.current<0?-1:groups[activeGroup.current].end);
  }
  function start() {
    if (!api || !project.steps.length) return;
    editCamera.current=readCamera(api.getAppState());
    playingRef.current=true; setListOpen(false); setPlaying(true); activeGroup.current=-1; renderStep(-1);
  }
  function stop() {
    if (!api) return;
    cancelAnimationFrame(frame.current);
    const camera=editCamera.current;
    // Keep callbacks in presentation mode until the restored scene is committed.
    api.updateScene({elements:projectRef.current.elements, appState: camera ? {scrollX:camera.scrollX,scrollY:camera.scrollY,zoom:{value:camera.zoom as AppState['zoom']['value']}} : undefined,captureUpdate:CaptureUpdateAction.NEVER});
    setSelected([]);
    setPlaying(false);
    requestAnimationFrame(()=>{playingRef.current=false;});
    if (document.fullscreenElement) void document.exitFullscreen();
  }
  useEffect(() => {
    if (!playing) return;
    const handler=(e:KeyboardEvent)=>{
      if (['Space','ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Escape'].includes(e.code)) {e.preventDefault();e.stopPropagation();}
      if (e.code==='Escape') stop();
      else if (['Space','ArrowRight','ArrowDown'].includes(e.code)) next();
      else if (['ArrowLeft','ArrowUp'].includes(e.code)) previous();
    };
    const clickHandler=(e:MouseEvent)=>{
      if (e.button !== 0 || !(e.target instanceof Element)) return;
      if (e.target.closest('button,input,select,textarea,a,[role="button"],.canvas-controls')) return;
      e.preventDefault();
      e.stopPropagation();
      next();
    };
    window.addEventListener('keydown',handler,true);
    window.addEventListener('click',clickHandler,true);
    return ()=>{
      window.removeEventListener('keydown',handler,true);
      window.removeEventListener('click',clickHandler,true);
    };
  });
  function addObjects(effect: Effect) {
    if (!selected.length) return;
    const objects = expandObjects(project.elements, selected);
    if (!objects.length) return;
    setProject(p => {
      const index = p.steps.findIndex(step => step.id === target);
      const steps = [...p.steps];
      if (index < 0) steps.push({...newStep(), [effect]: objects});
      else steps[index] = {...steps[index], [effect]: [...new Set([...steps[index][effect], ...objects])], [effect === 'show' ? 'hide' : 'show']: steps[index][effect === 'show' ? 'hide' : 'show'].filter(id=>!objects.includes(id))};
      return {...p, steps};
    });
  }
  function selectObjects(ids: string[]) {
    if (!api) return;
    const objects=expandObjects(project.elements,ids);
    api.updateScene({appState:{selectedElementIds:Object.fromEntries(objects.map(id=>[id,true])),activeTool:{type:'selection',customType:null,lastActiveTool:null,locked:false}},captureUpdate:CaptureUpdateAction.NEVER});
  }
  function removeAnimation(stepId: string, effect: Effect, id: string) {
    const ids=expandObjects(project.elements,[id]);
    setProject(p=>({...p,steps:p.steps.map(step=>step.id===stepId?{...step,[effect]:step[effect].filter(id=>!ids.includes(id))}:step).filter(step=>step.show.length||step.hide.length||step.camera)}));
  }
  function changeStart(stepId: string, start: AnimationStart) {
    setProject(p=>({...p,steps:p.steps.map(step=>step.id===stepId?{...step,start}:step)}));
  }
  function move(stepId: string, direction: number) {
    setProject(p=>{const steps=[...p.steps];const from=steps.findIndex(s=>s.id===stepId);const to=from+direction;if(from<0||to<0||to>=steps.length)return p;[steps[from],steps[to]]=[steps[to],steps[from]];return {...p,steps};});
  }
  function changeAnimationStep(stepId: string, effect: Effect, id: string, destination: string) {
    if (stepId === destination) return;
    const ids=expandObjects(project.elements,[id]);
    const opposite=effect==='show'?'hide':'show';
    setProject(p=>({...p,steps:p.steps.map(step=>step.id===stepId?{...step,[effect]:step[effect].filter(id=>!ids.includes(id))}:step.id===destination?{...step,[effect]:[...new Set([...step[effect],...ids])],[opposite]:step[opposite].filter(id=>!ids.includes(id))}:step).filter(step=>step.show.length||step.hide.length||step.camera)}));
  }
  function exportProject() {
    const url=URL.createObjectURL(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=`${project.title || 'Unfold'}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function importProject(file:File) {
    try {
      if(file.size>50*1024*1024)throw new Error('文件超过 50 MB，请选择更小的项目');
      const value:unknown=JSON.parse(await file.text());validateProject(value);
      const elements=restoreElements(value.elements,null);
      const imported={...value,elements,steps:reconcileSteps(elements,value.steps)};
      api?.addFiles(Object.values(imported.files));
      api?.updateScene({elements:imported.elements,appState:imported.camera?{scrollX:imported.camera.scrollX,scrollY:imported.camera.scrollY,zoom:{value:imported.camera.zoom as AppState['zoom']['value']}}:undefined,captureUpdate:CaptureUpdateAction.IMMEDIATELY});
      setProject(imported);setActive(0);setTarget('new');api?.history.clear();setNotice('项目已导入');
    } catch(error) {setNotice(error instanceof Error?error.message:'导入失败');}
  }
  return <div className={`app ${playing?'presenting':''}`}>
    <header className="header"><div className="brand"><img className="logo" src="/unfold-mark.svg" alt=""/><strong>Unfold</strong></div><input className="document-title" aria-label="项目名称" value={project.title} disabled={playing} onChange={e=>setProject(p=>({...p,title:e.target.value}))}/><span className="save-status"><Check size={13}/>{saved}</span><div className="header-actions">{!playing && <><button onClick={()=>fileInput.current?.click()}><Upload size={16}/>导入</button><button onClick={exportProject}><Download size={16}/>导出</button></>}<button className="primary" onClick={playing?stop:start} disabled={!api || !project.steps.length}>{playing?<X size={16}/>:<Play size={16} fill="currentColor"/>}{playing?'退出演示':'开始演示'}</button></div></header>
    <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void importProject(file);e.target.value='';}}/>
    <main><div className="canvas" ref={setCanvas}>
      <Excalidraw excalidrawAPI={setApi} initialData={initialData} langCode="zh-CN" theme="light" viewModeEnabled={playing} zenModeEnabled={playing} UIOptions={options} onChange={onCanvasChange}/>
      {!playing && <><AnimationControls canvas={canvas} project={project} selected={selected} target={target} setTarget={setTarget} add={addObjects} open={listOpen} setOpen={setListOpen} select={selectObjects} remove={removeAnimation} move={move} changeStep={changeAnimationStep} changeStart={changeStart}/><AnimationBadges project={project} selectStep={(step,objects)=>{setTarget(step);setListOpen(true);selectObjects(objects);}}/></>}
      {playing&&<><div className="presentation-click-surface" aria-hidden="true"/><div className="presentation-label"><span>{active<0?'单击开始':`第 ${active+1} 步 / ${project.steps.length}`}</span></div></>}
      <nav className={`canvas-controls ${playing?'playback-controls':'shortcut-hint'}`} aria-label={playing?'演示控制':'演示快捷键'}>{playing?<><button aria-label="上一步" disabled={activeGroup.current<0} onClick={previous}><ChevronLeft size={18}/></button><span>{active+1} / {project.steps.length}</span><button onClick={next}>{active===project.steps.length-1?'结束演示':active<0?'开始':'下一步'}{active===project.steps.length-1?<X size={18}/>:<ChevronRight size={18}/>}</button><button aria-label="全屏" title="全屏" onClick={()=>{void document.documentElement.requestFullscreen().catch(()=>setNotice('浏览器未允许全屏'));}}><Maximize size={16}/></button></>:<span><kbd>空格</kbd> 下一步 <span className="dot">·</span> <kbd>←</kbd> 上一步 <span className="dot">·</span> <kbd>Esc</kbd> 退出演示</span>}</nav>
    </div>
    </main>{notice&&<div className="toast" role="status">{notice}</div>}
  </div>;
}
