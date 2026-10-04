import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';

// Stable IDs are part of saved scenes. Never reuse an ID for a different font.
const families = [
  { id: 10, name: '思源黑体', package: 'noto-sans-sc' },
  { id: 11, name: '思源宋体', package: 'noto-serif-sc' },
  { id: 12, name: '马善政楷体', package: 'ma-shan-zheng' },
  { id: 13, name: '站酷快乐体', package: 'zcool-kuaile' },
];

function readMetrics(path) {
  const buffer = readFileSync(path);
  if (buffer.toString('ascii', 0, 4) !== 'wOFF') throw new Error(`字体不是 WOFF：${path}`);
  const tables = new Map();
  for (let index = 0; index < buffer.readUInt16BE(12); index++) {
    const entry = 44 + index * 20;
    const tag = buffer.toString('ascii', entry, entry + 4);
    const offset = buffer.readUInt32BE(entry + 4);
    const length = buffer.readUInt32BE(entry + 8);
    const originalLength = buffer.readUInt32BE(entry + 12);
    const content = buffer.subarray(offset, offset + length);
    tables.set(tag, length === originalLength ? content : inflateSync(content));
  }
  const unitsPerEm = tables.get('head').readUInt16BE(18);
  const hhea = tables.get('hhea');
  const ascender = hhea.readInt16BE(4);
  const descender = hhea.readInt16BE(6);
  const lineHeight = Math.max(1.25, (ascender - descender + hhea.readInt16BE(8)) / unitsPerEm);
  return { unitsPerEm, ascender, descender, lineHeight };
}

export function chineseFonts() {
  return families.map(family => {
    const directory = resolve(`node_modules/@fontsource/${family.package}`);
    const css = readFileSync(`${directory}/400.css`, 'utf8');
    const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(([, body]) => {
      const filename = body.match(/url\(\.\/files\/([^)]*\.woff2)\)/)?.[1];
      const unicodeRange = body.match(/unicode-range:\s*([^;]+);/)?.[1];
      if (!filename || !unicodeRange) throw new Error(`字体分片格式不正确：${family.package}`);
      return { uri: `fonts/chinese/${family.package}/${filename}`, descriptors: { unicodeRange } };
    });
    if (!faces.length) throw new Error(`字体没有分片：${family.package}`);
    const metrics = readMetrics(`${directory}/files/${faces[0].uri.split('/').at(-1).replace('.woff2', '.woff')}`);
    return { ...family, directory, faces, metrics };
  });
}

export function copyChineseFonts(destination) {
  for (const font of chineseFonts()) {
    const target = `${destination}/chinese/${font.package}`;
    mkdirSync(target, { recursive: true });
    for (const face of font.faces) {
      const filename = face.uri.split('/').at(-1);
      copyFileSync(`${font.directory}/files/${filename}`, `${target}/${filename}`);
    }
    copyFileSync(`${font.directory}/LICENSE`, `${target}/LICENSE.txt`);
  }
}
