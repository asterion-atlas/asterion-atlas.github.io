/* Style D uses flattened map tiles, never downloadable symbol catalogs. */
function wielinkTiles(group,id,box){
  let holder=group.querySelector('[data-d-map]');
  if(!holder){holder=document.createElement('div');holder.dataset.dMap=id;holder.dataset.styled=id;group.append(holder);}
  Object.assign(holder.style,{position:'absolute',...box});
  const r=holder.getBoundingClientRect(),v=map.getBoundingClientRect();
  const levels=[[837,1178],[1673,2356],[3346,4712]],tile=512;
  let z=levels.findIndex(([w])=>w>=r.width*Math.min(2,devicePixelRatio||1));if(z<0)z=levels.length-1;
  const [w,h]=levels[z],sx=r.width/w,sy=r.height/h,needed=new Set();
  const x0=Math.max(0,Math.floor((v.left-r.left)/sx/tile)),y0=Math.max(0,Math.floor((v.top-r.top)/sy/tile));
  const x1=Math.min(Math.ceil(w/tile),Math.ceil((v.right-r.left)/sx/tile)),y1=Math.min(Math.ceil(h/tile),Math.ceil((v.bottom-r.top)/sy/tile));
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const key=z+'/'+x+'-'+y;needed.add(key);let im=holder.querySelector('[data-d-tile="'+key+'"]');
    if(!im){im=new Image();im.alt='';im.draggable=false;im.dataset.dTile=key;im.src='varianta-d/tiles/'+key+'.webp?v=20261111q';holder.append(im);}
    Object.assign(im.style,{position:'absolute',display:'block',maxWidth:'none',left:(100*Math.max(0,x*tile-1)/w)+'%',top:(100*Math.max(0,y*tile-1)/h)+'%',width:(100*(Math.min(w,(x+1)*tile+1)-Math.max(0,x*tile-1))/w)+'%',height:(100*(Math.min(h,(y+1)*tile+1)-Math.max(0,y*tile-1))/h)+'%'});
  }
  for(const im of [...holder.children])if(!needed.has(im.dataset.dTile))im.remove();
}
