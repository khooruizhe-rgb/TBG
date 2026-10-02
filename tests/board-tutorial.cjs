// Exercise guided practice through the real engine and human action/choice handlers.
// DOM layout and visual effects are simulated; this is not a browser rendering test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2] || (fs.existsSync('touhou_board_game_github_textures.html')
  ? 'touhou_board_game_github_textures.html' : path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(file,'utf8'),js=html.split('<script>')[1].split('</script>')[0];
new vm.Script(js);
const nodes=new Map(),all=[];
class Element{
  constructor(id=''){this.id=id;this.dataset={};this.style={removeProperty(){}};this.children=[];this.events={};this.isConnected=true;this.hidden=false;
    const names=new Set();this.classList={add:(...n)=>n.forEach(x=>names.add(x)),remove:(...n)=>n.forEach(x=>names.delete(x)),contains:n=>names.has(n),toggle:(n,on)=>on?names.add(n):names.delete(n)};all.push(this);}
  set innerHTML(s){this.markup=s;this.replaceChildren();}get innerHTML(){return this.markup||'';}
  replaceChildren(...items){this.children=[];items.forEach(x=>this.appendChild(x));}
  appendChild(n){n.parentElement?.children.splice(n.parentElement.children.indexOf(n),1);n.parentElement=this;this.children.push(n);}
  prepend(n){this.appendChild(n);this.children.splice(this.children.indexOf(n),1);this.children.unshift(n);}
  insertBefore(n,b){this.appendChild(n);this.children.splice(this.children.indexOf(n),1);this.children.splice(this.children.indexOf(b),0,n);}
  addEventListener(type,fn){(this.events[type]??=[]).push(fn);}removeEventListener(){}
  querySelector(s){return this.children.find(n=>s==='.layout'&&n.id==='layout')||null;}
  setAttribute(){}focus(){document.activeElement=this;}scrollIntoView(){}
  remove(){this.parentElement?.children.splice(this.parentElement.children.indexOf(this),1);this.isConnected=false;}
}
const el=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};
const document={body:new Element(),documentElement:new Element(),activeElement:null,addEventListener(){},removeEventListener(){},
  querySelectorAll:s=>s==='.tutorial-focus'?all.filter(n=>n.classList.contains('tutorial-focus')):[]};
