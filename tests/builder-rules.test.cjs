const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function fixture(){
  const $=()=>({text(){return this},html(){return ''}}),ctx={window:{},jQuery:$,console};vm.createContext(ctx);
  for(const file of ['data/meta.js','data/skills.js','data/techniques.js','data/affinities.js','data/races.js','js/builder-rules.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
  const source=fs.readFileSync(path.join(root,'js/app.js'),'utf8').replace('$(init);','window.testApi={defaultState,setState:s=>state=s,validateSkill,ruleContext,validation,skillCost,techniqueCost,techniqueGrade,affinityCost,mergeState,generateSheet,skillRuleSummary};');
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
  const imported=f.a.mergeState({schema:5,skills:[{id:'old',name:'Fighting Style [Style Name]',grade:'F',detail:'Sword'}]});assert.equal(imported.schema,6);assert.equal(imported.criminalTitles.length,0);f.a.setState(imported);assert.match(f.a.validateSkill(imported.skills[0]).message,/weapon type/);
});
test('JSON roundtrip preserves dependencies, criminal grades, facility types and chosen stats',()=>{
  const f=schoolFixture();f.s.criminalTitles=[{id:'c',name:'Thief',grade:'C',notes:'Staff award'}];f.s.assets=[{id:'a',name:'Pen',grade:'F',assetKind:'Breeding Pen'}];const copy=f.a.mergeState(JSON.parse(JSON.stringify(f.s)));
  assert.equal(copy.skills.find(s=>s.id===f.school.id).foundationRefs.join(','),f.school.foundationRefs.join(','));assert.equal(copy.criminalTitles[0].grade,'C');assert.equal(copy.assets[0].assetKind,'Breeding Pen');
});
