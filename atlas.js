"use strict";
const $ = id => document.getElementById(id);
const sheets = ATLAS.sheets;
for(const kind of ["Region","Plán sídla","Místní detail"]){
  const group=document.createElement("optgroup");group.label=kind==="Region"?"Regionální předlohy":kind==="Plán sídla"?"Plány sídel":"Místní a dobrodružné mapy";
  for(const [id,sheet] of Object.entries(sheets)){
    if(sheet.raster && sheet.kind===kind)group.append(new Option(sheet.title,id));
  }
  if(group.childElementCount)$("sheet").append(group);
}
// Jen doložené vazby. Některé stejnojmenné osady (zejména Kolmar) leží jinde.
const connections = {
  "tara": {"Erin":["okoli-erinu","sever"],"Kokosové ostrovy":["kokos"],"Korálové ostrovy":["koral"],
    "Minkor":["hvozdy"],"Džungle padlých stromů":["sever","hlubiny"],"Taros":["taros","stiny"],
    "Jezero Yrakan":["yrakan"],"Umrlčí království":["yrakan"],"Sarindar":["yrakan","plan-sarindar-terasy"],
    "Rilond":["severozapad"],"Bílé hory":["stiny","bludne"],"Ybar":["stitove"],"Trpaslíkův hvozd":["stitove","hvozd-pracovni"],
    "Štítové hory":["stitove"],"Sekity-kala":["stitove"],"Targent":["stitove"],"Tři osiky":["stitove"],
    "Říše slepých bohů":["yrakan","severozapad"],"Sfarog":["stitove","yrakan"],"Barbarské ostrovy":["sever","zhave"],
    "Medové hory":["bludne","stitove"],"Tiché vody":["stiny","taros","lvi"],"Nekonečné hory":["severozapad"],
    "Hořké hory":["stiny"],"Mrazivé štíty":["stiny"],"Nedostupné hory":["severozapad","nekromanti"],
    "Větrné hory":["vetrne","severozapad"],"Jižní hvozd":["stitove"],"Ztracená země":["stitove"]},
  "dalavy": {"Očarovaný háj":["haj"],"Větývka":["vetyvsko"],"Rilond":["severozapad","bile-utesy"],"Dunrilean":["sever"],"Gerian":["sever"],
    "Stará štola":["brodna"],"Brigova Studánka":["hrobka"],"Džungle padlých stromů":["vesnice-dzungle"]},
  "sever": {"Erin":["okoli-erinu"],"Bergond":["hvozdy"],"Nový Amir":["dalavy"],"Dunrilean":["dalavy"]},
  "stiny": {"Derteon":["horni","severozapad"],"Tevirpon":["horni"],"Taros":["taros"]},
  "severozapad": {"Derteon":["horni","stiny"],"Rilond":["dalavy"]},
  "nekromanti": {"Nový Sarindar":["sarindar"]},
  "hlubiny": {"Manaui":["kokos"],"Bratkovice":["kokos"],"Nový Arasvik":["kokos"],"Asjenův Hradec":["kokos"],"Malena":["koral"],"Erin":["okoli-erinu","sever"]},
  "stare-dalavy": {"Očarovaný háj":["haj"],"Větývka":["vetyvsko"]},
  "hvozd-pracovni": {"Mlžná":["stitove"],"Dou Bhal":["stitove"],"Vlnice":["stitove"],"Hyragol":["stitove"]},
  "stitove": {"Medovina":["bludne"],"Sarindar":["yrakan","plan-sarindar-terasy"],"Mlžná":["hvozd-pracovni"],"Malá":["hvozd-pracovni"]},
  "hvozdy": {"Jasný svit":["vaj-si"],"Seliak":["oggi"],"Březno":["mezi-svety"]},
  "brodna": {"Stará štola":["dalavy"]},
};
// Tyto dvojice četly tutéž oblast v různých vydáních, včetně polohy shodných sídel.
const pairedEditions = [
  ["dalavy","stare-dalavy"],
  ["severozapad","severozapad-slepa"],
  ["hvozd-pracovni","hvozd-stvanice","hvozd-starsi"],
  ["bludne","bludne-koncept"],
  ["sever","hlubiny"],
  ["kokos","hlubiny"],
  ["koral","hlubiny"],
  ["zhave","hlubiny"],
  ["yrakan","stitove"],
  ["svet","politicka-850","politicka-863"],
];
const map = $("map");
const tileLayer = $("tileLayer");
const labels = $("labels");
const kinds = {ostrov:"Ostrov nebo souostroví",budova:"Městský objekt",kontinent:"Kontinent", kraj:"Krajina", voda:"Vodstvo",les:"Les",vrch:"Hory a kopce",jezero:"Jezero",trhlina:"Trhlina",tok:"Řeka nebo potok",cesta:"Cesta", mesto:"Město", sidlo:"Sídlo", mistni:"Místní objekt"};
const isDalavy = id => id==="dalavy" || id==="stare-dalavy";
const state = {id:"tara", mode:"sketch", x:525, y:374, scale:1, selected:null};
const trail=[];
const backButton=document.createElement("button");
backButton.type="button";backButton.id="previousMap";backButton.textContent="← Zpět na mapu";backButton.hidden=true;
$("aboutOpen").before(backButton);
function rememberSheet(id){
  if(id===state.id)return;
  trail.push({...state});if(trail.length>40)trail.shift();
  backButton.hidden=false;
}
backButton.onclick=()=>{
  const last=trail.pop();if(!last)return;
  Object.assign(state,last);$("sheet").value=last.id;
  if(last.selected){go(last.selected);Object.assign(state,last);}else hideDetail();
  $("search").value="";results();mode(last.mode);backButton.hidden=!trail.length;
};
const points = Object.entries(sheets).flatMap(([id,s]) => s.features.map(([type,min,name,x,y])=>({id,type,min,name,x,y})));
const onTara=continentalPlaces(points);
points.push(...slunecniOstrovy.records);
const placesByArea=new Map();
for(const place of onTara){
 if(!placesByArea.has(place.registration))placesByArea.set(place.registration,new Map());
 placesByArea.get(place.registration).set(place.name,place);
}
const representatives=groupPlaces(onTara);
const placeIndex=unifiedTaraPlaces(points.filter(p=>p.id==="tara"),onTara);
const extentTara=Math.max(sheets.tara.w,...areaRegistry.filter(([,r])=>r.inset)
  .flatMap(([,r])=>r.clip.map(([x,y])=>continentalPosition(r,x,y)[0]+15)));
