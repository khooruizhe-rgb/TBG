// Real drag and settings handlers with measured DOM reads and a controlled frame clock.
// These checks establish behavior and work reduction, not a mobile GPU frame rate.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),js=html.split('<script>')[1].split('</script>')[0];
const fixture=fs.readFileSync(__dirname+'/fullscreen-card-inspection-2026-10-17.cjs','utf8'),marker='(async()=>{';
const box={module:{exports:{}},require,__dirname,console,process:{once(){},exitCode:0}};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,A,el,Element,document,documentListeners,windowListeners,run,dispatch,menuCard,introCard,layer};',box);
const F=box.module.exports,{ctx,A,el,Element,document,documentListeners,windowListeners,run,dispatch,menuCard,introCard,layer}=F;
const checks=[],ok=(value,name)=>{assert(value,name);checks.push(name);},storage=new Map(),frames=new Map();
let now=1000,nextFrame=0,hits=0,completed=false,reduced=false;const drops=[],reads={card:0,grid:0,other:0},nativeClose=[];
process.once('beforeExit',()=>{if(!completed){console.error('Drag/settings checks did not reach their completion marker');process.exitCode=1;}});
ctx.window.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
ctx.window.matchMedia=()=>({matches:reduced});ctx.performance={now:()=>now};ctx.Date={now:()=>now};
ctx.requestAnimationFrame=fn=>{frames.set(++nextFrame,fn);return nextFrame;};ctx.cancelAnimationFrame=id=>frames.delete(id);
ctx.window.visualViewport={addEventListener:(name,fn)=>(viewportEvents[name]??=[]).push(fn)};const viewportEvents={};
let resizeObserver;ctx.ResizeObserver=class{constructor(callback){resizeObserver=callback;this.nodes=[];}observe(node){this.nodes.push(node);}};
const oldRect=Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect=function(){reads[this.dataset.titlePreview||this.dataset.storyCard?'card':this===el('story-card-grid')?'grid':'other']++;return oldRect.call(this);};
Element.prototype.cloneNode=function(deep){const copy=new Element();copy.className=this.className;copy.dataset={...this.dataset};copy.attributes={...this.attributes};copy.rect=this.rect;if(deep)for(const child of this.children)copy.appendChild(child.cloneNode(true));return copy;};
Element.prototype.animate=function(keyframes,options){this.lastAnimation={keyframes,options};return {finished:Promise.resolve(),cancel(){}};};
for(const id of ['settings-dialog','menu-settings-btn','game-settings-btn','settings-language','settings-physics','settings-fixed-shadow','settings-light-shadow','settings-mirror-phone','settings-close','board','kourindou','hand']){
 el(id).id=id;if(!el(id).parentElement)document.body.appendChild(el(id));
}
const dialog=el('settings-dialog');dialog.rect={left:100,top:80,width:460,height:360,right:560,bottom:440};dialog.open=false;
for(const id of ['settings-close','settings-language','settings-physics','settings-fixed-shadow','settings-light-shadow','settings-mirror-phone'])dialog.appendChild(el(id));
dialog.querySelectorAll=()=>dialog.children;
dialog.showModal=function(){this.open=true;const index=layer.indexOf(this);if(index>=0)layer.splice(index,1);layer.push(this);};
dialog.close=function(){if(!this.open)return;this.open=false;const index=layer.indexOf(this);if(index>=0)layer.splice(index,1);nativeClose.push(()=>dispatch(this,'close'));};
function flushClose(){while(nativeClose.length)nativeClose.shift()();}
function frame(dt=1000/60){now+=dt;const callbacks=[...frames.values()];frames.clear();for(const callback of callbacks)callback(now);}
const fire=(type,extra={})=>{const event={type,button:0,pointerId:1,pointerType:'touch',isPrimary:true,cancelable:true,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){},...extra};for(const handler of documentListeners.get(type)||[])handler(event);};
const oldClosest=Element.prototype.closest;
Element.prototype.closest=function(selector){
 if(selector==='#board .cell,#kourindou .cell')return this.classList.contains('cell')&&['board','kourindou'].includes(this.parentElement?.id)?this:null;
 if(selector==='#kourindou'){for(let node=this;node;node=node.parentElement)if(node.id==='kourindou')return node;return null;}
 return oldClosest.call(this,selector);
};
const tile=(r,c,shop=false)=>{const node=new Element();node.className='cell';node.dataset={r:String(r),c:String(c),slot:'0'};node.rect={left:300+c*60,top:200+r*60,width:58,height:58,right:358+c*60,bottom:258+r*60};el(shop?'kourindou':'board').appendChild(node);return node;};
const left=tile(0,0),right=tile(0,1),shopTile=tile(6,1,true);let hit=left;
document.elementFromPoint=()=>{hits++;return hit;};
ctx.commitCellChoice=(r,c)=>{drops.push({r,c});run('pendingCellChoice=null;');};ctx.commitShopChoice=slot=>{drops.push({slot});run('pendingCellChoice=null;');};ctx.isShopSelectable=()=>true;
ctx.renderBoard=()=>{};ctx.renderStatus=()=>{};
vm.runInContext(js.slice(js.indexOf('function syncHandSelection(){'),js.indexOf('function updateHandChoiceActions(){'))+'var draggingCardId=null,pendingDragLanding=null;'+js.slice(js.indexOf('function humanActionCells('),js.indexOf('/* Clicking anywhere outside the board/hand/cancel-button')),ctx);
run('cardPresentationSettings=loadCardPresentationSettings();initializeCardSettings();');
const prefs=()=>JSON.parse(run('JSON.stringify(cardPresentationSettings)'));
function makeHand(){
 run('clearHandDragPhysics();game=new Game(2,{},null,{fastTest:true});game.players[0].isAI=false;game.currentPlayerIdx=0;pendingCellChoice=null;selectedHandCard=null;');A.renderHand();
 const source=el('hand').children[0];source.rect={left:30,top:500,width:90,height:120,right:120,bottom:620};return source;
}
function beginHand(source){dispatch(source,'pointerdown',{pointerId:1,pointerType:'touch',clientX:75,clientY:560});fire('pointermove',{clientX:310,clientY:220});}
const drag=()=>run('touchHandDrag');
async function settle(){for(let i=0;i<8;i++)await Promise.resolve();flushClose();}

