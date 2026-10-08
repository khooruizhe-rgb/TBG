// Exercise the real title-card pointer, keyboard and menu handlers with a DOM fixture.
// This suite checks behavior and cleanup; it is not a browser rendering test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2]||(fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(file,'utf8'),js=html.split('<script>')[1].split('</script>')[0],css=html.split('<style>')[1].split('</style>')[0];new vm.Script(js);
let now=1000,seed=23,reduced=false,nextFrame=0,nextTimer=0;const frames=new Map(),timers=new Map(),documentEvents={};const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
class Element{
 constructor(){this.children=[];this.dataset={};this.attributes={};this.events={};this.values=new Map();this.names=new Set();this.captures=new Set();this.style={setProperty:(k,v)=>this.values.set(k,String(v)),removeProperty:k=>this.values.delete(k)};
  this.classList={add:(...n)=>n.forEach(x=>this.names.add(x)),remove:(...n)=>n.forEach(x=>this.names.delete(x)),contains:n=>this.names.has(n),toggle:(n,on)=>{if(on===undefined)on=!this.names.has(n);on?this.names.add(n):this.names.delete(n);return on;}};}
 set className(s){this.names=new Set(s.split(/\s+/).filter(Boolean));}get className(){return [...this.names].join(' ');}
 appendChild(n){n.remove();n.parentElement=this;this.children.push(n);return n;}
 removeEventListener(k,fn){this.events[k]=(this.events[k]||[]).filter(f=>f!==fn);}
 querySelector(s){for(const child of this.children){if(child.classList.contains(s.slice(1)))return child;const found=child.querySelector(s);if(found)return found;}return null;}
 set innerHTML(markup){this.markup=markup;this.replaceChildren();if(markup.includes('class="peek-order"')){const label=new Element();label.className='peek-order';this.appendChild(label);}}
 get innerHTML(){return this.markup||'';}
 replaceChildren(){for(const n of this.children)n.parentElement=null;this.children=[];}
 remove(){if(this.parentElement){const list=this.parentElement.children;list.splice(list.indexOf(this),1);this.parentElement=null;this.captures.clear();}}
 setAttribute(k,v){this.attributes[k]=String(v);}addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 focus(){document.activeElement=this;}
 get isConnected(){let root=this;while(root.parentElement)root=root.parentElement;return root===document.body;}
 setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);}
 getBoundingClientRect(){if(this.rect)return {...this.rect,right:this.rect.left+this.rect.width,bottom:this.rect.top+this.rect.height};let width=144;
  if(this.classList.contains('title-memory-table-card'))width=parseFloat(document.body.values.get('--memory-card-width'))||width;
  if(this.dataset.peekCard==='true'){width=parseFloat(el('byakuren-peek-overlay').values.get('--peek-card-width'))||width;if(window.innerHeight<=600 && window.innerWidth>window.innerHeight)width=Math.min(width,window.innerHeight*.17);}
  const size={width,height:width*4/3},parse=(v,total)=>String(v).endsWith('%')?parseFloat(v)*total/100:parseFloat(v)||0;
  return {left:parse(this.values.get('--table-x'),window.innerWidth)-size.width/2,top:parse(this.values.get('--table-y'),window.innerHeight)-size.height/2,...size};}
}
const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
const document={body:new Element(),activeElement:null,addEventListener:(key,fn)=>(documentEvents[key]??=[]).push(fn),removeEventListener(){},createElement:()=>new Element(),querySelectorAll(s){const walk=n=>n.children.flatMap(c=>[c,...walk(c)]);return walk(this.body).filter(n=>n.classList.contains(s.slice(1)));}};
for(const id of ['title-table-cards','game','setup','start-btn','crown-backdrop-a','crown-backdrop-b','byakuren-peek-cards','title-memory-status','title-memory-controls','title-memory-close','title-memory-replay'])document.body.appendChild(el(id));
const storage=new Map(),events={},inspected=[];
const window={innerWidth:1200,innerHeight:800,matchMedia:()=>({matches:reduced}),localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},addEventListener:(k,fn)=>(events[k]??=[]).push(fn),removeEventListener:(k,fn)=>{events[k]=(events[k]||[]).filter(f=>f!==fn);},scrollTo(){}};
const ctx={console,Math:math,Date:{now:()=>now},performance:{now:()=>now},document,window,el,openCardDetails:id=>inspected.push(id),cardBoardHtml:id=>`<div class="board-card">${id}</div>`,fullscreenElement:()=>null,screen:{orientation:{unlock(){}}},updateStartButtonState(){},queueMobileViewport(){},setRuleText:(node,text)=>node.textContent=text,playGameCue(){},setTimeout:(fn,delay)=>{timers.set(++nextTimer,{fn,at:now+delay});return nextTimer;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id),resetGameView(){ctx.api.closeTitleMemoryGame(false);ctx.api.finishTitleCardDrag(true);}};
vm.createContext(ctx);
vm.runInContext(js.slice(js.indexOf('const DIRS4'),js.indexOf('/* ===================== UI layer'))+'\nlet game=null;\n'+
 js.slice(js.indexOf('let titleCardDrag=null'),js.indexOf('let chosenPlayerCount = 3;'))+'\n'+
 js.slice(js.indexOf('const DEFAULT_CROWN_LIGHT'),js.indexOf('const FACTION_CROWN_LIGHT'))+'\n'+
 js.slice(js.indexOf('function crownLightFor'),js.indexOf('function discardLightFor'))+'\n'+
 js.slice(js.indexOf('const CROWN_SCENE_BACKGROUND'),js.indexOf('function triggerPlacementPresentation'))+'\n'+
 js.slice(js.indexOf('function returnToMainMenu(){'),js.indexOf('function startNewGame({'))+
 '\nthis.api={CARD,drawTitlePreviewCards,renderTitleTableCards,finishTitleCardDrag,returnToMainMenu,showCrownBackdrop,clearCrownBackdrop,CROWN_SCENE_BACKGROUND,CROWN_LIGHT_PALETTES,openByakurenPeek,cardChoiceGroupRect,stepTableCardSlide,clearTableCardSlides,closeTitleMemoryGame,openTitleMemoryGame,titleMemoryLayout,memory:()=>titleMemoryGame,slideCount:()=>tableCardSlides.size,averageWoodColor,cancelPeek:()=>cancelByakurenPeek?.(),drag:()=>titleCardDrag,resetPrevious:()=>lastTitleCardIds=[]};',ctx);
