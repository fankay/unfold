import { cpSync } from 'node:fs';
import { copyChineseFonts } from './chinese-fonts.mjs';
cpSync('node_modules/@excalidraw/excalidraw/dist/prod/fonts', 'public/fonts', { recursive: true });
copyChineseFonts('public/fonts');
