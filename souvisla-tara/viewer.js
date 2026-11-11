/* One registered continental surface: source selection never changes ownership. */
function continuousTara(state,container,map,project){
 let holder=container.querySelector('[data-continuous-tara]');
 if(state.id!=='tara'||!isStyled()){holder?.remove();return;}
 const c=CONTINUOUS_TARA,[ox,oy,bw,bh]=c.bounds,style=state.mode;
 if(holder&&holder.dataset.continuousTara!==style){holder.remove();holder=null;}
 if(!holder){holder=document.createElement('div');holder.dataset.continuousTara=style;container.append(holder);}
 const [left,top]=project({x:ox,y:oy});
 Object.assign(holder.style,{position:'absolute',left:left+'px',top:top+'px',width:bw*state.scale+'px',height:bh*state.scale+'px',zIndex:90,pointerEvents:'none'});
 let z=c.densities.findIndex(d=>d>=state.scale*Math.min(2,devicePixelRatio||1));if(z<0)z=c.densities.length-1;
 const d=c.densities[z],w=Math.round(bw*d),h=Math.round(bh*d),s=state.scale/d,t=c.tile;
 const available=new Set(c.present[style][z]),needed=new Set(),pending=[];
 const x0=Math.max(0,Math.floor(-left/s/t)),y0=Math.max(0,Math.floor(-top/s/t));
 const x1=Math.min(Math.ceil(w/t),Math.ceil((map.clientWidth-left)/s/t)),y1=Math.min(Math.ceil(h/t),Math.ceil((map.clientHeight-top)/s/t));
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  const cell=x+'-'+y,key=z+'/'+cell;if(!available.has(cell))continue;needed.add(key);
  let im=holder.querySelector('[data-continuous-tile="'+key+'"]');
  if(!im){im=new Image();im.alt='';im.draggable=false;im.dataset.continuousTile=key;im.src='souvisla-tara/'+style+'/'+key+'.webp?v='+c.version;holder.append(im);}
  const px=Math.max(0,x*t-1),py=Math.max(0,y*t-1);
  Object.assign(im.style,{position:'absolute',display:'block',maxWidth:'none',left:100*px/w+'%',top:100*py/h+'%',width:100*(Math.min(w,(x+1)*t+1)-px)/w+'%',height:100*(Math.min(h,(y+1)*t+1)-py)/h+'%'});
  if(!im.complete)pending.push(new Promise(resolve=>{im.addEventListener('load',resolve,{once:true});im.addEventListener('error',resolve,{once:true});}));
 }
 const generation=holder.dataset.generation=String((+holder.dataset.generation||0)+1);
 const cleanup=()=>{if(holder.dataset.generation===generation)for(const im of [...holder.children])if(!needed.has(im.dataset.continuousTile))im.remove();};
 if(pending.length)Promise.all(pending).then(cleanup);else cleanup();
}
