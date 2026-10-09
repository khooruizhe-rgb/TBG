// Exercise actual engine/AI decisions and the six-slot DOM; no pixel/device assertions.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2]||(fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(file,'utf8'),js=html.split('<script>')[1].split('</script>')[0];new vm.Script(js);
const slice=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a)));
let seed=8109,forced=null,randomCalls=0;const math=Object.create(Math);math.random=()=>{randomCalls++;return forced??((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);};
class Element{
 constructor(){this.children=[];this.dataset={};this.attrs={};this.events={};this.names=new Set();this.classList={add:(...s)=>s.forEach(v=>this.names.add(v)),remove:(...s)=>s.forEach(v=>this.names.delete(v)),contains:s=>this.names.has(s),toggle:(s,on)=>{on?this.names.add(s):this.names.delete(s);return on;}};}
 set className(v){this.names=new Set(v.split(/\s+/));}appendChild(n){this.children.push(n);return n;}replaceChildren(){this.children=[];}querySelector(){return null;}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}setAttribute(k,v){this.attrs[k]=v;}
}
const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};let chinese=false;
const ctx={console,Math:math,setTimeout:fn=>{fn();return 0;},clearTimeout(){},document:{createElement:()=>new Element()},el,
 triggerPlacementPresentation(){},speakRinnosuke(){},logOverride(){},lastPlacedCell:null,humanActionResolving:false,renderAll(){},ui:{},waitAITestReady:async()=>true,
 translateGameText:s=>chinese?s.replace(/^Opens at (\d+) total points$/,'全场 $1 分开启'):s,
 cardBoardHtml:id=>`<div class="board-card">${id}</div>`,openCardDetails(){},onRectCellPointerDown(){},syncProtectionIndicator(){},syncTerrainAnimations(){},applyCrownLight(){},crownLightFor(){},koishiArrivalUntil:new Map(),syncIllusionFace(){},playGameCue(){}};
vm.createContext(ctx);
vm.runInContext(slice('const DIRS4','/* ===================== UI layer')+'\nvar game=null,pendingCellChoice=null,pendingRectChoice=null;\n'+
 slice('const NO_PLACED_ABILITY','async function doPlayerAction')+slice('function canTakeTurnAction','/* Cards with no "Placed:')+
 slice('async function doPlayerAction','async function afterAction')+slice('function renderShop(){','function commitCellChoice(')+`
this.api={Game,CARD,CARDS,FACTIONS,aiCurrentWinningTrade,aiTradeCouldWin,aiBestTrade,aiDecideAction,aiEvaluateCard,doPlayerAction,createAITestStats,recordCompletedAITest,captureAIEvaluationSnapshot,renderShop,isShopSelectable,
 setGame:g=>game=g,setSize:n=>SIZE=n,setChoice:c=>pendingCellChoice=c};`,ctx);
