// Viewport state and fit arithmetic with simulated DOM rectangles. For pixel/device QA,
// run the Playwright interaction suite in an environment with Chromium installed.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||'touhou_board_game_github_textures.html','utf8');
const js=html.split('<script>')[1].split('</script>')[0];
class Element {
  constructor(){this.values=new Map();this.style={setProperty:(n,v)=>this.values.set(n,String(v))};this.children=[];this.parentElement=null;this.textContent='';this.attributes={};
    const names=new Set();this.classList={contains:n=>names.has(n),add:n=>names.add(n),remove:n=>names.delete(n),toggle(n,on){if(on===undefined)on=!names.has(n);if(on)names.add(n);else names.delete(n);return on;}};}
  appendChild(node){node.parentElement=this;this.children.push(node);}
  insertBefore(node){node.parentElement=this;this.children.unshift(node);}
  addEventListener(){} setAttribute(n,v){this.attributes[n]=v;}
}
const nodes=new Map();const el=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
const body=new Element(),root=new Element(),events={};let width=844,height=390,safe={left:0,right:0,top:0,bottom:0},coarse=true,shop=false,count=7,choiceHeight=0,pendingFrame=null;
const document={body,documentElement:root,fullscreenElement:null,addEventListener:(n,fn)=>events[n]=fn,removeEventListener:(n,fn)=>{if(events[n]===fn)delete events[n];}};
const window={get innerWidth(){return width;},get innerHeight(){return height;},visualViewport:{get height(){return height;},addEventListener(){}},matchMedia:()=>({matches:coarse}),addEventListener:(n,fn)=>events[n]=fn};
function dimensions(){
  const room=width-safe.left-safe.right-12,contentHeight=height-safe.top-safe.bottom-10-36;
  const shopWidth=shop?Number.parseFloat(body.values.get('--mobile-shop-width')||136)+6:0;
  const handWidth=Number.parseFloat(body.values.get('--mobile-hand-width')||190);
  return {room,contentHeight,handWidth,centreWidth:room-shopWidth-10-handWidth-6};
}
el('table-wrap').getBoundingClientRect=()=>{const d=dimensions();return {width:d.centreWidth,height:d.contentHeight-10-27-30-6};};
el('hand').getBoundingClientRect=()=>{const d=dimensions();return {width:d.handWidth-6,height:d.contentHeight-10-20-choiceHeight};};
const context={dockTutorialCoach(){},console,Math,document,window,el,SIZE:5,game:{kourindouEnabled:false,players:[{hand:Array(7).fill('card')}],cancelled:false},screen:{orientation:{}},navigator:{userActivation:{isActive:false}},setTimeout,clearTimeout,
  getComputedStyle:()=>({paddingLeft:String(safe.left+6),paddingRight:String(safe.right+6)}),
  requestAnimationFrame:fn=>{pendingFrame=fn;return 1;},positionRinnosukeBubble(){},repositionYuukaBlooms(){},touchHandDrag:null,
  handPlacementArrivals:new Set(),handDragSettlers:new Set(),finishHandDrag:()=>{context.cancelledDrag=true;}};
