import { cpSync } from 'node:fs';
import { copyChineseFonts } from './chinese-fonts.mjs';
cpSync('node_modules/@excalidraw/excalidraw/dist/prod/fonts', 'dist/fonts', { recursive: true });
copyChineseFonts('dist/fonts');
