(function($){
'use strict';
const M=window.IH_META, SKILLS=window.IH_SKILLS||[], TECHS=window.IH_TECHNIQUES||[], AFFS=window.IH_AFFINITIES||[], RACES=window.IH_RACES||[];
const GRADE_ORDER=['F','E','D','C','B','A','S'];
const STAT_ORDER=['H','G','F','E','D','C','B','A','S'];
const $modal=$('#modal');
let modalSaveHandler=null;
let audioCtx=null;
let ambientBus=null;
let ambientNodes=[];
let ambientTimers=[];
let lastHoverSound=0;
let portraitTimer=null;
let state=defaultState();

function defaultState(){return {
  schema:4, appVersion:M.version,
  identity:{name:'',player:'',raceTitle:'',imageUrl:'',height:'',weight:'',features:'',backstory:'',currentLife:''},
  origin:{type:'isekai',size:'medium',scoopPoints:0,evolutionPath:'variant',tree:'prime',parents:[],perk:'Chosen Path',chosenPathSkill:'',bornTargets:[],versatileItem:'melee',versatileStat:'Strength',raceId:'',raceOverrideReason:''},
  stats:{Strength:'F',Precision:'F',Intelligence:'F',Vitality:'F',Speed:'F'},
  skills:[], techniques:[], affinities:[], equipment:[], assets:[], abilities:[], titles:[], classes:[], customRows:[],
  followers:{buddy:null,minions:{},companions:{}},
  ui:{sound:false,ambient:false,musicTrack:'wayfarer',skillPreview:'',raceFilterTree:'Prime'}
};}
function uid(prefix){return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
function esc(v){return $('<div>').text(v==null?'':String(v)).html()}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function gradeIndex(g){return GRADE_ORDER.indexOf(g)}
function statIndex(g){return STAT_ORDER.indexOf(g)}
function atLeast(actual,needed){return gradeIndex(actual)>=gradeIndex(needed)}
function gradeFromSteps(s){return GRADE_ORDER[clamp(s,0,GRADE_ORDER.length-1)]||'F'}
function skillCumulativeCost(base,grade){if(base==null)return 0; const i=gradeIndex(grade); return i<0?0:base*(i+1)}
function limiterTotal(row){return (row.limiters||[]).reduce((n,l)=>n+(Number(l.rank)||0),0)}
function skillEffectGrade(row){const n=limiterTotal(row);return GRADE_ORDER[clamp(gradeIndex(row.grade)+n,0,gradeIndex('A'))]||row.grade}
function limiterAllowed(row){const def=getSkillDef(row.name)||{};if((M.limiterBlockedSkillNames||[]).some(n=>row.name.includes(n)))return false;const p=(def.prerequisite||'').toLowerCase();const skillWords=['magic skill','fighting style','tamer skill','martial ethos','magic school','asset same grade','gear f'];return !skillWords.some(x=>p.includes(x))}
function getSkillDef(name){return SKILLS.find(s=>s.name===name)}
function chosenPathEligible(s){if(!s||s.baseCost!==7)return false;if((s.tags||[]).some(t=>['Suite','Core','Exclusive'].includes(t)))return false;const blocked=['Fighting Style [Style Name]','Magic','Educated','Tamer','Magic School: [name of a school of magic]','Magic Domain [magic name]','Martial Ethos [Weapon Type] (name)','Martial Mastery [Weapon Type] (name)'];if(blocked.includes(s.name)||s.name.startsWith('Masterwork ')||s.name.startsWith('Tamer '))return false;const token=s.name.replace(/\[[^\]]+\]/g,'').replace(/[^A-Za-z ]/g,'').trim();if(token.length>3&&SKILLS.some(o=>o!==s&&(o.prerequisite||'').toLowerCase().includes(token.toLowerCase())))return false;return true}
function findSkillRows(namePart){const q=namePart.toLowerCase(); return state.skills.filter(r=>r.name.toLowerCase().includes(q))}
function bestSkillGrade(namePart){let best=null;findSkillRows(namePart).forEach(r=>{if(!best||gradeIndex(r.grade)>gradeIndex(best))best=r.grade});return best}
function bestSkillGradeExact(name){let best=null;state.skills.filter(r=>r.name===name).forEach(r=>{if(!best||gradeIndex(r.grade)>gradeIndex(best))best=r.grade});return best}
function standingGrade(){const p=pointsEarned();return M.standingThresholds.find(x=>p>=x.min).grade}
function pointsEarned(){const sz=M.sizes.find(s=>s.id===state.origin.size);return (sz&&sz.earned?sz.pointDelta:0)}
function statReductionBonus(){return Object.values(state.stats).reduce((sum,g)=>sum+(g==='G'?7:g==='H'?14:0),0)}
function pointsAtStart(){return 105+Math.max(0,Number(state.origin.scoopPoints)||0)+statReductionBonus()}
function availablePoints(){return pointsAtStart()+pointsEarned()}
function characterGrade(){let net=0;Object.values(state.stats).forEach(g=>{net+=(M.statStep[g]||0)});return gradeFromSteps(Math.floor(Math.max(0,net)/5))}
function sizeCost(){const sz=M.sizes.find(s=>s.id===state.origin.size);return sz&&sz.pointDelta<0?Math.abs(sz.pointDelta):0}
function mixedRaceCost(){return state.origin.evolutionPath==='hybrid'?7*(state.origin.parents||[]).length:0}
function skillCost(row){
  if(row.custom)return Number(row.cost)||0;
  const def=getSkillDef(row.name); if(!def)return Number(row.cost)||0;
  let c=skillCumulativeCost(def.baseCost,row.grade);
  const targets=state.origin.bornTargets||[]; if(targets.includes(row.id))c=Math.max(0,c-7);
  return c;
}
function techniqueCost(row){
  const style=state.skills.find(s=>s.id===row.styleId);
  if(!style)return skillCumulativeCost(row.baseCost||7,row.grade);
  if(style.specialized){
    if(row.nonUpgrading)return 7;
    return row.baseCost===14?35:21;
  }
  let c=skillCumulativeCost(row.baseCost||7,row.grade);
  const siblings=state.techniques.filter(t=>t.styleId===row.styleId);
  const slots=gradeIndex(style.grade)+1;
  const seen=[];let discountedIds=[];
  for(const t of siblings){const key=(t.core||t.name||'').toLowerCase();if(!seen.includes(key)){seen.push(key);if(discountedIds.length<slots)discountedIds.push(t.id)}}
  if(discountedIds.includes(row.id))c=Math.max(0,c-7);
  return c;
}
function techniqueGrade(row){const style=state.skills.find(s=>s.id===row.styleId);return style&&style.specialized?style.grade:row.grade}
function affinityCost(row){return skillCumulativeCost(row.baseCost||7,row.grade)}
function equipmentTypeIds(row){const ids=Array.isArray(row.types)&&row.types.length?row.types:(row.type?[row.type]:[]);return [...new Set(ids)].filter(id=>M.equipmentTypes.some(t=>t.id===id))}
function equipmentDefs(row){return equipmentTypeIds(row).map(id=>M.equipmentTypes.find(t=>t.id===id)).filter(Boolean)}
function equipmentCost(row){const steps=gradeIndex(row.grade)+1;const perGrade=equipmentDefs(row).reduce((sum,t)=>sum+(t.natural?14:7),0);const mult=row.specialMaterial?2:1;return Math.max(0,steps)*perGrade*mult}
function assetCost(row){return Number(row.cost)||0}
function customRowsCost(){return state.customRows.reduce((s,r)=>s+(Number(r.cost)||0),0)}
function totalSpent(){
  let stat=0;Object.values(state.stats).forEach(g=>{if(['E','D','C','B','A'].includes(g))stat+=M.statCostFromF[g]||0});
  return stat+sizeCost()+mixedRaceCost()+state.skills.reduce((s,r)=>s+skillCost(r),0)+state.techniques.reduce((s,r)=>s+techniqueCost(r),0)+state.affinities.reduce((s,r)=>s+affinityCost(r),0)+state.equipment.reduce((s,r)=>s+equipmentCost(r),0)+state.assets.reduce((s,r)=>s+assetCost(r),0)+customRowsCost();
}
function remainingPoints(){return availablePoints()-totalSpent()}
function powerGrade(){let best='F';const consider=g=>{if(g&&gradeIndex(g)>gradeIndex(best))best=g};state.skills.forEach(x=>consider(x.grade));state.techniques.forEach(x=>consider(x.grade));state.affinities.forEach(x=>consider(x.grade));return best}
function gradeOptions(selected,max='A',min='F'){const a=gradeIndex(min),b=gradeIndex(max);return GRADE_ORDER.slice(a,b+1).map(g=>`<option ${g===selected?'selected':''}>${g}</option>`).join('')}
function statGradeOptions(selected){return ['H','G','F','E','D','C','B'].map(g=>`<option ${g===selected?'selected':''}>${g}</option>`).join('')}

function init(){
  $('#rulesVersion').text(M.rulesSnapshot);
  renderOriginStatic(); renderStats(); bindGlobal(); loadLocalIfPresent(false);const raceParam=new URLSearchParams(location.search).get('race');if(raceParam&&raceById(raceParam)){selectRaceTemplate(raceParam,true);history.replaceState(null,'',location.pathname)}else renderAll();
}
function bindGlobal(){
  $('#stepNav').on('click','.step',function(){showStep($(this).data('step'))});
  $('#mobileReview').on('click',()=>showStep('review'));
  $('#characterName').on('input',function(){state.identity.name=this.value;refreshSummary();renderPortraits()});
  $('#playerName').on('input',function(){state.identity.player=this.value});
  $('#raceTitle').on('input',function(){state.identity.raceTitle=this.value;renderTitles();renderRaceTemplatePanel();}).on('blur change',function(){linkRecognizedRaceTitle();renderAll()});
  $('#characterImageUrl').on('input',function(){state.identity.imageUrl=this.value.trim();clearTimeout(portraitTimer);portraitTimer=setTimeout(renderPortraits,350)}).on('change blur',renderPortraits);
  $('#height').on('input',function(){state.identity.height=this.value}); $('#weight').on('input',function(){state.identity.weight=this.value});
  $('#featuresText').on('input',function(){state.identity.features=this.value});$('#backstory').on('input',function(){state.identity.backstory=this.value});$('#currentLife').on('input',function(){state.identity.currentLife=this.value});
  $('#originChoices').on('click','.choice-card',function(){state.origin.type=$(this).data('origin');if(state.origin.evolutionPath==='variant')state.origin.perk='Chosen Path';renderAll()});
  $('#sizeSelect').on('change',function(){state.origin.size=this.value;renderAll()});
  $('#scoopPoints').on('input',function(){state.origin.scoopPoints=Math.max(0,Number(this.value)||0);renderAll()});
  $('#evolutionPath').on('change',function(){state.origin.evolutionPath=this.value;if(this.value==='variant')state.origin.perk='Chosen Path';else if(this.value==='hybrid')state.origin.perk='Born For These';else state.origin.perk='';renderAll()});
  $('#raceTemplateSelect').on('change',function(){selectRaceTemplate(this.value,true)});
  $('#raceSearch').on('input',renderRaceCatalog);
  $('#raceTreeFilters').on('click','button[data-race-tree]',function(){state.ui.raceFilterTree=$(this).data('race-tree');renderRaceCatalog();});
  $('#raceCatalog').on('click','button[data-select-race]',function(e){e.preventDefault();e.stopPropagation();selectRaceTemplate($(this).data('select-race'),true)});
  $('#raceTemplatePanel').on('input','#raceOverrideReason',function(){state.origin.raceOverrideReason=this.value;renderReview(false)});
  $('#treeSelect').on('change',function(){state.origin.tree=this.value;renderAll()});
  $('#hybridParents').on('change',function(){state.origin.parents=$(this).val()||[];renderAll()});
  $('#racialPerk').on('change',function(){state.origin.perk=this.value;renderAll()});
  $('#chosenPathSkill').on('change',function(){state.origin.chosenPathSkill=this.value;renderAll()});
  $('#bornForThisTarget').on('change',function(){state.origin.bornTargets=$(this).val()?([].concat($(this).val())):[];renderAll()});
  $('#versatileItem').on('change',function(){state.origin.versatileItem=this.value;renderAll()});$('#versatileStat').on('change',function(){state.origin.versatileStat=this.value;renderAll()});
  $('#statsGrid').on('change','select',function(){state.stats[$(this).data('stat')]=this.value;renderAll()});
  $('#skillSearch,#skillCategory').on('input change',renderSkillCatalog);
  $('#skillCatalog').on('click','button[data-add-skill]',function(e){e.stopPropagation();addSkill($(this).data('add-skill'))}).on('click','.catalog-item[data-preview-skill]',function(){state.ui.skillPreview=$(this).data('preview-skill');renderSkillCatalog();renderSkillPreview()});
  $('#selectedSkills').on('click','button[data-remove-custom]',function(){state.customRows=state.customRows.filter(x=>x.id!==$(this).data('remove-custom'));renderAll()}).on('click','button[data-edit]',function(){editSkill($(this).data('edit'))}).on('click','button[data-remove]',function(){state.skills=state.skills.filter(x=>x.id!==$(this).data('remove'));renderAll()});
  $('#btnAddCustomSkill').on('click',addCustomRow);
  $('#btnAddTechnique').on('click',()=>editTechnique()); $('#techniqueList').on('click','button[data-edit-tech]',function(){editTechnique($(this).data('edit-tech'))}).on('click','button[data-remove-tech]',function(){state.techniques=state.techniques.filter(x=>x.id!==$(this).data('remove-tech'));renderAll()});
  $('#btnAddAffinity').on('click',()=>editAffinity()); $('#affinityList').on('click','button[data-edit-aff]',function(){editAffinity($(this).data('edit-aff'))}).on('click','button[data-remove-aff]',function(){state.affinities=state.affinities.filter(x=>x.id!==$(this).data('remove-aff'));renderAll()});
  $('#btnAddEquipment').on('click',()=>editEquipment()); $('#equipmentList').on('click','button[data-remove-custom]',function(){state.customRows=state.customRows.filter(x=>x.id!==$(this).data('remove-custom'));renderAll()}).on('click','button[data-edit-eq]',function(){editEquipment($(this).data('edit-eq'))}).on('click','button[data-remove-eq]',function(){state.equipment=state.equipment.filter(x=>x.id!==$(this).data('remove-eq'));renderAll()});
  $('#btnAddAsset').on('click',()=>editAsset()); $('#assetList').on('click','button[data-remove-custom]',function(){state.customRows=state.customRows.filter(x=>x.id!==$(this).data('remove-custom'));renderAll()}).on('click','button[data-edit-asset]',function(){editAsset($(this).data('edit-asset'))}).on('click','button[data-remove-asset]',function(){state.assets=state.assets.filter(x=>x.id!==$(this).data('remove-asset'));renderAll()});
  $('#btnAddAbility').on('click',()=>editAbility()); $('#abilityList').on('click','button[data-edit-ability]',function(){editAbility($(this).data('edit-ability'))}).on('click','button[data-remove-ability]',function(){state.abilities=state.abilities.filter(x=>x.id!==$(this).data('remove-ability'));renderAll()});
  $('#btnAddTitle').on('click',()=>editTitle()); $('#titleList').on('click','button[data-equip-title]',function(){const t=state.titles.find(x=>x.id===$(this).data('equip-title'));if(t)t.equipped=!t.equipped;renderAll()}).on('click','button[data-equip-class]',function(){equipClass($(this).data('equip-class'));}).on('click','button[data-equip-asset-title]',function(){const a=state.assets.find(x=>x.id===$(this).data('equip-asset-title'));if(a)a.titleEquipped=!a.titleEquipped;renderAll()}).on('click','button[data-remove-title]',function(){state.titles=state.titles.filter(x=>x.id!==$(this).data('remove-title'));renderAll()});
  $('#classChecks').on('click','button[data-equip-class]',function(){equipClass($(this).data('equip-class'))}).on('click','button[data-class-acquire]',function(){acquireClass($(this).data('class-acquire'))}).on('click','button[data-class-override]',function(){requestClassOverride($(this).data('class-override'))}).on('click','button[data-class-remove]',function(){removeClass($(this).data('class-remove'))});
  $('#jobTitleSuggestions').on('click','button[data-job-title]',function(){acceptJobTitleSuggestion($(this).data('job-title'))});
  $('#followerWorkspace').on('change','[data-follower-field]',handleFollowerField).on('click','button[data-add-companion]',function(){addCompanion($(this).data('add-companion'))}).on('click','button[data-remove-companion]',function(){removeCompanion($(this).data('pool'),$(this).data('remove-companion'))});
  $('#btnGenerateSheet').on('click',()=>{$('#sheetOutput').val(generateSheet());playUiSound('confirm')}); $('#btnCopySheet').on('click',copySheet);
  $('#btnExport').on('click',exportJson);$('#btnImport').on('click',()=>$('#fileImport').trigger('click'));$('#fileImport').on('change',importJson);$('#btnSaveLocal').on('click',()=>saveLocal(true));
  $('#btnReset').on('click',resetBuilder);$('#btnSound').on('click',toggleSound);$('#btnAmbient').on('click',toggleAmbient);$('#btnTrack').on('click',cycleAmbientTrack);
  $('#modalSave').on('click',function(){if(modalSaveHandler)modalSaveHandler()});
  $(document).on('pointerdown','.ui-btn,.step,.choice-card,.site-link,.race-card summary,.class-card summary',function(){if(this.id!=='btnSound')playUiSound('click')});
  $(document).on('change','select,input[type="checkbox"],input[type="radio"]',function(){playUiSound('select')});
  $(document).on('mouseenter focusin','.ui-btn,.step,.choice-card,.site-link,.race-card summary,.class-card summary,.select2-selection',function(){if($(this).is(':disabled'))return;const now=performance.now();if(now-lastHoverSound>75){lastHoverSound=now;playUiSound('hover')}});
}
function showStep(step){$('.step').removeClass('active').filter(`[data-step="${step}"]`).addClass('active');$('.step-panel').removeClass('active').filter(`[data-panel="${step}"]`).addClass('active');if(step==='review')renderReview();playUiSound('transition');window.scrollTo({top:0,behavior:'smooth'})}
function renderOriginStatic(){
  $('#originChoices').html(Object.entries(M.origins).map(([id,o])=>`<div class="choice-card" data-origin="${id}"><strong>${esc(o.name)}</strong><span>${esc(o.freeSkillNote)}</span></div>`).join(''));
  $('#sizeSelect').html(M.sizes.map(s=>`<option value="${s.id}">${s.name}${s.pointDelta>0?' (+'+s.pointDelta+' pts)':s.pointDelta<0?' ('+s.pointDelta+' pts)':''}</option>`).join(''));
  const treeOptions=M.trees.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');$('#treeSelect').html(treeOptions);$('#hybridParents').html(treeOptions);
  const raceOptions=RACES.slice().sort((a,b)=>a.tree.localeCompare(b.tree)||a.stage.localeCompare(b.stage)||a.name.localeCompare(b.name)).map(r=>`<option value="${esc(r.id)}">${esc(r.tree+' // '+r.stage+' // '+r.name)}</option>`).join('');$('#raceTemplateSelect').html('<option value="">Custom / write-in race</option>'+raceOptions);
  $('#raceTreeFilters').html(['All',...M.trees.map(t=>t.name),'Hybrid'].filter((v,i,a)=>a.indexOf(v)===i).map(t=>`<button type="button" class="race-tree-button" data-race-tree="${esc(t)}">${esc(t)}</button>`).join(''));
  const cats=[...new Set(SKILLS.map(s=>s.category))];$('#skillCategory').append(cats.map(c=>`<option>${esc(c)}</option>`).join(''));
}
function renderAll(){
  syncIdentityFields();renderPortraits();renderSoundButton();renderAmbientButton();renderOrigin();renderRaceTemplatePanel();renderRaceCatalog();renderStats();renderSkillCatalog();renderSkillPreview();renderSelectedSkills();renderTechniques();renderAffinities();renderEquipment();syncFollowerEntitlements();renderAssets();renderFollowers();renderAbilities();syncAutoClasses();renderTitles();renderJobTitleSuggestions();renderClasses();renumberSteps();refreshSummary();renderReview(false);refreshFancySelects();
}
function syncIdentityFields(){
  const map={characterName:'name',playerName:'player',raceTitle:'raceTitle',characterImageUrl:'imageUrl',height:'height',weight:'weight',featuresText:'features',backstory:'backstory',currentLife:'currentLife'};
  Object.entries(map).forEach(([id,k])=>{if(document.activeElement!==document.getElementById(id))$('#'+id).val(state.identity[k]||'')});
}
function renderPortraits(){
  const url=String(state.identity.imageUrl||'').trim();const name=state.identity.name||'Character';
  ['#identityPortrait','#summaryPortrait'].forEach(sel=>{const $box=$(sel);if(!$box.length)return;if($box.data('url')===url){$box.find('img').attr('alt',`${name} character image`);return}$box.data('url',url);
    if(!url){$box.html(`<div class="portrait-placeholder"><span>${sel==='#summaryPortrait'?'CHARACTER IMAGE':'NO IMAGE LINKED'}</span></div>`);return}
    if(!/^https?:\/\//i.test(url)){$box.html('<div class="portrait-error">Use a full http:// or https:// image URL.</div>');return}
    const $img=$('<img>',{alt:`${name} character image`,loading:'lazy',referrerpolicy:'no-referrer'}).attr('src',url);$img.one('error',()=>{$box.html('<div class="portrait-error">Image could not be loaded from that URL.</div>')});$box.empty().append($img);
  });
}
function renderSoundButton(){const on=!!state.ui?.sound;$('#btnSound').attr('aria-pressed',String(on)).text(`FX: ${on?'On':'Off'}`)}
function toggleSound(){state.ui=state.ui||{};state.ui.sound=!state.ui.sound;renderSoundButton();if(state.ui.sound)playUiSound('confirm')}
function playUiSound(kind='click'){
  if(!state.ui?.sound)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  try{if(!audioCtx)audioCtx=new AC();if(audioCtx.state==='suspended')audioCtx.resume();const now=audioCtx.currentTime;const tone=(freq,dur,vol,start=0,type='square')=>{const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,now+start);gain.gain.setValueAtTime(.0001,now+start);gain.gain.exponentialRampToValueAtTime(vol,now+start+.004);gain.gain.exponentialRampToValueAtTime(.0001,now+start+dur);osc.connect(gain);gain.connect(audioCtx.destination);osc.start(now+start);osc.stop(now+start+dur+.01)};
    if(kind==='confirm'){tone(660,.055,.025,0,'sine');tone(990,.075,.018,.045,'sine')}
    else if(kind==='transition'){tone(430,.035,.012,0,'triangle');tone(570,.045,.010,.025,'triangle')}
    else if(kind==='select'){tone(520,.025,.009,0,'square')}
    else if(kind==='hover'){tone(740,.018,.005,0,'sine');tone(925,.018,.003,.012,'sine')}
    else if(kind==='reset'){tone(320,.055,.018,0,'sawtooth');tone(190,.09,.013,.05,'sawtooth')}
    else tone(610,.022,.008,0,'square');
  }catch(_){/* Audio is cosmetic; silently fall back when unavailable. */}
}
function ensureAudioContext(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{if(!audioCtx)audioCtx=new AC();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}catch(_){return null}}
function renderAmbientButton(){
  const on=!!state.ui?.ambient;const id=state.ui?.musicTrack||'wayfarer';const name=window.IHMusic?.name(id)||id;
  $('#btnAmbient').attr('aria-pressed',String(on)).text(`Music: ${on?'On':'Off'}`);
  $('#btnTrack').text(`Track: ${name}`).attr('title','Cycle background music for character creation');
}
function startAmbient(){
  state.ui=state.ui||{};const id=state.ui.musicTrack||'wayfarer';window.IHMusic?.start(id);
}
function stopAmbient(){window.IHMusic?.stop()}
function cycleAmbientTrack(){
  state.ui=state.ui||{};const list=window.IHMusic?.groups?.shared||['wayfarer','starlit','horizon'];let i=list.indexOf(state.ui.musicTrack||'wayfarer');state.ui.musicTrack=list[(i+1+list.length)%list.length];
  if(state.ui.ambient)window.IHMusic?.setPreset(state.ui.musicTrack);renderAmbientButton();playUiSound('transition');
}
function toggleAmbient(){state.ui=state.ui||{};state.ui.ambient=!state.ui.ambient;if(state.ui.ambient)startAmbient();else stopAmbient();renderAmbientButton();if(state.ui.ambient)playUiSound('confirm')}
function resetBuilder(){
  if(!confirm('Reset the current on-screen character? Your manually saved browser character will be kept and can be restored by reloading the page.'))return;
  playUiSound('reset');stopAmbient();state=defaultState();$('#sheetOutput').val('');$('#fileImport').val('');showStep('identity');renderAll();
}
function renderOrigin(){
  $('#originChoices .choice-card').removeClass('active').filter(`[data-origin="${state.origin.type}"]`).addClass('active');
  if(state.origin.evolutionPath==='hybrid')state.origin.parents=(state.origin.parents||[]).filter(x=>x!==state.origin.tree);
  $('#sizeSelect').val(state.origin.size);$('#scoopPoints').val(state.origin.scoopPoints||0);$('#evolutionPath').val(state.origin.evolutionPath);$('#raceTemplateSelect').val(state.origin.raceId||'');$('#treeSelect').val(state.origin.tree);$('#hybridParents').val(state.origin.parents||[]);
  const sz=M.sizes.find(s=>s.id===state.origin.size);$('#sizeNote').text(sz?`${sz.height}; ${sz.weight}. ${sz.notes}`:'');
  const tree=M.trees.find(t=>t.id===state.origin.tree);$('#treeWarning').text(tree&&tree.warning?tree.warning:'');
  $('#hybridParentsWrap').toggleClass('hidden',state.origin.evolutionPath!=='hybrid');
  let perks=[];
  if(state.origin.evolutionPath==='variant')perks=['Chosen Path']; else if(state.origin.evolutionPath==='hybrid')perks=['Born For These']; else perks=(tree?tree.perks:[]);
  $('#racialPerk').html(perks.map(p=>`<option>${esc(p)}</option>`).join(''));if(!perks.includes(state.origin.perk))state.origin.perk=perks[0]||'';$('#racialPerk').val(state.origin.perk);
  const chosen=state.origin.perk==='Chosen Path';$('#chosenPathWrap').toggleClass('hidden',!chosen);
  const eligibleChosen=SKILLS.filter(chosenPathEligible);
  $('#chosenPathSkill').html('<option value="">Choose...</option>'+eligibleChosen.map(s=>`<option value="${esc(s.name)}">${esc(s.name)}</option>`).join('')).val(state.origin.chosenPathSkill);
  const born=/Born For/.test(state.origin.perk);$('#bornForThisWrap').toggleClass('hidden',!born);
  const opts=state.skills.map(s=>`<option value="${s.id}">${esc(s.name+(s.detail?' ['+s.detail+']':''))}</option>`).join('');
  $('#bornForThisTarget').prop('multiple',state.origin.evolutionPath==='hybrid').attr('size',state.origin.evolutionPath==='hybrid'?Math.min(5,Math.max(2,state.skills.length)):1).html(opts).val(state.origin.bornTargets||[]);
  const reqs=[];
  if(state.origin.evolutionPath==='variant')reqs.push('Variant Mundane has no racial build requirements. Chosen Path can replace your origin free skill with an eligible 7-point skill that follows Standing and ignores its normal prerequisites.');
  else if(state.origin.evolutionPath==='hybrid'){
    const trees=[state.origin.tree,...(state.origin.parents||[])].filter((v,i,a)=>a.indexOf(v)===i);reqs.push('Hybrid requires the Mundane requirements of every parent tree and Mixed Race for each additional tree.');trees.forEach(id=>{const t=M.trees.find(x=>x.id===id);if(t)reqs.push(`${t.name}: ${t.nativeRequirements.join('; ')}`)});
  } else if(tree)reqs.push(...tree.nativeRequirements);
  $('#raceRequirements').html('<strong>Creation requirements:</strong><br>'+reqs.map(esc).join('<br>'));
  $('#versatileWrap').toggleClass('hidden',state.origin.perk!=='Versatile');$('#versatileItem').val(state.origin.versatileItem||'melee');$('#versatileStat').val(state.origin.versatileStat||'Strength');
  $('#racialPerkNote').text(state.origin.perk==='Born For This'?'Choose one selected skill used for the racial Mundane requirements to receive a 7-point discount.':state.origin.perk==='Born For These'?'Hybrid receives one 7-point discount per parent tree, each used on a requirement purchase for that tree.':state.origin.perk==='Versatile'?'The selected stat is an alternate option, not a replacement. The normal governing stat remains valid.':'');
}
function renderStats(){
  $('#statsGrid').html(Object.keys(state.stats).map(k=>{const g=state.stats[k];const c=M.statCostFromF[g]||0;return `<div class="stat-card"><div class="stat-name">${k}</div><select data-stat="${k}">${statGradeOptions(g)}</select><div class="cost">${g==='G'?'+7 points':g==='H'?'+14 points':c?c+' points':'free'}</div></div>`}).join(''));
  $('#characterGradeTop').text(characterGrade());
}
function skillSnippet(s){const text=String(s.description||s.note||'').replace(/\s+/g,' ').trim();return text.length>165?text.slice(0,162)+'...':text}
function renderSkillCatalog(){
  const q=($('#skillSearch').val()||'').toLowerCase().trim(),cat=$('#skillCategory').val();
  const exclude=['Affinity [type]','Asset'];
  let arr=SKILLS.filter(s=>!exclude.includes(s.name));if(cat)arr=arr.filter(s=>s.category===cat);if(q)arr=arr.filter(s=>(s.name+' '+s.category+' '+s.tags.join(' ')+' '+s.description).toLowerCase().includes(q));
  arr=arr.slice(0,120);
  $('#skillCatalog').html(arr.map(s=>`<div class="catalog-item ${state.ui?.skillPreview===s.name?'previewing':''}" data-preview-skill="${esc(s.name)}"><div><div class="title">${esc(s.name)}</div><div class="meta">${esc(s.category)} // ${s.baseCost==null?'custom':s.baseCost+' pts/grade'}${s.prerequisite?' // '+esc(s.prerequisite):''}</div>${skillSnippet(s)?`<div class="snippet">${esc(skillSnippet(s))}</div>`:''}</div><button class="ui-btn small" data-add-skill="${esc(s.name)}">Add</button></div>`).join('')||'<div class="catalog-item">No matches.</div>');
}
function renderSkillPreview(){const name=state.ui?.skillPreview;if(!name){$('#skillPreview').html('<strong>Skill dossier</strong><br>Select a skill entry below to inspect its description and prerequisites before adding it.');return}const d=getSkillDef(name);if(!d){$('#skillPreview').html('<strong>Skill dossier</strong><br>No parsed details available.');return}const meta=[d.category,d.baseCost==null?'custom cost':d.baseCost+' pts/grade',(d.tags||[]).join(', ')].filter(Boolean).join(' // ');$('#skillPreview').html(`<div class="preview-title">${esc(d.name)}</div><div class="preview-meta">${esc(meta)}</div>${d.prerequisite?`<div><strong>Prerequisite:</strong> ${esc(d.prerequisite)}</div>`:''}${d.note?`<div><strong>Note:</strong> ${esc(d.note)}</div>`:''}<div class="preview-text">${esc(d.description||'No description parsed.').replace(/\n/g,'<br>')}</div>`)}
function addSkill(name){const def=getSkillDef(name);if(!def)return;state.skills.push({id:uid('sk'),name:def.name,grade:'F',detail:'',specialized:false,notes:'',limiters:[]});renderAll();}
function renderSelectedSkills(){
  const virtual=freeSkillDisplay();
  let html=virtual?`<div class="selected-row"><div><div class="row-title">${esc(virtual.name)} <span class="pill">FREE</span></div><div class="row-meta">${virtual.grade} // ${esc(virtual.note)}</div></div></div>`:'';
  html+=state.skills.map(r=>{const v=validateSkill(r);const c=skillCost(r);return `<div class="selected-row ${v.ok?'':'invalid'}"><div><div class="row-title">${esc(r.name)} ${r.detail?'<span class="pill">'+esc(r.detail)+'</span>':''}${r.specialized?'<span class="pill">SPECIALIZED</span>':''}</div><div class="row-meta">${r.grade}${limiterTotal(r)?'('+skillEffectGrade(r)+')':''} // ${c} pts // <span class="${v.ok?'status-good':'status-bad'}">${esc(v.message)}</span>${limiterTotal(r)?' // '+esc((r.limiters||[]).map(l=>l.type+' '+l.rank+(l.detail?' ['+l.detail+']':'')).join(', ')):''}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-edit="${r.id}">Edit</button><button class="ui-btn small danger" data-remove="${r.id}">×</button></div></div>`}).join('');
  html+=state.customRows.filter(r=>['Skill','Feature','Other'].includes(r.section)).map(r=>`<div class="selected-row"><div><div class="row-title">${esc(r.name)} <span class="pill">CUSTOM ${esc(r.section.toUpperCase())}</span></div><div class="row-meta">${r.grade||''} // ${Number(r.cost)||0} pts${r.notes?' // '+esc(r.notes):''}</div></div><div class="row-actions"><button class="ui-btn small danger" data-remove-custom="${r.id}">×</button></div></div>`).join('');
  $('#selectedSkills').html(html||'<div class="muted">No skills selected.</div>');
}
function freeSkillDisplay(){const sg=standingGrade();if(state.origin.perk==='Chosen Path'&&state.origin.chosenPathSkill)return {name:state.origin.chosenPathSkill,grade:sg,note:'Chosen Path; grows with Standing and ignores normal prerequisites'};const o=M.origins[state.origin.type];return o?{name:o.freeSkill,grade:sg,note:o.freeSkillNote}:null}
function editSkill(id){
  const r=state.skills.find(x=>x.id===id);if(!r)return;const def=getSkillDef(r.name)||{};
  const spec=r.name.startsWith('Fighting Style');
  const detailPlaceholder=r.name==='Narrative Booster'?'Title / activity, e.g. Teacher':(spec?'Weapon group and style name':'Weapon type, element, stat, profession...');
  const existing=(r.limiters||[]).slice(0,3);while(existing.length<3)existing.push({type:'',rank:1,detail:''});
  const limiterOptions='<option value="">None</option>'+(M.limiters||[]).map(l=>`<option value="${esc(l.id)}">${esc(l.id)}</option>`).join('');
  const limiterHtml=existing.map((l,i)=>`<div class="modal-form two"><label>Limiter ${i+1}<select class="mLimiterType" data-i="${i}">${limiterOptions}</select></label><label>Rank<select class="mLimiterRank" data-i="${i}"><option>1</option><option>2</option><option>3</option></select></label><label class="wide">Limiter detail<input class="mLimiterDetail" data-i="${i}" value="${esc(l.detail||'')}" placeholder="Assistant names, focused element, required equipment, etc."></label></div>`).join('');
  openModal('Edit Skill',`<div class="modal-form"><label>Skill<input value="${esc(r.name)}" disabled></label><label>Grade<select id="mGrade">${gradeOptions(r.grade,def.creationMaxGrade||'A')}</select></label><label>Detail / specialization<input id="mDetail" value="${esc(r.detail||'')}" placeholder="${esc(detailPlaceholder)}"></label>${spec?`<label class="checkbox-row"><input id="mSpecialized" type="checkbox" ${r.specialized?'checked':''}> Specialize this Fighting Style</label>`:''}<label>Notes<textarea id="mNotes" rows="3">${esc(r.notes||'')}</textarea></label><div><label>Limiters</label><small>At most 3 total limiter ranks. Each rank raises this skill's effect by one grade but not its purchased grade or normal ability grade/cooldown.</small>${limiterHtml}</div><div class="rule-callout"><strong>${esc(def.prerequisite?('Prerequisite: '+def.prerequisite):'No parsed prerequisite.')}</strong>${def.note?'<br>'+esc(def.note):''}${limiterAllowed(r)?'':'<br>This skill appears ineligible for limiters under the rules.'}<div class="rule-text">${esc(def.description||'').replace(/\n/g,'<br>')}</div></div></div>`,()=>{
    r.grade=$('#mGrade').val();r.detail=$('#mDetail').val().trim();r.notes=$('#mNotes').val().trim();if(spec)r.specialized=$('#mSpecialized').is(':checked');
    r.limiters=[];$('.mLimiterType').each(function(){const type=$(this).val();if(!type)return;const i=$(this).data('i');r.limiters.push({type,rank:Number($(`.mLimiterRank[data-i="${i}"]`).val())||1,detail:$(`.mLimiterDetail[data-i="${i}"]`).val().trim()})});
    closeModal();renderAll();
  });
  existing.forEach((l,i)=>{$(`.mLimiterType[data-i="${i}"]`).val(l.type||'');$(`.mLimiterRank[data-i="${i}"]`).val(String(l.rank||1))});
}
function validateSkill(r){
  if(r.custom)return {ok:true,message:'Custom / override row'};const def=getSkillDef(r.name);if(!def)return {ok:true,message:'Manual rule check'};
  if(r.name==='Narrative Booster'&&!String(r.detail||'').trim())return {ok:false,message:'Narrative Booster needs the activity/title it represents in the Detail field'};
  const lt=limiterTotal(r);if(lt>3)return {ok:false,message:'No skill may have more than 3 total limiter ranks'};if(lt&&!limiterAllowed(r))return {ok:false,message:'This skill is not eligible for limiters'};if(lt&&gradeIndex(r.grade)+lt>gradeIndex('A'))return {ok:false,message:'Limiter effect would exceed the pre-Tribulation A-grade ceiling'};if((r.limiters||[]).some(l=>l.type==='Imbue')&&!(r.limiters||[]).some(l=>l.type==='Charges'))return {ok:false,message:'Imbue requires the Charges limiter'};if((r.limiters||[]).some(l=>l.type==='Focused')&&r.name!=='Telekinesis')return {ok:false,message:'Focused limiter is only for Telekinesis'};
  if(def.creationMaxGrade&&gradeIndex(r.grade)>gradeIndex(def.creationMaxGrade))return {ok:false,message:`Creation cap ${def.creationMaxGrade}`};
  let p=def.prerequisite||'';const reqOffset=(p.match(/three grades higher/i)?3:p.match(/two grades higher/i)?2:p.match(/one grade higher/i)?1:0);
  const statNames=['Strength','Precision','Intelligence','Vitality','Speed'];let checked=false;
  if(r.name==='Magic'&&state.origin.perk==='Versatile'&&state.origin.versatileItem==='catalyst'&&/Intelligence!/i.test(p)){
    const need=GRADE_ORDER[gradeIndex(r.grade)+reqOffset]||'S';const alt=state.origin.versatileStat||'Intelligence';checked=true;
    if(!atLeast(state.stats.Intelligence,need)&&!atLeast(state.stats[alt],need))return {ok:false,message:`Requires Intelligence ${need}+ or ${alt} ${need}+ through Versatile`};
    p=p.replace(/Intelligence!/i,'');
  }
  for(const st of statNames){if(new RegExp(st+'!','i').test(p)){checked=true;const need=gradeIndex(r.grade)+reqOffset;if(statIndex(state.stats[st])<STAT_ORDER.indexOf(GRADE_ORDER[need]||'S'))return {ok:false,message:`Requires ${st} ${GRADE_ORDER[need]||'S'} or higher`}}}
  if(/Character!/i.test(p)){checked=true;const need=gradeIndex(r.grade)+reqOffset;if(gradeIndex(characterGrade())<need)return {ok:false,message:`Requires Character Grade ${GRADE_ORDER[need]||'S'} or higher`}}
  if(/Standing!/i.test(p)){checked=true;let need=gradeIndex(r.grade)+(/one grade higher/i.test(p)?1:0);if(gradeIndex(standingGrade())<need)return {ok:false,message:`Requires Standing ${GRADE_ORDER[need]||'S'} or higher`}}
  if(/Magic skill/i.test(p)){checked=true;const mg=bestSkillGradeExact('Magic');let need=gradeIndex(r.grade)+(/one grade higher/i.test(p)?1:0);if(!mg||gradeIndex(mg)<need)return {ok:false,message:`Requires Magic ${GRADE_ORDER[need]||'S'} or higher`}}
  if(/Fighting Style/i.test(p)&&!r.name.startsWith('Fighting Style')){checked=true;const fg=bestSkillGrade('Fighting Style');if(!fg)return {ok:false,message:'Requires a Fighting Style; review exact grade/core requirements'}}
  if(!p)return {ok:true,message:'No prerequisite'};
  return {ok:true,message:checked?'Core prerequisite met; review any additional text':'Manual prerequisite check'};
}

function editTechnique(id){
  const r=id?state.techniques.find(x=>x.id===id):null;const styles=state.skills.filter(s=>s.name.startsWith('Fighting Style'));if(!styles.length){alert('Add a Fighting Style first.');return}
  const row=r||{id:uid('tech'),styleId:styles[0].id,core:TECHS[0]?.name||'Accurate',grade:'F',detail:'',baseCost:7,actionTagged:false,nonUpgrading:false};
  const coreOptions=TECHS.map(t=>`<option value="${esc(t.name)}">${esc(t.name)} (${t.baseCost} pts)</option>`).join('')+'<option value="__custom">Custom core</option>';
  openModal(r?'Edit Technique':'Add Technique',`<div class="modal-form"><label>Fighting Style<select id="mStyle">${styles.map(s=>`<option value="${s.id}" ${s.id===row.styleId?'selected':''}>${esc(s.name+(s.detail?' - '+s.detail:''))} ${s.grade}</option>`).join('')}</select></label><label>Technique Core<select id="mCore">${coreOptions}</select></label><label id="mCustomCoreWrap" class="hidden">Custom Core Name<input id="mCustomCore"></label><label>Technique Name / Flavor<input id="mTechDetail" value="${esc(row.detail||'')}"></label><label>Grade<select id="mTechGrade">${gradeOptions(row.grade)}</select></label><div id="mTechRule" class="rule-callout"></div></div>`,()=>{const c=$('#mCore').val();const def=TECHS.find(t=>t.name===c);row.styleId=$('#mStyle').val();row.core=c==='__custom'?($('#mCustomCore').val().trim()||'Custom'):c;row.detail=$('#mTechDetail').val().trim();row.grade=$('#mTechGrade').val();row.baseCost=def?def.baseCost:7;row.actionTagged=def?def.actionTagged:false;row.nonUpgrading=def?def.nonUpgrading:false;const style=state.skills.find(s=>s.id===row.styleId);if(style&&style.specialized)row.grade=style.grade;if(!r)state.techniques.push(row);closeModal();renderAll()});
  $('#mCore').val(TECHS.some(t=>t.name===row.core)?row.core:'__custom').on('change',function(){const d=TECHS.find(t=>t.name===this.value);$('#mCustomCoreWrap').toggleClass('hidden',this.value!=='__custom');$('#mTechRule').text(d?d.description:'Custom technique requires manual approval.');});$('#mCore').trigger('change');if(!TECHS.some(t=>t.name===row.core)){$('#mCustomCore').val(row.core)}
}
function renderTechniques(){
  $('#techniqueList').html(state.techniques.map(r=>{const style=state.skills.find(s=>s.id===r.styleId);const tg=techniqueGrade(r);const invalid=!style||gradeIndex(tg)>gradeIndex(style.grade);return `<div class="selected-row ${invalid?'invalid':''}"><div><div class="row-title">${esc(r.detail||r.core)} <span class="pill">${esc(r.core)}</span></div><div class="row-meta">${tg} // ${techniqueCost(r)} pts // ${style?esc(style.detail||'Fighting Style'):'missing style'}${style?.specialized?' // follows Specialized Style grade':''}${r.actionTagged?' // +1 action effect':''}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-edit-tech="${r.id}">Edit</button><button class="ui-btn small danger" data-remove-tech="${r.id}">×</button></div></div>`}).join('')||'<div class="muted">No techniques added.</div>');
}
function editAffinity(id){
  const r=id?state.affinities.find(x=>x.id===id):null;const row=r||{id:uid('aff'),core:'Element',grade:'F',detail:'',baseCost:7,actionTagged:false};
  const options=AFFS.map(a=>`<option value="${esc(a.name)}">${esc(a.name)} (${a.baseCost} pts)</option>`).join('')+'<option value="__freeform">Freeform / elemental affinity</option>';
  openModal(r?'Edit Affinity':'Add Affinity',`<div class="modal-form"><label>Affinity Core<select id="mAffCore">${options}</select></label><label>Type / Flavor<input id="mAffDetail" value="${esc(row.detail||'')}" placeholder="Fire, lightning, metal, Drain [Strength]..."></label><label>Grade<select id="mAffGrade">${gradeOptions(row.grade)}</select></label><div id="mAffRule" class="rule-callout"></div></div>`,()=>{const c=$('#mAffCore').val();const d=AFFS.find(a=>a.name===c);row.core=c==='__freeform'?'Freeform':c;row.detail=$('#mAffDetail').val().trim();row.grade=$('#mAffGrade').val();row.baseCost=d?d.baseCost:7;row.actionTagged=d?d.actionTagged:false;if(!r)state.affinities.push(row);closeModal();renderAll()});
  const found=AFFS.some(a=>a.name===row.core);$('#mAffCore').val(found?row.core:'__freeform').on('change',function(){const d=AFFS.find(a=>a.name===this.value);$('#mAffRule').text(d?d.description:'A freeform affinity costs 7 points per grade and should be used when the desired affinity is not one of the listed mechanical cores.');}).trigger('change');
}
function renderAffinities(){$('#affinityList').html(state.affinities.map(r=>`<div class="selected-row"><div><div class="row-title">${esc(r.detail||r.core)} <span class="pill">${esc(r.core)}</span></div><div class="row-meta">${r.grade} // ${affinityCost(r)} pts${r.actionTagged?' // +1 action effect':''}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-edit-aff="${r.id}">Edit</button><button class="ui-btn small danger" data-remove-aff="${r.id}">×</button></div></div>`).join('')||'<div class="muted">No affinities added.</div>')}

function versatileAppliesToType(t){
  if(state.origin.perk!=='Versatile'||!t)return false;const target=state.origin.versatileItem;
  if(target==='catalyst')return t.id.includes('catalyst');
  if(target==='melee')return ['melee','shield','natural-melee'].includes(t.id);
  if(target==='ranged')return ['ranged','natural-ranged'].includes(t.id);
  return false;
}
function equipmentAllowedStats(t){const stats=[t.stat];if(versatileAppliesToType(t)&&state.origin.versatileStat)stats.push(state.origin.versatileStat);return [...new Set(stats)]}
function editEquipment(id){
  const r=id?state.equipment.find(x=>x.id===id):null;
  const row=r||{id:uid('eq'),name:'',types:['melee'],grade:'F',specialMaterial:false,notes:''};
  row.types=equipmentTypeIds(row).length?equipmentTypeIds(row):['melee'];
  const typeChecks=M.equipmentTypes.map(t=>`<label><input type="checkbox" name="mEqType" value="${t.id}" ${row.types.includes(t.id)?'checked':''}> ${esc(t.name)} <span class="muted">(+${t.natural?14:7}/grade)</span></label>`).join('');
  openModal(r?'Edit Equipment':'Add Equipment',`<div class="modal-form two"><label class="wide">Name<input id="mEqName" value="${esc(row.name)}" placeholder="Iron longsword, armored rifle, spellblade grimoire..."></label><label>Grade<select id="mEqGrade">${gradeOptions(row.grade)}</select></label><label class="checkbox-row"><input id="mEqSpecial" type="checkbox" ${row.specialMaterial?'checked':''}> Mythril / Orichalcum pricing (double)</label><div class="wide"><label>Equipment Types</label><div class="equipment-type-grid">${typeChecks}</div><small>Hybrid equipment may select multiple types. Each selected type adds its normal per-grade cost and all of its stat requirements apply.</small></div><div id="mEqCostPreview" class="modal-cost-preview wide"></div><label class="wide">Notes<textarea id="mEqNotes" rows="3">${esc(row.notes||'')}</textarea></label></div>`,()=>{
    const types=$('input[name=mEqType]:checked').map((_,e)=>e.value).get();if(!types.length){alert('Choose at least one equipment type.');return}
    row.name=$('#mEqName').val().trim()||'Unnamed Equipment';row.types=types;row.type=types[0];row.grade=$('#mEqGrade').val();row.specialMaterial=$('#mEqSpecial').is(':checked');row.notes=$('#mEqNotes').val().trim();
    if(!r)state.equipment.push(row);closeModal();renderAll();
  });
  const update=()=>{const temp={...row,types:$('input[name=mEqType]:checked').map((_,e)=>e.value).get(),grade:$('#mEqGrade').val(),specialMaterial:$('#mEqSpecial').is(':checked')};const defs=equipmentDefs(temp);const per=defs.reduce((sum,t)=>sum+(t.natural?14:7),0);$('#mEqCostPreview').text(`${defs.length||0} type${defs.length===1?'':'s'} × ${per} points per grade-step${temp.specialMaterial?' × 2 special material':''} = ${equipmentCost(temp)} points at ${temp.grade}`)};
  $('#modalBody').off('.equipment').on('change.equipment','input[name=mEqType],#mEqGrade,#mEqSpecial',update);update();
}
function equipmentValidation(r){
  const defs=equipmentDefs(r);if(!defs.length)return {ok:false,msg:'Choose at least one equipment type'};const need=GRADE_ORDER[gradeIndex(r.grade)+1]||'S';let ok=true;const parts=[];
  defs.forEach(t=>{const stats=equipmentAllowedStats(t);const pass=stats.some(st=>atLeast(state.stats[st],need));if(!pass)ok=false;parts.push(`${t.name}: ${stats.join(' or ')} ${need}+`)});
  return {ok,msg:parts.join('; ')};
}
function renderEquipment(){
  let html=state.equipment.map(r=>{const defs=equipmentDefs(r);const v=equipmentValidation(r);const pills=defs.map(t=>`<span class="pill">${esc(t.name)}</span>`).join('')+(defs.length>1?'<span class="pill">HYBRID</span>':'');return `<div class="selected-row ${v.ok?'':'invalid'}"><div><div class="row-title">${esc(r.name)} ${pills}</div><div class="row-meta">${r.grade} // ${equipmentCost(r)} pts // <span class="${v.ok?'status-good':'status-bad'}">${esc(v.msg)}</span>${r.notes?' // '+esc(r.notes):''}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-edit-eq="${r.id}">Edit</button><button class="ui-btn small danger" data-remove-eq="${r.id}">×</button></div></div>`}).join('');
  html+=state.customRows.filter(r=>r.section==='Equipment').map(r=>`<div class="selected-row"><div><div class="row-title">${esc(r.name)} <span class="pill">CUSTOM EQUIPMENT</span></div><div class="row-meta">${r.grade||''} // ${Number(r.cost)||0} pts${r.notes?' // '+esc(r.notes):''}</div></div><div class="row-actions"><button class="ui-btn small danger" data-remove-custom="${r.id}">×</button></div></div>`).join('');$('#equipmentList').html(html||'<div class="muted">No equipment added.</div>')
}
function systemAssets(){
  const out=[];
  state.skills.filter(s=>s.name.startsWith('Artisan')).forEach(s=>{const type=String(s.detail||'Unspecified Craft').trim();out.push({id:'system-artisan-'+s.id,name:`Master & Workshop [${type}]`,grade:'F',cost:0,system:true,notes:'Free from Artisan: a Master NPC and their shop/workspace may be leveraged for the craft. The shop is not owned by the character.'})});
  const tamer=state.skills.find(s=>s.name==='Tamer');if(tamer){const b=state.followers?.buddy||{};out.push({id:'system-tamer-buddy',name:`Buddy: ${String(b.name||'Unnamed Buddy').trim()}`,grade:'F',cost:0,system:true,notes:'Free from Tamer: F-grade buddy with F stats, no purchased skills, and one free primary mode of movement.'})}
  return out;
}
function companionPoolBudget(skill){return (M.followerRules?.companion?.basePool||70)+(Math.max(0,gradeIndex(skill?.grade||'F'))*(M.followerRules?.companion?.pointsPerGradeAfterF||35))}
function followerSkillRows(name){return state.skills.filter(s=>s.name===name)}
function syncFollowerEntitlements(){
  state.followers=state.followers||{buddy:null,minions:{},companions:{}};state.followers.minions=state.followers.minions||{};state.followers.companions=state.followers.companions||{};
  const tamer=followerSkillRows('Tamer')[0];if(tamer&&!state.followers.buddy)state.followers.buddy={name:'',type:'Animal',movement:'',appearance:'',notes:''};
  const minionIds=new Set(followerSkillRows('Minions').map(s=>s.id));followerSkillRows('Minions').forEach(s=>{if(!state.followers.minions[s.id])state.followers.minions[s.id]={name:'Minion Template',count:5,pointsUsed:0,build:''}});Object.keys(state.followers.minions).forEach(id=>{if(!minionIds.has(id))delete state.followers.minions[id]});
  const compIds=new Set(followerSkillRows('Companion').map(s=>s.id));followerSkillRows('Companion').forEach(s=>{if(!state.followers.companions[s.id])state.followers.companions[s.id]={records:[{id:uid('comp'),name:'',build:''}]}});Object.keys(state.followers.companions).forEach(id=>{if(!compIds.has(id))delete state.followers.companions[id]});
  const active=!!tamer||minionIds.size>0||compIds.size>0;$('.conditional-step[data-step="followers"]').toggleClass('hidden',!active);if(!active&&$('[data-panel="followers"]').hasClass('active')){$('.step-panel').removeClass('active').filter('[data-panel="abilities"]').addClass('active');$('.step').removeClass('active').filter('[data-step="abilities"]').addClass('active')}
}
function renderFollowers(){
  const parts=[];const tamer=followerSkillRows('Tamer')[0];
  if(tamer){const b=state.followers.buddy||{};parts.push(`<section class="follower-section"><div class="follower-section-head"><div><h3>Free Tamer Buddy</h3><div class="muted">Tamer grants one free F-grade buddy. It begins with F stats, no purchased skill, and one free primary movement.</div></div><span class="pill">FREE F BUDDY</span></div><div class="follower-card"><div class="follower-grid"><label>Name<input data-follower-field="name" data-follower-kind="buddy" value="${esc(b.name||'')}" placeholder="Buddy name"></label><label>Type<select data-follower-field="type" data-follower-kind="buddy"><option ${b.type==='Animal'?'selected':''}>Animal</option><option ${b.type==='Monster'?'selected':''}>Monster</option></select></label><label>Primary Movement<input data-follower-field="movement" data-follower-kind="buddy" value="${esc(b.movement||'')}" placeholder="Walk, fly, swim..."></label><label>Appearance<input data-follower-field="appearance" data-follower-kind="buddy" value="${esc(b.appearance||'')}" placeholder="Species / appearance"></label><label class="wide">Notes<textarea data-follower-field="notes" data-follower-kind="buddy" rows="3">${esc(b.notes||'')}</textarea></label></div></div></section>`)}
  followerSkillRows('Minions').forEach(skill=>{const m=state.followers.minions[skill.id]||{};const budget=M.followerRules?.minions?.templatePoints||56;const used=Number(m.pointsUsed)||0;parts.push(`<section class="follower-section"><div class="follower-section-head"><div><h3>Minion Template</h3><div class="muted">Each Minions purchase represents one minion type: up to five nameless creatures sharing one ${budget}-point template. Creation stats, skills, and assets cannot exceed B.</div></div><span class="follower-budget ${used>budget?'over':''}">${used}/${budget} pts documented</span></div><div class="follower-card"><div class="follower-grid"><label>Template / Type<input data-follower-kind="minion" data-pool="${skill.id}" data-follower-field="name" value="${esc(m.name||'')}"></label><label>Count<input type="number" min="1" max="5" data-follower-kind="minion" data-pool="${skill.id}" data-follower-field="count" value="${Number(m.count)||5}"></label><label>Points Used<input type="number" min="0" max="${budget}" data-follower-kind="minion" data-pool="${skill.id}" data-follower-field="pointsUsed" value="${used}"></label><label class="wide">Shared Build / Template Details<textarea rows="7" data-follower-kind="minion" data-pool="${skill.id}" data-follower-field="build" placeholder="Record stats, skills, features, equipment, assets, and other details for the shared template.">${esc(m.build||'')}</textarea></label></div></div></section>`)});
  followerSkillRows('Companion').forEach(skill=>{const pool=state.followers.companions[skill.id]||{records:[]};const budget=companionPoolBudget(skill);const cards=(pool.records||[]).map(r=>`<div class="follower-card"><div class="follower-grid"><label>Name<input data-follower-kind="companion" data-pool="${skill.id}" data-record="${r.id}" data-follower-field="name" value="${esc(r.name||'')}"></label><label class="wide">Companion Build<textarea rows="8" data-follower-kind="companion" data-pool="${skill.id}" data-record="${r.id}" data-follower-field="build" placeholder="Build the companion from the shared pool: race, stats, skills, equipment, assets, appearance, personality, and goals.">${esc(r.build||'')}</textarea></label><div class="wide"><button class="ui-btn small danger" type="button" data-pool="${skill.id}" data-remove-companion="${r.id}">Remove Companion</button></div></div></div>`).join('');parts.push(`<section class="follower-section"><div class="follower-section-head"><div><h3>Companions</h3><div class="muted">Companion ${skill.grade} gives you <strong>${budget} shared creation points</strong> to build one or more narrator-controlled companions. You do not need to manually assign a point subtotal to each companion here.</div></div><span class="follower-budget">${budget} shared pts</span></div>${cards}<button class="ui-btn small" type="button" data-add-companion="${skill.id}">+ Companion</button></section>`)});
  $('#followerWorkspace').html(parts.join('')||'<div class="rule-callout">No follower-creating skills are currently selected.</div>');
}
function handleFollowerField(){const $el=$(this),kind=$el.data('follower-kind'),field=$el.data('follower-field'),pool=$el.data('pool'),record=$el.data('record');let val=$el.val();if(['count','pointsUsed'].includes(field))val=Math.max(0,Number(val)||0);if(kind==='buddy'&&state.followers.buddy)state.followers.buddy[field]=val;else if(kind==='minion'&&state.followers.minions[pool])state.followers.minions[pool][field]=val;else if(kind==='companion'){const rec=state.followers.companions[pool]?.records?.find(r=>r.id===record);if(rec)rec[field]=val}renderFollowers();renderAssets();refreshSummary()}
function addCompanion(poolId){const pool=state.followers.companions[poolId];if(!pool)return;pool.records.push({id:uid('comp'),name:'',build:''});renderFollowers()}
function removeCompanion(poolId,id){const pool=state.followers.companions[poolId];if(!pool)return;pool.records=pool.records.filter(r=>r.id!==id);if(!pool.records.length)pool.records.push({id:uid('comp'),name:'',build:''});renderFollowers()}
function renumberSteps(){let n=1;$('#stepNav .step').each(function(){if($(this).hasClass('hidden'))return;$(this).find('span').first().text(String(n++).padStart(2,'0'))})}

function editAsset(id){
  const r=id?state.assets.find(x=>x.id===id):null;const row=r||{id:uid('asset'),name:'',grade:'F',cost:7,notes:'',createsTitle:true,titleName:'',titleEquipped:false};
  if(row.createsTitle===undefined)row.createsTitle=true;
  openModal(r?'Edit Asset':'Add Asset',`<div class="modal-form"><label>Name<input id="mAssetName" value="${esc(row.name)}" placeholder="Family connection, damaged townhouse, old vehicle..."></label><label>Grade<select id="mAssetGrade"><option>F</option></select></label><label>Point Cost<input id="mAssetCost" type="number" min="0" step="1" value="${Number(row.cost)||0}"><small>7 is the normal F Asset skill price. Use the document's listed special property/training prices or an approved override where appropriate.</small></label><label class="checkbox-row"><input id="mAssetCreatesTitle" type="checkbox" ${row.createsTitle!==false?'checked':''}> This Asset creates a fitting acquired title</label><div id="mAssetTitleWrap" class="modal-form"><label>Acquired Title<input id="mAssetTitle" value="${esc(row.titleName||'')}" placeholder="Leave blank to use the Asset name"><small>Use the title the possession or connection logically gives the character, such as Noble Scion, Shopkeeper, or Vehicle Owner.</small></label><label class="checkbox-row"><input id="mAssetTitleEquipped" type="checkbox" ${row.titleEquipped?'checked':''}> Equip this title</label></div><label>Condition / limits / notes<textarea id="mAssetNotes" rows="4">${esc(row.notes||'')}</textarea></label></div>`,()=>{
    row.name=$('#mAssetName').val().trim()||'Unnamed Asset';row.grade='F';row.cost=Math.max(0,Number($('#mAssetCost').val())||0);row.notes=$('#mAssetNotes').val().trim();row.createsTitle=$('#mAssetCreatesTitle').is(':checked');row.titleName=row.createsTitle?($('#mAssetTitle').val().trim()||row.name):'';row.titleEquipped=row.createsTitle&&$('#mAssetTitleEquipped').is(':checked');if(!r)state.assets.push(row);closeModal();renderAll()
  });
  $('#mAssetCreatesTitle').on('change',function(){$('#mAssetTitleWrap').toggleClass('hidden',!this.checked)}).trigger('change');
}
function renderAssets(){let html=systemAssets().map(r=>`<div class="selected-row system-asset"><div><div class="row-title">${esc(r.name)} <span class="pill">SYSTEM F ASSET</span><span class="pill">FREE</span></div><div class="row-meta">${esc(r.notes)}</div></div></div>`).join('');html+=state.assets.map(r=>`<div class="selected-row"><div><div class="row-title">${esc(r.name)} <span class="pill">F ASSET</span>${r.createsTitle!==false?`<span class="pill">TITLE: ${esc(r.titleName||r.name)}</span>`:''}</div><div class="row-meta">${assetCost(r)} pts${r.notes?' // '+esc(r.notes):''}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-edit-asset="${r.id}">Edit</button><button class="ui-btn small danger" data-remove-asset="${r.id}">×</button></div></div>`).join('');html+=state.customRows.filter(r=>r.section==='Asset').map(r=>`<div class="selected-row"><div><div class="row-title">${esc(r.name)} <span class="pill">CUSTOM F</span></div><div class="row-meta">${Number(r.cost)||0} pts${r.notes?' // '+esc(r.notes):''}</div></div><div class="row-actions"><button class="ui-btn small danger" data-remove-custom="${r.id}">×</button></div></div>`).join('');$('#assetList').html(html||'<div class="muted">No starting assets.</div>')}

function componentPool(){
  const arr=[];state.skills.forEach(s=>{const def=getSkillDef(s.name);if((def?.tags||[]).includes('Passive'))return;arr.push({id:'skill:'+s.id,label:s.name+(s.detail?' ['+s.detail+']':'')+(limiterTotal(s)?' '+s.grade+'('+skillEffectGrade(s)+')':''),grade:s.grade,action:false})});state.techniques.forEach(t=>arr.push({id:'tech:'+t.id,label:t.detail||t.core,grade:techniqueGrade(t),action:t.actionTagged}));state.affinities.forEach(a=>arr.push({id:'aff:'+a.id,label:a.detail||a.core,grade:a.grade,action:a.actionTagged}));return arr;
}
function editAbility(id){
  const r=id?state.abilities.find(x=>x.id===id):null;const row=r||{id:uid('ab'),name:'',description:'',components:[],gradeOverride:'',actionOverride:'',extraIntents:0,notes:''};const pool=componentPool();
  openModal(r?'Edit Ability':'Add Ability',`<div class="modal-form"><label>Name<input id="mAbName" value="${esc(row.name)}"></label><label>Description<textarea id="mAbDesc" rows="4">${esc(row.description)}</textarea></label><div><label>Components</label><div class="checkbox-row">${pool.map(c=>`<label><input type="checkbox" name="mComp" value="${c.id}" ${row.components.includes(c.id)?'checked':''}> ${esc(c.label)} ${c.grade}${c.action?' (+1 effect)':''}</label>`).join('')||'<span class="muted">Add skills, techniques, or affinities first.</span>'}</div></div><div class="modal-form two"><label>Grade Override<select id="mAbGrade"><option value="">Automatic</option>${gradeOptions(row.gradeOverride||'F')}</select></label><label>Action Override<input id="mAbActions" type="number" min="1" max="9" value="${esc(row.actionOverride)}" placeholder="Automatic"></label><label>Additional distinct intents<input id="mAbExtra" type="number" min="0" max="9" value="${Number(row.extraIntents)||0}"><small>Beyond the base intent, excluding +1 effects already tagged on techniques/affinities.</small></label><label>Notes<input id="mAbNotes" value="${esc(row.notes||'')}" placeholder="Flux, range, duration, limitations..."></label></div></div>`,()=>{row.name=$('#mAbName').val().trim()||'Unnamed Ability';row.description=$('#mAbDesc').val().trim();row.components=$('input[name=mComp]:checked').map((_,e)=>e.value).get();row.gradeOverride=$('#mAbGrade').val();row.actionOverride=$('#mAbActions').val()?Number($('#mAbActions').val()):'';row.extraIntents=Math.max(0,Number($('#mAbExtra').val())||0);row.notes=$('#mAbNotes').val().trim();if(!r)state.abilities.push(row);closeModal();renderAll()});$('#mAbGrade').val(row.gradeOverride||'');
}
function abilityCalc(r){const pool=componentPool().filter(c=>r.components.includes(c.id));let g='F';pool.forEach(c=>{if(gradeIndex(c.grade)>gradeIndex(g))g=c.grade});if(r.gradeOverride)g=r.gradeOverride;const tagged=pool.filter(c=>c.action).length;const plus=Math.max(tagged,Number(r.extraIntents)||0);let actions=1+Math.max(0,plus-1);if(r.actionOverride)actions=Number(r.actionOverride);return {grade:g,cooldown:M.cooldowns[g],actions,tagged,pool}}
function renderAbilities(){$('#abilityList').html(state.abilities.map(r=>{const c=abilityCalc(r);return `<div class="selected-row ${c.actions>3?'invalid':''}"><div><div class="row-title">${esc(r.name)} <span class="pill">GRADE ${c.grade}</span><span class="pill">${c.cooldown==null?'?':c.cooldown} POST CD</span><span class="pill">${c.actions} ACTION${c.actions===1?'':'S'}</span></div><div class="row-meta">${esc(c.pool.map(x=>x.label+' '+x.grade).join(', ')||'No components')}${r.notes?' // '+esc(r.notes):''}</div>${r.description?`<div class="muted">${esc(r.description)}</div>`:''}</div><div class="row-actions"><button class="ui-btn small ghost" data-edit-ability="${r.id}">Edit</button><button class="ui-btn small danger" data-remove-ability="${r.id}">×</button></div></div>`}).join('')||'<div class="muted">No abilities created.</div>')}

function editTitle(){openModal('Add Title',`<div class="modal-form"><label>Title<input id="mTitle"></label><label class="checkbox-row"><input id="mTitleEquipped" type="checkbox"> Equipped</label><label>Notes<input id="mTitleNotes" placeholder="Optional"></label></div>`,()=>{const n=$('#mTitle').val().trim();if(n)state.titles.push({id:uid('title'),name:n,notes:$('#mTitleNotes').val().trim(),equipped:$('#mTitleEquipped').is(':checked')});closeModal();renderAll()})}
function automaticTitles(){
  const arr=[],seen=new Set();const push=t=>{const key=String(t.name||'').trim().toLowerCase();if(!key||seen.has(key))return;seen.add(key);arr.push(t)};
  const treeIds=state.origin.evolutionPath==='hybrid'?[state.origin.tree,...(state.origin.parents||[])]:[state.origin.tree];treeIds.filter(Boolean).forEach(id=>{const t=M.trees.find(x=>x.id===id);if(t)push({name:t.name,source:'Racial Tree',equipped:true})});
  if(state.identity.raceTitle)push({name:state.identity.raceTitle,source:'Race',equipped:true});
  if(state.origin.evolutionPath==='hybrid')push({name:'Hybrid',source:'Racial Path',equipped:true});
  state.skills.filter(s=>s.name==='Narrative Booster'&&String(s.detail||'').trim()).forEach(s=>push({id:s.id,name:s.detail.trim(),source:'Narrative Booster',equipped:true,fixedTitle:true}));
  state.assets.filter(a=>a.createsTitle!==false).forEach(a=>push({id:a.id,name:(a.titleName||a.name||'Asset Holder').trim(),source:'Asset',equipped:!!a.titleEquipped,assetTitle:true}));
  state.classes.forEach(c=>push({id:c.id,name:c.name,source:c.override?'Class (equivalent)':'Class',equipped:!!c.equipped,classTitle:true}));
  return arr;
}
function renderTitles(){
  const auto=automaticTitles();
  $('#titleList').html(auto.map(t=>{let action='';if(t.classTitle)action=`<div class="row-actions"><button class="ui-btn small ghost" data-equip-class="${t.id}">${t.equipped?'Unequip':'Equip'}</button></div>`;else if(t.assetTitle)action=`<div class="row-actions"><button class="ui-btn small ghost" data-equip-asset-title="${t.id}">${t.equipped?'Unequip':'Equip'}</button></div>`;return `<div class="selected-row"><div><div class="row-title">${esc(t.name)} <span class="pill">${esc(t.source)}</span>${t.equipped?'<span class="pill">EQUIPPED</span>':'<span class="pill">ACQUIRED</span>'}</div></div>${action}</div>`}).join('')+state.titles.map(t=>`<div class="selected-row"><div><div class="row-title">${esc(t.name)} ${t.equipped?'<span class="pill">EQUIPPED</span>':'<span class="pill">ACQUIRED</span>'}</div><div class="row-meta">${esc(t.notes||'Custom title')}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-equip-title="${t.id}">${t.equipped?'Unequip':'Equip'}</button><button class="ui-btn small danger" data-remove-title="${t.id}">×</button></div></div>`).join(''));
}
function jobTitleRank(grade){const idx=gradeIndex(grade);if(idx>=gradeIndex('S'))return 'Legendary';if(idx>=gradeIndex('A'))return 'Master';if(idx>=gradeIndex('C'))return 'Expert';if(idx>=gradeIndex('D'))return 'Adept';return 'Apprentice'}
function jobTitleNoun(skill){const detail=String(skill.detail||'').trim();if(skill.name.startsWith('Artisan'))return detail||'Artisan';if(skill.name.startsWith('Fighting Style')){const d=detail||'Weapon';const low=d.toLowerCase();if(/sword/.test(low))return 'Swordsman';if(/spear|lance|polearm/.test(low))return 'Lancer';if(/bow/.test(low)&&!/cross/.test(low))return 'Archer';if(/crossbow/.test(low))return 'Crossbowman';if(/gun|firearm|rifle|pistol/.test(low))return 'Gunner';if(/unarmed|fist|martial/.test(low))return 'Martial Artist';return `${d} User`}if(skill.name.startsWith('Helming'))return detail?`${detail} Pilot`:'Pilot';if(skill.name.startsWith('Masterwork #Maker'))return detail?`${detail} Maker`:'Maker';if(skill.name.startsWith('Masterwork #Harvester'))return detail?`${detail} Harvester`:'Harvester';if(skill.name.startsWith('Masterwork #Refiner'))return detail?`${detail} Refiner`:'Refiner';if(skill.name.startsWith('Masterwork #Builder'))return 'Builder';if(skill.name.startsWith('Masterwork #Infuser'))return detail?`${detail} Infuser`:'Infuser';return ''}
function jobTitleSuggestions(){const rows=[];state.skills.forEach(skill=>{if(!(M.jobTitleSkillFamilies||[]).some(f=>skill.name.startsWith(f)))return;const noun=jobTitleNoun(skill);if(!noun)return;const name=`${jobTitleRank(skill.grade)} ${noun}`;rows.push({id:skill.id,name,source:`${skill.name}${skill.detail?' ['+skill.detail+']':''} ${skill.grade}`})});return rows.filter((r,i,a)=>a.findIndex(x=>x.name.toLowerCase()===r.name.toLowerCase())===i)}
function renderJobTitleSuggestions(){const existing=new Set([...automaticTitles().map(t=>t.name),...state.titles.map(t=>t.name)].map(x=>String(x).toLowerCase()));const rows=jobTitleSuggestions().filter(r=>!existing.has(r.name.toLowerCase()));$('#jobTitleSuggestions').html(rows.map(r=>`<div class="selected-row"><div><div class="row-title">${esc(r.name)}</div><div class="row-meta">Suggested from ${esc(r.source)}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-job-title="${r.id}">Review & Add</button></div></div>`).join('')||'<div class="muted">No new weapon/tool job title suggestions.</div>')}
function acceptJobTitleSuggestion(skillId){const skill=state.skills.find(s=>s.id===skillId);if(!skill)return;const suggestion=jobTitleSuggestions().find(x=>x.id===skillId);if(!suggestion)return;openModal('Add Job Title',`<div class="modal-form"><label>Suggested Title<input id="mJobTitle" value="${esc(suggestion.name)}"></label><label class="checkbox-row"><input id="mJobEquipped" type="checkbox"> Equip this title</label><label>Source / Notes<textarea id="mJobNotes" rows="3">Suggested from ${esc(suggestion.source)} using the Job Title progression.</textarea></label></div>`,()=>{const name=$('#mJobTitle').val().trim();if(!name)return;state.titles.push({id:uid('title'),name,notes:$('#mJobNotes').val().trim(),equipped:$('#mJobEquipped').is(':checked'),jobSuggestionSource:skillId});closeModal();renderAll()})}

function syncAutoClasses(){for(const c of M.classRules){const st=classStatus(c.id);const existing=state.classes.find(x=>x.id===c.id);if(st.ok&&!st.manual&&!existing)state.classes.push({id:c.id,name:c.name,tier:c.tier,override:false,auto:true,equipped:false,overrideReason:''});if(existing&&existing.auto&&(!st.ok||st.manual))state.classes=state.classes.filter(x=>x!==existing)}}
function equipClass(id){const c=state.classes.find(x=>x.id===id);if(!c)return;if(!c.equipped){state.classes.forEach(x=>{if(x.tier===c.tier)x.equipped=false});c.equipped=true}else c.equipped=false;renderAll()}
function namedSkillMatch(row,name){return row.name===name||row.name.startsWith(name+' ')||row.name.startsWith(name+'[')||row.name.startsWith(name+' [')}
function classStatus(id){
  const req=[];let ok=true,manual=false;const add=(pass,msg)=>{req.push({pass,msg});if(!pass)ok=false};
  const sec=state.skills.filter(s=>(getSkillDef(s.name)||{}).category==='Secondary'); const intSec=sec.filter(s=>(getSkillDef(s.name)?.prerequisite||'').includes('Intelligence!'));
  const equip=(type,min)=>state.equipment.some(e=>equipmentTypeIds(e).includes(type)&&atLeast(e.grade,min));
  if(id==='caster'){
    add(atLeast(state.stats.Intelligence,'D'),'Intelligence D');add(intSec.length>=3,'3 Intelligence-based Secondary skills');add(atLeast(bestSkillGradeExact('Magic')||'F','E')&&!!bestSkillGradeExact('Magic'),'Magic E');add(state.affinities.filter(a=>(a.core==='Element'||/element/i.test(a.core+' '+a.detail))).length>=2,'2 Element affinities');add(atLeast(bestSkillGradeExact('Range')||'F','F')&&!!bestSkillGradeExact('Range'),'Range F');add(atLeast(bestSkillGradeExact('Area of Effect')||'F','F')&&!!bestSkillGradeExact('Area of Effect'),'Area of Effect F');add(atLeast(bestSkillGradeExact('Targets')||'F','F')&&!!bestSkillGradeExact('Targets'),'Targets F');add(atLeast(bestSkillGradeExact('Duration')||'F','F')&&!!bestSkillGradeExact('Duration'),'Duration F');add(equip('catalyst','E'),'Catalyst E');
  } else if(id==='striker'){
    add(atLeast(state.stats.Intelligence,'E'),'Intelligence E');add(atLeast(state.stats.Strength,'D'),'Strength D');add(atLeast(state.stats.Speed,'D'),'Speed D');const fs=state.skills.find(s=>s.name.startsWith('Fighting Style')&&atLeast(s.grade,'E'));add(!!fs,'Fighting Style E');if(fs){const ts=state.techniques.filter(t=>t.styleId===fs.id).map(t=>t.core.toLowerCase());add(ts.some(x=>x.includes('accurate')),'Accurate technique');add(ts.some(x=>x.includes('penetrat')),'Penetrating technique');if(!/one.?hand/i.test(fs.detail||''))manual=true}else{add(false,'Accurate technique');add(false,'Penetrating technique')}add(atLeast(bestSkillGrade('Fast')||'F','E')&&!!bestSkillGrade('Fast'),'Fast E');add(!!bestSkillGrade('Warfare'),'Warfare F');add(sec.length>=1,'1 Secondary skill');add(equip('melee','E'),'One-handed melee weapon E');add(equip('light','E'),'Light Armor E');manual=true;
  } else if(id==='nomad'){
    const c=M.classRules.find(x=>x.id==='nomad'),help=c?.help||{};add(atLeast(state.stats.Intelligence,'C'),'Intelligence C');add(['Strength','Speed','Precision'].some(st=>atLeast(state.stats[st],'D')),'Strength, Speed, or Precision D');
    const profDefs=['Academia','Agriculture','Alchemy','Animal Handling','Architecture','Artisan','Business','Domestic Arts','Healing','Law','Mining','Navigation','Visual Arts','Profession'];const professions=state.skills.filter(r=>profDefs.some(n=>r.name.startsWith(n))&&((r.name.startsWith('Profession')&&atLeast(r.grade,'F'))||atLeast(r.grade,'E')));add(professions.length>=2,'2 listed profession choices at required grade');
    const supplemental=(help.supplemental||[]).map(x=>x.replace(/\s+[FEDCBAS]$/,'')).map(x=>x.replace(/ \[type\]$/i,''));const supplementalRows=state.skills.filter(r=>supplemental.some(n=>r.name===n||r.name.startsWith(n+' ')||r.name.startsWith(n+' [')));add(supplementalRows.length>=4,'4 listed supplemental Secondary skills F');
    add(state.skills.some(r=>['Fast','Jumping','Swim Speed','Climbing'].some(n=>namedSkillMatch(r,n))&&atLeast(r.grade,'F')),'1 listed movement skill F');const defining=['Deception','Disguise','Focus','Interrogation','Intimidation','Leadership','Lucky','Performance','Persuasion','Seduction','Street Sense'];add(state.skills.some(r=>defining.some(n=>r.name.startsWith(n))&&atLeast(r.grade,'F')),'1 defining Secondary skill F');
  } else if(id==='pathforger'){
    add(atLeast(state.stats.Strength,'E'),'Strength E');add(atLeast(state.stats.Precision,'D'),'Precision D');add(atLeast(state.stats.Intelligence,'D'),'Intelligence D');add(!!bestSkillGrade('Profession'),'Profession F');add(!!bestSkillGrade('Helming'),'Helming F');add(!!bestSkillGrade('Artisan'),'Artisan F');add(!!bestSkillGrade('Navigation'),'Navigation F');add(!!bestSkillGrade('Engineering'),'Engineering F');add(!!bestSkillGrade('Gear'),'Gear F');add(!!bestSkillGrade('Energized'),'Energized F');add(state.equipment.some(e=>equipmentTypeIds(e).some(t=>['light','heavy'].includes(t))),'Light or Heavy Armor F');add(state.assets.some(a=>/vehicle/i.test(a.name+' '+a.notes)),'Vehicle Asset F');manual=true;
  }
  return {ok,manual,req};
}
function renderClassHelp(c){if(!c.help)return '';const block=(label,arr)=>arr?.length?`<div><strong>${label}:</strong> ${arr.map(esc).join(', ')}</div>`:'';return `<div class="class-help"><div><strong>What the Nomad categories mean</strong></div>${block('Profession choices',c.help.profession)}${block('Supplemental secondaries',c.help.supplemental)}${block('Movement',c.help.movement)}${block('Defining secondaries',c.help.defining)}</div>`}
function renderClasses(){
  $('#classChecks').html(M.classRules.map(c=>{const st=classStatus(c.id),have=state.classes.find(x=>x.id===c.id),passed=st.req.filter(r=>r.pass).length,total=st.req.length;let actions='';if(have){actions=`<button class="ui-btn small ghost" data-equip-class="${c.id}">${have.equipped?'Unequip':'Equip'}</button>`;if(have.override)actions+=` <button class="ui-btn small ghost" data-class-override="${c.id}">Edit equivalency</button>`;if(!have.auto)actions+=` <button class="ui-btn small danger" data-class-remove="${c.id}">Remove acquired title</button>`}else{actions=`<button class="ui-btn small" data-class-acquire="${c.id}" ${st.ok?'':'disabled'}>Acquire class title</button> <button class="ui-btn small ghost" data-class-override="${c.id}">Acquire via equivalent / override</button>`}const reason=have?.overrideReason?`<div class="override-reason"><strong>Equivalent requirement explanation:</strong> ${esc(have.overrideReason)}</div>`:'';return `<div class="class-card"><details><summary><div class="class-summary-main"><strong>${esc(c.name)}</strong><div class="muted">${esc(c.summary)}</div></div><span class="class-count ${st.ok?'status-good':'status-bad'}">${passed}/${total} requirements</span></summary><div class="class-body">${renderClassHelp(c)}<ul>${st.req.map(r=>`<li class="${r.pass?'status-good':'status-bad'}">${r.pass?'✓':'×'} ${esc(r.msg)}</li>`).join('')}</ul>${reason}${actions}</div></details></div>`}).join(''));
}
function acquireClass(id){if(state.classes.some(x=>x.id===id))return;const c=M.classRules.find(x=>x.id===id),st=classStatus(id);if(!c||!st.ok)return;state.classes.push({id:c.id,name:c.name,tier:c.tier,override:false,auto:false,equipped:false,overrideReason:''});renderAll()}
function requestClassOverride(id){const c=M.classRules.find(x=>x.id===id);if(!c)return;const existing=state.classes.find(x=>x.id===id);openModal(existing?.override?'Edit Class Equivalency':'Class Equivalency / Override',`<div class="modal-form"><div class="rule-callout">Use this only when the literal checker cannot recognize a valid equivalent way of meeting ${esc(c.name)} requirements.</div><label>How are the requirements being met another way?<textarea id="mClassOverrideReason" rows="7" placeholder="Identify the requirement(s) and explain the equivalent skill, item, casting method, approved custom content, or other substitution.">${esc(existing?.overrideReason||'')}</textarea></label></div>`,()=>{const reason=$('#mClassOverrideReason').val().trim();if(!reason){alert('An equivalency explanation is required.');return}if(existing){existing.override=true;existing.auto=false;existing.overrideReason=reason}else state.classes.push({id:c.id,name:c.name,tier:c.tier,override:true,auto:false,equipped:false,overrideReason:reason});closeModal();renderAll()})}
function removeClass(id){state.classes=state.classes.filter(x=>x.id!==id);renderAll()}


function addCustomRow(){
  openModal('Custom / Override Row',`<div class="modal-form two"><label>Section<select id="mCustomSection"><option>Skill</option><option>Feature</option><option>Equipment</option><option>Asset</option><option>Other</option></select></label><label>Grade<select id="mCustomGrade"><option value="">None</option>${gradeOptions('F')}</select></label><label class="wide">Name<input id="mCustomName" placeholder="Approved custom content or correction"></label><label>Point Cost<input id="mCustomCost" type="number" min="0" step="1" value="7"></label><label>Validation<select id="mCustomValid"><option value="override">Mod / rules override</option><option value="normal">Normal custom entry</option></select></label><label class="wide">Notes<textarea id="mCustomNotes" rows="3" placeholder="Why this exists / what rule it represents"></textarea></label></div>`,()=>{const n=$('#mCustomName').val().trim();if(n)state.customRows.push({id:uid('custom'),section:$('#mCustomSection').val(),grade:$('#mCustomGrade').val(),name:n,cost:Number($('#mCustomCost').val())||0,override:$('#mCustomValid').val()==='override',notes:$('#mCustomNotes').val().trim()});closeModal();renderAll()})
}


function normalizedRaceName(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'')}
function raceById(id){return RACES.find(r=>r.id===id)||null}
function recognizedRaceByName(name){const key=normalizedRaceName(name);if(!key)return null;return RACES.find(r=>[r.name,...(r.aliases||[])].some(a=>normalizedRaceName(a)===key))||null}
function activeRaceTemplate(){return raceById(state.origin.raceId)||recognizedRaceByName(state.identity.raceTitle)}
function raceParentTrees(race){if(!race)return[];const hay=(race.requirements||[]).join(' ');return ['Prime','Beast','Fae','Monster','Construct'].filter(t=>new RegExp('\\b'+t+'\\b','i').test(hay))}
function selectRaceTemplate(id,updateTitle){
  state.origin.raceId=id||'';state.origin.raceOverrideReason='';const r=raceById(id);if(!r){renderAll();return}
  if(updateTitle)state.identity.raceTitle=r.name;
  if(r.tree==='Hybrid'){
    const parents=raceParentTrees(r);if(parents.length){state.origin.evolutionPath='hybrid';state.origin.tree=parents[0].toLowerCase();state.origin.parents=parents.slice(1).map(x=>x.toLowerCase())}
  }else if(['Prime','Beast','Fae','Monster','Construct'].includes(r.tree))state.origin.tree=r.tree.toLowerCase();
  state.ui.raceFilterTree=r.tree;renderAll();
}
function linkRecognizedRaceTitle(){const r=recognizedRaceByName(state.identity.raceTitle);if(r&&r.id!==state.origin.raceId)selectRaceTemplate(r.id,false);else if(!r&&state.origin.raceId)state.origin.raceId=''}
function countCategory(cat){return state.skills.filter(s=>(getSkillDef(s.name)||{}).category===cat).length}
function raceRequirementChecks(race){
  if(!race)return {checks:[],manual:[]};const checks=[],manual=[];const add=(pass,msg)=>checks.push({pass,msg});const lines=(race.requirements||[]).flatMap(x=>String(x).split(/\n/)).map(x=>x.trim()).filter(Boolean);
  const full=lines.join(' ');
  const sizeMatch=full.match(/\b(Tiny|Small|Medium|Large|Huge)\s+size\b/i);if(sizeMatch)add(state.origin.size===sizeMatch[1].toLowerCase(),`${sizeMatch[1]} size`);
  const statRe=/\b(Strength|Precision|Intelligence|Vitality|Speed)\s*(?:-|:)?\s*([FEDCBAS])\b/gi;let m;const seenStats=new Set();while((m=statRe.exec(full))){const key=m[1]+m[2];if(seenStats.has(key))continue;seenStats.add(key);add(atLeast(state.stats[m[1]],m[2].toUpperCase()),`${m[1]} ${m[2].toUpperCase()}`)}
  const countRe=/(\d+)\s+(secondary|sense|movement)\s+skills?/ig;while((m=countRe.exec(full))){const n=Number(m[1]),cat=m[2].toLowerCase();const map={secondary:'Secondary',sense:'Sense',movement:'Movement'};add(countCategory(map[cat])>=n,`${n} ${map[cat]} skill${n===1?'':'s'}`)}
  const magicReq=full.match(/(\d+)\s+magic skills?\/affinities/gi);if(magicReq){const n=Number(magicReq[0].match(/\d+/)[0]);add(countCategory('Magic')+state.affinities.length>=n,`${n} magic skills/affinities`)}
  const martialReq=full.match(/(\d+)\s+martial skills?\/techniques/gi);if(martialReq){const n=Number(martialReq[0].match(/\d+/)[0]);add(countCategory('Martial')+state.techniques.length>=n,`${n} martial skills/techniques`)}
  // Exact, high-confidence skill requirements found at the beginning of a requirement line.
  const defs=SKILLS.slice().sort((a,b)=>b.name.length-a.name.length);for(const line of lines){const c=line.replace(/\([^)]*pts?[^)]*\)/ig,'').replace(/\([^)]*\)/g,'').trim();if(/^(Total Cost|Evolves into|Titles?:|Features?:|Stats?:|Skills?:|Choose|Perk|or\b)/i.test(c))continue;let matched=false;for(const d of defs){const base=d.name.replace(/\[[^\]]+\]/g,'').replace(/\([^)]*\)/g,'').trim();if(base.length<3)continue;const re=new RegExp('^'+base.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:\\s+\\[[^\\]]+\\])?\\s*(?:-|:)?\\s*([FEDCBAS])\\b','i');const mm=c.match(re);if(mm){const g=bestSkillGrade(base)||bestSkillGradeExact(d.name);add(!!g&&atLeast(g,mm[1].toUpperCase()),`${base} ${mm[1].toUpperCase()}`);matched=true;break}}if(matched)continue;if(/^\[(.+?)\].*Affinity\s*(?:-|:)?\s*([FEDCBAS])\b/i.test(c)){const mm=c.match(/Affinity\s*(?:-|:)?\s*([FEDCBAS])\b/i);add(state.affinities.some(a=>atLeast(a.grade,mm[1].toUpperCase())),`Affinity ${mm[1].toUpperCase()}`);continue}if(/^\[[^\]]+\]|^(Natural|Special|Heightened|Sixth|Flight|Darkvision|Wings|Tail|Horns|Scales)/i.test(c))manual.push(c)}
  // Track source/title alignment independently.
  if(race.tree!=='Hybrid')add(state.origin.tree===race.tree.toLowerCase(),`${race.tree} racial tree`);else add(state.origin.evolutionPath==='hybrid','Hybrid racial path');
  return {checks:checks.filter((x,i,a)=>a.findIndex(y=>y.msg===x.msg)===i),manual:[...new Set(manual)]};
}
function raceStatus(race){const r=raceRequirementChecks(race);return {passed:r.checks.filter(x=>x.pass).length,total:r.checks.length,failed:r.checks.filter(x=>!x.pass),manual:r.manual}}
function renderRaceTemplatePanel(){
  const race=activeRaceTemplate();if(!race){$('#raceTemplatePanel').html(`<div class="rule-callout"><strong>Custom race title.</strong> Write-ins are allowed. If the name exactly matches an established world race, the builder will link it to that race's template and check the requirements it can verify.</div>`);return}
  if(!state.origin.raceId)state.origin.raceId=race.id;const st=raceStatus(race);const imgs=(race.images||[]).map(src=>`<img loading="lazy" src="${esc(src)}" alt="${esc(race.name)} reference art">`).join('');const profile=[race.lifespan&&`<div><b>Lifespan</b>${esc(race.lifespan)}</div>`,race.height&&`<div><b>Height</b>${esc(race.height)}</div>`,race.weight&&`<div><b>Weight</b>${esc(race.weight)}</div>`].filter(Boolean).join('');
  const checks=st.total?`<ul class="race-check-list">${raceRequirementChecks(race).checks.map(x=>`<li class="${x.pass?'status-good':'status-bad'}">${x.pass?'✓':'×'} ${esc(x.msg)}</li>`).join('')}</ul>`:'<div class="muted">This template has no machine-readable checks yet.</div>';
  const manual=st.manual.length?`<details class="manual-race-review"><summary>${st.manual.length} requirement note${st.manual.length===1?'':'s'} need human review</summary><ul>${st.manual.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`:'';
  const override=`<label class="race-override">Race template review / equivalency note<textarea id="raceOverrideReason" rows="3" placeholder="Optional. Explain an approved variant, equivalent feature, or template exception when an automated check cannot recognize it.">${esc(state.origin.raceOverrideReason||'')}</textarea></label>`;
  $('#raceTemplatePanel').html(`<div class="race-template-card ${st.failed.length?'has-failures':'is-valid'}"><div class="race-template-top"><div><div class="eyebrow">${esc(race.tree)} // ${esc(race.stage)}</div><h3>${esc(race.name)}</h3><p>${esc(race.description||'No description recorded.')}</p></div><div class="race-template-art">${imgs}</div></div><div class="race-profile-grid">${profile}</div><div class="race-status-line"><strong>${st.passed}/${st.total} automated checks met</strong>${race.totalCost?`<span>Template cost note: ${esc(race.totalCost)}</span>`:''}${race.evolvesInto?`<span>Evolves into: ${esc(race.evolvesInto)}</span>`:''}</div>${checks}${manual}<details class="race-raw"><summary>Full template requirements</summary><ul>${(race.requirements||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>${override}</div>`);
}
function renderRaceCatalog(){
  if(!$('#raceCatalog').length)return;const tree=state.ui.raceFilterTree||'Prime',q=String($('#raceSearch').val()||'').toLowerCase().trim();$('#raceTreeFilters [data-race-tree]').removeClass('active').filter(`[data-race-tree="${tree}"]`).addClass('active');let rows=RACES.filter(r=>tree==='All'||r.tree===tree);if(q)rows=rows.filter(r=>(r.name+' '+r.tree+' '+r.stage+' '+r.description+' '+(r.requirements||[]).join(' ')).toLowerCase().includes(q));
  const stages=['Mundane','Intermediate','Ascended'];const groups=stages.map(stage=>{const rs=rows.filter(r=>r.stage===stage);if(!rs.length)return'';return `<details class="race-stage" ${stage==='Mundane'?'open':''}><summary><span>${stage}</span><b>${rs.length} templates</b></summary><div class="race-stage-body">${rs.map(r=>{const st=raceStatus(r);const selected=state.origin.raceId===r.id;const img=r.images?.[0]?`<img loading="lazy" src="${esc(r.images[0])}" alt="">`:'';return `<details class="race-card ${selected?'selected':''}"><summary>${img}<div><strong>${esc(r.name)}</strong><span>${esc(r.tree)} // ${st.total?st.passed+'/'+st.total+' verified':'manual template'}${r.evolvesInto?' // → '+esc(r.evolvesInto):''}</span></div></summary><div class="race-card-body"><p>${esc(r.description||'No description recorded.')}</p><div class="race-card-actions"><button type="button" class="ui-btn small" data-select-race="${esc(r.id)}">Use ${esc(r.name)}</button><a class="ui-btn small ghost" href="races.html#${encodeURIComponent(r.id)}">Open Compendium</a></div></div></details>`}).join('')}</div></details>`}).join('');$('#raceCatalog').html(groups||'<div class="rule-callout">No race templates match this filter.</div>');
}
function refreshFancySelects(){
  if(!$.fn.select2)return;$('select').each(function(){const $s=$(this);if($s.hasClass('no-enhance'))return;try{if($s.hasClass('select2-hidden-accessible'))$s.select2('destroy')}catch(_){};const inModal=$s.closest('#modal').length;const searchable=$s.find('option').length>10;$s.select2({width:'100%',minimumResultsForSearch:searchable?0:Infinity,dropdownParent:inModal?$('#modal'):$(document.body)});});
}
function racialValidation(){
  if(state.origin.evolutionPath==='variant')return {ok:true,items:[]};
  const trees=state.origin.evolutionPath==='hybrid'?[state.origin.tree,...state.origin.parents]:[state.origin.tree];let items=[];let all=true;
  for(const id of trees.filter((v,i,a)=>a.indexOf(v)===i)){
    const t=M.trees.find(x=>x.id===id);if(!t)continue;const add=(pass,msg)=>{items.push({pass,msg:`${t.name}: ${msg}`});if(!pass)all=false};
    if(id==='prime'){const magic=state.skills.filter(s=>getSkillDef(s.name)?.category==='Magic').length+state.affinities.length;const martial=state.skills.filter(s=>getSkillDef(s.name)?.category==='Martial').length+state.techniques.length;const secondary=state.skills.filter(s=>getSkillDef(s.name)?.category==='Secondary').length;add(magic>=2||martial>=2||secondary>=2,'2 magic/affinity, martial/technique, or Secondary selections')}
    if(id==='beast'){add(state.equipment.some(e=>equipmentTypeIds(e).some(t=>['natural-melee','natural-ranged','natural-light','natural-heavy'].includes(t))),'Natural Weapon or Natural Armor F');add(state.skills.filter(s=>getSkillDef(s.name)?.category==='Sense').length>=2,'2 Sense skills')}
    if(id==='fae'){add(!!bestSkillGradeExact('Magic'),'Magic F');add(state.skills.filter(s=>getSkillDef(s.name)?.category==='Secondary').length>=1,'1 Secondary skill')}
    if(id==='monster'){add(!!bestSkillGradeExact('Magic')||!!bestSkillGrade('Fighting Style')||state.equipment.some(e=>equipmentTypeIds(e).some(t=>t.startsWith('natural-')&&t.includes('melee'))),'Magic, Fighting Style, or Natural Weapon F');add(state.skills.some(s=>getSkillDef(s.name)?.category==='Movement'),'1 Movement skill');add(state.skills.some(s=>getSkillDef(s.name)?.category==='Sense'),'1 Sense skill')}
    if(id==='construct'){add(state.skills.filter(s=>getSkillDef(s.name)?.category==='Defensive').length>=1,'1 Defensive skill');add(state.skills.filter(s=>getSkillDef(s.name)?.category==='Secondary').length>=2,'2 Secondary skills')}
  }
  return {ok:all,items};
}
function validation(){
  const errors=[],warnings=[];if(!state.identity.name.trim())errors.push('Character Name is required.');if(!state.identity.raceTitle.trim()&&!state.origin.tree)errors.push('A racial title is required.');
  const rem=remainingPoints(),scoop=Number(state.origin.scoopPoints)||0;if(rem<0)errors.push(`Build is ${Math.abs(rem)} points over budget.`);else if(rem!==0&&!(scoop>0&&rem<7))errors.push(`All creation points must be spent. ${rem} points remain.`);else if(rem>0)warnings.push(`${rem} point Scoop remainder is unspent; this is allowed when it cannot be spent in 7-point increments.`);
  Object.entries(state.stats).forEach(([s,g])=>{if(statIndex(g)>statIndex('B'))errors.push(`${s} exceeds the B creation cap.`)});
  state.skills.forEach(r=>{const v=validateSkill(r);if(!v.ok)errors.push(`${r.name} ${r.grade}: ${v.message}`);else if(v.message.includes('Manual'))warnings.push(`${r.name}: ${v.message}.`)});
  state.techniques.forEach(r=>{const style=state.skills.find(s=>s.id===r.styleId);if(!style)errors.push(`${r.detail||r.core}: missing Fighting Style.`);else if(gradeIndex(techniqueGrade(r))>gradeIndex(style.grade))errors.push(`${r.detail||r.core} exceeds its Fighting Style grade.`)});
  state.equipment.forEach(r=>{const v=equipmentValidation(r);if(!v.ok)errors.push(`${r.name} ${r.grade}: ${v.msg}.`)});
  state.assets.forEach(r=>{if(r.grade!=='F')errors.push(`${r.name}: starting Assets are capped at F.`)});
  const rv=racialValidation();if(!rv.ok)rv.items.filter(x=>!x.pass).forEach(x=>errors.push(`Racial requirement unmet: ${x.msg}.`));
  const race=activeRaceTemplate();if(race){const rs=raceStatus(race);if(rs.failed.length&&!String(state.origin.raceOverrideReason||'').trim())rs.failed.forEach(x=>errors.push(`${race.name} template unmet: ${x.msg}.`));else if(rs.failed.length)warnings.push(`${race.name} uses a race-template review/equivalency note: ${state.origin.raceOverrideReason}`);if(rs.manual.length)warnings.push(`${race.name} has ${rs.manual.length} template requirement note(s) that need human review.`)}
  if(state.origin.perk==='Chosen Path'&&!state.origin.chosenPathSkill)errors.push('Chosen Path is selected but no replacement skill has been chosen.');
  if(state.origin.tree==='monster')warnings.push('Monster tree is a hard-mode antagonist path and is discouraged for new players.');
  state.abilities.forEach(r=>{const c=abilityCalc(r);if(c.actions>3)warnings.push(`${r.name} is estimated at ${c.actions} actions and would not fit the standard 3-action Advanced Rules combat post without an override.`)});
  state.classes.filter(c=>c.override).forEach(c=>{if(!String(c.overrideReason||'').trim())errors.push(`${c.name} class equivalency needs a written explanation.`);else warnings.push(`${c.name} was acquired using an equivalent/custom override: ${c.overrideReason}`)});
  const tamer=state.skills.find(x=>x.name==='Tamer');if(tamer&&state.followers?.buddy&&!String(state.followers.buddy.movement||'').trim())warnings.push('Tamer buddy has no primary movement recorded.');
  followerSkillRows('Minions').forEach(skill=>{const m=state.followers.minions?.[skill.id];if(m&&(Number(m.pointsUsed)||0)>(M.followerRules?.minions?.templatePoints||56))errors.push(`${m.name||'Minion template'} documents more than 56 points.`)});
  followerSkillRows('Companion').forEach(skill=>{const pool=state.followers.companions?.[skill.id];if(!pool)return;(pool.records||[]).forEach(r=>{if(String(r.name||'').trim()&&!String(r.build||'').trim())warnings.push(`${r.name} has no companion build details recorded.`)})});
  if(state.origin.perk==='Born For This'&&(state.origin.bornTargets||[]).length!==1)warnings.push('Born For This is selected but exactly one discount target has not been chosen.');
  if(state.origin.perk==='Born For These'){const expected=1+(state.origin.parents||[]).length;if((state.origin.bornTargets||[]).length!==expected)warnings.push(`Born For These should have ${expected} distinct 7-point discount targets, one per racial tree.`)}
  return {errors,warnings};
}
function refreshSummary(){const a=availablePoints(),s=totalSpent(),r=a-s;$('#summaryName').text(state.identity.name||'Unnamed Character');const eq=[...automaticTitles().filter(x=>x.equipped).map(x=>x.name),...state.titles.filter(x=>x.equipped).map(x=>x.name)];$('#summaryTitles').text(eq.length?[...new Set(eq)].join(' / '):'No equipped titles yet');$('#sumAvailable').text(a);$('#sumSpent').text(s);$('#sumRemaining,#mobileRemaining').text(r);$('#sumCharGrade,#mobileGrade,#characterGradeTop').text(characterGrade());$('#sumStanding').text(standingGrade());$('#sumPower').text(powerGrade());$('#budgetMeter').css('width',clamp((s/Math.max(1,a))*100,0,100)+'%');const v=validation();$('#quickWarnings').html(v.errors.slice(0,3).map(x=>`<div class="warning-item">${esc(x)}</div>`).join('')+(v.errors.length?``:`<div class="ok-item">No blocking errors detected.</div>`));}
function renderReview(force=true){if(!force&&$('[data-panel="review"]').is(':hidden'))return;const v=validation();let h='';if(v.errors.length)h+=`<div class="validation-group bad"><h3>${v.errors.length} blocking issue${v.errors.length===1?'':'s'}</h3><ul>${v.errors.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;else h+=`<div class="validation-group good"><h3>Creation checks passed</h3><div>The automated checks found no blocking issues. Narrative equivalencies and custom overrides can still require staff review.</div></div>`;if(v.warnings.length)h+=`<div class="validation-group"><h3>Review notes</h3><ul>${v.warnings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;$('#validationSummary').html(h)}

function generateSheet(){
  const lines=[];const add=(label,val)=>{if(val!==undefined&&val!==null&&String(val).trim()!=='')lines.push(`${label}: ${val}`)};const uniq=a=>[...new Set(a.filter(Boolean))];
  add('Character Name',state.identity.name);add("Rp'er Name",state.identity.player);add('Character Image',state.identity.imageUrl);
  const autoTitles=automaticTitles();const autoEquipped=autoTitles.filter(x=>x.equipped).map(x=>x.name);const customEquipped=state.titles.filter(x=>x.equipped).map(x=>x.name);const equipped=uniq([...autoEquipped,...customEquipped]);const acquiredAll=uniq([...autoTitles.filter(x=>!x.equipped).map(x=>x.name),...state.titles.filter(x=>!x.equipped).map(x=>x.name)]);const acquired=acquiredAll.filter(x=>!equipped.includes(x));if(equipped.length)add('Titles',equipped.join(', '));if(acquired.length)add('Acquired Titles',acquired.join(', '));
  const perks=[];if(state.origin.perk){if(state.origin.perk==='Versatile'){const label={melee:'Melee Weapons',ranged:'Ranged Weapons',catalyst:'Catalysts'}[state.origin.versatileItem]||state.origin.versatileItem;perks.push(`Versatile [${label} may use ${state.origin.versatileStat} as an alternate governing stat]`)}else perks.push(state.origin.perk)}state.classes.filter(c=>c.equipped).forEach(c=>{const d=M.classRules.find(x=>x.id===c.id);if(d?.perk)perks.push(d.perk)});if(perks.length)add('Perks',perks.join(', '));
  const feat=[];if(state.identity.features.trim())feat.push(state.identity.features.trim());if(state.origin.evolutionPath==='hybrid')feat.push(`Mixed Race (${[state.origin.tree,...state.origin.parents].map(id=>M.trees.find(t=>t.id===id)?.name).filter(Boolean).join(' / ')})`);if(feat.length)add('Features',feat.join('; '));
  add('Points At Start',pointsAtStart());add('Points Spent',totalSpent());add('Points Earned',pointsEarned());const rem=remainingPoints();if(rem)add('Points Not Spent',rem);
  Object.entries(state.stats).forEach(([k,g])=>add(k,g));add('Character Grade',characterGrade());add('Standing Grade',standingGrade());
  if(state.identity.height)add('Height',state.identity.height);if(state.identity.weight)add('Weight',state.identity.weight);

  const free=freeSkillDisplay();const skillLines=[];if(free)skillLines.push(`${free.name} ${free.grade} (free: ${free.note})`);
  const usedTech=new Set();let affinitiesPlaced=false;
  const skillLine=r=>{let x=`${r.name}${r.detail?' ['+r.detail+']':''} ${r.grade}${limiterTotal(r)?'('+skillEffectGrade(r)+')':''}${r.specialized?' [Specialize]':''}`;if(limiterTotal(r))x+=` - Limiters: ${(r.limiters||[]).map(l=>l.type+' '+l.rank+(l.detail?' ['+l.detail+']':'')).join(', ')}`;if(r.notes)x+=` - ${r.notes}`;return x};
  const techLine=t=>{const name=t.detail||t.core;const core=name===t.core?'':` [${t.core}]`;return `  [Technique] ${name} ${techniqueGrade(t)}${core}`};
  const affLine=a=>{const name=a.detail||a.core;const core=name===a.core?'':` [${a.core}]`;return `  [Affinity] ${name} ${a.grade}${core}`};
  state.skills.forEach(r=>{skillLines.push(skillLine(r));if(r.name.startsWith('Fighting Style'))state.techniques.filter(t=>t.styleId===r.id).forEach(t=>{skillLines.push(techLine(t));usedTech.add(t.id)});if(r.name==='Magic'&&!affinitiesPlaced){state.affinities.forEach(a=>skillLines.push(affLine(a)));affinitiesPlaced=true}});
  state.techniques.filter(t=>!usedTech.has(t.id)).forEach(t=>skillLines.push(techLine(t)));if(!affinitiesPlaced)state.affinities.forEach(a=>skillLines.push(affLine(a)));
  state.customRows.filter(r=>r.section==='Skill').forEach(r=>skillLines.push(`${r.name}${r.grade?' '+r.grade:''}${r.notes?' - '+r.notes:''}`));if(skillLines.length){lines.push('');lines.push('Skills:');lines.push(...skillLines)}

  if(state.abilities.length){lines.push('');lines.push('Abilities:');state.abilities.forEach(r=>{const c=abilityCalc(r);const comps=c.pool.map(x=>`${x.label} ${x.grade}`).join(', ');let x=`${r.name} - ${comps||'Custom components'}`;if(r.description)x+=` - ${r.description}`;x+=` - Grade ${c.grade} - ${c.cooldown==null?'?':c.cooldown} Post Cooldown`;if(c.actions!==1)x+=` - ${c.actions} Actions`;if(r.notes)x+=` - ${r.notes}`;lines.push(x)})}
  const eqLines=state.equipment.map(r=>{const types=equipmentDefs(r).map(t=>t.name).join(', ')||'Unspecified Equipment';return `${r.name} ${r.grade} [${types}]${r.notes?' - '+r.notes:''}`});state.customRows.filter(r=>r.section==='Equipment').forEach(r=>eqLines.push(`${r.name}${r.grade?' '+r.grade:''} [Custom Equipment]${r.notes?' - '+r.notes:''}`));if(eqLines.length){lines.push('');lines.push('Equipment:');lines.push(...eqLines)}
  const assetLines=systemAssets().map(r=>`${r.name} F - ${r.notes}`);state.assets.forEach(r=>assetLines.push(`${r.name} F${r.notes?' - '+r.notes:''}`));state.customRows.filter(r=>r.section==='Asset').forEach(r=>assetLines.push(`${r.name}${r.grade?' '+r.grade:''}${r.notes?' - '+r.notes:''}`));if(assetLines.length){lines.push('');lines.push('Assets:');lines.push(...assetLines)}
  if(state.skills.some(s=>s.name==='Tamer')&&state.followers?.buddy){const b=state.followers.buddy;lines.push('');lines.push('Buddy:');let x=`${b.name||'Unnamed Buddy'} F [${b.type||'Buddy'}] - Stats F, no purchased skills`;if(b.movement)x+=` - Primary Movement: ${b.movement}`;if(b.appearance)x+=` - ${b.appearance}`;if(b.notes)x+=` - ${b.notes}`;lines.push(x)}
  const minionLines=[];followerSkillRows('Minions').forEach(skill=>{const m=state.followers.minions?.[skill.id];if(m)minionLines.push(`${m.name||'Minion Template'} - ${Number(m.count)||5} minion(s) - ${Number(m.pointsUsed)||0}/56 points documented${m.build?' - '+m.build:''}`)});if(minionLines.length){lines.push('');lines.push('Minions:');lines.push(...minionLines)}
  const companionLines=[];followerSkillRows('Companion').forEach(skill=>{const pool=state.followers.companions?.[skill.id];const budget=companionPoolBudget(skill);(pool?.records||[]).forEach(r=>{if(!r.name&&!r.build)return;companionLines.push(`${r.name||'Unnamed Companion'}${r.build?' - '+r.build:''}`)});if((pool?.records||[]).some(r=>r.name||r.build))companionLines.unshift(`Shared Companion Build Pool: ${budget} points`) });if(companionLines.length){lines.push('');lines.push('Companions:');lines.push(...companionLines)}
  const classOverrides=state.classes.filter(c=>c.override&&c.overrideReason);if(classOverrides.length){lines.push('');lines.push('Class Equivalencies:');classOverrides.forEach(c=>lines.push(`${c.name}: ${c.overrideReason}`))}
  if(activeRaceTemplate()&&String(state.origin.raceOverrideReason||'').trim()){lines.push('');lines.push('Race Template Review:');lines.push(`${activeRaceTemplate().name}: ${state.origin.raceOverrideReason.trim()}`)}
  const customFeatures=state.customRows.filter(r=>r.section==='Feature');if(customFeatures.length){lines.push('');lines.push('Additional Features:');customFeatures.forEach(r=>lines.push(`${r.name}${r.notes?' - '+r.notes:''}`))}
  if(state.identity.backstory.trim()){lines.push('');add('Backstory',state.identity.backstory.trim())}if(state.identity.currentLife.trim()){lines.push('');add('Current Life',state.identity.currentLife.trim())}
  lines.push('');lines.push('Change Log:');lines.push('[Character Creation]');
  if(Number(state.origin.scoopPoints)||0)lines.push(`Scoop carry-in: ${Number(state.origin.scoopPoints)||0} points.`);
  Object.entries(state.stats).forEach(([k,g])=>{if(g==='G')lines.push(`${k} F => G: +7 starting points.`);else if(g==='H')lines.push(`${k} F => H: +14 starting points.`);else if(g!=='F')lines.push(`${k} F => ${g}: ${M.statCostFromF[g]} points.`)});
  const size=M.sizes.find(s=>s.id===state.origin.size);if(size&&size.id!=='medium')lines.push(`${size.name} size: ${size.pointDelta>0?'+'+size.pointDelta+' earned points':Math.abs(size.pointDelta)+' points'}.`);
  if(mixedRaceCost())lines.push(`Mixed Race (${state.origin.parents.length} additional tree${state.origin.parents.length===1?'':'s'}): ${mixedRaceCost()} points.`);
  state.skills.forEach(r=>lines.push(`${r.name}${r.detail?' ['+r.detail+']':''} ${r.grade}: ${skillCost(r)} points${(state.origin.bornTargets||[]).includes(r.id)?' after racial discount':''}.`));
  state.techniques.forEach(r=>lines.push(`${r.detail||r.core} ${techniqueGrade(r)} [Technique: ${r.core}]: ${techniqueCost(r)} points.`));
  state.affinities.forEach(r=>lines.push(`${r.detail||r.core} ${r.grade} [Affinity: ${r.core}]: ${affinityCost(r)} points.`));
  state.equipment.forEach(r=>lines.push(`${r.name} ${r.grade} [${equipmentDefs(r).map(t=>t.name).join(', ')||'Unspecified Equipment'}]: ${equipmentCost(r)} points.`));
  systemAssets().forEach(r=>lines.push(`${r.name} F Asset: free from skill.`));
  state.assets.forEach(r=>lines.push(`${r.name} F Asset: ${assetCost(r)} points.`));
  state.customRows.forEach(r=>lines.push(`${r.name}${r.grade?' '+r.grade:''} (${r.section} override): ${Number(r.cost)||0} points.`));
  lines.push(`Total spent: ${totalSpent()} points.`);
  return lines.join('\n');
}
function copySheet(){const t=$('#sheetOutput').val()||generateSheet();$('#sheetOutput').val(t);navigator.clipboard?.writeText(t).then(()=>flashButton($('#btnCopySheet'),'Copied')).catch(()=>{const el=$('#sheetOutput')[0];el.select();document.execCommand('copy');flashButton($('#btnCopySheet'),'Copied')})}
function flashButton($b,text){const old=$b.text();$b.text(text);playUiSound('confirm');setTimeout(()=>$b.text(old),900)}
function exportJson(){const payload={...state,exportedAt:new Date().toISOString(),builderVersion:M.version,rulesSnapshot:M.rulesSnapshot};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(state.identity.name||'isekai-hell-character').replace(/[^a-z0-9_-]+/gi,'-').toLowerCase()+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0)}
function importJson(e){const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const obj=JSON.parse(rd.result);state=mergeState(obj);renderAll();alert('Character imported.')}catch(err){alert('Could not import that JSON file.')}e.target.value=''};rd.readAsText(f)}
function mergeState(o){
  const d=defaultState();const equipment=(Array.isArray(o.equipment)?o.equipment:[]).map(e=>({...e,types:Array.isArray(e.types)&&e.types.length?e.types:(e.type?[e.type]:['melee'])}));const assets=(Array.isArray(o.assets)?o.assets:[]).map(a=>({...a,createsTitle:a.createsTitle===undefined?true:!!a.createsTitle,titleName:a.titleName||(a.name||''),titleEquipped:!!a.titleEquipped}));const abilities=(Array.isArray(o.abilities)?o.abilities:[]).map(a=>({...a,components:Array.isArray(a.components)?a.components:[]}));const followers={...d.followers,...(o.followers||{}),minions:{...(o.followers?.minions||{})},companions:{...(o.followers?.companions||{})}};
  const classes=(Array.isArray(o.classes)?o.classes:[]).map(c=>({...c,overrideReason:c.overrideReason||''}));
  return {...d,...o,schema:4,appVersion:M.version,identity:{...d.identity,...(o.identity||{})},origin:{...d.origin,...(o.origin||{})},stats:{...d.stats,...(o.stats||{})},skills:Array.isArray(o.skills)?o.skills:[],techniques:Array.isArray(o.techniques)?o.techniques:[],affinities:Array.isArray(o.affinities)?o.affinities:[],equipment,assets,abilities,titles:Array.isArray(o.titles)?o.titles:[],classes,customRows:Array.isArray(o.customRows)?o.customRows:[],followers,ui:{...d.ui,...(o.ui||{}),ambient:false}};
}
function saveLocal(show){localStorage.setItem('ih-character-builder-save',JSON.stringify(state));if(show)flashButton($('#btnSaveLocal'),'Saved')}
function loadLocalIfPresent(promptUser){try{const raw=localStorage.getItem('ih-character-builder-save');if(raw&&(!promptUser||confirm('Load saved character?')))state=mergeState(JSON.parse(raw))}catch(_){}}
function openModal(title,body,onSave){$('#modalTitle').text(title);$('#modalBody').off('.equipment').html(body);modalSaveHandler=onSave;$modal[0].showModal();setTimeout(refreshFancySelects,0)}
function closeModal(){modalSaveHandler=null;$modal[0].close()}

$(init);
})(jQuery);
