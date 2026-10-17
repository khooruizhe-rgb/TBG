// Real table-card handlers, deterministic animation clock and controlled DOM geometry.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const fixture=fs.readFileSync(__dirname+'/table-previews.cjs','utf8'),marker="test('The full-screen menu grid",box={vm,module:{exports:{}},require,__dirname,console,process:{argv:[]}};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+`
 this.physics={ctx,A,Element,window,document,el,render,dispatch,frame,frames,events,inspected,
  move:(node,x,y)=>{ctx.physicsNode=node;ctx.physicsPoint={x,y};vm.runInContext('moveTitleCard(physicsNode,physicsPoint.x,physicsPoint.y)',ctx);},
  clock:()=>now,tick:dt=>now+=dt,reduced:value=>reduced=value,
  helper:(code,node)=>{ctx.physicsNode=node;return vm.runInContext(code,ctx);}};`,box);
const F=box.physics,{A,render,dispatch,frame,window,el,inspected}=F,checks=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
const center=node=>{const r=node.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},angle=node=>parseFloat(node.values.get('--table-angle')),pos=node=>({x:parseFloat(node.values.get('--table-x')),y:parseFloat(node.values.get('--table-y'))});
function cardAt(x=600,y=400,rotation=0){const node=render()[0];node.dataset.angle=String(rotation);node.style.setProperty('--table-angle',rotation+'deg');F.move(node,x,y);return node;}
function event(node,type,id,x,y,dt=16){F.tick(dt);dispatch(node,type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,timeStamp:F.clock(),isPrimary:id===1});}
function settle(){for(let i=0;i<180&&A.slideCount();i++)frame(1000/120);assert.equal(A.slideCount(),0);}
let node=cardAt(),c=center(node);event(node,'pointerdown',1,c.x,c.y);event(node,'pointermove',1,c.x+60,c.y);event(node,'pointermove',1,c.x+120,c.y);const centerRelease=angle(node);event(node,'pointerup',1,c.x+120,c.y,0);assert(A.slideCount());frame();assert(pos(node).x>c.x+120);settle();
ok(Math.abs(angle(node)-centerRelease)<1e-8,'A central grip translates and throws a card without inventing angular torque');
node=cardAt();c=center(node);event(node,'pointerdown',1,c.x,c.y+55);event(node,'pointermove',1,c.x+60,c.y+55);event(node,'pointermove',1,c.x+120,c.y+55);event(node,'pointermove',1,c.x+180,c.y+55);const releasedAngle=angle(node);event(node,'pointerup',1,c.x+180,c.y+55,0);
ok(Math.abs(releasedAngle)>7&&Math.abs(angle(node)-releasedAngle)<1e-8,'An off-centre grip rotates beyond the old seven-degree wobble and release does not snap back');
const spinBefore=angle(node);frame();ok(angle(node)<spinBefore,'An off-centre release keeps angular momentum after the finger leaves');settle();const rest=Number(node.dataset.angle);ok(rest<-15&&Math.abs(angle(node)-rest)<1e-8,'The eventual resting rotation is stored and matches the displayed face');
c=center(node);event(node,'pointerdown',1,c.x,c.y);assert.equal(A.drag().angle,rest);event(node,'pointercancel',1,c.x,c.y);ok(Number(node.dataset.angle)===rest,'Picking up a resting rotated card preserves its orientation');
node=cardAt();c=center(node);event(node,'pointerdown',1,c.x,c.y+40);event(node,'pointermove',1,c.x+100,c.y+40);const drag=A.drag(),arm=F.helper('tableCardGrip(titleCardDrag.grip.x,titleCardDrag.grip.y,titleCardDrag.rotation)',node),at=pos(node);
ok(Math.hypot(at.x+arm.x-(c.x+100),at.y+arm.y-(c.y+40))<1e-8,'The grabbed point remains under the finger while the card rotates, including the original rotated local grip');event(node,'pointercancel',1,0,0);
function twoFinger(rotation=0){const node=cardAt(600,400,rotation),c=center(node);event(node,'pointerdown',1,c.x-50,c.y);event(node,'pointerdown',2,c.x+50,c.y);return {node,c};}
({node,c}=twoFinger());const originalSize=node.getBoundingClientRect();
for(let degrees=10;degrees<=400;degrees+=10){const r=degrees*Math.PI/180;event(node,'pointermove',1,c.x-50*Math.cos(r),c.y-50*Math.sin(r),8);event(node,'pointermove',2,c.x+50*Math.cos(r),c.y+50*Math.sin(r),8);}
ok(Math.abs(angle(node)-400)<1e-8&&Math.hypot(pos(node).x-c.x,pos(node).y-c.y)<1e-8,'Two fingers turn a card through more than one complete revolution without an angle-wrap jump or centre drift');
ok(node.getBoundingClientRect().width===originalSize.width&&node.getBoundingClientRect().height===originalSize.height,'The turning gesture does not scale card dimensions');
const second=A.drag().second;event(node,'pointerup',1,A.drag().pointer.x,A.drag().pointer.y,0);
ok(A.drag()?.pointerId===2&&node.hasPointerCapture(2)&&!node.hasPointerCapture(1),'Lifting the first finger transfers the grip to the remaining finger without ending the gesture');
const covered=node.dataset.faceDown;dispatch(node,'click');dispatch(node,'dblclick');ok(node.dataset.faceDown===covered&&inspected.length===0,'Compatibility clicks between finger releases cannot flip a card or open details during the remaining drag');
event(node,'pointermove',2,second.x+25,second.y+10);event(node,'pointerup',2,second.x+25,second.y+10,0);settle();ok(!A.drag()&&!node.hasPointerCapture(2)&&inspected.length===0,'The last finger releases normally, leaves no pointer capture and does not open card details');
({node,c}=twoFinger(12));event(node,'pointermove',2,c.x+40,c.y+40);event(node,'pointerup',2,c.x+40,c.y+40,0);
ok(A.drag()?.pointerId===1&&node.hasPointerCapture(1)&&!node.hasPointerCapture(2),'Lifting the second finger also continues a valid primary drag');event(node,'pointercancel',1,0,0);
({node,c}=twoFinger(23));event(node,'pointermove',2,c.x+20,c.y+60);event(node,'pointercancel',2,0,0);
ok(!A.drag()&&Number(node.dataset.angle)===23&&Math.hypot(pos(node).x-c.x,pos(node).y-c.y)<1e-8&&!node.hasPointerCapture(1)&&!node.hasPointerCapture(2)&&A.slideCount()===0,'Cancelling either finger restores the original pose and releases both captures without launching a throw');
node=cardAt();c=center(node);event(node,'pointerdown',1,c.x,c.y+50);event(node,'pointermove',1,c.x+60,c.y+50);A.drag().vx=0;A.drag().vy=0;assert(Math.abs(A.drag().spin)>12);event(node,'pointerup',1,c.x+60,c.y+50,0);ok(A.slideCount()===1,'A spinning card can continue turning even when its linear release speed is zero');settle();
node=cardAt();c=center(node);event(node,'pointerdown',1,c.x,c.y+50);event(node,'pointermove',1,c.x+80,c.y+50);event(node,'pointerup',1,c.x+80,c.y+50,160);ok(A.slideCount()===0,'Holding the grip still before release suppresses an accidental old throw');
F.reduced(true);node=cardAt();c=center(node);event(node,'pointerdown',1,c.x,c.y+40);event(node,'pointermove',1,c.x+80,c.y+40);event(node,'pointerup',1,c.x+80,c.y+40,0);ok(A.slideCount()===0&&angle(node)===0,'Reduced motion disables automatic torque and release travel');
({node,c}=twoFinger());event(node,'pointermove',2,c.x,c.y+50);event(node,'pointerup',2,c.x,c.y+50,0);event(node,'pointerup',1,c.x-50,c.y,0);ok(angle(node)>0&&A.slideCount()===0,'Reduced motion still allows an intentional two-finger rotation');F.reduced(false);
node=cardAt(600,400,7);dispatch(node,'keydown',{key:'e'});assert.equal(Number(node.dataset.angle),22);dispatch(node,'keydown',{key:'Q',shiftKey:true});assert.equal(Number(node.dataset.angle),-23);ok(inspected.length===0,'Q and E rotate by fifteen degrees, Shift uses forty-five, without triggering inspection');
for(const [width,height]of [[1200,800],[844,390],[390,844],[320,480]]){
 window.innerWidth=width;window.innerHeight=height;node=cardAt(10,10);for(let i=0;i<12;i++){dispatch(node,'keydown',{key:'E'});const p=pos(node),r=angle(node)*Math.PI/180,size=F.helper('tableCardSize(physicsNode)',node),w=size.width*Math.abs(Math.cos(r))+size.height*Math.abs(Math.sin(r)),h=size.width*Math.abs(Math.sin(r))+size.height*Math.abs(Math.cos(r));assert(p.x-w/2>=9.9999&&p.x+w/2<=width-9.9999&&p.y-h/2>=9.9999&&p.y+h/2<=height-9.9999);}
 ok(true,'Rotated card corners stay fully inside the '+width+'×'+height+' table, including portrait and landscape sizes');
}window.innerWidth=1200;window.innerHeight=800;
const edge={left:0,right:500,top:0,bottom:400},body={x:499,y:200,vx:600,vy:100,angle:15,spin:120},energyBefore=body.vx**2+body.vy**2+body.spin**2;A.stepTableCardSlide(body,.02,edge);ok(body.vx<0&&body.y>200&&body.vx**2+body.vy**2+body.spin**2<energyBefore,'An edge impact rebounds with lower linear and angular energy');
for(let i=0;i<240;i++)A.stepTableCardSlide(body,1/120,edge);ok(body.x>=0&&body.x<=500&&body.y>=0&&body.y<=400&&Math.hypot(body.vx,body.vy)===0,'Edge rebounds settle rather than tunnelling through the table or maintaining endless motion');
const motionResults=[];
for(const hz of [30,60,120]){node=cardAt();c=center(node);event(node,'pointerdown',1,c.x,c.y+45);for(let i=1;i<=hz;i++)event(node,'pointermove',1,c.x+200*i/hz,c.y+45,1000/hz);motionResults.push({hz,angle:angle(node),...pos(node)});event(node,'pointercancel',1,0,0);}
ok(Math.max(...motionResults.map(x=>x.angle))-Math.min(...motionResults.map(x=>x.angle))<.5&&Math.max(...motionResults.map(x=>x.x))-Math.min(...motionResults.map(x=>x.x))<.5,'The same off-centre motion at thirty, sixty and one hundred twenty samples per second produces nearly identical rotation and position');
node=cardAt();c=center(node);event(node,'pointerdown',1,c.x,c.y+50);event(node,'pointermove',1,c.x+60,c.y+50);event(node,'pointerup',1,c.x+60,c.y+50,0);assert(A.slideCount());const stopped=angle(node);frame(200);ok(A.slideCount()===0&&angle(node)===stopped,'A stale animation frame after a background pause cancels momentum instead of resuming an old throw');
const result={status:'pass',count:checks.length,checks,motionResults,scope:'Actual shared title/story/ability table handlers and deterministic animation frames, torque, exact grip contact, two-finger angle unwrapping, pointer transfer and cancellation, manual keyboard rotation, reduced motion, spin-only throws, full rotated bounds, lossy collisions, sample-rate consistency and stale-frame cleanup in a controlled DOM. Browser pixels are not verified.'};
fs.writeFileSync(__dirname+'/card-physics-2026-10-16-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' card-physics checks passed');
