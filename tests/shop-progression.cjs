// Exercise actual engine/AI decisions and the fixed four-tile shop DOM; no pixel/device assertions.
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
 triggerPlacementPresentation(){},speakRinnosuke(){},logOverride(){},lastPlacedCell:null,online:null,localSeat:()=>0,localTurnReady:()=>false,humanActionResolving:false,renderAll(){},ui:{},waitAITestReady:async()=>true,
 translateGameText:s=>s,
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
 g.shopCards=['shop_rinnosuke',...stock];g.handKnowledge=g.players.map(()=>new Map());
 for(const [r,c,id]of board)g.setCardAt(r,c,id);
 const used=new Set([...g.board.flat(),...g.shopCards,...g.players.flatMap(p=>[...p.hand,...p.discard])].filter(Boolean));
 g.drawPile=A.CARDS.filter(c=>!c.shopExpansion&&!c.token&&!c.shopkeeper&&!used.has(c.id)).map(c=>c.id);
 g.startingCardIds=new Set([...used,...g.drawPile]);A.setGame(g);A.setChoice(null);return g;
}
const three=['mtn_aya','mtn_sanae','palace_rin'],five=[...three,'sage_ran','hell_clownpiece'];
const temple=[[0,0,'temple_byakuren'],[0,1,'temple_shou'],[1,0,'temple_murasa']];
test('Both board sizes have exactly three merchandise cards outside the main board',()=>{
 for(const size of [4,5]){const g=setup({size});assert.equal(g.shopTiles.length,4);assert.equal(g.shopCards.length,4);
  assert.deepEqual(plain(g.shopTiles.map(t=>[t.r,t.c])),[[size+2,1],[size+3,0],[size+3,1],[size+3,2]]);assert.equal(g.allTiles().length,size*size+4);conserved(g);
  assert(g.players.every(p=>p.hand.every(id=>!A.CARD[id].shopExpansion)));assert(g.drawPile.every(id=>!A.CARD[id].shopExpansion));}
});
test('Five and ten total points do not expand the shop or introduce new cards',()=>{
 for(const points of [5,10,18]){const cards=A.CARDS.filter(c=>!c.shopkeeper&&!c.shopExpansion&&!c.token&&!c.triple).slice(0,points).map(c=>c.id),g=setup({discard:[cards,[],[]]});
  const stock=g.shopCards.slice();g.checkWin();assert.equal(g.shopCards.length,4);assert.equal(g.shopTiles.length,4);assert.deepEqual(g.shopCards,stock);conserved(g);}
});
test('The three merchandise tiles retain protection, no faction and AI target exclusion',()=>{
 const g=setup();for(const tile of g.shopTiles.slice(1)){assert(g.isProtected(tile.r,tile.c));assert.equal(g.boardFaction(tile.r,tile.c),null);assert(!g.canMoveBoardCard(tile.r,tile.c));assert(!g.canSelectBoardCard(tile.r,tile.c));assert(g.tradeCells().some(c=>c.r===tile.r&&c.c===tile.c));assert(!g.abilityBoardCells(0).some(c=>c.r===tile.r&&c.c===tile.c));}
});
test('Trading merchandise is once per turn and free; Trap cannot be offered',()=>{
 const g=setup({hand:['medicine']}),bought=g.shopCards[1];assert(g.tradeCard(0,'medicine',1));assert(g.players[0].hand.includes(bought));assert.equal(g.currentPlayerIdx,0);assert(!g.canTrade(0,bought));conserved(g);
 g.tradedThisTurn[0]=false;const trap=g.makeTrap();g.players[0].hand.push(trap);assert(!g.canTrade(0,trap));
});
test('New matches always deal only ordinary cards and reset to three merchandise',()=>{
 for(let i=0;i<12;i++){const g=new A.Game(3,{},null,{aiOnly:true,fastTest:true});assert.equal(g.shopCards.length,4);assert(g.shopCards.slice(1).every(id=>A.CARD[id].shopExpansion));assert(g.players.every(p=>p.hand.length===6&&p.hand.every(id=>!A.CARD[id].shopExpansion)));conserved(g);}
});
test('AI takes a shop-only faction winner before drawing or making a setup trade',async()=>{
 for(const size of [4,5]){const g=setup({size,hand:['sage_ran'],board:temple,discard:[three,[],[]],stock:['temple_ichirin','hourai_tewi','hell_kutaka']});
  const action=await A.aiDecideAction(0);assert.equal(action.type,'trade');assert(action.winningTrade);assert.equal(action.cardId,'sage_ran');assert.equal(g.cardAt(action.target.r,action.target.c),'temple_ichirin');assert.equal(action.thenPlace.cardId,'temple_ichirin');}
});
test('Winning trades bypass the ordinary hand-improvement threshold',()=>{
 const g=setup({hand:['sage_kasen'],board:[[0,0,'yuuka']],discard:[five,[],[]],stock:['medicine','mtn_nitori','hell_kutaka']});
 const action=A.aiBestTrade(0);assert(action?.winningTrade);assert.equal(action.cardId,'sage_kasen');assert.equal(action.thenPlace.cardId,'medicine');
});
test('Normal and Hard take a detected winning trade',async()=>{
 for(const difficulty of ['normal','hard']){setup({difficulty,hand:['sage_kasen'],board:[[0,0,'yuuka']],discard:[five,[],[]],stock:['medicine','mtn_nitori','hell_kutaka']});forced=0;
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
test('Removed side slots cannot be selected or traded',()=>{
 const g=setup({hand:['medicine']});for(const slot of [4,5]){assert(!g.isShopOpen(slot));assert(!g.tradeCard(0,'medicine',slot));}assert(!g.tradeCells().some(c=>c.slot>3));
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

test('Previous and baseline policy controls do not acquire the new winning-trade heuristic',()=>{
 for(const policy of ['previous','baseline']){setup({policy,hand:['sage_ran'],board:temple,discard:[three,[],[]],stock:['temple_ichirin','hourai_tewi','hell_kutaka']});assert.equal(A.aiCurrentWinningTrade(0),null);}
});
test('The live shop renders four reusable physical buttons and no milestone labels',()=>{
 el('kourindou').replaceChildren();const g=setup();A.renderShop();const tiles=el('kourindou').children;assert.equal(tiles.length,4);const first=tiles[1];assert(first.innerHTML.includes(g.shopCards[1]));
 g.players[0].hand=['medicine'];assert(g.tradeCard(0,'medicine',1));A.renderShop();assert.equal(tiles[1],first);assert(first.innerHTML.includes('medicine'));assert(!first.title.includes('total points'));
});
test('Removed slots reject stale selectors and the compact shop keeps its two-row layout',()=>{
 setup();A.setChoice({cells:[],shopSlots:[4,5]});assert(!A.isShopSelectable(4));assert(!A.isShopSelectable(5));
 assert(!html.includes('#kourindou .cell:nth-child(5)'));assert(!html.includes('#kourindou .cell:nth-child(6)'));assert(html.includes('body.mobile-landscape #kourindou{grid-template-rows:repeat(2,'));
});
(async()=>{let passed=0;for(const [name,fn]of tests){try{await fn();passed++;console.log('PASS '+name);}catch(error){forced=null;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`${passed}/${tests.length} shop checks passed`);if(passed!==tests.length)process.exitCode=1;})();