const A=ctx.api,plain=x=>JSON.parse(JSON.stringify(x)),tests=[],test=(n,f)=>tests.push([n,f]);
function inventory(g){return [...g.board.flat(),...g.shopCards,...g.drawPile,...g.players.flatMap(p=>[...p.hand,...p.discard])].filter(Boolean);}
function conserved(g){const ids=inventory(g);assert.equal(ids.length,new Set(ids).size);assert.equal(ids.length,g.startingCardIds.size);assert(ids.every(id=>g.startingCardIds.has(id)));}
function setup({size=4,hand=[],board=[],discard=[[],[],[]],stock=['sdm_meiling','hourai_tewi','hell_kutaka'],difficulty='hard',policy='current'}={}){
 A.setSize(size);const g=new A.Game(3,{},null,{aiOnly:true,fastTest:true,aiDifficulty:difficulty,aiPolicies:[policy,policy,policy]});
 g.players.forEach((p,i)=>{p.hand=i?[]:hand.slice();p.discard=(discard[i]||[]).slice();});g.currentPlayerIdx=0;
 g.board=Array.from({length:size},()=>Array(size).fill(null));g.wasteland=Array.from({length:size},()=>Array(size).fill(false));
 g.shopCards=['shop_rinnosuke',...stock,null,null];g.shopUnlockedSlots=4;g.handKnowledge=g.players.map(()=>new Map());
 for(const [r,c,id]of board)g.setCardAt(r,c,id);
 const used=new Set([...g.board.flat(),...g.shopCards,...g.players.flatMap(p=>[...p.hand,...p.discard])].filter(Boolean));
 g.drawPile=A.CARDS.filter(c=>!c.shopExpansion&&!c.token&&!c.shopkeeper&&!used.has(c.id)).map(c=>c.id);
 g.startingCardIds=new Set([...used,...g.drawPile]);A.setGame(g);A.setChoice(null);return g;
}
const three=['mtn_aya','mtn_sanae','palace_rin'],five=[...three,'sage_ran','hell_clownpiece'];
const temple=[[0,0,'temple_byakuren'],[0,1,'temple_shou'],[1,0,'temple_murasa']];
test('Both board sizes start with three merchandise cards and two closed side slots',()=>{
 for(const size of [4,5]){const g=setup({size});assert.equal(g.shopTiles.length,6);assert.equal(g.shopCards.filter(Boolean).length,4);
  assert.deepEqual(plain(g.shopTiles.slice(4).map(t=>[t.r,t.c,t.unlockAt])),[[size+2,0,5],[size+2,2,10]]);
  assert.equal(g.allTiles().length,size*size+4);assert(g.shopCards.slice(4).every(id=>id===null));conserved(g);
  assert(g.players.every(p=>p.hand.every(id=>!A.CARD[id].shopExpansion)));assert(g.drawPile.every(id=>!A.CARD[id].shopExpansion));}
});
test('Exactly five total points open one slot, only once, and points falling do not close it',()=>{
 const g=setup({discard:[five.slice(0,2),five.slice(2,4),[]]});assert.equal(g.unlockShopSlots(),0);
 const id=five[4];g.drawPile=g.drawPile.filter(card=>card!==id);g.players[2].discard.push(id);
 assert.equal(g.unlockShopSlots(),1);assert.equal(g.shopUnlockedSlots,5);assert(A.CARD[g.shopCards[4]].shopExpansion);assert.equal(g.shopCards[5],null);
 const stock=g.shopCards.slice(),calls=randomCalls;assert.equal(g.unlockShopSlots(),0);assert.equal(randomCalls,calls);
 g.drawPile.push(g.players[0].discard.pop());assert.equal(g.unlockShopSlots(),0);assert.deepEqual(plain(g.shopCards),plain(stock));conserved(g);
});
test('Ten points across three players open both slots, with distinct unused fifth cards',()=>{
 const cards=A.CARDS.filter(c=>!c.shopkeeper&&!c.shopExpansion&&!c.token&&!c.triple).slice(0,10).map(c=>c.id);
 const g=setup({discard:[cards.slice(0,3),cards.slice(3,6),cards.slice(6)]});assert.equal(g.unlockShopSlots(),2);
 assert.equal(g.shopUnlockedSlots,6);assert.equal(g.allTiles().length,22);assert.equal(new Set(g.shopCards).size,6);
 assert(g.shopCards.slice(1).every(id=>A.CARD[id].shopExpansion));conserved(g);
});
test('Thresholds use point values, including Hecatia and Eirin suppression',()=>{
 let g=setup({discard:[['hell_hecatia'],['mtn_sanae','mtn_aya'],[]]});assert.equal(g.unlockShopSlots(),1);
 g=setup({discard:[['hell_hecatia'],['mtn_sanae','mtn_aya'],[]],board:[[0,0,'hourai_eirin']]});assert.equal(g.unlockShopSlots(),0);
 g.setCardAt(0,0,null);assert.equal(g.unlockShopSlots(),1);
});
test('Real scoring and complete faction settlement open new merchandise without card loss',()=>{
 const g=setup({hand:['haku_youmu'],board:[[0,0,'haku_yuyuko']],discard:[three,[],[]]});
 g.setCardAt(0,1,'haku_youmu');g.removeFromHand(0,'haku_youmu');g.checkClaims(0);
 assert.equal(g.winCount(g.players[0]),5);assert.equal(g.shopUnlockedSlots,5);assert.equal(g.testMetrics.claims.hakugyokurou,1);conserved(g);
});
test('Closed slots cannot be selected, overridden, placed into, or traded with',async()=>{
 const g=setup({hand:['sage_yukari','medicine']});g.players[0].isAI=false;
 for(const slot of [4,5]){const t=g.shopTiles[slot];assert(!g.hasTile(t.r,t.c));assert.equal(g.cardAt(t.r,t.c),null);assert(!g.canOverrideShop(0,slot));
  assert(!g.tradeCard(0,'medicine',slot));await g.internalPlace('medicine',t.r,t.c,0,0);assert.equal(g.shopCards[slot],null);}
});
test('New merchandise receives Rinnosuke protection, has no active faction, and cannot be an AI ability target',()=>{
 const g=setup({discard:[five,[],[]]});g.unlockShopSlots();const t=g.shopTiles[4];
 assert(g.isProtected(t.r,t.c));assert.equal(g.boardFaction(t.r,t.c),null);assert(!g.canMoveBoardCard(t.r,t.c));assert(!g.canSelectBoardCard(t.r,t.c));
 assert(g.tradeCells().some(c=>c.r===t.r&&c.c===t.c));assert.equal(g.abilityBoardCells(0).filter(c=>c.r===t.r&&c.c===t.c).length,0);
});
test('Unlocked merchandise can be traded once without consuming a turn, while Trap remains forbidden',()=>{
 const g=setup({hand:['medicine'],discard:[five,[],[]]});g.unlockShopSlots();const bought=g.shopCards[4],p=g.currentPlayerIdx;
 assert(g.tradeCard(0,'medicine',4));assert(g.players[0].hand.includes(bought));assert.equal(g.shopCards[4],'medicine');assert.equal(g.currentPlayerIdx,p);assert(!g.canTrade(0,bought));conserved(g);
 g.tradedThisTurn[0]=false;const trap=g.makeTrap();g.players[0].hand.push(trap);assert(!g.canTrade(0,trap));
});
test('New matches reset their unlock progress and never deal fifth cards',()=>{
 for(let i=0;i<12;i++){const g=new A.Game(3,{},null,{aiOnly:true,fastTest:true});assert.equal(g.shopUnlockedSlots,4);assert.equal(g.shopCards.length,6);
  assert(g.players.every(p=>p.hand.length===6&&p.hand.every(id=>!A.CARD[id].shopExpansion)));assert(g.shopCards.slice(4).every(id=>id===null));conserved(g);}
});
test('AI takes a shop-only faction winner before drawing or making a setup trade',async()=>{
 for(const size of [4,5]){const g=setup({size,hand:['sage_ran'],board:temple,discard:[three,[],[]],stock:['temple_ichirin','hourai_tewi','hell_kutaka']});
  const action=await A.aiDecideAction(0);assert.equal(action.type,'trade');assert(action.winningTrade);assert.equal(action.cardId,'sage_ran');assert.equal(g.cardAt(action.target.r,action.target.c),'temple_ichirin');assert.equal(action.thenPlace.cardId,'temple_ichirin');}
});
test('Winning trades bypass the ordinary hand-improvement threshold',()=>{
 const g=setup({hand:['sage_kasen'],board:[[0,0,'yuuka']],discard:[five,[],[]],stock:['medicine','mtn_nitori','hell_kutaka']});
 const action=A.aiBestTrade(0);assert(action?.winningTrade);assert.equal(action.cardId,'sage_kasen');assert.equal(action.thenPlace.cardId,'medicine');
});
test('All difficulties take a detected winning trade instead of randomly drawing',async()=>{
 for(const difficulty of ['easy','normal','hard']){setup({difficulty,hand:['sage_kasen'],board:[[0,0,'yuuka']],discard:[five,[],[]],stock:['medicine','mtn_nitori','hell_kutaka']});forced=0;
  const action=await A.aiDecideAction(0);assert(action.winningTrade);}forced=null;
});
test('AI keeps an already winning placement rather than making an unnecessary trade',async()=>{
 setup({hand:['medicine','sage_ran'],board:[[0,0,'yuuka']],discard:[five,[],[]]});const action=await A.aiDecideAction(0);assert.equal(action.type,'place');assert.equal(action.cardId,'medicine');
});
test('Offering needed faction material cannot manufacture a winning trade forecast',()=>{
 setup({hand:['temple_shou'],board:[[0,0,'temple_byakuren'],[0,1,'temple_murasa']],discard:[three,[],[]],stock:['temple_ichirin','hourai_tewi','hell_kutaka']});assert.equal(A.aiCurrentWinningTrade(0),null);
});
test('A Rin purchase cannot call points removed from its own discard pile a win',()=>{
 const g=setup({hand:['sage_ran'],board:[[1,1,'palace_satori'],[1,2,'palace_koishi'],[2,1,'palace_utsuho']],discard:[three,[],[]],stock:['palace_rin','hourai_tewi','hell_kutaka']});
 assert.equal(A.aiCurrentWinningTrade(0),null);assert.equal(g.players[0].discard.length,3);
});
test('Winning Meiling purchases retain their claim after every legal mandatory push',async()=>{
 const g=setup({hand:['sage_ran'],board:[[1,1,'sdm_remilia'],[1,2,'sdm_patchouli'],[2,1,'sdm_flandre']],discard:[three,[],[]],stock:['sdm_meiling','hourai_tewi','hell_kutaka']});
 const action=A.aiCurrentWinningTrade(0);
 assert(action?.winningTrade);assert(g.tradeCard(0,action.cardId,action.target,action));g.removeFromHand(0,action.thenPlace.cardId);
 await g.internalPlace(action.thenPlace.cardId,action.thenPlace.r,action.thenPlace.c,0,0);assert.equal(g.winner?.idx,0);conserved(g);
});
test('Winning trades preserve the Yukari guard, forced placement, Murasa and once-per-turn rules',()=>{
 for(const state of ['yukari','forced','blocked','traded','trap']){const g=setup({hand:[state==='yukari'?'sage_yukari':'sage_kasen'],board:[[0,0,'yuuka']],discard:[five,[],[]],stock:['medicine','mtn_nitori','hell_kutaka']});
  if(state==='forced')g.forcedPlay[0]='sage_kasen';if(state==='blocked')g.placementBlockedForTurn[0]=true;if(state==='traded')g.tradedThisTurn[0]=true;
  if(state==='trap'){g.players[0].hand=[g.makeTrap()];}assert.equal(A.aiCurrentWinningTrade(0),null,state);}
});
test('AI cannot buy a winning card from a still-closed slot',()=>{
 const g=setup({hand:['sage_kasen'],board:[[0,0,'yuuka']],discard:[five,[],[]],stock:['sdm_meiling','mtn_nitori','hell_kutaka']});g.shopCards[4]='medicine';g.startingCardIds.add('medicine');g.drawPile=g.drawPile.filter(id=>id!=='medicine');
 assert.equal(A.aiCurrentWinningTrade(0),null);assert(!g.tradeCells().some(c=>c.slot===4));
});
test('Trade previews preserve the actual state, references, observations and random stream',()=>{
 const g=setup({hand:['sage_kasen','sdm_remilia'],board:[[0,0,'yuuka']],discard:[five,[],[]],stock:['medicine','mtn_nitori','hell_kutaka']});
 const before=JSON.stringify(A.captureAIEvaluationSnapshot(g)),metrics=JSON.stringify(g.testMetrics,(_k,v)=>v instanceof Set?[...v]:v),logs=g.logLines.slice(),refs=[g.board,g.shopCards,g.players[0].hand,...g.players.map(p=>p.discard)],calls=randomCalls;
 assert(A.aiCurrentWinningTrade(0));assert.equal(JSON.stringify(A.captureAIEvaluationSnapshot(g)),before);assert.equal(JSON.stringify(g.testMetrics,(_k,v)=>v instanceof Set?[...v]:v),metrics);assert.deepEqual(g.logLines,logs);assert.equal(randomCalls,calls);
 assert.deepEqual([g.board,g.shopCards,g.players[0].hand,...g.players.map(p=>p.discard)].map((v,i)=>v===refs[i]),Array(refs.length).fill(true));
});
test('Optimistic screening retains full winning evaluations, including Matara copied removals and follow-ups',()=>{
 let checked=0;
 for(const fixture of [{board:temple,discard:[three,[],[]]},
  {board:[[0,0,'yuuka']],discard:[five,[],[]]},
  {board:[[0,0,'mtn_kanako'],[0,1,'mtn_suwako'],[1,0,'mtn_aya']],discard:[three,[],[]]},
  {board:[[0,0,'sage_kasen'],[0,1,'sage_ran'],[1,0,'sage_yukari'],[3,3,'marisa'],[2,2,'hourai_mokou']],discard:[three,[],[]]}]){
  const g=setup(fixture);
  for(const card of A.CARDS.filter(c=>!c.shopkeeper&&!c.token)){
   if(g.isOnBoard(card.id)||g.players.some(p=>p.discard.includes(card.id)))continue;
   g.players[0].hand=[card.id,...['mtn_nitori','sdm_remilia'].filter(id=>id!==card.id)];
   const full=A.aiEvaluateCard(0,card.id);if(full?.winsNow){checked++;assert(A.aiTradeCouldWin(0,card.id),card.id);}
  }
 }
 assert(checked>=8);
});
test('The actual AI action trades and immediately places its winning purchase',async()=>{
 const g=setup({hand:['sage_ran'],board:temple,discard:[three,[],[]],stock:['temple_ichirin','hourai_tewi','hell_kutaka']});await A.doPlayerAction(0);
 assert.equal(g.winner?.idx,0);assert.equal(g.winCount(g.players[0]),7);assert.equal(g.testMetrics.trades,1);assert.equal(g.testMetrics.claims.temple,1);
 assert.equal(g.testSeatMetrics(0).tradeReceipts[0].purpose,'immediateWin');const stats=A.createAITestStats();assert(A.recordCompletedAITest(stats,g));assert.equal(stats.tradeStats.totals.immediateWin,1);conserved(g);
});
test('AI recognizes winning merchandise in either newly opened side slot',async()=>{
 for(const slot of [4,5]){
  const g=setup({hand:['sage_ran'],board:temple,discard:[three,['hourai_mokou','hourai_reisen'],[]]});
  const openWith=id=>{const available=A.CARDS.filter(c=>c.shopExpansion&&!g.startingCardIds.has(c.id));const index=available.findIndex(c=>c.id===id);assert(index>=0);forced=(index+.5)/available.length;g.unlockShopSlots();forced=null;};
  openWith(slot===4?'temple_ichirin':'mtn_nitori');
  if(slot===5){const more=g.drawPile.splice(0,5);g.players[1].discard.push(more[0]);g.players[2].discard.push(...more.slice(1));openWith('temple_ichirin');}
  assert.equal(g.shopCards[slot],'temple_ichirin');const action=await A.aiDecideAction(0);
  assert(action.winningTrade);assert.equal(action.target.r,g.shopTiles[slot].r);assert.equal(action.target.c,g.shopTiles[slot].c);
  await A.doPlayerAction(0);assert.equal(g.winner?.idx,0);conserved(g);
 }
});
test('Previous and baseline policy controls do not acquire the new winning-trade heuristic',()=>{
 for(const policy of ['previous','baseline']){setup({policy,hand:['sage_ran'],board:temple,discard:[three,[],[]],stock:['temple_ichirin','hourai_tewi','hell_kutaka']});assert.equal(A.aiCurrentWinningTrade(0),null);}
});
test('The live shop renders six tiles with separate closed labels and opens the same button',()=>{
 el('kourindou').replaceChildren();const g=setup({discard:[five,[],[]]});chinese=false;A.renderShop();const tiles=el('kourindou').children;
 assert.equal(tiles.length,6);assert(tiles[4].disabled&&tiles[5].disabled);assert(tiles[4].innerHTML.includes('5 total points'));assert(tiles[5].innerHTML.includes('10 total points'));
 assert(!tiles[4].innerHTML.includes('board-card'));const button=tiles[4];g.unlockShopSlots();A.renderShop();assert.equal(tiles[4],button);assert(!button.disabled);assert(button.innerHTML.includes(g.shopCards[4]));assert(!button.classList.contains('shop-locked'));assert(tiles[5].disabled);
});
test('Locked buttons reject stale selections and refresh labels when language changes',()=>{
 const g=setup();chinese=false;A.renderShop();A.setChoice({cells:[],shopSlots:[4,5]});assert(!A.isShopSelectable(4));assert(!A.isShopSelectable(5));
 chinese=true;A.renderShop();assert(el('kourindou').children[4].innerHTML.includes('全场 5 分开启'));assert(el('kourindou').children[5].title.includes('全场 10 分开启'));chinese=false;
});
test('Extra slots share the two-row layout on desktop and mobile',()=>{
 assert(html.includes('#kourindou .cell:nth-child(5){grid-area:1/1;}'));assert(html.includes('#kourindou .cell:nth-child(6){grid-area:1/3;}'));
 assert(html.includes('body.mobile-landscape #kourindou{grid-template-rows:repeat(2,'));
});
(async()=>{let passed=0;for(const [name,fn]of tests){try{await fn();passed++;console.log('PASS '+name);}catch(error){forced=null;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`${passed}/${tests.length} shop progression checks passed`);if(passed!==tests.length)process.exitCode=1;})();