(async()=>{
 const controlsCss=html.match(/(?:^|\n)#menu-fullscreen-controls\{([^}]*)\}/)[1];
 ok(/display:flex/.test(controlsCss)&&html.includes('id="menu-settings-btn"')&&html.includes('id="game-settings-btn"')&&!html.includes('id="game-language"')&&!html.includes('id="menu-language"'),'The desktop menu and match expose gear buttons, with one language selector inside settings');
 ok(JSON.stringify(prefs())===JSON.stringify({physics:'physical',fixedShadow:false,lightShadow:false,mirrorPhone:false}),'Fresh preferences retain the current physical style and both original shadow effects');
 for(const id of ['menu-settings-btn','game-settings-btn']){
  el(id).focus();dispatch(el(id),'click');assert(dialog.open&&dialog.classList.contains('show')&&layer.at(-1)===dialog);assert.equal(document.activeElement,el('settings-language'));
  dispatch(el('settings-close'),'click');flushClose();assert(!dialog.open&&!dialog.classList.contains('show'));assert.equal(document.activeElement,el(id));
 }
 ok(true,'Both real gear handlers open the shared native settings dialog and closing restores the originating button’s focus');
 dispatch(el('menu-settings-btn'),'click');dispatch(dialog,'cancel');flushClose();ok(!dialog.open,'Native Back/Escape cancellation closes settings without starting a game');
 dispatch(el('game-settings-btn'),'click');document.activeElement=dialog.children.at(-1);let wrapped=false;dispatch(dialog,'keydown',{key:'Tab',preventDefault(){wrapped=true;}});ok(wrapped&&document.activeElement===dialog.children[0],'Keyboard focus wraps inside settings');
 run('onGameFullscreenChange();');flushClose();ok(dialog.open&&dialog.classList.contains('show')&&layer.at(-1)===dialog,'Fullscreen promotion re-raises settings and a queued close event does not dismiss the reopened dialog');
 dispatch(dialog,'keydown',{key:'Escape'});flushClose();
 el('settings-physics').value='classic';dispatch(el('settings-physics'),'change',{target:el('settings-physics')});el('settings-fixed-shadow').checked=true;dispatch(el('settings-fixed-shadow'),'change',{target:el('settings-fixed-shadow')});el('settings-light-shadow').checked=true;dispatch(el('settings-light-shadow'),'change',{target:el('settings-light-shadow')});
 ok(prefs().physics==='classic'&&prefs().fixedShadow&&prefs().lightShadow&&document.body.classList.contains('fixed-card-shadow')&&document.body.classList.contains('light-card-shadows'),'Actual setting controls independently apply classic motion, fixed shadows and lighter glow');
 ok(JSON.stringify(prefs())===storage.get('boundary-card-presentation-v1')&&run('JSON.stringify(loadCardPresentationSettings())')===JSON.stringify(prefs()),'All three choices survive a new preference load');
 storage.set('boundary-card-presentation-v1','{"physics":"unknown","fixedShadow":"true","lightShadow":1}');ok(run('JSON.stringify(loadCardPresentationSettings())')===JSON.stringify({physics:'physical',fixedShadow:false,lightShadow:false,mirrorPhone:false}),'Invalid stored values cannot enable unintended modes');
 storage.set('boundary-card-presentation-v1','{broken');ok(run('loadCardPresentationSettings().physics')==='physical','Malformed saved JSON safely uses the original visual defaults');
 const savedStorage=ctx.window.localStorage;ctx.window.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 run('setCardPresentationSetting("physics","physical");');ok(prefs().physics==='physical'&&run('loadCardPresentationSettings().physics')==='physical','Blocked browser storage still allows immediate setting changes');ctx.window.localStorage=savedStorage;
 run('setCardPresentationSetting("fixedShadow",false);setCardPresentationSetting("lightShadow",false);');
 for(const language of ['zh-CN','en']){
  A.setLanguage(language);for(const text of ['Settings','Language','Card physics','New · rotation and momentum','Previous · original physics','Fixed drag shadow','Lighter drag shadows and glow'])assert.equal(A.translateGameText(text)===text,language==='en',text);
 }ok(true,'Every settings label has an English and Chinese presentation');
 const nativeShow=dialog.showModal;dialog.showModal=undefined;dispatch(el('menu-settings-btn'),'click');ok(dialog.classList.contains('show')&&!dialog.open,'The same settings controls remain available when native dialogs are unavailable');dispatch(el('settings-close'),'click');dialog.showModal=nativeShow;
 let node=menuCard(),rect=node.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
 dispatch(node,'pointerdown',{pointerId:1,pointerType:'touch',clientX:x,clientY:y+20});dispatch(node,'pointermove',{pointerId:1,pointerType:'touch',clientX:x+15,clientY:y+20,timeStamp:now+=16});reads.card=reads.grid=0;
 for(let i=1;i<=200;i++)dispatch(node,'pointermove',{pointerId:1,pointerType:'touch',clientX:x+15+i*.3,clientY:y+20,timeStamp:now+=4});
 ok(reads.card===0&&reads.grid===0,'Two hundred tabletop move samples use cached size and bounds with zero repeated geometry reads');
 dispatch(node,'pointercancel',{pointerId:1});
 node=introCard(2);rect=node.getBoundingClientRect();x=rect.left+rect.width/2;y=rect.top+rect.height/2;
 dispatch(node,'pointerdown',{pointerId:1,pointerType:'touch',clientX:x,clientY:y});dispatch(node,'pointermove',{pointerId:1,pointerType:'touch',clientX:x+10,clientY:y,timeStamp:now+=16});reads.card=reads.grid=0;
 for(let i=1;i<=120;i++)dispatch(node,'pointermove',{pointerId:1,pointerType:'touch',clientX:x+10+i*.2,clientY:y,timeStamp:now+=8});
 ok(reads.card===0&&reads.grid===0,'A moving chapter-introduction card also reuses both card dimensions and the introduction area');
 el('story-card-grid').rect={left:40,top:90,width:680,height:250,right:720,bottom:340};resizeObserver();reads.card=reads.grid=0;
 dispatch(node,'pointermove',{pointerId:1,pointerType:'touch',clientX:x+50,clientY:y,timeStamp:now+=16});ok(reads.card===1&&reads.grid===1,'A real resize observer invalidates geometry and the next move measures each affected box once');
 reads.card=reads.grid=0;dispatch(node,'pointermove',{pointerId:1,pointerType:'touch',clientX:x+51,clientY:y,timeStamp:now+=16});ok(reads.card===0&&reads.grid===0,'The updated geometry is reused immediately after invalidation');dispatch(node,'pointercancel',{pointerId:1});
 ok(windowListeners.get('scroll').includes(run('invalidateCardDragGeometry'))&&viewportEvents.resize.includes(run('invalidateCardDragGeometry'))&&viewportEvents.scroll.includes(run('invalidateCardDragGeometry'))&&documentListeners.get('fullscreenchange').includes(run('invalidateCardDragGeometry')),'Scrolling, visual viewport changes and fullscreen changes all invalidate cached geometry');
 run('closeStoryMenu();setCardPresentationSetting("physics","classic");');node=menuCard();rect=node.getBoundingClientRect();x=rect.left+rect.width/2;y=rect.top+rect.height/2;const initialAngle=Number(node.dataset.angle);
 dispatch(node,'pointerdown',{pointerId:1,pointerType:'touch',clientX:x,clientY:y+25,timeStamp:now});dispatch(node,'pointermove',{pointerId:1,pointerType:'touch',clientX:x+80,clientY:y+25,timeStamp:now+=16});dispatch(node,'pointerup',{pointerId:1,pointerType:'touch',clientX:x+80,clientY:y+25,timeStamp:now});
 ok(Number(node.dataset.angle)!==initialAngle&&run('tableCardSlides.size')===1,'Previous tabletop motion retains the original rotation and release throw');run('clearTableCardSlides();');
 run('setCardPresentationSetting("physics","physical");');node=menuCard();rect=node.getBoundingClientRect();x=rect.left+rect.width/2;y=rect.top+rect.height/2;
 dispatch(node,'pointerdown',{pointerId:1,pointerType:'touch',clientX:x,clientY:y+25});for(let i=1;i<=5;i++)dispatch(node,'pointermove',{pointerId:1,pointerType:'touch',clientX:x+i*15,clientY:y+25,timeStamp:now+=16});dispatch(node,'pointerup',{pointerId:1,pointerType:'touch',clientX:x+75,clientY:y+25,timeStamp:now});
 ok(run('tableCardSlides.size')===1,'Switching back restores the real physical release throw');dispatch(el('menu-settings-btn'),'click');ok(run('tableCardSlides.size')===0,'Opening settings retires active tabletop momentum before changing its mode');dispatch(el('settings-close'),'click');flushClose();
 let source=makeHand();hit=left;beginHand(source);hits=0;
 for(let i=0;i<240;i++)fire('pointermove',{clientX:310+i*.01,clientY:220});assert.equal(hits,0);frame();
 ok(hits===1&&drag().target===left,'Two hundred forty hand pointer events collapse into exactly one live drop-target test on the next frame');
 frame();ok(hits===1,'A stationary pointer does not repeat drop-target testing on later animation frames');
 hit=right;fire('pointermove',{clientX:375,clientY:220});const beforeRelease=hits;reads.other=0;fire('pointerup',{clientX:375,clientY:220});await settle();
 ok(hits===beforeRelease+1&&drops.at(-1)?.c===1&&!drag(),'Releasing before the next frame still checks the final live target and commits the newly reached tile');
 ok(reads.other===1,'Release and landing share one target-size snapshot instead of measuring again after DOM writes');
 source=makeHand();hit=left;beginHand(source);frame();const invalidGhost=drag().ghost;source.rect={left:32.7,top:503.6,width:84.6,height:112.8,right:117.3,bottom:616.4};const beforeInvalid=drops.length;hit=null;fire('pointerup',{clientX:900,clientY:100});await settle();
 ok(drops.length===beforeInvalid&&!drag()&&run('pendingCellChoice===null'),'A release outside the board cannot reuse a previously highlighted valid tile');
 ok(invalidGhost.lastAnimation.keyframes.at(-1).width==='90px'&&invalidGhost.lastAnimation.keyframes.at(-1).height==='120px','An invalid release returns to the full cached card size even while the source has its smaller dragging transform');
 source=makeHand();hit=shopTile;beginHand(source);frame();fire('pointerup',{clientX:390,clientY:220});await settle();ok(drops.at(-1)?.slot===0,'The same coalesced handler preserves shop drop routing');
 source=makeHand();hit=left;beginHand(source);frame();const beforeCancel=drops.length;fire('pointercancel');await settle();ok(!drag()&&drops.length===beforeCancel&&run('handDragSettlers.size')===0,'Cancelling a touch releases the gesture, animations and target without committing a card');
 source=makeHand();beginHand(source);frame();const ghost=drag().ghost;dispatch(el('game-settings-btn'),'click');ok(!drag()&&!ghost.isConnected&&frames.size===0&&run('pendingCellChoice===null'),'Opening settings cancels a held hand card and clears its pending animation and drag-only choice');dispatch(el('settings-close'),'click');flushClose();
 run('setCardPresentationSetting("physics","classic");');source=makeHand();beginHand(source);frame();
 const classic=drag();ok(classic.previousPhysics&&classic.body.x!==classic.goal.x&&classic.body.angle!==0,'Previous hand dragging uses the restored original spring and tilt instead of direct following');fire('pointercancel');await settle();
 run('setCardPresentationSetting("physics","physical");');source=makeHand();beginHand(source);frame();ok(drag().body.angle!==0&&drag().body.x!==drag().goal.x,'The physical hand mode retains spring following and visible rotation');
 const active=drag();active.body.vx=600;run('setCardPresentationSetting("fixedShadow",false);setCardPresentationSetting("lightShadow",false);');ctx.activeDrag=active;run('paintHandDrag(activeDrag);');const normalShadow=active.ghost.style.boxShadow;
 run('setCardPresentationSetting("fixedShadow",true);paintHandDrag(activeDrag);');ok(active.ghost.style.boxShadow.startsWith('0px 22px 34px')&&normalShadow!==active.ghost.style.boxShadow,'Fixed shadow stops the velocity-dependent offset while retaining the original blur and glow');
 run('setCardPresentationSetting("lightShadow",true);paintHandDrag(activeDrag);');ok(active.ghost.style.boxShadow.startsWith('0px 16px 18px')&&active.ghost.style.boxShadow.includes('0 2px 4px'),'The second toggle independently reduces shadow blur and glow');
 let shadowWrites=0,lastShadow=active.ghost.style.boxShadow;Object.defineProperty(active.ghost.style,'boxShadow',{get:()=>lastShadow,set:value=>{shadowWrites++;lastShadow=value;},configurable:true});
 run('for(let i=0;i<120;i++)paintHandDrag(activeDrag);');ok(shadowWrites===0,'Unchanged shadow values are reused across a hundred twenty paints without redundant style writes');fire('pointercancel');await settle();
 const sample=hz=>{ctx.sampleHz=hz;return run('(()=>{const body={x:0,y:0,vx:0,vy:0,angle:0,tilt:0,scale:1};for(let i=0;i<sampleHz/5;i++)stepHandDragPhysics(body,{x:250,y:100},1/sampleHz);return body;})()');};
 const sixty=sample(60);for(const hz of [15,20,30]){const slow=sample(hz);for(const key of ['x','y','vx','vy','angle','tilt','scale'])assert(Math.abs(sixty[key]-slow[key])<1e-8,hz+'/'+key);}
 ok(true,'Fifteen-, twenty- and thirty-frame updates advance the same full elapsed physical time as sixty-frame updates');
 const stale=run('stepHandDragPhysics({x:0,y:0,vx:900,vy:200,angle:4,tilt:3,scale:1.05},{x:200,y:300},2)');ok(stale.x===200&&stale.y===300&&stale.vx===0&&stale.angle===0,'A stale frame after a long pause reconnects to the current finger instead of replaying old momentum');
 reduced=true;source=makeHand();beginHand(source);frame();ok(drag().body.x===drag().goal.x&&drag().body.angle===0,'Reduced-motion preference still overrides automatic spring and tilt');fire('pointercancel');await settle();reduced=false;
 const result={status:'pass',count:checks.length,checks,workReduction:{tableSamples:200,tableGeometryReadsAfterWarmup:0,introSamples:120,introGeometryReadsAfterWarmup:0,pointerSamplesPerFrame:240,hitTestsPerFrame:1},scope:'Actual native/fallback settings and preference handlers, bilingual labels, gesture/frame handlers, geometry cache invalidation, current/classic motion, fresh release targets, cancellation, shop routing, shadow switches and low-frame-rate time integration. Controlled DOM geometry and compositor ordering; physical-phone FPS and GPU paint cost are not measured.'};
 fs.writeFileSync(__dirname+'/drag-settings-2026-10-17-results.json',JSON.stringify(result,null,2)+'\n');completed=true;console.log(result.count+' drag/settings checks passed; 240 pointer samples reduced to one hit test and repeated table geometry reads to zero');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
