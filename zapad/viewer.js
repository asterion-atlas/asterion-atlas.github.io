/* Flat map tiles preserve licensed packs; all style variants share one object layout. */
window.WESTERN_TILES={severozapad:[[1500,2120],[3000,4239],[6000,8478]],horni:[[400,556],[800,1113],[1600,2226]],stiny:[[1500,1065],[3000,2130],[6000,4260]]};
function westernTiles(group,id,box){
 let holder=group.querySelector('[data-west-map]');
 if(!holder){holder=document.createElement('div');holder.dataset.westMap=id;holder.dataset.styled=id;group.append(holder);}
 Object.assign(holder.style,{position:'absolute',...box});
 const r=holder.getBoundingClientRect(),v=map.getBoundingClientRect(),levels=WESTERN_TILES[id],tile=512;
 let z=levels.findIndex(([w])=>w>=r.width*Math.min(2,devicePixelRatio||1));if(z<0)z=levels.length-1;
 const [w,h]=levels[z],sx=r.width/w,sy=r.height/h,needed=new Set();
 const x0=Math.max(0,Math.floor((v.left-r.left)/sx/tile)),y0=Math.max(0,Math.floor((v.top-r.top)/sy/tile));
 const x1=Math.min(Math.ceil(w/tile),Math.ceil((v.right-r.left)/sx/tile)),y1=Math.min(Math.ceil(h/tile),Math.ceil((v.bottom-r.top)/sy/tile));
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  const key=z+'/'+x+'-'+y;needed.add(key);let im=holder.querySelector('[data-west-tile="'+key+'"]');
  if(!im){im=new Image();im.alt='';im.draggable=false;im.dataset.westTile=key;im.src='zapad/'+state.mode+'/'+id+'/'+key+'.webp?v=20261111s';holder.append(im);}
  Object.assign(im.style,{position:'absolute',display:'block',maxWidth:'none',left:(100*Math.max(0,x*tile-1)/w)+'%',top:(100*Math.max(0,y*tile-1)/h)+'%',width:(100*(Math.min(w,(x+1)*tile+1)-Math.max(0,x*tile-1))/w)+'%',height:(100*(Math.min(h,(y+1)*tile+1)-Math.max(0,y*tile-1))/h)+'%'});
 }
 for(const im of [...holder.children])if(!needed.has(im.dataset.westTile))im.remove();
}

window.WESTERN_MASKS={"dalavy": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iMTEyNyIgdmlld0JveD0iMCAwIDgwMCAxMTI3Ij48ZGVmcz48ZmlsdGVyIGlkPSJzb2Z0IiB4PSItMTAlIiB5PSItMTAlIiB3aWR0aD0iMTIwJSIgaGVpZ2h0PSIxMjAlIj48ZmVNb3JwaG9sb2d5IG9wZXJhdG9yPSJlcm9kZSIgcmFkaXVzPSIzIi8+PGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMiIvPjwvZmlsdGVyPjwvZGVmcz48cG9seWdvbiBwb2ludHM9IjE2LDIyNSAxMDAsMjAzIDIwMCwxODUgMzAwLDE2OCAzOTAsMTYzIDQ3MCwxNjUgNTUwLDE3MyA2NTAsMTkxIDc4MCwyMjMgNzgwLDExMDAgMTYsMTEwMCIgZmlsbD0id2hpdGUiIGZpbHRlcj0idXJsKCNzb2Z0KSIvPjwvc3ZnPg==", "horni": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAwIiBoZWlnaHQ9IjEzOTEiIHZpZXdCb3g9IjAgMCAxMDAwIDEzOTEiPjxkZWZzPjxmaWx0ZXIgaWQ9InMiIHg9Ii0xMCUiIHk9Ii0xMCUiIHdpZHRoPSIxMjAlIiBoZWlnaHQ9IjEyMCUiPjxmZU1vcnBob2xvZ3kgb3BlcmF0b3I9ImVyb2RlIiByYWRpdXM9IjgiLz48ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSI2Ii8+PC9maWx0ZXI+PC9kZWZzPjxwb2x5Z29uIHBvaW50cz0iMTAsMTgwIDk5MCwxODAgOTkwLDkwMCA2NjUsOTAwIDY2NSwxMjQwIDExMCwxMjQwIDExMCwxMDQwIDEwLDEwNDAiIGZpbGw9IndoaXRlIiBmaWx0ZXI9InVybCgjcykiLz48L3N2Zz4="};
window.DALAVSKE_CLIPS.horni=[[10, 180], [990, 180], [990, 900], [665, 900], [665, 1240], [110, 1240], [110, 1040], [10, 1040]];
