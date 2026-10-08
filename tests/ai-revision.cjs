const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||'touhou_board_game_github_textures.html','utf8');
const js=html.split('<script>')[1].split('</script>')[0];
new vm.Script(js);
const core=js.slice(js.indexOf('const DIRS4'),js.indexOf('/* ===================== UI layer'));
const ai=js.slice(js.indexOf('const NO_PLACED_ABILITY'),js.indexOf('async function doPlayerAction'));
let randomSeed=20260930;
const seededMath=Object.create(Math);seededMath.random=()=>((randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0)/4294967296);
const context={console,Math:seededMath,Set,Map,Promise,setTimeout:fn=>{fn();return 0},clearTimeout(){},
  triggerPlacementPresentation(){},speakRinnosuke(){},logOverride(){},lastPlacedCell:null,renderAll(){},humanActionResolving:false};
vm.createContext(context);
vm.runInContext(core+'\nvar game=null;\n'+ai+`\nthis.api={Game,CARD,CARDS,FACTIONS,aiEvaluateCard,aiDecideAction,aiDrawValue,aiChooseCostCards,
aiRetentionValue,aiFactionPlacement,aiCurrentClaims,aiCostCanResolve,aiPlacementCells,aiDecideHardAction,aiTwoCardFactionTrade,AI_DIFFICULTIES,
setGame:g=>game=g,setSize:n=>SIZE=n};`,context);
vm.runInContext(js.slice(js.indexOf('async function doPlayerAction'),js.indexOf('async function afterAction'))+
  '\nthis.api.doPlayerAction=doPlayerAction;this.api.resolveFollowups=resolveFollowups;'+
  js.slice(js.indexOf('function canTakeTurnAction'),js.indexOf('/* Cards with no "Placed:'))+'\nthis.api.canAct=canAct;',context);
const A=context.api;
function setup({size=4,hand=[],opponents=[[],[],[]],board=[],waste=[],deck=[],discards=[],shop=false}={}){
  A.setSize(size);const g=new A.Game(4,{},null,{kourindou:shop});
  g.players.forEach((p,i)=>{p.hand=i===1?hand.slice():(opponents[i===0?0:i-1]||[]).slice();p.discard=(discards[i]||[]).slice();});
  g.handKnowledge=g.players.map(()=>new Map());g.drawPile=deck.slice();g.board=Array.from({length:size},()=>Array(size).fill(null));
  g.wasteland=Array.from({length:size},()=>Array(size).fill(false));g.currentPlayerIdx=1;g.winner=null;
  for(const [r,c,id] of board)g.setCardAt(r,c,id);
  for(const [r,c] of waste)g.setWastelandAt(r,c,true);
  A.setGame(g);return g;
}
const six=['mtn_suwako','mtn_aya','palace_utsuho','palace_rin','sage_ran','medicine'];
const tests=[];function test(name,fn){tests.push([name,fn]);}

