(function($){
'use strict';
const R=window.IH_RACES||[];let tree='All',activeRaceId='';
const esc=s=>$('<div>').text(s==null?'':String(s)).html();
function byId(id){return R.find(r=>r.id===id)}
const TREE_INFO=[
  {id:'Prime',tag:'PEOPLE // FLEXIBILITY',title:'Prime',text:'Humans and human-adjacent peoples make up the most numerous and broadly varied tree. Prime characters tend toward flexibility, connection, organizations, and broad skill sets rather than one universal specialty.',rule:'Mundane Prime chooses a magical, martial, or secondary-skill route.'},
  {id:'Beast',tag:'INSTINCT // BODY',title:'Beast',text:'Animal-related peoples form the second most numerous tree. Their world identity leans toward physical prowess, keen senses, natural adaptations, and an uneasy kinship with both civilization and the natural world.',rule:'Mundane Beast begins with natural weapons or armor plus two sense skills.'},
  {id:'Fae',tag:'SPIRIT // MAGIC',title:'Fae',text:'Fae understand spirit as fundamental to existence. Their elders, elemental traditions, and cultures are deeply tied to magic, and the tree treats magic as the medium through which the world can be understood and corrected.',rule:'Mundane Fae requires Magic and a secondary skill.'},
  {id:'Construct',tag:'PURPOSE // SELF',title:'Construct',text:'Constructs are created beings whose lives begin with a purpose imposed by someone or something else. Their stories frequently turn on service, personhood, self-definition, and what being alive means for something built rather than born.',rule:'Mundane Construct begins with a defensive skill and two secondary skills.'},
  {id:'Monster',tag:'ANTAGONIST // HARD MODE',title:'Monster',text:'The Monster tree is explicitly hostile to the other trees and written for characters who exist as antagonists to ordinary society. Monsters are destructive, dangerous existences and are deliberately a harder path for normal play.',rule:'Mundane Monster needs a combat or magic core, a movement skill, and a sense skill.'},
  {id:'Hybrid',tag:'DUALITY // BELONGING',title:'Hybrid',text:'Hybrids belong to multiple racial trees at once. Their identity is built around conflicting or overlapping natures, and their mechanical requirements come from the mundane requirements of every parent tree involved.',rule:'Hybrid requires the Hybrid title, Mixed Race, and each parent tree’s mundane requirements.'}
];
function renderDirectory(){
  const q=String($('#raceDirectorySearch').val()||'').toLowerCase().trim();
  $('#raceDirectoryFilters [data-tree]').removeClass('active').filter(`[data-tree="${tree}"]`).addClass('active');
  let rows=R.filter(r=>tree==='All'||r.tree===tree);if(q)rows=rows.filter(r=>(r.name+' '+r.tree+' '+r.stage+' '+r.description+' '+r.requirements.join(' ')).toLowerCase().includes(q));
  const stages=['Mundane','Intermediate','Ascended'];
  $('#raceDirectory').html(stages.map(stage=>{const rs=rows.filter(r=>r.stage===stage);if(!rs.length)return'';return `<div class="race-dir-group"><div class="race-dir-label">${stage}</div>${rs.map(r=>`<button data-race-id="${esc(r.id)}">${esc(r.name)}</button>`).join('')}</div>`}).join('')||'<div class="muted">No matches.</div>');
  if(activeRaceId)$(`[data-race-id="${CSS.escape(activeRaceId)}"]`).addClass('active');
  $('#raceOverviewButton').toggleClass('active',!activeRaceId)
}
function renderLanding(){
  activeRaceId='';tree='All';renderDirectory();history.replaceState(null,'',location.pathname);window.IHSiteSound?.setGroup('shared','wayfarer');
  const cards=TREE_INFO.map(x=>`<button type="button" class="race-tree-card" data-overview-tree="${x.id}"><div class="eyebrow">${esc(x.tag)}</div><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p><small>${esc(x.rule)}</small></button>`).join('');
  $('#raceDetail').html(`<section class="race-landing"><div class="eyebrow">RACIAL TREES // THE BODY YOU INHERIT OR BECOME</div><h2>Race is a path, not just a species name.</h2><p class="race-description">Isekai Hell groups bodies into broad racial trees. Individual races sit inside those trees and can impose their own features, stats, skills, titles, and evolution requirements. A Native-path character follows the standards of the world closely, while Variant characters are intentionally abnormal and freer to diverge.</p><div class="race-stage-strip"><div><b>Mundane</b><span>Usually F–D. The starting form and broad identity of the race.</span></div><div><b>Intermediate</b><span>Usually C–A. A focused evolution that becomes visibly exceptional.</span></div><div><b>Ascended</b><span>S-grade territory. A rare existence with world-level social and narrative weight.</span></div></div><div class="variant-path-note"><b>Variant Path</b><span>More common among Isekai. Variant bodies can resemble any tree while ignoring the normal racial template requirements, representing an abnormal or unprecedented evolution.</span></div><div class="race-tree-card-grid">${cards}</div><div class="race-build-link"><a class="ui-btn" href="create.html">Open Character Creation</a><a class="ui-btn ghost" href="lore.html">Open World Lore</a></div></section>`);
  window.scrollTo({top:0,behavior:'smooth'});window.IHSiteSound?.sound('transition')
}
function renderRace(id){
  const r=byId(id);if(!r)return renderLanding();activeRaceId=r.id;tree=r.tree;history.replaceState(null,'','#'+r.id);renderDirectory();window.IHSiteSound?.setGroup('shared','wayfarer');
  const imgs=(r.images||[]).map(src=>`<img loading="lazy" src="${esc(src)}" alt="${esc(r.name)} reference art">`).join('');
  const facts=[['Tree',r.tree],['Stage',r.stage],['Lifespan',r.lifespan],['Average Height',r.height],['Average Weight',r.weight],['Evolves Into',r.evolvesInto],['Template Cost',r.totalCost]].filter(x=>x[1]).map(([k,v])=>`<div class="race-fact"><b>${esc(k)}</b>${esc(v)}</div>`).join('');
  const list=(title,arr)=>arr&&arr.length?`<section class="race-detail-section"><h3>${esc(title)}</h3><ul>${arr.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`:'';
  $('#raceDetail').html(`<div class="race-detail-hero"><div><div class="eyebrow">${esc(r.tree)} // ${esc(r.stage)}</div><h2>${esc(r.name)}</h2><p class="race-description">${esc(r.description||'No description recorded.')}</p></div><div class="race-detail-art">${imgs}</div></div><div class="race-facts">${facts}</div>${r.physique?`<section class="race-detail-section"><h3>Physique</h3><p>${esc(r.physique)}</p></section>`:''}${r.coloring?`<section class="race-detail-section"><h3>Body Tint, Colouring and Marking</h3><p>${esc(r.coloring)}</p></section>`:''}${list('Historical Figures',r.historicalFigures)}${list('Interspecies Relations and Assumptions',r.relations)}${list('Creation / Evolution Requirements',r.requirements)}<div class="race-build-link"><a class="ui-btn" href="create.html?race=${encodeURIComponent(r.id)}">Use in Character Creation</a><button type="button" class="ui-btn ghost" id="backRaceOverview">Race Tree Overview</button><a class="ui-btn ghost" href="lore.html">Open World Lore</a></div>`);
  window.scrollTo({top:0,behavior:'smooth'});window.IHSiteSound?.sound('transition')
}
$(function(){
  const trees=['All','Prime','Beast','Fae','Monster','Construct','Hybrid'];$('#raceDirectoryFilters').html(trees.map(t=>`<button type="button" class="race-tree-button" data-tree="${t}">${t}</button>`).join(''));
  $('#raceDirectorySearch').on('input',renderDirectory);
  $('#raceDirectoryFilters').on('click','[data-tree]',function(){tree=$(this).data('tree');renderDirectory()});
  $('#raceDirectory').on('click','[data-race-id]',function(){renderRace($(this).data('race-id'))});
  $('#raceOverviewButton').on('click',renderLanding);
  $(document).on('click','#backRaceOverview',renderLanding).on('click','[data-overview-tree]',function(){tree=$(this).data('overview-tree');renderDirectory();$('.race-directory-panel').get(0)?.scrollIntoView({behavior:'smooth',block:'start'});window.IHSiteSound?.sound('select')});
  const id=decodeURIComponent(location.hash.replace(/^#/,''));if(byId(id))renderRace(id);else renderLanding()
});
})(jQuery);
