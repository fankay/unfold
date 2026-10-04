import test from 'node:test';
import assert from 'node:assert/strict';
import { insertTopicAfter, mindMapKeyAction, parseOutline, layoutTree } from '../src/mindmap.mjs';

test('节点快捷键区分同级、子级和编辑结束', () => {
  assert.equal(mindMapKeyAction({key:'Enter'}, {hasParent:true}), 'sibling');
  assert.equal(mindMapKeyAction({key:'Enter'}), 'child');
  assert.equal(mindMapKeyAction({key:'Tab'}, {editing:true}), 'child');
  assert.equal(mindMapKeyAction({key:'F2'}), 'edit');
  assert.equal(mindMapKeyAction({key:'Enter',metaKey:true}, {editing:true}), 'finish');
  assert.equal(mindMapKeyAction({key:'Escape'}, {editing:true}), 'finish');
});
test('输入法确认、换行、按键重复和系统快捷键不会创建节点', () => {
  for (const event of [{key:'Enter',isComposing:true},{key:'Enter',keyCode:229},{key:'Enter',repeat:true},{key:'Enter',shiftKey:true},{key:'Tab',shiftKey:true},{key:'Enter',ctrlKey:true},{key:'Enter',altKey:true}]) assert.equal(mindMapKeyAction(event, {hasParent:true}), null);
  assert.equal(mindMapKeyAction({key:'Enter',isComposing:true}, {editing:true,hasParent:true}), null);
  assert.equal(mindMapKeyAction({key:'Enter',shiftKey:true}, {editing:true}), null);
});
test('新同级插在当前主题之后，保留其他元素与主题的顺序', () => {
  const scene = [{id:'a'}, {id:'a-text'}, {id:'a-child'}, {id:'b'}];
  const added = [{id:'new'}, {id:'new-text'}];
  assert.deepEqual(insertTopicAfter(scene,'a',added).map(e=>e.id), ['a','new','new-text','a-text','a-child','b']);
  assert.deepEqual(scene.map(e=>e.id), ['a','a-text','a-child','b']);
  assert.throws(()=>insertTopicAfter(scene,'missing',added));
});

test('缩进大纲保留分支层级、中文与兄弟顺序', () => {
  let n = 0;
  const nodes = parseOutline('计划\n  目标\n\t\t里程碑\n  行动\n    - 开始', () => String(++n));
  assert.deepEqual(nodes.map(node => [node.text, node.parentId]), [['计划', null], ['目标', '1'], ['里程碑', '2'], ['行动', '1'], ['开始', '4']]);
});
test('拒绝多中心、跳级、奇数缩进和超量主题', () => {
  for (const outline of ['', '根\n分支', '根\n    跳级', '根\n 分支', `根${'\n  子'.repeat(100)}`]) assert.throws(() => parseOutline(outline));
});
test('不同尺寸与深层分支布局不重叠并保留中心锚点', () => {
  const nodes = [
    {id:'a',parentId:null,width:180,height:68}, {id:'b',parentId:'a',width:300,height:100},
    {id:'c',parentId:'a',width:150,height:56}, {id:'d',parentId:'b',width:150,height:56},
    {id:'e',parentId:'b',width:150,height:130},
  ];
  const positions = layoutTree(nodes, {x: 500, y: 300});
  assert.deepEqual(positions.get('a'), {x:500,y:300});
  assert.equal(positions.get('d').x, positions.get('b').x + 300 + 96);
  assert.ok(positions.get('c').y > positions.get('b').y + 100);
  assert.ok(positions.get('e').y >= positions.get('d').y + 56 + 28);
});
test('删除上级后的分支仍能整理，循环引用不会死循环', () => {
  const node = {id:'b',parentId:'deleted',width:160,height:56};
  assert.equal(layoutTree([node]).size, 1);
  assert.throws(() => layoutTree([{...node,parentId:'b'}]), /循环/);
});

test('删除父主题包含后代、绑定文字和连线，保留兄弟与其他画布对象', async () => {
  const {expandMindMapDeletion} = await import('../src/mindmap.mjs');
  const node = (id, parentId, mapId='map') => ({id,customData:{unfoldMindMap:{kind:'node',mapId,parentId}}});
  const edge = (id, parentId) => ({id,customData:{unfoldMindMap:{kind:'edge',mapId:'map',parentId}}});
  const scene = [node('root',null),node('a','root'),node('b','a'),node('c','b'),node('sibling','root'),node('other','a','another-map'),{id:'text',containerId:'b'},edge('a-edge','a'),edge('b-edge','b'),edge('c-edge','c'),edge('sibling-edge','sibling'),{id:'plain'}];
  const selected = {a:true,plain:true};
  assert.deepEqual(Object.keys(expandMindMapDeletion(scene,selected)).sort(), ['a','a-edge','b','b-edge','c','c-edge','plain','text'].sort());
  assert.deepEqual(selected,{a:true,plain:true});
  assert.ok(expandMindMapDeletion(scene,{root:true})['sibling-edge']);
  assert.ok(expandMindMapDeletion(scene,{text:true}).c);
  assert.deepEqual(expandMindMapDeletion(scene,{plain:true}),{plain:true});
});
test('删除分支跳过已删除主题并处理循环层级', async () => {
  const {expandMindMapDeletion} = await import('../src/mindmap.mjs');
  const scene = [{id:'a',customData:{unfoldMindMap:{kind:'node',mapId:'m',parentId:'b'}}},{id:'b',customData:{unfoldMindMap:{kind:'node',mapId:'m',parentId:'a'}}},{id:'old',isDeleted:true,customData:{unfoldMindMap:{kind:'node',mapId:'m',parentId:'a'}}}];
  assert.deepEqual(expandMindMapDeletion(scene,{a:true}),{a:true,b:true});
});
test('开发与生产的原生删除入口都扩展分支，并在上游改变时明确失败', async () => {
  const {readFileSync} = await import('node:fs');
  const {patchMindMapDeletion} = await import('../scripts/excalidraw-mindmap-plugin.mjs');
  for (const mode of ['dev','prod']) {
    const source = readFileSync(`node_modules/@excalidraw/excalidraw/dist/${mode}/index.js`,'utf8');
    assert.match(patchMindMapDeletion(source), /selectedElementIds:\(function expandMindMapDeletion/);
  }
  assert.throws(()=>patchMindMapDeletion('changed upstream'),/删除适配器/);
});
