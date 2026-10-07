const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2]||(fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(file,'utf8'),js=html.split('<script>')[1].split('</script>')[0];new vm.Script(js);
function load(script){
 const start=script.indexOf('/* AI evaluation engine start */'),end=script.indexOf('\n/* AI evaluation engine end */',start),builder={};vm.createContext(builder);vm.runInContext(script.slice(start,end),builder);
 const context={console,Math:Object.create(Math),setTimeout,clearTimeout,self:{postMessage(){}}};vm.createContext(context);
 vm.runInContext(builder.buildAIEvaluationWorkerSource(script)+`\nthis.api={Game,CARD,CARDS,FACTIONS,aiEvaluateCard,aiAbilityPlan,aiDecideAction,aiChooseCostCards,aiBestTrade,aiKanakoTrade,aiTwoCardFactionTrade,aiRecordDecision:typeof aiRecordDecision==='function'?aiRecordDecision:null,aiSatoriPlan:typeof aiSatoriPlan==='function'?aiSatoriPlan:null,aiBestRinTarget:typeof aiBestRinTarget==='function'?aiBestRinTarget:null,aiBestSatoriCard:typeof aiBestSatoriCard==='function'?aiBestSatoriCard:null,aiExpectedBestAcquisition:typeof aiExpectedBestAcquisition==='function'?aiExpectedBestAcquisition:null,evalNewOpening,evalRestore,evalRunMatch,evalCompare,createAITestStats,recordCompletedAITest,setGame:g=>game=g,setSize:n=>SIZE=n,getGame:()=>game};`,context);
 return {context,A:context.api};
}
const {context,A}=load(js),plain=x=>JSON.parse(JSON.stringify(x)),tests=[],test=(name,fn)=>tests.push([name,fn]);
function setup({hand=[],others=[[],[]],discard=[[],[],[]],board=[],deck=[],stock=['palace_yuugi','mtn_nitori','medicine'],policy='current'}={}){
 A.setSize(4);const g=new A.Game(3,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard',aiPolicies:[policy,policy,policy]});
 g.players.forEach((p,i)=>{p.hand=(i?others[i-1]||[]:hand).slice();p.discard=(discard[i]||[]).slice();});
 g.handKnowledge=g.players.map(()=>new Map());g.drawPile=deck.slice();g.board=Array.from({length:4},()=>Array(4).fill(null));g.wasteland=Array.from({length:4},()=>Array(4).fill(false));g.shopCards=['shop_rinnosuke',...stock];g.currentPlayerIdx=0;
 board.forEach(([r,c,id])=>g.setCardAt(r,c,id));g.startingCardIds=new Set([...A.CARDS.filter(c=>!c.token&&!c.shopExpansion&&!c.shopkeeper).map(c=>c.id),...g.shopCards]);A.setGame(g);return g;
}
async function place(g,id,r=1,c=1){g.removeFromHand(0,id);return g.internalPlace(id,r,c,0,0);}
test('The expected maximum uses sampling without replacement and a known-card floor',()=>{
 assert(Math.abs(A.aiExpectedBestAcquisition([1,2,3],1)-2)<1e-12);assert(Math.abs(A.aiExpectedBestAcquisition([1,2,3],2)-8/3)<1e-12);assert.equal(A.aiExpectedBestAcquisition([1,2,3],3),3);assert.equal(A.aiExpectedBestAcquisition([1,2,3],2,4),4);
});
test('The rule-adapted previous strategy snapshot matches its recorded digest',()=>{
 const crypto=require('node:crypto'),a=js.indexOf('const AI_PREVIOUS_POLICY=(()=>{\n')+'const AI_PREVIOUS_POLICY=(()=>{\n'.length,b=js.indexOf('function aiEvaluateCard(...args)',a);
 const expected=js.match(/const AI_PREVIOUS_DIGEST='([a-f0-9]+)'/)[1];assert.equal(crypto.createHash('sha256').update(js.slice(a,b)).digest('hex'),expected);
});
test('Rin chooses a usable faction finish rather than automatically preferring Sage',async()=>{
 const g=setup({hand:['palace_rin'],discard:[[],['sage_ran','medicine'],[]],board:[[0,0,'yuuka']]});
 const pick=A.aiBestRinTarget(0,[{idx:1,id:'sage_ran'},{idx:1,id:'medicine'}]);assert.equal(pick.id,'medicine');assert.equal(pick.claimPoints,2);
 await place(g,'palace_rin',2,2);assert(g.players[0].hand.includes('medicine'));assert(g.players[1].discard.includes('sage_ran'));assert.equal(g.testSeatMetrics(0).cardActions.palace_rin.deniedPoints,1);
});
test('Rin considers the three actual Hecatia points, and one while Eirin is active',()=>{
 let g=setup({discard:[[],['hell_hecatia','mtn_aya'],[]]});let pick=A.aiBestRinTarget(0,[{idx:1,id:'hell_hecatia'},{idx:1,id:'mtn_aya'}]);assert.equal(pick.id,'hell_hecatia');assert.equal(pick.denied,3);
 g.setCardAt(3,3,'hourai_eirin');pick=A.aiBestRinTarget(0,[{idx:1,id:'hell_hecatia'}]);assert.equal(pick.denied,1);
});
test('Rin may reclaim a valuable own finish, with its own score loss counted',async()=>{
 const g=setup({hand:['palace_rin'],discard:[['sage_kasen'],['mtn_aya'],[]],board:[[0,0,'sdm_remilia'],[0,1,'sdm_patchouli'],[1,0,'sdm_sakuya']]});
 const best=A.aiBestRinTarget(0,[{idx:0,id:'sage_kasen'},{idx:1,id:'mtn_aya'}]);assert.equal(best.id,'sage_kasen');assert.equal(best.ownLoss,1);assert.equal(best.denied,0);
 await place(g,'palace_rin',3,3);assert(!g.players[0].discard.includes('sage_kasen'));assert.equal(g.testSeatMetrics(0).cardActions.palace_rin.ownPointsLost,1);assert.equal(g.testSeatMetrics(0).diagnostics.retrievals.palace_rin.ownPointsLost,1);
});
test('Rin forecasts and target selection agree, including borrowed origin',async()=>{
 const g=setup({hand:['sage_matara'],discard:[[],['medicine'],[]],board:[[0,0,'yuuka'],[0,3,'palace_rin']]});
 g.setCardAt(3,3,'sage_matara');g.removeFromHand(0,'sage_matara');const plan=A.aiAbilityPlan(0,'palace_rin',3,3);assert.equal(plan.target.id,'medicine');assert(plan.utility>1);
 await g.resolveAbility('palace_rin',3,3,0,0);assert(g.players[0].hand.includes('medicine'));assert.equal(g.testSeatMetrics(0).cardActions.sage_matara.handGained,1);assert.equal(g.testSeatMetrics(0).abilityDetails['sage_matara:palace_rin'].effective,1);
});
test('Rin public forecasts do not mutate state, metrics or the random stream',()=>{
 const g=setup({hand:['palace_rin'],discard:[[],['sage_ran','medicine'],[]],board:[[0,0,'yuuka']]});const before=JSON.stringify(g.testRuleState()),metrics=JSON.stringify(g.testMetrics);A.aiEvaluateCard(0,'palace_rin');assert.equal(JSON.stringify(g.testRuleState()),before);assert.equal(JSON.stringify(g.testMetrics),metrics);
});
test('Satori revealed selection values an immediately completable faction',async()=>{
 const g=setup({hand:['palace_satori','mtn_aya'],others:[['sage_ran','medicine'],[]],board:[[0,0,'yuuka']]});
 const best=A.aiBestSatoriCard(0,1,g.players[1].hand);assert.equal(best.id,'medicine');await place(g,'palace_satori',2,2);
 assert(g.players[0].hand.includes('medicine'));assert(g.drawPile.includes('mtn_aya'));assert.equal(g.testSeatMetrics(0).cardActions.palace_satori.costPaid,1);assert.equal(g.testSeatMetrics(0).cardActions.palace_satori.handStolen,1);
});
test('Satori chooses a smaller known useful hand over a larger unsuitable known hand',()=>{
 const g=setup({hand:['palace_satori','mtn_aya'],others:[['sage_ran','palace_utsuho','mtn_sanae'],['medicine']],board:[[0,0,'yuuka']]});g.revealHand(1,g.players[1].hand,[0]);g.revealHand(2,g.players[2].hand,[0]);assert.equal(A.aiSatoriPlan(0,'palace_satori').targetIdx,2);
});
test('Satori cannot inspect hidden identities before paying and revealing',()=>{
 const g=setup({hand:['palace_satori','mtn_aya'],others:[['medicine','sage_ran'],['mtn_sanae']],board:[[0,0,'yuuka']]});const before=plain(A.aiSatoriPlan(0,'palace_satori'));
 [g.players[1].hand[0],g.players[2].hand[0]]=[g.players[2].hand[0],g.players[1].hand[0]];assert.deepEqual(plain(A.aiSatoriPlan(0,'palace_satori')),before);
 g.players.slice(1).forEach(p=>{const length=p.hand.length;p.hand=new Proxy([],{get(_target,key){if(key==='length')return length;throw Error('Read hidden hand '+String(key));}});});assert.doesNotThrow(()=>A.aiSatoriPlan(0,'palace_satori'));assert.doesNotThrow(()=>A.aiEvaluateCard(0,'palace_satori'));
});
test('Satori cost evaluation preserves useful pair material and execution pays its forecast',async()=>{
 const g=setup({hand:['palace_satori','medicine','mtn_aya'],others:[['sage_kasen'],[]],board:[[0,0,'yuuka']]});const plan=A.aiSatoriPlan(0,'palace_satori');assert.equal(plan.payment[0],'mtn_aya');await place(g,'palace_satori',3,3);assert(g.players[0].hand.includes('medicine'));assert(g.drawPile.includes('mtn_aya'));assert(!g.drawPile.includes('medicine'));
});
test('Satori declines a payment that breaks an assembled hand faction',async()=>{
 const g=setup({hand:['palace_satori','marisa','reimu'],others:[['mtn_aya'],[]]});await place(g,'palace_satori',2,2);assert(g.players[0].hand.includes('reimu'));assert(g.players[0].hand.includes('marisa'));assert.equal(g.testSeatMetrics(0).diagnostics.costCards,0);assert.equal(g.testSeatMetrics(0).diagnostics.skips.palace_satori,1);
});
test('Eirin disables Satori, but does not disable non-crown Rin',async()=>{
 const g=setup({hand:['palace_satori','palace_rin','mtn_aya'],others:[['sage_kasen'],[]],discard:[[],['medicine'],[]],board:[[3,3,'hourai_eirin']]});await place(g,'palace_satori');assert(g.players[0].hand.includes('mtn_aya'));assert(!g.players[0].hand.includes('sage_kasen'));assert.equal(g.testSeatMetrics(0).diagnostics.costCards,0);await place(g,'palace_rin',2,2);assert(g.players[0].hand.includes('medicine'));
});
test('Both retrieval ablations preserve the old targeting behavior',async()=>{
 const g=setup({policy:'no-rin',hand:['palace_rin'],discard:[[],['sage_ran','medicine'],[]],board:[[0,0,'yuuka']]});await place(g,'palace_rin',2,2);assert(g.players[0].hand.includes('sage_ran'));
 g.players[0].aiPolicy='previous';assert.equal(A.aiEvaluateCard(0,'medicine').retrieval,undefined);
});
test('Generic, Kanako and pair trades cannot offer Yukari',()=>{
 let g=setup({hand:['sage_yukari'],stock:['mtn_nitori','medicine','hell_kutaka']});assert.equal(A.aiBestTrade(0),null);
 g=setup({hand:['mtn_kanako','sage_yukari'],stock:['mtn_nitori','medicine','hell_kutaka']});assert.equal(A.aiKanakoTrade(0,{type:'place',cardId:'mtn_kanako',r:1,c:1}),null);
 g=setup({hand:['yuuka','sage_yukari'],stock:['medicine','mtn_nitori','hell_kutaka']});assert.equal(A.aiTwoCardFactionTrade(0,{type:'place',cardId:'yuuka',r:1,c:1}),null);
});
test('Trading has a final AI guard, and human trading rules remain available',()=>{
 const g=setup({hand:['sage_yukari'],stock:['medicine','mtn_nitori','hell_kutaka']});const before=JSON.stringify(g.testRuleState());assert.equal(g.tradeCard(0,'sage_yukari',1),false);assert.equal(JSON.stringify(g.testRuleState()),before);
 g.players[0].isAI=false;assert.equal(g.tradeCard(0,'sage_yukari',1),true);assert.equal(g.testSeatMetrics(0).diagnostics.offers.sage_yukari,1);
});
test('Previous and trade ablation policies retain the buggy offer for a fair control',()=>{
 for(const policy of ['previous','no-yukari-trade']){const g=setup({policy,hand:['sage_yukari'],stock:['medicine','mtn_nitori','hell_kutaka']});assert.equal(g.tradeCard(0,'sage_yukari',1),true);}
});
test('Every difficulty preserves the Yukari trade invariant',async()=>{
 for(const difficulty of ['easy','normal','hard']){const g=setup({hand:['sage_yukari','yuuka'],stock:['medicine','mtn_nitori','hell_kutaka']});g.aiDifficulty=difficulty;const action=await A.aiDecideAction(0);assert(!(action.type==='trade' && action.cardId==='sage_yukari'));assert.equal(g.testSeatMetrics(0).diagnostics.events.length,0);A.aiRecordDecision(0,action,true);assert.equal(g.testSeatMetrics(0).diagnostics.yukariTradeGuardTurns,1);}
});
test('Real payment, theft and ability observations survive the per-seat export',async()=>{
 const g=setup({hand:['palace_satori','mtn_aya'],others:[['medicine'],[]]});await place(g,'palace_satori');const seat=g.testSeatMetrics(0);assert.equal(seat.cardActions.mtn_aya.paidAsCost,1);assert.equal(seat.abilityDetails['palace_satori:palace_satori'].costPaid,1);assert.equal(seat.abilityDetails['palace_satori:palace_satori'].effective,1);assert.equal(seat.diagnostics.retrievals.palace_satori.stolen,1);assert(seat.diagnostics.events.some(e=>e.type==='cost' && e.paid.includes('mtn_aya')));assert(seat.diagnostics.events.some(e=>e.type==='ability-result' && e.stolen.includes('medicine')));
});
test('The diagnostic trace is bounded without dropping accumulated totals',()=>{
 const g=setup();for(let i=0;i<60;i++)g.recordTestDecision(0,'test',{index:i});const d=g.testSeatMetrics(0).diagnostics;assert.equal(d.events.length,16);assert.equal(d.omittedEvents,44);assert.equal(d.events[0].index,44);
});
test('Rich CSV records preserve old column order, provenance and observations',()=>{
 const a=js.indexOf('function aiLabExportCSV('),b=js.indexOf("el('menu-ai-lab')",a);vm.runInContext(js.slice(a,b),context);
 const report={type:'comparison',config:{seed:'test-rich',phase:'holdout',difficulty:'hard',opponent:'previous'},rulesDigest:'rules',policyDigest:'policy',blocks:[{seed:11,size:4,matches:[{seed:22,roster:['current','previous'],reason:'win',winner:0,points:[7,2],turns:12,seats:[0,1].map(()=>({seen:[],placements:{},claims:{},handTurns:{},held:[],cardActions:{palace_rin:{deniedPoints:1}},diagnostics:{costCards:2},abilityDetails:{},scoreSources:{}}))}]}]};const csv=context.aiLabExportCSV(report);assert(csv.includes('"hand_turns","held","diagnostics_version"'));for(const value of ['test-rich','holdout','hard','card_actions','ability_details','score_sources','diagnostics','deniedPoints'])assert(csv.includes(value));assert(csv.includes('"22"'));
});
test('Current versus immediately previous policy completes mixed real-engine matches',async()=>{
 const report=await A.evalCompare({seed:'retrieval-smoke',phase:'development',opponent:'previous',players:3,size:'both',difficulty:'hard',blocks:2},()=>{});assert(report.finished);assert.equal(report.blocks.flatMap(b=>b.matches).length,12);assert(report.blocks.flatMap(b=>b.matches).every(m=>['win','stalemate'].includes(m.reason)),JSON.stringify(report.blocks.flatMap(b=>b.matches).filter(m=>m.error)));assert.equal(report.diagnosticsVersion,2);assert(report.previousDigest);assert(report.summary.rows.current.diagnostics);
 for(const m of report.blocks.flatMap(b=>b.matches))for(let i=0;i<m.roster.length;i++){assert(m.seats[i].diagnostics);if(m.roster[i]==='current')assert.equal(m.seats[i].diagnostics.offers.sage_yukari||0,0);}
});
const priorFile=path.join(path.dirname(file),'ai_pre_retrieval_revision.html');
if(fs.existsSync(priorFile))test('Frozen previous policy reproduces pre-update matches on the shared rules',async()=>{
 let prior=fs.readFileSync(priorFile,'utf8').split('<script>')[1].split('</script>')[0];
 // Compare decisions on identical rules. Adapt only faction matching and AI
 // target scope; retain the reference's independent pre-update scoring weights.
 prior=prior.slice(0,prior.indexOf('const DIRS4'))+
   js.slice(js.indexOf('const DIRS4'),js.indexOf('/* ===================== UI layer'))+
   prior.slice(prior.indexOf('/* ===================== UI layer'));
 for(const [from,to] of [
   ['CARD[id].faction===faction || game.isWildActive(id)','game.cardMatchesFaction(id,faction)'],
   ['CARD[id]?.faction===faction || game.isWildActive(id)','game.cardMatchesFaction(id,faction)'],
   ['CARD[other].faction===card.faction || game.isWildActive(other)','game.cardMatchesFaction(other,card.faction)'],
   ['game.isWildActive(cardId) ? game.claimFactionOrder() : [card.faction]','game.cardClaimFactions(cardId)'],
   ['game.isWildActive(cardId)?game.claimFactionOrder():[card.faction]','game.cardClaimFactions(cardId)'],
   ['function aiPlacementCells(currentGame, cardId, spaces){\n','function aiPlacementCells(currentGame, cardId, spaces){\n  spaces=spaces.filter(cell=>inBounds(cell.r,cell.c));\n'],
   ["  if(currentGame.abilityId(cardId)==='sage_yukari') return spaces.filter(cell=>currentGame.cardAt(cell.r,cell.c)!=='shop_rinnosuke');",'  spaces=spaces.filter(cell=>!currentGame.cardAt(cell.r,cell.c) || currentGame.canSelectBoardCard(cell.r,cell.c));'],
   ['function aiCostCanResolve(playerIdx, cardId, r, c){\n','function aiCostCanResolve(playerIdx, cardId, r, c){\n  if(!inBounds(r,c))return false;\n'],
   ['function aiBestDiscardTarget(playerIdx,cells){\n','function aiBestDiscardTarget(playerIdx,cells){\n  cells=cells.filter(cell=>inBounds(cell.r,cell.c));\n'],
   ['function aiAbilityPlan(playerIdx,abilityId,r,c){\n','function aiAbilityPlan(playerIdx,abilityId,r,c){\n  if(!inBounds(r,c))return {utility:0,direct:0,handGain:0,bonus:0,skip:true,abilityId};\n'],
   ['function aiBestChannel(playerIdx,r,c){\n','function aiBestChannel(playerIdx,r,c){\n  if(!inBounds(r,c))return null;\n'],
   ['function aiCurrentFactionPlacement(playerIdx,cardId,cells,faction=CARD[cardId].faction){\n','function aiCurrentFactionPlacement(playerIdx,cardId,cells,faction=CARD[cardId].faction){\n  cells=cells.filter(cell=>inBounds(cell.r,cell.c));\n  if(!cells.length)return null;\n'],
   ['function aiCurrentKomachiTarget(playerIdx,r,c,cells,allowMistake=true){\n','function aiCurrentKomachiTarget(playerIdx,r,c,cells,allowMistake=true){\n  cells=cells.filter(cell=>inBounds(cell.r,cell.c));\n  if(!cells.length)return null;\n'],
   ['function aiFactionPlacement(playerIdx,cardId,cells,faction=CARD[cardId].faction){\n','function aiFactionPlacement(playerIdx,cardId,cells,faction=CARD[cardId].faction){\n  cells=cells.filter(cell=>inBounds(cell.r,cell.c));\n  if(!cells.length)return null;\n'],
   ['function aiKomachiTarget(playerIdx,r,c,cells){\n','function aiKomachiTarget(playerIdx,r,c,cells){\n  cells=cells.filter(cell=>inBounds(cell.r,cell.c));\n  if(!cells.length)return null;\n'],
   ['game.emptyCells().length>1','game.emptyCells(playerIdx).length>1'],
   ['game.emptyCells().some(t=>!game.isProtected(t.r,t.c))','game.emptyCells(playerIdx).some(t=>!game.isProtected(t.r,t.c))'],
   ['game.emptyCells().filter(cell=>!game.isProtected(cell.r,cell.c))','game.emptyCells().filter(cell=>inBounds(cell.r,cell.c) && !game.isProtected(cell.r,cell.c))'],
   ['game.templeWasteland()','game.templeWasteland(playerIdx)'],
   ['game.ichirinPushes(r,c)','game.ichirinPushes(r,c,playerIdx)'],
   ['game.yuugiTargets(r,c)','game.yuugiTargets(r,c,false,playerIdx)'],
   ['game.yuyukoTargets(r,c).length','game.yuyukoTargets(r,c,playerIdx).length'],
   ['game.rectZones(2)','game.rectZones(2,playerIdx)'],
   ['game.boardCells(cell=>game.boardFaction(cell.r,cell.c)===faction)','game.abilityBoardCells(playerIdx,cell=>game.boardFaction(cell.r,cell.c)===faction)'],
   ['game.boardCells(cell=>game.boardFaction(cell.r,cell.c)===target && game.canReturnBoardToDraw(cell.r,cell.c))','game.abilityBoardCells(playerIdx,cell=>game.boardFaction(cell.r,cell.c)===target && game.canReturnBoardToDraw(cell.r,cell.c))'],
   ["game.boardCells(cell=>game.boardFaction(cell.r,cell.c)!=='heaven' && game.canReturnBoardToDraw(cell.r,cell.c))","game.abilityBoardCells(playerIdx,cell=>game.boardFaction(cell.r,cell.c)!=='heaven' && game.canReturnBoardToDraw(cell.r,cell.c))"],
   ['game.boardCells(cell=>game.canOverrideTarget(id,cell.id) && game.canSelectBoardCard(cell.r,cell.c))','game.selectableBoardCells(playerIdx,cell=>game.canOverrideTarget(id,cell.id))'],
   ["game.boardCells(cell=>!AI_PASSIVE_ABILITIES.has(game.abilityId(cell.id)) && game.abilityId(cell.id)!=='sage_matara')","game.selectableBoardCells(playerIdx,cell=>!AI_PASSIVE_ABILITIES.has(game.abilityId(cell.id)) && game.abilityId(cell.id)!=='sage_matara')"],
   ['for(const id of held)for(const cell of game.emptyOrWastelandForCard(CARD[id]))','for(const id of held)for(const cell of aiPlacementCells(game,id,game.emptyOrWastelandForCard(CARD[id],playerIdx)))'],
   ['currentGame.movableBoardCells(cell=>CARD[cell.id].crown && currentGame.canSelectBoardCard(cell.r,cell.c))','currentGame.mainBoardCells(cell=>CARD[cell.id].crown && currentGame.canMoveBoardCard(cell.r,cell.c) && currentGame.canSelectBoardCard(cell.r,cell.c))']
 ])prior=prior.replaceAll(from,to);
 const old=load(prior).A;
 for(const seed of [49,72,104]){
  const snapshot=plain(old.evalNewOpening(seed,3,seed===72?5:4,'hard'));
  const a=await old.evalRunMatch(snapshot,['previous','previous','previous'],seed+1000),b=await A.evalRunMatch(snapshot,['previous','previous','previous'],seed+1000);
  assert.notEqual(a.reason,'error',a.error);assert.notEqual(b.reason,'error',b.error);
  for(const key of ['reason','winner','points','turns'])assert.deepEqual(plain(b[key]),plain(a[key]),'Seed '+seed+' '+key);
  assert.deepEqual(plain(b.seats.map(s=>({seen:s.seen,placements:s.placements,claims:s.claims,handTurns:s.handTurns,held:s.held}))),plain(a.seats),'Seed '+seed+' seat observations');
 }
});
(async()=>{let passed=0;for(const [name,fn] of tests){try{await fn();passed++;console.log('PASS '+name);}catch(error){console.error('FAIL '+name+'\n'+error.stack);}}console.log(passed+'/'+tests.length+' retrieval checks passed');if(passed!==tests.length)process.exitCode=1;})();
