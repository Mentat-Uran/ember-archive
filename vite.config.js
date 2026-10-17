import {defineConfig} from 'vite';
import fs from 'node:fs';
import path from 'node:path';
let outputRoot;
export default defineConfig({
 plugins:[{
  name:'ship-optimized-art',
  configResolved(config){outputRoot=path.resolve(config.root,config.build.outDir);},
  closeBundle(){
   const artRoot=path.resolve(outputRoot,'art');
   if(!artRoot.startsWith(outputRoot+path.sep)||!fs.existsSync(artRoot))return;
   const visit=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())visit(file);else if(entry.name.endsWith('.png')&&fs.existsSync(file.replace(/\.png$/,'.webp')))fs.unlinkSync(file);}};
   visit(artRoot);
  }
 }]
});
