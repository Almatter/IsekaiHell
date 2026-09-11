(function($){
'use strict';
let ctx=null,lastHover=0;
const prefs={sound:false,ambient:false,track:'wayfarer',group:'shared',locked:false};
function ensure(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{if(!ctx)ctx=new AC();if(ctx.state==='suspended')ctx.resume();return ctx}catch(_){return null}}
function tone(freq,dur,vol,start=0,type='sine'){if(!prefs.sound)return;const c=ensure();if(!c)return;const t=c.currentTime+start,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+dur+.02)}
function sound(kind){if(kind==='hover'){tone(740,.018,.005);tone(925,.018,.003,.012)}else if(kind==='select'){tone(520,.025,.009,0,'square')}else if(kind==='transition'){tone(430,.04,.01,0,'triangle');tone(570,.05,.008,.03,'triangle')}else if(kind==='confirm'){tone(660,.055,.02);tone(990,.075,.014,.045)}else tone(610,.022,.007,0,'square')}
function render(){const name=window.IHMusic?.name(prefs.track)||prefs.track;$('#btnSiteSound').attr('aria-pressed',String(prefs.sound)).text(`FX: ${prefs.sound?'On':'Off'}`);$('#btnSiteAmbient').attr('aria-pressed',String(prefs.ambient)).text(`Music: ${prefs.ambient?'On':'Off'}`);$('#btnSiteTrack').text(`Track: ${name}`)}
function setTrack(id,{lock=false}={}){if(!window.IHMusic?.presets?.[id])return;prefs.track=id;prefs.locked=lock;if(prefs.ambient)window.IHMusic.setPreset(id);render()}
function setContext(id){setTrack(id,{lock:true})}
function setGroup(group='shared',preferred){prefs.group=group;prefs.locked=false;if(preferred)setTrack(preferred);else render()}
function cycleTrack(){const list=window.IHMusic?.groups?.[prefs.group]||window.IHMusic?.groups?.shared||['wayfarer'];let i=list.indexOf(prefs.track);prefs.track=list[(i+1+list.length)%list.length];prefs.locked=false;if(prefs.ambient)window.IHMusic?.setPreset(prefs.track);render();sound('transition')}
function enableAmbient(track,group){if(group)prefs.group=group;if(track&&window.IHMusic?.presets?.[track])prefs.track=track;if(!prefs.ambient){prefs.ambient=true;window.IHMusic?.start(prefs.track);render();}else if(track){window.IHMusic?.setPreset(prefs.track);render();}}
$(function(){
  render();
  $('#btnSiteSound').on('click',()=>{prefs.sound=!prefs.sound;render();if(prefs.sound)sound('confirm')});
  $('#btnSiteAmbient').on('click',()=>{prefs.ambient=!prefs.ambient;if(prefs.ambient)window.IHMusic?.start(prefs.track);else window.IHMusic?.stop();render();if(prefs.ambient)sound('confirm')});
  $('#btnSiteTrack').on('click',cycleTrack);
  $(document).on('mouseenter focusin','.ui-btn,.site-link,.lore-nav-button,.country-card,.race-directory button,.race-tree-button,.race-tree-card,.gateway-card,.tutorial-choice,.tutorial-next,.tutorial-control,.codex-term,.rules-hud-toggle,summary',function(){const now=performance.now();if(now-lastHover>75){lastHover=now;sound('hover')}}).on('pointerdown','.ui-btn,.site-link,.lore-nav-button,.country-card,.race-directory button,.race-tree-button,.race-tree-card,.gateway-card,.tutorial-choice,.tutorial-next,.tutorial-control,.codex-term,.rules-hud-toggle,summary',()=>sound('click'));
  window.IHSiteSound={sound,setTrack,setContext,setGroup,enableAmbient,getPrefs:()=>({...prefs})};
});
})(jQuery);
