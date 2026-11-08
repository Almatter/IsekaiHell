/* Alternate-form overlays. The base character is never mutated. */
(function(root){
'use strict';
const collections=['skills','techniques','affinities','equipment','abilities','customRows'];
const clone=value=>JSON.parse(JSON.stringify(value));
const ref=(kind,row)=>kind+':'+row.id;
function normalize(grant={}){
  const f=grant.form||{},out={version:1,stats:{...(f.stats||{})},size:f.size||'',removedRefs:[...new Set(Array.isArray(f.removedRefs)?f.removedRefs:[])],retainedEquipmentIds:Array.isArray(f.retainedEquipmentIds)?[...new Set(f.retainedEquipmentIds)]:null,added:{},updated:{}};
  for(const key of collections){out.added[key]=Array.isArray(f.added?.[key])?clone(f.added[key]):[];out.updated[key]=Array.isArray(f.updated?.[key])?clone(f.updated[key]):[]}
  return out;
}
function features(base){return String(base.identity.features||'').split(/[\n;]+/).map(x=>x.trim()).filter(Boolean).map(text=>({ref:'feature:'+encodeURIComponent(text),name:text,cost:0}))}
function build(base,grant){
  const f=normalize(grant),out=clone(base),removed=new Set(f.removedRefs);
  for(const key of collections){
    const updates=new Map(f.updated[key].map(r=>[r.id,r]));
    out[key]=base[key].filter(r=>!removed.has(ref(key,r))&&(key!=='equipment'||(f.retainedEquipmentIds===null?r.types?.some(t=>t.startsWith('natural-')):f.retainedEquipmentIds.includes(r.id)))).map(r=>clone({...r,...(updates.get(r.id)||{})})).concat(clone(f.added[key]));
  }
  out.stats={...out.stats,...f.stats};out.origin.size=f.size||base.origin.size;
  out.identity.features=features(base).filter(r=>!removed.has(r.ref)).map(r=>r.name).join('; ');
  out.formDisabledGrantIds=f.removedRefs.filter(r=>r.startsWith('skills:educated:')).map(r=>r.slice(7));
  out.formDisableOriginSkill=removed.has('origin-free');
  out.skillGrants={}; // Forms cannot recursively open another granted form.
  return out;
}
function capture(base,effective,grant){
  const f=normalize(grant),removed=new Set(f.removedRefs);
  f.stats=Object.fromEntries(Object.entries(effective.stats).filter(([k,v])=>v!==base.stats[k]));
  for(const key of collections){
    const originals=new Map(base[key].map(r=>[r.id,r]));
    f.added[key]=effective[key].filter(r=>!originals.has(r.id)).map(clone);
    f.updated[key]=effective[key].filter(r=>originals.has(r.id)&&JSON.stringify(r)!==JSON.stringify(originals.get(r.id))).map(r=>({id:r.id,...Object.fromEntries(Object.entries(r).filter(([k,v])=>k!=='id'&&JSON.stringify(v)!==JSON.stringify(originals.get(r.id)[k])))}));
    if(key!=='equipment')for(const row of base[key])if(!(key==='skills'&&row.name==='Transformation')&&!effective[key].some(r=>r.id===row.id))removed.add(ref(key,row));
  }
  f.removedRefs=[...removed];return f;
}
function ledger(baseCosts,currentCosts,statCosts,baseStats,currentStats){
  const current=new Map(currentCosts.map(r=>[r.ref,r])),original=new Map(baseCosts.map(r=>[r.ref,r]));
  let refunds=0,spent=0;const refundRows=[],purchaseRows=[];
  for(const row of baseCosts){const now=current.get(row.ref),refund=row.refundable?Math.max(0,row.cost-(now?.cost||0)):0;if(refund){refunds+=refund;refundRows.push({...row,cost:refund})}}
  for(const row of currentCosts){const extra=Math.max(0,row.cost-(original.get(row.ref)?.cost||0));if(extra){spent+=extra;purchaseRows.push({...row,cost:extra})}}
  for(const [name,grade] of Object.entries(currentStats)){const extra=Math.max(0,(statCosts[grade]||0)-(statCosts[baseStats[name]]||0));if(extra){spent+=extra;purchaseRows.push({ref:'stat:'+name,name:name+' '+baseStats[name]+' → '+grade,cost:extra})}}
  return {refunds,spent,refundRows,purchaseRows};
}
root.IH_TRANSFORMATION={collections,ref,normalize,features,build,capture,ledger};
})(window);
