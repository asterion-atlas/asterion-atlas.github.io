'use strict';
const $=id=>document.getElementById(id), map=$('map'), canvas=$('canvas'), ctx=canvas.getContext('2d');
let data, land=[], southernEdge, width=1, height=1, queued=false, drag=null;
let camera={x:525,y:470,k:1};
const params=new URLSearchParams(location.search);
function pathFor(geometry){
  const path=new Path2D();
  const rings=geometry.type==='Polygon'?geometry.coordinates:[geometry.coordinates];
  for(const ring of rings){
    ring.forEach((point,i)=>i?path.lineTo(...point):path.moveTo(...point));
    if(geometry.type==='Polygon')path.closePath();
  }
  return path;
}
function schedule(){if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;draw();});}}
function draw(){
  const dpr=devicePixelRatio||1;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
  if(!data)return;
  if($('sea').checked){ctx.fillStyle='#e4eef0';ctx.fillRect(0,0,width,height);}
  ctx.save();ctx.translate(width/2,height/2);ctx.scale(camera.k,camera.k);ctx.translate(-camera.x,-camera.y);
  if($('sea').checked){
    // Sea is the complement of the very same approved land fill. Drawing each
    // polygon separately preserves overlaps and each polygon's original holes.
    if(!$('land').checked){
      ctx.save();ctx.globalCompositeOperation='destination-out';
      for(const f of land)ctx.fill(f.path,'evenodd');
      ctx.restore();
    }
  }
  if($('land').checked){
    ctx.fillStyle='#e6dfc9';ctx.strokeStyle='#7c91878c';ctx.lineWidth=.6/camera.k;
    for(const f of land){ctx.fill(f.path,'evenodd');ctx.stroke(f.path);}
    ctx.strokeStyle='#846f58';ctx.lineWidth=2/camera.k;ctx.setLineDash([6/camera.k,5/camera.k]);ctx.stroke(southernEdge);ctx.setLineDash([]);
  }
  ctx.restore();
  const visible=[$('land').checked&&'pevnina a ostrovy',$('sea').checked&&'moře'].filter(Boolean);
  $('status').textContent=visible.length?visible.join(' · '):'Vrstvy jsou vypnuté';
}
function resize(){
  width=map.clientWidth;height=map.clientHeight;
  canvas.width=Math.round(width*(devicePixelRatio||1));canvas.height=Math.round(height*(devicePixelRatio||1));schedule();
}
function share(){
  if(!data)return;
  const url=new URL(location.href);
  url.searchParams.set('x',camera.x.toFixed(4));url.searchParams.set('y',camera.y.toFixed(4));url.searchParams.set('zoom',camera.k.toFixed(4));
  url.searchParams.set('layers',['land','sea'].filter(id=>$(id).checked).join(','));
  history.replaceState(null,'',url);
}
function fit(){
  if(!data)return;
  const [x,y,w,h]=data.bounds;camera={x:x+w/2,y:y+h/2,k:Math.min((width-65)/w,(height-80)/h)};schedule();share();
}
function zoom(factor,x=width/2,y=height/2){
  const next=Math.min(35,Math.max(.2,camera.k*factor));
  camera.x+=(x-width/2)*(1/camera.k-1/next);camera.y+=(y-height/2)*(1/camera.k-1/next);camera.k=next;schedule();share();
}
map.addEventListener('wheel',event=>{
  event.preventDefault();const r=map.getBoundingClientRect();zoom(Math.exp(-event.deltaY*.0015),event.clientX-r.left,event.clientY-r.top);
},{passive:false});
map.addEventListener('pointerdown',event=>{
  if(event.target!==canvas)return;
  map.setPointerCapture(event.pointerId);drag={x:event.clientX,y:event.clientY,cx:camera.x,cy:camera.y};map.focus({preventScroll:true});
});
map.addEventListener('pointermove',event=>{
  const r=map.getBoundingClientRect();
  $('coords').textContent=`${(camera.x+(event.clientX-r.left-width/2)/camera.k).toFixed(1)} · ${(camera.y+(event.clientY-r.top-height/2)/camera.k).toFixed(1)}`;
  if(!drag)return;
  camera.x=drag.cx-(event.clientX-drag.x)/camera.k;camera.y=drag.cy-(event.clientY-drag.y)/camera.k;schedule();
});
map.addEventListener('pointerup',()=>{if(drag)share();drag=null;});
map.addEventListener('pointercancel',()=>{drag=null;});
map.addEventListener('keydown',event=>{
  const dx={ArrowLeft:-60,ArrowRight:60}[event.key]||0,dy={ArrowUp:-60,ArrowDown:60}[event.key]||0;
  if(dx||dy){event.preventDefault();camera.x+=dx/camera.k;camera.y+=dy/camera.k;schedule();share();}
  else if(event.key==='+')zoom(1.5);else if(event.key==='-')zoom(1/1.5);
});
$('plus').onclick=()=>zoom(1.5);$('minus').onclick=()=>zoom(1/1.5);$('fit').onclick=fit;
for(const id of ['land','sea'])$(id).onchange=()=>{schedule();share();};
new ResizeObserver(resize).observe(map);
fetch('geometry.json?v=20261113a4-coast-symbol-audit',{cache:'no-cache'}).then(response=>{
  if(!response.ok)throw Error(response.status);return response.json();
}).then(geometry=>{
  if(geometry.schema!=='tara-a-plus/1'||geometry.stage!==1||geometry.features.some(f=>f.properties.layer!=='land'))throw Error('Nesprávná data základu A+');
  data=geometry;land=data.features.map(f=>({...f,path:pathFor(f.geometry)}));southernEdge=pathFor({type:'LineString',coordinates:data.unknown_southern_edge});
  canvas.dataset.geometryVersion=data.version;canvas.dataset.landHash=data.approval.land_features_sha256;
  $('verification').textContent=data.display?.summary||`${data.features.length} částí pevniny a ostrovů · převzato beze změny obrysu.`;
  if(data.display?.source_edge_note)$('source-edge-note').textContent=data.display.source_edge_note;
  fit();
  if(params.has('layers')){const enabled=new Set(params.get('layers').split(','));for(const id of ['land','sea'])$(id).checked=enabled.has(id);}
  const x=Number(params.get('x')),y=Number(params.get('y')),k=Number(params.get('zoom'));
  if(params.has('x')&&params.has('y')&&Number.isFinite(x)&&Number.isFinite(y)&&k>0)camera={x,y,k:Math.min(35,Math.max(.2,k))};
  schedule();share();
}).catch(error=>{
  $('verification').textContent='Základ se nepodařilo načíst.';$('status').textContent='Chyba načítání geometrie';console.error(error);
});
