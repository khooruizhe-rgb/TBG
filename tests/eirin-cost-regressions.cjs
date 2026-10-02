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
aiRetentionValue,aiFactionPlacement,aiCurrentClaims,aiCostCanResolve,aiPlacementCells,aiDecideHardAction,AI_DIFFICULTIES,
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

(async()=>{
  let passed=0;
  for(const [name,fn] of tests){
    try{await fn();console.log('PASS '+name);passed++;}
    catch(error){console.error('FAIL '+name);console.error(error.stack||error);}
  }
  console.log(`${passed}/${tests.length} Eirin and cost regression checks passed`);
  if(passed!==tests.length)process.exitCode=1;
})();
