/* Fixed source ownership; fine Erin tiles refine resolution, never geography. */
window.NORTH_SOURCES=['torgil','mistr-z','torgil-laborator','sarindar-rez','severovychod','stitove','bludne','bludne-koncept','yrakan','plan-sarindar-terasy','gorm-psd','gorm-prealfa','gorm-nacrt','hvozd-pracovni','hvozd-stvanice','hvozd-starsi','sever','hvozdy','hvozdy-b','hvozdy-c','hvozdy-d','hlubiny','hlubiny-kokos','hlubiny-koral','hlubiny-zhave','hlubiny-dalava','kokos','koral','zhave','kvetina','okoli-erinu','plan-erin','erin-dvoji-plan','taros','lvi'];
function northDetail(state,container,map,project){
 const enabled=state.id==='tara'&&isStyled(),used=new Set();
 if(enabled&&state.scale>14)for(const [order,c] of NORTH_FINE.entries()){
  // The sparse adventure sheet contributes surveyed objects to Tara.
  // Its paper/river buffer must never replace the continental jungle.
  if(c.area==='kvetina'&&window.CONTINUOUS_TARA)continue;
  const [k,ox,oy]=c.region.transform,b=areaBasis(c.region),[x0,y0,x1,y1]=c.box,sw=x1-x0,sh=y1-y0;
  const [left,top]=project({x:ox+k*(b[0]*x0+b[2]*y0),y:oy+k*(b[1]*x0+b[3]*y0)}),s=k*state.scale;
  const corners=[[0,0],[sw,0],[0,sh],[sw,sh]].map(([x,y])=>[left+s*(b[0]*x+b[2]*y),top+s*(b[1]*x+b[3]*y)]);
  if(corners.every(p=>p[0]<0)||corners.every(p=>p[1]<0)||corners.every(p=>p[0]>map.clientWidth)||corners.every(p=>p[1]>map.clientHeight))continue;
  used.add(c.area);let group=container.querySelector('[data-north-fine="'+c.area+'"]');
  if(group&&group.dataset.skin!==state.mode){group.remove();group=null;}
  if(!group){group=document.createElement('div');group.dataset.northFine=c.area;group.dataset.skin=state.mode;container.append(group);}
  Object.assign(group.style,{position:'absolute',left:left+'px',top:top+'px',width:sw*s+'px',height:sh*s+'px',transformOrigin:'0 0',transform:'matrix('+b.join(',')+',0,0)',zIndex:91+order,pointerEvents:'none'});
  let z=c.levels.findIndex(([w])=>w>=sw*s*Math.min(2,devicePixelRatio||1));if(z<0)z=c.levels.length-1;
  const [w,h]=c.levels[z],sx=sw*s/w,sy=sh*s/h,t=512,needed=new Set(),pending=[];
  const view=[[0,0],[map.clientWidth,0],[0,map.clientHeight],[map.clientWidth,map.clientHeight]].map(([x,y])=>fromAreaAxes(c.region,x-left,y-top));
  const minX=Math.max(0,Math.floor(Math.min(...view.map(p=>p[0]))/sx/t)),maxX=Math.min(Math.ceil(w/t),Math.ceil(Math.max(...view.map(p=>p[0]))/sx/t));
  const minY=Math.max(0,Math.floor(Math.min(...view.map(p=>p[1]))/sy/t)),maxY=Math.min(Math.ceil(h/t),Math.ceil(Math.max(...view.map(p=>p[1]))/sy/t));
  for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++){
   const key=z+'/'+x+'-'+y;needed.add(key);let im=group.querySelector('[data-north-tile="'+key+'"]');
   if(!im){im=new Image();im.alt='';im.draggable=false;im.dataset.northTile=key;im.src='sever/'+state.mode+'/'+c.area+'/'+key+'.webp?v=20261111u';group.append(im);}
   const px=Math.max(0,x*t-1),py=Math.max(0,y*t-1);Object.assign(im.style,{position:'absolute',maxWidth:'none',left:100*px/w+'%',top:100*py/h+'%',width:100*(Math.min(w,(x+1)*t+1)-px)/w+'%',height:100*(Math.min(h,(y+1)*t+1)-py)/h+'%'});
   if(!im.complete)pending.push(new Promise(r=>{im.addEventListener('load',r,{once:true});im.addEventListener('error',r,{once:true})}));
  }
  const gen=group.dataset.gen=String((+group.dataset.gen||0)+1);Promise.all(pending).then(()=>{if(group.dataset.gen===gen)for(const im of [...group.children])if(!needed.has(im.dataset.northTile))im.remove()});
 }
 for(const group of container.querySelectorAll('[data-north-fine]'))if(!used.has(group.dataset.northFine))group.remove();
 drawNorthRoutes(container);
}
function drawNorthRoutes(container){
 let svg=container.querySelector('[data-north-routes]');
 if(state.id!=='tara'||!isRedraw()||!document.getElementById('north-routes')?.checked){svg?.remove();return;}
 if(!svg){svg=svgElement('svg',{'data-north-routes':'true'});Object.assign(svg.style,{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:94,pointerEvents:'none'});container.append(svg);}
 svg.replaceChildren();
 for(const route of NORTH_ROUTES){
  const pts=route.points.map(([x,y])=>project({x,y}));if(pts.every(p=>p[0]<0)||pts.every(p=>p[1]<0)||pts.every(p=>p[0]>map.clientWidth)||pts.every(p=>p[1]>map.clientHeight))continue;
  const color={namorni:'#324d91',pobrezni:'#9c357a',karavanni:'#a6bf59',pozemni:'#a95d42'}[route.kind];
  const path=svgElement('polyline',{points:pts.map(p=>p.join(',')).join(' '),fill:'none',stroke:color,'stroke-width':route.kind==='pozemni'?1.4:2.8,'stroke-dasharray':route.kind==='pozemni'?'6 5':'1 8','stroke-linecap':'round','stroke-linejoin':'round','data-route':route.name,opacity:.82});
  const title=svgElement('title',{});title.textContent=route.name;path.append(title);svg.append(path);
 }
}
document.getElementById('north-routes')?.addEventListener('change',()=>draw());

function continuousSourceAtCenter(){
 if(state.id!=='tara'||!isStyled())return null;
 const order=['severovychod','stitove','yrakan','sever','hvozdy-d','hvozdy','hvozdy-c','hvozdy-b','zhave','koral','kokos','severozapad','stiny','horni','dalavy','kvetina','okoli-erinu','plan-erin','bludne','plan-sarindar-terasy'];
 for(const key of order.reverse()){
  const a=ATLAS.regions[key];if(!a)continue;const [k,ox,oy]=a.transform;
  const [x,y]=fromAreaAxes(a,(state.x-ox)/k,(state.y-oy)/k);
  if(isInside(x,y,window.DALAVSKE_CLIPS?.[key]||a.clip))return key;
 }
 return null;
}
