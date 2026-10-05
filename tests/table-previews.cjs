// Exercise the real title-card pointer, keyboard and menu handlers with a DOM fixture.
// This suite checks behavior and cleanup; it is not a browser rendering test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2]||(fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(file,'utf8'),js=html.split('<script>')[1].split('</script>')[0],css=html.split('<style>')[1].split('</style>')[0];new vm.Script(js);
let now=1000,seed=23;const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
class Element{
 constructor(){this.children=[];this.dataset={};this.attributes={};this.events={};this.values=new Map();this.names=new Set();this.captures=new Set();this.style={setProperty:(k,v)=>this.values.set(k,String(v)),removeProperty:k=>this.values.delete(k)};
  this.classList={add:(...n)=>n.forEach(x=>this.names.add(x)),remove:(...n)=>n.forEach(x=>this.names.delete(x)),contains:n=>this.names.has(n),toggle:(n,on)=>{if(on===undefined)on=!this.names.has(n);on?this.names.add(n):this.names.delete(n);return on;}};}
 set className(s){this.names=new Set(s.split(/\s+/).filter(Boolean));}get className(){return [...this.names].join(' ');}
 appendChild(n){n.remove();n.parentElement=this;this.children.push(n);return n;}
 removeEventListener(k,fn){this.events[k]=(this.events[k]||[]).filter(f=>f!==fn);}
 querySelector(s){return this.children.find(node=>node.classList.contains(s.slice(1)))||null;}
 set innerHTML(markup){this.markup=markup;this.replaceChildren();if(markup.includes('class="peek-order"')){const label=new Element();label.className='peek-order';this.appendChild(label);}}
 get innerHTML(){return this.markup||'';}
 replaceChildren(){for(const n of this.children)n.parentElement=null;this.children=[];}
 remove(){if(this.parentElement){const list=this.parentElement.children;list.splice(list.indexOf(this),1);this.parentElement=null;this.captures.clear();}}
 setAttribute(k,v){this.attributes[k]=String(v);}addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 focus(){document.activeElement=this;}
 setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);}
 getBoundingClientRect(){if(this.rect)return {...this.rect,right:this.rect.left+this.rect.width,bottom:this.rect.top+this.rect.height};const size={width:144,height:192},parse=(v,total)=>String(v).endsWith('%')?parseFloat(v)*total/100:parseFloat(v)||0;
  return {left:parse(this.values.get('--table-x'),window.innerWidth)-size.width/2,top:parse(this.values.get('--table-y'),window.innerHeight)-size.height/2,...size};}
}
const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
const document={body:new Element(),activeElement:null,addEventListener(){},removeEventListener(){},createElement:()=>new Element(),querySelectorAll(s){const walk=n=>n.children.flatMap(c=>[c,...walk(c)]);return walk(this.body).filter(n=>n.classList.contains(s.slice(1)));}};
for(const id of ['title-table-cards','game','setup','start-btn','crown-backdrop-a','crown-backdrop-b'])document.body.appendChild(el(id));
const storage=new Map(),events={},inspected=[];
const window={innerWidth:1200,innerHeight:800,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},addEventListener:(k,fn)=>(events[k]??=[]).push(fn),removeEventListener:(k,fn)=>{events[k]=(events[k]||[]).filter(f=>f!==fn);},scrollTo(){}};
const ctx={console,Math:math,Date:{now:()=>now},document,window,el,openCardDetails:id=>inspected.push(id),cardBoardHtml:id=>`<div class="board-card">${id}</div>`,screen:{orientation:{unlock(){}}},updateStartButtonState(){},queueMobileViewport(){},playGameCue(){},requestAnimationFrame:fn=>fn(),resetGameView(){ctx.api.finishTitleCardDrag(true);}};
vm.createContext(ctx);
vm.runInContext(js.slice(js.indexOf('const DIRS4'),js.indexOf('/* ===================== UI layer'))+'\n'+
 js.slice(js.indexOf('let titleCardDrag=null'),js.indexOf('let chosenPlayerCount = 3;'))+'\n'+
 js.slice(js.indexOf('const DEFAULT_CROWN_LIGHT'),js.indexOf('const FACTION_CROWN_LIGHT'))+'\n'+
 js.slice(js.indexOf('function crownLightFor'),js.indexOf('function discardLightFor'))+'\n'+
 js.slice(js.indexOf('const CROWN_SCENE_BACKGROUND'),js.indexOf('function triggerPlacementPresentation'))+'\n'+
 js.slice(js.indexOf('function returnToMainMenu(){'),js.indexOf('function startNewGame(){'))+
 '\nthis.api={CARD,drawTitlePreviewCards,renderTitleTableCards,finishTitleCardDrag,returnToMainMenu,showCrownBackdrop,clearCrownBackdrop,CROWN_SCENE_BACKGROUND,CROWN_LIGHT_PALETTES,openByakurenPeek,averageWoodColor,cancelPeek:()=>cancelByakurenPeek?.(),drag:()=>titleCardDrag,resetPrevious:()=>lastTitleCardIds=[]};',ctx);