el('game').appendChild(el('layout'));el('log-panel').appendChild(el('tutorial-coach'));el('tutorial-coach').hidden=true;
const tiles=new Map(),effects=[];
let holdEffects=null,normalStarts=0;
const context={console,Math,Set,Map,Promise,document,el,window:{scrollTo(){}},screen:{orientation:{unlock(){}}},
  setTimeout:fn=>{fn();return 0;},clearTimeout(){},queueMobileViewport(){},setRuleText:(n,s)=>n.textContent=s,
  triggerPlacementPresentation(){},speakRinnosuke(){},captureHandPlacementArrival(){},syncHandSelection(){},
  clearHandDragPhysics(){},clearHandPlacementArrivals(){},closeMobileJournal(){},clearRinnosukeBubble(){},clearCrownBackdrop(){},clearMindEffects(){},
  removeYuukaBloom(){},releaseRectPointer(){},clearExpansionEffects(){},closeCardDetails(){},updateStartButtonState(){},
  playGameCue(){},canAct:()=>true,requestAnimationFrame:fn=>fn(),clearRectPreview(){},renderStatus(){},renderBoard(){},
  tileElement:(r,c)=>{const key=r+','+c;if(!tiles.has(key)){const n=new Element();n.dataset={r,c};tiles.set(key,n);}return tiles.get(key);},
  waitForVisualEffects:()=>holdEffects?holdEffects.promise:Promise.resolve(true),runNextTurn:()=>normalStarts++,
  ui:{onDrawCard:d=>effects.push(['draw',d.playerIdx,d.cardId]),onDrawPileReturn:d=>effects.push(['return',d.cardId]),
    onDiscard:d=>effects.push(['discard',d.cardId]),onShopTrade:d=>effects.push(['trade',d.offeredId,d.boughtId]),
    render:()=>context.renderAll()},
  renderHand(){const g=context.api.game();if(!g||g.cancelled)return;el('hand').replaceChildren(...g.players[0].hand.map(id=>{
    const n=new Element();n.dataset.cardId=id;n.onclick=()=>{const p=context.api.pending().hand;if(p)context.api.toggleHandChoiceCard(p,id);else context.api.onHandCardClick(id);};return n;
  }));context.api.updateTutorialProgress();},
  renderAll(){context.renderHand();context.api.updateTutorialProgress();}
};
vm.createContext(context);
const slice=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a)));
vm.runInContext(slice('const DIRS4','/* ===================== UI layer')+`
  let game=null,selectedHandCard=null,pendingCellChoice=null,pendingHandChoice=null,pendingPlayerChoice=null,pendingRectChoice=null;
  let humanActionResolving=false,handDragSettling=false,draggingCardId=null,lastPlacedCell=null,stuckStreak=0,timeStopDepth=0;
  let suppressTouchDropClick=null,announcedGameResult=null,cancelLookIntoView=null,cancelKoishiWalk=null,activeTenshiUpdraft=null,cancelRemiliaGather=null;
  const presentationWaiters=new Set(),sanaeArrivalUntil=new Map(),mokouArrivalUntil=new Map(),yukariArrivalUntil=new Map(),yuukaSunflowerUntil=new Map(),yuukaSunflowerBlooms=new Map(),wastelandCreationUntil=new Map(),remiliaArrivals=new Map(),koishiArrivalUntil=new Map();
  let chosenBoardSize=5,chosenPlayerCount=4,chosenKourindou=false,chosenAIDifficulty='easy',customizeOn=false;
  const customSelected=new Set();
  function cancelHandSelection(){selectedHandCard=null;pendingCellChoice=null;}
`+
  slice('function updateHandChoiceActions(){','function renderHand(){')+
  slice('function humanActionCells(cardId){','/* Dragging a hand card')+
  slice('async function doPlayerAction(playerIdx){','/* Recursively resolves')+
  slice('function commitCellChoice(r, c){','function onCellDragOver(e){')+
  slice("el('draw-btn').addEventListener('click', async () => {",'/* ---------- Setup screen wiring')+
  slice('function resetGameView(){','/* Rinnosuke speaks from')+
  slice('/* Guided practice uses','/* CSS lays out the phone table')+
  `
  Object.assign(ui,{
`+slice('  pickOwnHandCards(title, cardIds, opts={}){','  pickHandCard(title,')+
  slice('  pickRectByDrag(dim, title, isValid){','  promptText(title){')+
  `});
  this.api={openTutorial,tutorialStep,renderTutorial,updateTutorialProgress,tutorialAllowsAction,tutorialObjectiveMet,configureTutorialGame,
    onHandCardClick,toggleHandChoiceCard,commitCellChoice,beginShopTrade,returnToMainMenu,startNewGame,dockTutorialCoach,
    game:()=>game,state:()=>tutorialState,pending:()=>({cell:pendingCellChoice,hand:pendingHandChoice,rect:pendingRectChoice}),
    setGame:g=>game=g,setSize:n=>SIZE=n,Game,CARDS,CARD,TUTORIALS,
    settings:()=>({chosenBoardSize,chosenPlayerCount,chosenKourindou,chosenAIDifficulty})};`,context);