test('Each two-card faction buys its missing partner before the chosen placement on both board sizes',()=>{
  for(const size of [4,5])for(const [cardId,partner] of [['haku_youmu','haku_yuyuko'],['marisa','reimu'],['medicine','yuuka'],['heaven_iku','heaven_tenshi']]){
    const g=setup({size,hand:[cardId,'sdm_meiling'],shop:true});g.shopCards=['shop_rinnosuke',partner,'hourai_tewi','hell_kutaka'];
    const placement={type:'place',cardId,r:2,c:2},before=JSON.stringify([g.board,g.players,g.drawPile,g.shopCards]);
    const action=A.aiTwoCardFactionTrade(1,placement);assert(action);assert.equal(action.type,'trade');assert.equal(action.cardId,'sdm_meiling');assert.equal(g.cardAt(action.target.r,action.target.c),partner);assert.equal(action.thenPlace,placement);
    assert.equal(JSON.stringify([g.board,g.players,g.drawPile,g.shopCards]),before);
  }
});
test('Preparatory trading keeps cards that can already complete a larger faction',()=>{
  const g=setup({hand:['medicine','temple_murasa','sdm_meiling'],board:[[0,0,'temple_nue'],[0,1,'temple_shou'],[1,0,'temple_ichirin']]});g.shopCards=['shop_rinnosuke','yuuka','hourai_tewi','hell_kutaka'];
  const action=A.aiTwoCardFactionTrade(1,{type:'place',cardId:'medicine',r:2,c:2});assert.equal(action.cardId,'sdm_meiling');
});
test('No preparatory trade is made for an existing partner, a larger faction or unrelated stock',()=>{
  const g=setup({hand:['medicine','sdm_meiling']});g.shopCards=['shop_rinnosuke','yuuka','hourai_tewi','hell_kutaka'];
  const placement={type:'place',cardId:'medicine',r:2,c:2};
  g.players[1].hand.push('yuuka');assert.equal(A.aiTwoCardFactionTrade(1,placement),null);g.players[1].hand.pop();
  g.setCardAt(0,0,'yuuka');assert.equal(A.aiTwoCardFactionTrade(1,placement),null);g.setCardAt(0,0,null);
  assert.equal(A.aiTwoCardFactionTrade(1,{...placement,cardId:'sdm_meiling'}),null);
  g.shopCards[1]='palace_yuugi';assert.equal(A.aiTwoCardFactionTrade(1,placement),null);
});
test('Preparatory trading respects Murasa, Reisen, the once-per-turn limit and untradeable Trap cards',()=>{
  const g=setup({hand:['medicine','sdm_meiling']});g.shopCards=['shop_rinnosuke','yuuka','hourai_tewi','hell_kutaka'];const placement={type:'place',cardId:'medicine',r:2,c:2};
  g.placementBlockedForTurn[1]=true;assert.equal(A.aiTwoCardFactionTrade(1,placement),null);g.placementBlockedForTurn[1]=false;
  g.forcedPlay[1]='medicine';assert.equal(A.aiTwoCardFactionTrade(1,placement),null);g.forcedPlay[1]=null;
  g.tradedThisTurn[1]=true;assert.equal(A.aiTwoCardFactionTrade(1,placement),null);g.tradedThisTurn[1]=false;
  g.players[1].hand=['medicine','trap_token'];assert.equal(A.aiTwoCardFactionTrade(1,placement),null);g.players[1].hand=['medicine'];assert.equal(A.aiTwoCardFactionTrade(1,placement),null);
});
test('Kasen cannot supply a two-card partner, while the physical partner still can',()=>{
  const g=setup({hand:['medicine','sdm_meiling']});g.shopCards=['shop_rinnosuke','sage_kasen','yuuka','hell_kutaka'];const placement={type:'place',cardId:'medicine',r:2,c:2};
  let action=A.aiTwoCardFactionTrade(1,placement);assert.equal(g.cardAt(action.target.r,action.target.c),'yuuka');
  g.shopCards[2]='hourai_tewi';assert.equal(A.aiTwoCardFactionTrade(1,placement),null);
  g.setCardAt(0,0,'hourai_eirin');assert.equal(A.aiTwoCardFactionTrade(1,placement),null);
});
test('An actual AI turn trades for a partner first, then keeps its planned placement and spends only one turn',async()=>{
  const g=setup({hand:['medicine','sdm_meiling'],opponents:[['mtn_aya','hourai_mokou'],[],[]]});g.shopCards=['shop_rinnosuke','yuuka','hourai_tewi','hell_kutaka'];const events=[];
  g.ui.onShopTrade=e=>events.push(['trade',e.boughtId]);g.ui.onPlacementArrival=e=>{events.push(['place',e.cardId]);assert(g.players[1].hand.includes('yuuka'));};
  const action=await A.aiDecideAction(1);assert.equal(action.type,'trade');assert.equal(action.thenPlace.cardId,'medicine');
  const flags=await A.doPlayerAction(1);assert.deepEqual(events,[['trade','yuuka'],['place','medicine']]);assert.equal(g.mainBoardCells().length,1);assert(g.players[1].hand.includes('yuuka'));assert(!g.players[1].hand.includes('medicine'));assert.equal(g.currentPlayerIdx,1);assert(g.tradedThisTurn[1]);assert(!flags.skipAdvance);
});
test('Normal retains the old Easy preparatory trade when a mistake changes its placement',async()=>{
  for(const difficulty of ['normal']){
    const g=setup({hand:['medicine','sdm_meiling'],deck:['hourai_mokou']});g.aiDifficulty=difficulty;g.shopCards=['shop_rinnosuke','yuuka','hourai_tewi','hell_kutaka'];g.aiMakesMistake=kind=>kind==='action';let prepared=0;
    for(let i=0;i<35;i++){
      const action=await A.aiDecideAction(1);if(action.thenPlace?.cardId==='medicine'){prepared++;assert.equal(action.type,'trade');assert.equal(action.cardId,'sdm_meiling');assert.equal(g.cardAt(action.target.r,action.target.c),'yuuka');}
      assert(!(action.type==='place' && action.cardId==='medicine'));
    }
    assert(prepared>0);
  }
});

test('A hand placement lands before its Placed ability can ask for input',async()=>{
  const g=setup();let finish,abilityCalls=0;
  const landing=new Promise(resolve=>finish=resolve);
  g.ui.onPlacementArrival=()=>()=>landing;
  g.resolveAbility=async()=>{abilityCalls++;return {};};
  const placing=g.internalPlace('hourai_eirin',0,0,1,0);
  assert.equal(g.cardAt(0,0),'hourai_eirin');assert.equal(abilityCalls,0);
  finish(true);await placing;assert.equal(abilityCalls,1);
});
test('A cancelled placement handoff cannot trigger its ability',async()=>{
  const g=setup();let finish,abilityCalls=0;
  const landing=new Promise(resolve=>finish=resolve);
  g.ui.onPlacementArrival=()=>()=>landing;
  g.resolveAbility=async()=>{abilityCalls++;return {};};
  const placing=g.internalPlace('hourai_eirin',0,0,1,0);
  g.cancelled=true;finish(false);await placing;assert.equal(abilityCalls,0);
});

