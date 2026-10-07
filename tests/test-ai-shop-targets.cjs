const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2]||(fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(file,'utf8'),js=html.split('<script>')[1].split('</script>')[0];new vm.Script(js);
let seed=1707,forcedRandom=null;
const math=Object.create(Math);math.random=()=>forcedRandom??((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const context={console,Math:math,Set,Map,Promise,setTimeout:f=>{f();return 0},clearTimeout(){},waitAITestReady:async()=>true,triggerPlacementPresentation(){},speakRinnosuke(){},logOverride(){},lastPlacedCell:null,renderAll(){},humanActionResolving:false};
vm.createContext(context);
const slice=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b));
vm.runInContext(slice('const DIRS4','/* ===================== UI layer')+'\nvar game=null;\n'+slice('const NO_PLACED_ABILITY','async function doPlayerAction')+slice('function canTakeTurnAction','/* Cards with no "Placed:')+slice('async function doPlayerAction','async function afterAction')+`
this.api={Game,CARDS,CARD,FACTIONS,aiPlacementCells,aiFactionPlacement,aiKomachiTarget,aiBestDiscardTarget,aiBestChannel,aiBestEikiFaction,aiAbilityPlan,aiCostCanResolve,aiDecideAction,canAct,doPlayerAction,resolveFollowups,setGame:g=>game=g,setSize:n=>SIZE=n};`,context);
const A=context.api,plain=x=>JSON.parse(JSON.stringify(x)),tests=[];
const test=(name,fn)=>tests.push([name,fn]);
const policies=['current','previous','baseline','no-targets','no-matara'],difficulties=['easy','normal','hard'];
const payment=['sdm_meiling','hourai_tewi','palace_yuugi','sage_mai_satono','hell_kutaka','mtn_aya','mtn_suwako'];
function setup({size=4,policy='current',difficulty='hard',hand=[],board=[],waste=[],deck=[],stock=['sdm_patchouli','hourai_reisen','palace_utsuho','mtn_sanae'],human=false,opponents=[[],[]]}={}){
 A.setSize(size);const g=new A.Game(3,{},null,{aiOnly:true,fastTest:true,aiDifficulty:difficulty,aiPolicies:[policy,policy,policy]});
 g.players.forEach((p,i)=>{p.hand=i===0?hand.slice():opponents[i-1].slice();p.discard=[];p.isAI=!(human&&i===0);p.aiPolicy=policy;});
 g.board=Array.from({length:size},()=>Array(size).fill(null));g.wasteland=Array.from({length:size},()=>Array(size).fill(false));g.shopCards=stock.slice();g.shopTiles.forEach(t=>t.wasteland=false);
 g.currentPlayerIdx=0;g.drawPile=deck.slice();g.winner=null;g.handKnowledge=g.players.map(()=>new Map());
 for(const [r,c,id]of board)g.setCardAt(r,c,id);for(const [r,c]of waste)g.setWastelandAt(r,c,true);A.setGame(g);return g;
}
function isMain(g,t){return t&&t.r>=0&&t.c>=0&&t.r<g.board.length&&t.c<g.board.length;}
function shopState(g){return JSON.stringify(g.shopTiles.map(t=>({r:t.r,c:t.c,id:g.cardAt(t.r,t.c),waste:g.wastelandAt(t.r,t.c)})));}
function fillMain(g,ids=['sdm_patchouli']){for(let r=0;r<g.board.length;r++)for(let c=0;c<g.board.length;c++)if(!g.cardAt(r,c))g.setCardAt(r,c,ids[(r+c)%ids.length]);}
function forcePayment(g){g.selectCostCards=async(p,n)=>g.payableCards(p).slice(0,n);g.payCostN=async(p,max)=>{const n=Math.min(max,g.payableCards(p).length);return n&&await g.payCost(p,n)?n:0;};}

test('AI single, multiple and board choices exclude all shop cells before random selection',async()=>{
 for(const size of [4,5])for(const difficulty of difficulties){
  const g=setup({size,difficulty,board:[[0,0,'medicine']]});forcedRandom=.999999;
  try{const cells=[{r:0,c:0},...g.shopTiles];assert(isMain(g,await g.chooseCell(0,cells,'test')));assert(isMain(g,await g.chooseBoardCell(0,cells,'test')));assert.equal((await g.chooseCells(0,4,cells,'test')).length,1);assert.equal(await g.chooseCell(0,g.shopTiles,'test'),null);assert.equal((await g.chooseCells(0,3,g.shopTiles,'test')).length,0);}finally{forcedRandom=null;}
 }
});
test('AI 2×2 and 3×3 areas remain on the main board, including random edge choices',async()=>{
 for(const size of [4,5]){const g=setup({size});for(const dim of [2,3]){assert(g.rectZones(dim,0).every(z=>z.every(t=>isMain(g,t))));for(let i=0;i<40;i++)assert((await g.chooseRectArea(0,dim,'test')).every(t=>isMain(g,t)));assert((await g.chooseOccupiedRectArea(0,dim,0,'test')).every(t=>isMain(g,t)));}}
});
test('All AI policies and mistake branches restrict ordinary and bonus placements to main cells',()=>{
 for(const size of [4,5])for(const policy of policies){
  const g=setup({size,policy,hand:['mtn_sanae'],stock:[null,null,null,null]}),cells=g.allTiles();g.aiMakesMistake=()=>true;
  assert(A.aiPlacementCells(g,'mtn_sanae',cells).every(t=>isMain(g,t)));assert(isMain(g,A.aiFactionPlacement(0,'mtn_sanae',cells,'mountain')));
  assert.equal(A.aiFactionPlacement(0,'mtn_sanae',g.shopTiles,'mountain'),null);
  g.setCardAt(0,0,'hell_komachi');g.setCardAt(0,1,'sdm_patchouli');g.shopCards=['sage_yukari','hourai_kaguya','mtn_kanako','palace_satori'];
  assert(isMain(g,A.aiKomachiTarget(0,0,0,[{r:0,c:1},...g.shopTiles])));assert.equal(A.aiKomachiTarget(0,0,0,g.shopTiles),null);
 }
});
test('Yukari, Reimu, Marisa and Matara ignore valuable unprotected merchandise',async()=>{
 for(const size of [4,5])for(const policy of policies){
  let g=setup({size,policy,hand:['sage_yukari'],board:[[0,0,'mtn_sanae']],stock:['sage_kasen','hourai_kaguya','sdm_flandre','sdm_sakuya']});
  assert(A.aiPlacementCells(g,'sage_yukari',g.allTiles()).every(t=>isMain(g,t)));for(let slot=0;slot<4;slot++)assert(!g.canOverrideShop(0,slot));
  let before=shopState(g);await g.resolveAbility('reimu',1,1,0,0);assert.equal(shopState(g),before);assert.equal(g.players[0].hand.length,1);
  assert.equal(A.aiPlacementCells(g,'reimu',g.emptyCells(0)).length,0,'Shop crowns cannot justify AI Reimu placement');
  await g.resolveAbility('marisa',1,1,0,0);assert.equal(shopState(g),before);assert(g.players[0].discard.includes('mtn_sanae'));
  g=setup({size,policy,board:[[1,1,'sage_matara']],stock:['sdm_sakuya','sdm_flandre','heaven_tenshi','temple_murasa']});before=shopState(g);
  assert.equal(A.aiBestChannel(0,1,1),null);assert.deepEqual(plain(await g.resolveAbility('sage_matara',1,1,0,0)),{});assert.equal(shopState(g),before);
 }
});
test('Iku skips a shop-only area without paying and sends two legal main cards when available',async()=>{
 for(const size of [4,5]){
  let g=setup({size,policy:'baseline',hand:payment.slice(0,3),board:[[1,1,'heaven_iku']]});forcePayment(g);const before=JSON.stringify([g.players[0].hand,g.drawPile,g.shopCards]);
  assert.equal(g.estimateDirectDiscardPoints(0,'heaven_iku',1,1),0);assert(!A.aiCostCanResolve(0,'heaven_iku',1,1));await g.resolveAbility('heaven_iku',1,1,0,0);assert.equal(JSON.stringify([g.players[0].hand,g.drawPile,g.shopCards]),before);
  g=setup({size,policy:'baseline',hand:payment.slice(0,3),board:[[1,1,'heaven_iku'],[0,0,'medicine'],[0,1,'mtn_sanae']]});forcePayment(g);const stock=shopState(g);
  await g.resolveAbility('heaven_iku',1,1,0,0);assert.equal(g.players[0].discard.length,2);assert.equal(g.players[0].hand.length,0);assert.equal(shopState(g),stock);
 }
});
test('Tenshi and Eiki return main cards while preserving matching shop stock',async()=>{
 for(const size of [4,5])for(const ability of ['heaven_tenshi','hell_eiki']){
  const g=setup({size,policy:'baseline',hand:payment.slice(0,2),board:[[1,1,ability],[0,0,'sdm_patchouli'],[0,1,'sdm_flandre'],[0,2,'sdm_meiling']]});forcePayment(g);
  if(ability==='heaven_tenshi')for(const t of g.allTiles().filter(t=>isMain(g,t)))if(!g.cardAt(t.r,t.c))g.setWastelandAt(t.r,t.c,true);
  const before=shopState(g);await g.resolveAbility(ability,1,1,0,0);assert.equal(shopState(g),before);assert.equal(g.cardAt(0,0),null);assert(g.drawPile.includes('sdm_patchouli'));
 }
});
test('Shou clears only main wasteland and Ichirin only pushes main cards',async()=>{
 for(const size of [4,5]){
  let g=setup({size,policy:'baseline',hand:['medicine'],board:[[1,1,'temple_shou']],waste:[[0,0]],deck:['sdm_flandre']});forcePayment(g);g.shopTiles.forEach(t=>t.wasteland=true);let before=shopState(g);
  await g.resolveAbility('temple_shou',1,1,0,0);assert(!g.wastelandAt(0,0));assert.equal(shopState(g),before);assert.equal(g.players[0].hand.length,1);
  g=setup({size,policy:'baseline',hand:payment.slice(0,2),board:[[1,1,'temple_ichirin'],[0,0,'medicine']]});forcePayment(g);before=shopState(g);
  await g.resolveAbility('temple_ichirin',1,1,0,0);assert.equal(g.cardAt(0,0),null);assert(g.drawPile.includes('medicine'));assert.equal(shopState(g),before);
 }
});
test('Byakuren returns main cards and cannot be tricked into mutating a shop target at impact',async()=>{
 const g=setup({policy:'baseline',difficulty:'easy',hand:payment.slice(0,3),board:[[1,1,'temple_byakuren'],[0,0,'medicine']]});forcePayment(g);
 g.chooseByakurenEffect=async(_p,_r,_c,used)=>used.has('return')?null:'return';g.aiMakesMistake=()=>true;
 // Deliberately bypass the chooser to test the execution guard as well as candidate lists.
 g.chooseCells=async()=>[{r:0,c:0},g.shopTiles[0],g.shopTiles[1]];const before=shopState(g);
 await g.resolveAbility('temple_byakuren',1,1,0,0);assert.equal(shopState(g),before);assert.equal(g.cardAt(0,0),null);assert(g.wastelandAt(0,0));assert.equal(g.templeWasteland(0).length,1);
});
test('AI skill plans and channel predictions never use shop targets or origins',()=>{
 for(const policy of ['current','previous']){
  const g=setup({policy,hand:payment,board:[[1,1,'sage_matara'],[0,0,'mtn_sanae'],[0,1,'medicine']]});
  const discard=A.aiBestDiscardTarget(0,[{r:0,c:0},...g.shopTiles]);assert(isMain(g,discard.cell));
  assert(isMain(g,A.aiBestChannel(0,1,1).cell));assert(A.aiBestEikiFaction(0).cells.every(t=>isMain(g,t)));
  const iku=A.aiAbilityPlan(0,'heaven_iku',1,1);assert(iku.target.every(t=>isMain(g,t)));
  for(const tile of g.shopTiles){assert(A.aiAbilityPlan(0,'heaven_iku',tile.r,tile.c).skip);assert.equal(A.aiBestChannel(0,tile.r,tile.c),null);assert(!A.aiCostCanResolve(0,'heaven_iku',tile.r,tile.c));}
 }
});
test('Kanako, Kaguya and Ran keep cards in hand when only shop vacancies remain',async()=>{
 for(const size of [4,5])for(const id of ['mtn_kanako','hourai_kaguya','sage_ran']){
  const hand=id==='mtn_kanako'?['mtn_sanae']:id==='hourai_kaguya'?['hourai_reisen']:[],g=setup({size,policy:'baseline',hand,board:[[1,1,id],[0,0,'sage_yukari']],stock:[null,null,null,null],deck:id==='sage_ran'?['mtn_sanae']:[]});fillMain(g);
  const before=shopState(g);await g.resolveAbility(id,1,1,0,0);assert.equal(shopState(g),before);assert.deepEqual(plain(g.players[0].hand),id==='sage_ran'?['mtn_sanae']:hand);
 }
});
test('Koishi waits in an AI hand on a full main board and enters main vacancies for every policy',async()=>{
 for(const size of [4,5])for(const policy of policies){
  const g=setup({size,policy,hand:['palace_koishi'],board:[[0,0,'palace_satori'],[0,1,'palace_rin'],[1,0,'palace_utsuho']],stock:[null,null,null,null]});fillMain(g);const before=shopState(g);
  assert.equal(g.checkKoishiTrigger(0),null);await g.resolveKoishiCascade(0);assert(g.players[0].hand.includes('palace_koishi'));assert.equal(shopState(g),before);
  g.setCardAt(size-1,size-1,null);await g.resolveKoishiCascade(0);assert(!g.players[0].hand.includes('palace_koishi'));assert.equal(g.cardAt(size-1,size-1),'palace_koishi');assert.equal(shopState(g),before);
 }
});
test('Explicit ability owner controls scope even during another player’s turn',async()=>{
 const g=setup({hand:['medicine'],board:[[1,1,'temple_shou']],waste:[[0,0]],deck:['sdm_flandre']});g.players[1].isAI=false;g.currentPlayerIdx=1;g.shopTiles[1].wasteland=true;forcePayment(g);
 await g.resolveAbility('temple_shou',1,1,0,0);assert(!g.wastelandAt(0,0));assert(g.shopTiles[1].wasteland);
 const tile=g.shopTiles[2];assert.equal(g.yuugiTargets(tile.r,tile.c,false,0).length,0);assert.equal(g.yuyukoTargets(tile.r,tile.c,0).length,0);
});
test('Final placement and movement guards refuse shop coordinates without changing cards',async()=>{
 const g=setup({hand:['sage_yukari']}),t=g.shopTiles[0],before=JSON.stringify(g.testRuleState());
 assert.deepEqual(plain(await g.internalPlace('sage_yukari',t.r,t.c,0,0)),{});assert.equal(g.moveBoardToHand(t.r,t.c,0,'yukari'),false);assert.equal(g.moveBoardToDiscard(t.r,t.c,0,'marisa'),false);assert.equal(g.moveBoardToDraw(t.r,t.c,'tenshi',0),false);
 assert.deepEqual(plain(await g.resolveAbility('sdm_sakuya',t.r,t.c,0,0)),{});assert.equal(JSON.stringify(g.testRuleState()),before);
});
test('Normal AI trading and acquired fifth cards on the main board still work',async()=>{
 const g=setup({hand:['medicine'],stock:['shop_rinnosuke','sdm_meiling','hourai_tewi','hell_kutaka']});assert(g.canTrade(0,'medicine'));assert(g.tradeCard(0,'medicine',1));assert(g.players[0].hand.includes('sdm_meiling'));assert.equal(g.shopCards[1],'medicine');assert(!g.canTrade(0,'sdm_meiling'));
 g.setCardAt(0,0,'hourai_tewi');const before=shopState(g);await g.resolveAbility('marisa',1,1,0,0);assert(g.players[0].discard.includes('hourai_tewi'));assert.equal(shopState(g),before);
});
test('Rinnosuke and his neighbours cannot be selected by human or AI abilities on the main board',async()=>{
 for(const size of [4,5])for(const human of [true,false]){
  const g=setup({size,human,board:[[1,1,'shop_rinnosuke'],[0,0,'sdm_patchouli'],[0,1,'sdm_sakuya'],[1,2,'medicine'],[size-1,size-1,'mtn_sanae']]});
  for(const t of g.boardCells().filter(t=>g.isProtected(t.r,t.c)))assert(!g.canSelectBoardCard(t.r,t.c));
  assert(g.canSelectBoardCard(size-1,size-1));assert(g.selectableBoardCells(0).every(t=>!g.isProtected(t.r,t.c)));
  if(human)g.ui.pickCell=async(_title,cells)=>cells[0];
  const before=plain(g.board);await g.resolveAbility('marisa',size-1,0,0,0);
  for(const t of [{r:1,c:1},{r:0,c:0},{r:0,c:1},{r:1,c:2}])assert.equal(g.cardAt(t.r,t.c),before[t.r][t.c]);
 }
});
test('AI Yukari filters every protected card using selection rules instead of a Rinnosuke ID exception',()=>{
 assert(!js.includes("return spaces.filter(cell=>currentGame.cardAt(cell.r,cell.c)!=='shop_rinnosuke')"));
 for(const policy of policies){
  const g=setup({policy,hand:['sage_yukari'],board:[[1,1,'shop_rinnosuke'],[0,0,'sdm_patchouli']]});
  const spaces=g.emptyOrWastelandForCard(A.CARD.sage_yukari,0),choices=A.aiPlacementCells(g,'sage_yukari',spaces);
  assert(spaces.some(t=>t.r===1&&t.c===1),'The prior override remains a legal human interaction');
  assert(!choices.some(t=>g.cardAt(t.r,t.c)&&g.isProtected(t.r,t.c)));
 }
});
test('Trading bypasses Rinnosuke selection protection and still respects active Nitori',()=>{
 const g=setup({human:true,hand:['sdm_meiling'],board:[[1,1,'shop_rinnosuke'],[0,2,'medicine'],[0,3,'mtn_nitori']]});
 assert(!g.canSelectBoardCard(0,2));assert(!g.canSelectBoardCard(0,2,true));assert(!g.tradeCells().some(t=>t.r===0&&t.c===2));
 g.setCardAt(0,3,null);assert(!g.canSelectBoardCard(0,2));assert(g.canSelectBoardCard(0,2,true));assert(g.tradeCells().some(t=>t.r===0&&t.c===2));
 assert(g.tradeCard(0,'sdm_meiling',{r:0,c:2}));assert(g.players[0].hand.includes('medicine'));
});
test('Yukari may override Rinnosuke first and the protection follows him after replacement',async()=>{
 const g=setup({human:true,hand:['sage_yukari'],stock:['shop_rinnosuke','sdm_meiling','hourai_tewi','hell_kutaka']}),tile=g.shopTiles[0];
 assert(!g.canSelectBoardCard(tile.r,tile.c));await g.overrideShop(0,0);assert(g.players[0].hand.includes('shop_rinnosuke'));
 assert(g.canSelectBoardCard(g.shopTiles[1].r,g.shopTiles[1].c));g.removeFromHand(0,'shop_rinnosuke');await g.internalPlace('shop_rinnosuke',1,1,0,0);
 g.setCardAt(0,0,'medicine');assert(!g.canSelectBoardCard(1,1));assert(!g.canSelectBoardCard(0,0));assert(g.canSelectBoardCard(g.shopTiles[1].r,g.shopTiles[1].c));
});
test('Human shop choice, ranges, global effects and Yukari’s Rinnosuke easter egg remain available',async()=>{
 const g=setup({human:true,hand:['sage_yukari'],stock:['shop_rinnosuke','sdm_meiling','hourai_tewi','hell_kutaka']}),tile=g.shopTiles[0];
 g.ui.pickCell=async(_title,cells)=>cells[cells.length-1];assert(!isMain(g,await g.chooseCell(0,g.allTiles(),'test')));assert(g.rectZones(2,0).some(z=>z.some(t=>!isMain(g,t))));assert(g.canOverrideShop(0,0));
 await g.overrideShop(0,0);assert.equal(g.cardAt(tile.r,tile.c),'sage_yukari');assert(g.players[0].hand.includes('shop_rinnosuke'));
 const h=setup({human:true,hand:['medicine'],board:[[1,1,'temple_shou']],waste:[[0,0]],deck:['sdm_flandre']});forcePayment(h);h.shopTiles[1].wasteland=true;await h.resolveAbility('temple_shou',1,1,0,0);assert(!h.shopTiles[1].wasteland);
});
test('Every catalogue ability preserves shop cards and terrain, both directly and when copied',async()=>{
 let runs=0;
 for(const size of [4,5])for(const actor of ['direct','sage_matara','temple_nue'])for(const card of A.CARDS.filter(c=>!c.token&&!c.shopkeeper)){
  const id=card.id,caster=actor==='direct'?id:actor;
  const g=setup({size,policy:'baseline',hand:payment.filter(p=>p!==caster&&p!==id),board:[[1,1,caster],[0,0,'medicine'],[0,1,'mtn_sanae'],[2,2,'palace_rin']],waste:[[0,2],[2,0]],deck:['hourai_mokou','mtn_aya','hell_clownpiece'],opponents:[['hourai_reisen','sdm_flandre'],['hourai_tewi']]});
  g.shopTiles.forEach(t=>t.wasteland=true);forcePayment(g);g.chooseByakurenEffect=async(_p,_r,_c,used)=>['return','look','turns'].find(value=>!used.has(value))??null;
  const before=shopState(g);await g.resolveAbility(id,1,1,0,actor==='direct'?0:1);assert.equal(shopState(g),before,`${size} ${actor} copying ${id}`);runs++;
 }
 console.log(`  Catalogue resolutions: ${runs}`);
});
test('Real AI actions, including forced placements, never place into empty shop cells',async()=>{
 for(const policy of policies)for(const difficulty of difficulties){
  const g=setup({policy,difficulty,hand:['mtn_sanae'],stock:[null,null,null,null]});g.forcedPlay[0]='mtn_sanae';await A.doPlayerAction(0);assert(g.mainBoardCells(t=>t.id==='mtn_sanae').length===1);assert(g.shopCards.every(id=>!id));
  const full=setup({policy,difficulty,hand:['mtn_sanae'],stock:[null,null,null,null]});fillMain(full);full.forcedPlay[0]='mtn_sanae';await A.doPlayerAction(0);assert(full.players[0].hand.includes('mtn_sanae'));assert(full.shopCards.every(id=>!id));assert.equal(full.forcedPlay[0],null);assert(!A.canAct(0));
 }
});
(async()=>{let passed=0;for(const [name,fn]of tests){try{await fn();passed++;console.log('PASS '+name);}catch(error){forcedRandom=null;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`${passed}/${tests.length} AI shop targeting checks passed`);if(passed!==tests.length)process.exitCode=1;})();
