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
  createElement:()=>new Element(),querySelectorAll:s=>s==='.tutorial-focus'?all.filter(n=>n.classList.contains('tutorial-focus')):[]};
el('game').appendChild(el('layout'));el('log-panel').appendChild(el('tutorial-coach'));el('tutorial-coach').hidden=true;
const tiles=new Map(),effects=[];
let holdEffects=null,normalStarts=0;
const context={console,Math,Set,Map,Promise,document,el,window:{scrollTo(){}},fullscreenElement:()=>null,screen:{orientation:{unlock(){}}},
  setTimeout:fn=>{fn();return 0;},clearTimeout(){},queueMobileViewport(){},setRuleText:(n,s)=>n.textContent=s,
  triggerPlacementPresentation(){},speakRinnosuke(){},captureHandPlacementArrival(){},syncHandSelection(){},
  clearHandDragPhysics(){},clearHandPlacementArrivals(){},closeMobileJournal(){},clearRinnosukeBubble(){},clearCrownBackdrop(){},clearMindEffects(){},
  removeYuukaBloom(){},releaseRectPointer(){},clearExpansionEffects(){},closeCardDetails(){},updateStartButtonState(){},
  finishTitleCardDrag(){},clearTableCardSlides(){},closeTitleMemoryGame(){},renderTitleTableCards(){},cancelAITestAutomation(){},updateAITestControls(){},closeAITestDashboard(){},closeDebugControls(){},
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
  let chosenBoardSize=5,chosenPlayerCount=4,chosenAIDifficulty='easy',customizeOn=false,chosenAITestMode=false,chosenFastAITest=true,aiTestPaused=false;
  let rinnosukeOpeningTimer=null,rinnosukeLastSpoke=0;
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
  slice('  pickFromList(title, options){','  pickOwnHandCard(title,')+
  slice('  pickRectByDrag(dim, title, isValid){','  promptText(title){')+
  `});
  this.api={openTutorial,tutorialStep,renderTutorial,updateTutorialProgress,tutorialAllowsAction,tutorialObjectiveMet,configureTutorialGame,
    onHandCardClick,toggleHandChoiceCard,commitCellChoice,beginShopTrade,returnToMainMenu,startNewGame,dockTutorialCoach,
    game:()=>game,state:()=>tutorialState,pending:()=>({cell:pendingCellChoice,hand:pendingHandChoice,rect:pendingRectChoice}),
    setGame:g=>game=g,setSize:n=>SIZE=n,Game,CARDS,CARD,TUTORIALS,
    settings:()=>({chosenBoardSize,chosenPlayerCount,chosenAIDifficulty})};`,context);
