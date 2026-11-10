"use strict";

// NaS, kapitola B: čtyři ostrovy, příslušnost věží a přístaviště mezi ostrovy.
// Veškerá geometrie je redakční hypotéza v místních jednotkách.
const slunecniOstrovy = (() => {
  const name = "Ostrovy zářícího slunce";
  const anchor = {x:38, y:48};
  const unit = .014;
  const islands = [
    {name:"Smaragdové oko", x:-77, y:-43,
      shore:"-67,-4 -56,-24 -32,-33 -16,-43 7,-39 27,-23 39,-19 53,-4 51,11 33,22 17,18 0,25 -20,34 -45,27 -56,13",
      towers:[["orla",-35,-13],["vlka",1,-23],["štiky",21,8]]},
    {name:"Ostrov kolibříků", x:69, y:-51,
      shore:"-46,-8 -42,-25 -21,-32 -8,-27 11,-35 35,-29 54,-12 60,0 47,8 33,7 21,21 -2,31 -18,26 -26,13 -40,10",
      towers:[["rorýsa",-26,-8],["lasičky",5,8],["delfína",29,-14]]},
    {name:"Zelené nebe", x:-59, y:57,
      shore:"-57,-6 -47,-23 -26,-32 -7,-27 11,-33 28,-21 25,-9 43,2 56,15 45,27 23,30 4,24 -16,27 -24,19 -44,17",
      towers:[["laně",-31,-8],["rajky",2,-14],["lososa",23,13]]},
    {name:"Ostrov jasného svitu", x:69, y:43,
      shore:"-43,-8 -27,-25 -10,-23 7,-32 29,-27 34,-14 50,-5 48,9 33,22 19,24 10,40 -5,43 -17,25 -31,17 -40,5",
      towers:[["lva",-19,1],["sokola",13,-14],["žraloka",14,20]]}
  ];
  const records = [];
  function place(title,type,x,y,min,note) {
    records.push({id:"tara",name:title,type,x:anchor.x+x*unit,y:anchor.y+y*unit,min,note,hypothesis:true});
  }
  place(name,"ostrov",0,-108,.55,"Čtyři ostrovy světlonošů v oceánu západně od Vnitřního moře.");
  for (const island of islands) {
    place(island.name,"ostrov",island.x,island.y,24,"Ostrov pokrývá tropický les. Stojí zde věže "+island.towers.map(t=>t[0]).join(", ")+".");
    for (const [animal,x,y] of island.towers)
      place("Věž "+animal,"budova",island.x+x,island.y+y,130,"Příslušnost věže k ostrovu „"+island.name+"“ dokládá modul.");
  }
  place("Přístaviště světlonošů","mistni",0,0,46,"Přístaviště ze dřeva careanu stojí v mělké vodě mezi čtyřmi ostrovy.");

  function coastline(coords) {
    const pts=coords.split(" ").map(pair=>pair.split(",").map(Number));
    const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2].join(" ");
    return "M"+mid(pts.at(-1),pts[0])+pts.map((p,i)=>
      " Q"+p.join(" ")+" "+mid(p,pts[(i+1)%pts.length])).join("")+" Z";
  }
  function draw(svg) {
    const [cx,cy]=project(anchor), k=unit*state.scale;
    if (cx+155*k<0 || cy+110*k<0 || cx-155*k>map.clientWidth || cy-110*k>map.clientHeight) return;
    const group=svgElement("g",{"data-souostrovi":"slunce",transform:`translate(${cx} ${cy}) scale(${k})`});
    svg.append(group);
    const defs=svgElement("defs");
    const water=svgElement("radialGradient",{id:"slunce-melcina"});
    water.append(svgElement("stop",{offset:".32","stop-color":"#bcdbcd"}),
      svgElement("stop",{offset:"1","stop-color":"#bcdbcd","stop-opacity":0}));
    const woods=svgElement("pattern",{id:"slunce-les",width:19,height:16,patternUnits:"userSpaceOnUse",
      patternTransform:"scale("+Math.min(1,1.6/k)+")"});
    woods.append(svgElement("rect",{width:19,height:16,fill:"#bdc9a3"}));
    for (const [cx,cy,r,color] of [[2,2,1.7,"#adbc94"],[8,5,2,"#b1c098"],[15,1,1.3,"#a7b98f"],
      [4,11,2.1,"#abbc92"],[13,12,1.9,"#a6b78c"],[18,8,1.2,"#c7d0ae"]])
      woods.append(svgElement("ellipse",{cx,cy,rx:r,ry:.8*r,fill:color}));
    defs.append(water,woods);
    group.append(defs,svgElement("ellipse",{cx:0,cy:0,rx:125,ry:89,fill:"url(#slunce-melcina)"}));
    for (const island of islands) {
      const land=svgElement("g",{transform:`translate(${island.x} ${island.y})`});
      group.append(land);
      const d=coastline(island.shore);
      land.append(svgElement("path",{d,"data-island":island.name,fill:"#cbd2ab",stroke:"#788f81","stroke-width":1,"vector-effect":"non-scaling-stroke"}));
      land.append(svgElement("path",{d,transform:"scale(.94 .89)",fill:"url(#slunce-les)"}));
      if (state.scale>=100) {
        for (const [,x,y] of island.towers)
          land.append(svgElement("path",{"data-tower":true,d:"M-1.9 1.7 L-1 -2.2 1 -2.2 1.9 1.7 Z",transform:`translate(${x} ${y})`,fill:"#faf5df",stroke:"#6c6856","stroke-width":.55}));
      }
    }
    if (state.scale>=40)
      group.append(svgElement("path",{d:"M-3 0H3 M-2 -1.7V1.7 M0 -1.7V1.7 M2 -1.7V1.7",fill:"none",stroke:"#856942","stroke-width":.65}));
  }
  function overviewZoom() {
    return Math.min(map.clientWidth/(350*unit),map.clientHeight/(275*unit));
  }
  return {name,anchor,records,draw,overviewZoom};
})();
