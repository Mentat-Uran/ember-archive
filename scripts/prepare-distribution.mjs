import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const beneath=(root,relative)=>{const file=path.resolve(root,relative);if(!file.startsWith(path.resolve(root)+path.sep))throw Error('Asset path outside expected directory');return file;};
export function prepareDistribution(projectRoot,outputRoot){
 const originalRoot=path.join(projectRoot,'public/question-images'),cacheRoot=path.join(projectRoot,'assets/question-images'),destinationRoot=path.join(outputRoot,'question-images');
 const entries=JSON.parse(fs.readFileSync(path.join(cacheRoot,'manifest.json'),'utf8'));
 const replacements=new Map();let savings=0;
 for(const entry of entries){
  const original=fs.readFileSync(beneath(originalRoot,entry.source)),encoded=fs.readFileSync(beneath(cacheRoot,entry.webp));
  if(!entry.pixelsVerified||hash(original)!==entry.sourceSha256||hash(encoded)!==entry.webpSha256)throw Error(`Lossless cache verification failed: ${entry.source}`);
  const destination=beneath(destinationRoot,entry.webp);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,encoded);
  fs.unlinkSync(beneath(destinationRoot,entry.source));
  replacements.set('/question-images/'+entry.source,'/question-images/'+entry.webp);savings+=original.length-encoded.length;
 }
 const dataRoot=path.join(outputRoot,'data');
 for(const file of fs.readdirSync(dataRoot).filter(f=>/^questions-\d+\.json$/.test(f))){
  const target=path.join(dataRoot,file),original=fs.readFileSync(target,'utf8');
  fs.writeFileSync(target,original.replace(/\/question-images\/[^)\s"\\]+?\.png/g,url=>replacements.get(url)||url));
 }
 console.log(`Lossless question image distribution: ${entries.length} images, ${(savings/1048576).toFixed(2)} MiB saved.`);
}
