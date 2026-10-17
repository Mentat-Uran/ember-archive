const KEY='ember-archive-v1';
let database,writeQueue=Promise.resolve(),lastWrite=0;
function db(){if(database)return database;database=new Promise((resolve,reject)=>{const req=indexedDB.open('ember-archive',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('saves'))req.result.createObjectStore('saves');};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});return database;}
export async function loadSnapshot(fallback){try{const database=await db();const data=await new Promise((resolve,reject)=>{const req=database.transaction('saves').objectStore('saves').get('current');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});if(data?.version===1&&data.profile&&Array.isArray(data.profile.upgrades))return fallback?.updatedAt>data.updatedAt?{...data,...fallback}:data;return fallback;}catch{return fallback;}}
export async function saveSnapshot(data,{fullFallback=false}={}){
  const updatedAt=Math.max(Date.now(),lastWrite+1);lastWrite=updatedAt;
  const core=fullFallback?{...data,updatedAt}:{version:1,profile:data.profile,run:data.run,settings:data.settings,updatedAt};
  try{localStorage.setItem(KEY,JSON.stringify(core));}catch{}
  const write=async()=>{try{const database=await db();await new Promise((resolve,reject)=>{const tx=database.transaction('saves','readwrite');tx.objectStore('saves').put({...data,updatedAt},'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});return true;}catch{
    try{const existing=JSON.parse(localStorage.getItem(KEY)||'null');if(!existing||existing.updatedAt<=updatedAt)localStorage.setItem(KEY,JSON.stringify({...data,updatedAt}));return true;}catch{return false;}
  }};
  const pending=writeQueue.then(write,write);writeQueue=pending;return pending;
}
