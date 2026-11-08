(function($){
'use strict';
const M=window.IH_META, SKILLS=window.IH_SKILLS||[], TECHS=window.IH_TECHNIQUES||[], AFFS=window.IH_AFFINITIES||[], RACES=window.IH_RACES||[], RULES=window.IH_RULES;
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
let transformationEditor=null;
const FORM=window.IH_TRANSFORMATION;

function defaultState(){return {
  schema:8, appVersion:M.version, earnedPoints:0,
  identity:{name:'',player:'',raceTitle:'',imageUrl:'',height:'',weight:'',languages:['Common','Terran'],features:'',backstory:'',currentLife:''},
  origin:{type:'isekai',size:'medium',scoopPoints:0,evolutionPath:'variant',evolutionTier:'mundane',tree:'prime',parents:[],perk:'Chosen Path',chosenPathSkill:'',chosenPathDetail:'',bornTargets:[],versatileItem:'melee',versatileStat:'Strength',raceId:'',raceOverrideReason:'',freeSkillDetail:''},
  stats:{Strength:'F',Precision:'F',Intelligence:'F',Vitality:'F',Speed:'F'},
  skills:[], techniques:[], affinities:[], equipment:[], switchLinks:[], assets:[], abilities:[], titles:[], criminalTitles:[], classes:[], customRows:[],
  skillGrants:{}, followers:{buddy:null,minions:{},companions:{}},
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
function treeLanguage(treeId){return M.languageByTree?.[treeId]||'Common'}
function setPrimaryTree(treeId){
  const old=state.origin.tree, oldDefault=treeLanguage(old), langs=state.identity.languages||['Common',oldDefault];
  state.origin.tree=treeId;
  if(!langs[1]||langs[1]===oldDefault)langs[1]=treeLanguage(treeId);
  state.identity.languages=langs;
}
function isArtisanSkill(r){return String(r?.name||'').startsWith('Artisan')}
function artisanType(r){return String(r?.artisanType||r?.detail||'').trim()}
function artisanMaterial(r){return String(r?.artisanMaterial||'').trim()}
function artisanLabel(r){const a=artisanType(r)||'Unspecified Artisan',m=artisanMaterial(r);return m?`${a} / ${m}`:a}
function skillDisplayName(r){
  let name=String(r.name||'');
  if(isArtisanSkill(r)){const d=artisanLabel(r);return `Artisan [${d}]`}
  const d=String(r.detail||'').trim();
  if(!d)return name;
  if(/\[(?:type|stat|style name|profession type|name of profession|region|area)\]/i.test(name))return name.replace(/\[(?:type|stat|style name|profession type|name of profession|region|area)\]/i,()=>`[${d}]`);
  return `${name} [${d}]`;
}
function detailRequirement(r){
  if(!r)return null;
  if(isArtisanSkill(r))return (!artisanType(r)||!artisanMaterial(r))?'Specify both Artisan type/trade and material/specialty':null;
  const structured=RULES.details(r);if(structured)return structured;
  const need={"Area Knowledge":"Specify the area and/or locale this knowledge covers","Heightened Sense":"Specify which normal sense is heightened","Supersense":"Specify the additional sense granted","Sixth Sense":"Specify what supernatural perception is granted","Weaken [Stat]":"Specify the stat weakened","Bolster [Stat]":"Specify the stat bolstered","Language":"Specify the language learned"};
  return need[r.name]&&!String(r.detail||'').trim()?need[r.name]:null;
}
function chosenPathDetailInfo(name){
  const map={
    'Area Knowledge':['Area / Locale','Ryke / Ryken'],
    'Heightened Sense':['Sense Heightened','Hearing, Smell, Sight, Taste, or Touch'],
    'Supersense':['Supersense Granted','Echolocation, tremorsense, microscopic vision...'],
    'Sixth Sense':['Sixth Sense Granted','Danger, spirits, magic, intent...'],
    'Weaken [Stat]':['Stat Weakened','Strength, Precision, Intelligence, Vitality, or Speed'],
    'Bolster [Stat]':['Stat Bolstered','Strength, Precision, Intelligence, Vitality, or Speed'],
    'Language':['Language Learned','Sylvan, Terran, Beastial, Aquan...']
  };return map[name]||(/\[[^\]]+\]/.test(name)?['Skill specialization','Name the weapon, movement type, element, feature, or other required subject']:null);
}
function techniqueDisplayName(r){if(r.core==='Drain'){const stat=r.targetStat||'?';return r.detail?`${r.detail} [Drain: ${stat}]`:`Drain [${stat}]`}return r.detail||r.core}
function affinityDisplayName(r){if(r.core==='Drain'){const stat=r.targetStat||'?';return r.detail?`${r.detail} [Drain: ${stat}]`:`Drain [${stat}]`}return r.detail||r.core}
function chosenPathEligible(s){if(!s||s.baseCost!==7)return false;if((s.tags||[]).some(t=>['Suite','Core','Exclusive'].includes(t)))return false;const blocked=['Fighting Style [Style Name]','Magic','Educated','Tamer','Magic School: [name of a school of magic]','Magic Domain [magic name]','Martial Ethos [Weapon Type] (name)','Martial Mastery [Weapon Type] (name)'];if(blocked.includes(s.name)||s.name.startsWith('Masterwork ')||s.name.startsWith('Tamer '))return false;const token=s.name.replace(/\[[^\]]+\]/g,'').replace(/[^A-Za-z ]/g,'').trim();if(token.length>3&&SKILLS.some(o=>o!==s&&(o.prerequisite||'').toLowerCase().includes(token.toLowerCase())))return false;return true}
function acquiredSkills(){return [...state.skills,...RULES.educatedGrants(state).filter(r=>!(state.formDisabledGrantIds||[]).includes(r.id))]}
function findSkillRows(namePart,rows=acquiredSkills()){const q=namePart.toLowerCase(); return rows.filter(r=>r.name.toLowerCase().includes(q))}
function bestSkillGrade(namePart,rows=acquiredSkills()){let best=null;findSkillRows(namePart,rows).forEach(r=>{if(!best||gradeIndex(r.grade)>gradeIndex(best))best=r.grade});return best}
function bestSkillGradeExact(name,rows=acquiredSkills()){let best=null;rows.filter(r=>r.name===name).forEach(r=>{if(!best||gradeIndex(r.grade)>gradeIndex(best))best=r.grade});return best}
function standingGrade(){const p=pointsEarned();return M.standingThresholds.find(x=>p>=x.min).grade}
function pointAmount(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.floor(n)):0}
function pointsEarned(){const sz=M.sizes.find(s=>s.id===state.origin.size);return pointAmount(state.earnedPoints)+(sz&&sz.earned?sz.pointDelta:0)}
function statReductionBonus(){return Object.values(state.stats).reduce((sum,g)=>sum+(g==='G'?7:g==='H'?14:0),0)}
function pointsAtStart(){return 105+statReductionBonus()}
function availablePoints(){return pointsAtStart()+pointsEarned()}
function characterGrade(){let net=0;Object.values(state.stats).forEach(g=>{net+=(M.statStep[g]||0)});return gradeFromSteps(Math.floor(Math.max(0,net)/5))}
function sizeCost(){const sz=M.sizes.find(s=>s.id===state.origin.size);return sz&&sz.pointDelta<0?Math.abs(sz.pointDelta):0}
function mixedRaceCost(){return state.origin.evolutionPath==='hybrid'?7*(state.origin.parents||[]).length:0}
function skillCost(row){
  if(row.custom)return Number(row.cost)||0;
  const def=getSkillDef(row.name); if(!def)return Number(row.cost)||0;
  let c=skillCumulativeCost(RULES.price(row,def.baseCost),row.grade);
  if(row.grantedByEducated)return row.grantExtraPoints!=null?pointAmount(row.grantExtraPoints):Math.max(0,c-skillCumulativeCost(RULES.price(row,def.baseCost),row.grantBaseGrade));
  const targets=state.origin.bornTargets||[]; if(targets.includes(row.id))c=Math.max(0,c-7);
  return c;
}
function techniqueCost(row){
  const definition=TECHS.find(t=>t.name===row.core);const actualGrade=definition?.nonUpgrading?'F':row.grade;
  const style=state.skills.find(s=>s.id===row.styleId);
  if(!style)return skillCumulativeCost(definition?.baseCost||row.baseCost||7,actualGrade);
  if(style.specialized){
    if(definition?.nonUpgrading)return 7;
    return row.baseCost===14?35:21;
  }
  let c=skillCumulativeCost(definition?.baseCost||row.baseCost||7,actualGrade);
  const siblings=state.techniques.filter(t=>t.styleId===row.styleId);
  const slots=gradeIndex(style.grade)+1;
  const seen=[];let discountedIds=[];
  for(const t of siblings){const key=(t.core||t.name||'').toLowerCase();if(!seen.includes(key)){seen.push(key);if(discountedIds.length<slots)discountedIds.push(t.id)}}
  if(discountedIds.includes(row.id))c=Math.max(0,c-7);
  return c;
}
function techniqueGrade(row){if(TECHS.find(t=>t.name===row.core)?.nonUpgrading)return 'F';const style=state.skills.find(s=>s.id===row.styleId);return style&&style.specialized?style.grade:row.grade}
function affinityCost(row){const d=AFFS.find(a=>a.name===row.core);return skillCumulativeCost(d?.baseCost||row.baseCost||7,d?.nonUpgrading?'F':row.grade)}
function equipmentTypeIds(row){const ids=Array.isArray(row.types)&&row.types.length?row.types:(row.type?[row.type]:[]);return [...new Set(ids)].filter(id=>M.equipmentTypes.some(t=>t.id===id))}
function equipmentDefs(row){return equipmentTypeIds(row).map(id=>M.equipmentTypes.find(t=>t.id===id)).filter(Boolean)}
function equipmentBaseCost(row){const steps=gradeIndex(row.grade)+1;const perGrade=equipmentDefs(row).reduce((sum,t)=>sum+(t.natural?14:7),0);const mult=row.specialMaterial?2:1;return Math.max(0,steps)*perGrade*mult}
function artisanDiscount(row){
  const id=row.artisanDiscountSkillId;if(!id)return 0;const art=state.skills.find(s=>s.id===id&&isArtisanSkill(s));if(!art)return 0;
  if(gradeIndex(art.grade)<gradeIndex(row.grade))return 0;
  const normalTypes=equipmentDefs(row).filter(t=>!t.natural).length;if(!normalTypes)return 0;
  return (gradeIndex(row.grade)+1)*7*normalTypes;
}
function equipmentCost(row){return Math.max(0,equipmentBaseCost(row)-artisanDiscount(row))}
function assetCost(row){return Number(row.cost)||0}
function customRowsCost(){return state.customRows.reduce((s,r)=>s+(Number(r.cost)||0),0)}
function totalSpent(){
  let stat=0;Object.values(state.stats).forEach(g=>{if(['E','D','C','B','A'].includes(g))stat+=M.statCostFromF[g]||0});
  return stat+sizeCost()+mixedRaceCost()+acquiredSkills().reduce((s,r)=>s+skillCost(r),0)+state.techniques.reduce((s,r)=>s+techniqueCost(r),0)+state.affinities.reduce((s,r)=>s+affinityCost(r),0)+state.equipment.reduce((s,r)=>s+equipmentCost(r),0)+(state.switchLinks||[]).length*7+state.assets.reduce((s,r)=>s+assetCost(r),0)+customRowsCost();
}
function remainingPoints(){return availablePoints()-totalSpent()}
function powerGrade(){let best='F';const consider=g=>{if(g&&gradeIndex(g)>gradeIndex(best))best=g};acquiredSkills().forEach(x=>consider(x.grade));state.techniques.forEach(x=>consider(x.grade));state.affinities.forEach(x=>consider(x.grade));return best}
function gradeOptions(selected,max='A',min='F'){const a=gradeIndex(min),b=gradeIndex(max);return GRADE_ORDER.slice(a,b+1).map(g=>`<option ${g===selected?'selected':''}>${g}</option>`).join('')}
function statGradeOptions(selected){const allowed=pointsEarned()>0?['H','G','F','E','D','C','B','A']:['H','G','F','E','D','C','B'];const choices=allowed.includes(selected)?allowed:[...allowed,selected];return choices.map(g=>`<option value="${esc(g)}" ${g===selected?'selected':''} ${allowed.includes(g)?'':'disabled'}>${g}${allowed.includes(g)?'':g==='S'?' (tribulation required)':' (earned points required)'}</option>`).join('')}

function init(){
  $('#rulesVersion').text(M.rulesSnapshot);$('#builderVersion').text('v'+M.version);
  renderOriginStatic(); renderStats(); bindGlobal(); loadLocalIfPresent(false);const raceParam=new URLSearchParams(location.search).get('race');if(raceParam&&raceById(raceParam)){selectRaceTemplate(raceParam,true);history.replaceState(null,'',location.pathname)}else renderAll();
}
function bindGlobal(){
  $('#stepNav').on('click','.step',function(){showStep($(this).data('step'))});
  $('#mobileStepSelect').on('change',function(){if(this.value)showStep(this.value)});
  $('#mobileReview').on('click',()=>showStep('review'));
  $('#characterName').on('input',function(){state.identity.name=this.value;refreshSummary();renderPortraits()});
  $('#playerName').on('input',function(){state.identity.player=this.value});
  $('#raceTitle').on('input',function(){state.identity.raceTitle=this.value;renderTitles();renderRaceTemplatePanel();}).on('blur change',function(){linkRecognizedRaceTitle();renderAll()});
  $('#characterImageUrl').on('input',function(){state.identity.imageUrl=this.value.trim();clearTimeout(portraitTimer);portraitTimer=setTimeout(renderPortraits,350)}).on('change blur',renderPortraits);
  $('#height').on('input',function(){state.identity.height=this.value}); $('#weight').on('input',function(){state.identity.weight=this.value});
  $('#languageOne').on('input',function(){state.identity.languages=state.identity.languages||['Common',treeLanguage(state.origin.tree)];state.identity.languages[0]=this.value});
  $('#languageTwo').on('input',function(){state.identity.languages=state.identity.languages||['Common',treeLanguage(state.origin.tree)];state.identity.languages[1]=this.value});
  $('#featuresText').on('input',function(){state.identity.features=this.value});$('#backstory').on('input',function(){state.identity.backstory=this.value});$('#currentLife').on('input',function(){state.identity.currentLife=this.value});
  $('#originChoices').on('click','.choice-card',function(){state.origin.type=$(this).data('origin');if(state.origin.evolutionPath==='variant')state.origin.perk='Chosen Path';renderAll()});
  $('#sizeSelect').on('change',function(){state.origin.size=this.value;renderAll()});
  $('#earnedPoints').on('input change',function(){state.earnedPoints=pointAmount(this.value);renderAll()});
  $('#evolutionPath').on('change',function(){state.origin.evolutionPath=this.value;if(this.value==='variant')state.origin.perk='Chosen Path';else if(this.value==='hybrid')state.origin.perk='Born For These';else state.origin.perk='';renderAll()});
  $('#evolutionTier').on('change',function(){state.origin.evolutionTier=this.value;renderAll()});
  $('#raceTemplateSelect').on('change',function(){selectRaceTemplate(this.value,true)});
  $('#raceSearch').on('input',renderRaceCatalog);
  $('#raceTreeFilters').on('click','button[data-race-tree]',function(){state.ui.raceFilterTree=$(this).data('race-tree');renderRaceCatalog();});
  $('#raceCatalog').on('click','button[data-select-race]',function(e){e.preventDefault();e.stopPropagation();selectRaceTemplate($(this).data('select-race'),true)});
  $('#raceTemplatePanel').on('input','#raceOverrideReason',function(){state.origin.raceOverrideReason=this.value;renderReview(false)});
  $('#treeSelect').on('change',function(){setPrimaryTree(this.value);renderAll()});
  $('#freeAreaKnowledgeDetail').on('input',function(){state.origin.freeSkillDetail=this.value;renderSelectedSkills();refreshSummary();renderReview(false)});
  $('#hybridParents').on('change',function(){state.origin.parents=$(this).val()||[];renderAll()});
  $('#racialPerk').on('change',function(){state.origin.perk=this.value;renderAll()});
  $('#chosenPathSkill').on('change',function(){if(state.origin.chosenPathSkill!==this.value)state.origin.chosenPathDetail='';state.origin.chosenPathSkill=this.value;renderAll()});
  $('#chosenPathDetail').on('input',function(){state.origin.chosenPathDetail=this.value;renderSelectedSkills();refreshSummary();renderReview(false)});
  $('#bornForThisTarget').on('change',function(){state.origin.bornTargets=$(this).val()?([].concat($(this).val())):[];renderAll()});
  $('#versatileItem').on('change',function(){state.origin.versatileItem=this.value;renderAll()});$('#versatileStat').on('change',function(){state.origin.versatileStat=this.value;renderAll()});
  $('#statsGrid').on('change','select',function(){state.stats[$(this).data('stat')]=this.value;renderAll()});
  // A text input's blur-time change fires before the pending card click.
  // Replacing the catalog then discards the clicked node, swallowing that click.
  $('#skillSearch').on('input',renderSkillCatalog);$('#skillCategory').on('change',renderSkillCatalog);
  $('#skillCatalog').on('click','button[data-add-skill]',function(e){e.stopPropagation();addSkill($(this).data('add-skill'))}).on('click','.catalog-item[data-preview-skill]',function(){state.ui.skillPreview=$(this).data('preview-skill');renderSkillCatalog();renderSkillPreview()});
  $('#selectedSkills').on('click','button[data-remove-custom]',function(){state.customRows=state.customRows.filter(x=>x.id!==$(this).data('remove-custom'));renderAll()}).on('click','button[data-edit]',function(){editSkill($(this).data('edit'))}).on('click','button[data-remove]',function(){state.skills=state.skills.filter(x=>x.id!==$(this).data('remove'));renderAll()});
  $('#btnAddCustomSkill').on('click',addCustomRow);
  $('#btnAddTechnique').on('click',()=>editTechnique()); $('#techniqueList').on('click','button[data-edit-tech]',function(){editTechnique($(this).data('edit-tech'))}).on('click','button[data-remove-tech]',function(){state.techniques=state.techniques.filter(x=>x.id!==$(this).data('remove-tech'));renderAll()});
  $('#btnAddAffinity').on('click',()=>editAffinity()); $('#affinityList').on('click','button[data-edit-aff]',function(){editAffinity($(this).data('edit-aff'))}).on('click','button[data-remove-aff]',function(){state.affinities=state.affinities.filter(x=>x.id!==$(this).data('remove-aff'));renderAll()});
  $('#btnAddEquipment').on('click',()=>editEquipment()); $('#equipmentList').on('click','button[data-remove-custom]',function(){state.customRows=state.customRows.filter(x=>x.id!==$(this).data('remove-custom'));renderAll()}).on('click','button[data-edit-eq]',function(){editEquipment($(this).data('edit-eq'))}).on('click','button[data-remove-eq]',function(){state.equipment=state.equipment.filter(x=>x.id!==$(this).data('remove-eq'));renderAll()});
  $('#btnAddSwitchEquipment').on('click',()=>editSwitchEquipment()); $('#switchEquipmentList').on('click','button[data-edit-switch]',function(){editSwitchEquipment($(this).data('edit-switch'))}).on('click','button[data-remove-switch]',function(){state.switchLinks=(state.switchLinks||[]).filter(x=>x.id!==$(this).data('remove-switch'));renderAll()});
  $('#skillGrantWorkspace').on('input change','[data-grant-field]',handleSkillGrantField).on('change','[data-form-field]',handleTransformationField).on('click','[data-form-edit]',openTransformationEntry).on('click','[data-form-delete]',deleteTransformationEntry);
  $modal.on('cancel',function(){if(transformationEditor)restoreTransformationEditor(false)}).on('close',function(){if(transformationEditor)restoreTransformationEditor(false)});
  $('#btnAddAsset').on('click',()=>editAsset()); $('#assetList').on('click','button[data-remove-custom]',function(){state.customRows=state.customRows.filter(x=>x.id!==$(this).data('remove-custom'));renderAll()}).on('click','button[data-edit-asset]',function(){editAsset($(this).data('edit-asset'))}).on('click','button[data-remove-asset]',function(){state.assets=state.assets.filter(x=>x.id!==$(this).data('remove-asset'));renderAll()});
  $('#btnAddAbility').on('click',()=>editAbility()); $('#abilityList').on('click','button[data-edit-ability]',function(){editAbility($(this).data('edit-ability'))}).on('click','button[data-remove-ability]',function(){state.abilities=state.abilities.filter(x=>x.id!==$(this).data('remove-ability'));renderAll()});
  $('#btnAddTitle').on('click',()=>editTitle()); $('#titleList').on('click','button[data-equip-title]',function(){const t=state.titles.find(x=>x.id===$(this).data('equip-title'));if(t)t.equipped=!t.equipped;renderAll()}).on('click','button[data-equip-class]',function(){equipClass($(this).data('equip-class'));}).on('click','button[data-equip-asset-title]',function(){const a=state.assets.find(x=>x.id===$(this).data('equip-asset-title'));if(a)a.titleEquipped=!a.titleEquipped;renderAll()}).on('click','button[data-remove-title]',function(){state.titles=state.titles.filter(x=>x.id!==$(this).data('remove-title'));renderAll()});
  $('#btnAddCriminalTitle').on('click',()=>editCriminalTitle());$('#criminalTitleList').on('click','button[data-edit-crime]',function(){editCriminalTitle($(this).data('edit-crime'))}).on('click','button[data-remove-crime]',function(){if(confirm('Remove this record only to correct an entry or after staff has cleared the criminal title. Continue?')){state.criminalTitles=state.criminalTitles.filter(t=>t.id!==$(this).data('remove-crime'));renderAll()}});
  $('#classChecks').on('click','button[data-equip-class]',function(){equipClass($(this).data('equip-class'))}).on('click','button[data-class-acquire]',function(){acquireClass($(this).data('class-acquire'))}).on('click','button[data-class-override]',function(){requestClassOverride($(this).data('class-override'))}).on('click','button[data-class-remove]',function(){removeClass($(this).data('class-remove'))});
  $('#jobTitleSuggestions').on('click','button[data-job-title]',function(){acceptJobTitleSuggestion($(this).data('job-title'))});
  $('#followerWorkspace').on('change','[data-follower-field]',handleFollowerField).on('click','button[data-add-companion]',function(){addCompanion($(this).data('add-companion'))}).on('click','button[data-remove-companion]',function(){removeCompanion($(this).data('pool'),$(this).data('remove-companion'))});
  $('#btnGenerateSheet').on('click',()=>{$('#sheetOutput').val(generateSheet());playUiSound('confirm')}); $('#btnCopySheet').on('click',copySheet);
  $('#btnExport').on('click',exportJson);$('#btnImport').on('click',()=>$('#fileImport').trigger('click'));$('#fileImport').on('change',importJson);$('#btnSaveLocal').on('click',()=>saveLocal(true));
  $('#btnReset').on('click',resetBuilder);$('#btnSound').on('click',toggleSound);$('#btnAmbient').on('click',toggleAmbient);$('#btnTrack').on('click',cycleAmbientTrack);
  $('#modalSave').on('click',function(){if(modalSaveHandler)modalSaveHandler()});
  $(document).on('pointerdown','.ui-btn,.step,.choice-card,.site-link,.race-card summary,.class-card summary,.grant-section summary',function(){if(this.id!=='btnSound')playUiSound('click')});
  $(document).on('change','select,input[type="checkbox"],input[type="radio"]',function(){playUiSound('select')});
  $(document).on('mouseenter focusin','.ui-btn,.step,.choice-card,.site-link,.race-card summary,.class-card summary,.grant-section summary,.select2-selection',function(){if($(this).is(':disabled'))return;const now=performance.now();if(now-lastHoverSound>75){lastHoverSound=now;playUiSound('hover')}});
}
function showStep(step){$('.step').removeClass('active').filter(`[data-step="${step}"]`).addClass('active');$('.step-panel').removeClass('active').filter(`[data-panel="${step}"]`).addClass('active');$('#mobileStepSelect').val(step).trigger('change.select2');if(step==='review')renderReview();if(step==='crafting')renderCrafting();playUiSound('transition');window.scrollTo({top:0,behavior:'smooth'})}
function renderOriginStatic(){
  $('#originChoices').html(Object.entries(M.origins).map(([id,o])=>`<div class="choice-card" data-origin="${id}"><strong>${esc(o.name)}</strong><span>${esc(o.freeSkillNote)}</span></div>`).join(''));
  $('#sizeSelect').html(M.sizes.map(s=>`<option value="${s.id}">${s.name}${s.pointDelta>0?' (+'+s.pointDelta+' pts)':s.pointDelta<0?' ('+s.pointDelta+' pts)':''}</option>`).join(''));
  const treeOptions=M.trees.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');$('#treeSelect').html(treeOptions);$('#hybridParents').html(treeOptions);
  const raceOptions=RACES.slice().sort((a,b)=>a.tree.localeCompare(b.tree)||a.stage.localeCompare(b.stage)||a.name.localeCompare(b.name)).map(r=>`<option value="${esc(r.id)}">${esc(r.tree+' // '+r.stage+' // '+r.name)}</option>`).join('');$('#raceTemplateSelect').html('<option value="">Custom / write-in race</option>'+raceOptions);
  $('#raceTreeFilters').html(['All',...M.trees.map(t=>t.name),'Hybrid'].filter((v,i,a)=>a.indexOf(v)===i).map(t=>`<button type="button" class="race-tree-button" data-race-tree="${esc(t)}">${esc(t)}</button>`).join(''));
  const cats=[...new Set(SKILLS.map(s=>s.category))];$('#skillCategory').append(cats.map(c=>`<option>${esc(c)}</option>`).join(''));
}
function renderAll(){
  syncIdentityFields();renderPortraits();renderSoundButton();renderAmbientButton();renderOrigin();renderRaceTemplatePanel();renderRaceCatalog();renderStats();renderSkillCatalog();renderSkillPreview();syncSkillGrants();renderSelectedSkills();renderSkillGrants();renderTechniques();renderAffinities();syncSwitchLinks();renderEquipment();renderCrafting();syncFollowerEntitlements();renderAssets();renderFollowers();renderAbilities();syncAutoClasses();renderTitles();renderJobTitleSuggestions();renderClasses();renumberSteps();refreshSummary();renderReview(false);refreshFancySelects();
}
function syncIdentityFields(){
  const map={characterName:'name',playerName:'player',raceTitle:'raceTitle',characterImageUrl:'imageUrl',height:'height',weight:'weight',featuresText:'features',backstory:'backstory',currentLife:'currentLife'};
  Object.entries(map).forEach(([id,k])=>{if(document.activeElement!==document.getElementById(id))$('#'+id).val(state.identity[k]||'')});
  state.identity.languages=Array.isArray(state.identity.languages)?state.identity.languages:['Common',treeLanguage(state.origin.tree)];
  if(document.activeElement!==document.getElementById('languageOne'))$('#languageOne').val(state.identity.languages[0]||'');
  if(document.activeElement!==document.getElementById('languageTwo'))$('#languageTwo').val(state.identity.languages[1]||'');
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
  $('#evolutionTier').val(state.origin.evolutionTier||'mundane');
  $('#sizeSelect').val(state.origin.size);$('#earnedPoints').val(state.earnedPoints||0);$('#evolutionPath').val(state.origin.evolutionPath);$('#raceTemplateSelect').val(state.origin.raceId||'');$('#treeSelect').val(state.origin.tree);$('#hybridParents').val(state.origin.parents||[]);
  const sz=M.sizes.find(s=>s.id===state.origin.size);$('#sizeNote').text(sz?`${sz.height}; ${sz.weight}. ${sz.notes}`:'');
  const tree=M.trees.find(t=>t.id===state.origin.tree);$('#treeWarning').text(tree&&tree.warning?tree.warning:'');
  $('#hybridParentsWrap').toggleClass('hidden',state.origin.evolutionPath!=='hybrid');
  let perks=[];
  if(state.origin.evolutionPath==='variant')perks=['Chosen Path']; else if(state.origin.evolutionPath==='hybrid')perks=['Born For These']; else perks=(tree?tree.perks:[]);
  $('#racialPerk').html(perks.map(p=>`<option>${esc(p)}</option>`).join(''));if(!perks.includes(state.origin.perk))state.origin.perk=perks[0]||'';$('#racialPerk').val(state.origin.perk);
  const chosen=state.origin.perk==='Chosen Path';$('#chosenPathWrap').toggleClass('hidden',!chosen);
  const eligibleChosen=SKILLS.filter(chosenPathEligible);
  $('#chosenPathSkill').html('<option value="">Choose...</option>'+eligibleChosen.map(s=>`<option value="${esc(s.name)}">${esc(s.name)}</option>`).join('')).val(state.origin.chosenPathSkill);
  const cpInfo=chosen?chosenPathDetailInfo(state.origin.chosenPathSkill):null;$('#chosenPathDetailWrap').toggleClass('hidden',!cpInfo);if(cpInfo){$('#chosenPathDetailLabel').text(cpInfo[0]);$('#chosenPathDetail').attr('placeholder',cpInfo[1]).val(state.origin.chosenPathDetail||'');$('#chosenPathDetailNote').text('Chosen Path removes normal prerequisites, but the skill still needs its subject or specialization identified.')}
  const born=/Born For/.test(state.origin.perk);$('#bornForThisWrap').toggleClass('hidden',!born);
  const opts=state.skills.map(s=>`<option value="${s.id}">${esc(skillDisplayName(s))}</option>`).join('');
  $('#bornForThisTarget').prop('multiple',state.origin.evolutionPath==='hybrid').attr('size',state.origin.evolutionPath==='hybrid'?Math.min(5,Math.max(2,state.skills.length)):1).html(opts).val(state.origin.bornTargets||[]);
  const reqs=[];
  if(state.origin.evolutionPath==='variant')reqs.push('Variant Mundane has no racial build requirements. Chosen Path can replace your origin free skill with an eligible 7-point skill that follows Standing and ignores its normal prerequisites.');
  else if(state.origin.evolutionPath==='hybrid'){
    const trees=[state.origin.tree,...(state.origin.parents||[])].filter((v,i,a)=>a.indexOf(v)===i);reqs.push('Hybrid requires the Mundane requirements of every parent tree and Mixed Race for each additional tree.');trees.forEach(id=>{const t=M.trees.find(x=>x.id===id);if(t)reqs.push(`${t.name}: ${t.nativeRequirements.join('; ')}`)});
  } else if(tree)reqs.push(...tree.nativeRequirements);
  $('#raceRequirements').html('<strong>Creation requirements:</strong><br>'+reqs.map(esc).join('<br>'));
  const showFreeArea=state.origin.type==='native'&&state.origin.perk!=='Chosen Path';$('#freeAreaKnowledgeWrap').toggleClass('hidden',!showFreeArea);$('#freeAreaKnowledgeDetail').val(state.origin.freeSkillDetail||'');
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
function addSkill(name){
  const def=getSkillDef(name);if(!def)return;
  const row={id:uid('sk'),name:def.name,grade:'F',detail:'',artisanType:'',artisanMaterial:'',specialized:false,notes:'',limiters:[]};
  if(name==='Educated'||detailRequirement(row)||RULES.suiteKind(row)||RULES.facilities[name]||['Capacity','Chameleon','Scrying'].includes(name)||name.startsWith('Masterwork')){editSkill(null,name);return}
  const initialCheck=validateSkill(row);if(!initialCheck.ok){alert(initialCheck.message);return}
  state.skills.push(row);renderAll();
  if(['Item','Transformation'].includes(row.name))setTimeout(()=>showStep('grants'),0);else if(detailRequirement(row))setTimeout(()=>editSkill(row.id),0);
}
function renderSelectedSkills(){
  const virtual=freeSkillDisplay();
  let html=virtual?`<div class="selected-row"><div><div class="row-title">${esc(virtual.name)} <span class="pill">FREE</span></div><div class="row-meta">${virtual.grade} // ${esc(virtual.note)}</div></div></div>`:'';
  html+=state.skills.map(r=>{const v=validateSkill(r),c=skillCost(r);return `<div class="selected-row ${v.ok?'':'invalid'}"><div><div class="row-title">${esc(skillDisplayName(r))} ${r.specialized?'<span class="pill">SPECIALIZED</span>':''}</div><div class="row-meta">${r.grade}${limiterTotal(r)?'('+skillEffectGrade(r)+')':''} // ${c} pts // <span class="${v.ok?'status-good':'status-bad'}">${esc(v.message)}</span>${limiterTotal(r)?' // '+esc((r.limiters||[]).map(l=>l.type+' '+l.rank+(l.detail?' ['+l.detail+']':'')).join(', ')):''}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-edit="${r.id}">Edit</button><button class="ui-btn small danger" data-remove="${r.id}">×</button></div></div>`}).join('');
  html+=RULES.educatedGrants(state).map(child=>{const v=validateSkill(child);return `<div class="selected-row ${v.ok?'':'invalid'} educated-grant"><div><div class="row-title">${esc(skillDisplayName(child))} <span class="pill">EDUCATED GRANT</span></div><div class="row-meta">${child.grade} // ${skillCost(child)} extra pts // ${esc(v.message)}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-edit="${esc(child.grantedByEducated)}">Edit bundle</button></div></div>`}).join('');
  html+=state.customRows.filter(r=>['Skill','Feature','Other'].includes(r.section)).map(r=>`<div class="selected-row"><div><div class="row-title">${esc(r.name)} <span class="pill">CUSTOM ${esc(r.section.toUpperCase())}</span></div><div class="row-meta">${r.grade||''} // ${Number(r.cost)||0} pts${r.notes?' // '+esc(r.notes):''}</div></div><div class="row-actions"><button class="ui-btn small danger" data-remove-custom="${r.id}">×</button></div></div>`).join('');
  $('#selectedSkills').html(html||'<div class="muted">No skills selected.</div>');
}
function freeSkillDisplay(){
  if(state.formDisableOriginSkill)return null;
  const sg=standingGrade();
  if(state.origin.perk==='Chosen Path'){
    if(!state.origin.chosenPathSkill)return null;
    const d=String(state.origin.chosenPathDetail||'').trim(),base=state.origin.chosenPathSkill;return {name:base+(d?` [${d}]`:''),baseName:base,detail:d,grade:sg,note:'Chosen Path; grows with Standing and ignores normal prerequisites'};
  }
  const o=M.origins[state.origin.type];if(!o)return null;
  const detail=o.freeSkill==='Area Knowledge'?String(state.origin.freeSkillDetail||'').trim():'';
  return {name:o.freeSkill+(detail?` [${detail}]`:''),baseName:o.freeSkill,detail,grade:sg,note:o.freeSkillNote};
}
function ruleContext(){return {state:{...state,skills:acquiredSkills()},skills:SKILLS,meta:M,techniques:TECHS,affinities:AFFS,techniqueGrade,standingGrade,characterGrade,allowedStats:equipmentAllowedStats,equipmentTypes:equipmentTypeIds,validateSkill}}
function ruleSelect(id,label,options,selected,multiple=false){return `<label>${esc(label)}<select class="no-enhance" id="${id}" ${multiple?'multiple size="6"':''}>${multiple?'':'<option value="">Choose...</option>'}${options.map(o=>{const v=typeof o==='string'?o:o.value,t=typeof o==='string'?o:o.label;return `<option value="${esc(v)}" ${([].concat(selected||'')).includes(v)?'selected':''}>${esc(t)}</option>`}).join('')}</select></label>`}
function skillRuleFields(r){
  let h='';const opts=rows=>rows.map(s=>({value:s.id,label:`${skillDisplayName(s)} ${s.grade}`}));
  if(r.name==='Educated'){
    h+=`<label>Background / job title<input id="mEduBackground" value="${esc(r.educatedBackground||'')}" placeholder="Academy Graduate, Caravan Apprentice, Village Healer..."></label><small>Choose three Secondary skills (Artisan is excluded). Their individual prerequisites are waived; the character must meet Educated’s own prerequisite. They grow with Educated for free, count for class requirements, and normally cannot satisfy racial requirements. Individual upgrades pay only the difference above the current linked grade. Later Educated upgrades do not refund earlier individual purchases.</small>`;
    const choices=r.educatedChoices||[],available=SKILLS.filter(s=>s.category==='Secondary'&&!isArtisanSkill(s));
    for(let i=0;i<3;i++){
      const child=choices[i]||{};h+=`<fieldset class="foundation-choices educated-choice"><legend>Granted skill ${i+1}</legend>${ruleSelect(`mEduSkill${i}`,'Secondary skill',available.map(s=>s.name),child.name)}<label>Subject / specialization (when required)<input id="mEduDetail${i}" value="${esc(child.detail||'')}" placeholder="Language, area, specific profession, craft type..."></label>${ruleSelect(`mEduUpgrade${i}`,'Individual upgrade (above Educated only)',GRADE_ORDER.slice(0,6),child.upgradeGrade||'F')}`;
      if(String(child.name||'').startsWith('Profession'))h+=ruleSelect(`mEduStat${i}`,'Profession governing stat',RULES.stats,child.governingStat);
      if(/^(Masterwork Maker|Masterwork Refiner)/.test(child.name||''))h+=ruleSelect(`mEduCraft${i}`,'Masterwork specialty',Object.keys(child.name.startsWith('Masterwork Maker')?RULES.makerStats:RULES.refinerStats),child.craftType);
      h+='</fieldset>';
    }
  }
  if(RULES.isStyle(r)){
    h+=ruleSelect('mWeaponTypes','Weapon types',RULES.weapons.map(w=>w.name),r.weaponTypes,true);
    h+=`<small>Start with one weapon type. Generalist adds weapon types; a specialized style cannot use Generalist. Other styles remain allowed.</small><label>Other weapon name<input id="mOtherWeapon" value="${esc(r.otherWeaponType||'')}"></label>`;
    h+=ruleSelect('mOtherWeaponCategory','Other weapon category',[{value:'melee',label:'Melee'},{value:'ranged',label:'Ranged'},{value:'shield',label:'Shield'},{value:'natural-melee',label:'Natural melee'},{value:'natural-ranged',label:'Natural ranged'}],r.otherWeaponCategory);
  }
  if(r.name.startsWith('Profession'))h+=ruleSelect('mGoverningStat','Profession governing stat',RULES.stats,r.governingStat);
  if(r.name.startsWith('Masterwork Maker')||r.name.startsWith('Masterwork Refiner'))h+=ruleSelect('mCraftType','Masterwork specialty',Object.keys(r.name.startsWith('Masterwork Maker')?RULES.makerStats:RULES.refinerStats),r.craftType);
  if(r.name==='Special Movement [movement type]')h+=ruleSelect('mMovementType','Special Movement type',Object.entries(RULES.movements).map(([value,cost])=>({value,label:`${value} (${cost} pts/grade)`})),r.movementType);
  if(r.name==='Resistance [Element]')h+=ruleSelect('mResistanceType','Resistance coverage',[{value:'specific',label:'Individual damage type (7 pts/grade)'},{value:'physical',label:'Full Physical/Mundane (21 pts/grade)'},{value:'magical',label:'Full Magical (70 pts/grade)'}],r.resistanceType||(RULES.price(r,7)===21?'physical':RULES.price(r,7)===70?'magical':'specific'));
  if(RULES.facilities[r.name]){h+=ruleSelect('mTamerSkill','Tamer skill',opts(state.skills.filter(s=>s.name==='Tamer')),r.tamerSkillId);h+=ruleSelect('mFacilityAsset',`${RULES.facilities[r.name]} Asset`,state.assets.filter(a=>a.assetKind===RULES.facilities[r.name]).map(a=>({value:a.id,label:`${a.name} ${a.grade}`})),r.facilityAssetId);h+=`<small>Add the matching facility type under Gear & Assets first.</small>`}
  if(r.name==='Elasticity')h+=`<label class="checkbox-row"><input id="mFullBody" type="checkbox" ${r.fullBody?'checked':''}> Elasticity applies to the full body (can qualify for Capacity)</label>`;
  if(r.name==='Capacity')h+=ruleSelect('mElasticitySkill','Full-body Elasticity (if not Large/Huge)',opts(state.skills.filter(s=>s.name==='Elasticity'&&s.fullBody)),r.elasticitySkillId);
  if(r.name==='Chameleon')h+=`<small>Requires Hybrid/Mixed Race and recorded Intermediate or Ascended evolution in Origin & Race.</small>`;
  if(r.name==='Scrying'){
    const focuses=[...state.assets.map(x=>({value:'asset:'+x.id,label:`Asset: ${x.name} ${x.grade}`})),...state.equipment.map(x=>({value:'equipment:'+x.id,label:`Equipment: ${x.name} ${x.grade}`})),...state.skills.filter(x=>['Gear','Item'].includes(x.name)).map(x=>({value:'skill:'+x.id,label:`${skillDisplayName(x)} ${x.grade}`}))];
    h+=ruleSelect('mScryingFocus','Possessed item/asset used as the scrying focus',focuses,r.focusRef);h+='<small>Choose the crystal ball, mirror, pool, or equivalent that actually enables scrying. Scrying cannot be used in a post with a move action.</small>';
  }
  const kind=RULES.suiteKind(r);
  if(kind){
    if(kind==='mastery'||kind==='domain')h+=ruleSelect('mParentSkill',kind==='mastery'?'Parent Martial Ethos':'Parent Magic School',opts(state.skills.filter(s=>RULES.suiteKind(s)===(kind==='mastery'?'ethos':'school'))),r.parentSkillId);
    if(kind==='ethos'||kind==='mastery'){
      h+=ruleSelect('mFoundationStyle','One Fighting Style',opts(state.skills.filter(RULES.isStyle)),r.styleId);
      const style=state.skills.find(s=>s.id===r.styleId);h+=ruleSelect('mFoundationWeapon','One weapon type for this collection',style?.weaponTypes||[],r.foundationWeapon);
    }else if(kind==='school')h+=ruleSelect('mMagicSkill','Magic skill',opts(state.skills.filter(s=>s.name==='Magic')),r.magicSkillId);
    if(kind==='school')h+=`<label>School teachings and common spells<textarea id="mSchoolDescription" rows="3">${esc(r.schoolDescription||'')}</textarea></label>`;
    const parent=state.skills.find(s=>s.id===r.parentSkillId),excluded=new Set(parent?.foundationRefs||[]);
    const pool=RULES.foundationPool(r,ruleContext()).filter(p=>!excluded.has(p.ref));
    h+=`<fieldset class="foundation-choices"><legend>Five acquired foundation entries</legend><small>${kind==='mastery'||kind==='domain'?'Choose five additional entries outside the parent collection.':'Choose five different cores/affinities; at most one of Penetrating, Linked, Homing, Deflect, Accurate.'} Every entry must support this skill’s grade.</small><div class="checkbox-row">${pool.map(p=>`<label><input name="mFoundation" type="checkbox" value="${esc(p.ref)}" ${(r.foundationRefs||[]).includes(p.ref)?'checked':''}> ${esc(p.name)} [${esc(p.core)}] ${p.grade}</label>`).join('')||'<p>No acquired entries for this collection. Purchase its foundations first.</p>'}</div></fieldset>`;
  }
  return h;
}
function readSkillRuleFields(r){
  if(r.name==='Educated'){
    r.educatedBackground=$('#mEduBackground').val()?.trim()||'';
    r.educatedChoices=[0,1,2].map(i=>({name:$(`#mEduSkill${i}`).val()||'',detail:$(`#mEduDetail${i}`).val()?.trim()||'',upgradeGrade:$(`#mEduUpgrade${i}`).val()||'F',governingStat:$(`#mEduStat${i}`).val()||'',craftType:$(`#mEduCraft${i}`).val()||''}));
    r.educatedChoices.forEach(c=>{if(c.craftType&&!c.detail)c.detail=c.craftType});
  }
  const read=(selector,key)=>{if($(selector).length)r[key]=$(selector).val()||''};
  [['#mWeaponTypes','weaponTypes'],['#mOtherWeapon','otherWeaponType'],['#mOtherWeaponCategory','otherWeaponCategory'],['#mGoverningStat','governingStat'],['#mCraftType','craftType'],['#mMovementType','movementType'],['#mTamerSkill','tamerSkillId'],['#mFacilityAsset','facilityAssetId'],['#mElasticitySkill','elasticitySkillId'],['#mScryingFocus','focusRef'],['#mParentSkill','parentSkillId'],['#mFoundationStyle','styleId'],['#mFoundationWeapon','foundationWeapon'],['#mMagicSkill','magicSkillId'],['#mSchoolDescription','schoolDescription']].forEach(([a,b])=>read(a,b));
  if(RULES.isStyle(r))r.weaponTypes=Array.isArray(r.weaponTypes)?r.weaponTypes:[];
  if($('#mFullBody').length)r.fullBody=$('#mFullBody').is(':checked');
  if($('#mResistanceType').length){r.resistanceType=$('#mResistanceType').val();if(r.resistanceType==='physical')r.detail='Physical';if(r.resistanceType==='magical')r.detail='Magical'}
  if(r.movementType&&r.movementType!=='Other')r.detail=r.movementType;
  if(r.craftType&&!r.detail)r.detail=r.craftType;
  if(RULES.suiteKind(r))r.foundationRefs=$('input[name=mFoundation]:checked').map((_,e)=>e.value).get();
}
function skillRuleSummary(r){
  const parts=[];
  if(r.name==='Educated')parts.push(`Background: ${r.educatedBackground||'UNDEFINED'}`);
  if(RULES.isStyle(r))parts.push(`Weapons: ${(r.weaponTypes||[]).map(w=>w==='Other'?r.otherWeaponType:w).join(', ')}`);
  if(r.governingStat)parts.push(`Governing stat: ${r.governingStat}`);if(r.craftType)parts.push(`Specialty: ${r.craftType}`);
  if(r.fullBody)parts.push('Full-body Elasticity');
  if(RULES.suiteKind(r)){
    const source=state.skills.find(s=>s.id===(r.parentSkillId||r.styleId||r.magicSkillId));if(source)parts.push(`Based on: ${skillDisplayName(source)} ${source.grade}`);
    if(r.foundationWeapon)parts.push(`Weapon: ${r.foundationWeapon}`);
    const pool=RULES.foundationPool(r,ruleContext());parts.push(`Foundations: ${(r.foundationRefs||[]).map(ref=>{const p=pool.find(p=>p.ref===ref);return p?`${p.name} [${p.core}] ${p.grade}`:'MISSING '+ref}).join('; ')}`);
    if(r.schoolDescription)parts.push(`Teachings: ${r.schoolDescription}`);
  }
  if(r.facilityAssetId){const a=state.assets.find(a=>a.id===r.facilityAssetId);parts.push(`Facility: ${a?a.name+' '+a.grade:'MISSING'}`)}
  if(r.focusRef){const [kind,id]=r.focusRef.split(':'),x=(kind==='asset'?state.assets:kind==='equipment'?state.equipment:state.skills).find(x=>x.id===id);parts.push(`Scrying focus: ${x?(x.name||x.detail)+' '+x.grade:'MISSING'}`)}
  return parts.join(' / ');
}
function finalizeEducatedChoices(row,saved){
  if(row.name!=='Educated')return;
  row.educatedChoices.forEach((choice,i)=>{
    const old=saved?.educatedChoices?.[i],same=old&&old.name===choice.name&&String(old.detail||'')===choice.detail;
    const cost=getSkillDef(choice.name)?.baseCost||0,target=gradeIndex(choice.upgradeGrade||'F');
    if(!same){choice.extraPointsPaid=Math.max(0,target-gradeIndex(row.grade))*cost;return}
    const oldTarget=gradeIndex(old.upgradeGrade||'F'),oldPaid=old.extraPointsPaid??Math.max(0,oldTarget-gradeIndex(saved.grade))*cost;
    if(target===oldTarget)choice.extraPointsPaid=oldPaid;
    else if(target>oldTarget)choice.extraPointsPaid=oldPaid+Math.max(0,target-Math.max(oldTarget,gradeIndex(saved.grade),gradeIndex(row.grade)))*cost;
    else choice.extraPointsPaid=Math.max(0,oldPaid-(oldTarget-target)*cost);
  });
}
function editSkill(id,newName){
  const saved=state.skills.find(x=>x.id===id);if(!saved&&!newName)return;
  const r=saved?JSON.parse(JSON.stringify(saved)):{id:uid('sk'),name:newName,grade:'F',detail:'',artisanType:'',artisanMaterial:'',specialized:false,notes:'',limiters:[]};const def=getSkillDef(r.name)||{};
  const spec=r.name.startsWith('Fighting Style');
  let detailHtml='';
  if(isArtisanSkill(r)){
    detailHtml=`<div class="modal-form two"><label>Artisan Type / Trade<input id="mArtisanType" value="${esc(artisanType(r))}" placeholder="Blacksmith, Bowyer, Artificer, Leatherworker..."></label><label>Material / Specialty<input id="mArtisanMaterial" value="${esc(artisanMaterial(r))}" placeholder="Metal, wood, leather, runes, glass..."></label></div><small>Both fields matter. Artisan discounts only apply when the equipment's material/construction is within this specialty.</small>`;
  }else if(r.name==='Educated'){
    detailHtml='';
  }else if(['Weaken [Stat]','Bolster [Stat]'].includes(r.name)){
    const opts=['Strength','Precision','Intelligence','Vitality','Speed'].map(x=>`<option ${x===r.detail?'selected':''}>${x}</option>`).join('');
    detailHtml=`<label>Target Stat<select id="mDetail"><option value="">Choose stat...</option>${opts}</select></label>`;
  }else{
    const labels={"Narrative Booster":['Title / activity','Teacher'],"Area Knowledge":['Area / Locale','Ryke / Ryken'],"Heightened Sense":['Sense Heightened','Hearing, Smell, Sight, Taste, or Touch'],"Supersense":['Supersense Granted','Echolocation, tremorsense, microscopic vision...'],"Sixth Sense":['Sixth Sense Granted','Danger, spirits, magic, intent...'],"Language":['Language Learned','Sylvan, Terran, Beastial, Aquan...']};
    const lp=labels[r.name]||['Detail / specialization',spec?'Weapon group and style name':'Weapon type, element, stat, profession...'];
    detailHtml=`<label>${esc(lp[0])}<input id="mDetail" value="${esc(r.detail||'')}" placeholder="${esc(lp[1])}"></label>`;
  }
  const existing=(r.limiters||[]).slice(0,3);while(existing.length<3)existing.push({type:'',rank:1,detail:''});
  const limiterOptions='<option value="">None</option>'+(M.limiters||[]).map(l=>`<option value="${esc(l.id)}">${esc(l.id)}</option>`).join('');
  const limiterHtml=existing.map((l,i)=>`<div class="modal-form two"><label>Limiter ${i+1}<select class="mLimiterType" data-i="${i}">${limiterOptions}</select></label><label>Rank<select class="mLimiterRank" data-i="${i}"><option>1</option><option>2</option><option>3</option></select></label><label class="wide">Limiter detail<input class="mLimiterDetail" data-i="${i}" value="${esc(l.detail||'')}" placeholder="Assistant names, focused element, required equipment, etc."></label></div>`).join('');
  openModal('Edit Skill',`<div class="modal-form"><label>Skill<input value="${esc(r.name)}" disabled></label><label>Grade<select id="mGrade">${gradeOptions(r.grade,def.creationMaxGrade||'A')}</select></label>${detailHtml}<div id="mRuleFields" class="modal-form">${skillRuleFields(r)}</div>${spec?`<label class="checkbox-row"><input id="mSpecialized" type="checkbox" ${r.specialized?'checked':''}> Specialize this Fighting Style</label>`:''}<label>Notes<textarea id="mNotes" rows="3">${esc(r.notes||'')}</textarea></label>${limiterAllowed(r)?`<div><label>Limiters</label><small>At most 3 total limiter ranks. Each rank raises this skill's effect by one grade but not its purchased grade or normal ability grade/cooldown.</small>${limiterHtml}</div>`:''}<div class="rule-callout"><strong>${esc(def.prerequisite?('Prerequisite: '+def.prerequisite):'No parsed prerequisite.')}</strong>${def.note?'<br>'+esc(def.note):''}${limiterAllowed(r)?'':'<br>Limiters cannot be applied to this skill.'}<div class="rule-text">${esc(def.description||'').replace(/\n/g,'<br>')}</div></div></div>`,()=>{
    r.grade=$('#mGrade').val();
    if(isArtisanSkill(r)){r.artisanType=$('#mArtisanType').val().trim();r.artisanMaterial=$('#mArtisanMaterial').val().trim();r.detail=r.artisanType}
    else if(r.name!=='Educated')r.detail=String($('#mDetail').val()||'').trim();
    r.notes=$('#mNotes').val().trim();if(spec)r.specialized=$('#mSpecialized').is(':checked');readSkillRuleFields(r);finalizeEducatedChoices(r,saved);
    r.limiters=[];$('.mLimiterType').each(function(){const type=$(this).val();if(!type)return;const i=$(this).data('i');r.limiters.push({type,rank:Number($(`.mLimiterRank[data-i="${i}"]`).val())||1,detail:$(`.mLimiterDetail[data-i="${i}"]`).val().trim()})});
    const previous=state.skills;state.skills=previous.filter(x=>x.id!==r.id).concat(r);
    const check=validateSkill(r);if(!check.ok){state.skills=previous;alert(check.message);return}
    closeModal();renderAll();
  });
  $('#mRuleFields').on('change','#mFoundationStyle,#mParentSkill',function(){readSkillRuleFields(r);const parent=state.skills.find(s=>s.id===r.parentSkillId);if(RULES.suiteKind(r)==='mastery'&&parent){r.styleId=parent.styleId;r.foundationWeapon=parent.foundationWeapon}r.foundationRefs=[];$('#mRuleFields').html(skillRuleFields(r));refreshFancySelects()});
  if(r.name==='Educated')$('#mRuleFields').on('change','select[id^="mEduSkill"]',function(){readSkillRuleFields(r);$('#mRuleFields').html(skillRuleFields(r));refreshFancySelects()});
  existing.forEach((l,i)=>{$(`.mLimiterType[data-i="${i}"]`).val(l.type||'');$(`.mLimiterRank[data-i="${i}"]`).val(String(l.rank||1))});
}
function validateSkill(r){
  if(transformationEditor&&r.name==='Transformation')return {ok:false,message:'A Transformation form cannot purchase Transformation'};
  if(r.custom)return {ok:true,message:'Custom / override row'};const def=getSkillDef(r.name);if(!def)return {ok:true,message:'Manual rule check'};
  const detailErr=detailRequirement(r);if(detailErr)return {ok:false,message:detailErr};
  if(r.name==='Narrative Booster'&&!String(r.detail||'').trim())return {ok:false,message:'Narrative Booster needs the activity/title it represents in the Detail field'};
  const lt=limiterTotal(r);if(lt>3)return {ok:false,message:'No skill may have more than 3 total limiter ranks'};if(lt&&!limiterAllowed(r))return {ok:false,message:'This skill is not eligible for limiters'};if(lt&&gradeIndex(r.grade)+lt>gradeIndex('A'))return {ok:false,message:'Limiter effect would exceed the pre-Tribulation A-grade ceiling'};if((r.limiters||[]).some(l=>l.type==='Imbue')&&!(r.limiters||[]).some(l=>l.type==='Charges'))return {ok:false,message:'Imbue requires the Charges limiter'};if((r.limiters||[]).some(l=>l.type==='Focused')&&r.name!=='Telekinesis')return {ok:false,message:'Focused limiter is only for Telekinesis'};
  if(def.creationMaxGrade&&gradeIndex(r.grade)>gradeIndex(def.creationMaxGrade))return {ok:false,message:`Creation cap ${def.creationMaxGrade}`};
  if(r.grantedByEducated)return {ok:true,message:'Granted by Educated; individual prerequisites waived'};
  const structuredError=RULES.skillCheck(r,ruleContext());if(structuredError)return {ok:false,message:structuredError};
  if(r.name==='Educated'){for(const child of RULES.educatedGrants({skills:[r]})){const check=validateSkill(child);if(!check.ok)return {ok:false,message:`Educated ${skillDisplayName(child)}: ${check.message}`}}}
  let p=def.prerequisite||'';
  const offsetFor=token=>{const clause=p.split(',').find(x=>x.includes(token))||'';return /three grades higher/i.test(clause)?3:/two grades higher/i.test(clause)?2:/one grade higher/i.test(clause)?1:0};
  const statNames=['Strength','Precision','Intelligence','Vitality','Speed'];let checked=RULES.isStyle(r)||!!RULES.suiteKind(r)||!!RULES.facilities[r.name]||r.name.startsWith('Profession')||r.name.startsWith('Masterwork')||['Always Outnumbered','Villainous','Capacity','Chameleon','Scrying'].includes(r.name);
  if(r.name==='Weaken [Stat]'){
    const st=r.detail,need=GRADE_ORDER[gradeIndex(r.grade)+1]||'S';checked=true;if(!st||!state.stats[st]||!atLeast(state.stats[st],need))return {ok:false,message:`Requires the chosen stat (${st||'not specified'}) at ${need} or higher`};p=p.replace(/\[Stat to be weakened\][^,]*/i,'');
  }
  if(r.name==='Magic'&&state.origin.perk==='Versatile'&&state.origin.versatileItem==='catalyst'&&/Intelligence!/i.test(p)){
    const need=GRADE_ORDER[gradeIndex(r.grade)+offsetFor('Intelligence!')]||'S';const alt=state.origin.versatileStat||'Intelligence';checked=true;
    if(!atLeast(state.stats.Intelligence,need)&&!atLeast(state.stats[alt],need))return {ok:false,message:`Requires Intelligence ${need}+ or ${alt} ${need}+ through Versatile`};
    p=p.replace(/Intelligence!/i,'');
  }
  for(const st of statNames){if(new RegExp(st+'!','i').test(p)){checked=true;const need=gradeIndex(r.grade)+offsetFor(st+'!');if(statIndex(state.stats[st])<STAT_ORDER.indexOf(GRADE_ORDER[need]||'S'))return {ok:false,message:`Requires ${st} ${GRADE_ORDER[need]||'S'} or higher`}}}
  if(/Character!/i.test(p)){checked=true;const need=gradeIndex(r.grade)+offsetFor('Character!');if(gradeIndex(characterGrade())<need)return {ok:false,message:`Requires Character Grade ${GRADE_ORDER[need]||'S'} or higher`}}
  if(/Standing!/i.test(p)&&!['Always Outnumbered','Villainous'].includes(r.name)){checked=true;let need=gradeIndex(r.grade)+offsetFor('Standing!');if(gradeIndex(standingGrade())<need)return {ok:false,message:`Requires Standing ${GRADE_ORDER[need]||'S'} or higher`}}
  if(/Magic skill/i.test(p)){checked=true;const mg=bestSkillGradeExact('Magic');let need=gradeIndex(r.grade)+offsetFor('Magic skill');if(!mg||gradeIndex(mg)<need)return {ok:false,message:`Requires Magic ${GRADE_ORDER[need]||'S'} or higher`}}
  if(/Fighting Style/i.test(p)&&!r.name.startsWith('Fighting Style')){checked=true;const fg=bestSkillGrade('Fighting Style');if(!fg)return {ok:false,message:'Requires a Fighting Style; review exact grade/core requirements'}}
  if(!p)return {ok:true,message:'No prerequisite'};
  return {ok:true,message:checked?'Core prerequisite met; review any additional text':'Manual prerequisite check'};
}

function editTechnique(id){
  const saved=state.techniques.find(x=>x.id===id),styles=state.skills.filter(RULES.isStyle);if(!styles.length){alert('Add a Fighting Style first.');return}
  const row=saved?{...saved}:{id:uid('tech'),styleId:styles[0].id,core:'Accurate',grade:'F',detail:'',targetStat:'',baseCost:7};
  const statOptions=RULES.stats.map(x=>`<option ${x===row.targetStat?'selected':''}>${x}</option>`).join('');
  openModal(saved?'Edit Technique':'Add Technique',`<div class="modal-form">${ruleSelect('mStyle','Fighting Style',styles.map(s=>({value:s.id,label:`${skillDisplayName(s)} ${s.grade}`})),row.styleId)}<label>Technique Core<select class="no-enhance" id="mCore"></select></label><label id="mCustomCoreWrap">Custom Core Name<input id="mCustomCore" value="${esc(row.core)}"></label><label>Technique name / defining damage or resistance type<input id="mTechDetail" value="${esc(row.detail||'')}"></label><label id="mTechDrainWrap">Drain Stat<select id="mTechDrainStat"><option value="">Choose...</option>${statOptions}</select></label><label>Grade<select class="no-enhance" id="mTechGrade"></select></label><div id="mTechRule" class="rule-callout"></div></div>`,()=>{
    const core=$('#mCore').val(),def=TECHS.find(t=>t.name===core),style=state.skills.find(s=>s.id===$('#mStyle').val());
    Object.assign(row,{styleId:style?.id,core:core==='__custom'?$('#mCustomCore').val().trim():core,detail:$('#mTechDetail').val().trim(),targetStat:core==='Drain'?$('#mTechDrainStat').val():'',grade:def?.nonUpgrading?'F':style?.specialized?style.grade:$('#mTechGrade').val(),baseCost:def?.baseCost||7,actionTagged:!!def?.actionTagged,nonUpgrading:!!def?.nonUpgrading});
    if(!row.core){alert('Name the custom technique core.');return}const error=RULES.techniqueCheck(row,ruleContext());if(error){alert(error);return}
    state.techniques=state.techniques.filter(t=>t.id!==row.id).concat(row);closeModal();renderAll();
  });
  const updateCore=()=>{const def=TECHS.find(t=>t.name===$('#mCore').val()),style=state.skills.find(s=>s.id===$('#mStyle').val()),old=$('#mTechGrade').val()||row.grade;$('#mCustomCoreWrap').toggleClass('hidden',$('#mCore').val()!=='__custom');$('#mTechDrainWrap').toggleClass('hidden',$('#mCore').val()!=='Drain');const g=def?.nonUpgrading?'F':style?.specialized?style.grade:old;$('#mTechGrade').html(gradeOptions(g,def?.nonUpgrading?'F':style?.grade||'F')).prop('disabled',!!def?.nonUpgrading||!!style?.specialized);$('#mTechRule').text(def?.description||'Custom core requires manual approval.')};
  const updateStyle=()=>{const style=state.skills.find(s=>s.id===$('#mStyle').val()),old=$('#mCore').val()||row.core;const allowed=TECHS.filter(t=>!(style?.specialized&&t.name==='Generalist'));$('#mCore').html(allowed.map(t=>`<option value="${esc(t.name)}">${esc(t.name)} (${t.baseCost} pts)</option>`).join('')+'<option value="__custom">Custom core</option>');$('#mCore').val(allowed.some(t=>t.name===old)?old:TECHS.some(t=>t.name===old)?'Accurate':'__custom');updateCore()};
  $('#mStyle').on('change',()=>{updateStyle();refreshFancySelects()});$('#mCore').on('change',()=>{updateCore();refreshFancySelects()});updateStyle();$('#mTechDrainStat').val(row.targetStat||'');
}
function renderTechniques(){
  $('#techniqueList').html(state.techniques.map(r=>{const style=state.skills.find(s=>s.id===r.styleId);const tg=techniqueGrade(r);const ruleError=RULES.techniqueCheck(r,ruleContext());const invalid=!!ruleError;return `<div class="selected-row ${invalid?'invalid':''}"><div><div class="row-title">${esc(techniqueDisplayName(r))} <span class="pill">${esc(r.core)}</span></div><div class="row-meta">${tg} // ${techniqueCost(r)} pts // ${style?esc(skillDisplayName(style)):'missing style'}${style?.specialized?' // follows Specialized Style grade':''}${r.actionTagged?' // +1 action effect':''}${ruleError?' // '+esc(ruleError):''}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-edit-tech="${r.id}">Edit</button><button class="ui-btn small danger" data-remove-tech="${r.id}">×</button></div></div>`}).join('')||'<div class="muted">No techniques added.</div>');
}
function editAffinity(id){
  const saved=state.affinities.find(x=>x.id===id),row=saved?{...saved}:{id:uid('aff'),core:'Element',grade:'F',detail:'',targetStat:'',baseCost:7,actionTagged:false};
  const options=AFFS.map(a=>({value:a.name,label:`${a.name} (${a.baseCost} pts)`})).concat({value:'__freeform',label:'Freeform affinity'});
  openModal(saved?'Edit Affinity':'Add Affinity',`<div class="modal-form">${ruleSelect('mAffCore','Affinity core',options,AFFS.some(a=>a.name===row.core)?row.core:'__freeform')}<label>Type / flavor (required for Element, Blight, Contact and Freeform)<input id="mAffDetail" value="${esc(row.detail||'')}"></label><div id="mAffDrainWrap">${ruleSelect('mAffDrainStat','Drain stat',RULES.stats,row.targetStat)}</div><label>Grade<select class="no-enhance" id="mAffGrade">${gradeOptions(row.grade)}</select></label><div id="mAffRule" class="rule-callout"></div></div>`,()=>{
    const core=$('#mAffCore').val(),def=AFFS.find(a=>a.name===core);Object.assign(row,{core:core==='__freeform'?'Freeform':core,detail:$('#mAffDetail').val().trim(),targetStat:core==='Drain'?$('#mAffDrainStat').val():'',grade:def?.nonUpgrading?'F':$('#mAffGrade').val(),baseCost:def?.baseCost||7,actionTagged:!!def?.actionTagged});
    const error=RULES.affinityCheck(row,ruleContext());if(error){alert(error);return}state.affinities=state.affinities.filter(a=>a.id!==row.id).concat(row);closeModal();renderAll();
  });
  $('#mAffCore').on('change',function(){const def=AFFS.find(a=>a.name===this.value),old=$('#mAffGrade').val()||'F';$('#mAffDrainWrap').toggleClass('hidden',this.value!=='Drain');$('#mAffGrade').html(gradeOptions(def?.nonUpgrading?'F':old,def?.nonUpgrading?'F':'A')).prop('disabled',!!def?.nonUpgrading);$('#mAffRule').text((def?.description||'A defined freeform affinity costs 7 points per grade.')+' Requires Intelligence one grade higher; advanced cores also require Magic of at least the affinity grade.');refreshFancySelects()}).trigger('change');
}
function renderAffinities(){
  $('#affinityList').html(state.affinities.map(r=>{const error=RULES.affinityCheck(r,ruleContext());return `<div class="selected-row ${error?'invalid':''}"><div><div class="row-title">${esc(affinityDisplayName(r))} <span class="pill">${esc(r.core)}</span></div><div class="row-meta">${r.grade} // ${affinityCost(r)} pts${r.actionTagged?' // +1 action effect':''}${error?' // '+esc(error):''}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-edit-aff="${r.id}">Edit</button><button class="ui-btn small danger" data-remove-aff="${r.id}">×</button></div></div>`}).join('')||'<div class="muted">No affinities added.</div>');
}

function versatileAppliesToType(t){
  if(state.origin.perk!=='Versatile'||!t)return false;const target=state.origin.versatileItem;
  if(target==='catalyst')return t.id.includes('catalyst');
  if(target==='melee')return ['melee','shield','natural-melee'].includes(t.id);
  if(target==='ranged')return ['ranged','natural-ranged'].includes(t.id);
  return false;
}
function equipmentAllowedStats(t){const stats=[t.stat];if(versatileAppliesToType(t)&&state.origin.versatileStat)stats.push(state.origin.versatileStat);return [...new Set(stats)]}
function eligibleArtisans(row){return state.skills.filter(s=>isArtisanSkill(s)&&gradeIndex(s.grade)>=gradeIndex(row.grade))}
function editEquipment(id){
  const r=id?state.equipment.find(x=>x.id===id):null;
  const row=r||{id:uid('eq'),name:'',types:['melee'],grade:'F',material:'',specialMaterial:false,artisanDiscountSkillId:'',notes:''};
  row.types=equipmentTypeIds(row).length?equipmentTypeIds(row):['melee'];
  const typeChecks=M.equipmentTypes.map(t=>`<label><input type="checkbox" name="mEqType" value="${t.id}" ${row.types.includes(t.id)?'checked':''}> ${esc(t.name)} <span class="muted">(+${t.natural?14:7}/grade)</span></label>`).join('');
  const artisanOptions=state.skills.filter(isArtisanSkill).map(a=>`<option value="${a.id}" ${row.artisanDiscountSkillId===a.id?'selected':''}>${esc(artisanLabel(a))} ${a.grade}</option>`).join('');
  openModal(r?'Edit Equipment':'Add Equipment',`<div class="modal-form two"><label class="wide">Name<input id="mEqName" value="${esc(row.name)}" placeholder="Iron longsword, armored rifle, spellblade grimoire..."></label><label>Grade<select id="mEqGrade">${gradeOptions(row.grade)}</select></label><label>Material / Construction<input id="mEqMaterial" value="${esc(row.material||'')}" placeholder="Iron / metal, leather, wood, runes..."></label><label class="checkbox-row"><input id="mEqSpecial" type="checkbox" ${row.specialMaterial?'checked':''}> Mythril / Orichalcum pricing (double)</label><label>Artisan Discount<select id="mEqArtisan"><option value="">None</option>${artisanOptions}</select><small>A qualifying Artisan may discount normal equipment at or below the Artisan's grade. Choose only when its material/construction fits that Artisan specialty. Natural equipment never receives this discount.</small></label><div class="wide"><label>Equipment Types</label><div class="equipment-type-grid">${typeChecks}</div><small>Hybrid equipment may select multiple types. Each selected type adds its normal per-grade cost and all of its stat requirements apply.</small></div><div id="mEqCostPreview" class="modal-cost-preview wide"></div><label class="wide">Notes<textarea id="mEqNotes" rows="3">${esc(row.notes||'')}</textarea></label></div>`,()=>{
    const types=$('input[name=mEqType]:checked').map((_,e)=>e.value).get();if(!types.length){alert('Choose at least one equipment type.');return}
    row.name=$('#mEqName').val().trim()||'Unnamed Equipment';row.types=types;row.type=types[0];row.grade=$('#mEqGrade').val();row.material=$('#mEqMaterial').val().trim();row.specialMaterial=$('#mEqSpecial').is(':checked');row.artisanDiscountSkillId=$('#mEqArtisan').val()||'';row.notes=$('#mEqNotes').val().trim();
    if(row.artisanDiscountSkillId){const a=state.skills.find(x=>x.id===row.artisanDiscountSkillId);if(!a||gradeIndex(a.grade)<gradeIndex(row.grade)){alert('The selected Artisan must be the same grade as or higher than the equipment.');return}if(equipmentDefs(row).every(t=>t.natural)){alert('Artisan discounts do not apply to natural equipment.');return}}
    if(!r)state.equipment.push(row);closeModal();renderAll();
  });
  const update=()=>{const temp={...row,types:$('input[name=mEqType]:checked').map((_,e)=>e.value).get(),grade:$('#mEqGrade').val(),specialMaterial:$('#mEqSpecial').is(':checked'),artisanDiscountSkillId:$('#mEqArtisan').val()||''};const defs=equipmentDefs(temp),base=equipmentBaseCost(temp),disc=artisanDiscount(temp);let text=`Base ${base} points at ${temp.grade}`;if(disc)text+=` − ${disc} Artisan discount = ${Math.max(0,base-disc)} points`;else if(temp.artisanDiscountSkillId)text+=' // selected Artisan is not currently eligible at this grade or no normal equipment type is present';$('#mEqCostPreview').text(text)};
  $('#modalBody').off('.equipment').on('change.equipment','input[name=mEqType],#mEqGrade,#mEqSpecial,#mEqArtisan',update);update();
}
function equipmentValidation(r){
  const defs=equipmentDefs(r);if(!defs.length)return {ok:false,msg:'Choose at least one equipment type'};const need=GRADE_ORDER[gradeIndex(r.grade)+1]||'S';let ok=true;const parts=[];
  defs.forEach(t=>{const stats=equipmentAllowedStats(t);const pass=stats.some(st=>atLeast(state.stats[st],need));if(!pass)ok=false;parts.push(`${t.name}: ${stats.join(' or ')} ${need}+`)});
  if(r.artisanDiscountSkillId){const art=state.skills.find(s=>s.id===r.artisanDiscountSkillId&&isArtisanSkill(s));if(!art){ok=false;parts.push('Artisan discount source is missing')}else if(gradeIndex(art.grade)<gradeIndex(r.grade)){ok=false;parts.push(`Artisan ${art.grade} is below equipment ${r.grade}`)}else if(defs.every(t=>t.natural)){ok=false;parts.push('Artisan discount cannot apply to natural equipment')}}
  return {ok,msg:parts.join('; ')};
}
function renderEquipment(){
  let html=state.equipment.map(r=>{const defs=equipmentDefs(r),v=equipmentValidation(r),pills=defs.map(t=>`<span class="pill">${esc(t.name)}</span>`).join('')+(defs.length>1?'<span class="pill">HYBRID</span>':'');const art=state.skills.find(s=>s.id===r.artisanDiscountSkillId),disc=artisanDiscount(r);return `<div class="selected-row ${v.ok?'':'invalid'}"><div><div class="row-title">${esc(r.name)} ${pills}${r.material?`<span class="pill">${esc(r.material)}</span>`:''}</div><div class="row-meta">${r.grade} // ${equipmentCost(r)} pts${disc?` // Artisan discount −${disc} from ${esc(artisanLabel(art))}`:''} // <span class="${v.ok?'status-good':'status-bad'}">${esc(v.msg)}</span>${r.notes?' // '+esc(r.notes):''}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-edit-eq="${r.id}">Edit</button><button class="ui-btn small danger" data-remove-eq="${r.id}">×</button></div></div>`}).join('');
  html+=state.customRows.filter(r=>r.section==='Equipment').map(r=>`<div class="selected-row"><div><div class="row-title">${esc(r.name)} <span class="pill">CUSTOM EQUIPMENT</span></div><div class="row-meta">${r.grade||''} // ${Number(r.cost)||0} pts${r.notes?' // '+esc(r.notes):''}</div></div><div class="row-actions"><button class="ui-btn small danger" data-remove-custom="${r.id}">×</button></div></div>`).join('');$('#equipmentList').html(html||'<div class="muted">No equipment added.</div>');renderSwitchEquipment();
}
function syncSwitchLinks(){state.switchLinks=Array.isArray(state.switchLinks)?state.switchLinks:[];const ids=new Set(state.equipment.map(e=>e.id));state.switchLinks=state.switchLinks.filter(l=>l.a!==l.b&&ids.has(l.a)&&ids.has(l.b))}
function editSwitchEquipment(id){
  if(state.equipment.length<2){alert('Add at least two equipment pieces before creating Switch Equipment.');return}
  const r=id?(state.switchLinks||[]).find(x=>x.id===id):null;const row=r||{id:uid('switch'),a:state.equipment[0].id,b:state.equipment[1].id,notes:''};const opts=(selected)=>state.equipment.map(e=>`<option value="${e.id}" ${e.id===selected?'selected':''}>${esc(e.name)} ${e.grade}</option>`).join('');
  openModal(r?'Edit Switch Equipment':'Create Switch Equipment',`<div class="modal-form"><div class="rule-callout">Switch Equipment costs 7 points once to link two separately upgraded equipment pieces. Only one linked piece may be used at a time. Switching the active piece uses one action.</div><label>Equipment A<select id="mSwitchA">${opts(row.a)}</select></label><label>Equipment B<select id="mSwitchB">${opts(row.b)}</select></label><label>Notes<input id="mSwitchNotes" value="${esc(row.notes||'')}" placeholder="Transformation, mechanism, sheath, folding frame..."></label></div>`,()=>{row.a=$('#mSwitchA').val();row.b=$('#mSwitchB').val();row.notes=$('#mSwitchNotes').val().trim();if(row.a===row.b){alert('Choose two different equipment pieces.');return}if(!r)state.switchLinks.push(row);closeModal();renderAll()});
}
function renderSwitchEquipment(){const rows=(state.switchLinks||[]).map(l=>{const a=state.equipment.find(e=>e.id===l.a),b=state.equipment.find(e=>e.id===l.b);if(!a||!b)return'';return `<div class="selected-row"><div><div class="row-title">${esc(a.name)} ⇄ ${esc(b.name)} <span class="pill">SWITCH</span></div><div class="row-meta">7 pts // one active at a time // 1 action to switch${l.notes?' // '+esc(l.notes):''}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-edit-switch="${l.id}">Edit</button><button class="ui-btn small danger" data-remove-switch="${l.id}">×</button></div></div>`}).join('');$('#switchEquipmentList').html(rows||'<div class="muted">No Switch Equipment links.</div>')}

function grantSkillRows(){return state.skills.filter(s=>s.name==='Item'||s.name==='Transformation')}
function withCharacter(character,fn){const previous=state;state=character;try{return fn()}finally{state=previous}}
function skillGrantName(skill){return state.skillGrants?.[skill.id]?.name||'Unnamed Transformation'}
function formCosts(character,sourceId){return withCharacter(character,()=>[
  ...acquiredSkills().filter(r=>r.id!==sourceId).map(r=>({ref:FORM.ref('skills',r),name:skillDisplayName(r)+' '+r.grade,cost:Math.max(0,skillCost(r)),refundable:true})),
  ...state.techniques.map(r=>({ref:FORM.ref('techniques',r),name:techniqueDisplayName(r)+' '+techniqueGrade(r),cost:techniqueCost(r),refundable:true})),
  ...state.affinities.map(r=>({ref:FORM.ref('affinities',r),name:affinityDisplayName(r)+' '+r.grade,cost:affinityCost(r),refundable:true})),
  ...state.equipment.map(r=>({ref:FORM.ref('equipment',r),name:r.name+' '+r.grade,cost:equipmentCost(r),refundable:false})),
  ...state.customRows.map(r=>({ref:FORM.ref('customRows',r),name:r.name,cost:Math.max(0,Number(r.cost)||0),refundable:['Skill','Feature'].includes(r.section)}))
])}
function transformationBuild(skill,base=state){
  const grant=base.skillGrants?.[skill.id]||{},form=FORM.normalize(grant),effective=FORM.build(base,grant);
  const ledger=FORM.ledger(formCosts(base,skill.id),formCosts(effective,skill.id),M.statCostFromF,base.stats,effective.stats),budget=grantBudget(skill)+ledger.refunds;
  return {form,effective,...ledger,baseBudget:grantBudget(skill),budget,remaining:budget-ledger.spent};
}
function transformationCheck(skill){
  const base=state,b=transformationBuild(skill),errors=[],warnings=[],known=new Set([...formCosts(base,skill.id).map(r=>r.ref),...base.abilities.map(r=>FORM.ref('abilities',r)),...FORM.features(base).map(r=>r.ref),'origin-free']);
  b.form.removedRefs.forEach(ref=>{if(ref==='skills:'+skill.id)errors.push('The Transformation purchase funding this form cannot refund itself');else if(!known.has(ref))errors.push('A removed entry no longer exists: '+ref)});
  for(const key of FORM.collections){const seen=new Set();for(const r of b.effective[key]){if(!r.id||seen.has(r.id))errors.push('Duplicate or missing entry identifier in '+key);seen.add(r.id)}for(const row of b.form.updated[key])if(!base[key].some(r=>r.id===row.id))errors.push('An edited inherited entry no longer exists: '+row.id)}
  if(b.form.retainedEquipmentIds?.some(id=>!base.equipment.some(r=>r.id===id)))errors.push('Retained equipment was removed from the base character');
  for(const [name,grade] of Object.entries(b.effective.stats)){if(!STAT_ORDER.includes(grade)||grade==='S')errors.push(name+': choose a stat grade through A');else if(statIndex(grade)<statIndex(base.stats[name]))errors.push(name+': stats are inherited; lowering them does not fund a form')}
  if(b.remaining<0)errors.push('Form is '+Math.abs(b.remaining)+' points over budget');
  if(b.remaining>0)warnings.push(b.remaining+' form points remain unspent');
  withCharacter(b.effective,()=>{
    if(b.form.added.skills.some(r=>r.name==='Transformation')||b.form.updated.skills.some(r=>r.name==='Transformation'||base.skills.some(p=>p.id===r.id&&p.name==='Transformation')))errors.push('Forms cannot purchase or upgrade Transformation');
    acquiredSkills().forEach(r=>{const check=validateSkill(r);if(!check.ok)errors.push(skillDisplayName(r)+': '+check.message);else if(check.message.includes('Manual'))warnings.push(skillDisplayName(r)+': review its prerequisite text')});
    state.techniques.forEach(r=>{const error=RULES.techniqueCheck(r,ruleContext());if(error)errors.push(techniqueDisplayName(r)+': '+error)});
    state.affinities.forEach(r=>{const error=RULES.affinityCheck(r,ruleContext());if(error)errors.push(affinityDisplayName(r)+': '+error)});
    state.equipment.forEach(r=>{const check=equipmentValidation(r);if(!check.ok)errors.push(r.name+': '+check.msg)});
    const pool=new Set(componentPool().map(r=>r.id));
    state.abilities.forEach(r=>{if((r.components||[]).some(id=>!pool.has(id)))errors.push(r.name+': an ability component is unavailable in this form')});
  });
  return {...b,errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
function formEntryName(kind,row){return kind==='skills'?skillDisplayName(row):kind==='techniques'?techniqueDisplayName(row):kind==='affinities'?affinityDisplayName(row):row.name||'Unnamed entry'}
function renderTransformation(skill){
  const g=state.skillGrants?.[skill.id]||{},b=transformationCheck(skill),f=b.form,id=esc(skill.id),removed=new Set(f.removedRefs),baseCosts=new Map(formCosts(state,skill.id).map(r=>[r.ref,r]));
  const toggle=(ref,name,cost=0)=>`<label class="form-choice"><input type="checkbox" data-form-field="removed" data-form-id="${id}" value="${esc(ref)}" ${removed.has(ref)?'checked':''}><span>${esc(name)} <small>${cost?cost+' pts refunded':'no point refund'}</small></span></label>`;
  let removals=['skills','techniques','affinities','abilities','customRows'].map(kind=>{
    const rows=kind==='skills'?acquiredSkills().filter(r=>r.id!==skill.id):state[kind];
    return rows.map(r=>{const ref=FORM.ref(kind,r);return toggle(ref,formEntryName(kind,r)+(r.grade?' '+r.grade:''),baseCosts.get(ref)?.refundable?baseCosts.get(ref).cost:0)}).join('');
  }).join('')+FORM.features(state).map(r=>toggle(r.ref,r.name)).join('');
  if(freeSkillDisplay())removals+=toggle('origin-free',freeSkillDisplay().name+' (free origin skill)');
  const inheritedEquipment=state.equipment.map(r=>{const retained=b.effective.equipment.some(e=>e.id===r.id);return `<label class="form-choice"><input type="checkbox" data-form-field="equipment" data-form-id="${id}" value="${esc(r.id)}" ${retained?'checked':''}><span>${esc(r.name)} ${esc(r.grade)}<small>${retained?'Available in form':'Melded / unavailable'}; no refund for melding equipment</small></span></label>`}).join('');
  const rows=FORM.collections.map(kind=>{
    const entries=b.effective[kind].filter(r=>kind!=='skills'||r.name!=='Transformation');if(!entries.length)return '';
    return `<h4>${esc({customRows:'Custom skills / features',affinities:'Affinities',techniques:'Techniques',equipment:'Equipment',abilities:'Abilities',skills:'Skills'}[kind])}</h4>`+entries.map(r=>{const inherited=state[kind].some(x=>x.id===r.id);return `<div class="selected-row"><div><strong>${esc(formEntryName(kind,r))} ${esc(r.grade||'')}</strong><div class="muted">${inherited?'Inherited'+(f.updated[kind].some(x=>x.id===r.id)?' / modified':''):'Form purchase'}</div></div><div class="row-actions">${kind!=='customRows'?`<button type="button" class="ui-btn small ghost" data-form-edit="${kind}" data-form-id="${id}" data-entry-id="${esc(r.id)}">Edit</button>`:''}${!inherited?`<button type="button" class="ui-btn small danger" data-form-delete="${kind}" data-form-id="${id}" data-entry-id="${esc(r.id)}">Remove</button>`:''}</div></div>`}).join('');
  }).join('');
  const skillOptions=SKILLS.filter(r=>r.name!=='Transformation'&&r.name!=='Affinity [type]'&&r.name!=='Asset').map(r=>`<option value="${esc(r.name)}">${esc(r.name)}</option>`).join('');
  return `<section class="follower-section grant-section"><div class="follower-section-head"><h3>Transformation Form <span class="pill">${esc(skill.grade)}</span></h3><span class="follower-budget ${b.remaining<0?'over':''}">${b.spent} / ${b.budget} form pts</span></div><div class="rule-callout">Self only; fixed form. F-grade lasts one post. Inherits titles, stats, skills and abilities. Worn equipment melds unless retained below. Transformation cannot be purchased or upgraded inside a form. The current Transformation purchase cannot fund its own refund.</div><div class="follower-grid"><label>Form Name<input data-grant-field="name" data-grant-skill="${id}" value="${esc(g.name||'')}"></label><label class="wide">Appearance / form description<textarea rows="3" data-grant-field="details" data-grant-skill="${id}">${esc(g.details||'')}</textarea></label></div><div class="rule-callout"><strong>${b.baseBudget} from Transformation + ${b.refunds} refunded = ${b.budget} available</strong><br>${b.spent} spent; ${b.remaining} remaining. All accounting applies only while transformed; the base character keeps its purchases and budget. Refunds use paid costs, including discounts; free grants do not produce points.</div><details><summary>Remove inherited skills / features / abilities</summary><p>Check entries that cannot be used in this form. Narrative justification is assumed. Abilities, free features and free grants can be disabled without a refund. Remove dependent techniques or abilities separately when needed.</p><div class="form-choice-grid">${removals||'<p>No inherited purchases.</p>'}</div></details><details><summary>Equipment retained in this form</summary><div class="form-choice-grid">${inheritedEquipment||'<p>No inherited equipment.</p>'}</div></details><h4>Form stats</h4><div class="follower-grid">${Object.entries(state.stats).map(([name,grade])=>`<label>${esc(name)} (base ${esc(grade)})<select class="no-enhance" data-form-field="stat" data-stat-name="${name}" data-form-id="${id}">${STAT_ORDER.filter(g=>g!=='S'&&statIndex(g)>=statIndex(grade)).map(g=>`<option ${g===b.effective.stats[name]?'selected':''}>${g}</option>`).join('')}</select></label>`).join('')}</div><h4>Form purchases and upgrades</h4><div class="form-add-skill"><label>Skill / feature<select class="no-enhance" id="formSkill-${id}">${skillOptions}</select></label><button class="ui-btn" type="button" data-form-edit="skills" data-form-id="${id}">Add skill / feature</button></div><div class="row-actions">${[['techniques','Technique'],['affinities','Affinity'],['equipment','Equipment'],['abilities','Ability']].map(([kind,label])=>`<button type="button" class="ui-btn small" data-form-edit="${kind}" data-form-id="${id}">+ ${label}</button>`).join('')}</div>${rows}<details><summary>Form spending and refunds</summary><ul>${b.refundRows.map(r=>`<li>Refund: ${esc(r.name)} +${r.cost}</li>`).join('')}${b.purchaseRows.map(r=>`<li>Purchase / upgrade: ${esc(r.name)} −${r.cost}</li>`).join('')}</ul></details>${b.errors.length?`<div class="rule-callout status-bad"><strong>Form checks</strong><ul>${b.errors.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div>`:'<div class="rule-callout status-good">Form purchase checks passed.</div>'}<label>Notes<textarea rows="3" data-grant-field="notes" data-grant-skill="${id}">${esc(g.notes||'')}</textarea></label></section>`;
}
function handleTransformationField(){
  const el=$(this),id=String(el.data('form-id')),grant=state.skillGrants[id];if(!grant)return;const f=FORM.normalize(grant),kind=el.data('form-field'),value=el.val();
  if(kind==='removed'){f.removedRefs=f.removedRefs.filter(r=>r!==value);if(el.is(':checked'))f.removedRefs.push(value)}
  if(kind==='equipment'){if(f.retainedEquipmentIds===null)f.retainedEquipmentIds=state.equipment.filter(r=>equipmentDefs(r).some(t=>t.natural)).map(r=>r.id);f.retainedEquipmentIds=f.retainedEquipmentIds.filter(r=>r!==value);if(el.is(':checked'))f.retainedEquipmentIds.push(value)}
  if(kind==='stat')f.stats[el.data('stat-name')]=value;
  grant.form=f;renderSkillGrants();refreshSummary();renderReview(false);
}
function openTransformationEntry(){
  const el=$(this),id=String(el.data('form-id')),kind=el.data('form-edit'),entry=el.data('entry-id'),base=state,grant=base.skillGrants[id];if(!grant)return;
  const name=kind==='skills'&&!entry?$('#formSkill-'+id).val():'';
  transformationEditor={base,id,saving:false};state=FORM.build(base,grant);
  try{if(kind==='skills')editSkill(entry||null,name);else if(kind==='techniques')editTechnique(entry);else if(kind==='affinities')editAffinity(entry);else if(kind==='equipment')editEquipment(entry);else if(kind==='abilities')editAbility(entry);if(!$modal[0].open)restoreTransformationEditor(false)}catch(error){restoreTransformationEditor(false);throw error}
}
function restoreTransformationEditor(save){
  const context=transformationEditor;if(!context)return;
  if(save){const grant=context.base.skillGrants[context.id];grant.form=FORM.capture(context.base,state,grant)}
  state=context.base;transformationEditor=null;
}
function deleteTransformationEntry(){const el=$(this),id=String(el.data('form-id')),kind=el.data('form-delete'),entry=el.data('entry-id'),grant=state.skillGrants[id];if(!grant||!FORM.collections.includes(kind))return;const f=FORM.normalize(grant);f.added[kind]=f.added[kind].filter(r=>r.id!==entry);grant.form=f;renderAll()}
function transformationSheet(skill){
  const base=state,g=base.skillGrants?.[skill.id]||{},b=transformationBuild(skill),lines=[`Form: ${g.name||'Unnamed form'} (self only; F-grade duration: 1 post)`,g.details||'',`Form Points Available: ${b.budget} (${b.baseBudget} from Transformation + ${b.refunds} refunded)`,`Form Points Spent: ${b.spent}`,`Form Points Remaining: ${b.remaining}`];
  const changes=Object.entries(b.effective.stats).filter(([name,grade])=>grade!==base.stats[name]);
  lines.push('Form Stat Changes:');
  if(!changes.length)lines.push('None — uses base character stats.');
  changes.forEach(([name,grade])=>lines.push(`${name}: ${base.stats[name]} → ${grade} (${Math.max(0,(M.statCostFromF[grade]||0)-(M.statCostFromF[base.stats[name]]||0))} form points)`));
  const gained=[],lost=[],modified=[],labels={skills:'Skill',techniques:'Technique',affinities:'Affinity',equipment:'Equipment',abilities:'Ability',customRows:'Feature / custom entry'};
  for(const kind of FORM.collections){
    const originals=kind==='skills'?withCharacter(base,()=>acquiredSkills()):base[kind],current=kind==='skills'?withCharacter(b.effective,()=>acquiredSkills()):b.effective[kind];
    const label=row=>`${labels[kind]}: ${formEntryName(kind,row)}${row.grade?' '+row.grade:''}`;
    for(const row of current){const old=originals.find(r=>r.id===row.id);if(!old)gained.push(label(row));else if(JSON.stringify(row)!==JSON.stringify(old))modified.push(label(old)===label(row)?label(row)+' (details updated)':label(old)+' → '+label(row))}
    if(kind!=='equipment')for(const row of originals)if(!current.some(r=>r.id===row.id))lost.push(label(row));
  }
  lost.push(...FORM.features(base).filter(r=>b.form.removedRefs.includes(r.ref)).map(r=>'Feature: '+r.name));
  if(b.effective.formDisableOriginSkill){const free=withCharacter(base,()=>freeSkillDisplay());if(free)lost.push('Free origin skill: '+free.name+' '+free.grade)}
  lines.push('Gained in Form:',...(gained.length?gained:['None.']),'Lost in Form:',...(lost.length?lost:['None.']));
  if(modified.length)lines.push('Modified in Form:',...modified);
  const melded=base.equipment.filter(r=>!b.effective.equipment.some(e=>e.id===r.id));
  if(melded.length)lines.push('Melded Equipment: '+melded.map(r=>r.name+' '+r.grade).join('; '));
  if(b.effective.equipment.length)lines.push('Equipment in Form: '+b.effective.equipment.map(r=>r.name+' '+r.grade).join('; '));
  withCharacter(b.effective,()=>{
    for(const row of acquiredSkills().filter(r=>r.id!==skill.id)){if(b.form.added.skills.some(r=>r.id===row.id)||b.form.updated.skills.some(r=>r.id===row.id)){const details=[skillRuleSummary(row),row.notes,(row.limiters||[]).map(l=>l.type+' '+l.rank+(l.detail?' ['+l.detail+']':'')).join(', ')].filter(Boolean);if(details.length)lines.push(skillDisplayName(row)+': '+details.join('; '))}}
    if(state.abilities.length)lines.push('Form Abilities:');
    state.abilities.forEach(r=>{const c=abilityCalc(r);lines.push(`${r.name} — ${c.pool.map(p=>p.label+' '+p.grade).join(', ')} — ${c.grade}; ${c.cooldown??'?'} post cooldown; ${c.actions} action${c.actions===1?'':'s'}${r.description?' — '+r.description:''}${r.notes?' — '+r.notes:''}`)});
  });
  if(g.notes)lines.push('Form Notes: '+g.notes);return lines.filter(Boolean).join('\n');
}
function grantBudget(skill){return (gradeIndex(skill?.grade||'F')+1)*(skill?.name==='Item'?35:28)}
function syncSkillGrants(){
  state.skillGrants=(state.skillGrants&&typeof state.skillGrants==='object')?state.skillGrants:{};
  const rows=grantSkillRows(),ids=new Set(rows.map(s=>s.id));
  rows.forEach(skill=>{if(!state.skillGrants[skill.id])state.skillGrants[skill.id]={name:'',details:'',notes:''}});
  Object.keys(state.skillGrants).forEach(id=>{if(!ids.has(id))delete state.skillGrants[id]});
  const active=rows.length>0;$('.conditional-step[data-step="grants"]').toggleClass('hidden',!active);
  if(!active&&$('[data-panel="grants"]').hasClass('active'))showStep('skills');
}
function renderSkillGrants(){
  const expanded=$('#skillGrantWorkspace details').map((i,el)=>el.open?i:null).get();
  const rows=grantSkillRows();
  const html=rows.map(skill=>{if(skill.name==='Transformation')return renderTransformation(skill);const g=state.skillGrants?.[skill.id]||{},budget=grantBudget(skill),isItem=skill.name==='Item';return `<section class="follower-section grant-section"><div class="follower-section-head"><div><h3>${isItem?'Bound Item':'Transformation Form'} <span class="pill">${skill.grade}</span></h3><div class="muted">${isItem?'Item grants a bound object with its own special build.':'Transformation grants a fixed alternate form. Different forms require separate Transformation purchases.'}</div></div><span class="follower-budget">${budget} build pts</span></div><div class="follower-card"><div class="follower-grid"><label>${isItem?'Item Name':'Form Name'}<input data-grant-field="name" data-grant-skill="${skill.id}" value="${esc(g.name||'')}" placeholder="${isItem?'Bound grimoire, living armor, arcane prosthetic...':'Elemental form, beast form, ghost form...'}"></label><label class="wide">${isItem?'Item Build / Granted Abilities':'Form Build / Changes'}<textarea rows="8" data-grant-field="details" data-grant-skill="${skill.id}" placeholder="You have ${budget} internal build points. Record the stats, skills, abilities, features, equipment behavior, or other approved content bought with them.">${esc(g.details||'')}</textarea></label><label class="wide">Notes<textarea rows="3" data-grant-field="notes" data-grant-skill="${skill.id}" placeholder="Restrictions, appearance, activation, approval notes...">${esc(g.notes||'')}</textarea></label></div></div><div class="rule-callout">${isItem?`This Item ${skill.grade} provides ${budget} points for its internal build. Those points do not enter the parent character's creation budget.`:`Transformation ${skill.grade} provides ${budget} points to customize the fixed form. The form keeps the character's existing titles, stats, skills, and abilities unless a limitation of the form prevents their use.`}</div></section>`}).join('');
  $('#skillGrantWorkspace').html(html||'<div class="rule-callout">Add Item or Transformation to open its granted-build workspace.</div>');
  $('#skillGrantWorkspace details').each((i,el)=>{el.open=expanded.includes(i)});
}
function handleSkillGrantField(){const $el=$(this),id=String($el.data('grant-skill')),field=$el.data('grant-field');if(!state.skillGrants?.[id])return;state.skillGrants[id][field]=$el.val();renderReview(false);renderCrafting()}
function renderCrafting(){
  if(!$('#craftingInventory').length)return;
  const equipment=state.equipment.map(r=>{const types=equipmentDefs(r).map(t=>t.name).join(', ')||'Equipment';return `<div class="workbench-item"><strong>${esc(r.name)}</strong><span>${esc(r.grade)} // ${esc(types)}${r.material?' // '+esc(r.material):''}</span></div>`}).join('');
  const items=state.skills.filter(s=>s.name==='Item').map(s=>{const g=state.skillGrants?.[s.id]||{};return `<div class="workbench-item"><strong>${esc(g.name||'Unnamed Bound Item')}</strong><span>Item ${esc(s.grade)} // ${grantBudget(s)} internal build pts</span></div>`}).join('');
  const assets=[...systemAssets(),...state.assets,...state.customRows.filter(r=>r.section==='Asset')].map(a=>`<div class="workbench-item"><strong>${esc(a.name||'Unnamed Asset')}</strong><span>${esc(a.grade||'F')} Asset${a.notes?' // '+esc(a.notes):''}</span></div>`).join('');
  const group=(title,body)=>body?`<section class="workbench-group"><h4>${title}</h4>${body}</section>`:'';
  $('#craftingInventory').html(group('Equipment',equipment)+group('Bound Items',items)+group('Assets',assets)||'<div class="rule-callout">No equipment, bound Items, or Assets are currently available to populate the future workbench.</div>');
}

function systemAssets(){
  const out=[];
  state.skills.filter(isArtisanSkill).forEach(s=>{const type=artisanLabel(s);out.push({id:'system-artisan-'+s.id,name:`Master & Workshop [${type}]`,grade:'F',cost:0,system:true,notes:'Free from Artisan: a Master NPC and their shop/workspace may be leveraged for the craft. The shop is not owned by the character.'})});
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
function renumberSteps(){
  let n=1,options=[],active=$('#stepNav .step.active').data('step')||'identity';
  $('#stepNav .step').each(function(){if($(this).hasClass('hidden'))return;const num=String(n++).padStart(2,'0'),step=$(this).data('step'),label=$(this).clone().children('span').remove().end().text().trim();$(this).find('span').first().text(num);options.push(`<option value="${esc(step)}">${num} // ${esc(label)}</option>`)});
  const $mobile=$('#mobileStepSelect');$mobile.html(options.join('')).val(active);
}

function editAsset(id){
  const r=id?state.assets.find(x=>x.id===id):null;const row=r||{id:uid('asset'),name:'',grade:'F',cost:7,notes:'',createsTitle:true,titleName:'',titleEquipped:false};
  if(row.createsTitle===undefined)row.createsTitle=true;
  openModal(r?'Edit Asset':'Add Asset',`<div class="modal-form"><label>Name<input id="mAssetName" value="${esc(row.name)}" placeholder="Family connection, damaged townhouse, old vehicle..."></label><label>Grade<select id="mAssetGrade"><option>F</option></select></label>${ruleSelect('mAssetKind','Asset type / facility purpose',['Other',...new Set(Object.values(RULES.facilities))],row.assetKind||'Other')}<label>Point Cost<input id="mAssetCost" type="number" min="0" step="1" value="${Number(row.cost)||0}"><small>7 is the normal F Asset skill price. Use the document's listed special property/training prices or an approved override where appropriate.</small></label><label class="checkbox-row"><input id="mAssetCreatesTitle" type="checkbox" ${row.createsTitle!==false?'checked':''}> This Asset creates a fitting acquired title</label><div id="mAssetTitleWrap" class="modal-form"><label>Acquired Title<input id="mAssetTitle" value="${esc(row.titleName||'')}" placeholder="Leave blank to use the Asset name"><small>Use the title the possession or connection logically gives the character, such as Noble Scion, Shopkeeper, or Vehicle Owner.</small></label><label class="checkbox-row"><input id="mAssetTitleEquipped" type="checkbox" ${row.titleEquipped?'checked':''}> Equip this title</label></div><label>Condition / limits / notes<textarea id="mAssetNotes" rows="4">${esc(row.notes||'')}</textarea></label></div>`,()=>{
    row.name=$('#mAssetName').val().trim()||'Unnamed Asset';row.assetKind=$('#mAssetKind').val()||'Other';row.grade='F';row.cost=Math.max(0,Number($('#mAssetCost').val())||0);row.notes=$('#mAssetNotes').val().trim();row.createsTitle=$('#mAssetCreatesTitle').is(':checked');row.titleName=row.createsTitle?($('#mAssetTitle').val().trim()||row.name):'';row.titleEquipped=row.createsTitle&&$('#mAssetTitleEquipped').is(':checked');if(!r)state.assets.push(row);closeModal();renderAll()
  });
  $('#mAssetCreatesTitle').on('change',function(){$('#mAssetTitleWrap').toggleClass('hidden',!this.checked)}).trigger('change');
}
function renderAssets(){let html=systemAssets().map(r=>`<div class="selected-row system-asset"><div><div class="row-title">${esc(r.name)} <span class="pill">SYSTEM F ASSET</span><span class="pill">FREE</span></div><div class="row-meta">${esc(r.notes)}</div></div></div>`).join('');html+=state.assets.map(r=>`<div class="selected-row"><div><div class="row-title">${esc(r.name)} <span class="pill">F ASSET</span>${r.createsTitle!==false?`<span class="pill">TITLE: ${esc(r.titleName||r.name)}</span>`:''}</div><div class="row-meta">${assetCost(r)} pts${r.notes?' // '+esc(r.notes):''}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-edit-asset="${r.id}">Edit</button><button class="ui-btn small danger" data-remove-asset="${r.id}">×</button></div></div>`).join('');html+=state.customRows.filter(r=>r.section==='Asset').map(r=>`<div class="selected-row"><div><div class="row-title">${esc(r.name)} <span class="pill">CUSTOM F</span></div><div class="row-meta">${Number(r.cost)||0} pts${r.notes?' // '+esc(r.notes):''}</div></div><div class="row-actions"><button class="ui-btn small danger" data-remove-custom="${r.id}">×</button></div></div>`).join('');$('#assetList').html(html||'<div class="muted">No starting assets.</div>')}

function componentPool(){
  const arr=[];
  acquiredSkills().forEach(s=>{const d=getSkillDef(s.name);if(d&&(d.tags||[]).includes('Passive'))return;arr.push({id:'skill:'+s.id,label:skillDisplayName(s),grade:s.grade,action:false})});
  state.techniques.forEach(t=>arr.push({id:'tech:'+t.id,label:techniqueDisplayName(t),grade:techniqueGrade(t),action:t.actionTagged}));
  state.affinities.forEach(a=>arr.push({id:'aff:'+a.id,label:affinityDisplayName(a),grade:a.grade,action:a.actionTagged}));
  return arr;
}
function editAbility(id){
  const r=id?state.abilities.find(x=>x.id===id):null;const row=r||{id:uid('ab'),name:'',description:'',components:[],gradeOverride:'',actionOverride:'',extraIntents:0,notes:''};const pool=componentPool();
  openModal(r?'Edit Ability':'Add Ability',`<div class="modal-form"><label>Name<input id="mAbName" value="${esc(row.name)}"></label><label>Description<textarea id="mAbDesc" rows="4">${esc(row.description)}</textarea></label><div><label>Components</label><div class="checkbox-row">${pool.map(c=>`<label><input type="checkbox" name="mComp" value="${c.id}" ${row.components.includes(c.id)?'checked':''}> ${esc(c.label)} ${c.grade}${c.action?' (+1 effect)':''}</label>`).join('')||'<span class="muted">Add skills, techniques, or affinities first.</span>'}</div></div><div class="modal-form two"><label>Grade Override<select id="mAbGrade"><option value="">Automatic</option>${gradeOptions(row.gradeOverride||'F')}</select></label><label>Action Override<input id="mAbActions" type="number" min="1" max="9" value="${esc(row.actionOverride)}" placeholder="Automatic"></label><label>Additional distinct intents<input id="mAbExtra" type="number" min="0" max="9" value="${Number(row.extraIntents)||0}"><small>Beyond the base intent, excluding +1 effects already tagged on techniques/affinities.</small></label><label>Notes<input id="mAbNotes" value="${esc(row.notes||'')}" placeholder="Flux, range, duration, limitations..."></label></div></div>`,()=>{row.name=$('#mAbName').val().trim()||'Unnamed Ability';row.description=$('#mAbDesc').val().trim();row.components=$('input[name=mComp]:checked').map((_,e)=>e.value).get();row.gradeOverride=$('#mAbGrade').val();row.actionOverride=$('#mAbActions').val()?Number($('#mAbActions').val()):'';row.extraIntents=Math.max(0,Number($('#mAbExtra').val())||0);row.notes=$('#mAbNotes').val().trim();if(!r)state.abilities.push(row);closeModal();renderAll()});$('#mAbGrade').val(row.gradeOverride||'');
}
function abilityCalc(r){const pool=componentPool().filter(c=>r.components.includes(c.id));let g='F';pool.forEach(c=>{if(gradeIndex(c.grade)>gradeIndex(g))g=c.grade});if(r.gradeOverride)g=r.gradeOverride;const tagged=pool.filter(c=>c.action).length;const plus=Math.max(tagged,Number(r.extraIntents)||0);let actions=1+Math.max(0,plus-1);if(r.actionOverride)actions=Number(r.actionOverride);return {grade:g,cooldown:M.cooldowns[g],actions,tagged,pool}}
function renderAbilities(){$('#abilityList').html(state.abilities.map(r=>{const c=abilityCalc(r);return `<div class="selected-row ${c.actions>3?'invalid':''}"><div><div class="row-title">${esc(r.name)} <span class="pill">GRADE ${c.grade}</span><span class="pill">${c.cooldown==null?'?':c.cooldown} POST CD</span><span class="pill">${c.actions} ACTION${c.actions===1?'':'S'}</span></div><div class="row-meta">${esc(c.pool.map(x=>x.label+' '+x.grade).join(', ')||'No components')}${r.notes?' // '+esc(r.notes):''}</div>${r.description?`<div class="muted">${esc(r.description)}</div>`:''}</div><div class="row-actions"><button class="ui-btn small ghost" data-edit-ability="${r.id}">Edit</button><button class="ui-btn small danger" data-remove-ability="${r.id}">×</button></div></div>`}).join('')||'<div class="muted">No abilities created.</div>')}

function editTitle(){openModal('Add Title',`<div class="modal-form"><label>Title<input id="mTitle"></label><label class="checkbox-row"><input id="mTitleEquipped" type="checkbox"> Equipped</label><label>Notes<input id="mTitleNotes" placeholder="Optional"></label></div>`,()=>{const n=$('#mTitle').val().trim();if(n)state.titles.push({id:uid('title'),name:n,notes:$('#mTitleNotes').val().trim(),equipped:$('#mTitleEquipped').is(':checked')});closeModal();renderAll()})}
function editCriminalTitle(id){
  const existing=(state.criminalTitles||[]).find(t=>t.id===id),r=existing||{id:uid('crime'),name:'Thief',grade:'F',notes:''};
  openModal(existing?'Edit Criminal Title':'Record Criminal Title',`<div class="modal-form">${ruleSelect('mCrimeName','Criminal title',Object.keys(RULES.crimes),r.name)}<label>Grade<select class="no-enhance" id="mCrimeGrade">${gradeOptions(r.grade,'S')}</select></label><div id="mCrimeDefinition" class="rule-callout"></div><label>Staff award / clearance notes<textarea id="mCrimeNotes" rows="3">${esc(r.notes||'')}</textarea></label><small>Record an earned title, not a self-awarded prerequisite. Criminal titles are always equipped. Villainous needs C Standing and a criminal title at C or higher.</small></div>`,()=>{
    const name=$('#mCrimeName').val(),grade=$('#mCrimeGrade').val();if(!Object.hasOwn(RULES.crimes,name))return;
    const duplicate=state.criminalTitles.find(t=>t.name===name&&t.id!==r.id);if(duplicate){alert('That criminal title already exists. Edit its grade to record repeat offenses.');return}
    const entry={...r,name,grade,notes:$('#mCrimeNotes').val().trim()};state.criminalTitles=state.criminalTitles.filter(t=>t.id!==r.id).concat(entry);closeModal();renderAll();
  });
  $('#mCrimeName').on('change',function(){$('#mCrimeDefinition').text(RULES.crimes[this.value]||'')}).trigger('change');
}
function renderCriminalTitles(){
  $('#criminalTitleList').html((state.criminalTitles||[]).map(t=>`<div class="selected-row"><div><div class="row-title">${esc(t.name)} ${esc(t.grade)} <span class="pill">MANDATORY / EQUIPPED</span></div><div class="row-meta">${esc(t.notes||RULES.crimes[t.name]||'Unknown criminal title')}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-edit-crime="${esc(t.id)}">Edit</button><button class="ui-btn small danger" data-remove-crime="${esc(t.id)}">Correct / clear record</button></div></div>`).join('')||'<div class="muted">No criminal titles recorded.</div>');
}
function automaticTitles(){
  const arr=[],seen=new Set();const push=t=>{const key=String(t.name||'').trim().toLowerCase();if(!key||seen.has(key))return;seen.add(key);arr.push(t)};
  state.skills.filter(s=>s.name==='Educated'&&s.educatedBackground).forEach(s=>push({name:s.educatedBackground,source:'Educated background',equipped:true}));
  (state.criminalTitles||[]).forEach(t=>push({name:`${t.name} ${t.grade}`,source:'Criminal title',equipped:true}));
  const treeIds=state.origin.evolutionPath==='hybrid'?[state.origin.tree,...(state.origin.parents||[])]:[state.origin.tree];treeIds.filter(Boolean).forEach(id=>{const t=M.trees.find(x=>x.id===id);if(t)push({name:t.name,source:'Racial Tree',equipped:true})});
  if(state.identity.raceTitle)push({name:state.identity.raceTitle,source:'Race',equipped:true});
  if(state.origin.evolutionPath==='hybrid')push({name:'Hybrid',source:'Racial Path',equipped:true});
  state.skills.filter(s=>s.name==='Narrative Booster'&&String(s.detail||'').trim()).forEach(s=>push({id:s.id,name:s.detail.trim(),source:'Narrative Booster',equipped:true,fixedTitle:true}));
  state.assets.filter(a=>a.createsTitle!==false).forEach(a=>push({id:a.id,name:(a.titleName||a.name||'Asset Holder').trim(),source:'Asset',equipped:!!a.titleEquipped,assetTitle:true}));
  state.classes.forEach(c=>push({id:c.id,name:c.name,source:c.override?'Class (equivalent)':'Class',equipped:!!c.equipped,classTitle:true}));
  return arr;
}
function renderTitles(){
  renderCriminalTitles();
  const auto=automaticTitles();
  $('#titleList').html(auto.map(t=>{let action='';if(t.classTitle)action=`<div class="row-actions"><button class="ui-btn small ghost" data-equip-class="${t.id}">${t.equipped?'Unequip':'Equip'}</button></div>`;else if(t.assetTitle)action=`<div class="row-actions"><button class="ui-btn small ghost" data-equip-asset-title="${t.id}">${t.equipped?'Unequip':'Equip'}</button></div>`;return `<div class="selected-row"><div><div class="row-title">${esc(t.name)} <span class="pill">${esc(t.source)}</span>${t.equipped?'<span class="pill">EQUIPPED</span>':'<span class="pill">ACQUIRED</span>'}</div></div>${action}</div>`}).join('')+state.titles.map(t=>`<div class="selected-row"><div><div class="row-title">${esc(t.name)} ${t.equipped?'<span class="pill">EQUIPPED</span>':'<span class="pill">ACQUIRED</span>'}</div><div class="row-meta">${esc(t.notes||'Custom title')}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-equip-title="${t.id}">${t.equipped?'Unequip':'Equip'}</button><button class="ui-btn small danger" data-remove-title="${t.id}">×</button></div></div>`).join(''));
}
function jobTitleRank(grade){const idx=gradeIndex(grade);if(idx>=gradeIndex('S'))return 'Legendary';if(idx>=gradeIndex('A'))return 'Master';if(idx>=gradeIndex('C'))return 'Expert';if(idx>=gradeIndex('D'))return 'Adept';return 'Apprentice'}
function jobTitleNoun(skill){const detail=String(skill.detail||'').trim();if(skill.name.startsWith('Artisan'))return artisanType(skill)||'Artisan';if(skill.name.startsWith('Fighting Style')){const d=detail||'Weapon';const low=d.toLowerCase();if(/sword/.test(low))return 'Swordsman';if(/spear|lance|polearm/.test(low))return 'Lancer';if(/bow/.test(low)&&!/cross/.test(low))return 'Archer';if(/crossbow/.test(low))return 'Crossbowman';if(/gun|firearm|rifle|pistol/.test(low))return 'Gunner';if(/unarmed|fist|martial/.test(low))return 'Martial Artist';return `${d} User`}if(skill.name.startsWith('Helming'))return detail?`${detail} Pilot`:'Pilot';if(skill.name.startsWith('Masterwork #Maker'))return detail?`${detail} Maker`:'Maker';if(skill.name.startsWith('Masterwork #Harvester'))return detail?`${detail} Harvester`:'Harvester';if(skill.name.startsWith('Masterwork #Refiner'))return detail?`${detail} Refiner`:'Refiner';if(skill.name.startsWith('Masterwork #Builder'))return 'Builder';if(skill.name.startsWith('Masterwork #Infuser'))return detail?`${detail} Infuser`:'Infuser';return ''}
function jobTitleSuggestions(){const rows=[];state.skills.forEach(skill=>{if(!(M.jobTitleSkillFamilies||[]).some(f=>skill.name.startsWith(f)))return;const noun=jobTitleNoun(skill);if(!noun)return;const name=`${jobTitleRank(skill.grade)} ${noun}`;rows.push({id:skill.id,name,source:`${skillDisplayName(skill)} ${skill.grade}`})});return rows.filter((r,i,a)=>a.findIndex(x=>x.name.toLowerCase()===r.name.toLowerCase())===i)}
function renderJobTitleSuggestions(){const existing=new Set([...automaticTitles().map(t=>t.name),...state.titles.map(t=>t.name)].map(x=>String(x).toLowerCase()));const rows=jobTitleSuggestions().filter(r=>!existing.has(r.name.toLowerCase()));$('#jobTitleSuggestions').html(rows.map(r=>`<div class="selected-row"><div><div class="row-title">${esc(r.name)}</div><div class="row-meta">Suggested from ${esc(r.source)}</div></div><div class="row-actions"><button class="ui-btn small ghost" data-job-title="${r.id}">Review & Add</button></div></div>`).join('')||'<div class="muted">No new weapon/tool job title suggestions.</div>')}
function acceptJobTitleSuggestion(skillId){const skill=state.skills.find(s=>s.id===skillId);if(!skill)return;const suggestion=jobTitleSuggestions().find(x=>x.id===skillId);if(!suggestion)return;openModal('Add Job Title',`<div class="modal-form"><label>Suggested Title<input id="mJobTitle" value="${esc(suggestion.name)}"></label><label class="checkbox-row"><input id="mJobEquipped" type="checkbox"> Equip this title</label><label>Source / Notes<textarea id="mJobNotes" rows="3">Suggested from ${esc(suggestion.source)} using the Job Title progression.</textarea></label></div>`,()=>{const name=$('#mJobTitle').val().trim();if(!name)return;state.titles.push({id:uid('title'),name,notes:$('#mJobNotes').val().trim(),equipped:$('#mJobEquipped').is(':checked'),jobSuggestionSource:skillId});closeModal();renderAll()})}

function syncAutoClasses(){for(const c of M.classRules){const st=classStatus(c.id);const existing=state.classes.find(x=>x.id===c.id);if(st.ok&&!st.manual&&!existing)state.classes.push({id:c.id,name:c.name,tier:c.tier,override:false,auto:true,equipped:false,overrideReason:''});if(existing&&existing.auto&&(!st.ok||st.manual))state.classes=state.classes.filter(x=>x!==existing)}}
function equipClass(id){const c=state.classes.find(x=>x.id===id);if(!c)return;if(!c.equipped){state.classes.forEach(x=>{if(x.tier===c.tier)x.equipped=false});c.equipped=true}else c.equipped=false;renderAll()}
function namedSkillMatch(row,name){return row.name===name||row.name.startsWith(name+' ')||row.name.startsWith(name+'[')||row.name.startsWith(name+' [')}
function classStatus(id){
  const req=[];let ok=true,manual=false;const add=(pass,msg)=>{req.push({pass,msg});if(!pass)ok=false};
  const classSkills=acquiredSkills().filter(s=>!s.grantedByEducated||validateSkill(state.skills.find(p=>p.id===s.grantedByEducated)).ok).sort((a,b)=>gradeIndex(b.grade)-gradeIndex(a.grade)).filter((s,i,rows)=>rows.findIndex(x=>x.name===s.name&&String(x.detail||'').trim().toLowerCase()===String(s.detail||'').trim().toLowerCase())===i);
  const classBest=n=>bestSkillGrade(n,classSkills),classExact=n=>bestSkillGradeExact(n,classSkills);
  const sec=classSkills.filter(s=>(getSkillDef(s.name)||{}).category==='Secondary'); const intSec=sec.filter(s=>(getSkillDef(s.name)?.prerequisite||'').includes('Intelligence!')||s.governingStat==='Intelligence');
  const equip=(type,min)=>state.equipment.some(e=>equipmentTypeIds(e).includes(type)&&atLeast(e.grade,min));
  if(id==='anchor'){
    const config=M.classRules.find(c=>c.id==='anchor'),eligible=config.techniqueCores;
    const hasSkill=n=>classSkills.some(s=>namedSkillMatch(s,n)&&atLeast(s.grade,'F')&&validateSkill(s).ok);
    const styles=classSkills.filter(s=>RULES.isStyle(s)&&atLeast(s.grade,'E')&&RULES.styleTypes(s).some(t=>['melee','natural-melee'].includes(t))&&validateSkill(s).ok);
    const selected=styles.map(style=>({style,techniques:state.techniques.filter(t=>t.styleId===style.id&&eligible.includes(t.core)&&!RULES.techniqueCheck(t,ruleContext())).filter((t,i,rows)=>rows.findIndex(other=>other.core===t.core)===i)})).sort((a,b)=>b.techniques.length-a.techniques.length)[0];
    add(atLeast(state.stats.Strength,'D'),'Strength D');add(atLeast(state.stats.Vitality,'E'),'Vitality E');add(atLeast(characterGrade(),'E'),'Character Grade E');add(styles.length>0,'Melee Fighting Style E');
    add((selected?.techniques.length||0)>=(config.techniqueCount||1),config.techniqueCount?`${config.techniqueCount} listed techniques in one Fighting Style`:'Listed techniques in one Fighting Style; required count needs staff review');
    if(!config.techniqueCount)manual=true;
    add(hasSkill('Energized'),'Energized F');add(hasSkill('Superstrength'),'Superstrength F');add(hasSkill('Duration Reduction')||hasSkill('Resistance'),'Duration Reduction F or Resistance F');add(hasSkill('Athletics'),'Athletics F');add(sec.filter(s=>s.name!=='Athletics'&&validateSkill(s).ok).length>=2,'2 additional Secondary skills');add(equip('melee','E'),'Melee Weapon E');add(equip('heavy','F'),'Heavy Armor F');
  } else if(id==='caster'){
    add(atLeast(state.stats.Intelligence,'D'),'Intelligence D');add(intSec.length>=3,'3 Intelligence-based Secondary skills');add(atLeast(classExact('Magic')||'F','E')&&!!classExact('Magic'),'Magic E');add(state.affinities.filter(a=>(a.core==='Element'||/element/i.test(a.core+' '+a.detail))).length>=2,'2 Element affinities');add(atLeast(classExact('Range')||'F','F')&&!!classExact('Range'),'Range F');add(atLeast(classExact('Area of Effect')||'F','F')&&!!classExact('Area of Effect'),'Area of Effect F');add(atLeast(classExact('Targets')||'F','F')&&!!classExact('Targets'),'Targets F');add(atLeast(classExact('Duration')||'F','F')&&!!classExact('Duration'),'Duration F');add(equip('catalyst','E'),'Catalyst E');
  } else if(id==='striker'){
    add(atLeast(state.stats.Intelligence,'E'),'Intelligence E');add(atLeast(state.stats.Strength,'D'),'Strength D');add(atLeast(state.stats.Speed,'D'),'Speed D');const fs=classSkills.find(s=>s.name.startsWith('Fighting Style')&&atLeast(s.grade,'E'));add(!!fs,'Fighting Style E');if(fs){const ts=state.techniques.filter(t=>t.styleId===fs.id).map(t=>t.core.toLowerCase());add(ts.some(x=>x.includes('accurate')),'Accurate technique');add(ts.some(x=>x.includes('penetrat')),'Penetrating technique');if(!/one.?hand/i.test(fs.detail||''))manual=true}else{add(false,'Accurate technique');add(false,'Penetrating technique')}add(atLeast(classBest('Fast')||'F','E')&&!!classBest('Fast'),'Fast E');add(!!classBest('Warfare'),'Warfare F');add(sec.length>=1,'1 Secondary skill');add(equip('melee','E'),'One-handed melee weapon E');add(equip('light','E'),'Light Armor E');manual=true;
  } else if(id==='nomad'){
    const c=M.classRules.find(x=>x.id==='nomad'),help=c?.help||{};add(atLeast(state.stats.Intelligence,'C'),'Intelligence C');add(['Strength','Speed','Precision'].some(st=>atLeast(state.stats[st],'D')),'Strength, Speed, or Precision D');
    const profDefs=['Academia','Agriculture','Alchemy','Animal Handling','Architecture','Artisan','Business','Domestic Arts','Healing','Law','Mining','Navigation','Visual Arts','Profession'];const professions=classSkills.filter(r=>profDefs.some(n=>r.name.startsWith(n))&&((r.name.startsWith('Profession')&&atLeast(r.grade,'F'))||atLeast(r.grade,'E')));add(professions.length>=2,'2 listed profession choices at required grade');
    const supplemental=(help.supplemental||[]).map(x=>x.replace(/\s+[FEDCBAS]$/,'')).map(x=>x.replace(/ \[type\]$/i,''));const supplementalRows=classSkills.filter(r=>supplemental.some(n=>r.name===n||r.name.startsWith(n+' ')||r.name.startsWith(n+' [')));add(supplementalRows.length>=4,'4 listed supplemental Secondary skills F');
    add(classSkills.some(r=>['Fast','Jumping','Swim Speed','Climbing'].some(n=>namedSkillMatch(r,n))&&atLeast(r.grade,'F')),'1 listed movement skill F');const defining=['Deception','Disguise','Focus','Interrogation','Intimidation','Leadership','Lucky','Performance','Persuasion','Seduction','Street Sense'];add(classSkills.some(r=>defining.some(n=>r.name.startsWith(n))&&atLeast(r.grade,'F')),'1 defining Secondary skill F');
  } else if(id==='pathforger'){
    add(atLeast(state.stats.Strength,'E'),'Strength E');add(atLeast(state.stats.Precision,'D'),'Precision D');add(atLeast(state.stats.Intelligence,'D'),'Intelligence D');add(!!classBest('Profession'),'Profession F');add(!!classBest('Helming'),'Helming F');add(!!classBest('Artisan'),'Artisan F');add(!!classBest('Navigation'),'Navigation F');add(!!classBest('Engineering'),'Engineering F');add(!!classBest('Gear'),'Gear F');add(!!classBest('Energized'),'Energized F');add(state.equipment.some(e=>equipmentTypeIds(e).some(t=>['light','heavy'].includes(t))),'Light or Heavy Armor F');add(state.assets.some(a=>/vehicle/i.test(a.name+' '+a.notes)),'Vehicle Asset F');manual=true;
  }
  return {ok,manual,req};
}
function renderClassHelp(c){if(c.id==='anchor')return `<div class="class-help"><strong>Eligible techniques:</strong> ${c.techniqueCores.map(esc).join(', ')}.<p>${c.techniqueCount?`Choose ${c.techniqueCount} from the same Fighting Style.`:'The rules do not specify the required technique count; staff must confirm it.'}</p><p><strong>Cleave:</strong> ${esc(c.perkDescription)}</p></div>`;if(!c.help)return '';const block=(label,arr)=>arr?.length?`<div><strong>${label}:</strong> ${arr.map(esc).join(', ')}</div>`:'';return `<div class="class-help"><div><strong>What the Nomad categories mean</strong></div>${block('Profession choices',c.help.profession)}${block('Supplemental secondaries',c.help.supplemental)}${block('Movement',c.help.movement)}${block('Defining secondaries',c.help.defining)}</div>`}
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
    const parents=raceParentTrees(r);if(parents.length){state.origin.evolutionPath='hybrid';setPrimaryTree(parents[0].toLowerCase());state.origin.parents=parents.slice(1).map(x=>x.toLowerCase())}
  }else if(['Prime','Beast','Fae','Monster','Construct'].includes(r.tree))setPrimaryTree(r.tree.toLowerCase());
  state.ui.raceFilterTree=r.tree;renderAll();
}
function linkRecognizedRaceTitle(){const r=recognizedRaceByName(state.identity.raceTitle);if(r&&r.id!==state.origin.raceId)selectRaceTemplate(r.id,false);else if(!r&&state.origin.raceId)state.origin.raceId=''}
function raceAllowsEducated(race){return !!race&&(race.allowEducatedGrants===true||(race.requirements||[]).some(line=>/\bEducated\s+[FEDCBAS]\b/.test(line)))}
function countCategory(cat){return state.skills.filter(s=>(getSkillDef(s.name)||{}).category===cat).length}
function raceRequirementChecks(race){
  if(!race)return {checks:[],manual:[]};const checks=[],manual=[];const add=(pass,msg)=>checks.push({pass,msg});const lines=(race.requirements||[]).flatMap(x=>String(x).split(/\n/)).map(x=>x.trim()).filter(Boolean);
  const full=lines.join(' ');const raceSkills=raceAllowsEducated(race)?acquiredSkills():state.skills;
  const sizeMatch=full.match(/\b(Tiny|Small|Medium|Large|Huge)\s+size\b/i);if(sizeMatch)add(state.origin.size===sizeMatch[1].toLowerCase(),`${sizeMatch[1]} size`);
  const statRe=/\b(Strength|Precision|Intelligence|Vitality|Speed)\s*(?:-|:)?\s*([FEDCBAS])\b/gi;let m;const seenStats=new Set();while((m=statRe.exec(full))){const key=m[1]+m[2];if(seenStats.has(key))continue;seenStats.add(key);add(atLeast(state.stats[m[1]],m[2].toUpperCase()),`${m[1]} ${m[2].toUpperCase()}`)}
  const countRe=/(\d+)\s+(secondary|sense|movement)\s+skills?/ig;while((m=countRe.exec(full))){const n=Number(m[1]),cat=m[2].toLowerCase();const map={secondary:'Secondary',sense:'Sense',movement:'Movement'};add(raceSkills.filter(s=>(getSkillDef(s.name)||{}).category===map[cat]).length>=n,`${n} ${map[cat]} skill${n===1?'':'s'}`)}
  const magicReq=full.match(/(\d+)\s+magic skills?\/affinities/gi);if(magicReq){const n=Number(magicReq[0].match(/\d+/)[0]);add(countCategory('Magic')+state.affinities.length>=n,`${n} magic skills/affinities`)}
  const martialReq=full.match(/(\d+)\s+martial skills?\/techniques/gi);if(martialReq){const n=Number(martialReq[0].match(/\d+/)[0]);add(countCategory('Martial')+state.techniques.length>=n,`${n} martial skills/techniques`)}
  // Exact, high-confidence skill requirements found at the beginning of a requirement line.
  const defs=SKILLS.slice().sort((a,b)=>b.name.length-a.name.length);for(const line of lines){const c=line.replace(/\([^)]*pts?[^)]*\)/ig,'').replace(/\([^)]*\)/g,'').trim();if(/^(Total Cost|Evolves into|Titles?:|Features?:|Stats?:|Skills?:|Choose|Perk|or\b)/i.test(c))continue;let matched=false;for(const d of defs){const base=d.name.replace(/\[[^\]]+\]/g,'').replace(/\([^)]*\)/g,'').trim();if(base.length<3)continue;const re=new RegExp('^'+base.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:\\s+\\[[^\\]]+\\])?\\s*(?:-|:)?\\s*([FEDCBAS])\\b','i');const mm=c.match(re);if(mm){const g=bestSkillGrade(base,raceSkills)||bestSkillGradeExact(d.name,raceSkills);add(!!g&&atLeast(g,mm[1].toUpperCase()),`${base} ${mm[1].toUpperCase()}`);matched=true;break}}if(matched)continue;if(/^\[(.+?)\].*Affinity\s*(?:-|:)?\s*([FEDCBAS])\b/i.test(c)){const mm=c.match(/Affinity\s*(?:-|:)?\s*([FEDCBAS])\b/i);add(state.affinities.some(a=>atLeast(a.grade,mm[1].toUpperCase())),`Affinity ${mm[1].toUpperCase()}`);continue}if(/^\[[^\]]+\]|^(Natural|Special|Heightened|Sixth|Flight|Darkvision|Wings|Tail|Horns|Scales)/i.test(c))manual.push(c)}
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
  if(!$.fn.select2)return;$('select').each(function(){const $s=$(this);if($s.hasClass('no-enhance'))return;if($s.hasClass('select2-hidden-accessible')){$s.trigger('change.select2');return}const inModal=$s.closest('#modal').length;const searchable=$s.find('option').length>10;$s.select2({width:'100%',minimumResultsForSearch:searchable?0:Infinity,dropdownParent:inModal?$('#modal'):$(document.body)});});
}
function racialValidation(){
  if(state.origin.evolutionPath==='variant')return {ok:true,items:[]};
  const racialSkills=raceAllowsEducated(activeRaceTemplate())?acquiredSkills():state.skills;
  const trees=state.origin.evolutionPath==='hybrid'?[state.origin.tree,...state.origin.parents]:[state.origin.tree];let items=[];let all=true;
  for(const id of trees.filter((v,i,a)=>a.indexOf(v)===i)){
    const t=M.trees.find(x=>x.id===id);if(!t)continue;const add=(pass,msg)=>{items.push({pass,msg:`${t.name}: ${msg}`});if(!pass)all=false};
    if(id==='prime'){const magic=racialSkills.filter(s=>getSkillDef(s.name)?.category==='Magic').length+state.affinities.length;const martial=racialSkills.filter(s=>getSkillDef(s.name)?.category==='Martial').length+state.techniques.length;const secondary=racialSkills.filter(s=>getSkillDef(s.name)?.category==='Secondary').length;add(magic>=2||martial>=2||secondary>=2,'2 magic/affinity, martial/technique, or Secondary selections')}
    if(id==='beast'){add(state.equipment.some(e=>equipmentTypeIds(e).some(t=>['natural-melee','natural-ranged','natural-light','natural-heavy'].includes(t))),'Natural Weapon or Natural Armor F');add(racialSkills.filter(s=>getSkillDef(s.name)?.category==='Sense').length>=2,'2 Sense skills')}
    if(id==='fae'){add(!!bestSkillGradeExact('Magic'),'Magic F');add(racialSkills.filter(s=>getSkillDef(s.name)?.category==='Secondary').length>=1,'1 Secondary skill')}
    if(id==='monster'){add(!!bestSkillGradeExact('Magic')||!!bestSkillGrade('Fighting Style')||state.equipment.some(e=>equipmentTypeIds(e).some(t=>t.startsWith('natural-')&&t.includes('melee'))),'Magic, Fighting Style, or Natural Weapon F');add(racialSkills.some(s=>getSkillDef(s.name)?.category==='Movement'),'1 Movement skill');add(racialSkills.some(s=>getSkillDef(s.name)?.category==='Sense'),'1 Sense skill')}
    if(id==='construct'){add(racialSkills.filter(s=>getSkillDef(s.name)?.category==='Defensive').length>=1,'1 Defensive skill');add(racialSkills.filter(s=>getSkillDef(s.name)?.category==='Secondary').length>=2,'2 Secondary skills')}
  }
  return {ok:all,items};
}
function validation(){
  const errors=[],warnings=[];if(!state.identity.name.trim())errors.push('Character Name is required.');if(!state.identity.raceTitle.trim()&&!state.origin.tree)errors.push('A racial title is required.');
  (state.criminalTitles||[]).forEach(t=>{if(!Object.hasOwn(RULES.crimes,t.name)||!GRADE_ORDER.includes(t.grade))errors.push('Criminal titles must be Thief, Murder, Vandal, or Abuser with a valid grade.')});
  if(state.skills.some(s=>s.name==='Villainous'))warnings.push('Villainous: confirm the C+ criminal title was awarded by staff. Use only as an outnumbered antagonist against good-guy player characters.');
  const langs=state.identity.languages||[];if(!String(langs[0]||'').trim()||!String(langs[1]||'').trim())errors.push('Two starting languages must be specified.');if(state.origin.type==='native'&&state.origin.perk!=='Chosen Path'&&!String(state.origin.freeSkillDetail||'').trim())errors.push('Native Area Knowledge must specify an area and/or locale.');
  const rem=remainingPoints();if(rem<0)errors.push(`Build is ${Math.abs(rem)} points over budget.`);else if(rem>0&&pointsEarned()===0)errors.push(`All creation points must be spent. ${rem} points remain.`);else if(rem>0)warnings.push(`${rem} points remain unspent. Earned points include Scoop carry-in and count toward Standing.`);
  Object.entries(state.stats).forEach(([s,g])=>{if(statIndex(g)>statIndex(pointsEarned()>0?'A':'B'))errors.push(g==='S'?`${s}: S requires an approved tribulation; this editor currently supports up to A.`:`${s} exceeds the B creation cap; add earned points for advancement.`)});
  state.skills.forEach(r=>{const v=validateSkill(r);if(!v.ok)errors.push(`${r.name} ${r.grade}: ${v.message}`);else if(v.message.includes('Manual'))warnings.push(`${r.name}: ${v.message}.`)});
  state.techniques.forEach(r=>{const error=RULES.techniqueCheck(r,ruleContext());if(error)errors.push(`${techniqueDisplayName(r)}: ${error}.`)});
  state.affinities.forEach(r=>{const error=RULES.affinityCheck(r,ruleContext());if(error)errors.push(`${affinityDisplayName(r)}: ${error}.`)});
  state.equipment.forEach(r=>{const v=equipmentValidation(r);if(!v.ok)errors.push(`${r.name} ${r.grade}: ${v.msg}.`);if(r.artisanDiscountSkillId&&!String(r.material||'').trim())warnings.push(`${r.name}: record its material/construction so the Artisan discount can be reviewed.`)});
  state.assets.forEach(r=>{if(r.grade!=='F')errors.push(`${r.name}: starting Assets are capped at F.`)});
  const rv=racialValidation();if(!rv.ok)rv.items.filter(x=>!x.pass).forEach(x=>errors.push(`Racial requirement unmet: ${x.msg}.`));
  const race=activeRaceTemplate();if(race){const rs=raceStatus(race);if(rs.failed.length&&!String(state.origin.raceOverrideReason||'').trim())rs.failed.forEach(x=>errors.push(`${race.name} template unmet: ${x.msg}.`));else if(rs.failed.length)warnings.push(`${race.name} uses a race-template review/equivalency note: ${state.origin.raceOverrideReason}`);if(rs.manual.length)warnings.push(`${race.name} has ${rs.manual.length} template requirement note(s) that need human review.`)}
  if(state.origin.perk==='Chosen Path'&&!state.origin.chosenPathSkill)errors.push('Chosen Path is selected but no replacement skill has been chosen.');if(state.origin.perk==='Chosen Path'&&state.origin.chosenPathSkill&&chosenPathDetailInfo(state.origin.chosenPathSkill)&&!String(state.origin.chosenPathDetail||'').trim())errors.push(`${state.origin.chosenPathSkill} chosen through Chosen Path must specify what it applies to.`);
  if(state.origin.perk==='Chosen Path'&&state.origin.chosenPathSkill){const free={name:state.origin.chosenPathSkill,detail:state.origin.chosenPathDetail||''};if(RULES.price(free,7)!==7)errors.push('Chosen Path must use a 7-point skill subtype, not a higher-priced Resistance or movement option.');}
  if(state.origin.tree==='monster')warnings.push('Monster tree is a hard-mode antagonist path and is discouraged for new players.');
  if(!state.abilities.length)warnings.push('No abilities are set up. A finished character sheet should include at least one ability.');
  state.abilities.forEach(r=>{const c=abilityCalc(r);if(c.actions>3)warnings.push(`${r.name} is estimated at ${c.actions} actions and would not fit the standard 3-action Advanced Rules combat post without an override.`)});
  grantSkillRows().filter(skill=>skill.name==='Transformation').forEach(skill=>{const check=transformationCheck(skill);errors.push(...check.errors.map(e=>`${skillGrantName(skill)}: ${e}`));warnings.push(...check.warnings.map(e=>`${skillGrantName(skill)}: ${e}`))});
  grantSkillRows().forEach(skill=>{const g=state.skillGrants?.[skill.id]||{};if(!String(g.name||'').trim())errors.push(`${skill.name} ${skill.grade}: define the ${skill.name==='Item'?'bound item':'transformation form'} name in Skill Grants.`);if(!String(g.details||'').trim())warnings.push(`${skill.name} ${skill.grade}: no ${skill.name==='Transformation'?'form appearance':'granted build/details'} has been recorded yet.`)});
  state.classes.filter(c=>c.override).forEach(c=>{if(!String(c.overrideReason||'').trim())errors.push(`${c.name} class equivalency needs a written explanation.`);else warnings.push(`${c.name} was acquired using an equivalent/custom override: ${c.overrideReason}`)});
  const tamer=state.skills.find(x=>x.name==='Tamer');if(tamer&&state.followers?.buddy&&!String(state.followers.buddy.movement||'').trim())warnings.push('Tamer buddy has no primary movement recorded.');
  followerSkillRows('Minions').forEach(skill=>{const m=state.followers.minions?.[skill.id];if(m&&(Number(m.pointsUsed)||0)>(M.followerRules?.minions?.templatePoints||56))errors.push(`${m.name||'Minion template'} documents more than 56 points.`)});
  followerSkillRows('Companion').forEach(skill=>{const pool=state.followers.companions?.[skill.id];if(!pool)return;(pool.records||[]).forEach(r=>{if(String(r.name||'').trim()&&!String(r.build||'').trim())warnings.push(`${r.name} has no companion build details recorded.`)})});
  if(state.origin.perk==='Born For This'&&(state.origin.bornTargets||[]).length!==1)warnings.push('Born For This is selected but exactly one discount target has not been chosen.');
  if(state.origin.perk==='Born For These'){const expected=1+(state.origin.parents||[]).length;if((state.origin.bornTargets||[]).length!==expected)warnings.push(`Born For These should have ${expected} distinct 7-point discount targets, one per racial tree.`)}
  return {errors,warnings};
}
function refreshSummary(){const a=availablePoints(),s=totalSpent(),r=a-s;$('#summaryName').text(state.identity.name||'Unnamed Character');const eq=[...automaticTitles().filter(x=>x.equipped).map(x=>x.name),...state.titles.filter(x=>x.equipped).map(x=>x.name)];$('#summaryTitles').text(eq.length?[...new Set(eq)].join(' / '):'No equipped titles yet');$('#sumAvailable').text(a);$('#sumSpent').text(s);$('#sumRemaining,#mobileRemaining').text(r);$('#sumCharGrade,#mobileGrade,#characterGradeTop').text(characterGrade());$('#sumStanding').text(standingGrade());$('#sumPower').text(powerGrade());$('#budgetMeter').css('width',clamp((s/Math.max(1,a))*100,0,100)+'%');const v=validation();let q=v.errors.slice(0,3).map(x=>`<div class="warning-item">${esc(x)}</div>`).join('');if(!v.errors.length)q='<div class="ok-item">No blocking errors detected.</div>'+v.warnings.slice(0,2).map(x=>`<div class="warning-item">${esc(x)}</div>`).join('');$('#quickWarnings').html(q);}
function renderReview(force=true){if(!force&&$('[data-panel="review"]').is(':hidden'))return;const v=validation();let h='';if(v.errors.length)h+=`<div class="validation-group bad"><h3>${v.errors.length} blocking issue${v.errors.length===1?'':'s'}</h3><ul>${v.errors.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;else h+=`<div class="validation-group good"><h3>Creation checks passed</h3><div>The automated checks found no blocking issues. Narrative equivalencies and custom overrides can still require staff review.</div></div>`;if(v.warnings.length)h+=`<div class="validation-group"><h3>Review notes</h3><ul>${v.warnings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;$('#validationSummary').html(h);$('#sheetOutput').val(generateSheet())}

function generateSheet(){
  const lines=[];const add=(label,val)=>{if(val!==undefined&&val!==null&&String(val).trim()!=='')lines.push(`${label}: ${val}`)};const uniq=a=>[...new Set(a.filter(Boolean))];
  add('Character Name',state.identity.name);add("Rp'er Name",state.identity.player);add('Character Image',state.identity.imageUrl);
  const autoTitles=automaticTitles();const autoEquipped=autoTitles.filter(x=>x.equipped).map(x=>x.name);const customEquipped=state.titles.filter(x=>x.equipped).map(x=>x.name);const equipped=uniq([...autoEquipped,...customEquipped]);const acquiredAll=uniq([...autoTitles.filter(x=>!x.equipped).map(x=>x.name),...state.titles.filter(x=>!x.equipped).map(x=>x.name)]);const acquired=acquiredAll.filter(x=>!equipped.includes(x));if(equipped.length)add('Titles',equipped.join(', '));if(acquired.length)add('Acquired Titles',acquired.join(', '));
  add('Recorded Evolution Tier',state.origin.evolutionTier||'mundane');
  if((state.criminalTitles||[]).length){lines.push('Criminal Titles (mandatory equipped):');state.criminalTitles.forEach(t=>lines.push(`${t.name} ${t.grade}${t.notes?' - '+t.notes:''}`))}
  const perks=[];if(state.origin.perk){if(state.origin.perk==='Versatile'){const label={melee:'Melee Weapons',ranged:'Ranged Weapons',catalyst:'Catalysts'}[state.origin.versatileItem]||state.origin.versatileItem;perks.push(`Versatile [${label} may use ${state.origin.versatileStat} as an alternate governing stat]`)}else perks.push(state.origin.perk)}state.classes.filter(c=>c.equipped).forEach(c=>{const d=M.classRules.find(x=>x.id===c.id);if(d?.perk)perks.push(d.perk)});if(perks.length)add('Perks',perks.join(', '));
  const feat=[];if(state.identity.features.trim())feat.push(state.identity.features.trim());if(state.origin.evolutionPath==='hybrid')feat.push(`Mixed Race (${[state.origin.tree,...state.origin.parents].map(id=>M.trees.find(t=>t.id===id)?.name).filter(Boolean).join(' / ')})`);if(feat.length)add('Features',feat.join('; '));
  add('Points At Start',pointsAtStart());add('Points Spent',totalSpent());add('Points Earned',pointsEarned());const rem=remainingPoints();add('Character Points Remaining',rem);
  Object.entries(state.stats).forEach(([k,g])=>add(k,g));add('Character Grade',characterGrade());add('Standing Grade',standingGrade());
  if(state.identity.height)add('Height',state.identity.height);if(state.identity.weight)add('Weight',state.identity.weight);const languages=(state.identity.languages||[]).map(x=>String(x||'').trim()).filter(Boolean);if(languages.length)add('Languages',languages.join(', '));

  const free=freeSkillDisplay();const skillLines=[];if(free)skillLines.push(`${free.name} ${free.grade} (free: ${free.note})`);
  const usedTech=new Set();let affinitiesPlaced=false;
  const skillLine=r=>{let x=`${skillDisplayName(r)} ${r.grade}${limiterTotal(r)?'('+skillEffectGrade(r)+')':''}${r.specialized?' [Specialize]':''}`;if(limiterTotal(r))x+=` - Limiters: ${(r.limiters||[]).map(l=>l.type+' '+l.rank+(l.detail?' ['+l.detail+']':'')).join(', ')}`;const ruleSummary=skillRuleSummary(r);if(ruleSummary)x+=` - ${ruleSummary}`;if(r.notes)x+=` - ${r.notes}`;return x};
  const techLine=t=>{const name=techniqueDisplayName(t);const core=(t.detail&&t.core!=='Drain')?` [Core: ${t.core}]`:'';return `  [Technique] ${name} ${techniqueGrade(t)}${core}`};
  const affLine=a=>{const name=affinityDisplayName(a);const core=(a.detail&&a.core!=='Drain')?` [Core: ${a.core}]`:'';return `  [Affinity] ${name} ${a.grade}${core}`};
  state.skills.forEach(r=>{skillLines.push(skillLine(r));if(r.name==='Educated')RULES.educatedGrants({skills:[r]}).forEach(child=>skillLines.push('  [Educated Grant] '+skillLine(child)+` (${skillCost(child)} extra points)`));if(r.name==='Transformation')skillLines.push(transformationSheet(r).split('\n').map(line=>'  '+line).join('\n'));if(r.name==='Item'){const g=state.skillGrants?.[r.id]||{},budget=grantBudget(r);if(g.name||g.details||g.notes){let grant=`  [${r.name==='Item'?'Bound Item':'Transformation Form'} // ${budget} build pts] ${g.name||'Unnamed'}`;if(g.details)grant+=` - ${g.details}`;if(g.notes)grant+=` - ${g.notes}`;skillLines.push(grant)}}if(r.name.startsWith('Fighting Style'))state.techniques.filter(t=>t.styleId===r.id).forEach(t=>{skillLines.push(techLine(t));usedTech.add(t.id)});if(r.name==='Magic'&&!affinitiesPlaced){state.affinities.forEach(a=>skillLines.push(affLine(a)));affinitiesPlaced=true}});
  state.techniques.filter(t=>!usedTech.has(t.id)).forEach(t=>skillLines.push(techLine(t)));if(!affinitiesPlaced)state.affinities.forEach(a=>skillLines.push(affLine(a)));
  state.customRows.filter(r=>r.section==='Skill').forEach(r=>skillLines.push(`${r.name}${r.grade?' '+r.grade:''}${r.notes?' - '+r.notes:''}`));if(skillLines.length){lines.push('');lines.push('Skills:');lines.push(...skillLines)}

  if(state.abilities.length){lines.push('');lines.push('Abilities:');state.abilities.forEach(r=>{const c=abilityCalc(r);const comps=c.pool.map(x=>`${x.label} ${x.grade}`).join(', ');let x=`${r.name} - ${comps||'Custom components'}`;if(r.description)x+=` - ${r.description}`;x+=` - Grade ${c.grade} - ${c.cooldown==null?'?':c.cooldown} Post Cooldown`;if(c.actions!==1)x+=` - ${c.actions} Actions`;if(r.notes)x+=` - ${r.notes}`;lines.push(x)})}
  const eqLines=state.equipment.map(r=>{const types=equipmentDefs(r).map(t=>t.name).join(', ')||'Unspecified Equipment',art=state.skills.find(s=>s.id===r.artisanDiscountSkillId);let x=`${r.name} ${r.grade} [${types}]`;if(r.material)x+=` [Material: ${r.material}]`;if(art&&artisanDiscount(r))x+=` [Artisan-crafted: ${artisanLabel(art)}]`;if(r.notes)x+=` - ${r.notes}`;return x});state.customRows.filter(r=>r.section==='Equipment').forEach(r=>eqLines.push(`${r.name}${r.grade?' '+r.grade:''} [Custom Equipment]${r.notes?' - '+r.notes:''}`));(state.switchLinks||[]).forEach(l=>{const a=state.equipment.find(e=>e.id===l.a),b=state.equipment.find(e=>e.id===l.b);if(a&&b)eqLines.push(`Switch Equipment: ${a.name} ⇄ ${b.name} - only one active at a time; 1 action to switch${l.notes?' - '+l.notes:''}`)});if(eqLines.length){lines.push('');lines.push('Equipment:');lines.push(...eqLines)}
  const assetLines=systemAssets().map(r=>`${r.name} F - ${r.notes}`);state.assets.forEach(r=>assetLines.push(`${r.name} F${r.notes?' - '+r.notes:''}`));state.customRows.filter(r=>r.section==='Asset').forEach(r=>assetLines.push(`${r.name}${r.grade?' '+r.grade:''}${r.notes?' - '+r.notes:''}`));if(assetLines.length){lines.push('');lines.push('Assets:');lines.push(...assetLines)}
  if(state.skills.some(s=>s.name==='Tamer')&&state.followers?.buddy){const b=state.followers.buddy;lines.push('');lines.push('Buddy:');let x=`${b.name||'Unnamed Buddy'} F [${b.type||'Buddy'}] - Stats F, no purchased skills`;if(b.movement)x+=` - Primary Movement: ${b.movement}`;if(b.appearance)x+=` - ${b.appearance}`;if(b.notes)x+=` - ${b.notes}`;lines.push(x)}
  const minionLines=[];followerSkillRows('Minions').forEach(skill=>{const m=state.followers.minions?.[skill.id];if(m)minionLines.push(`${m.name||'Minion Template'} - ${Number(m.count)||5} minion(s) - ${Number(m.pointsUsed)||0}/56 points documented${m.build?' - '+m.build:''}`)});if(minionLines.length){lines.push('');lines.push('Minions:');lines.push(...minionLines)}
  const companionLines=[];followerSkillRows('Companion').forEach(skill=>{const pool=state.followers.companions?.[skill.id];const budget=companionPoolBudget(skill);(pool?.records||[]).forEach(r=>{if(!r.name&&!r.build)return;companionLines.push(`${r.name||'Unnamed Companion'}${r.build?' - '+r.build:''}`)});if((pool?.records||[]).some(r=>r.name||r.build))companionLines.unshift(`Shared Companion Build Pool: ${budget} points`) });if(companionLines.length){lines.push('');lines.push('Companions:');lines.push(...companionLines)}
  const classOverrides=state.classes.filter(c=>c.override&&c.overrideReason);if(classOverrides.length){lines.push('');lines.push('Class Equivalencies:');classOverrides.forEach(c=>lines.push(`${c.name}: ${c.overrideReason}`))}
  if(activeRaceTemplate()&&String(state.origin.raceOverrideReason||'').trim()){lines.push('');lines.push('Race Template Review:');lines.push(`${activeRaceTemplate().name}: ${state.origin.raceOverrideReason.trim()}`)}
  const customFeatures=state.customRows.filter(r=>r.section==='Feature');if(customFeatures.length){lines.push('');lines.push('Additional Features:');customFeatures.forEach(r=>lines.push(`${r.name}${r.notes?' - '+r.notes:''}`))}
  if(state.identity.backstory.trim()){lines.push('');add('Backstory',state.identity.backstory.trim())}if(state.identity.currentLife.trim()){lines.push('');add('Current Life',state.identity.currentLife.trim())}
  lines.push('');lines.push('Change Log:');lines.push('[Character Creation]');
  if(Number(state.earnedPoints)||0)lines.push(`Earned points (including any Scoop carry-in): ${Number(state.earnedPoints)} points.`);
  Object.entries(state.stats).forEach(([k,g])=>{if(g==='G')lines.push(`${k} F => G: +7 starting points.`);else if(g==='H')lines.push(`${k} F => H: +14 starting points.`);else if(g!=='F')lines.push(`${k} F => ${g}: ${M.statCostFromF[g]} points.`)});
  const size=M.sizes.find(s=>s.id===state.origin.size);if(size&&size.id!=='medium')lines.push(`${size.name} size: ${size.pointDelta>0?'+'+size.pointDelta+' earned points':Math.abs(size.pointDelta)+' points'}.`);
  if(mixedRaceCost())lines.push(`Mixed Race (${state.origin.parents.length} additional tree${state.origin.parents.length===1?'':'s'}): ${mixedRaceCost()} points.`);
  acquiredSkills().forEach(r=>lines.push(`${skillDisplayName(r)} ${r.grade}: ${skillCost(r)} points${(state.origin.bornTargets||[]).includes(r.id)?' after racial discount':''}.`));
  state.techniques.forEach(r=>lines.push(`${techniqueDisplayName(r)} ${techniqueGrade(r)} [Technique: ${r.core}]: ${techniqueCost(r)} points.`));
  state.affinities.forEach(r=>lines.push(`${affinityDisplayName(r)} ${r.grade} [Affinity: ${r.core}]: ${affinityCost(r)} points.`));
  state.equipment.forEach(r=>{const base=equipmentBaseCost(r),disc=artisanDiscount(r);lines.push(`${r.name} ${r.grade} [${equipmentDefs(r).map(t=>t.name).join(', ')||'Unspecified Equipment'}]: ${disc?`${base} base - ${disc} Artisan discount = `:''}${equipmentCost(r)} points.`)});(state.switchLinks||[]).forEach(l=>{const a=state.equipment.find(e=>e.id===l.a),b=state.equipment.find(e=>e.id===l.b);if(a&&b)lines.push(`Switch Equipment link (${a.name} / ${b.name}): 7 points.`)});
  systemAssets().forEach(r=>lines.push(`${r.name} F Asset: free from skill.`));
  state.assets.forEach(r=>lines.push(`${r.name} F Asset: ${assetCost(r)} points.`));
  state.customRows.forEach(r=>lines.push(`${r.name}${r.grade?' '+r.grade:''} (${r.section} override): ${Number(r.cost)||0} points.`));
  lines.push(`Total spent: ${totalSpent()} points.`);
    return lines.join('\n');
}
function copySheet(){const t=generateSheet();$('#sheetOutput').val(t);navigator.clipboard?.writeText(t).then(()=>flashButton($('#btnCopySheet'),'Copied')).catch(()=>{const el=$('#sheetOutput')[0];el.select();document.execCommand('copy');flashButton($('#btnCopySheet'),'Copied')})}
function flashButton($b,text){const old=$b.text();$b.text(text);playUiSound('confirm');setTimeout(()=>$b.text(old),900)}
function exportJson(){const payload={...state,exportedAt:new Date().toISOString(),builderVersion:M.version,rulesSnapshot:M.rulesSnapshot};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(state.identity.name||'isekai-hell-character').replace(/[^a-z0-9_-]+/gi,'-').toLowerCase()+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0)}
function importJson(e){const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const obj=JSON.parse(rd.result);state=mergeState(obj);renderAll();alert('Character imported.')}catch(err){alert('Could not import that JSON file.')}e.target.value=''};rd.readAsText(f)}
function mergeState(o){
  const d=defaultState();
  const origin={...d.origin,...(o.origin||{})};
  const legacyScoop=Number(o.schema||5)<7?pointAmount(origin.scoopPoints):0;
  const earnedPoints=pointAmount(o.earnedPoints)+legacyScoop;origin.scoopPoints=0;
  let langs=Array.isArray(o.identity?.languages)?o.identity.languages.slice(0,2):null;if(!langs||langs.length<2)langs=['Common',treeLanguage(origin.tree)];while(langs.length<2)langs.push(treeLanguage(origin.tree));
  const identity={...d.identity,...(o.identity||{}),languages:langs};
  const skills=(Array.isArray(o.skills)?o.skills:[]).map(x=>{const profession=String(x.name||'').startsWith('Profession');const r={...x,name:profession?'Profession [Name of profession]':String(x.name||''),detail:String(x.detail||(profession&&x.name!=='Profession [Name of profession]'?String(x.name).match(/\[([^\]]+)\]/)?.[1]||'':'')),artisanType:x.artisanType||'',artisanMaterial:x.artisanMaterial||'',limiters:Array.isArray(x.limiters)?x.limiters:[]};if(isArtisanSkill(r)&&!r.artisanType)r.artisanType=r.detail||'';return r});
  const techniques=(Array.isArray(o.techniques)?o.techniques:[]).map(t=>({...t,targetStat:t.targetStat||''}));
  const affinities=(Array.isArray(o.affinities)?o.affinities:[]).map(a=>({...a,targetStat:a.targetStat||''}));
  const equipment=(Array.isArray(o.equipment)?o.equipment:[]).map(e=>({...e,types:Array.isArray(e.types)&&e.types.length?e.types:(e.type?[e.type]:['melee']),material:e.material||'',artisanDiscountSkillId:e.artisanDiscountSkillId||''}));
  const assets=(Array.isArray(o.assets)?o.assets:[]).map(a=>({...a,createsTitle:a.createsTitle===undefined?true:!!a.createsTitle,titleName:a.titleName||(a.name||''),titleEquipped:!!a.titleEquipped}));
  const abilities=(Array.isArray(o.abilities)?o.abilities:[]).map(a=>({...a,components:Array.isArray(a.components)?a.components:[]}));
  const followers={...d.followers,...(o.followers||{}),minions:{...(o.followers?.minions||{})},companions:{...(o.followers?.companions||{})}};
  const classes=(Array.isArray(o.classes)?o.classes:[]).map(c=>({...c,overrideReason:c.overrideReason||''}));
  return {...d,...o,schema:8,earnedPoints,appVersion:M.version,identity,origin,stats:{...d.stats,...(o.stats||{})},skills,techniques,affinities,equipment,switchLinks:Array.isArray(o.switchLinks)?o.switchLinks:[],assets,abilities,titles:Array.isArray(o.titles)?o.titles:[],criminalTitles:Array.isArray(o.criminalTitles)?o.criminalTitles:[],classes,customRows:Array.isArray(o.customRows)?o.customRows:[],skillGrants:(o.skillGrants&&typeof o.skillGrants==='object')?o.skillGrants:{},followers,ui:{...d.ui,...(o.ui||{}),ambient:false}};
}
function saveLocal(show){localStorage.setItem('ih-character-builder-save',JSON.stringify(state));if(show)flashButton($('#btnSaveLocal'),'Saved')}
function loadLocalIfPresent(promptUser){try{const raw=localStorage.getItem('ih-character-builder-save');if(raw&&(!promptUser||confirm('Load saved character?')))state=mergeState(JSON.parse(raw))}catch(_){}}
function openModal(title,body,onSave){$('#modalTitle').text(transformationEditor?'Form: '+title:title);$('#modalBody').off('.equipment').html(body);modalSaveHandler=transformationEditor?()=>{transformationEditor.saving=true;try{onSave()}finally{if(transformationEditor)transformationEditor.saving=false}}:onSave;$modal[0].showModal();setTimeout(refreshFancySelects,0)}
function closeModal(){if(transformationEditor)restoreTransformationEditor(transformationEditor.saving);modalSaveHandler=null;$modal[0].close()}

$(init);
})(jQuery);
