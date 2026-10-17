import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {decodeQuestionData} from '../src/data-codec.js';
const source=[{id:'真题',stem:'增长率与比重：12.5% ≈ 1/8',material:'![图表](/question-images/题目图/a.webp)',options:['甲','乙','丙','丁'],answer:1,analysis:{推理链:'保留原始解析。'}},{answer:null,usable:false}];
test('compressed question transport restores Chinese text, figures, explanations and null answers exactly',async()=>{assert.deepEqual(await decodeQuestionData(gzipSync(Buffer.from(JSON.stringify(source)))),source);});
test('question transport also accepts a body already decompressed by the web host',async()=>{assert.deepEqual(await decodeQuestionData(new TextEncoder().encode(JSON.stringify(source))),source);});
test('a damaged compressed response is rejected instead of loading partial questions',async()=>{const packed=gzipSync(Buffer.from(JSON.stringify(source)));await assert.rejects(decodeQuestionData(packed.subarray(0,packed.length-8)));});
