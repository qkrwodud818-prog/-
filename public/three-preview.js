import * as THREE from './vendor/three.module.js';
import {renderGarment} from './garment.js';
import {renderSleeve} from './sleeve.js';
import {createGarmentVolume} from './garment-volume.js';
import {createLatestUpdater} from './texture-update.js';
import {MEASUREMENTS} from './catalog.js';
import {withSvgFont} from './workflows.js';

/** Permanent canvas + atomic texture swaps. No blank materials during pointer moves. */
export function mount3D(container,initialDesign,options={}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.setClearColor(0xf3f2ee,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 const canvas=renderer.domElement;canvas.style.cssText='width:100%;height:100%;display:block;touch-action:none;cursor:grab';
 canvas.setAttribute('aria-label','입체 의류 미리보기. 옷을 끌어 회전하거나 요소를 끌어 옮기세요.');container.append(canvas);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,1,4000);camera.position.set(0,0,970);
 scene.add(new THREE.HemisphereLight(0xffffff,0x647064,1.8));
 const key=new THREE.DirectionalLight(0xfff9eb,2.4);key.position.set(-300,450,650);scene.add(key);
 const rim=new THREE.DirectionalLight(0xe8f0ff,1.8);rim.position.set(400,200,-400);scene.add(rim);
 const fill=new THREE.DirectionalLight(0xffffff,.7);fill.position.set(400,-80,500);scene.add(fill);
 let design=structuredClone(initialDesign),group=null,meshes=[],shapeKey='',textures=[],disposed=false;
 let yaw=-.35,pitch=.03,distance=970,autoRotate=false,drag=null,frameId;
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
 const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.88,side:THREE.DoubleSide});
 const materials={front:mat(design.colors.body),back:mat(design.colors.body),left:mat(design.colors.sleeves),right:mat(design.colors.sleeves),leftInner:mat(design.colors.sleeves),rightInner:mat(design.colors.sleeves),solidBody:mat(design.colors.body),solidSleeves:mat(design.colors.sleeves),solidRib:mat(design.colors.rib),solidHood:mat(design.colors.hood)};
 function releaseGeometry(g){g?.traverse(o=>o.geometry?.dispose());}
 const dimensions=d=>JSON.stringify([d.type,d.neckline,d.pocket,d.zipper,...MEASUREMENTS.map(m=>d[m.key])]);
 function replaceGeometry(d){const built=createGarmentVolume(d,materials),old=group;group=built.group;meshes=built.meshes;group.rotation.set(pitch,yaw,0);scene.add(group);if(old){scene.remove(old);releaseGeometry(old);}shapeKey=dimensions(d);}
 // First frame has the selected garment colors; later updates retain the finished previous frame.
 replaceGeometry(design);
 function loadTexture(svg,color){return new Promise((resolve,reject)=>{
  const image=new Image(),url=URL.createObjectURL(new Blob([withSvgFont(svg)],{type:'image/svg+xml'}));
  image.onload=()=>{URL.revokeObjectURL(url);try{const bitmap=document.createElement('canvas');bitmap.width=1200;bitmap.height=1280;const context=bitmap.getContext('2d');context.fillStyle=color;context.fillRect(0,0,1200,1280);context.drawImage(image,0,0,1200,1280);const texture=new THREE.CanvasTexture(bitmap);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);resolve(texture);}catch(e){reject(e);}};
  image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('의류 질감을 불러오지 못했어요. 기존 미리보기를 유지합니다.'));};image.src=url;
 });}
 const updater=createLatestUpdater({
  async prepare(snapshot){
   const requests=['front','back','left','right','leftInner','rightInner'].map(key=>{const view=key.replace('Inner',''),side=['left','right'].includes(view);return loadTexture(side?renderSleeve(snapshot,view,{surface:key.endsWith('Inner')?'inner':'outer',texture:true,idPrefix:'volume-'+key}):renderGarment(snapshot,view,{skipSleeveOverlays:true,idPrefix:'volume-'+key}),side?snapshot.colors.sleeves:snapshot.colors.body);});
   const results=await Promise.allSettled(requests),failed=results.find(r=>r.status==='rejected');
   if(failed){results.forEach(r=>{if(r.status==='fulfilled')r.value.dispose();});throw failed.reason;}return results.map(r=>r.value);
  },
  commit(next,snapshot){
   if(shapeKey!==dimensions(snapshot))replaceGeometry(snapshot);
   const old=textures;textures=next;
   ['front','back','left','right','leftInner','rightInner'].forEach((view,i)=>{materials[view].map=next[i];materials[view].color.set(0xffffff);materials[view].needsUpdate=true;});
   for(const [name,color] of Object.entries({solidBody:snapshot.colors.body,solidSleeves:snapshot.colors.sleeves,solidRib:snapshot.colors.rib,solidHood:snapshot.colors.hood}))materials[name].color.set(color);
   old.forEach(t=>t.dispose());canvas.dataset.ready='true';options.onReady?.();
  },
  release:assets=>assets.forEach(t=>t.dispose()),onError:error=>options.onError?.(error.message),
 });
 function update(next){design=structuredClone(next);updater.update(design);}
 function hit(event,onlyView){
  if(!group)return null;const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  group.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);
  const intersections=raycaster.intersectObjects(meshes,false),intersection=intersections.find(x=>x.uv&&x.object.userData.editable!==false&&x.object.userData.view&&(!onlyView||x.object.userData.view===onlyView));
  if(!intersection)return null;const {view,part}=intersection.object.userData;
  return {view,part,seam:intersection.object.userData.seam||'outer',x:THREE.MathUtils.clamp(intersection.uv.x*600,0,600),y:THREE.MathUtils.clamp((1-intersection.uv.y)*640,0,640)};
 }
 function itemAt(point){
  const items=[...(design.graphics||[]),...(design.details||[])].reverse();
  for(const item of items){if(item.sleevePlacement)continue;const mirrored=item.symmetric&&((item.view==='left'&&point.view==='right')||(item.view==='right'&&point.view==='left'));if(item.view!==point.view&&!mirrored)continue;
   const centers=[item.x];if(item.symmetric&&['front','back'].includes(item.view))centers.push(600-item.x);
   for(const x of centers){const angle=-(item.rotation||0)*Math.PI/180,dx=point.x-x,dy=point.y-item.y,rx=dx*Math.cos(angle)-dy*Math.sin(angle),ry=dx*Math.sin(angle)+dy*Math.cos(angle),w=item.width||((item.kind==='text'?Math.max(2,item.text.length*.6):2)*item.size),h=item.height||item.size*2;
    if(Math.abs(rx)<=w/2+8&&Math.abs(ry)<=h/2+8)return {item,mirrored:mirrored||x!==item.x,center:x};
   }
  }return null;
 }
 const down=event=>{
  if(event.button!==0&&event.pointerType==='mouse')return;
  drag={x:event.clientX,y:event.clientY,yaw,pitch,moved:false};
  const point=hit(event),found=point&&itemAt(point);
  if(found&&options.onMove){const {item,mirrored,center}=found;drag.item=item.id;drag.view=point.view;drag.originalView=item.view;drag.mirrored=mirrored;drag.offset={x:center-point.x,y:item.y-point.y};options.onEditStart?.(item.id);}
  canvas.setPointerCapture(event.pointerId);canvas.style.cursor=drag.item?'move':'grabbing';
 };
 const move=event=>{
  if(!drag)return;
  if(drag.item){const point=hit(event,drag.view);if(point){drag.moved=true;const x=point.x+drag.offset.x;options.onMove?.({id:drag.item,view:drag.originalView,x:drag.mirrored&&['front','back'].includes(drag.view)?600-x:x,y:point.y+drag.offset.y});}return;}
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag.moved||=Math.abs(dx)+Math.abs(dy)>4;yaw=drag.yaw+dx*.008;pitch=THREE.MathUtils.clamp(drag.pitch+dy*.005,-.65,.65);
 };
 const up=event=>{if(drag?.item)options.onEditEnd?.();else if(drag&&!drag.moved){const point=hit(event);if(point)options.onSelect?.(point);}drag=null;canvas.style.cursor='grab';};
 const wheel=event=>{event.preventDefault();distance=THREE.MathUtils.clamp(distance+event.deltaY*.6,480,1600);};
 const dragover=event=>{event.preventDefault();event.dataTransfer.dropEffect='copy';const point=hit(event);canvas.dataset.dropSurface=point?.view||'';};
 const drop=event=>{event.preventDefault();const point=hit(event);canvas.dataset.dropSurface='';if(point)options.onPlace?.({...point,dataTransfer:event.dataTransfer,event});else options.onError?.('옷 표면 위에 놓아 주세요.');};
 for(const [type,handler] of Object.entries({pointerdown:down,pointermove:move,pointerup:up,pointercancel:up,dragover,drop}))canvas.addEventListener(type,handler);
 canvas.addEventListener('wheel',wheel,{passive:false});
 function resize(){const width=Math.max(container.clientWidth,1),height=Math.max(container.clientHeight,400);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(container);resize();update(design);
 let last=performance.now();function frame(now){if(disposed)return;if(autoRotate&&!drag)yaw+=Math.min(now-last,50)*.00025;last=now;if(group)group.rotation.set(pitch,yaw,0);camera.position.z=distance;renderer.render(scene,camera);frameId=requestAnimationFrame(frame);}frameId=requestAnimationFrame(frame);
 return {
  update,setView(view){yaw=({front:0,back:Math.PI,left:-Math.PI/2,right:Math.PI/2})[view]??0;pitch=0;},setAutoRotate(on){autoRotate=!!on;},
  getCamera(){return {yaw,pitch,distance,autoRotate};},restoreCamera(saved){if(saved){({yaw,pitch,distance,autoRotate}=saved);}},
  capture(){renderer.render(scene,camera);return canvas.toDataURL('image/png');},
  dispose(){disposed=true;updater.dispose();cancelAnimationFrame(frameId);observer.disconnect();releaseGeometry(group);textures.forEach(t=>t.dispose());Object.values(materials).forEach(m=>m.dispose());renderer.dispose();canvas.remove();},
 };
}
