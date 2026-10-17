let ctx, master, timer, index=0, enabled=false;
const notes=[220,261.63,329.63,392,440,392,329.63,261.63,196,246.94,293.66,369.99,392,329.63,293.66,246.94];
export function tone(freq=440,duration=.15,kind='sine',volume=.08,delay=0){
  if(!enabled)return;
  try {ctx ||= new (window.AudioContext||window.webkitAudioContext)(); master ||= ctx.createGain(); master.gain.value=.45;master.connect(ctx.destination);const o=ctx.createOscillator(),g=ctx.createGain();o.type=kind;o.frequency.value=freq;o.connect(g);g.connect(master);const t=ctx.currentTime+delay;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.start(t);o.stop(t+duration+.02);}catch{}
}
export function setAudio(on){enabled=on;if(!on){clearInterval(timer);timer=null;return;}ctx ||= new (window.AudioContext||window.webkitAudioContext)();ctx.resume();if(!timer)timer=setInterval(()=>{tone(notes[index++%notes.length],2.5,'sine',.03);if(index%4===0)tone(notes[(index+4)%notes.length]/2,3,'triangle',.015)},900);}
export function sfx(type){if(type==='correct'){[523.25,659.25,783.99,1046.5].forEach((n,i)=>tone(n,.45,'sine',.10,i*.08));}else if(type==='wrong'){tone(185,.4,'triangle',.1);tone(146.83,.5,'triangle',.07,.12);}else if(type==='card'){tone(330,.12,'triangle',.07);tone(660,.3,'sine',.05,.05);}else if(type==='reward'){[392,523.25,659.25,783.99,1046.5].forEach((n,i)=>tone(n,.8,'sine',.08,i*.1));}else tone(660,.1,'sine',.04);}
