/* Stable place identities for the continental redraw. Source records stay intact. */
function unifiedTaraPlaces(coarse,regional){
 const all=[...coarse,...regional],byPoint=new Map(),byOrigin=new Map();
 const generic=/^(pevnost|hlídka|ostrov|most|věž|vesnice|tábor|sídlo ptačího lidu|podvodní strážnice)(\s*\(|$)/iu;
 const editorial=/^(výřez |přehled$|severní |jižní |severovýchodní$|jihozápad|jihovýchod|u srubu$|.*zákres$|varianta |oblast$|ostrov$|kasíno$)/iu;
 const simple=n=>mapName(n).replace(/^zur['’]k$/u,'zurk').replace(/^tisíce jeskyní$/u,'tisíc jeskyní').replace(/^ostrov polnoc$/u,'polnoc');
 const base=n=>generic.test(n)?simple(n):simple(n.replace(/\s*\([^)]*\)/gu,'').replace(/\s+/g,' ').trim());
 const hasLocal=n=>[...n.matchAll(/\(([^)]*)\)/gu)].some(m=>!editorial.test(m[1]));
 const family=p=>['sidlo','mesto','mistni'].includes(p.type)?'place':p.type;
 const radius=p=>({les:65,kraj:85,vrch:46,voda:75,tok:36,jezero:36,ostrov:42})[p.type]||24;
 const area=p=>ATLAS.regions[p.registration];
 const score=p=>[Number(!!area(p)?.variant),area(p)?.transform[0]??1,(area(p)?.transform[0]??1)*ATLAS.sheets[p.id].w/ATLAS.sheets[p.id].native[0]];
 const compare=(a,b)=>{const x=score(a),y=score(b);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2]||a.name.localeCompare(b.name,'cs');};
 const buckets=new Map();
 for(const p of all){const k=base(p.name)+'|'+family(p);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(p);}
 const places=[],audit=[];
 for(const members of buckets.values()){
  const parent=members.map((_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
  for(let i=0;i<members.length;i++)for(let j=0;j<i;j++){
   const p=members[i],q=members[j];
   if((p.registration||p.id)===(q.registration||q.id))continue;
   if(!!area(p)?.inset!==!!area(q)?.inset)continue;
   if(generic.test(p.name)||generic.test(q.name))continue;
   if(Math.hypot(p.x-q.x,p.y-q.y)<=Math.max(radius(p),radius(q)))parent[find(i)]=find(j);
  }
  const clusters=new Map();members.forEach((p,i)=>{const k=find(i);if(!clusters.has(k))clusters.set(k,[]);clusters.get(k).push(p);});
  for(const group of clusters.values()){
   group.sort(compare);const best=group[0];
   const named=[...group].sort((a,b)=>Number(hasLocal(b.name))-Number(hasLocal(a.name))||compare(a,b))[0];
   const name=hasLocal(named.name)?named.name:named.name.replace(/\s*\((výřez [a-d]|přehled)\)$/iu,'');
   const entity=group.length===1?best:{...best,name,min:Math.min(...group.map(p=>p.min)),canonicalEntity:true,aliases:[...new Set(group.map(p=>p.name))]};
   places.push(entity);
   for(const p of group){byPoint.set(p,entity);if(p.origin)byOrigin.set(p.origin,entity);}
   if(group.length>1)audit.push({name,x:entity.x,y:entity.y,registration:entity.registration||'tara',source:entity.id,members:group.map(p=>({name:p.name,sheet:p.id,registration:p.registration||'tara',x:p.x,y:p.y}))});
  }
 }
 return {places,audit,resolve:p=>p?(byPoint.get(p)||byOrigin.get(p)||p):p};
}