const A=context.api;
const flush=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
const clickHand=id=>{const n=el('hand').children.find(n=>n.dataset.cardId===id);assert(n,`hand contains ${id}`);n.onclick();};
const place=(id,r,c)=>{clickHand(id);A.commitCellChoice(r,c);};
const click=id=>{assert(!el(id).disabled,`${id} enabled`);for(const fn of el(id).events.click||[])fn();};
const newLesson=async(step=0)=>{if(A.game()&&!A.state())A.returnToMainMenu();effects.length=0;A.openTutorial(step);await flush();};
const assertConserved=g=>{const ids=[...g.board.flat().filter(Boolean),...g.shopCards,...g.drawPile,...g.players.flatMap(p=>[...p.hand,...p.discard])].filter(Boolean);assert.equal(new Set(ids).size,ids.length);assert.equal(ids.length,g.startingCardIds.size);};
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
test('The unified tutorial opens the actual Game and table with a live human turn',async()=>{
  await newLesson();assert(A.game() instanceof A.Game);assert(context.window.__resolveHumanTurn);
  assert(el('game').classList.contains('active'));assert.equal(el('setup').style.display,'none');
  assert.equal(el('tutorial-coach').hidden,false);assert.equal(A.TUTORIALS.length,6);assert.equal(A.TUTORIALS.filter(page=>['offer','trade'].includes(page.goal)).length,2);
  assert(A.game().kourindouEnabled);assert.equal(A.game().shopTiles.length,6);
  assert(html.includes('id="tutorial-start"'));assert(!html.includes('tutorial-normal')&&!html.includes('tutorial-kourindou')&&!html.includes('kourindou-toggle'));
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
  await newLesson(1);place('mtn_sanae',0,0);await flush();assert.equal(A.game().players[0].discard.length,0);
  assert(!A.state().complete);assert(el('tutorial-next').disabled);const old=A.game();click('tutorial-retry');await flush();
  assert(old.cancelled);assert.equal(A.game().players[0].hand[0],'mtn_sanae');assert.equal(A.game().cardAt(0,0),null);
  assert(context.window.__resolveHumanTurn);assertConserved(A.game());
});
test('Draw uses the real shared-draw limit and leaves the full opponent at seven',async()=>{
  await newLesson(2);const g=A.game();clickHand('mtn_sanae');assert.equal(A.pending().cell,null);
  click('draw-btn');await flush();assert.deepEqual(Array.from(g.players,p=>p.hand.length),[7,7,4]);
  assert.equal(effects.filter(e=>e[0]==='draw').length,2);assert(A.state().complete);assertConserved(g);
});
test('Iku pays three actual cards together and the real area resolver discards both targets',async()=>{
  await newLesson(3);const g=A.game();place('heaven_iku',3,3);await flush();
  assert(A.pending().hand.multi);for(const id of ['hourai_mokou','hell_clownpiece','haku_youmu'])clickHand(id);
  assert.equal(el('hand-choice-confirm').disabled,false);el('hand-choice-confirm').onclick();await flush();
  assert.equal(g.players[0].hand.length,0);assert.equal(effects.filter(e=>e[0]==='return').length,3);
  const choice=A.pending().rect;assert(choice);const zone=[{r:0,c:0},{r:0,c:1},{r:1,c:0},{r:1,c:1}];assert(choice.isValid(zone));choice.resolve(zone);await flush();
  assert.equal(g.players[0].discard.length,2);assert(A.state().complete);assertConserved(g);
});
test('An area missing one target stays a real partial result and requires Retry',async()=>{
  await newLesson(3);place('heaven_iku',3,3);await flush();
  for(const id of ['hourai_mokou','hell_clownpiece','haku_youmu'])clickHand(id);el('hand-choice-confirm').onclick();await flush();
  A.pending().rect.resolve([{r:0,c:1},{r:0,c:2},{r:1,c:1},{r:1,c:2}]);await flush();
  assert.equal(A.game().players[0].discard.length,1);assert(!A.state().complete);assert(el('tutorial-next').disabled);assertConserved(A.game());
});
test('The real shop offer opens the final lesson, trades actual merchandise, and retains the human turn',async()=>{
  await newLesson(4);const g=A.game();clickHand('hourai_mokou');A.pending().cell.resolveShop(0);await flush();
  assert.equal(A.state().step,5);assert(A.pending().cell.shopTrade);assert.equal(g.currentPlayerIdx,0);
  const target=g.tradeCells()[0];A.commitCellChoice(target.r,target.c);await flush();
  assert(g.players[0].hand.includes('sdm_meiling'));assert.equal(g.cardAt(target.r,target.c),'hourai_mokou');
  assert(g.tradedThisTurn[0]);assert(context.window.__resolveHumanTurn);assert(A.state().complete);
  assert.equal(normalStarts,0);assertConserved(g);
});
test('Shop Retry starts a fresh real trade selection, and Back returns to the offer lesson',async()=>{
  click('tutorial-retry');await flush();assert.equal(A.state().step,5);assert(A.pending().cell.shopTrade);
  assert.equal(A.game().tradedThisTurn[0],false);click('tutorial-back');await flush();assert.equal(A.state().step,4);
  assert.equal(A.pending().cell,null);assert(context.window.__resolveHumanTurn);assertConserved(A.game());
});
test('Finish exits guided practice and returns to the configured main menu',async()=>{
  await newLesson(5);const g=A.game(),target=g.tradeCells()[0];A.commitCellChoice(target.r,target.c);await flush();
  assert(A.state().complete);const settings={...A.settings()};click('tutorial-next');await flush();
  assert(g.cancelled);assert.equal(A.game(),null);assert.equal(A.state(),null);assert.equal(el('setup').style.display,'');
  assert(!el('game').classList.contains('active'));assert.equal(el('tutorial-coach').hidden,true);assert.deepEqual({...A.settings()},settings);
});
test('Exit during cost selection cancels the practice without late state writes to the next match',async()=>{
  await newLesson(3);place('heaven_iku',3,3);await flush();const old=A.game();assert(A.pending().hand);
  const settings={...A.settings()};A.returnToMainMenu();A.startNewGame();const live=A.game();await flush();
  assert(old.cancelled);assert.equal(A.state(),null);assert.equal(A.pending().hand,null);assert.equal(el('tutorial-coach').hidden,true);
  assert.equal(live.players[0].hand.length,6);assert.equal(live.board.flat().filter(Boolean).length,0);assert.deepEqual({...A.settings()},settings);
  assert.equal(normalStarts,1);assert(live.kourindouEnabled);assert.equal(live.shopTiles.length,6);assertConserved(live);
});
test('Exit during area selection clears the real pending rectangle',async()=>{
  await newLesson(3);place('heaven_iku',3,3);await flush();for(const id of ['hourai_mokou','hell_clownpiece','haku_youmu'])clickHand(id);
  el('hand-choice-confirm').onclick();await flush();assert(A.pending().rect);const old=A.game();A.returnToMainMenu();await flush();
  assert(old.cancelled);assert.equal(A.pending().rect,null);assert.equal(A.game(),null);assert.equal(old.players[0].discard.length,0);
});
test('Completion waits for effects; cancelling that wait cannot finish a new practice',async()=>{
  await newLesson();let done;holdEffects={promise:new Promise(r=>done=r)};place('mtn_sanae',0,0);await flush();assert(!A.state().complete);
  const old=A.state();click('tutorial-retry');await flush();holdEffects=null;done(true);await flush();
  assert.notEqual(A.state(),old);assert(!A.state().complete);assert.equal(A.game().cardAt(0,0),null);assert(el('tutorial-next').disabled);
});
test('The area lesson continues into trading rather than ending the unified tutorial',async()=>{
  await newLesson(3);place('heaven_iku',3,3);await flush();for(const id of ['hourai_mokou','hell_clownpiece','haku_youmu'])clickHand(id);
  el('hand-choice-confirm').onclick();await flush();A.pending().rect.resolve([{r:0,c:0},{r:0,c:1},{r:1,c:0},{r:1,c:1}]);await flush();
  assert(A.state().complete);assert.equal(el('tutorial-next').textContent,'Next');click('tutorial-next');await flush();
  assert.equal(A.state().step,4);assert.equal(el('tutorial-progress').textContent,'Learn to Play · 5 / 6');assert(A.game().kourindouEnabled);
  clickHand('hourai_mokou');A.pending().cell.resolveShop(0);await flush();assert.equal(A.state().step,5);
  const target=A.game().tradeCells()[0];A.commitCellChoice(target.r,target.c);await flush();assert(A.state().complete);assert.equal(el('tutorial-next').textContent,'Finish');
});
test('Trading is guided only during the shop lesson while Kourindou is visible throughout',async()=>{
  await newLesson();assert(A.game().kourindouEnabled);clickHand('mtn_sanae');
  assert.equal(A.pending().cell.shopSlots.length,0);assert(!A.pending().cell.cells.some(cell=>A.game().cardAt(cell.r,cell.c)==='shop_rinnosuke'));
  const choice=A.pending().cell;A.beginShopTrade('mtn_sanae');assert.equal(A.pending().cell,choice);assert.equal(A.state().step,0);
});
test('A live match cannot be replaced by a tutorial',async()=>{
  A.returnToMainMenu();A.startNewGame();const live=A.game();A.openTutorial();await flush();assert.equal(A.game(),live);assert.equal(A.state(),null);
});
test('An unavailable occupied tile preserves the pending placement, hand and human turn',async()=>{
  await newLesson();const g=A.game();clickHand('mtn_sanae');const choice=A.pending().cell,turn=context.window.__resolveHumanTurn;
  const before=JSON.stringify([g.players[0].hand,g.board,g.drawPile,g.shopCards]);const target=g.shopTiles[0];
  A.commitCellChoice(target.r,target.c);A.commitCellChoice(-1,-1);await flush();
  assert.equal(A.pending().cell,choice);assert.equal(context.window.__resolveHumanTurn,turn);assert.equal(JSON.stringify([g.players[0].hand,g.board,g.drawPile,g.shopCards]),before);assert(el('instruction-bar').classList.contains('show'));
  const legal=choice.cells[0];A.commitCellChoice(legal.r,legal.c);await flush();assert.equal(g.cardAt(legal.r,legal.c),'mtn_sanae');assert(A.state().complete);
});
test('A board target that becomes protected cannot consume an ability or close its selection',async()=>{
  await newLesson();const g=A.game();g.setCardAt(1,1,'sdm_flandre');g.setCardAt(3,3,'hourai_mokou');
  let settled=false;const action=g.chooseBoardCell(0,[{r:1,c:1},{r:3,c:3}],'Choose a card').then(value=>{settled=true;return value;});await flush();
  const choice=A.pending().cell;assert(choice);g.setCardAt(0,0,'mtn_nitori');const before=JSON.stringify([g.players[0].hand,g.board,g.drawPile]);
  A.commitCellChoice(1,1);await flush();assert(!settled);assert.equal(A.pending().cell,choice);assert.equal(JSON.stringify([g.players[0].hand,g.board,g.drawPile]),before);
  A.commitCellChoice(3,3);assert.deepEqual({...await action},{r:3,c:3});assert.equal(A.pending().cell,null);
});
test('Used Byakuren effects display their status and cannot resolve even through a stale click handler',async()=>{
  let settled=false;const options=[{label:'[Cost IV] Take three extra turns.',value:'turns',singleUse:true,used:true,status:'Used',disabled:true},{label:'[Cost II] Look at three cards, take one and order the rest.',value:'look',singleUse:true,status:'Available once'}];
  const action=context.ui.pickFromList('Makai Fantastica — each effect once, in any order',options).then(value=>{settled=true;return value;});
  const [used,available]=el('modal-options').children;assert(used.classList.contains('effect-used'));assert.equal(used.children[1].textContent,'Used');assert.equal(available.children[1].textContent,'Available once');
  for(const handler of used.events.click)handler();await flush();assert(!settled);assert(el('modal-overlay').classList.contains('show'));
  for(const handler of available.events.click)handler();assert.equal(await action,'look');assert(!el('modal-overlay').classList.contains('show'));
});
test('The coach moves above the real layout on mobile and returns to the side panel on desktop',async()=>{
  A.dockTutorialCoach(true);assert.equal(el('tutorial-coach').parentElement,el('game'));
  assert(el('game').children.indexOf(el('tutorial-coach'))<el('game').children.indexOf(el('layout')));
  A.dockTutorialCoach(false);assert.equal(el('tutorial-coach').parentElement,el('log-panel'));
  assert.match(html,/#tutorial-coach\[hidden\]\{display:none !important;/);
});
test('Every board size and player count includes Kourindou, even with an old disabled option',()=>{
  for(const size of [4,5]) for(const count of [2,3,4]) for(const options of [{},{kourindou:false},{kourindou:true}]){
    A.setSize(size);const g=new A.Game(count,{},null,options);
    assert(g.kourindouEnabled);assert.equal(g.shopTiles.length,6);assert.equal(g.shopCards[0],'shop_rinnosuke');
    assert.equal(g.shopCards.length,6);assert(g.shopCards.slice(1,4).every(id=>A.CARD[id].shopExpansion));
    assert(g.shopTiles.every(tile=>tile.r>=size&&!g.wastelandAt(tile.r,tile.c)));
    assert(g.players.every(p=>p.hand.length===6&&p.hand.every(id=>!A.CARD[id].shopExpansion&&!A.CARD[id].shopkeeper)));
    assert(g.drawPile.every(id=>!A.CARD[id].shopExpansion&&!A.CARD[id].shopkeeper));assertConserved(g);
  }
  A.setSize(4);
});
(async()=>{let passed=0;for(const [name,fn]of tests){let timer;try{await Promise.race([fn(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Pending test did not finish: '+name)),2500);})]);}finally{clearTimeout(timer);}console.log('PASS '+name);passed++;}console.log(`${passed}/${tests.length} board tutorial checks passed`);})().catch(e=>{console.error(e);process.exitCode=1;});
