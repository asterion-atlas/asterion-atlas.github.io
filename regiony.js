"use strict";
const areaRegistry = Object.entries(ATLAS.regions || {});
const isInside = (x,y,poly) => {
  if (!poly.length) return true;
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [ax,ay]=poly[i], [bx,by]=poly[j];
    if((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
  }
  return inside;
};
function areaBasis(area){
  if(area.basis)return area.basis;
  const angle=area.angle||0, c=Math.cos(angle),s=Math.sin(angle);
  return [c,s,-s,c];
}
function fromAreaAxes(area,x,y){
  const [a,b,c,d]=areaBasis(area), det=a*d-b*c;
  return [(d*x-c*y)/det,(a*y-b*x)/det];
}
function continentalPosition(area,x,y){
  const [k,ox,oy]=area.transform,[a,b,c,d]=areaBasis(area);
  return [ox+k*(a*x+c*y),oy+k*(b*x+d*y)];
}
function continentalPlaces(points){
  const result=[];
  const cape=points.find(p=>p.id==="sever" && p.name==="Nar Umur");
  const capeOnTara=cape && continentalPosition(ATLAS.regions.sever,cape.x,cape.y);
  for(const [key,area] of areaRegistry){
    const [k,ox,oy]=area.transform;
    for(const p of points){
      if(p.id!==(area.sheet||key) || (area.filter && !isInside(p.x,p.y,area.filter)) ||
         (["hvozdy","hlubiny"].includes(p.id) && !isInside(p.x,p.y,area.clip))) continue;
      // The adventure spells the same cape Nar Umut. Keep each source's
      // own marker on its sheet and use one surveyed position on Tara.
      const atCape=capeOnTara && (p.name==="Nar Umur" || (p.id==="kvetina" && p.name==="Nar Umut"));
      const [x,y]=atCape?capeOnTara:continentalPosition(area,p.x,p.y);
      if(!area.inset && (x<0||y< -65||x>=ATLAS.sheets.tara.w||y>=ATLAS.sheets.tara.h))continue;
      result.push({...p,x,y,name:atCape?cape.name:p.name,origin:p,min:Math.max(area.pointMinimum||0,area.variant?26:2,Math.min(Math.max(42,area.minimum),p.min*.60/k)),registration:key});
    }
  }
  return result;
}
const mapName=name=>name.toLocaleLowerCase("cs").replace(/\s*\((výřez [a-d]|přehled)\)$/u,"").replace(/^nar umut$/u,"nar umur");
function groupPlaces(places){
  const buckets=new Map(),representative=new Map();
  for(const p of [...places].sort((a,b)=>{
    const ra=ATLAS.regions[a.registration],rb=ATLAS.regions[b.registration];
    return Number(!!ra.variant)-Number(!!rb.variant) || ra.transform[0]-rb.transform[0];
  })){
    const key=mapName(p.name),bucket=buckets.get(key)||[];
    const same=bucket.find(q=>q.id!==p.id && Math.hypot(q.x-p.x,q.y-p.y)<12);
    if(same)representative.set(p,same);
    else{bucket.push(p);buckets.set(key,bucket);representative.set(p,p);}
  }
  return representative;
}
function shorelineMasks(svg){
  const joins=visibleJoins();
  const masks=new Map();
  function maskOldBank(name){
    const applicable=joins.filter(j=>joinNames[j.id].includes(name));
    if(!applicable.length)return null;
    const key=applicable.map(j=>j.id).join("-");
    if(masks.has(key))return masks.get(key);
    const id="stary-breh-"+key;
    const mask=svgElement("mask",{id,maskUnits:"userSpaceOnUse",x:0,y:0,width:map.clientWidth,height:map.clientHeight});
    mask.append(svgElement("rect",{width:map.clientWidth,height:map.clientHeight,fill:"white"}));
    for(const j of applicable){
      const [x,y]=project(j);
      mask.append(svgElement("path",{d:j.core,fill:"black","fill-rule":"evenodd",transform:"translate("+x+" "+y+") scale("+state.scale/j.d+")"}));
    }
    const defs=svgElement("defs");defs.append(mask);svg.append(defs);masks.set(key,id);return id;
  }
  return maskOldBank;
}
function drawContinentalCourses(svg,maskOldBank){
  for(const [key,area] of areaRegistry){
    const id=area.sheet||key,sheet=ATLAS.sheets[id];
    if(!sheet.paths1340?.length || (area.variant && $("area").value!==key && !area.variantPaths) || (state.scale<area.minimum && $("area").value!==key))continue;
    for(const shape of sheet.paths1340){
      const q=placesByArea.get(key)?.get(shape.name);
      if(!q)continue;
      const finer=representatives.get(q);
      if(q.type==="ostrov" && finer && finer!==q && Math.hypot(q.x-finer.x,q.y-finer.y)<1e-5){
        const detail=ATLAS.regions[finer.registration];
        if(detail.parent===key && (state.scale>=detail.minimum || $("area").value===finer.registration)
           && sheets[finer.id].paths1340?.some(s=>s.name===q.name && s.type===shape.type))continue;
      }
      const pts=shape.points.map(([x,y])=>{
        const [wx,wy]=continentalPosition(area,x*sheet.w/1340,y*sheet.w/1340);
        return project({x:wx,y:wy});
      });
      if(!pts.length||pts.every(p=>p[0]<0)||pts.every(p=>p[1]<0)||pts.every(p=>p[0]>map.clientWidth)||pts.every(p=>p[1]>map.clientHeight))continue;
      const polygon=["obrys","plocha"].includes(shape.type);
      const path=document.createElementNS(svg.namespaceURI,polygon?"polygon":"polyline");
      path.setAttribute("points",pts.map(p=>p.join(",")).join(" "));
      path.classList.add("course","zemepis",shape.type,q.type);
      const oldBank=maskOldBank(q.name);
      if(oldBank)path.setAttribute("mask","url(#"+oldBank+")");
      path.dataset.sheet=id;path.dataset.name=q.name;
      if(state.selected===q)path.classList.add("active");
      const title=document.createElementNS(svg.namespaceURI,"title");title.textContent=q.name;path.append(title);
      path.onclick=()=>inspectOnTara(q,false);svg.append(path);
    }
  }
}
function reliefVectors(id,key,sheet){
  const data=window.TVARY?.[id];if(!data)return null;
  const ns="http://www.w3.org/2000/svg";
  const tag=(name,attrs)=>{const node=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);return node;};
  const svg=tag("svg",{viewBox:"0 0 "+sheet.w+" "+sheet.h,preserveAspectRatio:"none","aria-hidden":"true"});
  const colors={ostrov:"#e9dcb6",vodstvo:"#8ab1b8",les:"#bdc9a3",vrch:"#cec29d",led:"#cbd6c9",planina:"#d2c4a3"};
  const defs=tag("defs",{}),forest=tag("pattern",{id:"les-"+key,width:9,height:9,patternUnits:"userSpaceOnUse"});
  forest.append(tag("rect",{width:9,height:9,fill:colors.les}),tag("circle",{cx:2.3,cy:3,r:1.8,fill:"#adbc94"}),tag("circle",{cx:6.4,cy:7,r:1.3,fill:"#b3c299"}));defs.append(forest);svg.append(defs);
  for(const [kind,rings] of data.areas){
    const d=rings.map(r=>"M"+r.map(p=>p.join(",")).join("L")+"Z").join("");
    svg.append(tag("path",{d,fill:kind==="les"?"url(#les-"+key+")":colors[kind],"fill-rule":"evenodd"}));
  }
  function rocks(points,r,color){
    const left=[],right=[];
    for(const [x,y] of points){
      left.push("M"+(x-r)+","+(y+r*.52)+"l"+(r*1.2)+","+(-r*1.43)+" "+(r*.8)+","+(r*1.48)+"Z");
      right.push("M"+(x+r*.2)+","+(y-r*.91)+"l"+(r*.8)+","+(r*1.48)+" "+(-r*.79)+","+(-r*.24)+"Z");
    }
    svg.append(tag("path",{d:left.join(""),fill:color}),tag("path",{d:right.join(""),fill:color==="#7f8c80"?"#a0aaa0":"#d6c9a6"}));
  }
  rocks(data.peaks,6,"#b4ac90");rocks(data.reefs,2,"#7f8c80");
  return svg;
}
function styledImage(group,id,box,pixelsPerUnit){
  const variant=["s","d"].includes(state.mode) && id==="dalavy"?state.mode:null;
  if(variant!=="s")group.querySelector("[data-s-map]")?.remove();
  if(variant!=="d")group.querySelector("[data-d-map]")?.remove();
  if(variant){group.querySelector("img[data-styled]")?.remove();(variant==="s"?schleyTiles:wielinkTiles)(group,id,box);return;}
  let image=group.querySelector("img[data-styled]");
  if(!image){image=new Image();image.alt="";image.draggable=false;group.append(image);}
  const src="dalavsky/"+id+".svg?v=20261111k";
  if(image.getAttribute("src")!==src){image.dataset.styled=id;image.src=src;}
  Object.assign(image.style,box);
}
function physicalImage(group,id,kind,box){
  let im=group.querySelector('img[data-geography="'+kind+'"]');
  if(!window.TERENY?.[id]?.[kind] || !box){im?.remove();return;}
  if(!im){im=new Image();im.alt="";im.draggable=false;im.dataset.geography=kind;}
  const src="tereny/"+id+"-"+kind+".svg";
  if(im.getAttribute("src")!==src)im.src=src;
  Object.assign(im.style,box);
  group.append(im);
}
const joinNames={
  "soutoky-sever":["Slepá řeka","Sloní řeka","Dravý potok"],
  "ellion":["Ellion"],
  "tiche-vody":["Tiché vody","Bulzugův ostrov","Ostrov ústřic"],
  "nomilad":["Vnitřní moře","Nomiladův záliv","Zlatá laguna","Zahrazené ostrovy","Poloostrov Ostroh","Krutung"]
};
function svgElement(tag,attrs={}){
  const element=document.createElementNS("http://www.w3.org/2000/svg",tag);
  for(const [key,value] of Object.entries(attrs))element.setAttribute(key,value);
  return element;
}
function visibleJoins(){
  if(state.id!=="tara"||!isRedraw()||state.scale<1)return [];
  const [left,top]=unproject(0,0),[right,bottom]=unproject(map.clientWidth,map.clientHeight);
  return (window.NAVAZNOSTI||[]).filter(j=>j.x<right&&j.y<bottom&&j.x+j.w/j.d>left&&j.y+j.h/j.d>top);
}
function drawJoins(container){
  const visible=visibleJoins();
  for(const el of container.querySelectorAll("[data-join]"))if(!visible.some(j=>j.id===el.dataset.join))el.remove();
  for(const j of visible){
    let svg=container.querySelector('[data-join="'+j.id+'"]');
    const styled=isStyled();
    if(svg && svg.dataset.styled!==String(styled)){svg.remove();svg=null;}
    if(!svg){
      svg=svgElement("svg",{"aria-hidden":"true",preserveAspectRatio:"none"});
      svg.dataset.styled=String(styled);svg.dataset.join=j.id;Object.assign(svg.style,{position:"absolute",inset:"0",width:"100%",height:"100%",pointerEvents:"none",zIndex:95});
      const defs=svgElement("defs"),mask=svgElement("mask",{id:"spoj-"+j.id,maskUnits:"userSpaceOnUse",x:0,y:0,width:j.w,height:j.h});
      mask.append(svgElement("image",{href:j.mask,width:j.w,height:j.h,preserveAspectRatio:"none"}));
      defs.append(mask,svgElement("path",{d:j.core,"fill-rule":"evenodd",class:"shore-core"}));svg.append(defs);
      const group=svgElement("g",{mask:"url(#spoj-"+j.id+")"});
      const waterColor=styled?"#99bbc0":j.color;
      group.append(svgElement("image",{href:styled?"dalavsky/spoj-"+j.id+".svg":"tereny/"+j.id+"-zem.webp",width:j.w,height:j.h}),
                   svgElement("path",{d:j.water,fill:waterColor,"fill-rule":"evenodd"}));
      for(const shape of j.detail||[]){
        const colors={voda:waterColor,ostrov:"#e9dcb6","plošina":"#d9c49e",most:"#977751"};
        const path=svgElement("path",{d:shape.path,fill:colors[shape.kind]});
        path.dataset.source=shape.source;path.dataset.kind=shape.kind;
        if(shape.name)path.dataset.name=shape.name;
        group.append(path);
      }
      svg.append(group);container.append(svg);
    }
    const [left,top]=unproject(0,0),scale=j.d/state.scale;
    const choice=container.querySelector('[data-area="'+$("area").value+'"]');
    const chart=choice&&ATLAS.regions[choice.dataset.area];
    svg.style.zIndex=styled && container.querySelector('[data-area="dalavy"]')?89:chart&&!chart.variant&&chart.transform[0]>=.012?Math.max(95,Number(choice.style.zIndex)+1):95;
    if(styled){
      const ground=svg.querySelector("g > image");
      ground.setAttribute("href","dalavsky/spoj-"+j.id+".svg?v=20261111k");
    }
    svg.setAttribute("viewBox",[(left-j.x)*j.d,(top-j.y)*j.d,map.clientWidth*scale,map.clientHeight*scale].join(" "));
  }
}
function shoreUnderCenter(container,areaKey){
  const area=areaKey&&container.querySelector('[data-area="'+areaKey+'"]');
  for(const j of visibleJoins()){
    const layer=container.querySelector('[data-join="'+j.id+'"]');
    if(!layer||(area&&Number(area.style.zIndex)>Number(layer.style.zIndex)))continue;
    const p=new DOMPoint((state.x-j.x)*j.d,(state.y-j.y)*j.d);
    if(layer.querySelector(".shore-core").isPointInFill(p)){
      const candidates=window.SPOJE.filter(s=>s.patch===j.id);
      const distance=s=>{const [x,y]=s.point||s.bank;return Math.hypot(x-state.x,y-state.y);};
      return candidates.sort((a,b)=>distance(a)-distance(b))[0];
    }
  }
  return null;
}
function regionalTiles(state,container,map,project){
  const needed=new Set();
  if(state.id==="tara" && isRedraw()) for(const [key,area] of areaRegistry){
    const chosen=document.getElementById("area").value===key;
    const id=area.sheet||key,sheet=ATLAS.sheets[id];
    const coastOnly=!chosen && state.scale<area.minimum;
    if(!area.overlay || (!chosen && area.variant) || coastOnly || !area.clip.length) continue;
    const layer=area.linework?"list":id==="dalavy"?"atlas":"sketch", levels=sheet.levels[layer];
    const styled=isStyled();
    if(styled?!styledSheets.has(id):!levels)continue;
    const [k,ox,oy]=area.transform, scale=state.scale*k;
    const [x,y]=project({x:ox,y:oy});
    const basis=areaBasis(area);
    const corners=area.clip.map(([a,b])=>project({x:ox+k*(a*basis[0]+b*basis[2]),y:oy+k*(a*basis[1]+b*basis[3])}));
    if(corners.every(p=>p[0]<0)||corners.every(p=>p[1]<0)||corners.every(p=>p[0]>map.clientWidth)||corners.every(p=>p[1]>map.clientHeight))continue;
    needed.add(key);
    let group=container.querySelector('[data-area="'+key+'"]');
    if(group && group.dataset.styled!==(styled?state.mode:"false")){group.remove();group=null;}
    if(!group){group=document.createElement("div");group.dataset.styled=styled?state.mode:"false";group.dataset.area=key;container.append(group);}
    const sw=sheet.w*scale,sh=sheet.h*scale;
    Object.assign(group.style,{left:x+"px",top:y+"px",width:sw+"px",height:sh+"px",
      clipPath:"polygon("+((styled && window.DALAVSKE_CLIPS?.[key]) || area.clip).map(([a,b])=>(100*a/sheet.w)+"% "+(100*b/sheet.h)+"%").join(",")+")",
      transformOrigin:"0 0",transform:"matrix("+basis.join(",")+",0,0)",
      // Stíny jihu surveys these rivers and woods more fully than the
      // western margin of Štítové hory, whose scale rounds to the same priority.
      zIndex:(styled && id==="dalavy"?90:Math.round(-Math.log(k)*10)+40+(styled && id==="stiny"?1:0))+(chosen && state.scale<Math.max(area.minimum*2.4,3/k)?100:0),
      maskImage:styled && id==="dalavy"?"none":window.OKRAJE?.[key]?'url("'+OKRAJE[key]+'")':"none",maskSize:"100% 100%",
      opacity:String(chosen?1:Math.min(1,.6+.4*(state.scale/area.minimum-1)))});
    const physicalBox={left:"0",top:"0",width:"100%",height:"100%"};
    if(styled){styledImage(group,id,physicalBox,scale);continue;}
    let z=levels.findIndex(([width])=>width>=sw*(window.devicePixelRatio||1));
    if(z<0)z=levels.length-1;
    const [width,height]=levels[z],sx=sw/width,sy=sh/height,tile=ATLAS.tile;
    const used=new Set();
    const thematic=!chosen && id==="hvozdy";
    const local=[[0,0],[map.clientWidth,0],[0,map.clientHeight],[map.clientWidth,map.clientHeight]]
      .map(([px,py])=>fromAreaAxes(area,px-x,py-y));
    const minX=Math.max(0,Math.floor(Math.min(...local.map(p=>p[0]))/(tile*sx))),minY=Math.max(0,Math.floor(Math.min(...local.map(p=>p[1]))/(tile*sy)));
    const maxX=Math.min(Math.ceil(width/tile),Math.ceil(Math.max(...local.map(p=>p[0]))/(tile*sx)));
    const maxY=Math.min(Math.ceil(height/tile),Math.ceil(Math.max(...local.map(p=>p[1]))/(tile*sy)));
    for(let j=minY;!thematic&&j<maxY;j++)for(let i=minX;i<maxX;i++){
      const url="tiles/"+id+"/"+layer+"/"+z+"/"+i+"-"+j+".webp";used.add(url);
      let im=group.querySelector('[data-src="'+url+'"]');
      if(!im){im=new Image();im.alt="";im.draggable=false;im.dataset.src=url;im.src=url;
        if(area.linework)im.style.filter=["plan-erin","erin-dvoji"].includes(id)?"url(#erinske-tahy)":"url(#kresba-planu)";
        group.append(im);}
      const left=Math.round(i*tile*sx),top=Math.round(j*tile*sy);
      Object.assign(im.style,{left:left+"px",top:top+"px",width:(Math.round(Math.min(width,(i+1)*tile)*sx)-left)+"px",height:(Math.round(Math.min(height,(j+1)*tile)*sy)-top)+"px"});
    }
    for(const im of group.querySelectorAll("img[data-src]"))if(!used.has(im.dataset.src))im.remove();
    let relief=group.querySelector("svg");
    if(scale>2 && !relief){relief=reliefVectors(id,key,sheet);if(relief)group.append(relief);}
    if(relief){relief.style.display=scale>2?"block":"none";if(relief!==group.lastElementChild)group.append(relief);}
    physicalImage(group,id,"breh",physicalBox);
    // Erin's islands already share the lagoon vector layer at every scale.
    // The registered city plan supplies bridges, walls and print at close zoom.
    physicalImage(group,id,"teren",["plan-erin","erin-dvoji"].includes(id)?null:physicalBox);
    if(id==="plan-erin"){
      // Cover lettering on the older sheet where the later district was built.
      let addition=group.querySelector("img[data-extension]");
      if(!addition){addition=new Image();addition.alt="";addition.dataset.extension="";addition.src="tereny/erin-dvoji-stavby.svg";}
      Object.assign(addition.style,physicalBox);group.append(addition);
    }
    const strokeStart=Math.min(1.6,.36*sheet.native[0]/sheet.w);
    if(!thematic && !area.linework && !sheet.detailOnly && !sheet.planOf && sheet.levels.list && scale>strokeStart && id!=="dalavy"){
      const inkMax=window.TERENY?.[id]?.teren ? .33 : .91;
      drawSourceStrokes(group,id,sheet,sw,sh,local,tile,Math.min(inkMax,(scale/strokeStart-1)*.55));
    }else for(const im of group.querySelectorAll("[data-ink]"))im.remove();
  }
  for(const group of container.querySelectorAll("[data-area]"))if(!needed.has(group.dataset.area))group.remove();
  drawJoins(container);
}

