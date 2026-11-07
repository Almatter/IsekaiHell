/* Structured creation rules. Kept independent of the DOM for regression checks. */
(function(root){
'use strict';
const grades=['F','E','D','C','B','A','S'], stats=['Strength','Precision','Intelligence','Vitality','Speed'];
const index=g=>grades.indexOf(g), meets=(g,min)=>index(g)>=index(min)&&index(min)>=0;
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const weapons=[
  ['Swords','melee'],['Axes','melee'],['Polearms','melee'],['Shields','shield'],
  ['Cannons','ranged'],['Guns','ranged'],['Bows','ranged'],['Crossbows','ranged'],
  ['Staves','melee'],['Clubs','melee'],['Short blades (daggers)','melee'],['Needles','melee'],
  ['Curved blades (sickles)','melee'],['Sling','ranged'],['Hammers','melee'],
  ['Natural weapons','natural-melee'],['Picks','melee'],['Forks','melee'],['Other','']
].map(([name,equipmentType])=>({name,equipmentType}));
const movements={'Balance':7,'Cat-Like':7,'Fancy Falling':14,'Light-Footed':7,'Quiet':7,'Slithering':7,'Speedburst 3x':7,'Speedburst 5x':14,'Untrackable':7,'Wall-Bouncing':7,'Wall-crawling':14,'Water Walking':14,'Zen Direction':7,'Other':7};
const makerStats={'Melee weapons':'Strength','Ranged weapons':'Precision','Catalyst':'Intelligence','Light armor':'Speed','Heavy armor':'Vitality'};
const refinerStats={'Minerals and Ores':'Strength','Wood and plant':'Precision','Animal':'Speed','Magical':'Intelligence','Monsters':'Vitality'};
const facilities={'Tamer Breeding':'Breeding Pen','Tamer Buddy Awakening':'Awakening Chamber','Tamer Buddy Maintenance':'Buddy Farm','Tamer Element Training':'Elemental Training Equipment','Tamer Merging':'Merging Circle','Tamer Skill Training':'Skill Training Equipment','Tamer Stat Training':'Stat Training Equipment'};
const crimes={Thief:'Taking possessions from a creature that is neither a criminal nor a monster.',Murder:'Killing a person who is neither a monster nor a criminal.',Vandal:'Intentionally damaging a non-monster/non-criminal owner’s property without permission.',Abuser:'Willfully harming a non-criminal/non-monster person without consent.'};
function suiteKind(r){if(r.name.startsWith('Martial Ethos'))return 'ethos';if(r.name.startsWith('Martial Mastery'))return 'mastery';if(r.name.startsWith('Magic School'))return 'school';if(r.name.startsWith('Magic Domain'))return 'domain';return ''}
function isStyle(r){return r?.name?.startsWith('Fighting Style')}
function price(r,base){
  if(r.name==='Resistance [Element]'){if(['physical','mundane','fullphysical','fullmundane','physicalmundane'].includes(norm(r.detail)))return 21;if(['magical','magic','fullmagical','fullmagic'].includes(norm(r.detail)))return 70}
  if(r.name==='Special Movement [movement type]')return movements[r.movementType]||movements[Object.keys(movements).find(n=>norm(n)===norm(r.detail))]||base;
  return base;
}
function details(r){
  if(!String(r.detail||'').trim()&&(/\[[^\]]+\]/.test(r.name)||['Narrative Booster','Area Knowledge','Heightened Sense','Supersense','Sixth Sense','Language','Gear','Scrying','Elasticity'].includes(r.name)))return 'Specify the subject, type, or specialization for this skill';
  if(isStyle(r)&&(!Array.isArray(r.weaponTypes)||!r.weaponTypes.length))return 'Select the weapon type for this Fighting Style';
  if(r.weaponTypes?.includes('Other')&&(!r.otherWeaponType?.trim()||!['melee','ranged','shield','natural-melee','natural-ranged'].includes(r.otherWeaponCategory)))return 'Other weapons need a name and a melee/ranged equipment category';
  if(r.name==='Special Movement [movement type]'&&!Object.hasOwn(movements,r.movementType))return 'Select a Special Movement type';
  return '';
}
function styleTypes(r){return (r.weaponTypes||[]).map(n=>n==='Other'?r.otherWeaponCategory:weapons.find(w=>w.name===n)?.equipmentType).filter(Boolean)}
function foundationPool(r,c){
  const kind=suiteKind(r);
  if(kind==='ethos'||kind==='mastery')return c.state.techniques.filter(t=>t.styleId===r.styleId).map(t=>({ref:'tech:'+t.id,name:t.detail||t.core,core:t.core,key:coreKey(t),grade:c.techniqueGrade(t),row:t}));
  const aff=c.state.affinities.map(a=>({ref:'aff:'+a.id,name:a.detail||a.core,core:a.core,key:coreKey(a),grade:a.grade,row:a}));
  const sk=c.state.skills.filter(s=>['Area of Effect','Duration','Range','Targets','Affinity [type]'].includes(s.name)).map(s=>({ref:'skill:'+s.id,name:s.detail||s.name,core:s.name,key:s.name==='Affinity [type]'?'Element:'+norm(s.detail):s.name,grade:s.grade,row:s}));
  return [...aff,...sk];
}
function coreKey(r){return /^(Element|Freeform|Blight(?: \[type\])?|Contact|Drain)$/.test(r.core)?r.core+':'+norm(r.targetStat||r.detail):r.core}
function suiteCheck(r,c,seen=new Set()){
  if(seen.has(r.id))return 'Circular foundation dependency';seen.add(r.id);
  const k=suiteKind(r);if(!k)return '';
  const skill=id=>c.state.skills.find(s=>s.id===id), need=grades[index(r.grade)+1];
  let parent=null;
  if(k==='mastery'||k==='domain'){
    if(c.state.skills.filter(s=>suiteKind(s)===k).length>1)return `Only one ${k==='mastery'?'Martial Mastery':'Magic Domain'} is permitted`;
    parent=skill(r.parentSkillId);
    if(!parent||suiteKind(parent)!==(k==='mastery'?'ethos':'school')||!need||!meets(parent.grade,need))return `Select a ${k==='mastery'?'Martial Ethos':'Magic School'} at least one grade higher`;
    const error=suiteCheck(parent,c,seen);if(error)return `Parent ${k==='mastery'?'Ethos':'School'}: ${error}`;
  }
  if(k==='ethos'||k==='mastery'){
    const style=skill(r.styleId);if(!isStyle(style)||!meets(style.grade,r.grade))return 'Select one Fighting Style of the same grade or higher';
    const styleCheck=c.validateSkill(style);if(!styleCheck.ok)return `Fighting Style: ${styleCheck.message}`;
    if(!r.foundationWeapon||!(style.weaponTypes||[]).includes(r.foundationWeapon))return 'Select one weapon type from the chosen Fighting Style';
    if(parent&&(parent.styleId!==r.styleId||parent.foundationWeapon!==r.foundationWeapon))return 'Mastery and its Ethos must use the same Fighting Style and weapon type';
  }else if(k==='school'){
    const magic=skill(r.magicSkillId);if(magic?.name!=='Magic'||!meets(magic.grade,r.grade))return 'Select a Magic skill of the same grade or higher';
    const magicCheck=c.validateSkill(magic);if(!magicCheck.ok)return `Magic: ${magicCheck.message}`;
    if(!String(r.schoolDescription||'').trim())return 'Describe the school’s magic, common spells, and teachings';
  }
  const refs=r.foundationRefs||[];if(refs.length!==5||new Set(refs).size!==5)return 'Select exactly five distinct acquired foundation entries';
  const pool=foundationPool(r,c), selected=refs.map(ref=>pool.find(p=>p.ref===ref));
  if(selected.some(p=>!p))return k==='ethos'||k==='mastery'?'A foundation entry was removed or belongs to another Fighting Style':'A selected affinity or augmenter was removed';
  if(new Set(selected.map(p=>p.key)).size!==5)return 'Foundation entries must represent five different cores or defined affinities';
  if(parent&&refs.some(ref=>(parent.foundationRefs||[]).includes(ref)))return 'Choose five additional foundation entries outside the parent collection';
  if(parent){const parentKeys=new Set(foundationPool(parent,c).filter(p=>(parent.foundationRefs||[]).includes(p.ref)).map(p=>p.key));if(selected.some(p=>parentKeys.has(p.key)))return 'Additional foundations must have different cores/affinities from the parent collection'}
  if((k==='ethos'||k==='school')&&selected.filter(p=>['Penetrating','Penetrate','Linked','Homing','Deflect','Accurate'].includes(p.core)).length>1)return 'Only one of Penetrating, Linked, Homing, Deflect, or Accurate may form this foundation';
  for(const p of selected){if(!meets(p.grade,r.grade))return `Foundation ${p.name} must be ${r.grade} or higher`;const err=p.ref.startsWith('tech:')?techniqueCheck(p.row,c):p.ref.startsWith('aff:')?affinityCheck(p.row,c):c.validateSkill(p.row);if(typeof err==='string'?err:!err.ok)return `Foundation ${p.name}: ${typeof err==='string'?err:err.message}`}
  return '';
}
function skillCheck(r,c){
  const s=c.state, skill=id=>s.skills.find(x=>x.id===id), next=grades[index(r.grade)+1];
  if(['Always Outnumbered','Villainous'].includes(r.name)&&!meets(c.standingGrade(),'C'))return 'Requires Standing C or higher';
  if(r.name==='Villainous'&&!(s.criminalTitles||[]).some(t=>Object.hasOwn(crimes,t.name)&&meets(t.grade,'C')))return 'Villainous requires a C-grade or higher criminal title: Thief, Murder, Vandal, or Abuser';
  if(isStyle(r)){
    if((r.weaponTypes||[]).some(n=>!weapons.some(w=>w.name===n)))return 'Choose weapon types from the list, or use Other';
    if(r.specialized&&s.skills.filter(x=>isStyle(x)&&x.specialized).length>1)return 'Only one Fighting Style may be specialized';
    const generalist=s.techniques.filter(t=>t.styleId===r.id&&t.core==='Generalist');
    if(r.specialized&&generalist.length)return 'Remove Generalist before specializing this Fighting Style';
    const allowance=1+generalist.reduce((max,t)=>Math.max(max,index(t.grade)+1),0);
    if((r.weaponTypes||[]).length>allowance)return 'Additional weapon types require Generalist techniques in this style';
    for(const type of styleTypes(r)){
      const def=c.meta.equipmentTypes.find(t=>t.id===type);if(!def)return 'Select a valid weapon equipment category';
      if(!next||!c.allowedStats(def).some(st=>meets(s.stats[st],next)))return `${def.name} Fighting Style requires ${c.allowedStats(def).join(' or ')} ${next||'S'}+`;
      if(!s.equipment.some(e=>c.equipmentTypes(e).includes(type)&&meets(e.grade,r.grade)))return `Requires ${def.name} equipment ${r.grade}+ for this style`;
    }
  }
  if(r.name.startsWith('Profession')&&!stats.includes(r.governingStat))return 'Choose the governing stat for this profession';
  const chosenStat=r.name.startsWith('Profession')?r.governingStat:r.name.startsWith('Masterwork Maker')?makerStats[r.craftType]:r.name.startsWith('Masterwork Refiner')?refinerStats[r.craftType]:null;
  if((r.name.startsWith('Masterwork Maker')||r.name.startsWith('Masterwork Refiner'))&&!chosenStat)return 'Select a listed Masterwork specialty';
  if(chosenStat&&(!next||!meets(s.stats[chosenStat],next)))return `Requires ${chosenStat} ${next||'S'} or higher`;
  if(facilities[r.name]){const t=skill(r.tamerSkillId),a=s.assets.find(a=>a.id===r.facilityAssetId);if(t?.name!=='Tamer'||!meets(t.grade,r.grade))return `Requires Tamer ${r.grade}+`;const parentCheck=c.validateSkill(t);if(!parentCheck.ok)return `Tamer prerequisite: ${parentCheck.message}`;if(!a||a.assetKind!==facilities[r.name]||!meets(a.grade,r.grade))return `Select a ${facilities[r.name]} Asset ${r.grade}+`}
  if(r.name==='Masterwork Developer [Type]'&&!s.skills.some(x=>x.name==='Gear'&&norm(x.detail).includes('developer')&&norm(x.detail).includes(norm(r.detail))))return 'Requires Gear F for this Developer specialty';
  if(r.name==='Capacity'&&index(r.grade)<=index('D')){const e=skill(r.elasticitySkillId);if(!['large','huge'].includes(s.origin.size)&&!(e?.name==='Elasticity'&&e.fullBody&&meets(e.grade,r.grade)))return 'Capacity F–D requires Large/Huge size or a selected full-body Elasticity skill of the same grade or higher'}
  if(r.name==='Chameleon'){
    if(s.origin.evolutionPath!=='hybrid'||!(s.origin.parents||[]).some(p=>p!==s.origin.tree))return 'Requires Hybrid title and Mixed Race (at least two parent trees)';
    if(!['intermediate','ascended'].includes(s.origin.evolutionTier))return 'Requires Intermediate or Ascended evolution on the Native/Hybrid path';
  }
  if(r.name==='Scrying'){
    const [kind,id]=String(r.focusRef||'').split(':');const item=kind==='asset'?s.assets.find(x=>x.id===id):kind==='equipment'?s.equipment.find(x=>x.id===id):kind==='skill'?s.skills.find(x=>x.id===id&&['Gear','Item'].includes(x.name)):null;
    if(!item||!meets(item.grade,r.grade))return `Select a possessed scrying focus (Asset, equipment, Gear or Item) ${r.grade}+`;
  }
  return suiteCheck(r,c);
}
function techniqueCheck(t,c){
  const style=c.state.skills.find(s=>s.id===t.styleId&&isStyle(s)),def=c.techniques.find(d=>d.name===t.core);
  if(!style)return 'Select an existing Fighting Style';
  if(style.specialized&&t.core==='Generalist')return 'Generalist is prohibited in a specialized Fighting Style';
  if(def?.nonUpgrading&&t.grade!=='F')return `${t.core} does not upgrade; its grade must remain F`;
  if(t.core==='Indirect'&&!c.state.techniques.some(x=>x.styleId===t.styleId&&x.core==='Range'))return 'Indirect requires an acquired Range technique in this Fighting Style';
  if(!meets(style.grade,c.techniqueGrade(t)))return 'Technique exceeds its Fighting Style grade';
  if((t.core==='Blight [type]'||t.core==='Contact'||!def)&&!String(t.detail||'').trim())return 'Specify this technique’s damage type, resistance type, or custom effect';
  if(t.core==='Drain'&&!stats.includes(t.targetStat))return 'Drain requires a chosen stat';
  return '';
}
function affinityCheck(a,c){
  const def=c.affinities.find(d=>d.name===a.core),next=grades[index(a.grade)+1];
  if(def?.nonUpgrading&&a.grade!=='F')return `${a.core} does not upgrade; its grade must remain F`;
  if(['Element','Freeform','Blight','Contact'].includes(a.core)&&!String(a.detail||'').trim())return 'Specify the element, damage/resistance type, or freeform affinity';
  if(a.core==='Drain'&&!stats.includes(a.targetStat))return 'Drain requires a chosen stat';
  if(!next||!meets(c.state.stats.Intelligence,next))return `Requires Intelligence ${next||'S'}+`;
  if(!['Element','Freeform'].includes(a.core)&&!c.state.skills.some(s=>s.name==='Magic'&&meets(s.grade,a.grade)))return `Requires Magic ${a.grade}+`;
  return '';
}
root.IH_RULES={grades,stats,weapons,movements,makerStats,refinerStats,facilities,crimes,suiteKind,isStyle,price,details,styleTypes,foundationPool,skillCheck,suiteCheck,techniqueCheck,affinityCheck};
})(typeof window==='undefined'?globalThis:window);