const A=ctx.api,tests=[],test=(n,f)=>tests.push([n,f]);
function render(){A.finishTitleCardDrag(true);el('game').classList.remove('active');inspected.length=0;now+=500;A.renderTitleTableCards();return el('title-table-cards').children;}
function dispatch(node,type,extra={}){const event={type,currentTarget:node,pointerId:1,button:0,detail:1,clientX:100,clientY:100,preventDefault(){},stopPropagation(){},...extra};for(const fn of node.events[type]||[])fn(event);return event;}
function styleValue(selector,property){
 let value;for(const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
  if(!rule[1].split(',').map(s=>s.trim()).includes(selector))continue;
  for(const declaration of rule[2].split(';')){const colon=declaration.indexOf(':');if(declaration.slice(0,colon).trim()===property)value=declaration.slice(colon+1).trim();}
 }return value;
}
test('The full-screen menu grid passes pointer input through, while its setup paper accepts it',()=>{
 assert.equal(styleValue('body:not(:has(#game.active)) #app','pointer-events'),'none');
 assert.equal(styleValue('body:not(:has(#game.active)) #setup','pointer-events'),'auto');
 assert.equal(styleValue('.table-scatter-card','pointer-events'),'auto');
 assert.notEqual(styleValue('#app','pointer-events'),'none','the match container must stay interactive');
});
test('Each spread contains nine valid distinct cards and avoids the entire previous spread',()=>{
 const first=Array.from(A.drawTitlePreviewCards(),c=>c.id),next=Array.from(A.drawTitlePreviewCards(),c=>c.id);assert.equal(new Set(first).size,9);assert.equal(new Set(next).size,9);assert(first.every(id=>A.CARD[id]));assert(next.every(id=>!first.includes(id)));
});
test('Refresh remembers the last spread, and blocked storage still allows random cards',()=>{
 const previous=JSON.parse(storage.get('boundary-title-preview'));A.resetPrevious();const next=Array.from(A.drawTitlePreviewCards(),c=>c.id);assert(next.every(id=>!previous.includes(id)));
 const original=window.localStorage;window.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};A.resetPrevious();assert.equal(A.drawTitlePreviewCards().length,9);window.localStorage=original;
});
test('Every preview, including both face-down cards, can be inspected without starting a game',()=>{
 const cards=render().slice();assert.equal(cards.length,9);assert.equal(cards.filter(c=>c.innerHTML.includes('table-card-back')).length,2);
 for(const c of cards){assert.equal(c.attributes.role,'button');assert.equal(c.attributes.tabindex,'0');assert(c.attributes['aria-label'].includes(A.CARD[c.dataset.cardId].name));dispatch(c,'dblclick');}
 assert.deepEqual(inspected,cards.map(c=>c.dataset.cardId));
});
test('A double click or double tap opens inspection once, and the first tap leaves the spread untouched',()=>{
 for(const pointerType of ['mouse','touch']){
  const c=render()[0],before=c.getBoundingClientRect();dispatch(c,'pointerdown',{pointerType});dispatch(c,'pointerup',{pointerType});dispatch(c,'click');
  assert.equal(inspected.length,0);assert.equal(c.parentElement,el('title-table-cards'));assert.deepEqual(c.getBoundingClientRect(),before);
  now+=120;dispatch(c,'pointerdown',{pointerType});dispatch(c,'pointerup',{pointerType});dispatch(c,'click',{detail:2});dispatch(c,'dblclick');
  assert.deepEqual(inspected,[c.dataset.cardId]);assert.equal(A.drag(),null);assert(!c.hasPointerCapture(1));
 }
});
test('Dragging a card moves it, brings it above the setup paper and does not open inspection',()=>{
 const c=render()[0];dispatch(c,'pointerdown');const start={...A.drag().center};dispatch(c,'pointermove',{clientX:190,clientY:145});assert(c.classList.contains('table-card-dragging'));assert.equal(c.parentElement,document.body);
 assert.equal(parseFloat(c.values.get('--table-x')),start.x+90);assert.equal(parseFloat(c.values.get('--table-y')),start.y+45);
 assert(c.hasPointerCapture(1));dispatch(c,'lostpointercapture');assert(A.drag(),'recaptured pointer survives moving the node above the menu');
 dispatch(c,'pointerup',{clientX:190,clientY:145});dispatch(c,'click');dispatch(c,'dblclick');assert.equal(inspected.length,0);assert(!c.classList.contains('table-card-dragging'));assert(c.classList.contains('table-card-moved'));now+=401;dispatch(c,'dblclick');assert.equal(inspected[0],c.dataset.cardId);
});
test('Unrelated pointers and secondary mouse buttons cannot move or inspect a grabbed card',()=>{
 const c=render()[0];dispatch(c,'pointerdown',{button:2});assert.equal(A.drag(),null);dispatch(c,'pointerdown');const x=c.values.get('--table-x');dispatch(c,'pointermove',{pointerId:9,clientX:900});dispatch(c,'pointerup',{pointerId:9});assert.equal(c.values.get('--table-x'),x);assert(A.drag());assert.equal(inspected.length,0);A.finishTitleCardDrag(true);
});
test('A second finger cannot replace an active drag',()=>{
 const c=render()[0];dispatch(c,'pointerdown',{pointerType:'touch'});dispatch(c,'pointermove',{clientX:150});dispatch(c,'pointerdown',{pointerId:2,pointerType:'touch',isPrimary:false});assert.equal(A.drag().pointerId,1);assert(c.hasPointerCapture(1));A.finishTitleCardDrag(true);
});
test('Unrelated or slow taps do not inspect a card',()=>{
 const [a,b]=render();const tap=(node,extra={})=>{dispatch(node,'pointerdown',extra);dispatch(node,'pointerup',extra);};
 tap(a);now+=100;tap(b);now+=600;tap(b);assert.equal(inspected.length,0);
 now+=100;tap(b,{clientX:150});assert.equal(inspected.length,0);
 now+=100;tap(b,{clientX:150});assert.deepEqual(inspected,[b.dataset.cardId]);
});
test('Keyboard assistive clicks inspect, and title input is inactive while playing',()=>{
 const c=render()[0];dispatch(c,'click',{detail:0});assert.deepEqual(inspected,[c.dataset.cardId]);now+=500;el('game').classList.add('active');dispatch(c,'pointerdown');dispatch(c,'dblclick');dispatch(c,'keydown',{key:'Enter'});assert.equal(A.drag(),null);assert.equal(inspected.length,1);el('game').classList.remove('active');
});
test('Pointer cancellation restores the position and releases capture without an accidental inspection',()=>{
 const c=render()[0];dispatch(c,'pointerdown');const start={...A.drag().center};dispatch(c,'pointermove',{clientX:400,clientY:300});dispatch(c,'pointercancel');assert.equal(A.drag(),null);assert.equal(parseFloat(c.values.get('--table-x')),start.x);assert.equal(parseFloat(c.values.get('--table-y')),start.y);assert(!c.hasPointerCapture(1));dispatch(c,'click');assert.equal(inspected.length,0);
});
test('Arrow keys move cards, Shift moves farther and Enter or Space inspects them',()=>{
 const c=render()[0],before=c.getBoundingClientRect();dispatch(c,'keydown',{key:'ArrowRight'});assert.equal(parseFloat(c.values.get('--table-x')),before.left+before.width/2+12);dispatch(c,'keydown',{key:'ArrowDown',shiftKey:true});assert.equal(parseFloat(c.values.get('--table-y')),before.top+before.height/2+40);dispatch(c,'keydown',{key:'Enter'});dispatch(c,'keydown',{key:' '});assert.deepEqual(inspected,[c.dataset.cardId,c.dataset.cardId]);
});
test('A fresh spread removes moved cards and retires an unfinished drag',()=>{
 const c=render()[0];dispatch(c,'pointerdown');dispatch(c,'pointermove',{clientX:500});A.renderTitleTableCards();assert.equal(A.drag(),null);assert.equal(document.querySelectorAll('.table-scatter-card').length,9);assert(!document.querySelectorAll('.table-scatter-card').includes(c));assert.equal(inspected.length,0);
});
test('Returning from a match or tutorial refreshes the spread and leaves settings intact',()=>{
 const old=render().map(c=>c.dataset.cardId);el('game').classList.add('active');el('setup').style.display='none';A.returnToMainMenu();const next=el('title-table-cards').children.map(c=>c.dataset.cardId);assert(next.every(id=>!old.includes(id)));assert(!el('game').classList.contains('active'));assert.equal(el('setup').style.display,'');assert.equal(document.activeElement,el('start-btn'));
});
test('Resizing or losing window focus safely ends dragging and keeps moved cards reachable',()=>{
 const c=render()[0];dispatch(c,'pointerdown');dispatch(c,'pointermove',{clientX:3000,clientY:3000});window.innerWidth=480;window.innerHeight=320;for(const fn of events.resize)fn();assert.equal(A.drag(),null);assert(parseFloat(c.values.get('--table-x'))<=456);assert(parseFloat(c.values.get('--table-y'))<=296);
 dispatch(c,'pointerdown');for(const fn of events.blur)fn();assert.equal(A.drag(),null);assert.equal(inspected.length,0);window.innerWidth=1200;window.innerHeight=800;
});
test('Crown backgrounds retain full opacity, with no later rule dimming them',()=>{
 assert.equal(styleValue('.crown-backdrop.active','opacity'),'1');assert.equal(styleValue('.crown-backdrop','pointer-events'),'none');
});
test('Every crown switches the active faction scene and matching panel tint',()=>{
 A.clearCrownBackdrop();let previousLayer=null;
 for(const [id,scene]of Object.entries(A.CROWN_SCENE_BACKGROUND)){
  A.showCrownBackdrop(id);const layers=['crown-backdrop-a','crown-backdrop-b'].map(el),active=layers.filter(n=>n.classList.contains('active'));
  assert.equal(active.length,1);assert.notEqual(active[0],previousLayer);assert(active[0].style.backgroundImage.includes(`var(${scene})`));
  assert.equal(el('game').values.get('--scene-rgb'),A.CROWN_LIGHT_PALETTES[id].rgb);assert(document.body.classList.contains('crown-scene-active'));previousLayer=active[0];
 }
 const background=previousLayer.style.backgroundImage;A.showCrownBackdrop('marisa');assert(previousLayer.classList.contains('active'));assert.equal(previousLayer.style.backgroundImage,background,'ordinary cards leave the last crown scene active');
 A.clearCrownBackdrop();assert(!document.body.classList.contains('crown-scene-active'));assert(!el('game').values.has('--scene-rgb'));assert(!el('crown-backdrop-a').classList.contains('active'));assert(!el('crown-backdrop-b').classList.contains('active'));
});
function peek(ids=['sdm_flandre','mtn_aya','hourai_mokou']){
 el('game').classList.add('active');el('byakuren-peek-table').rect={left:200,top:110,width:760,height:290};el('byakuren-peek-hand').rect={left:200,top:460,width:760,height:240};
 const promise=A.openByakurenPeek(ids);return {promise,cards:el('byakuren-peek-cards').children.slice()};
}
function dragTo(node,x,y,pointerType='mouse'){
 const rect=node.getBoundingClientRect(),clientX=rect.left+rect.width/2,clientY=rect.top+rect.height/2;
 dispatch(node,'pointerdown',{clientX,clientY,pointerType});dispatch(node,'pointermove',{clientX:x,clientY:y,pointerType});dispatch(node,'pointerup',{clientX:x,clientY:y,pointerType});
}
test('Byakuren uses the same pointer handlers, moves a card into hand, and orders the deck spatially',async()=>{
 const {promise,cards}=peek();dragTo(cards[0],580,565);assert(cards[0].classList.contains('peek-taken'));assert.equal(cards[0].parentElement,el('byakuren-peek-cards'),'cards stay above the ability table, not underneath its modal');assert(!el('byakuren-peek-confirm').disabled);
 dragTo(cards[2],300,255);dragTo(cards[1],830,255);el('byakuren-peek-confirm').onclick();assert.deepEqual({...await promise,order:Array.from((await promise).order)},{taken:'sdm_flandre',order:['hourai_mokou','mtn_aya']});assert(!el('byakuren-peek-overlay').classList.contains('show'));assert.equal(A.drag(),null);
});
test('Touch double-tap inspects a peek card; touch dragging selects a card without moving game cards',async()=>{
 const {promise,cards}=peek();inspected.length=0;const card=cards[1],rect=card.getBoundingClientRect(),point={clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2,pointerType:'touch'};
 dispatch(card,'pointerdown',point);dispatch(card,'pointerup',point);now+=120;dispatch(card,'pointerdown',point);dispatch(card,'pointerup',point);assert.deepEqual(inspected,['mtn_aya']);now+=600;
 dragTo(card,580,565,'touch');assert(card.classList.contains('peek-taken'));el('byakuren-peek-confirm').onclick();assert.equal((await promise).taken,'mtn_aya');
});
test('The take button supports click/keyboard users, and cards can be exchanged or returned before confirming',async()=>{
 const {promise,cards}=peek();dispatch(cards[0],'click');el('byakuren-peek-take').onclick();assert(cards[0].classList.contains('peek-taken'));dragTo(cards[1],580,565);assert(!cards[0].classList.contains('peek-taken'));assert(cards[1].classList.contains('peek-taken'));dragTo(cards[1],650,255);assert(el('byakuren-peek-confirm').disabled);dispatch(cards[2],'click');el('byakuren-peek-take').onclick();el('byakuren-peek-confirm').onclick();assert.equal((await promise).taken,'hourai_mokou');
});
test('Cancelling a peek clears pointer capture and never commits cards to a new game',async()=>{
 const {promise,cards}=peek();dispatch(cards[0],'pointerdown');dispatch(cards[0],'pointermove',{clientX:600});A.cancelPeek();assert.equal(await promise,null);assert.equal(A.drag(),null);assert(!cards[0].hasPointerCapture(1));assert.equal(el('byakuren-peek-cards').children.length,0);
});
test('Wood follows background hue while the oval mat stays unchanged, and reset clears tint',()=>{
 A.showCrownBackdrop('hell_hecatia');assert.equal(document.body.values.get('--wood-rgb'),'117,64,159');assert.notEqual(document.body.values.get('--wood-rgb'),A.CROWN_LIGHT_PALETTES.hell_hecatia.rgb);assert(css.includes('background-blend-mode:color,normal'));assert(css.includes('rgb(var(--wood-rgb,var(--scene-rgb)))'));assert.equal(A.averageWoodColor([70,30,190,255,70,30,190,255]),'70,30,190');assert.equal(A.averageWoodColor([0,0,0,0]),null);A.clearCrownBackdrop();assert(!document.body.values.has('--wood-rgb'));assert(!el('game').values.has('--wood-rgb'));
});
(async()=>{for(const [name,fn]of tests){await fn();console.log('PASS '+name);}console.log(`${tests.length}/${tests.length} table preview checks passed`);})().catch(e=>{console.error(e);process.exitCode=1;});
