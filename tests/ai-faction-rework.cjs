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
aiBestChannel,aiAbilityPlan,aiWithPlacement,aiSetupValue,aiMaterialValue,aiPaymentBreaksAssembly,aiRetentionValue,aiFactionPlacement,aiCurrentClaims,aiCostCanResolve,aiPlacementCells,aiDecideHardAction,aiTwoCardFactionTrade,AI_DIFFICULTIES,
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
const tests=[],test=(name,fn)=>tests.push([name,fn]);
const six=['mtn_suwako','mtn_aya','palace_utsuho','palace_rin','sage_ran','medicine'];
const state=g=>JSON.stringify([g.board,g.shopCards,g.players,g.drawPile,g.borrowedAbilities,g.handKnowledge,g.testMetrics,g.winner,g.logLines]);

test('Komachi requires another effective Hell member and cannot count herself',async()=>{
  let g=setup({board:[[1,1,'hell_komachi']]});
  assert.equal(g.hasOtherHellCard(),false);assert(!(await g.resolveAbility('hell_komachi',1,1,1,0)).skipAdvance);
  for(const id of ['hell_hecatia','hell_clownpiece','hell_eiki','hell_kutaka']){
    g=setup({board:[[1,1,'hell_komachi'],[1,2,id]]});
    assert.equal(g.hasOtherHellCard(),true);assert((await g.resolveAbility('hell_komachi',1,1,1,0)).skipAdvance,id);
  }
});
test('Protected merchandise does not supply Komachi free placement',async()=>{
  const g=setup({board:[[2,2,'hell_komachi'],[0,0,'shop_rinnosuke'],[0,1,'hell_eiki']]});
  assert.equal(g.boardFaction(0,1),null);assert.equal(g.hasOtherHellCard(),false);
  assert(!(await g.resolveAbility('hell_komachi',2,2,1,0)).skipAdvance);
});
test('Matara and Nue channel Komachi as the actual caster, with any other Hell member',async()=>{
  for(const actor of ['sage_matara','temple_nue']){
    const g=setup({board:[[1,1,actor],[1,2,'hell_clownpiece']]});
    assert((await g.resolveAbility('hell_komachi',1,1,1,0)).skipAdvance);
  }
});
test('The Hell free-action forecast works without Eiki and recognizes a six-point finish',()=>{
  setup({hand:['hell_komachi','hell_kutaka'],board:[[0,0,'hell_hecatia'],[0,1,'hell_clownpiece']]});
  const pick=A.aiEvaluateCard(1,'hell_komachi');assert(pick.rate>=6);assert.equal(pick.reserveCombo,false);
});
test('Mountain assembly starts with Nitori and saves Kanako until her follow-up completes it',async()=>{
  let g=setup({hand:['mtn_nitori','mtn_kanako','mtn_sanae','mtn_aya']});
  const first=await A.aiDecideHardAction(1,false);assert.equal(first.cardId,'mtn_nitori');
  assert(A.aiEvaluateCard(1,'mtn_nitori').setupValue>0);assert(A.aiEvaluateCard(1,'mtn_kanako').reserveCombo);
  g=setup({hand:['mtn_kanako','mtn_sanae','mtn_aya'],board:[[1,1,'mtn_nitori']]});
  assert.notEqual((await A.aiDecideHardAction(1,false)).cardId,'mtn_kanako');
  g=setup({hand:['mtn_kanako','mtn_aya'],board:[[1,1,'mtn_nitori'],[1,2,'mtn_sanae']]});
  const finish=await A.aiDecideHardAction(1,false);assert.equal(finish.cardId,'mtn_kanako');
  assert.equal(A.aiEvaluateCard(1,'mtn_kanako').reserveCombo,false);
  await A.doPlayerAction(1);assert.equal(g.players[1].discard.length,4);
});
test('Kanako waits even when the printed Mountain faction is publicly unavailable',async()=>{
  const g=setup({hand:['mtn_kanako'],deck:['sdm_patchouli'],discards:[['mtn_nitori','mtn_sanae','mtn_suwako','mtn_aya','sage_kasen']]});
  assert(A.aiEvaluateCard(1,'mtn_kanako').reserveCombo);assert.equal((await A.aiDecideHardAction(1,false)).type,'draw');
  g.drawPile=[];assert.equal((await A.aiDecideHardAction(1,false)).cardId,'mtn_kanako');
});
test('Hell assembly values Hecatia as its durable first member',async()=>{
  setup({hand:['hell_hecatia','hell_eiki','hell_clownpiece','hell_komachi','mtn_aya']});
  const pick=await A.aiDecideHardAction(1,false);assert.equal(pick.cardId,'hell_hecatia');
  assert(A.aiEvaluateCard(1,'hell_hecatia').setupValue>0);
});
test('Suppressed or uncollectible Hecatia does not receive protection credit',()=>{
  setup({hand:['hell_hecatia','hell_komachi'],board:[[3,3,'hourai_eirin']]});
  assert.equal(A.aiEvaluateCard(1,'hell_hecatia').setupValue,0);
  setup({hand:['hell_hecatia'],discards:[['hell_eiki','hell_komachi','hell_clownpiece','hell_kutaka','sage_kasen']]});
  assert.equal(A.aiEvaluateCard(1,'hell_hecatia').setupValue,0);
});
test('Eiki skips a paid banishment that would dismantle her Hell assembly',async()=>{
  const g=setup({hand:['hell_komachi','hell_clownpiece','mtn_aya'],board:[[1,1,'hell_hecatia'],[1,2,'hell_eiki']]});
  await g.resolveAbility('hell_eiki',1,2,1,0);
  assert.equal(g.cardAt(1,1),'hell_hecatia');assert.equal(g.cardAt(1,2),'hell_eiki');
  assert.equal(g.players[1].hand.length,3);assert.equal(g.drawPile.length,0);
  assert(g.logLines.some(line=>line.includes('skips')));
});
test('Eiki still clears an enemy faction when she can pay with a spare card',async()=>{
  const g=setup({hand:['hell_komachi','hell_clownpiece','mtn_aya'],board:[[1,1,'hell_hecatia'],[1,2,'hell_eiki'],
    [0,0,'sdm_remilia'],[0,1,'sdm_flandre'],[0,2,'sdm_patchouli']]});
  await g.resolveAbility('hell_eiki',1,2,1,0);
  assert.equal(g.factionCells('sdm').length,0);assert.equal(g.factionCells('hell').length,2);
  assert(g.players[1].hand.includes('hell_komachi'));assert(g.players[1].hand.includes('hell_clownpiece'));
  assert.equal(g.drawPile.length,4);
});
test('Eiki selects a safe faction in a largest-faction tie',async()=>{
  const g=setup({hand:['hell_komachi','hell_clownpiece','mtn_aya'],board:[[1,1,'hell_hecatia'],[1,2,'hell_eiki'],
    [0,0,'sdm_remilia'],[0,1,'sdm_flandre']]});
  await g.resolveAbility('hell_eiki',1,2,1,0);
  assert.equal(g.factionCells('sdm').length,0);assert.equal(g.factionCells('hell').length,2);
});
test('Eiki can finish and claim Hell without paying or banishing her own group',async()=>{
  const g=setup({hand:['hell_eiki','mtn_aya'],board:[[1,1,'hell_hecatia'],[1,2,'hell_clownpiece'],[2,1,'hell_komachi']],discards:[[],['sdm_patchouli']]});
  const pick=A.aiEvaluateCard(1,'hell_eiki');assert(pick.claimsNow);assert(pick.skipAbility);assert(pick.winsNow);
  await A.doPlayerAction(1);assert.equal(g.winCount(g.players[1]),7);assert(g.players[1].hand.includes('mtn_aya'));
});
test('Optional payment declines rather than spending the only pieces of a complete hand faction',async()=>{
  const g=setup({hand:['yuuka','medicine'],board:[[1,1,'palace_yuugi'],[1,2,'mtn_aya']]});
  assert(A.aiAbilityPlan(1,'palace_yuugi',1,1).skip);
  await g.resolveAbility('palace_yuugi',1,1,1,0);
  assert.equal(g.cardAt(1,2),'mtn_aya');assert.equal(g.players[1].hand.length,2);assert.equal(g.drawPile.length,0);
});
test('Yukari scores a legal capture as hand gain rather than an empty passive',async()=>{
  const g=setup({hand:['sage_yukari'],board:[[0,0,'sdm_sakuya']],deck:['mtn_aya']});
  const pick=A.aiEvaluateCard(1,'sage_yukari');assert.equal(pick.handGain,1);assert(pick.rate>0);assert(!pick.noAbility);
  assert.deepEqual([pick.cell.r,pick.cell.c],[0,0]);assert.equal((await A.aiDecideHardAction(1,false)).cardId,'sage_yukari');
  const before=state(g),hand=g.players[1].hand;
  A.aiWithPlacement('sage_yukari',pick.cell,()=>{assert(g.players[1].hand.includes('sdm_sakuya'));assert(!g.players[1].hand.includes('sage_yukari'));},1);
  assert.equal(state(g),before);assert.equal(g.players[1].hand,hand);
});
test('Yukari ignores protected merchandise even when it supplies a missing pair member',()=>{
  const g=setup({hand:['sage_yukari','yuuka'],board:[[0,3,'mtn_aya']]});g.shopCards=['shop_rinnosuke','medicine','hourai_tewi','hell_kutaka'];
  const pick=A.aiEvaluateCard(1,'sage_yukari');assert(pick.cell.r>=0 && pick.cell.r<4);assert(pick.cell.c>=0 && pick.cell.c<4);
});
test('Yukari avoids dismantling a ready board pair merely to retrieve its member',()=>{
  setup({hand:['sage_yukari','yuuka'],board:[[0,0,'medicine'],[0,3,'mtn_aya']]});
  const pick=A.aiEvaluateCard(1,'sage_yukari');assert.notDeepEqual([pick.cell.r,pick.cell.c],[0,0]);
});
test('Yukari reevaluates Eirin removal, including an immediate restored Hecatia win',async()=>{
  const g=setup({hand:['sage_yukari'],board:[[0,0,'hourai_eirin']],discards:[[],['hell_hecatia',...six.slice(0,4)]]});
  const pick=A.aiEvaluateCard(1,'sage_yukari');assert(!pick.suppressedCrown);assert(pick.winsNow);assert(!pick.lowPriority);
  await A.doPlayerAction(1);assert.equal(g.winner?.idx,1);assert(g.players[1].hand.includes('hourai_eirin'));
});
test('Yukari preserves the AI-only Rinnosuke easter-egg exclusion',()=>{
  const g=setup({hand:['sage_yukari'],board:[[1,1,'shop_rinnosuke'],[3,3,'mtn_aya']]});
  assert(!A.aiPlacementCells(g,'sage_yukari',g.emptyOrWastelandForCard(A.CARD.sage_yukari)).some(cell=>cell.r===1&&cell.c===1));
  const pick=A.aiEvaluateCard(1,'sage_yukari');assert.notEqual(g.cardAt(pick.cell.r,pick.cell.c),'shop_rinnosuke');
});
test('Yukari avoids handing a restored Hecatia win to an opponent',async()=>{
  const g=setup({hand:['sage_yukari','mtn_aya'],board:[[0,0,'hourai_eirin']],deck:['sdm_patchouli'],
    discards:[['hell_hecatia',...six.slice(0,4)]]});
  const action=await A.aiDecideHardAction(1,false);assert(!(action.cardId==='sage_yukari' && action.r===0 && action.c===0));
});
test('Matara predicts and actually uses Marisa from her own tile, including blasting the source',async()=>{
  const g=setup({hand:['sage_matara'],board:[[0,0,'marisa']]});
  const pick=A.aiEvaluateCard(1,'sage_matara');assert.equal(pick.copiedAbility,'marisa');assert(pick.rate>=1);
  let origin;g.ui.onMasterSpark=event=>origin=event.from;
  await A.doPlayerAction(1);assert(g.players[1].discard.includes('marisa'));assert.equal(g.cardAt(pick.cell.r,pick.cell.c),'sage_matara');
  assert.deepEqual([origin.r,origin.c],[pick.cell.r,pick.cell.c]);
});
test('Matara compares actual copied costs and does not pay away a complete pair',async()=>{
  const g=setup({hand:['yuuka','medicine'],board:[[1,1,'sage_matara'],[1,2,'palace_yuugi'],[3,3,'mtn_sanae']],deck:['mtn_aya']});
  assert.equal(A.aiBestChannel(1,1,1).abilityId,'mtn_sanae');
  await g.resolveAbility('sage_matara',1,1,1,0);assert(g.players[1].hand.includes('yuuka'));assert(g.players[1].hand.includes('medicine'));
  assert(g.players[1].hand.includes('mtn_aya'));
});
test('Matara recognizes a copied Sakuya as a same-turn Sage finisher',()=>{
  setup({hand:['sage_matara','sage_kasen','sage_ran'],board:[[0,0,'sage_yukari'],[3,3,'sdm_sakuya']]});
  const pick=A.aiEvaluateCard(1,'sage_matara');assert.equal(pick.copiedAbility,'sdm_sakuya');assert(pick.rate>=4);
});
test('Matara can use Kanako to complete Mountain rather than only evaluating Sage',()=>{
  const g=setup({hand:['mtn_sanae'],board:[[3,3,'sage_matara'],[0,0,'mtn_kanako'],[0,1,'mtn_aya'],[1,0,'mtn_suwako']]});
  assert.equal(A.aiBestChannel(1,3,3).abilityId,'mtn_kanako');
});
test('Matara does not predict free Sage placements from Kanako or an unknown Ran draw',()=>{
  setup({hand:['sage_matara','sage_kasen','sage_ran'],board:[[0,0,'sage_yukari'],[3,3,'mtn_kanako']],deck:['mtn_aya']});
  const pick=A.aiEvaluateCard(1,'sage_matara');assert(pick.rate<4);
});
test('Matara does not pretend the third Sage survives Sakuya returning the unused hand',()=>{
  setup({hand:['sage_matara','sage_kasen','sage_ran','sage_mai_satono'],board:[[3,3,'sdm_sakuya']]});
  const pick=A.aiEvaluateCard(1,'sage_matara');assert(pick.rate<4);assert.equal(pick.claimSize,0);
});
test('Copied Byakuren cannot burn the needed Sage pair merely to buy extra actions',async()=>{
  const g=setup({hand:['sage_kasen','sage_ran'],board:[[0,0,'sage_yukari'],[0,1,'sage_matara'],[3,3,'temple_byakuren']]});
  assert(A.aiAbilityPlan(1,'temple_byakuren',0,1).skip);
  await g.resolveAbility('temple_byakuren',0,1,1,0);
  assert.equal(g.players[1].hand.length,2);assert.equal(g.drawPile.length,0);
});
test('Shou can complete Temple on clean terrain without wasting a cost',async()=>{
  const g=setup({hand:['mtn_aya'],board:[[1,1,'temple_shou'],[1,2,'temple_nue'],[2,1,'temple_byakuren'],[2,2,'temple_murasa']]});
  await g.resolveAbility('temple_shou',1,1,1,0);assert.equal(g.players[1].hand.length,1);assert.equal(g.drawPile.length,0);
});
test('Placement and copied-effect previews preserve all live state and random sequence on both sizes',async()=>{
  for(const size of [4,5]){
    const g=setup({size,hand:['sage_matara','sage_yukari','mtn_nitori','hell_hecatia','mtn_kanako','mtn_aya','medicine'],
      board:[[0,0,'marisa'],[0,1,'hell_eiki'],[size-1,size-1,'mtn_sanae']],deck:['sdm_patchouli','sdm_sakuya']});
    const before=state(g),seed=randomSeed,start=performance.now();
    await A.aiDecideHardAction(1,false);
    assert.equal(state(g),before);assert.equal(randomSeed,seed);
    assert(performance.now()-start<3000,'Decision took longer than 3 seconds');
  }
});
test('New scoring reads only public board cards, own cards and opponent hand sizes',()=>{
  const g=setup({hand:['sage_matara','sage_yukari','mtn_nitori','hell_hecatia'],opponents:[['sdm_flandre','mtn_aya']],
    board:[[0,0,'sdm_remilia'],[1,1,'palace_satori'],[2,2,'mtn_aya']],deck:['medicine']});
  g.players[0].hand=new Proxy(g.players[0].hand,{get(target,key){if(key==='length')return target.length;throw new Error('Hidden hand inspected: '+String(key));}});
  assert(A.aiEvaluateCard(1,'sage_matara'));assert(A.aiEvaluateCard(1,'sage_yukari'));
});
test('Komachi rule text is updated in both languages',()=>{
  assert(A.CARD.hell_komachi.desc.includes('another Hell card'));
  assert(html.includes('如果棋盘上有另一张地狱卡牌，此次放置不消耗你的回合。'));
});
test('Twenty-four full AI matches complete or reach a legal stalemate without losing or duplicating a card',async()=>{
  let wins=0,stalemates=0,totalTurns=0;
  for(let sample=0;sample<24;sample++){
    const size=sample%4===0?5:4,count=2+sample%3;
    A.setSize(size);const g=new A.Game(count,{},null,{aiDifficulty:sample%6===5?'easy':sample%6===3?'normal':'hard'});A.setGame(g);
    g.players.forEach(p=>p.isAI=true);let stuck=0,turns=0;
    for(;turns<200 && !g.winner;turns++){
      const p=g.currentPlayerIdx;g.beginPlayerTurn(p);g.tradedThisTurn[p]=false;const extras=g.takeScheduledExtraTurns(p);
      if(!A.canAct(p)){stuck=g.isPlacementBlocked(p)||g.placementBlockTurns.some(n=>n>0)?0:stuck+1;if(stuck>=count)break;}
      else{
        stuck=0;await A.resolveFollowups(p,await A.doPlayerAction(p));
        for(let i=0;i<extras && !g.winner && A.canAct(p);i++){g.tradedThisTurn[p]=false;await A.resolveFollowups(p,await A.doPlayerAction(p));}
      }
      const ids=[...g.drawPile,...g.boardCells().map(cell=>g.cardAt(cell.r,cell.c)),...g.players.flatMap(p=>[...p.hand,...p.discard])];
      assert.equal(new Set(ids).size,ids.length,'Duplicated card');for(const id of g.startingCardIds)assert(ids.includes(id),'Lost '+id);
      g.endPlayerTurn(p);g.currentPlayerIdx=(p+1)%count;
    }
    assert(turns<200,'Game failed to finish before turn limit');assert(g.winner || stuck>=count);
    g.winner?wins++:stalemates++;totalTurns+=turns;
  }
  console.log('  Full-match checks: '+JSON.stringify({matches:24,wins,stalemates,averageTurns:Math.round(totalTurns/24*10)/10}));
});
(async()=>{let passed=0;for(const [name,fn] of tests){try{await fn();passed++;console.log('PASS '+name);}catch(error){console.error('FAIL '+name+'\n'+error.stack);}}console.log(passed+'/'+tests.length+' faction rework checks passed');if(passed!==tests.length)process.exitCode=1;})();
