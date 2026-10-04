import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chineseFonts } from '../scripts/chinese-fonts.mjs';
import { registryModule } from '../scripts/excalidraw-font-plugin.mjs';

test('Chinese fonts keep stable scene IDs, real metrics and self-hosted unicode subsets', () => {
  const fonts = chineseFonts();
  assert.deepEqual(fonts.map(font=>[font.id,font.name]),[[10,'思源黑体'],[11,'思源宋体'],[12,'马善政楷体'],[13,'站酷快乐体']]);
  for (const font of fonts) {
    assert.ok(font.metrics.ascender > 0 && font.metrics.descender < 0);
    assert.ok(font.metrics.lineHeight * font.metrics.unitsPerEm >= font.metrics.ascender - font.metrics.descender);
    assert.ok(font.faces.some(face=>face.descriptors.unicodeRange.includes('4e00')));
    for (const face of font.faces) {
      assert.ok(face.uri.startsWith(`fonts/chinese/${font.package}/`));
      assert.ok(existsSync(`${font.directory}/files/${face.uri.split('/').at(-1)}`));
    }
    assert.ok(existsSync(`${font.directory}/LICENSE`));
  }
});

test('both development and production use the pinned native font registry', () => {
  const dev=registryModule(false), prod=registryModule(true);
  assert.ok(dev.path.includes('/dist/dev/'));
  assert.equal(dev.exported,'Fonts');
  assert.ok(prod.path.includes('/dist/prod/'));
  assert.ok(prod.exported);
});
