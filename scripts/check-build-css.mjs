import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const files = (await readdir('dist/assets')).filter((name) => name.endsWith('.css'));
if (!files.length) throw new Error('no CSS asset found in dist/assets');
const css = (await Promise.all(files.map((name) => readFile(join('dist/assets', name), 'utf8')))).join('\n');
if (css.includes('@layer components;')) throw new Error('empty components layer remains in build output');
console.log(`checked ${files.length} CSS asset(s): no empty components layer`);