// Drobné kreslené značky a nepojmenovaná ramena řek patří do stejné mapy.
// Z jejich původní polohy přeneseme jen tahy, přes spojité plochy překresu.
function drawSourceStrokes(group,id,sheet,sw,sh,local,tile,opacity){
  const levels=sheet.levels.list;
  let z=levels.findIndex(([w])=>w>=sw*(window.devicePixelRatio||1));
  if(z<0)z=levels.length-1;
  const [w,h]=levels[z],sx=sw/w,sy=sh/h;
  const x0=Math.max(0,Math.floor(Math.min(...local.map(p=>p[0]))/(tile*sx)));
  const y0=Math.max(0,Math.floor(Math.min(...local.map(p=>p[1]))/(tile*sy)));
  const x1=Math.min(Math.ceil(w/tile),Math.ceil(Math.max(...local.map(p=>p[0]))/(tile*sx)));
  const y1=Math.min(Math.ceil(h/tile),Math.ceil(Math.max(...local.map(p=>p[1]))/(tile*sy)));
  const visible=new Set();
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const url="tiles/"+id+"/list/"+z+"/"+x+"-"+y+".webp";
    visible.add(url);let im=group.querySelector('img[data-ink="'+url+'"]');
    if(!im){im=new Image();im.alt="";im.draggable=false;im.dataset.ink=url;im.src=url;}
    group.append(im);im.style.filter="url(#kresba-predlohy)";
    const left=Math.round(x*tile*sx),top=Math.round(y*tile*sy);
    Object.assign(im.style,{opacity:String(opacity),left:left+"px",top:top+"px",
      width:(Math.round(Math.min(w,(x+1)*tile)*sx)-left)+"px",
      height:(Math.round(Math.min(h,(y+1)*tile)*sy)-top)+"px"});
  }
  for(const im of group.querySelectorAll("[data-ink]"))if(!visible.has(im.dataset.ink))im.remove();
}