const A=ctx.api,tests=[],test=(n,f)=>tests.push([n,f]);
function frame(dt=16){now+=dt;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));}
function advanceTimers(dt){now+=dt;for(const [id,timer]of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}}
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
test('Each spread has ten distinct cards from five factions, two per faction, and avoids the previous spread',()=>{
 for(let i=0;i<30;i++){
  const previous=JSON.parse(storage.get('boundary-title-preview')||'[]'),cards=Array.from(A.drawTitlePreviewCards()),counts=new Map();
  assert.equal(cards.length,10);assert.equal(new Set(cards.map(card=>card.id)).size,10);assert(cards.every(card=>!card.token&&!card.shopkeeper));
  for(const card of cards)counts.set(card.faction,(counts.get(card.faction)||0)+1);
  assert.equal(counts.size,5);assert([...counts.values()].every(count=>count===2));assert(cards.every(card=>!previous.includes(card.id)));
 }
});
test('Refresh remembers the previous paired spread, and blocked storage still allows ten cards',()=>{
 const previous=JSON.parse(storage.get('boundary-title-preview'));A.resetPrevious();const next=Array.from(A.drawTitlePreviewCards(),c=>c.id);assert(next.every(id=>!previous.includes(id)));
 const original=window.localStorage;window.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};A.resetPrevious();assert.equal(A.drawTitlePreviewCards().length,10);window.localStorage=original;
});
test('Every preview can be inspected and has no extra flip button',()=>{
 const cards=render().slice();assert.equal(cards.length,10);assert.equal(cards.filter(c=>c.dataset.faceDown==='true').length,2);
 for(const c of cards){assert.equal(c.attributes.role,'button');assert.equal(c.attributes.tabindex,'0');assert(c.attributes['aria-label'].includes(A.CARD[c.dataset.cardId].name));assert.equal(c.querySelector('.table-card-flip'),null);dispatch(c,'dblclick');}
 assert.deepEqual(inspected,cards.map(c=>c.dataset.cardId));assert(!css.includes('.table-card-flip'));
});
test('One click flips either face without moving, changing the card or opening inspection',()=>{
 for(const faceDown of ['false','true']){
  const c=render().find(card=>card.dataset.faceDown===faceDown),id=c.dataset.cardId,before=c.getBoundingClientRect();
  dispatch(c,'click');assert.equal(c.dataset.faceDown,String(faceDown!=='true'));assert.equal(c.dataset.cardId,id);assert.equal(inspected.length,0);assert.deepEqual(c.getBoundingClientRect(),before);
  assert.equal(c.querySelector('.table-card-front').attributes['aria-hidden'],c.dataset.faceDown);assert.equal(c.attributes['aria-pressed'],c.dataset.faceDown);
  dispatch(c,'click');assert.equal(c.dataset.faceDown,faceDown);assert.deepEqual(c.getBoundingClientRect(),before);
 }
});
test('Mouse, touch and pen tap releases flip once, even with a later compatibility click',()=>{
 for(const pointerType of ['mouse','touch','pen'])for(const detail of [0,1]){
  const c=render()[0];dispatch(c,'pointerdown',{pointerType});dispatch(c,'pointerup',{pointerType});assert.equal(c.dataset.faceDown,'true');assert.equal(A.drag(),null);
  dispatch(c,'click',{detail});assert.equal(c.dataset.faceDown,'true');assert.equal(inspected.length,0);
 }
});
test('F, Enter and Space flip a title card, I inspects it, and gameplay disables title input',()=>{
 const c=render()[0],id=c.dataset.cardId;dispatch(c,'keydown',{key:'ArrowRight'});const moved=c.getBoundingClientRect();
 dispatch(c,'keydown',{key:'F'});assert.equal(c.dataset.faceDown,'true');assert.deepEqual(c.getBoundingClientRect(),moved);
 dispatch(c,'keydown',{key:'Enter'});assert.equal(c.dataset.faceDown,'false');dispatch(c,'keydown',{key:' '});assert.equal(c.dataset.faceDown,'true');
 dispatch(c,'keydown',{key:'i'});assert.deepEqual(inspected,[id]);now+=500;
 dispatch(c,'pointerdown');dispatch(c,'pointermove',{clientX:160});dispatch(c,'pointerup',{clientX:160});assert.equal(c.dataset.faceDown,'true');assert.equal(c.dataset.cardId,id);
 el('game').classList.add('active');now+=500;dispatch(c,'click');dispatch(c,'keydown',{key:'f'});assert.equal(c.dataset.faceDown,'true');el('game').classList.remove('active');
});
test('The compact menu preserves exposed tabletop space and uses a two-column phone landscape note',()=>{
 assert.equal(styleValue('#setup.menu-paper','width'),'min(600px,calc(100vw - 112px))');
 assert.equal(styleValue('#setup.menu-paper','max-height'),'calc(100dvh - 48px)');
 assert.equal(styleValue('#setup.menu-paper','grid-template-columns'),'minmax(0,.9fr) minmax(0,1.2fr)');
 assert.equal(styleValue('.table-card-turn','transform-style'),'preserve-3d');assert.equal(styleValue('.table-card-front','backface-visibility'),'hidden');
});
function coverTitleCards(){const cards=render().slice();for(const card of cards)if(card.dataset.faceDown!=='true')dispatch(card,'click');return cards;}
function memory(){const nodes=coverTitleCards();advanceTimers(340);const session=A.memory();assert(session);advanceTimers(450);advanceTimers(450);assert.equal(session.phase,'ready');return {session,nodes};}
test('Only ten currently face-down cards unlock the game; turning one back up cancels the pending start',()=>{
 const cards=render().slice();for(const card of cards)dispatch(card,'click');advanceTimers(400);assert.equal(A.memory(),null,'flipping each once leaves the initially covered cards face-up');
 for(const card of cards)if(card.dataset.faceDown!=='true')dispatch(card,'click');advanceTimers(339);assert.equal(A.memory(),null);
 dispatch(cards[0],'click');advanceTimers(1);assert.equal(A.memory(),null);dispatch(cards[0],'click');advanceTimers(340);assert.equal(A.memory().phase,'collecting');
});
test('The same ten cards gather centrally, then spread on the original table without a modal or grid',()=>{
 const nodes=coverTitleCards();const original=new Set(nodes);advanceTimers(340);const session=A.memory();assert.equal(session.phase,'collecting');
 assert.equal(session.cards.length,10);assert(session.cards.every(card=>original.has(card.node)&&card.node.dataset.faceDown==='true'));
 assert(session.cards.every(card=>Math.abs(parseFloat(card.node.values.get('--table-x'))-window.innerWidth/2)<12));
 assert(document.body.classList.contains('title-memory-active'));assert.equal(el('title-memory-status').hidden,false);assert(!html.includes('id="title-memory-overlay"'));assert(!html.includes('id="title-memory-grid"'));
 dispatch(session.cards[0].node,'click');assert.equal(session.open.length,0);dispatch(session.cards[0].node,'pointerdown');assert.equal(A.drag(),null);
 advanceTimers(450);assert.equal(session.phase,'spreading');assert.equal(new Set(session.cards.map(card=>card.node.values.get('--table-y'))).size,2);
 assert.equal(new Set(session.cards.map(card=>card.node.values.get('--table-x'))).size,5);
 advanceTimers(450);assert.equal(session.phase,'ready');assert(session.cards.every(card=>!card.node.classList.contains('title-memory-arranging')));assert(!el('game').classList.contains('active'));
});
test('Mismatch waits before covering both cards, rejects a third flip and still allows free movement',()=>{
 const {session}=memory(),first=session.cards[0],second=session.cards.find(card=>card.faction!==first.faction),third=session.cards.find(card=>card!==first&&card!==second);
 dispatch(first.node,'click');dispatch(first.node,'click');assert.equal(session.open.length,1);assert.equal(session.attempts,0);
 dispatch(second.node,'click');dispatch(third.node,'click');assert.equal(session.attempts,1);assert(session.locked);assert.equal(third.node.dataset.faceDown,'true');
 const before=third.node.getBoundingClientRect();dragTo(third.node,before.left+before.width/2+45,before.top+before.height/2+20,'touch');assert.notEqual(third.node.getBoundingClientRect().left,before.left);assert.equal(third.node.dataset.faceDown,'true');
 advanceTimers(849);assert.equal(first.node.dataset.faceDown,'false');advanceTimers(1);assert.equal(first.node.dataset.faceDown,'true');assert.equal(second.node.dataset.faceDown,'true');assert.equal(session.open.length,0);assert(!session.locked);
});
test('Two different characters of the same faction match, reveal briefly and fly fully offscreen before removal',()=>{
 const {session}=memory(),first=session.cards[0],second=session.cards.find(card=>card!==first&&card.faction===first.faction);assert.notEqual(first.id,second.id);
 dispatch(first.node,'click');dispatch(second.node,'click');assert.equal(session.pairs,1);assert.equal(session.attempts,1);assert.equal(el('title-memory-pairs').textContent,'1/5');
 for(const card of [first,second]){assert(card.matched);assert(card.node.classList.contains('title-memory-matched'));assert.equal(card.node.dataset.faceDown,'false');dispatch(card.node,'click');assert.equal(card.node.attributes.tabindex,'-1');}
 assert.equal(session.attempts,1);advanceTimers(339);assert(first.node.isConnected);assert(!first.node.classList.contains('title-memory-flying'));
 advanceTimers(1);assert(first.node.classList.contains('title-memory-flying'));assert(parseFloat(first.node.values.get('--table-x'))<0);assert(parseFloat(second.node.values.get('--table-x'))>window.innerWidth);
 const exits=[first.node.values.get('--table-x'),second.node.values.get('--table-x')];for(const fn of events.resize)fn();assert.deepEqual([first.node.values.get('--table-x'),second.node.values.get('--table-x')],exits,'resize must not pull a flying card back onto the table');
 advanceTimers(699);assert(first.node.isConnected);advanceTimers(1);assert(!first.node.isConnected&&!second.node.isConnected);assert.equal(document.querySelectorAll('.table-scatter-card').length,8);
});
test('All five matches fly away, then replay generates a fresh ten-card faction game on the same table',()=>{
 const {session}=memory();for(const faction of new Set(session.cards.map(card=>card.faction)))for(const card of session.cards.filter(card=>card.faction===faction))dispatch(card.node,'click');
 assert.equal(session.pairs,5);assert.equal(session.attempts,5);assert(el('title-memory-replay').hidden);advanceTimers(340);advanceTimers(700);
 assert.equal(document.querySelectorAll('.table-scatter-card').length,0);assert.equal(session.phase,'complete');assert.equal(el('title-memory-message').textContent,'All pairs found!');assert.equal(el('title-memory-replay').hidden,false);
 el('title-memory-replay').onclick();const next=A.memory();assert.notEqual(next,session);assert.equal(next.pairs,0);assert.equal(next.attempts,0);assert.equal(next.cards.length,10);assert(next.cards.every(card=>card.node.dataset.faceDown==='true'));assert(el('title-memory-replay').hidden);
});
test('Closing during gathering, mismatch or a flight cancels old work, and stale callbacks cannot alter new cards',()=>{
 for(const stage of ['collecting','mismatch','flying']){
  let session;if(stage==='collecting'){coverTitleCards();advanceTimers(340);session=A.memory();}else{session=memory().session;const first=session.cards[0],second=session.cards.find(card=>stage==='mismatch'?card.faction!==first.faction:card!==first&&card.faction===first.faction);dispatch(first.node,'click');dispatch(second.node,'click');if(stage==='flying')advanceTimers(340);}
  const stale=[...session.timers].map(id=>timers.get(id)?.fn).filter(Boolean);el('title-memory-close').onclick();const fresh=el('title-table-cards').children.slice();for(const fn of stale)fn();advanceTimers(1200);
  assert.equal(A.memory(),null);assert.equal(document.querySelectorAll('.table-scatter-card').length,10);assert.deepEqual(el('title-table-cards').children,fresh);assert(!document.body.classList.contains('title-memory-active'));assert(el('title-memory-status').hidden);assert.equal(document.activeElement,el('start-btn'));
 }
});
test('Refresh and the real-game reset cancel both a pending unlock and an active gathering animation',()=>{
 coverTitleCards();A.renderTitleTableCards();advanceTimers(400);assert.equal(A.memory(),null);
 coverTitleCards();el('game').classList.add('active');advanceTimers(400);assert.equal(A.memory(),null);el('game').classList.remove('active');
 coverTitleCards();advanceTimers(340);ctx.resetGameView();advanceTimers(1200);assert.equal(A.memory(),null);assert(!document.body.classList.contains('title-memory-active'));
});
test('Ten-card layouts fit desktop, phone landscape and portrait, while ready cards remain freely draggable',()=>{
 for(const [width,height]of [[1200,800],[844,390],[480,320],[390,844]]){
  window.innerWidth=width;window.innerHeight=height;const layout=A.titleMemoryLayout();assert.equal(layout.points.length,10);
  for(const p of layout.points){assert(p.x-layout.width/2>=20);assert(p.x+layout.width/2<=width-20);assert(p.y-layout.width*2/3>=64);assert(p.y+layout.width*2/3<=height-64);}
  const {session}=memory(),card=session.cards[0],before=card.node.getBoundingClientRect();dragTo(card.node,width/2+20,height/2,'touch');assert.notEqual(card.node.getBoundingClientRect().left,before.left);assert.equal(card.node.dataset.faceDown,'true');
 }
 window.innerWidth=1200;window.innerHeight=800;
});
test('Reduced-motion users get the same five-pair game without travel animations',()=>{
 reduced=true;coverTitleCards();advanceTimers(340);advanceTimers(0);advanceTimers(0);const session=A.memory();assert.equal(session.phase,'ready');
 const first=session.cards[0],second=session.cards.find(card=>card!==first&&card.faction===first.faction);dispatch(first.node,'click');dispatch(second.node,'click');advanceTimers(0);advanceTimers(0);assert(!first.node.isConnected&&!second.node.isConnected);reduced=false;
});
test('An open card inspection postpones the all-backs trigger and Escape in the game returns to the setup',()=>{
 coverTitleCards();el('card-detail-overlay').classList.add('show');advanceTimers(340);assert.equal(A.memory(),null);el('card-detail-overlay').classList.remove('show');advanceTimers(340);advanceTimers(450);advanceTimers(450);assert(A.memory());
 let prevented=false;for(const fn of documentEvents.keydown||[])fn({key:'Escape',preventDefault(){prevented=true;}});assert(prevented);assert.equal(A.memory(),null);assert.equal(document.activeElement,el('start-btn'));
});
test('A double click or double tap opens inspection once, after the first tap flips the card',()=>{
 for(const pointerType of ['mouse','touch']){
  const c=render()[0],before=c.getBoundingClientRect();dispatch(c,'pointerdown',{pointerType});dispatch(c,'pointerup',{pointerType});dispatch(c,'click');
  assert.equal(inspected.length,0);assert.equal(c.dataset.faceDown,'true');assert.equal(c.parentElement,el('title-table-cards'));assert.deepEqual(c.getBoundingClientRect(),before);
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
test('Keyboard assistive clicks flip, and title input is inactive while playing',()=>{
 const c=render()[0];dispatch(c,'click',{detail:0});assert.equal(c.dataset.faceDown,'true');assert.equal(inspected.length,0);now+=500;el('game').classList.add('active');dispatch(c,'pointerdown');dispatch(c,'dblclick');dispatch(c,'keydown',{key:'Enter'});assert.equal(A.drag(),null);assert.equal(inspected.length,0);el('game').classList.remove('active');
});
test('Pointer cancellation restores the position and releases capture without an accidental inspection',()=>{
 const c=render()[0];dispatch(c,'pointerdown');const start={...A.drag().center};dispatch(c,'pointermove',{clientX:400,clientY:300});dispatch(c,'pointercancel');assert.equal(A.drag(),null);assert.equal(parseFloat(c.values.get('--table-x')),start.x);assert.equal(parseFloat(c.values.get('--table-y')),start.y);assert(!c.hasPointerCapture(1));dispatch(c,'click');assert.equal(inspected.length,0);
});
test('Arrow keys move title cards, Shift moves farther, and I inspects',()=>{
 const c=render()[0],before=c.getBoundingClientRect();dispatch(c,'keydown',{key:'ArrowRight'});assert.equal(parseFloat(c.values.get('--table-x')),before.left+before.width/2+12);dispatch(c,'keydown',{key:'ArrowDown',shiftKey:true});assert.equal(parseFloat(c.values.get('--table-y')),before.top+before.height/2+40);dispatch(c,'keydown',{key:'i'});assert.deepEqual(inspected,[c.dataset.cardId]);
});
test('A fresh spread removes moved cards and retires an unfinished drag',()=>{
 const c=render()[0];dispatch(c,'pointerdown');dispatch(c,'pointermove',{clientX:500});A.renderTitleTableCards();assert.equal(A.drag(),null);assert.equal(document.querySelectorAll('.table-scatter-card').length,10);assert(!document.querySelectorAll('.table-scatter-card').includes(c));assert.equal(inspected.length,0);
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
function peek(ids=['sdm_flandre','mtn_aya','hourai_mokou'],opts={}){
 el('game').classList.add('active');el('byakuren-peek-table').rect={left:200,top:110,width:760,height:290};el('byakuren-peek-hand').rect={left:200,top:460,width:760,height:240};
 const promise=A.openByakurenPeek(ids,opts);frame(0);return {promise,cards:el('byakuren-peek-cards').children.slice()};
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
test('On a phone, the first peek card can overlap the later card and becomes the next draw on top',async()=>{
 const {promise,cards}=peek();dragTo(cards[2],580,565,'touch');const other=cards[1].getBoundingClientRect(),x=other.left+other.width/2,y=other.top+other.height/2;
 dragTo(cards[0],x,y,'touch');assert(Number(cards[0].style.zIndex)>Number(cards[1].style.zIndex||1));assert(cards[0].querySelector('.peek-order').textContent.includes('Next draw'));
 el('byakuren-peek-confirm').onclick();const result=await promise;assert.equal(result.taken,'hourai_mokou');assert.deepEqual(Array.from(result.order),['sdm_flandre','mtn_aya']);
});
test('The take button supports click/keyboard users, and cards can be exchanged or returned before confirming',async()=>{
 const {promise,cards}=peek();dispatch(cards[0],'click');el('byakuren-peek-take').onclick();assert(cards[0].classList.contains('peek-taken'));dragTo(cards[1],580,565);assert(!cards[0].classList.contains('peek-taken'));assert(cards[1].classList.contains('peek-taken'));dragTo(cards[1],650,255);assert(el('byakuren-peek-confirm').disabled);dispatch(cards[2],'click');el('byakuren-peek-take').onclick();el('byakuren-peek-confirm').onclick();assert.equal((await promise).taken,'hourai_mokou');
});
test('Cancelling a peek clears pointer capture and never commits cards to a new game',async()=>{
 const {promise,cards}=peek();dispatch(cards[0],'pointerdown');dispatch(cards[0],'pointermove',{clientX:600});A.cancelPeek();assert.equal(await promise,null);assert.equal(A.drag(),null);assert(!cards[0].hasPointerCapture(1));assert.equal(el('byakuren-peek-cards').children.length,0);
});
test('New ability tables let mouse, touch and pen leave cards anywhere and build real stacks before confirming',async()=>{
 for(const pointerType of ['mouse','touch','pen']){
  let committed=false;const {promise,cards}=peek(undefined,{choice:true,title:'Choose card',destination:'Your Hand',source:'Draw pile'});promise.then(()=>committed=true);
  dragTo(cards[0],400,255,pointerType);dragTo(cards[1],400,255,pointerType);
  assert.equal(parseFloat(cards[0].values.get('--table-x')),400);assert.equal(parseFloat(cards[1].values.get('--table-x')),400);
  assert(Number(cards[1].style.zIndex)>Number(cards[0].style.zIndex));assert(el('byakuren-peek-confirm').disabled);await Promise.resolve();assert(!committed);
  dragTo(cards[1],580,565,pointerType);assert(cards[1].classList.contains('peek-taken'));await Promise.resolve();assert(!committed,'dropping stages the card instead of automatically committing');
  dragTo(cards[1],720,245,pointerType);assert(el('byakuren-peek-confirm').disabled);assert.equal(parseFloat(cards[1].values.get('--table-x')),720);
  dragTo(cards[0],580,565,pointerType);el('byakuren-peek-confirm').onclick();assert.equal((await promise).taken,'sdm_flandre');
 }
});
test('Replacing a staged choice returns the previous card to its freely chosen parking position',async()=>{
 const {promise,cards}=peek(undefined,{choice:true,title:'Choose card',destination:'Must play next turn',source:'AI 1’s hand'});
 dragTo(cards[0],340,210,'touch');dragTo(cards[0],580,565,'touch');dragTo(cards[1],580,565,'touch');
 assert.equal(parseFloat(cards[0].values.get('--table-x')),340);assert.equal(parseFloat(cards[0].values.get('--table-y')),210);assert(!cards[0].classList.contains('peek-taken'));
 assert.equal(cards[1].querySelector('.peek-order').textContent,'Must play next turn');el('byakuren-peek-confirm').onclick();assert.equal((await promise).taken,'mtn_aya');
});
function discardChoice(count=3,ids=['sdm_flandre','mtn_aya','hourai_mokou'],cardGroups={sdm_flandre:0,mtn_aya:1,hourai_mokou:2}){
 const groups=Array.from({length:count},(_,i)=>({key:i,label:i===0?'You':`AI ${i}`,kind:'Discard pile'}));
 return peek(ids,{choice:true,title:'Rin: take a card from any discard pile',destination:'Your Hand',groups,cardGroups,sourceLabels:Object.fromEntries(ids.map(id=>[id,`${groups[cardGroups[id]].label} · Discard pile`]))});
}
test('Rin divides two, three and four players’ discard piles according to their real seat positions, including empty piles',async()=>{
 for(const count of [2,3,4]){
  const {promise,cards}=discardChoice(count,count===2?['sdm_flandre','mtn_aya']:undefined),groups=el('byakuren-peek-groups').children;
  assert.equal(groups.length,count);assert(!el('byakuren-peek-groups').hidden);assert(el('byakuren-peek-source').hidden);
  assert.equal(groups[0].style.left,'0%');assert.equal(groups[0].style.top,'50%');
  assert.equal(groups[1].style.left,count===2?'50%':'0%');assert.equal(groups[1].style.top,'0%');
  if(count>=3){assert.equal(groups[2].style.left,'50%');assert.equal(groups[2].style.top,'0%');}
  if(count===4){assert.equal(groups[3].style.left,'50%');assert.equal(groups[3].style.top,'50%');assert.equal(groups[3].querySelector('.peek-pile-empty').textContent,'Empty discard pile');}
  for(const [i,card]of cards.entries()){
   const area=A.cardChoiceGroupRect(el('byakuren-peek-table').getBoundingClientRect(),i,count),rect=card.getBoundingClientRect();
   assert(rect.left>=area.left && rect.left+rect.width<=area.left+area.width);assert(rect.top>=area.top+30 && rect.top+rect.height<=area.top+area.height);
   assert.equal(groups[i].querySelector('.peek-pile-heading').querySelector('.peek-pile-count').textContent,'1 card');
  }
  A.cancelPeek();assert.equal(await promise,null);
 }
});
test('Rin preserves original ownership when a card is freely moved into another player’s region',async()=>{
 const {promise,cards}=discardChoice();dragTo(cards[1],850,330,'touch');assert.equal(cards[1].querySelector('.peek-order').textContent,'AI 1 · Discard pile');
 dragTo(cards[1],580,565,'touch');el('byakuren-peek-confirm').onclick();assert.equal((await promise).taken,'mtn_aya');
});
test('Phone landscape fits dense discard piles below their headings and lets the bottom card be pulled out',async()=>{
 const original={width:window.innerWidth,height:window.innerHeight};window.innerWidth=844;window.innerHeight=390;
 el('game').classList.add('active');el('byakuren-peek-table').rect={left:40,top:85,width:764,height:180};el('byakuren-peek-hand').rect={left:40,top:278,width:764,height:60};
 const ids=Object.keys(A.CARD).slice(0,10),groups=[{key:0,label:'You'},{key:1,label:'AI 1'},{key:2,label:'AI 2'}];
 const promise=A.openByakurenPeek(ids,{choice:true,title:'Choose card',groups,cardGroups:Object.fromEntries(ids.map(id=>[id,1])),sourceLabels:Object.fromEntries(ids.map(id=>[id,'AI 1 · Discard pile']))});
 frame(0);const cards=el('byakuren-peek-cards').children,area=A.cardChoiceGroupRect(el('byakuren-peek-table').getBoundingClientRect(),1,3);
 for(const card of cards){const rect=card.getBoundingClientRect();assert(rect.left>=area.left && rect.left+rect.width<=area.left+area.width);assert(rect.top>=area.top+30 && rect.top+rect.height<=area.top+area.height);}
 dragTo(cards[0],550,215,'touch');assert.equal(parseFloat(cards[0].values.get('--table-x')),550);assert(Number(cards[0].style.zIndex)>Number(cards[9].style.zIndex||1));
 dragTo(cards[0],422,308,'touch');el('byakuren-peek-confirm').onclick();assert.equal((await promise).taken,ids[0]);window.innerWidth=original.width;window.innerHeight=original.height;
});
test('Resizing an ability table preserves freely parked positions and the staged choice',async()=>{
 const {promise,cards}=discardChoice();dragTo(cards[0],600,270,'touch');dragTo(cards[1],580,565,'touch');
 el('byakuren-peek-table').rect={left:50,top:80,width:680,height:170};el('byakuren-peek-hand').rect={left:50,top:265,width:680,height:60};for(const fn of events.resize)fn();
 assert(Math.abs(parseFloat(cards[0].values.get('--table-x'))-(50+400*680/760))<.001);
 assert(Math.abs(parseFloat(cards[0].values.get('--table-y'))-(80+160*170/290))<.001);
 assert(cards[1].classList.contains('peek-taken'));assert.equal(parseFloat(cards[1].values.get('--table-y')),295);el('byakuren-peek-confirm').onclick();assert.equal((await promise).taken,'mtn_aya');
});
test('Cancelling a held Rin choice releases it and clears pile regions before reopening Byakuren',async()=>{
 const {promise,cards}=discardChoice();dispatch(cards[0],'pointerdown');dispatch(cards[0],'pointermove',{clientX:650,clientY:200});A.cancelPeek();assert.equal(await promise,null);assert(!cards[0].hasPointerCapture(1));assert.equal(el('byakuren-peek-groups').children.length,0);
 const next=peek();assert(!el('byakuren-peek-overlay').classList.contains('card-choice'));assert(!el('byakuren-peek-overlay').classList.contains('peek-grouped'));assert(el('byakuren-peek-groups').hidden);assert(!el('byakuren-peek-source').hidden);assert.equal(el('byakuren-peek-confirm').textContent,'Confirm order and take card');A.cancelPeek();assert.equal(await next.promise,null);
});
function flick(node,dx=90,dy=20,pointerType='touch',hold=0){
 const rect=node.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
 dispatch(node,'pointerdown',{clientX:x,clientY:y,pointerType,timeStamp:now});
 now+=16;dispatch(node,'pointermove',{clientX:x+dx/2,clientY:y+dy/2,pointerType,timeStamp:now});
 now+=16;dispatch(node,'pointermove',{clientX:x+dx,clientY:y+dy,pointerType,timeStamp:now});
 now+=hold;dispatch(node,'pointerup',{clientX:x+dx,clientY:y+dy,pointerType,timeStamp:now});
 return {x:x+dx,y:y+dy};
}
test('Sliding friction slows cards to rest and produces the same travel at different frame rates',()=>{
 const bounds={left:-10000,right:10000,top:-10000,bottom:10000},whole={x:0,y:0,vx:700,vy:350,angle:0,spin:14},framesBody={...whole};
 A.stepTableCardSlide(whole,1,bounds);let lastSpeed=Math.hypot(framesBody.vx,framesBody.vy);
 for(let i=0;i<60;i++){A.stepTableCardSlide(framesBody,1/60,bounds);const speed=Math.hypot(framesBody.vx,framesBody.vy);assert(speed<=lastSpeed+.000001);lastSpeed=speed;}
 assert(Math.abs(whole.x-framesBody.x)<.000001);assert(Math.abs(whole.y-framesBody.y)<.000001);assert(Math.abs(whole.angle-framesBody.angle)<.000001);assert.equal(lastSpeed,0);
 assert(Math.abs(Math.hypot(whole.x,whole.y)-(700*700+350*350)/(2*2400))<.000001);
});
test('Mouse, touch and pen throws continue after release, stop with friction and keep cards reachable',()=>{
 for(const type of ['mouse','touch','pen']){
  const card=render()[0],release=flick(card,90,20,type);assert.equal(A.slideCount(),1);assert(card.classList.contains('table-card-sliding'));assert(!card.hasPointerCapture(1));
  frame();assert(parseFloat(card.values.get('--table-x'))>release.x);assert(parseFloat(card.values.get('--table-y'))>release.y);
  for(let i=0;i<60 && A.slideCount();i++)frame();assert.equal(A.slideCount(),0);assert(!card.classList.contains('table-card-sliding'));assert(parseFloat(card.values.get('--table-x'))<=window.innerWidth-24);assert.equal(inspected.length,0);
  const restingX=card.values.get('--table-x');frame(250);assert.equal(card.values.get('--table-x'),restingX);assert.equal(frames.size,0);
 }
});
test('An off-centre grip introduces a small physical rotation and keeps the resting angle when picked up again',()=>{
 const card=render()[0],rect=card.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2+30,angle=Number(card.dataset.angle);
 dispatch(card,'pointerdown',{clientX:x,clientY:y,timeStamp:now});now+=16;dispatch(card,'pointermove',{clientX:x+55,clientY:y,timeStamp:now});now+=16;dispatch(card,'pointerup',{clientX:x+100,clientY:y,timeStamp:now});
 assert(A.slideCount());for(let i=0;i<60 && A.slideCount();i++)frame();const resting=Number(card.dataset.angle);assert(resting>angle);assert(resting-angle<12);
 const moved=card.getBoundingClientRect();dispatch(card,'pointerdown',{clientX:moved.left+moved.width/2,clientY:moved.top+moved.height/2,timeStamp:now});assert.equal(A.drag().angle,resting);dispatch(card,'pointercancel');
});
test('Holding a card still before release or using reduced motion prevents an unwanted throw',()=>{
 let card=render()[0];flick(card,90,20,'touch',150);assert.equal(A.slideCount(),0);
 reduced=true;card=render()[0];const release=flick(card);assert.equal(A.slideCount(),0);frame();assert.equal(parseFloat(card.values.get('--table-x')),release.x);reduced=false;
});
test('A sliding card can be picked up at its current position without jumping or retaining the previous throw',()=>{
 const card=render()[0];flick(card);frame();const x=parseFloat(card.values.get('--table-x')),y=parseFloat(card.values.get('--table-y'));
 dispatch(card,'pointerdown',{clientX:x,clientY:y,timeStamp:now});assert.equal(A.slideCount(),0);assert.equal(A.drag().center.x,x);assert.equal(parseFloat(card.values.get('--table-x')),x);
 frame();assert.equal(parseFloat(card.values.get('--table-x')),x);dispatch(card,'pointercancel');assert.equal(A.drag(),null);
});
test('Virtual screen edges stop sliding cards rather than allowing them to disappear offscreen',()=>{
 const bounds={left:24,top:24,right:456,bottom:296},body={x:454,y:80,vx:900,vy:150,angle:2,spin:0};
 A.stepTableCardSlide(body,.04,bounds);assert.equal(body.x,456);assert.equal(body.vx,0);assert(body.y>80);
 for(let i=0;i<60;i++)A.stepTableCardSlide(body,1/60,bounds);assert(body.x<=456 && body.y<=296);assert.equal(Math.hypot(body.vx,body.vy),0);
});
test('Ability choices stop inside the hand target, while incidental sliding across it cannot select a card',async()=>{
 let session=peek(undefined,{choice:true,title:'Choose card',destination:'Your Hand',source:'Draw pile'});
 const rect=session.cards[0].getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
 flick(session.cards[0],580-x,565-y);assert(session.cards[0].classList.contains('peek-taken'));assert.equal(A.slideCount(),0);el('byakuren-peek-confirm').onclick();assert.equal((await session.promise).taken,'sdm_flandre');
 session=peek(undefined,{choice:true,title:'Choose card',destination:'Your Hand',source:'Draw pile'});dragTo(session.cards[0],580,420);
 flick(session.cards[0],0,32);assert(!session.cards[0].classList.contains('peek-taken'));assert.equal(A.slideCount(),1);
 for(let i=0;i<60 && A.slideCount();i++)frame();assert(parseFloat(session.cards[0].values.get('--table-y'))>460);assert(!session.cards[0].classList.contains('peek-taken'));assert(el('byakuren-peek-confirm').disabled);A.cancelPeek();assert.equal(await session.promise,null);
});
test('Confirming Byakuren reads the current physical order and cancels any remaining slides',async()=>{
 const {promise,cards}=peek();dragTo(cards[0],580,565);dragTo(cards[1],450,230);dragTo(cards[2],650,230);
 flick(cards[2],-90,0);assert.equal(A.slideCount(),1);frame();const before=cards[2].values.get('--table-x');el('byakuren-peek-confirm').onclick();assert.equal(A.slideCount(),0);assert.equal(frames.size,0);
 const result=await promise;assert.equal(result.taken,'sdm_flandre');assert.deepEqual(Array.from(result.order),['mtn_aya','hourai_mokou']);frame();assert.equal(cards[2].values.get('--table-x'),before);
});
test('Closing an ability, refreshing the menu, blur and resize retire old sliding frames',async()=>{
 const {promise,cards}=discardChoice();flick(cards[1],40,15);assert.equal(A.slideCount(),1);A.cancelPeek();assert.equal(await promise,null);assert.equal(A.slideCount(),0);frame();assert.equal(el('byakuren-peek-cards').children.length,0);
 for(const event of ['blur','resize']){const card=render()[0];flick(card);assert.equal(A.slideCount(),1);for(const fn of events[event])fn();assert.equal(A.slideCount(),0);const x=card.values.get('--table-x');frame();assert.equal(card.values.get('--table-x'),x);}
 const card=render()[0];flick(card);A.renderTitleTableCards();assert.equal(A.slideCount(),0);assert(!card.isConnected);assert.equal(frames.size,0);
});
test('The oval mat is removed from the match and tutorial board, with no stale CSS selectors',()=>{
 assert(!html.includes('id="table-surface"'));assert(!css.includes('#table-surface'));assert(html.includes('<div id="board"></div>'));assert(css.includes('#table-wrap{ position:relative; display:flex; align-items:center; justify-content:center;'));
});
test('Wood follows the background hue, and reset clears tint',()=>{
 A.showCrownBackdrop('hell_hecatia');assert.equal(document.body.values.get('--wood-rgb'),'117,64,159');assert.notEqual(document.body.values.get('--wood-rgb'),A.CROWN_LIGHT_PALETTES.hell_hecatia.rgb);assert(css.includes('background-blend-mode:color,normal'));assert(css.includes('rgb(var(--wood-rgb,var(--scene-rgb)))'));assert.equal(A.averageWoodColor([70,30,190,255,70,30,190,255]),'70,30,190');assert.equal(A.averageWoodColor([0,0,0,0]),null);A.clearCrownBackdrop();assert(!document.body.values.has('--wood-rgb'));assert(!el('game').values.has('--wood-rgb'));
});
(async()=>{for(const [name,fn]of tests){await fn();console.log('PASS '+name);}console.log(`${tests.length}/${tests.length} table preview checks passed`);})().catch(e=>{console.error(e);process.exitCode=1;});
