import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=JSON.parse(fs.readFileSync(path.join(root,'public/data/questions.json'),'utf8'));
const questions=Array.isArray(index)?index:index.files.flatMap(file=>JSON.parse(fs.readFileSync(path.join(root,'public',file),'utf8')));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/data/manifest.json'),'utf8'));
test('the complete fixed source version contains every one of the 11,282 question notes',()=>{
 assert.equal(questions.length,11282);
 assert.equal(new Set(questions.map(q=>q.sourcePath)).size,11282);
 assert.equal(new Set(questions.map(q=>q.id)).size,11282);
 assert.ok(questions.filter(q=>q.module==='判断推理').length===7713);
 assert.ok(questions.filter(q=>q.module==='资料分析').length===3569);
 const commit=manifest.sourceCommit||manifest.commit;
 assert.match(commit,/^[a-f0-9]{40}$/);
 for(const q of questions){assert.ok(q.stem,`missing stem: ${q.id}`);assert.ok(Array.isArray(q.options));assert.ok(q.sourceUrl.includes(commit));assert.ok(q.sourceUrl.startsWith('https://github.com/Mentat-Uran/kaogongzhentizhengliu/blob/'));assert.ok(q.sourcePath.startsWith('10-真题/'));}
});
test('only questions with a definite answer, four complete options and no quality warning can enter scored battles',()=>{
 let scored=0,review=0;
 for(const q of questions){if(q.usable){scored++;assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,`invalid answer ${q.id}`);assert.equal(q.options.length,4);assert.ok(q.options.every(x=>typeof x==='string'&&x.trim().length));assert.ok(q.explanation||Object.values(q.analysis||{}).some(Boolean));assert.equal(q.qualityFlags?.length||0,0);}else{review++;assert.ok(q.qualityFlags?.length,`review without reason ${q.id}`);}}
 assert.ok(scored>0);assert.ok(review>0);for(const module of ['判断推理','资料分析'])assert.ok(questions.some(q=>q.module===module&&q.usable),`no scored questions in ${module}`);assert.equal(scored+review,11282);
});
test('every referenced question, material and explanation image is available locally',()=>{
 const seen=new Set();
 for(const q of questions){const text=[q.stem,q.material,q.explanation,...q.options,...Object.values(q.analysis||{})].join('\n');
  for(const m of text.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)){const src=m[1].replace(/^<|>$/g,'');assert.ok(src.startsWith('/question-images/'),`nonlocal image ${q.id}: ${src}`);const local=path.join(root,'public',decodeURI(src));assert.ok(fs.existsSync(local),`missing image ${q.id}: ${src}`);assert.ok(fs.statSync(local).size>0);seen.add(src);}}
 assert.ok(seen.size>4000,'full archive should include original figures and formulas');
});

test('question data shards stay within the static hosting file limit',()=>{if(!Array.isArray(index))for(const file of index.files)assert.ok(fs.statSync(path.join(root,'public',file)).size<25*1024*1024);});
