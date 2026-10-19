import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {gzipSync} from 'node:zlib';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const beneath=(root,relative)=>{const file=path.resolve(root,relative);if(!file.startsWith(path.resolve(root)+path.sep))throw Error('Asset path outside expected directory');return file;};
export function prepareDistribution(projectRoot,outputRoot){
 const originalRoot=path.join(projectRoot,'public/question-images'),cacheRoot=path.join(projectRoot,'assets/question-images'),destinationRoot=path.join(outputRoot,'question-images');
 const entries=JSON.parse(fs.readFileSync(path.join(cacheRoot,'manifest.json'),'utf8'));
 const dataRoot=path.join(outputRoot,'data'),manifestFile=path.join(dataRoot,'manifest.json'),indexFile=path.join(dataRoot,'questions.json');
 const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8')),index=JSON.parse(fs.readFileSync(indexFile,'utf8'));
 if(!Array.isArray(manifest.questionFiles)||!Array.isArray(index.files)||manifest.answerReviewFile!=='/data/answer-reviews.json'||!Number.isSafeInteger(manifest.counts?.reviewed)||manifest.counts.reviewed<0||!/^[0-9a-f]{64}$/.test(manifest.answerReviewSha256||''))throw Error('Invalid answer-review manifest; refusing to create distribution output');
 const reviewFile=path.join(dataRoot,'answer-reviews.json');
 if(!fs.existsSync(reviewFile))throw Error('Missing answer-review ledger in distribution output');
 const originalReviewBytes=fs.readFileSync(reviewFile);
 if(hash(originalReviewBytes)!==manifest.answerReviewSha256)throw Error('Answer-review ledger does not match its import manifest; refusing to create distribution output');
 const replacements=new Map();let savings=0;
 for(const entry of entries){
  const original=fs.readFileSync(beneath(originalRoot,entry.source)),encoded=fs.readFileSync(beneath(cacheRoot,entry.webp));
  if(!entry.pixelsVerified||hash(original)!==entry.sourceSha256||hash(encoded)!==entry.webpSha256)throw Error(`Lossless cache verification failed: ${entry.source}`);
  const destination=beneath(destinationRoot,entry.webp);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,encoded);
  fs.unlinkSync(beneath(destinationRoot,entry.source));
  replacements.set('/question-images/'+entry.source,'/question-images/'+entry.webp);savings+=original.length-encoded.length;
 }
 const rewriteImageUrls=(original,label)=>{
  const updated=original.replace(/\/question-images\/[^)\s"\\]+?\.png/g,url=>replacements.get(url)||url);
  for(const sourceUrl of replacements.keys())if(updated.includes(sourceUrl))throw Error(`Unrewritten deleted image in ${label}: ${sourceUrl}`);
  return updated;
 };
 for(const file of fs.readdirSync(dataRoot).filter(f=>/^questions-\d+\.json$/.test(f))){
  const target=path.join(dataRoot,file),original=fs.readFileSync(target,'utf8');
  const updated=rewriteImageUrls(original,file);
  fs.writeFileSync(target+'.gz',gzipSync(Buffer.from(updated),{level:9}));fs.unlinkSync(target);
 }
 const rewrittenReviews=Buffer.from(rewriteImageUrls(originalReviewBytes.toString('utf8'),'answer-reviews.json'));
 fs.writeFileSync(reviewFile,rewrittenReviews);
 const answerReviewSha256=hash(rewrittenReviews);
 manifest.questionFiles=manifest.questionFiles.map(file=>file+'.gz');index.files=index.files.map(file=>file+'.gz');
 manifest.answerReviewSha256=answerReviewSha256;
 fs.writeFileSync(manifestFile,JSON.stringify(manifest));fs.writeFileSync(indexFile,JSON.stringify(index));
 console.log(`Lossless question image distribution: ${entries.length} images, ${(savings/1048576).toFixed(2)} MiB saved.`);
}
