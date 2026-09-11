(function($){
'use strict';
const T=window.IH_TUTORIAL;
if(!T)return;
const sceneMap=new Map(T.scenes.map((s,i)=>[s.id,{...s,index:i}]));
const staticBg={void:null,world:'assets/lore/world-02.webp',field:'assets/lore/duchy-01.webp',battle:'assets/lore/duchy-01.webp'};
let state;
function freshState(){return {sceneId:T.scenes[0].id,tree:null,unlocked:new Set(),abilityParts:new Set(),started:false,abilityUsed:false,defenseText:''};}
function esc(s){return $('<div>').text(String(s??'')).html();}
function scene(){return sceneMap.get(state.sceneId);}
function kit(){return T.treeKits[state.tree||'Prime'];}
function play(kind){window.IHSiteSound?.sound?.(kind||'select');}
function unlockTerms(list=[]){list.forEach(x=>state.unlocked.add(x));renderGlossary();}
function renderGlossary(){
  const $terms=$('#glossaryTerms').empty();
  [...state.unlocked].forEach(term=>{
    $('<button type="button" class="codex-term">').text(term).on('click',()=>{
      $('.codex-term').removeClass('active');
      $terms.find('button').filter(function(){return $(this).text()===term}).addClass('active');
      $('#glossaryDetail').html(`<strong>${esc(term)}</strong><p>${esc(T.glossary[term]||'')}</p>`);
      play('select');
    }).appendTo($terms);
  });
  $('#hudCount').text(state.unlocked.size);
  if(!state.unlocked.size)$('#glossaryDetail').html('<span>Concepts will appear here as [god] introduces them.</span>');
}
function renderProgress(sc){
  const current=T.meta.chapters.findIndex(c=>c.id===sc.chapter);
  $('#chapterProgress').html(T.meta.chapters.map((c,i)=>`<div class="chapter-node ${i<current?'done':''} ${i===current?'active':''}"><span>${String(i+1).padStart(2,'0')}</span><b>${esc(c.label)}</b></div>`).join(''));
}
function setVesselVisual(){
  const k=kit();
  $('#trainingVessel img').attr('src',k.portrait).attr('alt',`${state.tree||'Prime'} temporary training vessel`);
  $('#trainingTreeLabel').text(k.label);
}
function setBackground(sc){
  const bg=sc.bg||'void';
  $('#vnStage').attr('data-bg',bg).attr('data-scene',sc.id);
  let img=staticBg[bg];
  if(['vessel','interface'].includes(bg))img=state.tree?kit().backdrop:'assets/lore/world-01.webp';
  if(bg==='battle')img=state.tree?(kit().battleBg||kit().backdrop):'assets/lore/duchy-01.webp';
  if(bg==='field')img=state.tree?(kit().fieldBg||kit().battleBg||kit().backdrop):'assets/lore/duchy-01.webp';
  $('#vnBackdrop').css('background-image',img?`url("${img}")`:'none');
  setVesselVisual();
  const showVessel=state.tree && !['arrival-1','arrival-2'].includes(sc.id);
  $('#trainingVessel').toggleClass('hidden',!showVessel);
  const battleIds=['encounter-intro','approach','attack','counterattack','defend','injury','cooldown-intro','cooldown-post-1','cooldown-post-2','cooldown-ready'];
  $('#simulacrum').toggleClass('hidden',!battleIds.includes(sc.id));
}
function feedback(msg,type='good'){$('#interactiveArea .tutorial-feedback').remove();$(`<div class="tutorial-feedback ${type}">${esc(msg)}</div>`).appendTo('#interactiveArea');}
function showNext(show=true,label='Continue'){$('#btnNextScene').toggleClass('hidden',!show).prop('disabled',!show).html(`${esc(label)} <span>›</span>`);}
function go(id){if(!sceneMap.has(id))return;state.sceneId=id;renderScene();play('transition');}
function next(){const sc=scene();if(sc?.next)go(sc.next);}
function treeText(tree){
  const m={Prime:'Adaptable human and humanlike lineages.',Beast:'Animal-related bodies with strong physical and sensory traditions.',Fae:'Spirit-bound and magic-oriented lineages.',Construct:'Artificial life built, assembled, or awakened into existence.',Monster:'Hostile and destructive existences. A difficult path intended for antagonistic play.',Hybrid:'A mixed-tree path for bodies that belong to more than one racial tree.'};
  return m[tree]||'';
}
function renderTreeChoice(){
  showNext(false);
  const trees=['Prime','Beast','Fae','Construct','Monster','Hybrid'];
  const $wrap=$('<div class="tree-training-grid">').appendTo('#interactiveArea');
  trees.forEach(t=>{
    $(`<button type="button" class="tutorial-choice tree-training-choice"><b>${esc(t)}</b><span>${esc(treeText(t))}</span></button>`).on('click',function(){
      state.tree=t;
      $('.tree-training-choice').removeClass('selected');$(this).addClass('selected');
      setVesselVisual();
      $('#vnBackdrop').css('background-image',`url("${T.treeKits[t].backdrop}")`);
      $('#trainingVessel').removeClass('hidden');
      feedback(`${T.treeKits[t].label} selected. The tutorial build and later combat scene will follow this vessel.`,'good');
      showNext(true,'Accept Vessel');
      play('confirm');
    }).appendTo($wrap);
  });
}
function renderTreeProfile(){
  const k=kit();
  $('#interactiveArea').html(`<div class="tree-profile-card"><div><span>TRAINING PATTERN</span><strong>${esc(k.label)}</strong><p>${esc(k.flavor)}</p></div><img src="${esc(k.portrait)}" alt="${esc(k.label)}"></div>`);
  showNext(true,'Continue');
}
function renderQuiz(sc){
  showNext(false);
  $('<div class="tutorial-prompt">').text(sc.prompt||'Choose an answer.').appendTo('#interactiveArea');
  const $list=$('<div class="tutorial-choice-list">').appendTo('#interactiveArea');
  sc.choices.forEach((c,i)=>{
    $(`<button type="button" class="tutorial-choice"><span class="choice-index">${String.fromCharCode(65+i)}</span><span>${esc(c.label)}</span></button>`).on('click',function(){
      if(c.correct){
        $('.tutorial-choice').prop('disabled',true).removeClass('wrong');$(this).addClass('correct');
        feedback(c.feedback,'good');showNext(true,'Continue');play('confirm');
      }else{
        $(this).addClass('wrong');feedback(c.feedback,'bad');play('select');setTimeout(()=>$(this).removeClass('wrong'),520);
      }
    }).appendTo($list);
  });
}
function renderStatPrimer(){
  const $grid=$('<div class="stat-primer-grid">').appendTo('#interactiveArea');
  T.statGuide.forEach(s=>{
    $(`<button type="button" class="stat-primer"><span>${esc(s.name)}</span><b>${esc(s.short)}</b><small>${esc(s.detail)}</small></button>`).on('click',function(){
      $('.stat-primer').removeClass('active');$(this).addClass('active');play('select');
    }).appendTo($grid);
  });
  $('<div class="prereq-callout"><b>THE LINK</b><span>Stats are not just descriptive. They unlock skills and equipment. If a D-grade purchase requires its associated stat one grade higher, the supporting stat must be C.</span></div>').appendTo('#interactiveArea');
  showNext(true,'Continue');
}
function renderLoadout(){
  const k=kit();
  const html=`<div class="loadout-grid">
    <section><div class="eyebrow">STATS</div>${k.stats.map(x=>`<span>${esc(x)}</span>`).join('')}</section>
    <section><div class="eyebrow">SKILLS</div>${k.skills.map(x=>`<span>${esc(x)}</span>`).join('')}</section>
    <section><div class="eyebrow">EQUIPMENT</div>${k.equipment.map(x=>`<span>${esc(x)}</span>`).join('')}</section>
  </div><div class="prereq-callout"><b>WHY THIS LOADOUT WORKS</b><span>${esc(k.prereq)}</span></div>`;
  $('#interactiveArea').html(html);showNext(true,'I Understand');
}
function renderAbilityPrimer(){
  const a=kit().ability;
  $('#interactiveArea').html(`<div class="ability-anatomy-grid">
    <section><span>01 // FOCUS</span><strong>${esc(a.focus)}</strong><p>Decide the main intent first. This lesson ability is primarily trying to ${esc(a.focus.toLowerCase())}.</p></section>
    <section><span>02 // GRADE</span><strong>${esc(a.grade)}</strong><p>The highest actual skill grade in its listed components is ${esc(a.grade)}, so the ability is ${esc(a.grade)}-grade.</p></section>
    <section><span>03 // COOLDOWN</span><strong>${a.cooldown} POSTS</strong><p>${esc(a.grade)}-grade sets the default cooldown. After use, make ${a.cooldown} posts without another ${esc(a.grade)}-grade ability.</p></section>
    <section><span>04 // ACTION COST</span><strong>${a.actions} ACTION</strong><p>This ability has one main intent. Abilities normally take an action; stacking distinct intents can make one ability cost more.</p></section>
  </div>`);
  showNext(true,'Build It');
}
function renderAbilityBuild(){
  showNext(false);state.abilityParts.clear();
  const a=kit().ability;
  $(`<div class="tutorial-prompt">Select every listed component of ${esc(a.name)}.</div>`).appendTo('#interactiveArea');
  const $parts=$('<div class="component-grid">').appendTo('#interactiveArea');
  a.components.forEach(p=>{
    $(`<button type="button" class="tutorial-choice component-choice"><span class="component-check">◇</span><b>${esc(p)}</b></button>`).on('click',function(){
      if(state.abilityParts.has(p)){state.abilityParts.delete(p);$(this).removeClass('selected').find('.component-check').text('◇');}
      else{state.abilityParts.add(p);$(this).addClass('selected').find('.component-check').text('◆');}
      $('#compileAbility').prop('disabled',state.abilityParts.size!==a.components.length);play('select');
    }).appendTo($parts);
  });
  $('<button id="compileAbility" type="button" class="ui-btn compile-button" disabled>Compile Ability</button>').on('click',function(){
    $(this).prop('disabled',true);$('.component-choice').prop('disabled',true);
    $(`<div class="compiled-ability"><div><span>ABILITY COMPILED</span><strong>${esc(a.name)} // ${esc(a.grade)}</strong></div><p>${esc(a.description)}</p><small>Focus: ${esc(a.focus)} · ${a.actions} action · ${a.cooldown}-post cooldown after use</small></div>`).appendTo('#interactiveArea');
    showNext(true,'Check Understanding');play('confirm');
  }).appendTo('#interactiveArea');
}
function renderAbilityQuiz(){
  showNext(false);
  const a=kit().ability;
  $('<div class="tutorial-prompt">').text(`Why is ${a.name} ${a.grade}-grade with a ${a.cooldown}-post cooldown?`).appendTo('#interactiveArea');
  const choices=[
    {label:`Because its highest actual component is ${a.grade}, and ${a.grade}-grade abilities use the ${a.cooldown}-post default cooldown.`,correct:true,feedback:'Correct. Ability grade comes from the highest actual skill grade used, and that grade sets the default cooldown.'},
    {label:'Because the number of listed components is converted directly into its grade and cooldown.',correct:false,feedback:'Component count does not determine grade. Look for the highest actual skill grade in the ability.'},
    {label:'Because every ability made during character creation uses the same grade and cooldown.',correct:false,feedback:'Abilities can be different grades. Their cooldowns follow the grade actually used.'}
  ];
  const $list=$('<div class="tutorial-choice-list">').appendTo('#interactiveArea');
  choices.forEach((c,i)=>$(`<button type="button" class="tutorial-choice"><span class="choice-index">${String.fromCharCode(65+i)}</span><span>${esc(c.label)}</span></button>`).on('click',function(){
    if(c.correct){$('.tutorial-choice').prop('disabled',true);$(this).addClass('correct');feedback(c.feedback,'good');showNext(true,'Enter Training Field');play('confirm');}
    else{$(this).addClass('wrong');feedback(c.feedback,'bad');play('select');setTimeout(()=>$(this).removeClass('wrong'),520);}
  }).appendTo($list));
}
function renderMovementChoice(){
  showNext(false);
  const choices=[
    {label:'Move across the chamber toward a useful position, describing the route and intent without declaring an impossible result.',correct:true,feedback:'Good. In basic play, describe reasonable movement and let the scene or narrator settle anything uncertain.'},
    {label:'Declare that the vessel instantly appears behind the simulacrum even though the sheet has no teleportation ability.',correct:false,feedback:'Your narration should stay within what the vessel and its skills plausibly support.'},
    {label:'Declare that distance never matters because movement is only flavor.',correct:false,feedback:'Distance and positioning can matter in the fiction. Basic play simply does not require the measured movement system used by optional structured combat.'}
  ];
  const $list=$('<div class="tutorial-choice-list">').appendTo('#interactiveArea');
  choices.forEach((c,i)=>$(`<button type="button" class="tutorial-choice"><span class="choice-index">${String.fromCharCode(65+i)}</span><span>${esc(c.label)}</span></button>`).on('click',function(){
    if(c.correct){$('.tutorial-choice').prop('disabled',true);$(this).addClass('correct');feedback(c.feedback,'good');showNext(true,'Close Distance');play('confirm');}
    else{$(this).addClass('wrong');feedback(c.feedback,'bad');play('select');setTimeout(()=>$(this).removeClass('wrong'),520);}
  }).appendTo($list));
}
function renderAttackChoice(){
  showNext(false);
  const a=kit().ability;
  const attackText=kit().attackLine;
  const isDefense=a.focus==='Defend';
  const correct=isDefense
    ? `${attackText} It tried to stagger the target with an ordinary shield strike rather than declaring that the blow connected.`
    : attackText;
  const choices=[
    {label:correct,correct:true,feedback:isDefense?`Good. ${a.name} is a defensive ability, so this vessel uses an ordinary supported attack here and saves ${a.name} for the incoming counterattack.`:`Good. ${a.name} is an attack attempt. The narration says what the vessel does, not whether it succeeds.`},
    {label:`${a.name} destroyed the simulacrum instantly. Nothing could defend against it.`,correct:false,feedback:'That decides the contested result yourself. Describe the attempt and let the narrator adjudicate.'},
    {label:'The vessel waits because an attack cannot be attempted until the narrator writes the result first.',correct:false,feedback:'You still choose and narrate your character’s attempt. The narrator handles the uncertain outcome afterward.'}
  ];
  const $list=$('<div class="tutorial-choice-list">').appendTo('#interactiveArea');
  choices.forEach((c,i)=>$(`<button type="button" class="tutorial-choice"><span class="choice-index">${String.fromCharCode(65+i)}</span><span>${esc(c.label)}</span></button>`).on('click',function(){
    if(c.correct){
      $('.tutorial-choice').prop('disabled',true);$(this).addClass('correct');
      if(!isDefense)state.abilityUsed=true;
      feedback(c.feedback,'good');showNext(true,'Resolve Attempt');play('confirm');
    }else{$(this).addClass('wrong');feedback(c.feedback,'bad');play('select');setTimeout(()=>$(this).removeClass('wrong'),520);}
  }).appendTo($list));
}
function renderDefenseChoice(){
  showNext(false);
  const a=kit().ability;
  const choices=[];
  if(a.focus==='Defend')choices.push({label:`Use ${a.name}: describe the vessel bringing its shield into the attack and trying to turn the blow aside.`,correct:true,feedback:`Correct. This is exactly when a defensive ability belongs. ${a.name} is used now, so its ${a.grade}-grade cooldown will begin after the exchange.`});
  else choices.push({label:'Describe the vessel trying to evade, brace, intercept, or otherwise defend using capabilities actually present on its sheet.',correct:true,feedback:'Correct. The incoming attack makes a defense meaningful now. The narrator will decide how well the attempt works.'});
  choices.push({label:'Declare that the simulacrum misses automatically because the vessel chose to defend.',correct:false,feedback:'Choosing a defense does not let you declare the contested result.'});
  choices.push({label:'Ignore the incoming attack and retroactively say the previous attack prevented it from happening.',correct:false,feedback:'The narrator has already introduced the counterattack. Respond to what is happening now rather than rewriting the result.'});
  const $list=$('<div class="tutorial-choice-list">').appendTo('#interactiveArea');
  choices.forEach((c,i)=>$(`<button type="button" class="tutorial-choice"><span class="choice-index">${String.fromCharCode(65+i)}</span><span>${esc(c.label)}</span></button>`).on('click',function(){
    if(c.correct){
      $('.tutorial-choice').prop('disabled',true);$(this).addClass('correct');
      if(a.focus==='Defend')state.abilityUsed=true;
      state.defenseText=c.label;
      feedback(c.feedback,'good');showNext(true,'See Adjudication');play('confirm');
    }else{$(this).addClass('wrong');feedback(c.feedback,'bad');play('select');setTimeout(()=>$(this).removeClass('wrong'),520);}
  }).appendTo($list));
}
function renderInjuryResult(){
  const a=kit().ability;
  const used=state.abilityUsed?`${a.name} has been used during this exchange, so ${a.grade}-grade will enter cooldown.`:`No graded ability was used in this exchange.`;
  $('#interactiveArea').html(`<div class="adjudication-card"><span>NARRATOR RESULT</span><strong>PARTIAL DEFENSE</strong><p>The blow catches the vessel glancingly. It stays upright, but the hit hurts and forces it to give ground.</p><small>${esc(used)}</small></div><div class="basic-note"><b>BASIC-RULES LESSON</b><span>The narrator gives the consequence in the fiction. This tutorial intentionally does not calculate hit points, equipment HP, effectiveness totals, or other optional structured-combat math.</span></div>`);
  showNext(true,'Continue');
}
function renderCooldownPost(sc){
  showNext(false);
  const a=kit().ability;
  const passed=a.cooldown-sc.cooldown;
  const locks=Array.from({length:a.cooldown},(_,i)=>`<i class="${i<passed?'cleared':''}"></i>`).join('');
  $(`<div class="cooldown-panel"><div class="cooldown-grade">${esc(a.grade)}</div><div><span>GRADE LOCK</span><strong>${sc.cooldown} POST${sc.cooldown===1?'':'S'} REMAIN</strong><div class="cooldown-pips">${locks}</div></div></div>`).appendTo('#interactiveArea');
  $('<div class="tutorial-prompt">').text(sc.prompt).appendTo('#interactiveArea');
  const $list=$('<div class="tutorial-choice-list compact">').appendTo('#interactiveArea');
  sc.choices.forEach((label,i)=>$(`<button type="button" class="tutorial-choice"><span class="choice-index">${i+1}</span><span>${esc(label)}</span></button>`).on('click',function(){
    $('.tutorial-choice').prop('disabled',true);$(this).addClass('correct');feedback(`Post completed without a ${a.grade}-grade ability. The cooldown advances by one post.`,'good');showNext(true,'Advance Post');play('confirm');
  }).appendTo($list));
}
function renderCooldownReady(){
  const a=kit().ability;
  $('#interactiveArea').html(`<div class="cooldown-ready"><span>SYSTEM RELEASE</span><strong>${esc(a.grade)}-GRADE READY</strong><p>${a.cooldown} qualifying posts have passed. ${esc(a.grade)}-grade abilities can be used again.</p></div>`);showNext(true,'Continue');play('confirm');
}
function renderComplete(){
  showNext(false);
  $('#interactiveArea').html(`<div class="completion-card"><div class="completion-sigil">◆</div><div><span>ORIENTATION COMPLETE</span><strong>Fresh Soul, the rest is yours.</strong><p>This lesson covered the basic layer only and is not World RP certification. When you are ready, create a character or continue reading the world and race compendiums.</p></div></div><div class="completion-links"><a class="ui-btn" href="create.html">Create Character</a><a class="ui-btn ghost" href="lore.html">World Lore</a><a class="ui-btn ghost" href="races.html">Race Compendium</a><a class="ui-btn ghost" href="index.html">Home</a></div>`);
}
function renderScene(){
  const sc=scene();if(!sc)return;
  unlockTerms(sc.unlock||[]);renderProgress(sc);setBackground(sc);
  $('#speakerName').text(sc.speaker||'[god]');$('#sceneCounter').text(String(sc.index+1).padStart(2,'0'));
  $('#dialogueText').text(sc.text||'');$('#interactiveArea').empty();$('#systemOverlay').addClass('hidden').empty();
  showNext(!!sc.next);
  switch(sc.kind){
    case 'treeChoice':renderTreeChoice();break;
    case 'treeProfile':renderTreeProfile();break;
    case 'quiz':renderQuiz(sc);break;
    case 'statPrimer':renderStatPrimer();break;
    case 'loadout':renderLoadout();break;
    case 'abilityPrimer':renderAbilityPrimer();break;
    case 'abilityBuild':renderAbilityBuild();break;
    case 'abilityQuiz':renderAbilityQuiz();break;
    case 'movementChoice':renderMovementChoice();break;
    case 'attackChoice':renderAttackChoice();break;
    case 'defenseChoice':renderDefenseChoice();break;
    case 'injuryResult':renderInjuryResult();break;
    case 'cooldownPost':renderCooldownPost(sc);break;
    case 'cooldownReady':renderCooldownReady();break;
    case 'complete':renderComplete();break;
  }
  window.scrollTo({top:0,behavior:'smooth'});
}
function begin(){state=freshState();state.started=true;$('#tutorialGate').addClass('hidden');$('#tutorialApp').removeClass('hidden');renderGlossary();renderScene();window.IHSiteSound?.setGroup?.('tutorial','tutorial');window.IHSiteSound?.enableAmbient?.('tutorial','tutorial');play('confirm');}
function restart(){
  if(state?.started&&!confirm('Restart the orientation from the beginning? Progress is not saved.'))return;
  state=freshState();$('#tutorialApp').addClass('hidden');$('#tutorialGate').removeClass('hidden');$('#rulesHud').removeClass('open');$('#rulesHudToggle').attr('aria-expanded','false');renderGlossary();window.scrollTo({top:0,behavior:'smooth'});play('transition');
}
$(function(){
  state=freshState();renderGlossary();window.IHSiteSound?.setGroup?.('tutorial','tutorial');
  $('#btnBeginTutorial').on('click',begin);$('#btnRestartTutorial').on('click',restart);$('#btnNextScene').on('click',next);
  $('#rulesHudToggle').on('click',function(){const open=!$('#rulesHud').hasClass('open');$('#rulesHud').toggleClass('open',open);$(this).attr('aria-expanded',String(open));play('select');});
});
})(jQuery);
