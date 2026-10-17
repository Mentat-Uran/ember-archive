import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {CARDS,RELICS,ENEMIES} from '../src/content.js';
const root=new URL('../public/art/',import.meta.url);
test('all 59 codex entries have distinct independently generated PNG covers',()=>{
 const hashes=new Set();let count=0;
 for(const [kind,entries] of [['cards',CARDS],['relics',RELICS],['enemies',ENEMIES]]){
  for(const entry of entries){const file=new URL(`${kind}/${entry.id}.png`,root);assert.ok(fs.existsSync(file),`Missing ${kind}/${entry.id}.png`);const bytes=fs.readFileSync(file);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.ok(bytes.readUInt32BE(16)>=512&&bytes.readUInt32BE(20)>=512);const hash=crypto.createHash('sha256').update(bytes).digest('hex');assert.ok(!hashes.has(hash),`Reused cover for ${entry.name}`);hashes.add(hash);const webp=fs.readFileSync(new URL(`${kind}/${entry.id}.webp`,root));assert.equal(webp.subarray(0,4).toString(),'RIFF');assert.equal(webp.subarray(8,12).toString(),'WEBP');count++;}
 }
 assert.equal(count,59);
});
