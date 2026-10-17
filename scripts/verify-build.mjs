import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=path.join(root,'dist');
const files=JSON.parse(fs.readFileSync(path.join(root,'public/data/questions.json'),'utf8')).files;
const entries=JSON.parse(fs.readFileSync(path.join(root,'assets/question-images/manifest.json'),'utf8'));
const reverse=new Map(entries.map(e=>['/question-images/'+e.webp,'/question-images/'+e.source]));
let questions=0;const images=new Set();
for(const file of files){
 const source=JSON.parse(fs.readFileSync(path.join(root,'public',file),'utf8'));
 const published=gunzipSync(fs.readFileSync(path.join(dist,file+'.gz'))).toString('utf8');
 const restored=JSON.parse(published.replace(/\/question-images\/[^)\s"\\]+?\.webp/g,url=>reverse.get(url)||url));
 assert.deepEqual(restored,source,`Question content changed: ${file}`);questions+=source.length;
 for(const m of published.matchAll(/\/question-images\/[^)\s"\\]+?\.(?:png|webp|jpe?g|gif)/g)){assert.ok(fs.existsSync(path.join(dist,m[0])),`Missing published figure: ${m[0]}`);images.add(m[0]);}
}
let bytes=0,count=0;const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else{const size=fs.statSync(file).size;assert.ok(size<25*1048576,`Oversized file: ${file}`);bytes+=size;count++;}}};walk(dist);
assert.equal(questions,11282);assert.ok(bytes<170*1048576,'Distribution must leave generous room beneath the normalized archive limit');
const manifest=JSON.parse(fs.readFileSync(path.join(dist,'data/manifest.json'),'utf8'));assert.deepEqual(manifest.questionFiles,files.map(file=>file+'.gz'));
console.log(JSON.stringify({questions,localImageReferences:images.size,files:count,expandedMiB:Number((bytes/1048576).toFixed(2)),questionContentRoundtrip:'exact',losslessImages:entries.length},null,2));
