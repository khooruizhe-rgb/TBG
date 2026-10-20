const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{',box={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,storage};',box);const {ctx,storage}=box.module.exports;ctx.testStorage=storage;
let completed=false;process.once('beforeExit',()=>{if(!completed&&!process.exitCode){console.error('Finale checks did not finish.');process.exitCode=1;}});
async function scenario(){
 const checks=[],ok=(value,name)=>{assert(value,name);checks.push(name);console.log('PASS '+checks.length+' '+name);};
 function make(seed=1){evalResetTokens();evalSetSeed('finale-'+seed);SIZE=4;game=new Game(4,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard'});configureStoryMatch(game,14);game.render=()=>{};return game;}
 function take(base,zone='hand',p=0){const index=game.drawPile.findIndex(id=>cardBaseId(id)===base);assert(index>=0,base);const [id]=game.drawPile.splice(index,1);game.players[p][zone].push(id);return id;}
 function at(base,r,c){const id=take(base);game.removeFromHand(0,id);game.setCardAt(r,c,id);return id;}
 function clearHands(){for(const player of game.players){game.drawPile.push(...player.hand);player.hand=[];}}
 const actors=new Set(),openings=new Set();
 for(let seed=0;seed<128;seed++){
  const g=make(seed),ids=finalInventoryIds(g);assert.equal(ids.length,431);assert.equal(new Set(ids).size,431);assert.equal(g.drawPile.length,336);assert(g.players.every(p=>p.hand.length===6));assert.equal(g.numPlayers,4);assert.equal(g.finalChallenge.factions.length,11);assert(g.handKnowledge.every(m=>m.size===0));assert.equal(g.shopCards.length,8);assert.equal(g.shopTiles.length,8);assert.equal(Object.values(g.finalChallenge.stock).flat().length,63);
  for(const card of CARDS.filter(c=>!c.token&&!c.shopkeeper))assert.equal(ids.filter(id=>cardBaseId(id)===card.id).length,10);
  assert.deepEqual(g.players.slice(1).map(p=>aiDifficultyFor(p.idx)),['hard','hard','normal']);assert(!g.players.some(p=>aiIsTeachingOpponent(g,p.idx)));evalConservation(g);actors.add(g.currentPlayerIdx);openings.add(g.players[0].hand.map(cardBaseId).join(','));
 }
 ok(actors.size===4&&openings.size>120,'128 private random four-player deals conserve 360 core prints, 70 fifth-card prints and one keeper, with six-card hands, all four starting actors and two Hard and one Normal opponents');
 const g=make();clearHands();const a=take('sage_yukari'),b=take('sage_yukari');
 ok(a!==b&&game.abilityId(a)==='sage_yukari'&&CARD[a].finalPrint&&!CARD[a].createdCopy&&!CARD[a].costBonus&&!CARD[a].name.endsWith('?'),'Equal originals have separate ordinary print IDs and canonical abilities without creation names, material or cost surcharges');
 game.permanentAbilities[a]='__draw_one';ok(game.abilityId(a)==='__draw_one'&&game.abilityId(b)==='sage_yukari','Overwriting one physical print cannot change its other nine originals');
 make();clearHands();for(let i=0;i<8;i++)take('sdm_flandre','discard');game.recordFinalCollection(0);assert(!game.checkWin());ok(game.winCount(game.players[0])>=7&&!game.winner&&game.finalChallenge.collected[0].join(',')==='sdm','Seven discard points do not win; complete discard groups contribute their faction once');
 for(const faction of game.finalChallenge.factions.filter(f=>f!=='sdm')){const base=CARDS.find(c=>c.faction===faction&&!c.shopExpansion).id;for(let i=0;i<FACTIONS[faction].size;i++)take(base,'discard');game.recordFinalCollection(0);}
 ok(game.checkWin()&&game.winner.idx===0,'The first player to gather all eleven factions wins');
 make();clearHands();game.finalChallenge.collected[0]=game.finalChallenge.factions.slice(0,-1);game.finalChallenge.collected[2]=game.finalChallenge.factions.slice();ok(game.checkWin()&&game.winner.idx===2,'All four seats share the faction win condition, regardless of discard score');
 make();clearHands();game.ui={onFinalBoardGrowth:event=>growthEvents.push(event)};const growthEvents=[];const preserved=at('mtn_sanae',3,3);game.wasteland[2][2]=true;
 for(let i=0;i<50;i++){game.drawPile.push(...game.players[0].discard);game.players[0].discard=[];at('reimu',0,0);at('marisa',0,1);game.checkClaims(0);evalConservation(game);assert.equal(game.boardCapacity(),Math.min(64,17+i));assert.equal(SIZE,finalBoardExtent(game.boardCapacity()));}
 ok(SIZE===8&&game.board.length===8&&game.board.every(row=>row.length===8)&&game.wasteland[2][2]&&game.cardAt(3,3)===preserved&&game.finalChallenge.claims[0]===50&&growthEvents.length===48&&game.shopTiles[0].r===11,'Every actual claim, including repeated factions, adds one connected space until all 64 are active while preserving cards, terrain and shifting the separate shop');
 make();clearHands();for(const [r,c] of [[0,0],[0,1],[2,2],[2,3]])at('reimu',r,c);game.checkClaims(0);evalConservation(game);ok(game.finalChallenge.claims[0]===2&&game.boardCapacity()===18&&SIZE===5&&game.players[0].discard.length===4,'Two complete equal-faction groups settle in one batch and each adds exactly one space');
 make();clearHands();for(let slot=1;slot<8;slot++){
  const type=game.finalChallenge.slotTypes[slot];assert.equal(game.finalStockRemaining(slot),10);
  for(let n=10;n>0;n--){const offered=take('sdm_sakuya');game.beginPlayerTurn(0);game.tradedThisTurn[0]=false;assert(game.tradeCard(0,offered,slot));assert(game.finalChallenge.removed.includes(offered));assert(!game.boardCells().some(cell=>cell.id===offered));assert.equal(game.finalStockRemaining(slot),n-1);evalConservation(game);}
  assert.equal(game.shopCards[slot],null);assert(!game.canTrade(0,game.players[0].hand[0],slot));
  // Return payments to the draw pile only for this exhaustive stock fixture.
  game.drawPile.push(...game.finalChallenge.removed);game.finalChallenge.removed=[];
 }
 ok(game.shopCards.slice(1).every(id=>!id),'All seven fifth-card catalogues deliver ten distinct prints then become empty; no paid card is resold');
 make();clearHands();const offered=take('medicine');assert(game.tradeCard(0,offered,1));const again=take('marisa');ok(!game.tradeCard(0,again,2)&&game.finalChallenge.removed.length===1,'A successful final trade removes exactly its offered print and keeps the once-per-turn rule');
 make();clearHands();game.players[0].isAI=false;const yukari=take('sage_yukari');assert(game.canOverrideShop(0,1));const target=game.shopCards[1];await game.overrideShop(0,1);evalConservation(game);ok(game.shopCards[1]===yukari&&game.players[0].hand.includes(target),'A physical Yukari can still override protected merchandise without losing either print');
 make();clearHands();at('reimu',0,0);const finish=take('marisa', 'hand',1);take('medicine','hand',1);game.currentPlayerIdx=1;const before=JSON.stringify(captureAIEvaluationSnapshot(game));const action=await aiDecideAction(1,false);assert.equal(action.cardId,finish);assert.equal(action.r+Math.abs(action.c),1);assert.equal(JSON.stringify(captureAIEvaluationSnapshot(game)),before);ok(true,'The final Hard AI chooses a new faction and its preview changes no cards, stock, terrain, collection history or board size');
 game.players[0].hand.push(game.drawPile.pop());const visibleAction=await aiDecideAction(1,false);[game.players[0].hand[0],game.drawPile[0]]=[game.drawPile[0],game.players[0].hand[0]];game.drawPile.reverse();assert.deepEqual(await aiDecideAction(1,false),visibleAction);ok(true,'Changing hidden opponent identities and deck order does not change the final AI decision');
 for(const p of [1,2,3]){make(p);game.currentPlayerIdx=p;const snapshot=JSON.stringify(captureAIEvaluationSnapshot(game));const choice=await aiDecideAction(p,true);assert(['place','trade','draw'].includes(choice.type));assert.equal(JSON.stringify(captureAIEvaluationSnapshot(game)),snapshot);}
 ok(true,'All three difficulty seats each make a legal active choice and trade previews preserve every live field');
 make();game.finalChallenge.collected[0]=['sdm'];game.players[0].discard=[];game.recordFinalCollection(0);ok(game.finalChallenge.collected[0].includes('sdm'),'A completed faction stays collected when cards later leave the discard pile');
 const snapshot=captureAIEvaluationSnapshot(game);evalValidateSnapshot(snapshot);const restored=evalRestore(snapshot);evalConservation(restored);assert.equal(JSON.stringify(captureAIEvaluationSnapshot(restored).state.finalChallenge),JSON.stringify(snapshot.state.finalChallenge));assert(restored.players.slice(1).map(p=>p.aiDifficulty).join(',')==='hard,hard,normal');ok(true,'A real unfinished final snapshot restores all physical definitions, stocks, removed payments, faction history and individual difficulty tiers');
 ok(storyStarGoals(game).length===0&&storyMatchStars(game)===0,'Chapter fourteen has no optional objectives or star score');
 testStorage.clear();saveStoryStars(14,[]);ok(storyProgressDetails()[14].cleared&&storyBestStars(14)===0&&!storyChapterPerfect(14),'Final victory saves a clear without inventing three stars');
 const benchmarkDecide=aiDecideAction;
 // The worker's wrapper requires benchmark counters. Use the identical final
 // production branch with its seeded decision phase while telemetry is off.
 aiDecideAction=async(p,allowTrade=true)=>{const before=evalRandomPhase;evalRandomPhase='decisions';try{return await aiFinalChallengeAction(p,allowTrade);}finally{evalRandomPhase=before;}};
 const matches=[];
 for(let seed=1;seed<=2;seed++){
  // Story play has no benchmark telemetry; keep the production rules/controller
  // and per-action conservation checks without accumulating AI-test diagnostics.
  const g=make('full-'+seed);g.testMetrics=null;let actions=0,idle=0;
  while(!g.winner&&!g.stalemateMessage&&actions<1200){if(actions%40===0)console.log('Final match '+seed+' action '+actions+' board '+SIZE);const p=g.currentPlayerIdx;g.beginPlayerTurn(p);g.tradedThisTurn[p]=false;const scheduled=g.takeScheduledExtraTurns(p);if(!canAct(p)){if(++idle>=g.numPlayers){endStalemate();break;}advanceTurn();continue;}idle=0;const flags=await doPlayerAction(p);evalConservation(g);actions++;await afterAction(p,flags,scheduled);evalConservation(g);}
  assert((g.winner||g.stalemateMessage)&&actions<1200,'Full final challenge must terminate');matches.push({seed,actions,size:SIZE,activeCells:g.boardCapacity(),claims:g.finalChallenge.claims.reduce((a,b)=>a+b,0),winner:g.winner?.idx??null,reason:g.stalemateMessage||'win',collections:g.finalChallenge.collected.map(f=>f.length),inventory:finalInventoryIds(g).length,removed:g.finalChallenge.removed.length});
 }
 aiDecideAction=benchmarkDecide;
 ok(matches.length===2,'Two complete production-controller final matches terminate with conserved multi-copy inventory and no turn-limit abort');
 return {status:'pass',count:checks.length,checks,matches,rulesVersion:REWORK_RULES_VERSION,scope:'Real Game engine and turn controller, unique multi-copy instances, all faction victory, repeated claims, growth cap, all 70 shop receipts, removed payments, private tiered AI and full matches. UI geometry is checked separately.'};
}
vm.runInContext('('+scenario.toString()+')()',ctx).then(result=>{completed=true;fs.writeFileSync(__dirname+'/story-final-challenge-2026-10-19-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' final challenge checks passed');}).catch(e=>{console.error(e);process.exitCode=1;});
