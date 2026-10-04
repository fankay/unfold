import { getCommonBounds } from '@excalidraw/excalidraw';
import type { Project } from './model';
import { animationObjects, objectLabel } from './animation-objects';
export default function AnimationBadges({project,selectStep}: {project:Project;selectStep:(id:string,objects:string[])=>void}) {
  const badges=new Map<string,{step:string;index:number;effect:'show'|'hide'}[]>();
  project.steps.forEach((step,index)=>{for(const effect of ['show','hide'] as const)for(const e of animationObjects(project.elements,step[effect]))badges.set(e.id,[...(badges.get(e.id)||[]),{step:step.id,index,effect}]);});
  const camera=project.camera || {scrollX:0,scrollY:0,zoom:1};
  return <div className="animation-badges" aria-label="画布动画编号">{project.elements.filter(e=>!e.isDeleted&&badges.has(e.id)).map(element=>{
    const [x,y]=getCommonBounds([element]);
    return <div className="object-badges" key={element.id} style={{left:(x+camera.scrollX)*camera.zoom-8,top:(y+camera.scrollY)*camera.zoom-25}}>{badges.get(element.id)!.map(b=><button key={`${b.step}-${b.effect}`} className={`animation-badge ${b.effect}`} aria-label={`${objectLabel(element,project.elements)} 第 ${b.index+1} 步${b.effect==='show'?'出现':'消失'}`} title={`第 ${b.index+1} 步 · ${b.effect==='show'?'出现':'消失'}`} onPointerDown={e=>e.stopPropagation()} onClick={()=>selectStep(b.step,[element.id])}>{b.index+1}</button>)}</div>;
  })}</div>;
}
