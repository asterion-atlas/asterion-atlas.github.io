"use strict";
const temata = (() => {
  const pdfURL="https://asterionrpg.cz/tl_files/clanky/Doplnky%20a%20dalsi%20materialy/mesta.pdf";
  const normalized=s=>s.toLocaleLowerCase("cs").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  const names=new Map(TEMATA.towns.map(row=>[normalized(row.name),row]));
  const format=new Intl.NumberFormat("cs-CZ");
  const common=[
    ["Plavena",523,104],["Asari Kasim",515,133],["Bergond",537,168],["Temní elfové",448,193],["Húragova gobliní říše",155,266],["Údolí drahokamů",180,309],["Temní elfové",246,318],["Oyarzin",552,326],["Dračí království",360,397],["Mahaprhramvašta",446,388],["Hanšajar",416,451],["Kharovy državy",544,469],["Lesní království",699,336],["Ostrovní království",759,385],["Medvědí lid",686,428],["Říše slepých bohů",346,571],["Umrlčí království",541,574],["Tarosská doména",485,305],["Tartarovo gobliní dominium",180,157],["Čakenkerové",250,449],["Axara",343,454],["Andarové",570,511]
  ];
  const eras={
    850:[["Keledor (Jižní dálava)",429,70],["Storabsko (Severní dálava)",404,139],["Danérie (Západní dálava)",255,222],["Almendor (Východní dálava)",385,225],["Storabská Nová Okmirea",401,267],["Trpasličí říše",317,224],["Seliak",531,207],["Minkor",575,201],["Skřítčí provincie",452,257],["Horské císařství",517,236],["Xintšina říše",710,249],["Hevreni",407,332],["Plavena",699,169]],
    863:[["Řečpospolitá Erinská",402,72],["Rilondské království",250,224],["Říše starých trpaslíků",319,229],["Říše starých trpaslíků",533,207],["Tarské království",385,305],["Zlaté císařství",475,250],["Rašal Naf",344,365],["Nové Umrlčí království",304,451],["Plavena",700,171]]
  };
  const aliases={"bratkovice":"Bratkowice","jižní erin":"Jižní Erina","kirdin":"Kirden"};
  // Map spellings are tied to a sheet to keep homonymous places distinct.
  const locations=[
    {town:"Bialaweža / Temnja",targets:[["hlubiny","Bílá weža"],["hlubiny","Temnja"]],sheets:["hlubiny","sever"],note:"Společný údaj pro pevnost Bialaweža a sousední osadu Temnja. Z hlubin zelené a modré, historie a kolonie Jižní dálavy."},
    {town:"Brakarig",targets:[["hlubiny","Pevnost Brakarig"]],sheets:["hlubiny"],note:"Z hlubin zelené a modré, Severní dálava. Pevnost Alrika en Forgon v Západních statcích."},
    {town:"Jinuka",targets:[["hlubiny","Jinuki"]],sheets:["hlubiny","sever"],note:"Z hlubin zelené a modré, kolonie Jižní dálavy. Jinuka u posledního přítoku Rugowy, v přepisu mapy Jinuki."},
    {town:"Obrukowo",targets:[["hlubiny","Obrukovo"]],sheets:["hlubiny","sever"],note:"Z hlubin zelené a modré, kolonie Jižní dálavy. Obrukovo v deltě Itancy."},
    {town:"Osirean nam\u0060bata",targets:[["severozapad","Oširean Nam Bata"]],sheets:["severozapad","severozapad-slepa"],note:"Písky proroctví, Pouštní město Osirean Nam’bata. Poloha na mapě Severozápadní Tary."},
    {town:"Pevnost Zlom. vazů",targets:[["hlubiny","Pevnost Zlomených vazů"]],sheets:["hlubiny","sever"],note:"Z hlubin zelené a modré, kolonie Jižní dálavy. Pevnost v deltě Mármáry."},
    {town:"Skalní město (Nuenga nam\u0060bata)",targets:[["severozapad","Skalní město"]],sheets:["severozapad"],note:"Písky proroctví, Nuenga Nam’bata (Skalní město). Poloha podle kruhového skaliska na mapě Severozápadní Tary."},
    {town:"Tession",targets:[["dalavy","Tessin"]],sheets:["dalavy","stare-dalavy"],note:"Tessin na mapě Nových Dálav a v Času temna, oddíl N.12.1. Přehled Města uvádí Tession, sídlo hyassa."},
    {town:"Velký trh",targets:[["stiny","Velký trh"]],sheets:["stiny","severozapad"],note:"Písky proroctví, Tři Zuby. Vesnice u přívozu přes Duren. Bod podle podrobnější mapy Stínů jihu."},
    {town:"Zolty kriš",targets:[["hlubiny","Zolty krizz"]],sheets:["hlubiny","sever"],note:"Z hlubin zelené a modré, kolonie Jižní dálavy. Sídlo na Draze reke, v přepisu mapy Zolty krizz."}
  ];
  const locationByTown=new Map(locations.map(item=>[normalized(item.town),item]));
  const locationByMapName=new Map(locations.flatMap(item=>item.targets.map(([,name])=>[normalized(name),item])));
  const choose=name=>{
    const mapped=locationByMapName.get(normalized(name));
    return names.get(normalized(mapped?.town||aliases[name.toLocaleLowerCase("cs")]||aliases[normalized(name)]||name));
  };
  const link=(title,url)=>{const a=document.createElement("a");a.textContent=title;a.href=url;a.target="_blank";a.rel="noopener";return a;};
  const add=(parent,tag,value)=>{const el=document.createElement(tag);el.textContent=value;parent.append(el);return el;};
  const select=document.getElementById("politicky-rok");
  const img=new Image();img.id="politicke-uzemi";img.alt="";img.draggable=false;
  const labels=document.createElement("div");labels.id="politicke-nazvy";
  document.getElementById("courses").before(img,labels);
  const note=document.getElementById("politicky-pramen");
  let current="";
  function position(x,y,layer){
    const [k,dx,dy]=layer.transform,c=Math.cos(layer.angle),s=Math.sin(layer.angle);
    return {x:dx+k*layer.ratio*(x*c-y*s),y:dy+k*layer.ratio*(x*s+y*c)};
  }
  function render(){
    const year=select.value,layer=TEMATA.politics[year];
    img.hidden=labels.hidden=note.hidden=!(layer && state.id==="tara" && isRedraw());
    if(img.hidden)return;
    if(current!==year){
      current=year;img.src="politicka-"+year+".webp";
      note.replaceChildren(link("Politická mapa "+year+" k. l. · Jan „Čenis“ Galeta",layer.source));
      add(note,"small","Hranice jsou orientační a končí na okraji listu. "+(year==="863"?"List vynechává probíhající konflikty a okupace.":""));
    }
    const [l,t,r,b]=layer.box,[x,y]=project(position(l,t,layer)),k=state.scale*layer.transform[0]*layer.ratio;
    Object.assign(img.style,{width:(r-l)*k+"px",height:(b-t)*k+"px",transform:"translate("+x+"px,"+y+"px) rotate("+layer.angle+"rad)"});
    labels.replaceChildren();
    const occupied=[];
    for(const [name,u,v] of [...eras[year],...common]){
      const [sx,sy]=project(position(u*1490/1080,1190+v*1490/1080,layer));
      if(sx<0||sy<0||sx>map.clientWidth||sy>map.clientHeight)continue;
      const width=name.length*7+12;
      if(occupied.some(([a,b,w])=>Math.abs(sy-b)<21 && Math.abs(sx-a)<(width+w)/2))continue;
      occupied.push([sx,sy,width]);
      const el=add(labels,"span",name);el.style.left=sx+"px";el.style.top=sy+"px";
    }
  }
  select.onchange=()=>{if(select.value && (state.id!=="tara"||!isRedraw())){returnToRedraw();fit("tara");}draw();};
  function matches(p,row){
    if(!p||!row||!["sidlo","mesto"].includes(p.type)||choose(p.name)!==row)return false;
    const location=locationByTown.get(normalized(row.name));
    if(location)return location.sheets.includes(p.id) && location.targets.some(([,name])=>normalized(name)===normalized(p.name));
    if(normalized(row.name)==="kolmar")return ["sever","hlubiny"].includes(p.id);
    if(normalized(row.name)==="vrchov" && !["sever","hlubiny"].includes(p.id))return false;
    return true;
  }
  function table(row,parent){
    const location=locationByTown.get(normalized(row.name));
    if(location)add(parent,"p",location.note);
    const tbl=document.createElement("table");parent.append(tbl);
    const head=tbl.createTHead().insertRow();["Rok k. l.","Přibližný počet obyvatel","Pramen"].forEach(s=>add(head,"th",s));
    const body=tbl.createTBody();
    function line(year,value,title){const tr=body.insertRow();tr.insertCell().textContent=year;tr.insertCell().textContent=value==null?"neuvedeno":format.format(value);tr.insertCell().textContent=title;}
    if(row.pdf)row.pdf.forEach((n,i)=>line([845,851][i],n,row.confirmed?"Města · shoda s tabulkou":"Města"));
    for(const [y,n] of Object.entries(row.xls||{})){
      if(row.pdf && [845,851].includes(+y) && row.pdf[+y===845?0:1]===n)continue;
      line(y,n,(row.calculated.includes(+y)?"výpočet":"pracovní odhad")+" · List1, ř. "+row.row);
    }
  }
  function detail(p){
    const parent=document.getElementById("demograficky-detail");parent.replaceChildren();
    const row=choose(p.name);if(!matches(p,row))return;
    add(parent,"b","Obyvatelstvo");table(row,parent);
  }
  const dialog=document.getElementById("obyvatelstvo"),search=document.getElementById("hledat-sidlo");
  const body=document.getElementById("demograficky-seznam");
  function list(){
    body.replaceChildren();
    for(const row of [...TEMATA.towns].sort((a,b)=>a.name.localeCompare(b.name,"cs"))){
      const location=locationByTown.get(normalized(row.name));
      const searchable=[row.name,...(location?.targets.map(([,name])=>name)||[])];
      if(!searchable.some(name=>normalized(name).includes(normalized(search.value))))continue;
      const wrap=document.createElement("details");body.append(wrap);add(wrap,"summary",row.name);
      wrap.ontoggle=()=>{
        if(!wrap.open || wrap.querySelector("table"))return;
        table(row,wrap);
        const candidates=onTara.filter(p=>!ATLAS.regions[p.registration].inset && matches(p,row));
        const places=location
          ? location.targets.map(([id,name])=>candidates.find(p=>p.id===id && p.name===name))
          : [candidates[0]];
        for(const place of places.filter(Boolean)){
          const label=places.length>1?"Ukázat na Taře · "+place.name:"Ukázat na Taře";
          const btn=add(wrap,"button",label);btn.onclick=()=>{dialog.close();inspectOnTara(place);};
        }
      };
    }
    if(!body.childElementCount)add(body,"p","Žádné odpovídající sídlo.");
  }
  const refs=document.getElementById("demograficke-prameny");refs.append(link("Města · počty obyvatel 845 a 851",pdfURL));
  if(TEMATA.workbook){refs.append(" · ",link("Pracovní tabulka na Disku",TEMATA.workbook));}
  search.oninput=list;document.getElementById("otevrit-demografii").onclick=()=>{list();dialog.showModal();search.focus();};
  document.getElementById("zavrit-demografii").onclick=()=>dialog.close();
  const year=new URLSearchParams(location.search).get("politika");
  if(Object.hasOwn(TEMATA.politics,year))select.value=year;
  function occupied(){
    return labels.hidden?[]:Array.from(labels.children,el=>el.getBoundingClientRect());
  }
  return {draw:render,detail,occupied};
})();
