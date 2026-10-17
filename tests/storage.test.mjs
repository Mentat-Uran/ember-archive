import test from 'node:test';
import assert from 'node:assert/strict';
const values=new Map(),rows=new Map();
globalThis.localStorage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)||null};
globalThis.indexedDB={open:()=>{const request={};setTimeout(()=>{request.result={transaction:()=>{const tx={objectStore:()=>({put:(value,key)=>{setTimeout(()=>{rows.set(key,structuredClone(value));tx.oncomplete?.();},5);},get:key=>{const req={};setTimeout(()=>{req.result=structuredClone(rows.get(key));req.onsuccess?.();});return req;}})};return tx;}};request.onsuccess();});return request;}};
const {saveSnapshot,loadSnapshot}=await import('../src/storage.js');
const snapshot=n=>({version:1,profile:{upgrades:[],fragments:n},run:null,settings:{sound:false,motion:true},learning:{q:{attempts:n}},studyLog:[{id:String(n)}]});
test('queued saves persist the newest progress, with newer core recovery retaining full learning records',async()=>{
 await Promise.all([saveSnapshot(snapshot(1)),saveSnapshot(snapshot(2)),saveSnapshot(snapshot(3))]);
 const latest=await loadSnapshot(null);assert.equal(latest.profile.fragments,3);assert.equal(latest.learning.q.attempts,3);
 const recovered=await loadSnapshot({version:1,profile:{upgrades:[],fragments:4},updatedAt:latest.updatedAt+1});assert.equal(recovered.profile.fragments,4);assert.equal(recovered.learning.q.attempts,3);
});
test('an explicit reset writes a complete empty recovery snapshot before its database write finishes',async()=>{
 const fresh={...snapshot(0),learning:{},studyLog:[]};const pending=saveSnapshot(fresh,{fullFallback:true});
 const immediate=JSON.parse(localStorage.getItem('ember-archive-v1'));assert.deepEqual(immediate.learning,{});assert.deepEqual(immediate.studyLog,[]);
 await pending;const latest=await loadSnapshot(immediate);assert.deepEqual(latest.learning,{});assert.deepEqual(latest.studyLog,[]);
});
