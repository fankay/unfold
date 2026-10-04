import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileSteps } from '../src/reconcile-steps.mjs';
const step=(id,show=[],hide=[],camera)=>({id,show,hide,...(camera?{camera}:{})});
test('clearing all elements removes old steps including camera state',()=>{
  const steps=[step('1',['a']),step('2',['b']),step('3',[],['a']),step('4',[],[],{zoom:2})];
  const cleared=[{id:'a',isDeleted:true},{id:'b',isDeleted:true}];
  const afterClear=reconcileSteps(cleared,steps);
  assert.deepEqual(afterClear,[]);
  const first=step('new',['c']);
  assert.deepEqual(reconcileSteps([...cleared,{id:'c'}],[...afterClear,first]),[first]);
});
test('already stale saved steps do not consume numbers for a new object',()=>{
  const steps=[step('old-1',['deleted']),step('old-2',['missing']),step('new',['live'])];
  assert.deepEqual(reconcileSteps([{id:'deleted',isDeleted:true},{id:'live'}],steps),[steps[2]]);
});
test('partial removal keeps other animations and leaves valid scene references unchanged',()=>{
  const steps=[step('first',['a','b'],['missing']),step('second',['c'])];
  const elements=[{id:'a',isDeleted:true},{id:'b'},{id:'c'}];
  const cleaned=reconcileSteps(elements,steps);
  assert.deepEqual(cleaned,[step('first',['b']),steps[1]]);
  assert.equal(reconcileSteps(elements,cleaned),cleaned);
});
