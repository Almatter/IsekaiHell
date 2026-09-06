(function($){
'use strict';
const DATA=window.IH_LORE||{intro:[],countries:[]};
const esc=s=>$('<div>').text(s==null?'':String(s)).html();
const country=id=>DATA.countries.find(c=>c.id===id);
const NATION_TRACK={ryke:'ryke',east:'east',republic:'republic','fae-see':'fae',west:'west',lake:'lake',duchy:'duchy',kingdom:'kingdom',sky:'sky',widersia:'widersia'};
function applyTheme(c){const t=c?.theme||{accent:'#d4ba73',accent2:'#731d26',glow:'#51b6ad',deep:'#080707'};document.documentElement.style.setProperty('--nation-accent',t.accent);document.documentElement.style.setProperty('--nation-accent2',t.accent2);document.documentElement.style.setProperty('--nation-glow',t.glow);document.documentElement.style.setProperty('--nation-deep',t.deep)}
function img(b){return `<figure class="lore-figure"><img loading="lazy" src="${esc(b.src)}" alt="${esc(b.alt||'Isekai Hell lore image')}"></figure>`}
function blockHtml(b){if(b.type==='image')return img(b);if(b.type==='h3')return `<h3>${esc(b.text)}</h3>`;if(b.type==='h4')return `<h4>${esc(b.text)}</h4>`;if(b.type==='subtitle')return `<p class="subtitle">${esc(b.text)}</p>`;if(b.type==='p')return `<p>${esc(b.text).replace(/\n/g,'<br>')}</p>`;return''}
function sections(blocks){const out=[];let cur={title:'Overview',blocks:[]};for(const b of blocks){if(['h1','h2'].includes(b.type)){if(cur.blocks.length||cur.title!=='Overview')out.push(cur);cur={title:b.text||'Overview',blocks:[]}}else cur.blocks.push(b)}if(cur.blocks.length||cur.title!=='Overview')out.push(cur);return out}
function countrySections(blocks){
  const out=[];let cur={title:'Overview',blocks:[]};
  const top=b=>['h1','h2'].includes(b.type)||(['h3','h4'].includes(b.type)&&/^\s*Location\s*[-–]/i.test(b.text||''));
  for(const b of blocks){if(top(b)){if(cur.blocks.length||cur.title!=='Overview')out.push(cur);cur={title:b.text||'Overview',blocks:[]}}else cur.blocks.push(b)}
  if(cur.blocks.length||cur.title!=='Overview')out.push(cur);return out;
}
function nationCards(){return DATA.countries.map(c=>`<div class="country-card" tabindex="0" data-country-card="${c.id}"><div class="eyebrow">SECOND CONTINENT</div><h3>${esc(c.name)}</h3><p>${esc(c.summary||'Open this nation entry.')}</p></div>`).join('')}
function renderHome(){
  applyTheme(null);$('.lore-nav-button').removeClass('active');$('[data-lore-home]').addClass('active');$('.lore-nav-label,#countryNav').addClass('hidden');$('#countryView').addClass('hidden');$('#loreHome').removeClass('hidden');history.replaceState(null,'',location.pathname);
  window.IHSiteSound?.setGroup('world','world');
  const intro=DATA.intro||[],paras=intro.filter(b=>b.type==='p'),lead=paras[0]?.text||'',god=paras.find(p=>/world is forever stuck in place/i.test(p.text))?.text||'';
  const rest=intro.filter(b=>!(b.type==='p'&&(b.text===lead||b.text===god)));
  const sec=sections(rest).map((s,i)=>`<details class="lore-section" ${i<2?'open':''}><summary>${esc(s.title)}</summary><div class="lore-section-body">${s.blocks.map(blockHtml).join('')}</div></details>`).join('');
  $('#loreHome').html(`<section class="lore-home-hero"><div class="eyebrow">ARRIVAL // BETWEEN WORLDS</div><h2>You died. Then [god] spoke.</h2><p class="lead">${esc(lead)}</p>${god?`<div class="god-message">${esc(god)}</div>`:''}<div class="country-theme-strip"></div></section><div class="world-intro-sections">${sec}</div><section class="nation-gateway"><div class="eyebrow">WORLD FILE UNLOCKED // SECOND CONTINENT</div><h2>Choose where to look closer.</h2><p>You have the shape of the world now: its old wars, its uneasy peace, its recurring catastrophes, and the latest wounds torn into the land. From here, open a nation file and descend into the details.</p><div class="country-grid">${nationCards()}</div></section>`)
}
function renderCountry(id){
  const c=country(id);if(!c)return renderHome();applyTheme(c);$('.lore-nav-label,#countryNav').removeClass('hidden');$('.lore-nav-button').removeClass('active');$(`[data-country="${id}"]`).addClass('active');$('#loreHome').addClass('hidden');$('#countryView').removeClass('hidden');window.IHSiteSound?.setGroup('world');window.IHSiteSound?.setContext(NATION_TRACK[id]||'world');
  const ss=countrySections(c.blocks.filter(b=>!(b.type==='h1'&&new RegExp(c.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i').test(b.text||''))));
  const toc=ss.map((s,i)=>`<a href="#section-${id}-${i}">${esc(s.title)}</a>`).join('');
  const body=ss.map((s,i)=>`<details id="section-${id}-${i}" class="lore-section" ${i<2?'open':''}><summary>${esc(s.title)}</summary><div class="lore-section-body">${s.blocks.map(blockHtml).join('')}</div></details>`).join('');
  $('#countryView').html(`<header class="country-hero"><div class="eyebrow">SECOND CONTINENT // NATION FILE</div><h2>${esc(c.name)}</h2><p>${esc(c.summary||'')}</p><div class="country-theme-strip"></div></header><nav class="country-toc">${toc}</nav><div class="world-intro-sections">${body}</div>`);history.replaceState(null,'','#'+id);window.scrollTo({top:0,behavior:'smooth'});window.IHSiteSound?.sound('transition')
}
$(function(){
  $('#countryNav').html(DATA.countries.map(c=>`<button class="lore-nav-button" data-country="${c.id}">${esc(c.name)}</button>`).join(''));
  $(document).on('click','[data-country],[data-country-card]',function(){renderCountry($(this).data('country')||$(this).data('country-card'))}).on('keydown','[data-country-card]',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();renderCountry($(this).data('country-card'))}});
  $('[data-lore-home]').on('click',renderHome);const id=decodeURIComponent(location.hash.replace(/^#/,''));if(id&&country(id))renderCountry(id);else renderHome()
});
})(jQuery);