const A=context.api;
const flush=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
const clickHand=id=>{const n=el('hand').children.find(n=>n.dataset.cardId===id);assert(n,`hand contains ${id}`);n.onclick();};
const place=(id,r,c)=>{clickHand(id);A.commitCellChoice(r,c);};
const click=id=>{assert(!el(id).disabled,`${id} enabled`);for(const fn of el(id).events.click||[])fn();};
const newLesson=async(mode,step=0)=>{if(A.game()&&!A.state())A.returnToMainMenu();effects.length=0;A.openTutorial(mode,step);await flush();};
const assertConserved=g=>{const ids=[...g.board.flat().filter(Boolean),...g.shopCards,...g.drawPile,...g.players.flatMap(p=>[...p.hand,...p.discard])];assert.equal(new Set(ids).size,ids.length);assert.equal(ids.length,g.startingCardIds.size);};
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
test('The tutorials open the actual Game and table with a live human turn, not a mock dialog',async()=>{
  await newLesson('normal');assert(A.game() instanceof A.Game);assert(context.window.__resolveHumanTurn);
  assert(el('game').classList.contains('active'));assert.equal(el('setup').style.display,'none');
  assert.equal(el('tutorial-coach').hidden,false);assert.equal(A.TUTORIALS.kourindou.length,2);
  assert(!html.includes('tutorial-dialog')&&!html.includes('tutorial-demo')&&!html.includes('data-tutorial-action'));
  assert.equal(normalStarts,0);assertConserved(A.game());
});
test('Real click placement resolves Sanae drawing, animation callbacks, and completion',async()=>{
  const g=A.game();place('mtn_sanae',2,2);await flush();
  assert.equal(g.cardAt(2,2),'mtn_sanae');assert.equal(g.players[0].hand.length,1);
  assert.equal(effects.filter(e=>e[0]==='draw').length,1);assert(A.state().complete);assert.equal(el('tutorial-next').disabled,false);assertConserved(g);
});
test('Next loads a unique real faction-claim scenario and the actual engine grants four points',async()=>{
  click('tutorial-next');await flush();const g=A.game();assert.equal(A.state().step,1);
  assert.equal(g.findFactionClaim('mountain').length,0);place('mtn_sanae',2,2);await flush();
  assert.equal(g.players[0].discard.length,4);assert.equal(g.winCount(g.players[0]),4);assert(g.players[0].hand.length===4);
  assert(A.state().complete);assert.equal(g.board.flat().filter(Boolean).length,0);assertConserved(g);
});
test('An unconnected real placement cannot fake a claim; Retry restores the scenario',async()=>{
  await newLesson('normal',1);place('mtn_sanae',0,0);await flush();assert.equal(A.game().players[0].discard.length,0);
  assert(!A.state().complete);assert(el('tutorial-next').disabled);const old=A.game();click('tutorial-retry');await flush();
  assert(old.cancelled);assert.equal(A.game().players[0].hand[0],'mtn_sanae');assert.equal(A.game().cardAt(0,0),null);
  assert(context.window.__resolveHumanTurn);assertConserved(A.game());
});
test('Draw uses the real shared-draw limit and leaves the full opponent at seven',async()=>{
  await newLesson('normal',2);const g=A.game();clickHand('mtn_sanae');assert.equal(A.pending().cell,null);
  click('draw-btn');await flush();assert.deepEqual(Array.from(g.players,p=>p.hand.length),[7,7,4]);
  assert.equal(effects.filter(e=>e[0]==='draw').length,2);assert(A.state().complete);assertConserved(g);
});
test('Iku pays three actual cards together and the real area resolver discards both targets',async()=>{
  await newLesson('normal',3);const g=A.game();place('heaven_iku',3,3);await flush();
  assert(A.pending().hand.multi);for(const id of ['hourai_mokou','hell_clownpiece','haku_youmu'])clickHand(id);
  assert.equal(el('hand-choice-confirm').disabled,false);el('hand-choice-confirm').onclick();await flush();
  assert.equal(g.players[0].hand.length,0);assert.equal(effects.filter(e=>e[0]==='return').length,3);
  const choice=A.pending().rect;assert(choice);const zone=[{r:0,c:0},{r:0,c:1},{r:1,c:0},{r:1,c:1}];assert(choice.isValid(zone));choice.resolve(zone);await flush();
  assert.equal(g.players[0].discard.length,2);assert(A.state().complete);assertConserved(g);
});
test('An area missing one target stays a real partial result and requires Retry',async()=>{
  await newLesson('normal',3);place('heaven_iku',3,3);await flush();
  for(const id of ['hourai_mokou','hell_clownpiece','haku_youmu'])clickHand(id);el('hand-choice-confirm').onclick();await flush();
  A.pending().rect.resolve([{r:0,c:1},{r:0,c:2},{r:1,c:1},{r:1,c:2}]);await flush();
  assert.equal(A.game().players[0].discard.length,1);assert(!A.state().complete);assert(el('tutorial-next').disabled);assertConserved(A.game());
});
test('The real shop offer opens page two, trades actual merchandise, and retains the human turn',async()=>{
  await newLesson('kourindou');const g=A.game();clickHand('hourai_mokou');A.pending().cell.resolveShop(0);await flush();
  assert.equal(A.state().step,1);assert(A.pending().cell.shopTrade);assert.equal(g.currentPlayerIdx,0);
  const target=g.tradeCells()[0];A.commitCellChoice(target.r,target.c);await flush();
  assert(g.players[0].hand.includes('sdm_meiling'));assert.equal(g.cardAt(target.r,target.c),'hourai_mokou');
  assert(g.tradedThisTurn[0]);assert(context.window.__resolveHumanTurn);assert(A.state().complete);
  assert.equal(normalStarts,0);assertConserved(g);
});
test('Shop Retry starts a fresh real trade selection, and Back returns to the first shop page',async()=>{
  click('tutorial-retry');await flush();assert.equal(A.state().step,1);assert(A.pending().cell.shopTrade);
  assert.equal(A.game().tradedThisTurn[0],false);click('tutorial-back');await flush();assert.equal(A.state().step,0);
  assert.equal(A.pending().cell,null);assert(context.window.__resolveHumanTurn);assertConserved(A.game());
});
test('Finish exits guided practice and returns to the configured main menu',async()=>{
  await newLesson('kourindou',1);const g=A.game(),target=g.tradeCells()[0];A.commitCellChoice(target.r,target.c);await flush();
  assert(A.state().complete);const settings={...A.settings()};click('tutorial-next');await flush();
  assert(g.cancelled);assert.equal(A.game(),null);assert.equal(A.state(),null);assert.equal(el('setup').style.display,'');
  assert(!el('game').classList.contains('active'));assert.equal(el('tutorial-coach').hidden,true);assert.deepEqual({...A.settings()},settings);
});
test('Exit during cost selection cancels the practice without late state writes to the next match',async()=>{
  await newLesson('normal',3);place('heaven_iku',3,3);await flush();const old=A.game();assert(A.pending().hand);
  const settings={...A.settings()};A.returnToMainMenu();A.startNewGame();const live=A.game();await flush();
  assert(old.cancelled);assert.equal(A.state(),null);assert.equal(A.pending().hand,null);assert.equal(el('tutorial-coach').hidden,true);
  assert.equal(live.players[0].hand.length,6);assert.equal(live.board.flat().filter(Boolean).length,0);assert.deepEqual({...A.settings()},settings);
  assert.equal(normalStarts,1);assertConserved(live);
});
test('Exit during area selection clears the real pending rectangle',async()=>{
  await newLesson('normal',3);place('heaven_iku',3,3);await flush();for(const id of ['hourai_mokou','hell_clownpiece','haku_youmu'])clickHand(id);
  el('hand-choice-confirm').onclick();await flush();assert(A.pending().rect);const old=A.game();A.returnToMainMenu();await flush();
  assert(old.cancelled);assert.equal(A.pending().rect,null);assert.equal(A.game(),null);assert.equal(old.players[0].discard.length,0);
});
test('Completion waits for effects; cancelling that wait cannot finish a new practice',async()=>{
  await newLesson('normal');let done;holdEffects={promise:new Promise(r=>done=r)};place('mtn_sanae',0,0);await flush();assert(!A.state().complete);
  const old=A.state();click('tutorial-retry');await flush();holdEffects=null;done(true);await flush();
  assert.notEqual(A.state(),old);assert(!A.state().complete);assert.equal(A.game().cardAt(0,0),null);assert(el('tutorial-next').disabled);
});
test('A live match cannot be replaced by a tutorial',async()=>{
  A.returnToMainMenu();A.startNewGame();const live=A.game();A.openTutorial('normal');await flush();assert.equal(A.game(),live);assert.equal(A.state(),null);
});
test('The coach moves above the real layout on mobile and returns to the side panel on desktop',async()=>{
  A.dockTutorialCoach(true);assert.equal(el('tutorial-coach').parentElement,el('game'));
  assert(el('game').children.indexOf(el('tutorial-coach'))<el('game').children.indexOf(el('layout')));
  A.dockTutorialCoach(false);assert.equal(el('tutorial-coach').parentElement,el('log-panel'));
  assert.match(html,/#tutorial-coach\[hidden\]\{display:none !important;/);
});
(async()=>{let passed=0;for(const [name,fn]of tests){await fn();console.log('PASS '+name);passed++;}console.log(`${passed}/${tests.length} board tutorial checks passed`);})().catch(e=>{console.error(e);process.exitCode=1;});
