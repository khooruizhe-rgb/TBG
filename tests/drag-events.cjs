// Event-level interaction checks. DOM geometry, RAF, and WAAPI are simulated;
// this does not replace a real-browser visual/device check.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||'touhou_board_game_github_textures.html','utf8');
const js=html.split('<script>')[1].split('</script>')[0];
let now=0,reduced=false,nextFrame=0,frames=new Map(),animations=[],elements=[],listeners={};
class Element {
  constructor(kind='control',rect={left:0,top:0,width:10,height:10},dataset={}){
    this.kind=kind;this.rect=rect;this.dataset=dataset;this.style={};this.isConnected=true;this.capture=null;
    const classes=new Set();this.classList={add:(...names)=>names.forEach(n=>classes.add(n)),remove:(...names)=>names.forEach(n=>classes.delete(n)),contains:n=>classes.has(n),toggle(n,on){if(on)classes.add(n);else classes.delete(n);}};
  }
  getBoundingClientRect(){return this.rect;}
  cloneNode(){return new Element(this.kind,{...this.rect},{...this.dataset});}
  closest(selector){if(selector==='#kourindou')return this.kind==='shop'?this:null;if(selector.includes('.cell') && ['board','shop'].includes(this.kind))return this;return null;}
  setAttribute(){} removeAttribute(){} addEventListener(){}
  setPointerCapture(id){this.capture=id;} hasPointerCapture(id){return this.capture===id;} releasePointerCapture(){this.capture=null;}
  remove(){this.isConnected=false;}
  animate(keyframes,options){
    let done,cancel;const finished=new Promise((res,rej)=>{done=res;cancel=rej;});
    const animation={keyframes,options,finished,done,cancel:()=>cancel(new Error('cancelled'))};animations.push(animation);return animation;
  }
}
const controls=new Map();const el=id=>{if(!controls.has(id))controls.set(id,new Element());return controls.get(id);};
const document={body:{appendChild:e=>elements.push(e)},
  addEventListener(type,fn){(listeners[type]||=[]).push(fn);},
  elementFromPoint(x,y){return elements.find(e=>e.isConnected && ['board','shop'].includes(e.kind) && x>=e.rect.left && y>=e.rect.top && x<e.rect.left+e.rect.width && y<e.rect.top+e.rect.height)||null;}};
const window={__resolveHumanTurn:()=>{},matchMedia:()=>({matches:reduced}),addEventListener:(type,fn)=>document.addEventListener(type,fn)};
const context={console,Math,Date,Promise,Set,Map,document,window,el,performance:{now:()=>now},
  requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id),
  renderBoard(){},renderStatus(){},syncHandSelection(){},renderAll(){},playGameCue(){},speakRinnosuke(){},
  CARD:{plain:{name:'Plain',id:'plain'}},canAct:()=>true};
vm.createContext(context);
const choice=js.slice(js.indexOf('function isShopSelectable'),js.indexOf('function onCellDragOver'));
const hand=js.slice(js.indexOf('function humanActionCells'),js.indexOf('/* Clicking anywhere outside the board/hand/cancel-button'));
vm.runInContext('let game=null,pendingCellChoice=null,selectedHandCard=null,draggingCardId=null,humanActionResolving=false;'+choice+hand+`
  this.api={onHandCardPointerDown,onHandCardClick,clearHandDragPhysics,commitShopChoice,
    setGame:g=>game=g,get:()=>({game,pendingCellChoice,touchHandDrag,handDragSettling,draggingCardId}),
    reset:()=>{clearHandDragPhysics();pendingCellChoice=selectedHandCard=draggingCardId=suppressTouchDropClick=null;humanActionResolving=false;window.__resolveHumanTurn=()=>{};}};`,context);