const regionLayer=document.createElement("div");regionLayer.id="regionTiles";regionLayer.setAttribute("aria-hidden","true");tileLayer.after(regionLayer);
const styledSheets=new Set(window.DALAVSKY);
const isStyled=()=>state.mode==="dalavsky" || state.mode==="s" || state.mode==="d";
const isRedraw=()=>state.mode==="sketch" || isStyled();
const returnToRedraw=()=>{if(!isStyled())state.mode="sketch";};
const hasSketch = id => Boolean(sheets[id].levels.sketch || ["tara","lendor","svet","dalavy"].includes(id));
for(const [id,area] of areaRegistry){
  const title=sheets[area.sheet||id].title+(area.sheet?" · "+({
    "hvozdy-b":"Khelegovy hory","hvozdy-c":"Červený les","hvozdy-d":"Zlatý les",
    "hlubiny-kokos":"Kokosové ostrovy","hlubiny-koral":"Korálové ostrovy","hlubiny-zhave":"Žhavé moře",
    "hlubiny-dalava":"Severní dálava","vetyvsko-lan":"Lán"}[id]||id):"")+(area.inset?" · vložená mapa":"");
  $("area").append(new Option(id==="nekromanti"?"Sedmý živel · "+title:title,id));
}
const localAreas=document.createElement("optgroup");localAreas.label="Další regionální listy";
for(const [id,sheet] of Object.entries(sheets)){
  if(sheet.raster && sheet.kind==="Region" && !ATLAS.regions[id]) localAreas.append(new Option(sheet.title,id));
}
$("area").append(localAreas);
function showArea(id){
  const area=ATLAS.regions[id];if(!area){fit(sheets[id]?id:"tara");return;}
  const sheet=sheets[area.sheet||id],[k,ox,oy]=area.transform;
  const polygon=area.clip.length?area.clip:[[0,0],[sheet.w,sheet.h]];
  const world=polygon.map(([x,y])=>continentalPosition(area,x,y));
  const xs=world.map(p=>p[0]),ys=world.map(p=>p[1]);
  const l=Math.min(...xs),r=Math.max(...xs),t=Math.min(...ys),b=Math.max(...ys);
  rememberSheet("tara");hideDetail();returnToRedraw();
  const scale=.92*Math.min(map.clientWidth/(r-l),map.clientHeight/(b-t));
  center("tara",(l+r)/2,(t+b)/2,scale);
  $("area").value=id;$("search").value="";results();draw();
}
$("area").onchange=e=>showArea(e.target.value);
const oldNames = {
 "nekromanti":{"Dorovo klubí":"Dorovo klubo","Přístav":"Přístaviště"},
 "stiny":{"Jezero Rambar":"Jezero Rambúr","Galakuiš":"Galakuuš","Kráhavec":"Krkavec","Horké hory":"Hořké hory","Předhůří Sakbán":"Předhůří Šakkán","Agen":"Agren","Dárta":"Dárja","Živý trůn":"Zylův trůn"},
 "tara":{"Horké hory":"Hořké hory","Agen":"Agren"},
 "horni":{"Connmetina":"Črnometina"},
};
const fold = t => t.replace(/[’‘]/g,"'").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const fitHeight = () => sheets[state.id].drawnHeight || sheets[state.id].h;
const fitScale = () => Math.min(map.clientWidth/sheets[state.id].w, map.clientHeight/fitHeight())*0.96;
const center = (id,x,y,scale) => {state.id=id;state.x=x;state.y=y;state.scale=scale;$("sheet").value=id;};
function hideDetail(){state.selected=null;$("detail").hidden=true;}
function fit(id){
  rememberSheet(id);
  hideDetail();state.id=id;
  $("area").value="";
  const s=sheets[id];center(id,s.w/2,fitHeight()/2,fitScale());
  $("search").value="";results();draw();
}
function go(p){
  rememberSheet(p.id);
  if(p.hypothesis){
    returnToRedraw();
    const all=p.name===slunecniOstrovy.name;
    const focus=all?slunecniOstrovy.anchor:p;
    center("tara",focus.x,focus.y,all?slunecniOstrovy.overviewZoom():Math.max(slunecniOstrovy.overviewZoom(),p.min*1.8));
    $("area").value="";
  }else center(p.id,p.x,p.y,Math.max(p.min*1.25,1.5));
  state.selected=p;
  $("dn").textContent=p.name;$("dk").textContent=kinds[p.type];$("ds").textContent="List "+sheets[p.id].title+" · poloha odečtená z předlohy";
  if(p.id==="tara" && sheets.tara.southNames.includes(p.name))$("ds").textContent="Jih Tary · pracovní mapa KO2c";
  if(p.id==="albireo" && sheets.albireo.numbers?.[p.name])$("ds").textContent="Číslo "+sheets.albireo.numbers[p.name]+" v legendě · Tomáš Brada";
  const openCity=p.id==="dalavy" && p.name==="Albireo";
  const regional=points.find(other=>p.id==="tara" && other.id==="dalavy" && other.name===p.name);
  $("regional").hidden=!regional && !openCity;
  $("regional").textContent=openCity?"Otevřít městský plán":"Otevřít na mapě Dálav";
  $("regional").onclick=()=>{if(openCity)fit("albireo");else if(regional)go(regional);};
  const sheet=sheets[p.id];
  const shape=sheet.paths1340?.find(item=>item.name===p.name);
  if(shape)$("ds").textContent+=["plocha","obrys"].includes(shape.type)?" · orientační obrys":" · orientační průběh";
  if(sheet.notes?.[p.name])$("ds").textContent+=" · "+sheet.notes[p.name];
  if(sheet.raster)$("ds").textContent+=" · "+sheet.original;
  const related=$("related"); related.replaceChildren();
  const reference=document.createElement("button");reference.textContent="Ukázat v předloze";
  const original=["tara","dalavy"].includes(p.id)?"listy.html#"+p.id:sheet.url;
  reference.hidden=!original && !p.hypothesis;
  reference.onclick=()=>location.assign(original);related.append(reference);
  if(p.hypothesis){
    $("ds").textContent=p.note+" Nemrtví a světlonoši, kap. B. Přesná poloha, měřítko, obrysy a rozmístění objektů jsou hypotézou atlasu.";
    reference.textContent="Celé souostroví";
    reference.onclick=()=>{center("tara",slunecniOstrovy.anchor.x,slunecniOstrovy.anchor.y,slunecniOstrovy.overviewZoom());hideDetail();draw();};
  }
  const ids=new Set(connections[p.id]?.[p.name] || []);
  for(const [id,detail] of Object.entries(sheets)){
    if(detail.parentSheet===p.id && (!detail.parentPlace || detail.parentPlace===p.name))ids.add(id);
  }
  const continental=placeIndex.resolve(onTara.find(q=>q.origin===p));
  if(continental){
    const button=document.createElement("button");button.textContent="Ukázat v překresu celé Tary";
    button.onclick=()=>{rememberSheet("tara");hideDetail();returnToRedraw();center("tara",continental.x,continental.y,Math.max(6,continental.min*1.5));results();draw();};
    related.append(button);
  }
  // Čtení názvu největšího jezera se v těchto dvou vydáních liší.
  const lakeNames={"dalavy":"Velké Torské jezero","stare-dalavy":"Velké Tarské jezero"};
  const nameOn=id=>p.name===lakeNames[p.id] && lakeNames[id] ? lakeNames[id] : p.name;
  for(const group of pairedEditions){
    if(!group.includes(p.id))continue;
    for(const id of group){
      if(id!==p.id && points.some(other=>other.id===id && fold(other.name)===fold(nameOn(id))))ids.add(id);
    }
  }
  for(const [id,s] of Object.entries(sheets)){
    if(s.planOf===p.name || (p.name==="Hni Phel Lao" && id==="plan-hniphel"))ids.add(id);
  }
  for(const id of ids){
    if(!sheets[id])continue;
    const b=document.createElement("button");b.type="button";b.textContent=sheets[id].title+" ↗";
    const target=points.find(other=>other.id===id && fold(other.name)===fold(nameOn(id)));
    b.onclick=()=>{if(target)go(target);else fit(id);};related.append(b);
  }
  temata.detail(p);
  $("detail").hidden=false;$("search").value="";$("search").blur();results();draw();
}
function inspectOnTara(place, recenter=true){
  place=placeIndex.resolve(place);
  if(!place.origin){go(place);return;}
  const ref=place.origin,previous={x:state.x,y:state.y,scale:state.scale};
  // Obsah karty patří místní předloze, souřadnice pohledu patří Taře.
  go(ref);
  if(trail.at(-1)?.id==="tara")trail.pop();
  backButton.hidden=!trail.length;
  returnToRedraw();state.selected=place;$("dn").textContent=place.name;
  const registration=ATLAS.regions[place.registration];
  const detailScale=Math.min(100000,Math.max(place.min*1.6,registration.minimum,.95/registration.transform[0],8));
  center("tara",recenter?place.x:previous.x,recenter?place.y:previous.y,recenter?detailScale:previous.scale);
  if(recenter)$("area").value=place.registration;
  $("ds").textContent+=" · "+(ATLAS.regions[place.registration].note||"Poloha přenesena ze společných bodů obou map.");

  results();draw();
}
function results(){
 const q=fold($("search").value.trim());
 let chosen=q?points.filter(p=>fold(p.name).includes(q) || Object.entries(oldNames[p.id]||{}).some(([old,name])=>name===p.name&&fold(old).includes(q))).sort((a,b)=>(fold(b.name)===q)-(fold(a.name)===q)||(b.id===state.id)-(a.id===state.id)):points.filter(p=>p.id===state.id);
 if(state.id==="tara" && isRedraw())chosen=[...new Set(chosen.map(p=>placeIndex.resolve(p)))].sort((a,b)=>Number(!!b.origin)-Number(!!a.origin));
 const out=$("results");out.replaceChildren();
 if(!q){
   for(const [id,child] of Object.entries(sheets)){
     if(child.parentSheet!==state.id)continue;
     const b=document.createElement("button");b.className="result";b.dataset.sheet=id;
     const title=document.createElement("strong");title.textContent=child.title;
     const sub=document.createElement("span");sub.textContent="Otevřít podrobný plán";
     b.append(title,sub);b.onclick=()=>fit(id);out.append(b);
   }
 }
 if(q){
   for(const [id,s] of Object.entries(sheets)){
     if(!fold([s.title,s.module||"",(ATLAS.modules?.[id]||"")].join(" ")).includes(q))continue;
     const b=document.createElement("button");b.className="result sheet-result";b.dataset.sheet=id;
     const a=document.createElement("strong");a.textContent=s.title;const sub=document.createElement("span");
     sub.textContent=[s.module||ATLAS.modules?.[id],s.kind].filter(Boolean).join(" · ");
     b.append(a,sub);b.onclick=()=>{
       if(state.id==="tara" && isRedraw() && ATLAS.regions[id])showArea(id);else fit(id);
       $("search").blur();
     };out.append(b);
   }
 }
 const firstSheet=out.querySelector(".sheet-result");
 for(const p of chosen){
  const b=document.createElement("button");b.className="result";b.dataset.sheet=p.id;const a=document.createElement("strong");a.textContent=p.name;
  const sub=document.createElement("span");sub.textContent=kinds[p.type]+" · "+(p.hypothesis?"NaS · poloha hypotetická":sheets[p.id].title);b.append(a,sub);b.onclick=()=>{
    const placed=state.id==="tara" && isRedraw() && (p.origin?p:placeIndex.resolve(onTara.find(q=>q.origin===p)));
    if(placed)inspectOnTara(placed);else go(p);
  };out.insertBefore(b,q && fold(p.name)===q?firstSheet:null);
 }
 if(q){
   for(const [id,s] of Object.entries(sheets)){
     if(!s.planOf || !fold(s.planOf).includes(q))continue;
     const b=document.createElement("button");b.className="result";b.dataset.sheet=id;
     const a=document.createElement("strong");a.textContent=s.title;
     const sub=document.createElement("span");sub.textContent="Otevřít plán sídla";
     b.append(a,sub);b.onclick=()=>{fit(id);$("search").blur();};out.append(b);
   }
 }
 if(!out.childElementCount)out.textContent=q?"Žádné nalezené místo.":sheets[state.id].planOf?"Původní plán sídla.":"";
}
function project(p){return [(p.x-state.x)*state.scale+map.clientWidth/2,(p.y-state.y)*state.scale+map.clientHeight/2];}
function unproject(x,y){return [state.x+(x-map.clientWidth/2)/state.scale,state.y+(y-map.clientHeight/2)/state.scale];}
const printed=new Map(Object.entries(sheets).map(([id,s])=>[id,new Set(s.printedNames||[])]));
function renderCourses(sheet){
 const svg=$("courses");svg.replaceChildren();
 const maskBank=state.id==="tara" && isRedraw()?shorelineMasks(svg):null;
 if(maskBank)drawContinentalCourses(svg,maskBank);
 if(state.id==="tara" && isRedraw())slunecniOstrovy.draw(svg);
 if(!sheet.paths1340 || state.mode==="list")return;
 const ratio=sheet.w/1340;
 const [left,top]=project({x:0,y:0});
 const zoom=state.scale*ratio;
 const group=document.createElementNS("http://www.w3.org/2000/svg","g");
 group.setAttribute("transform","translate("+left+" "+top+") scale("+zoom+")");svg.append(group);
 for(const shape of sheet.paths1340){
   const name=shape.name;
   const active=state.selected?.name===name;
   if(!active && (state.scale<.64 || shape.type==="plocha"))continue;
   const path=document.createElementNS(svg.namespaceURI,["obrys","plocha"].includes(shape.type)?"polygon":"polyline");
   path.setAttribute("points",shape.points.map(p=>p.join(",")).join(" "));
   path.setAttribute("vector-effect","non-scaling-stroke");
   path.classList.add("course",shape.type);
   if(state.id==="tara" && isRedraw() && state.scale<=8 && ["tok","trhlina"].includes(shape.type)){
     path.classList.add("zemepis");path.dataset.sheet="tara";path.dataset.name=name;
   }
   if(active)path.classList.add("active");
   const title=document.createElementNS(svg.namespaceURI,"title");
   title.textContent=name;path.append(title);
   path.onclick=()=>{const p=points.find(p=>p.id===state.id&&p.name===name);if(p)go(p);};
   const mask=maskBank&&maskBank(name);
   if(mask){
     const wrapper=svgElement("g",{mask:"url(#"+mask+")"});
     path.setAttribute("transform",group.getAttribute("transform"));
     wrapper.append(path);svg.append(wrapper);
   }else group.append(path);
 }
}
let dragFrame=0;
function drawSoon(){if(!dragFrame)dragFrame=requestAnimationFrame(()=>{dragFrame=0;draw();});}
function draw(){
 const s=sheets[state.id], size=ATLAS.tile, w=map.clientWidth,h=map.clientHeight;
 if(!w||!h)return;
 state.x=Math.max(0,Math.min(state.id==="tara" && isRedraw()?extentTara:s.w,state.x));state.y=Math.max(state.id==="tara"&&isRedraw()?-65:0,Math.min(s.h,state.y));
 const styled=isStyled() && styledSheets.has(state.id);
 const activeMode=styled?"sketch":(state.mode==="cc3" && !s.levels.cc3 || isRedraw() && !hasSketch(state.id)) ? "atlas" : isRedraw()?"sketch":state.mode;
 const cc3=activeMode==="cc3";
 $("area").hidden=state.id!=="tara";$("areaLabel").hidden=state.id!=="tara";
 const printedCC3=cc3 && s.cc3Printed;
 const facsimile=printedCC3 || ((isDalavy(state.id) || s.raster) && !cc3 && activeMode!=="sketch");
 const layer=cc3 ? "cc3" : activeMode==="sketch" ? (s.levels.sketch?"sketch":"atlas") : facsimile || s.raster || state.id==="albireo" ? "list" : activeMode;
 const levels=s.levels[layer] || s.levels.list;
 map.dataset.facsimile=String(facsimile);
 map.dataset.mode=styled?state.mode:activeMode;
 $("dalavskyMode").hidden=!styledSheets.has(state.id);
 $("sMode").hidden=!styledSheets.has(state.id);
 $("dMode").hidden=!styledSheets.has(state.id);
 $("cc3Mode").hidden=!s.levels.cc3;
 $("sketchMode").hidden=!hasSketch(state.id);
 $("nativeZoom").hidden=!(cc3 || activeMode==="sketch" || isDalavy(state.id) || s.raster);
 for(const m of ["cc3","atlas","list","sketch","dalavsky","s","d"])$(m+"Mode").setAttribute("aria-pressed",String(m===map.dataset.mode));
 const desired=(facsimile ? (window.devicePixelRatio||1) : Math.min(2,window.devicePixelRatio||1))*state.scale*s.w;
 let z=levels.findIndex(pair=>pair[0]>=desired);if(z<0)z=levels.length-1;
 const [pw,ph]=levels[z];const sx=state.scale*s.w/pw, sy=facsimile ? state.scale*s.w*s.native[1]/(s.native[0]*ph) : state.scale*s.h/ph;
 const [left,top]=project({x:0,y:0});const needed=new Set();
 for(let y=Math.max(0,Math.floor(-top/(size*sy)));!styled && y<Math.min(Math.ceil(ph/size),Math.ceil((h-top)/(size*sy)));y++){
  for(let x=Math.max(0,Math.floor(-left/(size*sx)));x<Math.min(Math.ceil(pw/size),Math.ceil((w-left)/(size*sx)));x++){
   const url="tiles/"+state.id+"/"+layer+"/"+z+"/"+x+"-"+y+".webp";
   needed.add(url);let img=tileLayer.querySelector('[data-key="'+url+'"]');
   if(!img){img=new Image();img.alt="";img.draggable=false;img.dataset.key=url;img.src=url;tileLayer.append(img);}
   const x0=Math.round(left+x*size*sx),y0=Math.round(top+y*size*sy);
   img.style.left=x0+"px";img.style.top=y0+"px";
   img.style.width=(Math.round(left+Math.min((x+1)*size,pw)*sx)-x0)+"px";
   img.style.height=(Math.round(top+Math.min((y+1)*size,ph)*sy)-y0)+"px";
  }
 }
 for(const child of [...tileLayer.children]){
   if(styled && child.dataset.styled===state.id)continue;
   if(!styled && child.dataset.geography && activeMode==="sketch")continue;
   if(!needed.has(child.dataset.key))child.remove();
 }
 const geographicBox={position:"absolute",left:left+"px",top:top+"px",width:(state.scale*s.w)+"px",height:(state.scale*s.h)+"px"};
 if(styled){
   styledImage(tileLayer,state.id,geographicBox,state.scale);
 }else if(activeMode==="sketch"){
   physicalImage(tileLayer,state.id,"breh",geographicBox);
   physicalImage(tileLayer,state.id,"teren",geographicBox);
 }
 regionalTiles(state,regionLayer,map,project);
 renderCourses(s);
 temata.draw();
 labels.replaceChildren();const occupied=temata.occupied();
 const mobileOverview = map.clientWidth < 500 && state.scale >= fitScale()*.9;
 const visible=points.filter(p=>p.id===state.id && (!p.hypothesis || isRedraw()) && (
   (p===state.selected && !(facsimile && state.mode==="list")) ||
   (state.mode!=="list" && (state.scale>=p.min || (mobileOverview && p.min<=0.7)))));
 if(state.id==="tara" && activeMode==="sketch"){
   // Resolve once across all sheets, before viewport/zoom filtering. A duplicate
   // must not reappear when the preferred position leaves the viewport.
   state.selected=placeIndex.resolve(state.selected);
   const chosen=$("area").value;
   visible.length=0;
   for(const p of placeIndex.places){
     if(p!==state.selected && state.scale<p.min)continue;
     if(p.registration && chosen && ATLAS.regions[p.registration].variant && p.registration!==chosen && p!==state.selected)continue;
     visible.push(p);
   }
 }
 visible.sort((a,b)=>(b===state.selected)-(a===state.selected)||a.min-b.min);
 for(const p of visible){
  const [x,y]=project(p);if(x<0||x>w||y<0||y>h)continue;
  const b=document.createElement("button");b.className=p.type+(p===state.selected?" selected":"");b.textContent=p.name;b.style.left=x+"px";b.style.top=y+"px";
  b.dataset.sheet=p.id;b.dataset.name=p.name;
  if(p.hypothesis){
    b.title=p.name+" · hypotetické umístění podle NaS";
    if(p.name===slunecniOstrovy.name)b.textContent+=" · hypotéza";
  }
  b.onclick=()=>{if(p.origin)inspectOnTara(p,false);else if(state.id==="svet"&&p.type==="kontinent")fit(fold(p.name));else go(p);};
  labels.append(b);
  if(facsimile && (activeMode==="atlas" || printedCC3) && p!==state.selected && printed.get(p.id)?.has(p.name)){
    b.classList.add("source-hit");b.title=p.name;
    continue;
  }
  const settlement=["sidlo","mesto"].includes(p.type);
  const landscape=["vrch","les","jezero","trhlina","kraj","voda","tok","cesta","ostrov"].includes(p.type);
  const besideRelief=(p.type==="vrch" || p.type==="trhlina") && p!==state.selected;
  const placements=settlement?["","west","above","below"]:
    besideRelief?["north","south",""]:landscape?["","north","south"]:[""];
  if(styled && p.id==="dalavy" && landscape)placements.push("detail-north","detail-south","detail-east","detail-west");
  let box;
  for(const placement of placements){
    b.dataset.placement=placement;
    const rect=b.getBoundingClientRect();
    if(occupied.every(r=>r.right+4<rect.left||r.left>rect.right+4||r.bottom+3<rect.top||r.top>rect.bottom+3)){
      box=rect;break;
    }
  }
  if(!box){
    if(settlement || (activeMode==="sketch" && state.id==="tara")){
      delete b.dataset.placement;
      b.classList.add("point-only");b.setAttribute("aria-label",p.name);b.title=p.name;b.textContent="";
    }else{b.remove();}
    continue;
  }
  occupied.push(box);
 }
 const city=state.id==="albireo";document.querySelector(".scale").hidden=!s.km;
 if(s.km){
  const target=95*s.km/state.scale;
  const power=10**Math.floor(Math.log10(target));const step=[5,2,1].find(t=>t*power<=target)*power;
  $("scaleBar").style.width=(step*state.scale/s.km)+"px";$("scaleText").textContent=step.toLocaleString("cs-CZ")+" km";
 }
 $("credit").textContent=city?"Perspektivní plán · Tomáš Brada · Albireo":(state.mode==="atlas"?"Pracovní překres podle Jany Žižkové":"Předloha · Jana Žižková")+" · "+s.title;
 if(s.raster)$("credit").textContent=s.title+" · "+s.original;
 if(facsimile)$("credit").textContent=s.title+" · "+s.original;
 if(state.id==="tara"){
  $("credit").textContent=state.mode==="list"?"Tara · Jana Žižková + pracovní mapa KO2c":"Tara · překres kontinentální mapy a pracovního listu KO2c";
 }else if(state.id==="svet" && state.mode==="atlas"){
  $("credit").textContent="Lendor a Tara · kontinentální listy a jižní rozšíření KO2c";
 }
 const styleSwitch=document.querySelector(".switch");
 $("south").style.top=(styleSwitch.offsetTop+styleSwitch.offsetHeight+10)+"px";
 $("south").hidden=!["tara","dalavy","stare-dalavy"].includes(state.id);
 $("south").textContent=state.id==="tara"?"Jih Tary":"Jih Dálav";
 const blankY=project({x:525,y:978})[1];
 if(cc3)$("credit").textContent=s.title+" · CC3+ · Herwin Wielink";
 if(activeMode==="sketch")$("credit").textContent=state.id==="tara"?"Tara · regionální překres podle původních listů":"Překres · "+s.title;
 if(state.id==="tara" && state.x>s.w){
   const inset=areaRegistry.find(([,r])=>r.inset && Math.abs(state.x-r.transform[1]-42.5)<60);
   $("credit").textContent=inset?sheets[inset[0]].title+" · vložená mapa, poloha na Taře nedoložena":"Vložené mapy mimo zeměpisný rám Tary";
   document.querySelector(".scale").hidden=true;
 }
 const areaKey=state.id==="tara" && activeMode==="sketch" && ($("area").value ||
   [...regionLayer.querySelectorAll("[data-area]")].filter(group=>{
     const a=ATLAS.regions[group.dataset.area],k=a.transform[0];
     const [x,y]=fromAreaAxes(a,(state.x-a.transform[1])/k,(state.y-a.transform[2])/k);
     return isInside(x,y,a.clip);
   }).sort((a,b)=>Number(b.style.zIndex)-Number(a.style.zIndex))[0]?.dataset.area);
 const sourceId=areaKey?(ATLAS.regions[areaKey]?.sheet||areaKey):state.id;
 const source=sheets[sourceId];
 if(source && !cc3 && !(state.id==="tara" && state.x>s.w)){
   const credit=$("credit");
   credit.textContent=(styled?(["s","d"].includes(state.mode)?((sourceId==="dalavy"||!!window.WESTERN_TILES?.[sourceId]||(sourceId==="nekromanti"&&window.CONTINUOUS_TARA&&state.id==="tara"&&state.x>=144&&state.x<=201&&state.y>=499&&state.y<=546))?(state.mode==="d"?"Styl D · Herwin Wielink / ProFantasy · ":"Varianta S · Mike Schley / ProFantasy · "):"Dálavský styl (mimo rozsah "+state.mode.toUpperCase()+") · "):"Dálavský styl · "):activeMode==="sketch"?"Překres · ":"")+source.title+(source.author?" · předloha "+source.author:"")+(sourceId==="tara"?" · jih podle KO2c":"")+" · ";
   const link=document.createElement("a");
   link.textContent="Pramen";link.title=source.title;link.href=source.url||"https://asterionrpg.cz/index.php/mapy.html";
   if(source.url){link.target="_blank";link.rel="noopener";}
   if(source.url)credit.append(link);else credit.append(source.module||"Regionální překres");
   if(state.id==="tara" && isRedraw() && state.scale>=24 &&
      Math.abs(state.x-slunecniOstrovy.anchor.x)<3 && Math.abs(state.y-slunecniOstrovy.anchor.y)<2.3){
     credit.textContent="Ostrovy zářícího slunce · Nemrtví a světlonoši, kap. B · poloha a kresba hypotetické";
   }
   const shore=activeMode==="sketch"&&state.id==="tara"&&shoreUnderCenter(regionLayer,areaKey);
   if(shore){
     credit.append(" · ");
     const detail=document.createElement("a");
     detail.textContent=shore.kind==="land"?"Krajina podle Dálav":"Předlohy společného břehu";detail.title=shore.source;
     credit.append(detail);
   }
 }
 $("blank").hidden=activeMode==="list" || state.id!=="tara" || blankY<10 || blankY>h-45;
 $("blank").style.top=blankY+"px";
 map.dataset.sheet=state.id;map.dataset.scale=state.scale.toFixed(3);
}
function mode(id){state.mode=id;draw();}
function zoom(factor,px=map.clientWidth/2,py=map.clientHeight/2){
 const [x,y]=unproject(px,py);
 const scale=Math.max(fitScale()*.48,Math.min(state.id==="tara" && isRedraw()?100000:Math.max(8,sheets[state.id].native[0]/sheets[state.id].w*2),state.scale*factor));let dest=state.id,tx=x,ty=y,sc=scale;
 // Affine local approximation from Nový Amir, Albireo, Athor and Sintar.
 const k=.213, bx=330-k*571, by=227-k*617;
 const localX=(x-bx)/k, localY=(y-by)/k;
 if(state.mode!=="list"){
  if(factor>1 && scale>6 && ["dalavy","stare-dalavy"].includes(state.id)){
    const grove=points.find(p=>p.id===state.id && p.name==="Očarovaný háj");
    if(grove && Math.hypot(x-grove.x,y-grove.y)<0.016*sheets[state.id].w){
      fit("haj");return;
    }
  }
  if(state.id==="dalavy" && factor>1 && scale>3.4 && Math.hypot(x-535,y-419)<10){
    go(points.find(p=>p.id==="vetyvsko" && p.name==="Větývka"));hideDetail();draw();return;
  }
  if(state.id==="vetyvsko" && factor<1 && scale<fitScale()*.72){
    go(points.find(p=>p.id==="dalavy" && p.name==="Větývka"));return;
  }
  if(state.id==="tara" && !isRedraw() && factor>1 && scale>2.55){
    const gateways=["Erin","Trpaslíkův hvozd","Ybar","Jezero Yrakan","Kokosové ostrovy","Korálové ostrovy","Sfarog","Medové hory","Tiché vody","Barbarské ostrovy","Nekonečné hory"];
    const nearby=points.filter(p=>p.id==="tara" && gateways.includes(p.name) && Math.hypot(p.x-x,p.y-y)<16);
    const entry=nearby.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
    if(entry){
      const id=connections.tara[entry.name][0];
      const target=points.find(p=>p.id===id && p.name===entry.name);
      if(target){go(target);hideDetail();draw();}
      else if(entry.name==="Trpaslíkův hvozd"){
        fit(id);center(id,710,605,Math.min(map.clientWidth/290,map.clientHeight/250));draw();
      }else fit(id);
      return;
    }
  }
  if(state.id==="dalavy" && factor>1 && scale>4 && Math.hypot(x-571,y-617)<9){fit("albireo");return;}
  if(state.id==="albireo" && factor<1 && scale<fitScale()*.72){go(points.find(p=>p.id==="dalavy"&&p.name==="Albireo"));return;}
  if(state.id==="tara" && !isRedraw() && factor>1 && scale>2.55 && localX>48&&localX<775&&localY>170&&localY<1098){
   dest="dalavy";tx=localX;ty=localY;sc=scale*k;
  }else if(state.id==="dalavy"&&factor<1&&scale<.49){
   dest="tara";tx=bx+k*x;ty=by+k*y;sc=scale/k;
  }else if(state.id==="svet"&&factor>1&&scale>1.35){
   const part=y>646?"tara":"lendor";const [k,ox,oy]=ATLAS.world[part];
   const u=(x-ox)/k,v=(y-oy)/k;
   if(u>=0&&u<sheets[part].w&&v>=0&&v<sheets[part].h){dest=part;tx=u;ty=v;sc=scale*k;}
  }else if(sheets.svet && ["tara","lendor"].includes(state.id)&&factor<1&&scale<.48){
   const [k,ox,oy]=ATLAS.world[state.id];dest="svet";tx=x*k+ox;ty=y*k+oy;sc=scale/k;
  }
 }
 if(dest!==state.id){rememberSheet(dest);hideDetail();$("search").value="";}
 center(dest,tx-(px-map.clientWidth/2)/sc,ty-(py-map.clientHeight/2)/sc,sc);results();draw();
}
map.addEventListener("wheel",e=>{e.preventDefault();const r=map.getBoundingClientRect();zoom(Math.exp(-Math.sign(e.deltaY)*.22),e.clientX-r.left,e.clientY-r.top);},{passive:false});
const fingers=new Map();let pinch=0;
function spacing(){const [a,b]=[...fingers.values()];return Math.hypot(a.x-b.x,a.y-b.y);}
map.addEventListener("pointerdown",e=>{
 if(e.target.closest("button,.course,#detail"))return;
 fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});map.setPointerCapture(e.pointerId);map.classList.add("dragging");
 if(fingers.size===2)pinch=spacing();
});
map.addEventListener("pointermove",e=>{
 const old=fingers.get(e.pointerId);if(!old)return;
 fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(fingers.size===2){const [a,b]=[...fingers.values()],r=map.getBoundingClientRect(),next=spacing();if(pinch>0&&next>0)zoom(next/pinch,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);pinch=next;return;}
 state.x-=(e.clientX-old.x)/state.scale;state.y-=(e.clientY-old.y)/state.scale;drawSoon();
});
function release(e){fingers.delete(e.pointerId);if(fingers.size<2)pinch=0;if(!fingers.size)map.classList.remove("dragging");}
map.addEventListener("pointerup",release);map.addEventListener("pointercancel",release);
map.addEventListener("dblclick",e=>{if(!e.target.closest("button")){const r=map.getBoundingClientRect();zoom(1.7,e.clientX-r.left,e.clientY-r.top);}});
map.addEventListener("keydown",e=>{
 const move=80/state.scale;
 switch(e.key){case "+":case "=":zoom(1.45);break;case "-":zoom(1/1.45);break;case "ArrowLeft":state.x-=move;break;case "ArrowRight":state.x+=move;break;case "ArrowDown":state.y+=move;break;case "ArrowUp":state.y-=move;break;case "Home":fit(state.id);break;default:return;}
 e.preventDefault();draw();
});
$("sheet").onchange=e=>fit(e.target.value);$("search").oninput=results;
$("plus").onclick=()=>zoom(1.5);$("minus").onclick=()=>zoom(1/1.5);$("fit").onclick=()=>fit(state.id);
$("dalavskyMode").onclick=()=>mode("dalavsky");
$("sMode").onclick=()=>mode("s");
$("dMode").onclick=()=>mode("d");
$("sketchMode").onclick=()=>mode("sketch");
$("cc3Mode").onclick=()=>mode("cc3");
$("nativeZoom").onclick=()=>{
  const s=sheets[state.id];
  if(state.id==="tara" && isRedraw()){
    const candidates=areaRegistry.filter(([key,r])=>{
      if(!r.overlay || !r.clip.length || (r.variant && key!==$("area").value))return false;
      const [k,ox,oy]=r.transform, local=fromAreaAxes(r,(state.x-ox)/k,(state.y-oy)/k);
      return isInside(local[0],local[1],r.clip) &&
        (key===$("area").value || state.scale>=r.minimum);
    }).sort(([a,ra],[b,rb])=>(b===$("area").value)-(a===$("area").value)||ra.transform[0]-rb.transform[0]);
    if(candidates.length){
      const [key,r]=candidates[0],local=sheets[r.sheet||key],levels=local.levels.sketch||local.levels.atlas;
      state.scale=levels.at(-1)[0]/(local.w*r.transform[0]*(window.devicePixelRatio||1));draw();return;
    }
  }
  const width=state.mode==="cc3" && s.levels.cc3 ? s.levels.cc3.at(-1)[0] : isRedraw() && hasSketch(state.id) ? (s.levels.sketch||s.levels.atlas).at(-1)[0] : s.native[0];
  state.scale=width/(s.w*(window.devicePixelRatio||1));
  draw();
};
$("atlasMode").onclick=()=>mode("atlas");$("listMode").onclick=()=>mode("list");
$("closeDetail").onclick=()=>{hideDetail();draw();};$("aboutOpen").onclick=()=>$("about").showModal();$("aboutClose").onclick=()=>$("about").close();
$("south").onclick=()=>{
 hideDetail();
 const s=sheets[state.id];
 if(state.id==="tara"){
   center("tara",s.w/2,772,Math.min(map.clientWidth/(s.w*.94),map.clientHeight/400)*.96);
 }else{
   const unit=s.w/1340;
   center(state.id,680*unit,1480*unit,Math.min(map.clientWidth/(1280*unit),map.clientHeight/(750*unit))*.96);
 }
 draw();map.focus({preventScroll:true});
};
new ResizeObserver(drawSoon).observe(map);
const query = new URLSearchParams(location.search);
const initialSheet = query.get("list");
const legacySheet=location.hash.slice(1);
if(["tara","dalavy","lendor"].includes(legacySheet)) location.replace("listy.html#"+legacySheet);
else if(initialSheet==="lendor" || (query.get("predloha")==="1" && ["tara","dalavy"].includes(initialSheet))) location.replace("listy.html#"+initialSheet);
fit(Object.hasOwn(sheets,initialSheet) ? initialSheet : "tara");
const requested = query.get("misto");
const initialPlace = points.find(p=>p.id===state.id && p.name===(oldNames[state.id]?.[requested]||requested));
const coastSheet=query.get("breh");
const join=(window.SPOJE||[]).find(j=>String(j.id)===query.get("spoj"));
if(join){
  const point=query.get("poloha")==="puvodni"?join.old:(join.point||join.bank);
  const z=Number(query.get("z"));
  center("tara",...point,z>0&&z<=90000?z:32);draw();
}
else if(coastSheet==="tara" || Object.hasOwn(ATLAS.regions,coastSheet)){
  const area=ATLAS.regions[coastSheet],sheet=sheets[area?.sheet||coastSheet];
  const [x,y,z]=["x","y","z"].map(k=>query.has(k)?Number(query.get(k)):NaN);
  if(x>=0 && x<=sheet.w && y>=0 && y<=sheet.h && z>0 && z<=90000){
    const position=area?continentalPosition(area,x,y):[x,y];
    center("tara",...position,z);draw();
  }
}
else if(initialPlace)go(initialPlace);
else if(query.get("oblast") && Object.hasOwn(ATLAS.regions,query.get("oblast"))){
  const key=query.get("oblast");showArea(key);
  const name=query.get("objekt"),source=ATLAS.regions[key].sheet||key;
  const hit=onTara.find(p=>p.registration===key && p.name===(oldNames[source]?.[name]||name));
  if(hit)inspectOnTara(hit);
}
else if(!$("south").hidden && query.get("jih")==="1")$("south").click();
if(query.get("predloha")==="1" && initialSheet)mode("list");

if(query.get("styl")==="dalavsky" && styledSheets.has(state.id) && query.get("predloha")!=="1")mode("dalavsky");

if(query.get("styl")==="s" && styledSheets.has(state.id) && query.get("predloha")!=="1")mode("s");

if(query.get("styl")==="d" && styledSheets.has(state.id) && query.get("predloha")!=="1")mode("d");
