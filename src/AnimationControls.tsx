import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, Check, ChevronDown, Eye, EyeOff, ListOrdered, Trash2, X } from 'lucide-react';
import type { AnimationStart, Project } from './model';
import { animationObjects, objectLabel } from './animation-objects';
export type Effect = 'show' | 'hide';
type Props = {
  canvas: HTMLDivElement | null; project: Project; selected: string[]; target: string;
  setTarget: (id: string) => void; add: (effect: Effect) => void;
  open: boolean; setOpen: (open: boolean) => void;
  select: (ids: string[]) => void; remove: (step: string, effect: Effect, id: string) => void;
  move: (step: string, direction: number) => void;
  changeStep: (step: string, effect: Effect, id: string, destination: string) => void;
  changeStart: (step: string, start: AnimationStart) => void;
};
export default function AnimationControls(props: Props) {
  const {canvas,project,selected,target,setTarget,add,open,setOpen,select,remove,move,changeStep,changeStart}=props;
  const [toolbar,setToolbar]=useState<Element|null>(null);
  const [menu,setMenu]=useState(false);
  const anchor=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!canvas)return;
    const find=()=>setToolbar(canvas.querySelector('.App-toolbar'));
    find(); const observer=new MutationObserver(find);observer.observe(canvas,{subtree:true,childList:true});
    return ()=>observer.disconnect();
  },[canvas]);
  useEffect(()=>{
    if(!menu)return;
    const close=(e:PointerEvent)=>{if(!anchor.current?.contains(e.target as Node))setMenu(false);};
    window.addEventListener('pointerdown',close);return()=>window.removeEventListener('pointerdown',close);
  },[menu]);
  const targetIndex=project.steps.findIndex(s=>s.id===target);
  const controls=<div className="animation-tools" role="group" aria-label="动画工具" onPointerDown={e=>e.stopPropagation()}>
    <button className="animation-action appear" disabled={!selected.length} title="选中对象后添加淡入动画" onClick={()=>add('show')}><Eye size={17}/><span>出现</span></button>
    <button className="animation-action disappear" disabled={!selected.length} title="选中对象后添加淡出动画" onClick={()=>add('hide')}><EyeOff size={17}/><span>消失</span></button>
    <div className="animation-target" ref={anchor}><button className="target-button" aria-label="选择动画步骤" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}>{targetIndex<0?'新步骤':`第 ${targetIndex+1} 步`}<ChevronDown size={13}/></button>{menu&&<div className="target-menu"><button onClick={()=>{setTarget('new');setMenu(false);}}>新步骤{targetIndex<0&&<Check size={14}/>}</button>{project.steps.map((step,index)=><button key={step.id} onClick={()=>{setTarget(step.id);setMenu(false);}}>第 {index+1} 步{target===step.id&&<Check size={14}/>}</button>)}</div>}</div>
    <button className={`animation-action list-button ${open?'chosen':''}`} aria-expanded={open} onClick={()=>{setOpen(!open);setMenu(false);}}><ListOrdered size={18}/><span>动画列表</span></button>
  </div>;
  return <>{toolbar?createPortal(controls,toolbar):<div className="animation-toolbar-fallback">{controls}</div>}{open&&<section className="animation-list" aria-label="动画列表"><div className="animation-list-heading"><h2>动画列表</h2><button className="icon-button" aria-label="关闭动画列表" onClick={()=>setOpen(false)}><X size={16}/></button></div><div className="animation-list-body">{project.steps.length===0?<p className="list-empty">选中画布对象，点击顶部的「出现」或「消失」。</p>:project.steps.map((step,index)=><div key={step.id} className="animation-group"><div className="animation-group-heading"><button className={target===step.id?'step-target selected':'step-target'} onClick={()=>setTarget(target===step.id?'new':step.id)} title="将选中对象的动画添加到这一步"><span className="number">{index+1}</span>第 {index+1} 步</button><select className="animation-start" aria-label={`第 ${index+1} 步开始方式`} value={step.start ?? 'click'} onChange={e=>changeStart(step.id,e.target.value as AnimationStart)}><option value="click">单击时</option><option value="with">与上一动画同时</option><option value="after">上一动画之后</option></select><div className="order-buttons"><button className="icon-button" aria-label={`第 ${index+1} 步上移`} disabled={index===0} onClick={()=>move(step.id,-1)}><ArrowUp size={13}/></button><button className="icon-button" aria-label={`第 ${index+1} 步下移`} disabled={index===project.steps.length-1} onClick={()=>move(step.id,1)}><ArrowDown size={13}/></button></div></div>{(['show','hide'] as const).flatMap(effect=>animationObjects(project.elements,step[effect]).map(element=><div className="animation-row" key={`${effect}-${element.id}`}><button className="animation-object" title="选中画布上的对象" onClick={()=>select([element.id])}>{effect==='show'?<Eye className="appear-icon" size={15}/>:<EyeOff className="disappear-icon" size={15}/>}<span>{objectLabel(element,project.elements)}</span><small>{effect==='show'?'出现':'消失'}</small></button><select aria-label={`${objectLabel(element,project.elements)}${effect==='show'?'出现':'消失'}的步骤`} title="调整所属步骤" value={step.id} onChange={e=>changeStep(step.id,effect,element.id,e.target.value)}>{project.steps.map((s,i)=><option key={s.id} value={s.id}>{i+1}</option>)}</select><button className="icon-button" aria-label={`移除${objectLabel(element,project.elements)}的${effect==='show'?'出现':'消失'}动画`} onClick={()=>remove(step.id,effect,element.id)}><Trash2 size={13}/></button></div>))}{!step.show.length&&!step.hide.length&&<span className="empty-step">在画布中选中对象，再点出现或消失</span>}</div>)}</div></section>}</>;
}