test('Protected cards have no board faction, including Kasen, and regain it when the keeper leaves',()=>{
  const g=setup({board:[[1,1,'shop_rinnosuke'],[0,0,'sage_kasen'],[1,2,'sdm_remilia']]});
  assert.equal(g.boardFaction(1,2),null);assert.equal(g.factionCells('sdm').length,0);
  assert.equal(g.factionCells('heaven').length,0);g.setCardAt(1,1,null);
  assert.equal(g.boardFaction(1,2),'sdm');assert.equal(g.factionCells('sdm').length,2);
});
test('Eiki ignores protected merchandise when finding the largest faction',async()=>{
  const g=setup({hand:['mtn_aya'],board:[[1,1,'shop_rinnosuke'],[0,0,'sdm_remilia'],[0,1,'sdm_flandre'],[1,0,'sdm_patchouli'],[3,3,'hell_eiki'],[3,2,'hell_komachi']]});
  await g.resolveAbility('hell_eiki',3,3,1,0);
  assert.equal(g.cardAt(3,3),null);assert.equal(g.cardAt(3,2),null);assert.equal(g.cardAt(0,0),'sdm_remilia');
});
test('Kasen evaluates four-card factions and ignores a former two-card completion',async()=>{
  const g=setup({hand:['sage_kasen'],board:[[0,0,'sdm_remilia'],[0,1,'sdm_flandre'],[1,0,'sdm_patchouli'],[3,3,'haku_yuyuko']]});
  const pick=await A.aiDecideAction(1,false);g.setCardAt(pick.r,pick.c,'sage_kasen');
  assert.equal(g.findFactionClaim('sdm').length,4);assert.equal(A.aiEvaluateCard(1,'sage_kasen')?.cardId,'sage_kasen');
});
test('Actual overlapping faction resolution claims the four-card group first',()=>{
  const g=setup({board:[[0,0,'sdm_remilia'],[0,1,'sdm_flandre'],[1,0,'sdm_patchouli'],[1,1,'sage_kasen'],[1,2,'haku_yuyuko']]});
  g.checkClaims(1);assert.equal(g.players[1].discard.length,4);assert.equal(g.cardAt(1,2),'haku_yuyuko');
});
test('Kasen preserves a feasible four-card route without predicting a two-card claim',()=>{
  setup({hand:['sage_kasen','sdm_sakuya'],board:[[0,0,'sdm_remilia'],[0,1,'sdm_flandre'],[3,3,'haku_yuyuko']]});
  const pick=A.aiEvaluateCard(1,'sage_kasen');assert.equal(pick.claimSize,4);assert.equal(pick.claimsNow,false);
});
test('Kasen cannot manufacture a winning two-card claim at five points',()=>{
  setup({hand:['sage_kasen','sdm_sakuya'],discards:[[],six.slice(0,5)],board:[[0,0,'sdm_remilia'],[0,1,'sdm_flandre'],[3,3,'haku_yuyuko']]});
  const pick=A.aiEvaluateCard(1,'sage_kasen');assert.equal(pick.winsNow,false);assert.equal(pick.claimsNow,false);assert.equal(pick.claimSize,4);
});
test('Kasen completes each of the seven four-card factions in real claim resolution',()=>{
  for(const faction of Object.keys(A.FACTIONS).filter(f=>A.FACTIONS[f].size===4)){
    const members=A.CARDS.filter(card=>card.faction===faction && !card.wild && !['hourai_eirin','hell_hecatia'].includes(card.id)).slice(0,3);
    const g=setup({board:members.map((card,i)=>[Math.floor(i/2),i%2,card.id])});g.setCardAt(1,1,'sage_kasen');
    assert.equal(g.findFactionClaim(faction).length,4,faction);g.checkClaims(1);
    assert.equal(g.players[1].discard.length,4,faction);assert(g.players[1].discard.includes('sage_kasen'));
  }
});
test('None of the four two-card factions can claim Kasen, but their printed pairs still claim',()=>{
  for(const faction of Object.keys(A.FACTIONS).filter(f=>A.FACTIONS[f].size===2)){
    const pair=A.CARDS.filter(card=>card.faction===faction);const g=setup({board:[[0,0,pair[0].id],[0,1,'sage_kasen']]});
    assert.equal(g.findFactionClaim(faction).length,0,faction);g.checkClaims(1);assert.equal(g.players[1].discard.length,0);
    g.setCardAt(0,1,pair[1].id);g.checkClaims(1);assert.equal(g.players[1].discard.length,2,faction);
  }
});
test('Borrowed Kasen ability obeys the four-card limit and Eirin disables its substitution',()=>{
  const g=setup({board:[[0,0,'yuuka'],[0,1,'temple_nue'],[2,0,'sdm_remilia'],[2,1,'sdm_flandre'],[3,0,'sdm_patchouli']]});
  g.borrowedAbilities.temple_nue='sage_kasen';assert.equal(g.isWildActive('temple_nue'),true);
  assert.equal(g.cardMatchesFaction('temple_nue','sunflower'),false);assert.equal(g.findFactionClaim('sunflower').length,0);
  g.setCardAt(0,1,null);g.setCardAt(3,1,'temple_nue');assert.equal(g.findFactionClaim('sdm').length,4);
  g.setCardAt(0,3,'hourai_eirin');assert.equal(g.findFactionClaim('sdm').length,0);assert.equal(g.isWildActive('temple_nue'),false);
});
test('Every comparison policy forecasts no two-card Kasen claim or preparatory trade',()=>{
  for(const policy of ['current','previous','baseline'])for(const [cardId,faction] of [['haku_youmu','hakugyokurou'],['marisa','hakurei'],['medicine','sunflower'],['heaven_iku','heaven']]){
    const g=setup({hand:['sage_kasen'],board:[[0,0,cardId]]});g.players[1].aiPolicy=policy;
    const candidate=A.aiEvaluateCard(1,'sage_kasen');assert.equal(candidate.claimsNow,false,policy+faction);assert.notEqual(candidate.claimSize,2,policy+faction);
    g.setCardAt(0,0,null);g.players[1].hand=[cardId,'sdm_meiling'];g.shopCards=['shop_rinnosuke','sage_kasen','hourai_tewi','hell_kutaka'];
    assert.equal(A.aiTwoCardFactionTrade(1,{type:'place',cardId,r:2,c:2}),null,policy+faction);
  }
});
test('Eirin disables Kasen faction substitution in both rule and evaluator',()=>{
  const g=setup({hand:['sage_kasen'],board:[[0,0,'sdm_remilia'],[0,1,'sdm_flandre'],[1,0,'sdm_patchouli'],[3,3,'hourai_eirin']]});
  assert.equal(g.wouldCompleteFaction('sage_kasen',1,1),false);assert.equal(A.aiEvaluateCard(1,'sage_kasen').claimsNow,false);
});
test('Eirin disables Crown passive scoring, discard restrictions, and Kanako doubling until removed',()=>{
  const g=setup({board:[[3,3,'hourai_eirin'],[0,0,'mtn_kanako'],[0,3,'sage_kasen']],discards:[[],['hell_hecatia']]});
  assert.equal(g.hasActiveAbility('mtn_kanako'),false);assert.equal(g.isWildActive('sage_kasen'),false);
  assert.equal(g.pointValue('hell_hecatia'),1);assert.equal(g.winCount(g.players[1]),1);
  assert.equal(g.canEnterDiscard(1,'hell_hecatia'),true);
  g.setCardAt(3,3,null);
  assert.equal(g.hasActiveAbility('mtn_kanako'),true);assert.equal(g.isWildActive('sage_kasen'),true);
  assert.equal(g.pointValue('hell_hecatia'),3);assert.equal(g.winCount(g.players[1]),3);
  assert.equal(g.canEnterDiscard(1,'hell_hecatia'),false);
});
test('Eirin disables Kanako wasteland permission but leaves ordinary non-Crown abilities active',async()=>{
  const g=setup({board:[[3,3,'hourai_eirin']],waste:[[0,0]]});
  assert.ok(!g.emptyOrWastelandForCard(A.CARD.mtn_kanako).some(c=>c.r===0&&c.c===0));
  await g.internalPlace('mtn_kanako',0,0,1,0);assert.equal(g.cardAt(0,0),null);
  await g.internalPlace('mtn_kanako',0,1,1,0);assert.equal(g.hasActiveAbility('mtn_kanako'),false);
  const result=await g.internalPlace('haku_youmu',1,0,1,0);assert.ok(result.skipAdvance);
});
test('Sanae draws one alone, four with Kanako, and two when Eirin disables Kanako doubling',async()=>{
  const deck=['sdm_remilia','sdm_flandre','sdm_patchouli','sdm_sakuya','hourai_mokou','hourai_reisen'];
  for(const [board,count] of [[[],1],[[[0,0,'mtn_kanako']],4],[[[0,0,'mtn_kanako'],[3,3,'hourai_eirin']],2]]){
    const g=setup({board,deck});g.setCardAt(1,1,'mtn_sanae');
    assert.equal(g.estimateHandGain(1,'mtn_sanae'),count);
    await g.resolveAbility('mtn_sanae',1,1,1,0);assert.equal(g.players[1].hand.length,count);
  }
});
test('Eirin stops Kanako from doubling Suwako and Aya',async()=>{
  const g=setup({board:[[0,0,'mtn_kanako'],[3,3,'hourai_eirin']],opponents:[six,[],[]]});
  let requested=0;g.chooseCells=async(_p,n)=>{requested=n;return [];};
  await g.resolveAbility('mtn_suwako',1,0,1,0);assert.equal(requested,3);
  await g.resolveAbility('mtn_aya',1,1,1,0);assert.equal(g.logLines.at(-1).reports[0].cards.length,4);
  g.setCardAt(3,3,null);
  await g.resolveAbility('mtn_suwako',1,0,1,0);assert.equal(requested,6);
  await g.resolveAbility('mtn_aya',1,1,1,0);assert.equal(g.logLines.at(-1).reports[0].cards.length,6);
});
test('While Eirin is active Yukari can override only Eirin, then abilities restore',async()=>{
  const g=setup({hand:['sage_yukari'],board:[[3,3,'hourai_eirin'],[1,1,'shop_rinnosuke'],[0,3,'medicine'],[3,0,'mtn_kanako']]});
  const occupied=g.emptyOrWastelandForCard(A.CARD.sage_yukari).filter(c=>g.cardAt(c.r,c.c));
  assert.equal(occupied.length,1);assert.equal(g.cardAt(occupied[0].r,occupied[0].c),'hourai_eirin');
  await g.internalPlace('sage_yukari',0,3,1,0);assert.equal(g.cardAt(0,3),'medicine');
  assert.ok(!g.canOverrideTarget('sage_yukari','shop_rinnosuke'));
  g.removeFromHand(1,'sage_yukari');await g.internalPlace('sage_yukari',3,3,1,0);
  assert.equal(g.cardAt(3,3),'sage_yukari');assert.ok(g.players[1].hand.includes('hourai_eirin'));
  assert.ok(g.hasActiveAbility('mtn_kanako'));assert.ok(g.canOverrideTarget('sage_yukari','shop_rinnosuke'));
});
test('Yukari removes Rinnosuke protection before resolving her own placement',async()=>{
  const g=setup({hand:['sage_yukari'],board:[[1,1,'shop_rinnosuke'],[1,2,'sdm_remilia']],waste:[[1,1]]});
  assert.ok(g.isProtected(1,2));g.removeFromHand(1,'sage_yukari');
  await g.internalPlace('sage_yukari',1,1,1,0);
  assert.equal(g.cardAt(1,1),'sage_yukari');assert.ok(g.players[1].hand.includes('shop_rinnosuke'));
  assert.equal(g.isProtected(1,2),false);
});
test('The real forced-placement path overrides Eirin on wasteland exactly once',async()=>{
  const waste=Array.from({length:16},(_,i)=>[Math.floor(i/4),i%4]);
  const g=setup({hand:['sage_yukari'],board:[[0,0,'hourai_eirin']],waste});
  let overrides=0;g.ui.onBoardToHand=()=>overrides++;g.forcedPlay[1]='sage_yukari';
  await A.doPlayerAction(1);
  assert.equal(g.cardAt(0,0),'sage_yukari');assert.deepEqual(Array.from(g.players[1].hand),['hourai_eirin']);
  assert.equal(overrides,1);
});
test('Restoring Hecatia scoring after overriding Eirin immediately checks for a win',async()=>{
  const discard=['hell_hecatia','sdm_flandre','sdm_patchouli','sdm_sakuya','hourai_mokou'];
  const g=setup({hand:['sage_yukari'],board:[[0,0,'hourai_eirin']],discards:[[],discard]});
  assert.equal(g.winCount(g.players[1]),5);g.removeFromHand(1,'sage_yukari');
  await g.internalPlace('sage_yukari',0,0,1,0);assert.equal(g.winCount(g.players[1]),7);assert.equal(g.winner,g.players[1]);
});
test('Cost payment snapshots effects then immediately renders the paid cards out of the hand',()=>{
  const hand=['sdm_remilia','sdm_flandre','sdm_patchouli','sdm_sakuya'];
  const g=setup({hand});const events=[];let shown=hand.slice();
  g.ui.onDrawPileReturn=({cardId,source})=>{assert.ok(shown.includes(cardId));assert.equal(source.effect,'cost');events.push(cardId);};
  g.ui.render=()=>{shown=Array.from(g.players[1].hand);events.push('render');};
  const paid=g.commitCostCards(1,hand.slice(0,3),3,3);
  assert.equal(paid,3);assert.deepEqual(shown,['sdm_sakuya']);
  assert.deepEqual(events,[...hand.slice(0,3),'render']);assert.equal(g.drawPile.length,3);
});
test('Invalid cost selections do not animate, remove cards, or render',()=>{
  const g=setup({hand:['sdm_remilia','trap_token']});let effects=0;
  g.ui.onCostPaid=g.ui.onDrawPileReturn=g.ui.render=()=>effects++;
  assert.equal(g.commitCostCards(1,['sdm_remilia','trap_token'],2,2),0);
  assert.equal(effects,0);assert.deepEqual(Array.from(g.players[1].hand),['sdm_remilia','trap_token']);
});
test('Iku discounts one target until six points, then permits the winning ability',async()=>{
  let g=setup({hand:['heaven_iku','sage_ran','mtn_suwako','mtn_aya'],board:[[0,0,'sdm_patchouli']]});
  let c=A.aiEvaluateCard(1,'heaven_iku');assert.equal(c.rate,0);assert.equal(c.lowPriority,true);
  g.players[1].discard=six.slice();c=A.aiEvaluateCard(1,'heaven_iku');assert.equal(c.rate,1);assert.equal(c.winsNow,true);
  g.removeFromHand(1,'heaven_iku');g.setCardAt(0,1,'heaven_iku');await g.resolveAbility('heaven_iku',0,1,1,0);
  assert.equal(g.cardAt(0,0),null);assert.equal(g.winCount(g.players[1]),7);
});
test('Rin separates acquisition value and opponent denial from immediate winning points',()=>{
  setup({hand:['palace_rin'],discards:[['sdm_patchouli'],six]});const c=A.aiEvaluateCard(1,'palace_rin');
  assert(c.rate>1);assert.equal(c.retrieval.target.denied,1);assert.equal(c.winsNow,false);
  setup({hand:['palace_rin'],discards:[[],['sdm_patchouli']]});const own=A.aiEvaluateCard(1,'palace_rin');assert.equal(own.rate,0);assert.equal(own.retrieval.target.ownLoss,1);
});
test('Satori has a usable one-card gain, and Yuuka accounts for cards returned and pile capacity',()=>{
  let g=setup({hand:['palace_satori','mtn_aya'],opponents:[['sdm_patchouli']]});assert.equal(A.aiEvaluateCard(1,'palace_satori').handGain,1);
  g=setup({hand:['yuuka','mtn_aya','mtn_suwako'],deck:['sage_ran','reimu']});assert.equal(g.estimateHandGain(1,'yuuka'),2);
  g.players[1].hand.push('medicine','sdm_sakuya','palace_rin');assert.equal(A.aiEvaluateCard(1,'yuuka').handGain,-1);
  g=setup({hand:['yuuka','mtn_aya','mtn_suwako']});assert.equal(A.aiEvaluateCard(1,'yuuka').lowPriority,false);
});
test('Shared draw value rises from zero to one as opponents cannot receive a card',()=>{
  const g=setup({deck:Array(8).fill('sdm_patchouli')});assert.equal(A.aiDrawValue(1),0);
  g.players[0].hand=Array(7).fill('sdm_patchouli');assert(Math.abs(A.aiDrawValue(1)-1/3)<1e-9);
  g.players[2].hand=Array(7).fill('sdm_patchouli');assert(Math.abs(A.aiDrawValue(1)-2/3)<1e-9);
  g.players[3].hand=Array(7).fill('sdm_patchouli');assert.equal(A.aiDrawValue(1),1);
  g.players[0].hand=[];g.drawPile=['sdm_patchouli'];assert.equal(A.aiDrawValue(1),1);
});
test('Reverse placement payment preserves a claiming Kasen and restores all simulation state',()=>{
  const g=setup({hand:['sage_kasen','mtn_aya','hourai_mokou'],board:[[0,0,'sdm_remilia'],[0,1,'sdm_flandre'],[1,0,'sdm_patchouli']]});
  const before=JSON.stringify([g.board,g.players,g.drawPile,g.handKnowledge,g.shopCards]);
  const paid=A.aiChooseCostCards(1,g.payableCards(1),2);assert(!paid.includes('sage_kasen'));
  assert.equal(JSON.stringify([g.board,g.players,g.drawPile,g.handKnowledge,g.shopCards]),before);
});
test('Sakuya is held when isolated and recognized as a same-turn four-card finisher',async()=>{
  let g=setup({hand:['sdm_sakuya'],deck:['mtn_aya','sage_ran']});assert.equal(A.aiEvaluateCard(1,'sdm_sakuya').reserveCombo,true);
  assert.equal((await A.aiDecideAction(1,false)).type,'draw');
  g=setup({hand:['sdm_sakuya','sdm_flandre','sdm_patchouli'],board:[[0,0,'sdm_remilia']]});
  const c=A.aiEvaluateCard(1,'sdm_sakuya');assert.equal(c.rate,4);assert.equal(c.lowPriority,false);
});
test('Impossible public faction releases reserved combo card',()=>{
  setup({hand:['sdm_sakuya'],discards:[['sdm_remilia','sdm_flandre','sdm_patchouli','sage_kasen']]});
  assert.equal(A.aiEvaluateCard(1,'sdm_sakuya').reserveCombo,false);
});
test('Kanako recognizes her follow-up and places it to finish the Mountain faction',async()=>{
  const g=setup({hand:['mtn_kanako','mtn_sanae'],board:[[0,0,'mtn_suwako'],[0,1,'mtn_aya']]});
  const c=A.aiEvaluateCard(1,'mtn_kanako');assert.equal(c.rate,4);assert.equal(c.reserveCombo,false);
  g.removeFromHand(1,'mtn_kanako');g.setCardAt(c.cell.r,c.cell.c,'mtn_kanako');await g.resolveAbility('mtn_kanako',c.cell.r,c.cell.c,1,0);
  assert.equal(g.players[1].discard.length,4);
});
test('Komachi recognizes the free follow-up while Eiki is active',()=>{
  setup({hand:['hell_komachi','hell_clownpiece'],board:[[0,0,'hell_eiki'],[0,1,'hell_kutaka']]});
  const c=A.aiEvaluateCard(1,'hell_komachi');assert(c.rate>=4);assert.equal(c.reserveCombo,false);
});
test('Koishi is preserved for her trigger and automatically chooses a claiming tile',async()=>{
  let g=setup({hand:['palace_koishi'],board:[[2,2,'palace_satori']]});assert.equal(A.aiEvaluateCard(1,'palace_koishi').reserveCombo,true);
  g=setup({hand:['palace_koishi'],board:[[2,2,'palace_satori'],[2,3,'palace_rin'],[3,2,'palace_utsuho']]});
  await g.resolveKoishiCascade(0);assert.equal(g.players[1].discard.length,4);
});
test('Kaguya places a partial known guess adjacent even without a complete claim plan',async()=>{
  const g=setup({opponents:[['hourai_mokou']],board:[[2,2,'hourai_kaguya']],discards:[['hourai_eirin','hourai_reisen']]});
  g.revealHand(0,['hourai_mokou'],[1]);assert.equal(g.planKaguyaClaim(null,1),null);
  await g.resolveAbility('hourai_kaguya',2,2,1,0);
  const tile=g.boardCells(t=>t.id==='hourai_mokou')[0];assert.equal(Math.abs(tile.r-2)+Math.abs(tile.c-2),1);
});
test('Tenshi counts wasteland plus cards without double-counting and excludes shop from threshold',async()=>{
  const g=setup({hand:['heaven_tenshi','mtn_aya','sage_ran'],board:[[0,0,'sdm_patchouli'],[0,1,'sdm_sakuya']],waste:[[0,0],[0,1],[0,2],[0,3],[1,0],[1,1],[1,2]],shop:true});
  assert.equal(g.tenshiOccupiedCount(),7);assert.equal(g.tenshiOccupiedCount({r:1,c:3}),8);
  assert.equal(A.aiCostCanResolve(1,'heaven_tenshi',1,3),true);
  g.removeFromHand(1,'heaven_tenshi');g.setCardAt(1,3,'heaven_tenshi');await g.resolveAbility('heaven_tenshi',1,3,1,0);
  assert.equal(g.cardAt(0,0),null);assert.equal(g.cardAt(1,3),'heaven_tenshi');
});
test('Reisen forced card still blocks trading and Marisa no-target is low priority',()=>{
  const g=setup({hand:['marisa','mtn_aya'],shop:true});g.forcedPlay[1]='mtn_aya';assert.equal(g.canTrade(1,'marisa'),false);
  const c=A.aiEvaluateCard(1,'marisa');assert.equal(c.lowPriority,true);assert.equal(c.rate,0);
});
test('Marisa target penalty lifts for a faction claim and when a valid blast exists',()=>{
  setup({hand:['marisa'],board:[[0,0,'sdm_patchouli']]});assert.equal(A.aiEvaluateCard(1,'marisa').lowPriority,false);
  setup({hand:['marisa'],board:[[0,0,'reimu'],[3,3,'sdm_patchouli']]});assert.equal(A.aiEvaluateCard(1,'marisa').claimsNow,true);
  assert.equal(A.aiEvaluateCard(1,'marisa').lowPriority,false);
});
test('Patchouli selects revealed opponent cards and transfers the correctly named card',async()=>{
  const g=setup({hand:['sdm_patchouli'],opponents:[['sage_yukari','mtn_aya']]});
  g.revealHand(0,['sage_yukari'],[1]);const guess=g.patchouliGuess(1);assert.equal(guess.id,'sage_yukari');assert.equal(guess.playerIdx,0);
  await g.resolveAbility('sdm_patchouli',1,1,1,0);assert(g.players[1].hand.includes('sage_yukari'));assert(!g.players[0].hand.includes('sage_yukari'));
});
test('Patchouli blind selection does not read opponent card identities',()=>{
  const g=setup({hand:['sdm_patchouli'],opponents:[['mtn_aya','hourai_mokou']]});
  g.players[0].hand=new Proxy(g.players[0].hand,{get(target,key){if(key==='length')return target.length;throw new Error('Hidden hand read: '+String(key));}});
  const guess=g.patchouliGuess(1);assert(guess);assert.equal(guess.playerIdx,0);
  assert(!g.knownHandCards(1).some(card=>card.playerIdx===0));
});
test('Patchouli can genuinely miss without altering either hand',async()=>{
  const g=setup({hand:['sdm_patchouli'],opponents:[['mtn_aya']]});
  g.patchouliGuess=()=>({id:'hourai_mokou',playerIdx:0});await g.resolveAbility('sdm_patchouli',1,1,1,0);
  assert.deepEqual(Array.from(g.players[0].hand),['mtn_aya']);assert.deepEqual(Array.from(g.players[1].hand),['sdm_patchouli']);
  assert(g.logLines.some(line=>line.includes('guess was wrong')));
});
test('Difficulty defaults to Hard and Easy/Normal take progressively more legal weaker actions',async()=>{
  const counts={};
  for(const difficulty of ['hard','normal','easy']){
    const g=setup({hand:['mtn_aya','mtn_suwako'],deck:['hourai_mokou','hourai_reisen','reimu']});
    assert.equal(g.aiDifficulty,'hard');g.aiDifficulty=difficulty;let mistakes=0;
    for(let i=0;i<160;i++){
      const action=await A.aiDecideAction(1,false);
      if(action.type==='place'){
        mistakes++;assert(g.players[1].hand.includes(action.cardId));
        assert(A.aiPlacementCells(g,action.cardId,g.emptyOrWastelandForCard(A.CARD[action.cardId])).some(t=>t.r===action.r && t.c===action.c));
      }else assert.equal(action.type,'draw');
    }
    counts[difficulty]=mistakes;
  }
  assert.equal(counts.hard,0);assert(counts.normal>0);assert(counts.easy>counts.normal);
  console.log('  Weaker action samples: '+JSON.stringify(counts));
});
test('Spring physics has bounded lag, settles, and respects reduced motion',()=>{
  const start=js.indexOf('function stepHandDragPhysics('),end=js.indexOf('function onHandCardPointerDown(',start);
  vm.runInContext(js.slice(start,end)+'\nthis.api.stepPhysics=stepHandDragPhysics;',context);
  const body={x:0,y:0,vx:0,vy:0,angle:0,tilt:0,scale:1},target={x:400,y:200};
  A.stepPhysics(body,target,1/60);assert(Math.hypot(body.x-target.x,body.y-target.y)<=65.001);assert(body.angle!==0);
  for(let i=0;i<240;i++)A.stepPhysics(body,target,1/60);
  assert(Math.hypot(body.x-target.x,body.y-target.y)<.01);assert(Math.abs(body.angle)<.01);
  A.stepPhysics(body,{x:100,y:50},.1,true);assert.equal(body.x,100);assert.equal(body.angle,0);assert.equal(body.scale,1);
});
test('Both board sizes complete a decision without mutating the game',async()=>{
  for(const size of [4,5]){
    const g=setup({size,hand:['sage_kasen','sdm_sakuya','sdm_patchouli','sdm_flandre','hourai_kaguya','palace_koishi','mtn_kanako'],
      board:[[0,0,'sdm_remilia'],[2,2,'mtn_sanae']],deck:['hourai_mokou','hourai_reisen','reimu']});
    const before=JSON.stringify([g.board,g.players,g.drawPile,g.shopCards]);const start=performance.now();
    const action=await A.aiDecideAction(1,false);assert.equal(action.type,'place');
    assert.equal(JSON.stringify([g.board,g.players,g.drawPile,g.shopCards]),before);
    console.log(`  ${size}x${size} decision: ${Math.round(performance.now()-start)}ms`);
  }
});
test('Actual AI actions and extra-turn chains preserve card conservation across four sample matches',async()=>{
  for(const [size,shop] of [[4,false],[4,true],[5,false],[5,true]]){
    A.setSize(size);const g=new A.Game(4,{},null,{kourindou:shop});A.setGame(g);g.players.forEach(p=>p.isAI=true);
    let skipped=0,turns=0;
    for(;turns<160 && !g.winner;turns++){
      const p=g.currentPlayerIdx;g.tradedThisTurn[p]=false;
      const extras=g.takeScheduledExtraTurns(p);
      if(!A.canAct(p)){if(++skipped>=4)break;}
      else{
        skipped=0;await A.resolveFollowups(p,await A.doPlayerAction(p));
        for(let i=0;i<extras && !g.winner && A.canAct(p);i++){
          g.tradedThisTurn[p]=false;await A.resolveFollowups(p,await A.doPlayerAction(p));
        }
      }
      const ids=[...g.drawPile,...g.boardCells().map(t=>g.cardAt(t.r,t.c)),...g.players.flatMap(p=>[...p.hand,...p.discard])];
      assert.equal(new Set(ids).size,ids.length,'No duplicated card identities');
      for(const id of g.startingCardIds)assert(ids.includes(id),'Lost card: '+id);
      g.currentPlayerIdx=(p+1)%4;
    }
    console.log(`  ${size}x${size}, shop ${shop}: ${turns} turns, ${g.winner?'winner':skipped>=4?'stalemate':'turn cap'}`);
  }
});
(async()=>{let failed=0;for(const [name,fn] of tests){try{await fn();console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+'\n'+e.stack);}}console.log(`${tests.length-failed}/${tests.length} AI regression scenarios passed`);process.exitCode=failed?1:0;})();
