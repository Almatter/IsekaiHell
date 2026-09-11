(function(){
'use strict';
const AC=window.AudioContext||window.webkitAudioContext;
let ctx=null, master=null, delay=null, feedback=null, wet=null, dry=null, scheduler=null, nextBar=0, barIndex=0, playing=false, current='wayfarer';
const liveNodes=new Set();
const N=n=>440*Math.pow(2,(n-69)/12);
const PRESETS={
  wayfarer:{name:"Wayfarer's Dawn",bpm:88,root:50,progression:[[0,4,7],[5,9,12],[-2,2,5],[0,4,7]],arp:[0,7,12,4,7,12,16,12],melody:[12,14,16,19,16,14,12,9],pad:'triangle',lead:'sine',pluck:'triangle',bass:'sine',sparkle:true},
  starlit:{name:'Starlit Road',bpm:96,root:45,progression:[[0,3,7],[8,12,15],[5,8,12],[10,14,17]],arp:[0,7,10,15,10,7,3,7],melody:[15,17,19,22,19,17,15,12],pad:'sine',lead:'triangle',pluck:'sine',bass:'triangle',sparkle:true},
  horizon:{name:'First Horizon',bpm:82,root:48,progression:[[0,4,7],[7,11,14],[9,12,16],[5,9,12]],arp:[0,4,7,12,7,4,9,12],melody:[7,9,12,14,16,14,12,9],pad:'triangle',lead:'sine',pluck:'triangle',bass:'sine',sparkle:true},
  tutorial:{name:'First Steps',bpm:100,root:50,progression:[[0,4,7],[5,9,12],[7,11,14],[9,12,16]],arp:[0,7,12,16,12,7,4,12],melody:[12,14,16,19,21,19,16,14],pad:'triangle',lead:'triangle',pluck:'sine',bass:'triangle',sparkle:true,drum:true},
  world:{name:'Between Worlds',bpm:76,root:47,progression:[[0,3,7],[5,8,12],[7,10,14],[3,7,10]],arp:[0,7,12,15,12,7,10,15],melody:[12,15,17,19,17,15,12,10],pad:'sine',lead:'triangle',pluck:'triangle',bass:'sine',sparkle:true},
  ryke:{name:'Ryke — Crossroads',bpm:104,root:50,progression:[[0,4,7],[5,9,12],[9,12,16],[7,11,14]],arp:[0,7,12,16,12,7,9,12],melody:[12,14,16,19,21,19,16,14],pad:'triangle',lead:'sine',pluck:'square',bass:'triangle',sparkle:true,drum:true},
  east:{name:'East Empire — Brass Standard',bpm:96,root:45,progression:[[0,4,7],[8,12,15],[5,9,12],[7,11,14]],arp:[0,12,7,16,12,7,4,12],melody:[12,16,19,17,16,14,12,11],pad:'sawtooth',lead:'triangle',pluck:'triangle',bass:'sine',drum:true},
  republic:{name:'Republic — Wild Lanterns',bpm:112,root:43,progression:[[0,3,7],[5,8,12],[7,10,14],[10,14,17]],arp:[0,7,10,15,10,7,3,10],melody:[12,15,17,19,22,19,17,15],pad:'triangle',lead:'sine',pluck:'triangle',bass:'triangle',drum:true},
  fae:{name:'Fae See — Living Canopy',bpm:84,root:52,progression:[[0,4,7],[2,5,9],[5,9,12],[7,11,14]],arp:[0,7,12,16,14,12,9,7],melody:[16,19,21,23,21,19,16,14],pad:'sine',lead:'sine',pluck:'triangle',bass:'sine',sparkle:true},
  west:{name:'West Empire — Silk & Storm',bpm:98,root:47,progression:[[0,3,7],[8,12,15],[10,14,17],[5,8,12]],arp:[0,7,12,15,12,10,7,3],melody:[12,15,17,20,19,17,15,12],pad:'triangle',lead:'triangle',pluck:'sine',bass:'triangle',drum:true},
  lake:{name:'Continental Lake — Mirrorwake',bpm:72,root:50,progression:[[0,4,7],[2,5,9],[9,12,16],[5,9,12]],arp:[0,7,12,14,12,9,7,4],melody:[12,14,16,19,18,16,14,11],pad:'sine',lead:'sine',pluck:'sine',bass:'sine',sparkle:true},
  duchy:{name:'Grand Duchy — Aetherglass',bpm:92,root:48,progression:[[0,4,8],[5,9,12],[8,12,16],[3,7,10]],arp:[0,8,12,16,12,8,4,12],melody:[12,16,20,19,16,15,12,8],pad:'triangle',lead:'sine',pluck:'triangle',bass:'sine',sparkle:true},
  kingdom:{name:'Kingdom — Hearthroad',bpm:90,root:50,progression:[[0,4,7],[5,9,12],[7,11,14],[0,4,7]],arp:[0,4,7,12,7,4,5,9],melody:[12,14,16,19,16,14,12,11],pad:'triangle',lead:'triangle',pluck:'triangle',bass:'sine',drum:true},
  sky:{name:'Sky Nation — Open Blue',bpm:108,root:52,progression:[[0,4,7],[7,11,14],[5,9,12],[9,12,16]],arp:[0,7,12,16,19,16,12,7],melody:[16,19,21,23,24,23,21,19],pad:'sine',lead:'sine',pluck:'triangle',bass:'sine',sparkle:true},
  widersia:{name:'Widersia — Clockwork Promenade',bpm:118,root:45,progression:[[0,3,7],[5,8,12],[3,7,10],[7,10,14]],arp:[0,7,12,15,12,7,10,14],melody:[12,15,17,19,17,15,14,12],pad:'triangle',lead:'square',pluck:'square',bass:'triangle',drum:true}
};
const GROUPS={shared:['wayfarer','starlit','horizon'],world:['world','horizon','starlit'],tutorial:['tutorial','horizon','starlit']};
function ensure(){if(!AC)return null;try{if(!ctx)ctx=new AC();if(ctx.state==='suspended')ctx.resume();return ctx}catch(_){return null}}
function connectMaster(){const c=ensure();if(!c)return false;const now=c.currentTime;master=c.createGain();master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(.17,now+.9);dry=c.createGain();wet=c.createGain();delay=c.createDelay(1.5);feedback=c.createGain();dry.gain.value=.82;wet.gain.value=.24;delay.delayTime.value=.34;feedback.gain.value=.22;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=5200;master.connect(dry);dry.connect(lp);master.connect(delay);delay.connect(wet);wet.connect(lp);delay.connect(feedback);feedback.connect(delay);lp.connect(c.destination);return true}
function note(midi,t,dur,vol,type='sine',attack=.02,release=.2,pan=0,detune=0){if(!ctx||!master)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=N(midi);o.detune.value=detune;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+attack);g.gain.setValueAtTime(Math.max(.0002,vol*.82),Math.max(t+attack,t+dur-release));g.gain.exponentialRampToValueAtTime(.0001,t+dur);let tail=g;if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;g.connect(p);tail=p}o.connect(g);tail.connect(master);liveNodes.add(o);o.onended=()=>liveNodes.delete(o);o.start(t);o.stop(t+dur+.05)}
function noise(t,dur,vol,pan=0){if(!ctx||!master)return;const len=Math.max(1,Math.floor(ctx.sampleRate*dur)),buf=ctx.createBuffer(1,len,ctx.sampleRate),a=buf.getChannelData(0);for(let i=0;i<len;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=buf;f.type='highpass';f.frequency.value=1600;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);let tail=g;if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;g.connect(p);tail=p}tail.connect(master);liveNodes.add(s);s.onended=()=>liveNodes.delete(s);s.start(t);s.stop(t+dur)}
function scheduleBar(t,index){const p=PRESETS[current]||PRESETS.wayfarer,beat=60/p.bpm,bar=beat*4,ch=p.progression[index%p.progression.length];
  ch.forEach((iv,i)=>note(p.root+iv,t,bar*.98,[.045,.032,.026][i]||.02,p.pad,.22,.8,(i-1)*.28,(i-1)*3));
  note(p.root-12+ch[0],t,beat*1.7,.055,p.bass,.03,.35,-.08);note(p.root-12+ch[0],t+beat*2,beat*1.35,.038,p.bass,.03,.3,.08);
  for(let i=0;i<8;i++){const iv=p.arp[(i+index)%p.arp.length],pan=(i%2?1:-1)*.32;note(p.root+12+iv,t+i*beat/2,beat*.42,.022,p.pluck,.008,.12,pan)}
  const m=p.melody[(index*2)%p.melody.length],m2=p.melody[(index*2+1)%p.melody.length];note(p.root+12+m,t+beat*.5,beat*1.15,.028,p.lead,.04,.3,.18);note(p.root+12+m2,t+beat*2.35,beat*.95,.024,p.lead,.04,.25,-.18);
  if(p.sparkle){note(p.root+36+[0,4,7,9,12][index%5],t+beat*3.15,beat*.55,.012,'sine',.01,.25,.5);}
  if(p.drum){noise(t,beat*.11,.012,-.25);noise(t+beat*2,beat*.11,.01,.25);noise(t+beat*1.5,beat*.07,.006,.45);noise(t+beat*3.5,beat*.07,.006,-.45)}
}
function tick(){if(!playing||!ctx)return;const p=PRESETS[current]||PRESETS.wayfarer,barDur=60/p.bpm*4;while(nextBar<ctx.currentTime+1.2){scheduleBar(nextBar,barIndex++);nextBar+=barDur}}
function start(preset){if(preset&&PRESETS[preset])current=preset;if(playing){setPreset(current);return current}if(!connectMaster())return null;playing=true;barIndex=0;nextBar=ctx.currentTime+.08;tick();scheduler=setInterval(tick,180);return current}
function stop(){playing=false;if(scheduler){clearInterval(scheduler);scheduler=null}const m=master,c=ctx;master=null;delay=feedback=wet=dry=null;if(m&&c){const now=c.currentTime;try{m.gain.cancelScheduledValues(now);m.gain.setValueAtTime(Math.max(.0001,m.gain.value||.05),now);m.gain.exponentialRampToValueAtTime(.0001,now+.45)}catch(_){}setTimeout(()=>{liveNodes.forEach(n=>{try{n.stop()}catch(_){}});liveNodes.clear();try{m.disconnect()}catch(_){}},520)}}
function setPreset(id){if(!PRESETS[id])return current;const was=playing;if(was)stop();current=id;if(was)setTimeout(()=>start(current),100);return current}
function cycle(group='shared'){const list=GROUPS[group]||GROUPS.shared;let i=list.indexOf(current);return setPreset(list[(i+1+list.length)%list.length])}
function get(){return {id:current,name:(PRESETS[current]||PRESETS.wayfarer).name,playing}}
function name(id){return (PRESETS[id]||{}).name||id}
window.IHMusic={start,stop,setPreset,cycle,get,name,presets:PRESETS,groups:GROUPS};
})();