const A=context.api;
function fixture(shop=false){
  A.reset();elements=[];animations=[];frames.clear();now=0;reduced=false;
  const cards=new Map();const g={cancelled:false,currentPlayerIdx:0,players:[{hand:['plain']}],forcedPlay:{},
    shopTiles:shop?[{r:6,c:1,slot:0}]:[],shopCards:shop?['shop_rinnosuke']:[],
    emptyOrWastelandForCard:()=>[{r:0,c:0}],canTrade:()=>shop,boardCells:()=>shop?[{r:6,c:1,id:'shop_rinnosuke'}]:[],
    cardAt:(r,c)=>r===6?'shop_rinnosuke':cards.get(`${r},${c}`),
    removeFromHand(p,id){this.players[p].hand=this.players[p].hand.filter(x=>x!==id);},
    async internalPlace(id,r,c){cards.set(`${r},${c}`,id);return {};},tradeCells:()=>[{r:6,c:0}],resolveKoishiCascade:async()=>{}};
  A.setGame(g);
  const source=new Element('hand',{left:20,top:400,width:100,height:150});
  const tile=new Element('board',{left:250,top:100,width:80,height:120},{r:'0',c:'0'});elements.push(tile);
  const keeper=new Element('shop',{left:500,top:100,width:80,height:120},{r:'6',c:'1',slot:'0'});if(shop)elements.push(keeper);
  return {g,source,tile,keeper};
}
function event(type,x=70,y=475,pointerType='mouse',extra={}){
  const e={pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y,pointerType,cancelable:true,
    preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};
  for(const fn of listeners[type]||[])fn(e);return e;
}
function down(f,type='mouse',x=70,y=475,extra={}){A.onHandCardPointerDown({currentTarget:f.source,pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y,pointerType:type,...extra},'plain');}
function frame(dt=16){now+=dt;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));}
async function finishAnimations(){animations.forEach(a=>a.done());for(let i=0;i<6;i++)await Promise.resolve();}
const tests=[];function test(name,fn){tests.push([name,fn]);}
for(const type of ['mouse','touch','pen'])test(`${type} drag follows spring, then commits the pointer's tile after settling`,async()=>{
  const f=fixture();down(f,type);event('pointermove',72,473,type);assert.equal(A.get().touchHandDrag.started,false);
  event('pointermove',110,440,type);frame();assert(f.source.classList.contains('dragging'));assert.equal(f.source.capture,1);
  event('pointermove',290,160,type);frame();const d=A.get().touchHandDrag;
  assert(Math.abs(d.body.angle)>0);assert(Math.hypot(d.goal.x-d.body.x,d.goal.y-d.body.y)<=65.001);
  assert(f.tile.classList.contains('drag-hover'));event('pointerup',290,160,type);
  assert.equal(f.g.cardAt(0,0),undefined);assert(A.get().handDragSettling);assert.equal(f.source.capture,null);
  await finishAnimations();assert.equal(f.g.cardAt(0,0),'plain');assert.equal(f.g.players[0].hand.length,0);
  assert.equal(A.get().handDragSettling,false);assert.equal(A.get().pendingCellChoice,null);
  assert(elements.filter(e=>e.isConnected && e.classList.contains('touch-drag-ghost')).length===0);
  const click=event('click',290,160,type);assert(click.prevented && click.stopped);
});
test('An invalid drop returns the card and clears its selection',async()=>{
  const f=fixture();down(f);event('pointermove',110,440);frame();event('pointerup',900,50);
  assert.equal(A.get().pendingCellChoice,null);await finishAnimations();assert.deepEqual(f.g.players[0].hand,['plain']);
  assert.equal(A.get().handDragSettling,false);assert.equal(animations[0].options.duration,260);
});
for(const type of ['pointercancel','blur','Escape'])test(`${type} cancels without placing a card`,async()=>{
  const f=fixture();down(f);event('pointermove',290,160);frame();
  if(type==='Escape')event('keydown',0,0,'mouse',{key:'Escape'});else event(type);
  await finishAnimations();assert.equal(f.g.cardAt(0,0),undefined);assert.equal(A.get().pendingCellChoice,null);assert.equal(A.get().touchHandDrag,null);
});
test('Reset during a held drag removes its ghost and cancels its frame',()=>{
  const f=fixture();down(f);event('pointermove',290,160);frame();A.reset();
  assert.equal(frames.size,0);assert.equal(A.get().touchHandDrag,null);assert.equal(f.source.capture,null);
  assert(elements.filter(e=>e.isConnected && e.classList.contains('touch-drag-ghost')).length===0);
});
test('Reset during settling prevents a stale placement into a new game',async()=>{
  const f=fixture();down(f);event('pointermove',290,160);frame();event('pointerup',290,160);
  A.reset();const next=fixture();await finishAnimations();assert.equal(f.g.cardAt(0,0),undefined);assert.equal(next.g.cardAt(0,0),undefined);
  assert.equal(A.get().handDragSettling,false);
});
test('Reduced motion follows directly and uses a short settle',async()=>{
  const f=fixture();reduced=true;down(f);event('pointermove',290,160);frame();const body=A.get().touchHandDrag.body;
  assert.equal(body.x,290);assert.equal(body.y,160);assert.equal(body.angle,0);assert.equal(body.scale,1);
  event('pointerup',290,160);assert.equal(animations[0].options.duration,70);await finishAnimations();assert.equal(f.g.cardAt(0,0),'plain');
});
test('Dragging preserves an off-centre grab point',()=>{
  const f=fixture();down(f,'mouse',25,410);event('pointermove',280,160);frame();
  assert.equal(A.get().touchHandDrag.goal.x,325);assert.equal(A.get().touchHandDrag.goal.y,225);
});
test('Tap below the movement threshold preserves click-to-select placement',async()=>{
  const f=fixture();down(f,'touch');event('pointermove',75,471,'touch');event('pointerup',75,471,'touch');
  assert.equal(animations.length,0);A.onHandCardClick('plain');event('click',290,160);
  context.onCellClick({currentTarget:f.tile});await finishAnimations();assert.equal(f.g.cardAt(0,0),'plain');
});
test('A shop drop opens merchandise selection and keeps the held card',async()=>{
  const f=fixture(true);down(f);event('pointermove',540,160);frame();assert(f.keeper.classList.contains('drag-hover'));
  event('pointerup',540,160);await finishAnimations();assert(A.get().pendingCellChoice.shopTrade);assert.deepEqual(f.g.players[0].hand,['plain']);
});
test('Forced cards, another pointer, and right clicks cannot start an unauthorized drag',()=>{
  let f=fixture();f.g.forcedPlay[0]='other';down(f);event('pointermove',290,160);assert.equal(A.get().touchHandDrag,null);assert.equal(animations.length,0);
  f=fixture();down(f,'mouse',70,475,{button:2});assert.equal(A.get().touchHandDrag,null);
  down(f);event('pointermove',290,160,'mouse',{pointerId:2});assert.equal(A.get().touchHandDrag.started,false);
});
(async()=>{let count=0;for(const [name,fn] of tests){await fn();console.log('PASS '+name);count++;}A.reset();console.log(`${count}/${tests.length} event-level interaction checks passed.`);})().catch(e=>{console.error(e);process.exitCode=1;});