vm.createContext(context);
const viewportCode=js.slice(js.indexOf('/* CSS lays out the phone table'),js.indexOf("el('start-btn').addEventListener('click'"));
vm.runInContext(viewportCode+'\nthis.api={syncMobileViewport,mobileHandMetrics,toggleGameFullscreen,onGameFullscreenChange,initializeMobileFullscreen,onAutomaticMobileFullscreen,requestGameFullscreen,resetFullscreen:()=>{mobileFullscreenArmed=true;mobileFullscreenPending=false;}};',context);
const A=context.api;
function reset({w=844,h=390,isShop=false,hand=7,insets={},choice=0,isCoarse=true}={}){
  width=w;height=h;shop=isShop;count=hand;coarse=isCoarse;safe={left:0,right:0,top:0,bottom:0,...insets};choiceHeight=choice;
  context.game={kourindouEnabled:shop,players:[{hand:Array(count).fill('card')}],cancelled:false};
  el('game').classList.add('active');document.fullscreenElement=null;document.fullscreenEnabled=undefined;document.webkitFullscreenElement=null;root.requestFullscreen=undefined;root.webkitRequestFullscreen=undefined;context.screen.orientation={};A.resetFullscreen();
  el('mobile-screen-message').textContent=el('menu-fullscreen-message').textContent='';
  el('debug-controls').appendChild(el('playtest-toggle-wrap'));A.syncMobileViewport();
}
const tests=[];const test=(n,f)=>tests.push([n,f]);
test('Board, seven hand cards, corner-seat gutters, and shop fit common landscape sizes',()=>{
  for(const [w,h] of [[568,320],[640,360],[667,375],[740,300],[844,390],[932,430],[1024,768]])for(const isShop of [false,true])for(const choice of [0,56]){
    reset({w,h,isShop,choice});const table=el('table-wrap').getBoundingClientRect(),hand=el('hand').getBoundingClientRect();
    const board=Number.parseFloat(body.values.get('--mobile-board-width')),columns=Number(body.values.get('--mobile-hand-columns')),card=Number.parseFloat(body.values.get('--mobile-card-height'));
    assert(board/0.8+52<=table.height+1,`board height ${w}x${h}`);assert(board+132<=table.width+1,`seat gutters ${w}x${h}`);
    assert(Math.ceil(7/columns)*card+(Math.ceil(7/columns)-1)*4+6<=hand.height+1,`seven-card hand ${w}x${h}, choice ${choice}`);
    assert(root.classList.contains('mobile-landscape'));assert(body.classList.contains('mobile-has-shop')===isShop);
  }
});
test('Notches, browser chrome, and bottom safe areas reduce the available table',()=>{
  reset({w:844,h:342,isShop:true,insets:{left:44,right:44,bottom:21}});const table=el('table-wrap').getBoundingClientRect();
  const board=Number.parseFloat(body.values.get('--mobile-board-width'));assert(board/.8+52<=table.height+1);assert(board+132<=table.width+1);
});
test('Rotating back to portrait restores the normal layout and leaves reveal hidden in its debug panel',()=>{
  reset({isShop:true});assert.equal(el('playtest-toggle-wrap').parentElement,el('debug-controls'));
  body.classList.add('mobile-log-open');width=390;height=844;A.syncMobileViewport();
  assert(!root.classList.contains('mobile-landscape'));assert(body.classList.contains('game-mobile'));assert(!body.classList.contains('mobile-log-open'));
  assert.equal(el('playtest-toggle-wrap').parentElement,el('debug-controls'));
});
test('Desktop and main-menu screens keep their original layout',()=>{
  reset({w:1440,h:900,isCoarse:false});assert(!body.classList.contains('mobile-landscape'));assert(!body.classList.contains('game-mobile'));
  reset();el('game').classList.remove('active');A.syncMobileViewport();assert(!root.classList.contains('mobile-landscape'));
});
test('Unsupported fullscreen keeps the game usable and explains manual rotation',async()=>{
  reset();await A.toggleGameFullscreen();assert(el('mobile-screen-message').textContent.includes('Rotate'));assert.equal(el('menu-fullscreen-message').textContent,el('mobile-screen-message').textContent);assert.equal(document.fullscreenElement,null);
});
test('A phone enters fullscreen on its first trusted menu tap without starting the game',async()=>{
 reset();el('game').classList.remove('active');let requests=0;root.requestFullscreen=async()=>{requests++;document.fullscreenElement=root;};
 A.initializeMobileFullscreen();assert.equal(requests,0);assert(el('menu-fullscreen-message').textContent.includes('Tap'));A.syncMobileViewport();assert(body.classList.contains('mobile-device'));assert(!body.classList.contains('game-mobile'));
 A.onAutomaticMobileFullscreen({type:'pointerup',isTrusted:false});assert.equal(requests,0);
 A.onAutomaticMobileFullscreen({type:'pointerup',isTrusted:true});A.onAutomaticMobileFullscreen({type:'click',isTrusted:true});for(let i=0;i<6;i++)await Promise.resolve();
 assert.equal(requests,1);assert.equal(document.fullscreenElement,root);assert(!el('game').classList.contains('active'));assert.equal(el('menu-fullscreen-btn').attributes['aria-pressed'],'true');assert.equal(el('fullscreen-btn').attributes['aria-pressed'],'true');
});
test('Rejected mobile fullscreen shows a bilingual-ready fallback and can be retried manually',async()=>{
 reset();root.requestFullscreen=async()=>{throw Error('activation denied');};A.initializeMobileFullscreen();A.onAutomaticMobileFullscreen({type:'click',isTrusted:true});for(let i=0;i<6;i++)await Promise.resolve();
 assert.equal(document.fullscreenElement,null);assert(el('menu-fullscreen-message').textContent.includes('blocked'));assert.equal(el('mobile-screen-message').textContent,el('menu-fullscreen-message').textContent);
 root.requestFullscreen=async()=>{document.fullscreenElement=root;};await A.toggleGameFullscreen();assert.equal(document.fullscreenElement,root);
});
test('Blocked iframe policy is reported in the menu and desktop input never forces fullscreen',()=>{
 reset();let requests=0;root.requestFullscreen=()=>requests++;document.fullscreenEnabled=false;A.initializeMobileFullscreen();A.onAutomaticMobileFullscreen({type:'click',isTrusted:true});assert.equal(requests,0);assert(el('menu-fullscreen-message').textContent.includes('unavailable'));
 reset({w:1440,h:900,isCoarse:false});root.requestFullscreen=()=>requests++;A.initializeMobileFullscreen();A.onAutomaticMobileFullscreen({type:'click',isTrusted:true});assert.equal(requests,0);
});
test('A legacy mobile fullscreen API waits for its entry event instead of showing a false failure',async()=>{
 reset();root.webkitRequestFullscreen=()=>{};const result=A.requestGameFullscreen();document.webkitFullscreenElement=root;events.webkitfullscreenchange();assert.equal(await result,true);assert(!el('menu-fullscreen-message').textContent.includes('blocked'));
});
test('Fullscreen requests landscape when supported and unlocks when exited',async()=>{
  reset();let locked=null,unlocked=false;root.requestFullscreen=async()=>{document.fullscreenElement=root;};
  document.exitFullscreen=async()=>{document.fullscreenElement=null;};context.screen.orientation={lock:async mode=>{locked=mode;},unlock:()=>{unlocked=true;}};
  await A.toggleGameFullscreen();assert.equal(locked,'landscape');A.onGameFullscreenChange();assert.equal(el('fullscreen-btn').textContent,'Exit Fullscreen');
  await A.toggleGameFullscreen();assert(unlocked);A.onGameFullscreenChange();assert.equal(el('fullscreen-btn').textContent,'Fullscreen');
});
test('Rejected orientation lock falls back to manual rotation without throwing',async()=>{
  reset();root.requestFullscreen=async()=>{document.fullscreenElement=root;};context.screen.orientation.lock=async()=>{throw Error('unsupported');};
  await A.toggleGameFullscreen();assert(el('mobile-screen-message').textContent.includes('Rotate'));
});
test('Rotation cancels a held gesture and completes an existing visual handoff',()=>{
  reset();context.touchHandDrag={};let finished=0;context.handPlacementArrivals.add({animations:[{finish:()=>finished++}]});
  events.resize();assert(context.cancelledDrag);assert.equal(finished,1);assert(pendingFrame);context.touchHandDrag=null;context.handPlacementArrivals.clear();
});
(async()=>{for(const [name,fn] of tests){await fn();console.log('PASS '+name);}console.log(`${tests.length}/${tests.length} mobile viewport checks passed.`);})().catch(e=>{console.error(e);process.exitCode=1;});
