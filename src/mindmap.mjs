// Tree data lives on ordinary canvas elements; there is no separate document store.
export function parseOutline(outline, id = () => crypto.randomUUID()) {
  const rows = outline.split(/\r?\n/).filter(row => row.trim());
  if (!rows.length) throw new Error('请先输入中心主题');
  if (rows.length > 100) throw new Error('一次最多创建 100 个主题');
  const nodes = [];
  const stack = [];
  for (const [index, row] of rows.entries()) {
    const indentation = row.match(/^[\t ]*/)[0].replace(/\t/g, '  ').length;
    if (indentation % 2) throw new Error(`第 ${index + 1} 行请使用两个空格或 Tab 缩进`);
    const depth = indentation / 2;
    const text = row.trim().replace(/^[-*]\s+/, '');
    if (!text || text.length > 200) throw new Error(`第 ${index + 1} 行主题需为 1–200 个字符`);
    if (index === 0 && depth !== 0) throw new Error('中心主题不需要缩进');
    if (index > 0 && (depth === 0 || !stack[depth - 1])) throw new Error(`第 ${index + 1} 行需缩进到一个上级主题下`);
    if (depth > 8) throw new Error('最多支持 8 层分支');
    const node = { id: id(), parentId: depth ? stack[depth - 1].id : null, text };
    nodes.push(node);
    stack[depth] = node;
    stack.length = depth + 1;
  }
  return nodes;
}

// Columns account for the widest node at each depth. Subtree heights prevent overlap.
export function layoutTree(nodes, origin = { x: 0, y: 0 }) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const children = new Map(nodes.map(node => [node.id, []]));
  const roots = [];
  for (const node of nodes) {
    if (byId.has(node.parentId)) children.get(node.parentId).push(node);
    else roots.push(node);
  }
  const sizes = new Map();
  const columns = [];
  const visiting = new Set();
  function measure(node, depth) {
    if (visiting.has(node.id)) throw new Error('主题层级包含循环，无法整理布局');
    visiting.add(node.id);
    columns[depth] = Math.max(columns[depth] || 0, node.width);
    const nested = children.get(node.id);
    const height = Math.max(node.height, nested.reduce((sum, child) => sum + measure(child, depth + 1), 0) + Math.max(0, nested.length - 1) * 28);
    sizes.set(node.id, height);
    visiting.delete(node.id);
    return height;
  }
  const total = roots.reduce((sum, node) => sum + measure(node, 0), 0) + Math.max(0, roots.length - 1) * 28;
  if (sizes.size !== nodes.length) throw new Error('主题层级包含循环，无法整理布局');
  const xs = [origin.x];
  for (let i = 1; i < columns.length; i++) xs[i] = xs[i - 1] + columns[i - 1] + 96;
  const positions = new Map();
  function place(node, depth, top) {
    const height = sizes.get(node.id);
    positions.set(node.id, { x: xs[depth], y: top + (height - node.height) / 2 });
    const nested = children.get(node.id);
    const used = nested.reduce((sum, child) => sum + sizes.get(child.id), 0) + Math.max(0, nested.length - 1) * 28;
    let childTop = top + (height - used) / 2;
    for (const child of nested) { place(child, depth + 1, childTop); childTop += sizes.get(child.id) + 28; }
  }
  let top = origin.y + (roots[0]?.height || 0) / 2 - total / 2;
  for (const node of roots) { place(node, 0, top); top += sizes.get(node.id) + 28; }
  return positions;
}
