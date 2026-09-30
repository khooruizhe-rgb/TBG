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
aiRetentionValue,aiFactionPlacement,aiCurrentClaims,aiCostCanResolve,aiPlacementCells,
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
test('Kasen evaluates all factions and chooses a four-card completion over a two-card one',async()=>{
  const g=setup({hand:['sage_kasen'],board:[[0,0,'sdm_remilia'],[0,1,'sdm_flandre'],[1,0,'sdm_patchouli'],[3,3,'haku_yuyuko']]});
  const pick=await A.aiDecideAction(1,false);g.setCardAt(pick.r,pick.c,'sage_kasen');
  assert.equal(g.findFactionClaim('sdm').length,4);assert.equal(A.aiEvaluateCard(1,'sage_kasen')?.cardId,'sage_kasen');
});
test('Actual overlapping faction resolution claims the four-card group first',()=>{
  const g=setup({board:[[0,0,'sdm_remilia'],[0,1,'sdm_flandre'],[1,0,'sdm_patchouli'],[1,1,'sage_kasen'],[1,2,'haku_yuyuko']]});
  g.checkClaims(1);assert.equal(g.players[1].discard.length,4);assert.equal(g.cardAt(1,2),'haku_yuyuko');
});
test('Kasen preserves a feasible four-card route over an immediate two-card claim',()=>{
  setup({hand:['sage_kasen','sdm_sakuya'],board:[[0,0,'sdm_remilia'],[0,1,'sdm_flandre'],[3,3,'haku_yuyuko']]});
  const pick=A.aiEvaluateCard(1,'sage_kasen');assert.equal(pick.claimSize,4);assert.equal(pick.claimsNow,false);
});
test('A winning two-card claim is not sacrificed to a speculative four-card plan',()=>{
  setup({hand:['sage_kasen','sdm_sakuya'],discards:[[],six.slice(0,5)],board:[[0,0,'sdm_remilia'],[0,1,'sdm_flandre'],[3,3,'haku_yuyuko']]});
  const pick=A.aiEvaluateCard(1,'sage_kasen');assert.equal(pick.winsNow,true);assert.equal(pick.claimsNow,true);
});
test('Eirin disables Kasen faction substitution in both rule and evaluator',()=>{
  const g=setup({hand:['sage_kasen'],board:[[0,0,'sdm_remilia'],[0,1,'sdm_flandre'],[1,0,'sdm_patchouli'],[3,3,'hourai_eirin']]});
  assert.equal(g.wouldCompleteFaction('sage_kasen',1,1),false);assert.equal(A.aiEvaluateCard(1,'sage_kasen').claimsNow,false);
});
test('Iku discounts one target until six points, then permits the winning ability',async()=>{
  let g=setup({hand:['heaven_iku','sage_ran','mtn_suwako','mtn_aya'],board:[[0,0,'sdm_patchouli']]});
  let c=A.aiEvaluateCard(1,'heaven_iku');assert.equal(c.rate,0);assert.equal(c.lowPriority,true);
  g.players[1].discard=six.slice();c=A.aiEvaluateCard(1,'heaven_iku');assert.equal(c.rate,1);assert.equal(c.winsNow,true);
  g.removeFromHand(1,'heaven_iku');g.setCardAt(0,1,'heaven_iku');await g.resolveAbility('heaven_iku',0,1,1,0);
  assert.equal(g.cardAt(0,0),null);assert.equal(g.winCount(g.players[1]),7);
});
test('Rin scores opponent denial as one without claiming it as an immediate win',()=>{
  setup({hand:['palace_rin'],discards:[['sdm_patchouli'],six]});const c=A.aiEvaluateCard(1,'palace_rin');
  assert.equal(c.rate,1);assert.equal(c.winsNow,false);
  setup({hand:['palace_rin'],discards:[[],['sdm_patchouli']]});assert.equal(A.aiEvaluateCard(1,'palace_rin').rate,0);
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
  const g=setup({hand:['heaven_tenshi','mtn_aya','sage_ran'],board:[[0,0,'sdm_patchouli']],waste:[[0,0],[0,1],[0,2],[0,3],[1,0],[1,1],[1,2]],shop:true});
  assert.equal(g.tenshiOccupiedCount(),7);assert.equal(g.tenshiOccupiedCount({r:1,c:3}),8);
  assert.equal(A.aiCostCanResolve(1,'heaven_tenshi',1,3),true);
  g.removeFromHand(1,'heaven_tenshi');g.setCardAt(1,3,'heaven_tenshi');await g.resolveAbility('heaven_tenshi',1,3,1,0);
  assert.equal(g.cardAt(0,0),null);assert.equal(g.cardAt(1,3),'heaven_tenshi');
});
test('Reisen forced card still blocks trading and Marisa no-target remains a zero-score fallback',()=>{
  const g=setup({hand:['marisa','mtn_aya'],shop:true});g.forcedPlay[1]='mtn_aya';assert.equal(g.canTrade(1,'marisa'),false);
  const c=A.aiEvaluateCard(1,'marisa');assert.equal(c.lowPriority,false);assert.equal(c.rate,0);
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
