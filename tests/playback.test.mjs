import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibilityAt, cameraAt, playbackGroups, createTimeline, sampleTimeline } from '../src/playback.mjs';
const elements = ['a','b','always'].map(id => ({id}));
const steps = [{show:['a'],hide:[]},{show:['b'],hide:['a']}];
test('reveal, hide and previous-step restoration are deterministic', () => {
  assert.deepEqual([...visibilityAt(elements,steps,0)].sort(), ['a','always']);
  assert.deepEqual([...visibilityAt(elements,steps,1)].sort(), ['always','b']);
  assert.deepEqual([...visibilityAt(elements,steps,0)].sort(), ['a','always']);
});
test('camera inherits last earlier camera rather than future camera', () => {
 const home={zoom:1}, first={zoom:2}, last={zoom:3};
 assert.equal(cameraAt([{camera:first},{},{camera:last}],1,home),first);
 assert.equal(cameraAt([],0,home),home);
});

test('clicks divide playback; with overlaps and after waits for the previous fade', () => {
  const groups=playbackGroups([{},{start:'with'},{start:'after'},{start:'with'},{start:'click'},{start:'after'}]);
  assert.deepEqual(groups,[
    {cues:[{index:0,at:0},{index:1,at:0},{index:2,at:450},{index:3,at:450}],end:3,duration:900},
    {cues:[{index:4,at:0},{index:5,at:450}],end:5,duration:900},
  ]);
  assert.deepEqual(playbackGroups([{start:'after'},{start:'with'}])[0].cues,[{index:0,at:0},{index:1,at:0}]);
});

test('simultaneous fades progress together and automatic animation starts after completion', () => {
  const scene=['a','b','c'].map(id=>({id,opacity:100}));
  const sequence=[{show:['a'],hide:[]},{show:['b'],hide:[],start:'with'},{show:['c'],hide:['a'],start:'after'}];
  const home={scrollX:0,scrollY:0,zoom:1};
  const timeline=createTimeline(scene,sequence,playbackGroups(sequence)[0].cues,new Map(scene.map(e=>[e.id,0])),home,home);
  const middle=sampleTimeline(timeline,225);
  assert.equal(middle.opacity.get('a'),88);
  assert.equal(middle.opacity.get('b'),88);
  assert.equal(middle.opacity.get('c'),0);
  assert.equal(middle.active,1);
  const boundary=sampleTimeline(timeline,450);
  assert.deepEqual([...boundary.opacity.values()],[100,100,0]);
  assert.equal(boundary.active,2);
  assert.deepEqual([...sampleTimeline(timeline,900).opacity.values()],[0,100,100]);
  assert.deepEqual([...visibilityAt(scene,sequence,-1)],[]);
});

test('automatic camera changes stay synchronized and reduced motion preserves click boundaries', () => {
  const home={scrollX:0,scrollY:0,zoom:1}, close={scrollX:100,scrollY:20,zoom:2};
  const sequence=[{show:[],hide:[]},{show:[],hide:[],start:'after',camera:close},{show:[],hide:[]}];
  const timeline=createTimeline([],sequence,playbackGroups(sequence)[0].cues,new Map(),home,home);
  assert.deepEqual(sampleTimeline(timeline,449).camera,home);
  assert.deepEqual(sampleTimeline(timeline,900).camera,close);
  const reduced=playbackGroups(sequence,0);
  assert.equal(reduced.length,2);
  assert.equal(reduced[0].duration,0);
  const instant=createTimeline([],sequence,reduced[0].cues,new Map(),home,home,0);
  assert.deepEqual(sampleTimeline(instant,0).camera,close);
});
