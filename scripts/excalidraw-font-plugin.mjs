import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chineseFonts } from './chinese-fonts.mjs';

// Excalidraw 0.18.1 does not publicly export its font registry. This small,
// version-checked adapter uses the existing registry so the native picker,
// text measurements, bound text, undo and SVG embedding all use the same fonts.
export function registryModule(production) {
  const root = resolve('node_modules/@excalidraw/excalidraw');
  const pkg = JSON.parse(readFileSync(`${root}/package.json`, 'utf8'));
  if (pkg.version !== '0.18.1') throw new Error('请先验证新版本的 Excalidraw 字体适配器');
  const directory = `${root}/dist/${production ? 'prod' : 'dev'}`;
  for (const name of readdirSync(directory).filter(name => /^chunk-.*\.js$/.test(name))) {
    const source = readFileSync(`${directory}/${name}`, 'utf8');
    if (!source.includes('static get registered()') || !source.includes('loadedFontsCache')) continue;
    let exported = 'Fonts';
    if (production) {
      // The production chunk aliases the registry after its static methods.
      const local = source.match(/var (\w+)=(\w+),\w+=\(\w+,\w+,\w+\)=>\{let\{unitsPerEm:/)?.[1];
      exported = local && source.match(new RegExp(`\\b${local} as (\\w+)`))?.[1];
    }
    if (!exported || !source.includes(production ? ` as ${exported}` : '  Fonts,')) throw new Error('Excalidraw 字体注册导出未找到');
    return { path: `${directory}/${name}`, exported };
  }
  throw new Error('Excalidraw 字体注册模块未找到');
}

export function chineseFontPlugin() {
  const id = 'virtual:unfold-fonts';
  let production = false;
  return {
    name: 'unfold-chinese-fonts',
    config(_, environment) {
      return { resolve: { alias: { 'unfold-excalidraw-core': registryModule(environment.command === 'build').path } } };
    },
    configResolved(config) { production = config.command === 'build'; },
    resolveId(source) { if (source === id) return `\0${id}`; },
    load(source) {
      if (source !== `\0${id}`) return;
      const registry = registryModule(production);
      const fonts = chineseFonts().map(({ id, name, faces, metrics }) => ({ id, name, faces, metrics }));
      return `import { FONT_FAMILY } from '@excalidraw/excalidraw';
import { ${registry.exported} as Fonts } from 'unfold-excalidraw-core';
export function registerChineseFonts() {
  for (const font of ${JSON.stringify(fonts)}) {
    FONT_FAMILY[font.name] = font.id;
    Fonts.register(font.name, { metrics: font.metrics }, ...font.faces);
  }
}`;
    },
  };
}
