export async function decodeQuestionData(buffer){
 const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);
 if(bytes[0]===0x1f&&bytes[1]===0x8b){
  if(typeof DecompressionStream==='undefined')throw Error('请使用新版浏览器载入完整题库。');
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).json();
 }
 return JSON.parse(new TextDecoder().decode(bytes));
}
