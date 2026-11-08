const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function fixture(){
  const $=()=>({text(){return this},html(){return ''}}),ctx={window:{},jQuery:$,console};vm.createContext(ctx);
  for(const file of ['data/meta.js','data/skills.js','data/techniques.js','data/affinities.js','data/races.js','js/builder-rules.js','js/transformation.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
  const source=fs.readFileSync(path.join(root,'js/app.js'),'utf8').replace('$(init);','window.testApi={defaultState,setState:s=>state=s,validateSkill,ruleContext,validation,skillCost,techniqueCost,techniqueGrade,affinityCost,mergeState,generateSheet,skillRuleSummary,finalizeEducatedChoices,componentPool,acquiredSkills,pointsEarned,pointsAtStart,availablePoints,standingGrade,statGradeOptions,classStatus,racialValidation,raceRequirementChecks,skillDisplayName,automaticTitles,totalSpent,transformationBuild,transformationCheck,transformationSheet,withCharacter};');
  vm.runInContext(source,ctx,{filename:'app.js'});
  const a=ctx.window.testApi,s=a.defaultState(),rules=ctx.window.IH_RULES;
  Object.keys(s.stats).forEach(k=>s.stats[k]='B');s.identity.name='Test';s.origin.evolutionPath='native';s.origin.perk='Born For This';a.setState(s);
  const skill=(name,grade='F',extra={})=>{const row={id:'s'+s.skills.length,name,grade,detail:'Defined '+name,limiters:[],...extra};s.skills.push(row);return row};
  const tech=(style,core,grade='F',extra={})=>{const d=ctx.window.IH_TECHNIQUES.find(d=>d.name===core);const t={id:'t'+s.techniques.length,styleId:style.id,core,grade,detail:core,baseCost:d?.baseCost||7,...extra};s.techniques.push(t);return t};
  const aff=(core,grade='F',detail=core)=>{const x={id:'a'+s.affinities.length,core,grade,detail};s.affinities.push(x);return x};
  const style=(grade='F',extra={})=>{s.equipment.push({id:'e'+s.equipment.length,types:['melee'],grade});return skill('Fighting Style [Style Name]',grade,{weaponTypes:['Swords'],...extra})};
  const standing=grade=>ctx.window.IH_META.standingThresholds=[{grade,min:0}];
  return {a,s,rules,skill,tech,aff,style,standing,ctx};
}
test('Always Outnumbered and Villainous use fixed C Standing and structured criminal grades',()=>{
  const f=fixture(),o=f.skill('Always Outnumbered'),v=f.skill('Villainous');
  assert.match(f.a.validateSkill(o).message,/Standing C/);assert.match(f.a.validateSkill(v).message,/Standing C/);
  f.standing('C');assert.equal(f.a.validateSkill(o).ok,true);assert.match(f.a.validateSkill(v).message,/criminal title/);
  for(const name of ['Thief','Murder','Vandal','Abuser']){f.s.criminalTitles=[{id:name,name,grade:'D'}];assert.equal(f.a.validateSkill(v).ok,false);f.s.criminalTitles[0].grade='C';assert.equal(f.a.validateSkill(v).ok,true)}
  f.s.criminalTitles=[{name:'Bandit',grade:'S'}];assert.equal(f.a.validateSkill(v).ok,false);
});
test('Polymorph uses independent Character +2 and Intelligence +1 requirements',()=>{
  const f=fixture(),p=f.skill('Polymorph');f.s.stats={Strength:'B',Precision:'C',Intelligence:'E',Vitality:'D',Speed:'F'};assert.equal(f.a.validateSkill(p).ok,true);
  f.s.stats.Intelligence='F';assert.match(f.a.validateSkill(p).message,/Intelligence E/);
  f.s.stats={Strength:'E',Precision:'E',Intelligence:'E',Vitality:'E',Speed:'E'};assert.match(f.a.validateSkill(p).message,/Character Grade D/);
});
test('style weapon types, Other, Generalist allowance and governing stat are checked',()=>{
  const f=fixture(),s=f.style();assert.equal(f.a.validateSkill(s).ok,true);
  s.weaponTypes=[];assert.equal(f.a.validateSkill(s).ok,false);s.weaponTypes=['Laser banana'];assert.equal(f.a.validateSkill(s).ok,false);
  s.weaponTypes=['Other'];s.otherWeaponType='Chain';s.otherWeaponCategory='melee';assert.equal(f.a.validateSkill(s).ok,true);
  s.weaponTypes=['Swords','Axes'];assert.match(f.a.validateSkill(s).message,/Generalist/);f.tech(s,'Generalist');assert.equal(f.a.validateSkill(s).ok,true);
  f.s.stats.Strength='F';assert.match(f.a.validateSkill(s).message,/Strength E/);
});
test('one specialized style excludes Generalist but does not exclude other styles',()=>{
  const f=fixture(),a=f.style('F',{specialized:true}),b=f.style();assert.equal(f.a.validateSkill(a).ok,true);assert.equal(f.a.validateSkill(b).ok,true);
  b.specialized=true;assert.match(f.a.validateSkill(a).message,/Only one/);b.specialized=false;
  const t=f.tech(a,'Generalist');assert.match(f.rules.techniqueCheck(t,f.a.ruleContext()),/prohibited/);
});
function ethosFixture(){
  const f=fixture(),style=f.style('E'),ts=['Area','Blight [type]','Breaker','Contact','Continuing'].map(x=>f.tech(style,x,'E'));
  const e=f.skill('Martial Ethos [Weapon Type] (name)','E',{styleId:style.id,foundationWeapon:'Swords',foundationRefs:ts.map(t=>'tech:'+t.id)});
  return {...f,styleRow:style,ts,e};
}
test('Ethos requires five real distinct techniques in a single style and grows with them',()=>{
  const f=ethosFixture();assert.equal(f.a.validateSkill(f.e).ok,true);
  f.e.foundationRefs.pop();assert.match(f.a.validateSkill(f.e).message,/five/);f.e.foundationRefs.push('tech:missing');assert.match(f.a.validateSkill(f.e).message,/removed/);
  f.e.foundationRefs[4]='tech:'+f.ts[4].id;f.ts[4].grade='F';assert.match(f.a.validateSkill(f.e).message,/must be E/);f.ts[4].grade='E';
  const other=f.style('E'),t=f.tech(other,'Continuing','E');f.e.foundationRefs[4]='tech:'+t.id;assert.match(f.a.validateSkill(f.e).message,/another Fighting Style/);
});
test('Ethos restricted cores and duplicate core purchases cannot bypass breadth requirements',()=>{
  const f=ethosFixture();f.ts[0].core='Accurate';f.ts[1].core='Deflect';assert.match(f.a.validateSkill(f.e).message,/Only one/);
  f.ts[1].core='Accurate';assert.match(f.a.validateSkill(f.e).message,/different cores/);
});
test('Mastery binds to one Ethos/style/weapon and five additional techniques',()=>{
  const f=ethosFixture(),extra=['Drain','Enervation','Flare','Flexible','Homing'].map(core=>f.tech(f.styleRow,core,'F',{targetStat:'Strength'}));
  const m=f.skill('Martial Mastery [Weapon Type] (name)','F',{styleId:f.styleRow.id,parentSkillId:f.e.id,foundationWeapon:'Swords',foundationRefs:extra.map(t=>'tech:'+t.id)});
  assert.equal(f.a.validateSkill(m).ok,true);m.foundationRefs[0]=f.e.foundationRefs[0];assert.match(f.a.validateSkill(m).message,/outside/);m.foundationRefs[0]='tech:'+extra[0].id;
  const other=f.style();m.styleId=other.id;assert.match(f.a.validateSkill(m).message,/same Fighting Style/);m.styleId=f.styleRow.id;
  f.e.grade='F';assert.match(f.a.validateSkill(m).message,/one grade higher/);
});
function schoolFixture(){
  const f=fixture(),magic=f.skill('Magic','D');const affs=['Fire','Water','Wind','Earth','Light'].map(n=>f.aff('Element','E',n));
  const school=f.skill('Magic School: [name of a school of magic]','E',{magicSkillId:magic.id,schoolDescription:'Elemental study',foundationRefs:affs.map(a=>'aff:'+a.id)});
  return {...f,magic,affs,school};
}
test('School validates real affinities, distinct elements, grades and collection requirements',()=>{
  const f=schoolFixture();assert.equal(f.a.validateSkill(f.school).ok,true);
  f.affs[1].detail='Fire';assert.match(f.a.validateSkill(f.school).message,/different cores/);f.affs[1].detail='Water';
  f.school.foundationRefs[4]='aff:missing';assert.match(f.a.validateSkill(f.school).message,/removed/);f.school.foundationRefs[4]='aff:'+f.affs[4].id;
  f.school.schoolDescription='';assert.match(f.a.validateSkill(f.school).message,/Describe/);
});
test('Domain needs higher School and five distinct additional acquired affinities',()=>{
  const f=schoolFixture(),more=['Ice','Lightning','Metal','Darkness','Steam'].map(n=>f.aff('Element','F',n));
  const d=f.skill('Magic Domain [magic name]','F',{parentSkillId:f.school.id,foundationRefs:more.map(a=>'aff:'+a.id)});
  assert.equal(f.a.validateSkill(d).ok,true);d.foundationRefs[0]=f.school.foundationRefs[0];assert.match(f.a.validateSkill(d).message,/outside/);d.foundationRefs[0]='aff:'+more[0].id;
  more[0].detail='Fire';assert.match(f.a.validateSkill(d).message,/different cores\/affinities/);more[0].detail='Ice';
  f.skill('Magic Domain [magic name]');assert.match(f.a.validateSkill(d).message,/Only one/);
});
test('school may select acquired augmenters but their own Magic prerequisite still applies',()=>{
  const f=schoolFixture(),range=f.skill('Range','E');f.school.foundationRefs[0]='skill:'+range.id;assert.equal(f.a.validateSkill(f.school).ok,true);
  f.magic.grade='E';assert.match(f.a.validateSkill(f.school).message,/Requires Magic D/);
});
test('Profession, Maker and Refiner enforce selected and subtype-derived stats',()=>{
  const f=fixture(),p=f.skill('Profession [Name of profession]');assert.match(f.a.validateSkill(p).message,/governing stat/);p.governingStat='Speed';assert.equal(f.a.validateSkill(p).ok,true);f.s.stats.Speed='F';assert.match(f.a.validateSkill(p).message,/Speed E/);
  for(const [type,stat] of Object.entries(f.rules.makerStats)){const r=f.skill('Masterwork Maker [Type]','F',{craftType:type});f.s.stats[stat]='E';assert.equal(f.a.validateSkill(r).ok,true);f.s.stats[stat]='F';assert.match(f.a.validateSkill(r).message,new RegExp(stat+' E'));f.s.stats[stat]='B'}
  for(const [type,stat] of Object.entries(f.rules.refinerStats)){const r=f.skill('Masterwork Refiner [Type]','F',{craftType:type});f.s.stats[stat]='E';assert.equal(f.a.validateSkill(r).ok,true);f.s.stats[stat]='F';assert.equal(f.a.validateSkill(r).ok,false);f.s.stats[stat]='B'}
});
test('every Tamer branch requires matching Tamer and typed facility grades',()=>{
  const f=fixture();f.standing('D');const t=f.skill('Tamer','E');
  for(const [name,type] of Object.entries(f.rules.facilities)){
    const r=f.skill(name,'E',{tamerSkillId:t.id,facilityAssetId:'facility'});assert.match(f.a.validateSkill(r).message,/Select a .*Asset/);
    f.s.assets=[{id:'facility',name:'Test facility',assetKind:type,grade:'F'}];assert.equal(f.a.validateSkill(r).ok,false);f.s.assets[0].grade='E';assert.equal(f.a.validateSkill(r).ok,true);
    t.grade='F';assert.match(f.a.validateSkill(r).message,/Requires Tamer E/);t.grade='E';f.s.assets[0].assetKind='Other';assert.equal(f.a.validateSkill(r).ok,false);
  }
});
test('Capacity checks Large/Huge or same-grade full-body Elasticity',()=>{
  const f=fixture(),cap=f.skill('Capacity','D');assert.equal(f.a.validateSkill(cap).ok,false);f.s.origin.size='large';assert.equal(f.a.validateSkill(cap).ok,true);
  f.s.origin.size='medium';const e=f.skill('Elasticity','D',{fullBody:true});cap.elasticitySkillId=e.id;assert.equal(f.a.validateSkill(cap).ok,true);e.fullBody=false;assert.equal(f.a.validateSkill(cap).ok,false);e.fullBody=true;e.grade='E';assert.equal(f.a.validateSkill(cap).ok,false);
});
test('Chameleon requires two trees and recorded Native/Hybrid advanced evolution',()=>{
  const f=fixture(),r=f.skill('Chameleon');assert.equal(f.a.validateSkill(r).ok,false);f.s.origin.evolutionPath='hybrid';f.s.origin.parents=['beast'];assert.equal(f.a.validateSkill(r).ok,false);f.s.origin.evolutionTier='intermediate';assert.equal(f.a.validateSkill(r).ok,true);f.s.origin.parents=[];assert.equal(f.a.validateSkill(r).ok,false);
});
test('Scrying requires an existing possessed focus at its grade and Standing',()=>{
  const f=fixture(),r=f.skill('Scrying');assert.equal(f.a.validateSkill(r).ok,false);f.s.assets=[{id:'mirror',name:'Mirror',grade:'F'}];r.focusRef='asset:mirror';assert.equal(f.a.validateSkill(r).ok,true);
  r.grade='E';assert.equal(f.a.validateSkill(r).ok,false);f.s.assets[0].grade='E';assert.match(f.a.validateSkill(r).message,/Standing E/);f.standing('E');assert.equal(f.a.validateSkill(r).ok,true);f.s.assets=[];assert.equal(f.a.validateSkill(r).ok,false);
});
test('affinity grade and definition checks apply to elemental and advanced cores',()=>{
  const f=fixture(),a=f.aff('Element','F','Fire');assert.equal(f.rules.affinityCheck(a,f.a.ruleContext()),'');f.s.stats.Intelligence='F';assert.match(f.rules.affinityCheck(a,f.a.ruleContext()),/Intelligence E/);f.s.stats.Intelligence='B';
  a.core='Accurate';assert.match(f.rules.affinityCheck(a,f.a.ruleContext()),/Magic F/);f.skill('Magic');assert.equal(f.rules.affinityCheck(a,f.a.ruleContext()),'');a.core='Element';a.detail='';assert.match(f.rules.affinityCheck(a,f.a.ruleContext()),/Specify/);
});
test('variable Resistance and Special Movement prices follow subtype and grade',()=>{
  const f=fixture();for(const [detail,base] of [['Physical',21],['Mundane',21],['Magical',70],['Fire',7]]){const r=f.skill('Resistance [Element]','D',{detail});assert.equal(f.a.skillCost(r),base*3)}
  for(const [movementType,base] of Object.entries(f.rules.movements)){const r=f.skill('Special Movement [movement type]','E',{movementType});assert.equal(f.a.skillCost(r),base*2)}
});
test('non-upgrading techniques and affinities stay F including specialized styles',()=>{
  const f=fixture(),style=f.style('D',{specialized:true}),t=f.tech(style,'Blind Fighter','F');assert.equal(f.a.techniqueGrade(t),'F');assert.equal(f.a.techniqueCost(t),7);t.grade='D';assert.match(f.rules.techniqueCheck(t,f.a.ruleContext()),/remain F/);assert.equal(f.a.techniqueCost(t),7);
  const a=f.aff('Blind Fighter','E');f.skill('Magic','E');assert.match(f.rules.affinityCheck(a,f.a.ruleContext()),/remain F/);assert.equal(f.a.affinityCost(a),7);
});
test('Incurable and Indirect are cataloged as martial cores without absorbing adjacent text',()=>{
  const f=fixture();for(const name of ['Incurable','Indirect'])assert.ok(f.ctx.window.IH_TECHNIQUES.some(t=>t.name===name&&t.baseCost===7));assert.doesNotMatch(f.ctx.window.IH_TECHNIQUES.find(t=>t.name==='Incurable').description,/Indirect/);
});
test('required subjects and imported legacy data get validation rather than invented foundations',()=>{
  const f=fixture();for(const name of ['Feature [Feature Name]','Special Movement [movement type]','Profession [Name of profession]','Resistance [Element]','Language','Gear'])assert.equal(f.a.validateSkill(f.skill(name,'F',{detail:''})).ok,false,name);
  const imported=f.a.mergeState({schema:5,skills:[{id:'old',name:'Fighting Style [Style Name]',grade:'F',detail:'Sword'}]});assert.equal(imported.schema,8);assert.equal(imported.criminalTitles.length,0);f.a.setState(imported);assert.match(f.a.validateSkill(imported.skills[0]).message,/weapon type/);
});
test('JSON roundtrip preserves dependencies, criminal grades, facility types and chosen stats',()=>{
  const f=schoolFixture();f.s.criminalTitles=[{id:'c',name:'Thief',grade:'C',notes:'Staff award'}];f.s.assets=[{id:'a',name:'Pen',grade:'F',assetKind:'Breeding Pen'}];const copy=f.a.mergeState(JSON.parse(JSON.stringify(f.s)));
  assert.equal(copy.skills.find(s=>s.id===f.school.id).foundationRefs.join(','),f.school.foundationRefs.join(','));assert.equal(copy.criminalTitles[0].grade,'C');assert.equal(copy.assets[0].assetKind,'Breeding Pen');
});
function educated(f,extra={}){return f.skill('Educated','F',{educatedBackground:'Academy Graduate',educatedChoices:[{name:'Arcana',detail:'',upgradeGrade:'F'},{name:'History',detail:'',upgradeGrade:'F'},{name:'Profession [Name of profession]',detail:'Archive cataloguer',governingStat:'Intelligence',upgradeGrade:'F'}],...extra})}
function formFixture(){const f=fixture(),skill=f.skill('Transformation');f.s.skillGrants[skill.id]={name:'Ghost form',details:'An ethereal body',notes:''};return {...f,parent:skill,grant:f.s.skillGrants[skill.id],form:f.ctx.window.IH_TRANSFORMATION}}
test('Transformation gives 28 per grade and never changes the parent budget or purchases',()=>{
  const f=formFixture(),fast=f.skill('Fast','E');const before=f.a.totalSpent();f.grant.form={removedRefs:['skills:'+fast.id]};
  let b=f.a.transformationBuild(f.parent);assert.equal(b.baseBudget,28);assert.equal(b.refunds,14);assert.equal(b.budget,42);assert.equal(f.a.totalSpent(),before);assert.ok(f.s.skills.includes(fast));
  f.parent.grade='D';assert.equal(f.a.transformationBuild(f.parent).baseBudget,84);
});
test('Transformation refunds actual discounted spending and never refunds free Educated grants twice',()=>{
  const f=formFixture(),fast=f.skill('Fast');f.s.origin.bornTargets=[fast.id];const e=educated(f);e.educatedChoices[0].extraPointsPaid=7;e.educatedChoices[0].upgradeGrade='E';
  const paid=f.a.totalSpent();f.grant.form={removedRefs:['skills:'+fast.id,'skills:'+fast.id,'skills:'+e.id,'skills:educated:'+e.id+':0']};
  const b=f.a.transformationBuild(f.parent);assert.equal(b.refunds,14);assert.equal(b.effective.skills.some(r=>r.id===e.id),false);assert.equal(f.a.totalSpent(),paid);
});
test('Transformation selectively disables paid and cosmetic features and abilities without invented refunds',()=>{
  const f=formFixture(),feature=f.skill('Feature [Feature Name]','F',{detail:'Wings'});f.s.identity.features='Fur; Blue eyes';f.s.abilities=[{id:'flight',name:'Flight',components:['skill:'+feature.id]}];
  f.grant.form={removedRefs:['skills:'+feature.id,'feature:'+encodeURIComponent('Fur'),'abilities:flight','origin-free']};
  const b=f.a.transformationBuild(f.parent);assert.equal(b.refunds,7);assert.equal(b.effective.identity.features,'Blue eyes');assert.equal(b.effective.abilities.length,0);assert.equal(b.effective.formDisableOriginSkill,true);assert.equal(f.s.identity.features,'Fur; Blue eyes');
});
test('Transformation equipment melds by default, natural equipment persists, and melding refunds nothing',()=>{
  const f=formFixture();f.s.equipment=[{id:'sword',name:'Sword',types:['melee'],grade:'F'},{id:'claws',name:'Claws',types:['natural-melee'],grade:'F'}];
  let b=f.a.transformationBuild(f.parent);assert.deepEqual(Array.from(b.effective.equipment,r=>r.id),['claws']);assert.equal(b.refunds,0);
  f.grant.form={retainedEquipmentIds:['sword']};b=f.a.transformationBuild(f.parent);assert.deepEqual(Array.from(b.effective.equipment,r=>r.id),['sword']);assert.equal(b.spent,0);assert.equal(b.refunds,0);
});
test('Transformation charges only stat upgrades and additional purchases, preserving independent forms',()=>{
  const f=formFixture();f.s.stats.Strength='F';f.grant.form={stats:{Strength:'D'},added:{skills:[{id:'new',name:'Fast',grade:'E',detail:'',limiters:[]}]}};
  const b=f.a.transformationBuild(f.parent);assert.equal(b.spent,28);assert.equal(b.remaining,0);assert.equal(f.s.stats.Strength,'F');assert.equal(f.s.skills.length,1);
  const second=f.skill('Transformation');f.s.skillGrants[second.id]={name:'Other'};assert.equal(f.a.transformationBuild(second).spent,0);
  f.grant.form.stats.Strength='H';assert.match(f.a.transformationCheck(f.parent).errors.join(' '),/stats are inherited/);
});
test('Transformation validates size change distance and usable prerequisites without size point bonuses',()=>{
  const f=formFixture();f.grant.form={size:'huge'};assert.match(f.a.transformationCheck(f.parent).errors.join(' '),/Size Change E/);
  const size=f.skill('Size Change','E');let b=f.a.transformationCheck(f.parent);assert.equal(b.errors.length,0);assert.equal(b.refunds,0);assert.equal(b.spent,0);
  f.grant.form.removedRefs=['skills:'+size.id];assert.match(f.a.transformationCheck(f.parent).errors.join(' '),/Size Change E/);
});
test('Transformation rejects nested forms, overspending and dangling ability or inherited references',()=>{
  const f=formFixture(),fast=f.skill('Fast');f.s.abilities=[{id:'run',name:'Run',components:['skill:'+fast.id]}];f.grant.form={removedRefs:['skills:'+fast.id,'skills:missing'],added:{skills:[{id:'nested',name:'Transformation',grade:'A',limiters:[]},{id:'expensive',name:'Fast',grade:'A',limiters:[]}]}};
  const errors=f.a.transformationCheck(f.parent).errors.join(' ');assert.match(errors,/cannot purchase or upgrade Transformation/);assert.match(errors,/over budget/);assert.match(errors,/no longer exists/);assert.match(errors,/component is unavailable/);
});
test('Transformation checks skill prerequisites against the form, including modified stats and melded weapons',()=>{
  const f=formFixture();f.s.stats.Speed='F';f.grant.form={added:{skills:[{id:'fast',name:'Fast',grade:'F',detail:'',limiters:[]}]}};
  assert.match(f.a.transformationCheck(f.parent).errors.join(' '),/Speed E/);f.grant.form.stats={Speed:'E'};assert.equal(f.a.transformationCheck(f.parent).errors.length,0);
  const style=f.style();assert.match(f.a.transformationCheck(f.parent).errors.join(' '),/equipment F/);f.grant.form.retainedEquipmentIds=f.s.equipment.map(r=>r.id);assert.equal(f.a.transformationCheck(f.parent).errors.length,0);
});
test('Transformation overlays inherit future base changes and preserve exact form upgrades across JSON',()=>{
  const f=formFixture(),fast=f.skill('Fast');let effective=f.form.build(f.s,f.grant);effective.skills.find(r=>r.id===fast.id).grade='E';f.grant.form=f.form.capture(f.s,effective,f.grant);
  fast.notes='New base note';const b=f.a.transformationBuild(f.parent);assert.equal(b.effective.skills.find(r=>r.id===fast.id).notes,'New base note');assert.equal(b.spent,7);
  const restored=f.a.mergeState(JSON.parse(JSON.stringify(f.s)));f.a.setState(restored);assert.equal(f.a.transformationBuild(restored.skills[0]).spent,7);assert.match(f.a.generateSheet(),/TRANSFORMATION FORM/);assert.match(f.a.generateSheet(),/Ghost form/);assert.match(f.a.transformationSheet(restored.skills[0]),/Fast.* E/);
});
test('Transformation inherits existing activation abilities but cannot buy, upgrade or refund its own source',()=>{
  const f=formFixture();f.s.abilities=[{id:'activate',name:'Become mist',components:['skill:'+f.parent.id]}];
  assert.equal(f.a.transformationCheck(f.parent).errors.length,0);assert.equal(f.a.transformationBuild(f.parent).effective.skills[0].id,f.parent.id);
  f.grant.form={removedRefs:['skills:'+f.parent.id]};assert.equal(f.a.transformationBuild(f.parent).refunds,0);assert.ok(f.a.transformationCheck(f.parent).errors.length>0);
  f.grant.form={updated:{skills:[{id:f.parent.id,grade:'E'}]}};assert.match(f.a.transformationCheck(f.parent).errors.join(' '),/cannot purchase or upgrade Transformation/);
});
test('Transformation supports partial grade refunds and independently paid Educated child removal',()=>{
  const f=formFixture(),fast=f.skill('Fast','D');f.grant.form={updated:{skills:[{id:fast.id,grade:'F'}]}};assert.equal(f.a.transformationBuild(f.parent).refunds,14);
  const e=educated(f);e.educatedChoices[0].upgradeGrade='E';e.educatedChoices[0].extraPointsPaid=7;
  f.grant.form={removedRefs:['skills:educated:'+e.id+':0']};const b=f.a.transformationBuild(f.parent);assert.equal(b.refunds,7);assert.equal(f.a.withCharacter(b.effective,()=>f.a.acquiredSkills().filter(r=>r.grantedByEducated).length),2);
});
test('Transformation preserves legacy form notes and does not freeze unrelated inherited fields',()=>{
  const f=formFixture(),fast=f.skill('Fast');f.grant.details='Legacy text build';f.grant.notes='Keep this note';const effective=f.form.build(f.s,f.grant);effective.skills.find(r=>r.id===fast.id).notes='Form-specific note';f.grant.form=f.form.capture(f.s,effective,f.grant);fast.grade='E';
  assert.equal(f.a.transformationBuild(f.parent).effective.skills.find(r=>r.id===fast.id).grade,'E');const imported=f.a.mergeState(JSON.parse(JSON.stringify(f.s)));assert.equal(imported.skillGrants[f.parent.id].details,'Legacy text build');assert.equal(imported.skillGrants[f.parent.id].notes,'Keep this note');
});
test('Educated grants exactly three non-Artisan Secondary skills and may only be taken once',()=>{
  const f=fixture(),e=educated(f);assert.equal(f.a.validateSkill(e).ok,true);assert.equal(f.a.acquiredSkills().length,4);
  e.educatedChoices.pop();assert.match(f.a.validateSkill(e).message,/exactly three/);e.educatedChoices.push({name:'Artisan [type]',detail:'Metal'});assert.match(f.a.validateSkill(e).message,/excluding Artisan/);
  e.educatedChoices[2]={name:'Arcana',detail:''};assert.match(f.a.validateSkill(e).message,/distinct/);e.educatedChoices[2]={name:'Magic'};assert.match(f.a.validateSkill(e).message,/only Secondary/);
  e.educatedChoices[2]={name:'Academia'};educated(f);assert.match(f.a.validateSkill(e).message,/only be taken once/);
});
test('Educated upgrades preserve previously paid independent purchases without automatic refunds',()=>{
  const f=fixture(),e=educated(f);e.educatedChoices[0].upgradeGrade='D';f.a.finalizeEducatedChoices(e);let grants=f.rules.educatedGrants(f.s);
  assert.equal(grants[0].grade,'D');assert.equal(f.a.skillCost(grants[0]),14);assert.equal(f.a.skillCost(grants[1]),0);assert.equal(f.a.skillCost(e),7);
  let old=JSON.parse(JSON.stringify(e));e.grade='E';f.a.finalizeEducatedChoices(e,old);grants=f.rules.educatedGrants(f.s);assert.equal(grants[0].grade,'D');assert.equal(f.a.skillCost(grants[0]),14);assert.equal(grants[1].grade,'E');
  old=JSON.parse(JSON.stringify(e));e.grade='C';f.a.finalizeEducatedChoices(e,old);assert.equal(f.rules.educatedGrants(f.s)[0].grade,'C');assert.equal(f.a.skillCost(f.rules.educatedGrants(f.s)[0]),14);
  old=JSON.parse(JSON.stringify(e));e.educatedChoices[0].upgradeGrade='B';f.a.finalizeEducatedChoices(e,old);assert.equal(f.a.skillCost(f.rules.educatedGrants(f.s)[0]),21);
  f.s.skills=[];assert.equal(f.rules.educatedGrants(f.s).length,0);
});
test('Educated requires its own prerequisite and child details, but waives child prerequisites',()=>{
  const f=fixture(),e=educated(f);e.educatedBackground='';assert.match(f.a.validateSkill(e).message,/background title/);e.educatedBackground='Scholar';e.educatedChoices[2].detail='';assert.match(f.a.validateSkill(e).message,/subject/);
  e.educatedChoices[2].detail='Archivist';f.s.stats.Intelligence='F';assert.equal(f.a.validateSkill(e).ok,true);
  const child=f.rules.educatedGrants(f.s)[2];assert.equal(f.a.validateSkill(child).ok,true);
  assert.equal(f.a.validateSkill({...child,grantedByEducated:undefined}).ok,false);
  Object.keys(f.s.stats).forEach(k=>f.s.stats[k]='F');assert.match(f.a.validateSkill(e).message,/Character Grade E/);
  e.limiters=[{type:'Charges',rank:1}];assert.match(f.a.validateSkill(e).message,/not eligible for limiters/);
});
test('Educated grants count for classes and ability components, but not ordinary racial requirements',()=>{
  const f=fixture(),e=educated(f);e.educatedChoices[2]={name:'Academia'};
  assert.equal(f.a.classStatus('caster').req.find(r=>r.msg.includes('3 Intelligence')).pass,true);
  assert.equal(f.a.racialValidation().items.find(r=>r.msg.includes('Secondary')).pass,false);
  assert.equal(f.a.raceRequirementChecks({tree:'Prime',stage:'Mundane',requirements:['2 secondary skills']}).checks.find(r=>r.msg.includes('Secondary')).pass,false);
  assert.equal(f.a.raceRequirementChecks({tree:'Prime',stage:'Mundane',requirements:['Educated F','2 secondary skills']}).checks.find(r=>r.msg.includes('Secondary')).pass,true);
  assert.ok(f.a.componentPool().some(c=>c.id.startsWith('skill:educated:')));
  assert.ok(f.a.automaticTitles().some(t=>t.name==='Academy Graduate'));
});
test('earned points and legacy Scoops enter Standing and budget exactly once',()=>{
  const f=fixture();f.s.earnedPoints=100;assert.equal(f.a.pointsAtStart(),105);assert.equal(f.a.pointsEarned(),100);assert.equal(f.a.availablePoints(),205);assert.equal(f.a.standingGrade(),'E');
  const migrated=f.a.mergeState({schema:6,origin:{scoopPoints:150}});f.a.setState(migrated);assert.equal(f.a.availablePoints(),255);assert.equal(f.a.pointsAtStart(),105);assert.equal(f.a.pointsEarned(),150);assert.equal(migrated.origin.scoopPoints,0);
  const again=f.a.mergeState(JSON.parse(JSON.stringify(migrated)));f.a.setState(again);assert.equal(f.a.availablePoints(),255);assert.equal(f.a.pointsEarned(),150);
  again.origin.size='small';assert.equal(f.a.pointsEarned(),157);
});
test('positive earned points unlock A stats without inventing S tribulation permission',()=>{
  const f=fixture();assert.doesNotMatch(f.a.statGradeOptions('B'),/>A</);f.s.earnedPoints=1;assert.match(f.a.statGradeOptions('A'),/>A</);assert.doesNotMatch(f.a.statGradeOptions('A'),/>S</);
  f.s.stats.Strength='A';assert.equal(f.a.validation().errors.some(e=>e.includes('Strength exceeds')),false);f.s.earnedPoints=0;assert.equal(f.a.validation().errors.some(e=>e.includes('Strength exceeds')),true);
});
test('Profession display and imports keep user naming separate from the canonical rules identifier',()=>{
  const f=fixture();for(const detail of ['Potato farmer','Master [A]','Smith "&" <script>','Cost $& $$ $1']){
    const p=f.skill('Profession [Name of profession]','F',{detail,governingStat:'Intelligence'});assert.equal(f.a.skillDisplayName(p),`Profession [${detail}]`);assert.equal(f.a.validateSkill(p).ok,true);assert.doesNotThrow(()=>f.a.classStatus('nomad'));
  }
  const imported=f.a.mergeState({skills:[{id:'old',name:'Profession [Archive keeper]',grade:'F',governingStat:'Intelligence'}]});assert.equal(imported.skills[0].name,'Profession [Name of profession]');assert.equal(imported.skills[0].detail,'Archive keeper');
});
test('Anchor appears among Tier 1 classes and checks its literal stats, skills and equipment',()=>{
  const f=fixture();assert.ok(f.ctx.window.IH_META.classRules.some(c=>c.id==='anchor'&&c.tier===1));const style=f.style('E');f.tech(style,'Area');f.tech(style,'Contact');
  f.skill('Energized');f.skill('Superstrength');f.skill('Duration Reduction');f.skill('Athletics');educated(f);f.s.equipment.push({id:'heavy',types:['heavy'],grade:'F'});
  assert.equal(f.a.classStatus('anchor').ok,true);assert.equal(f.a.classStatus('anchor').manual,false);
  f.s.stats.Strength='E';assert.equal(f.a.classStatus('anchor').req.find(r=>r.msg==='Strength D').pass,false);f.s.stats.Strength='B';
  f.s.equipment=f.s.equipment.filter(e=>e.id!=='heavy');assert.equal(f.a.classStatus('anchor').req.find(r=>r.msg==='Heavy Armor F').pass,false);
});
test('invalid Educated parents cannot provide class credit, and selected-stat professions count correctly',()=>{
  const f=fixture(),e=educated(f);assert.equal(f.a.classStatus('caster').req.find(r=>r.msg.includes('3 Intelligence')).pass,true);
  e.educatedBackground='';assert.equal(f.a.classStatus('caster').req.find(r=>r.msg.includes('3 Intelligence')).pass,false);
});
test('Anchor requires two distinct listed techniques in a single style',()=>{
  const f=fixture(),first=f.style('E'),second=f.style('E');f.tech(first,'Area');f.tech(second,'Contact');
  const check=()=>f.a.classStatus('anchor').req.find(r=>r.msg.includes('listed techniques')).pass;
  assert.equal(check(),false);f.tech(first,'Area');assert.equal(check(),false);f.tech(first,'Flexible');assert.equal(check(),false);f.tech(first,'Contact');assert.equal(check(),true);
});
