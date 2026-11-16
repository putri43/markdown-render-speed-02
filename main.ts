// Driver for the markdown-render-speed-02 entry: a fast from-scratch
// CommonMark/GFM renderer (see parse.js). It reads every case from
// /input/cases.json — or $MAKEFUN_INPUT_DIR outside a container — renders
// each case alone with parse(), and writes /output/html.json (or
// $MAKEFUN_OUTPUT_DIR): a JSON array of the HTML strings, one per case, in
// the cases' order. Run with node (the harness runs `node /bot/main.ts`).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from './parse.js';

const inputDir = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const cases = JSON.parse(readFileSync(join(inputDir, 'cases.json'), 'utf8')) as {
  id: string;
  markdown: string;
}[];

const html = new Array<string>(cases.length);
for (let k = 0; k < cases.length; k++) html[k] = parse(cases[k].markdown);

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'html.json'), JSON.stringify(html));
