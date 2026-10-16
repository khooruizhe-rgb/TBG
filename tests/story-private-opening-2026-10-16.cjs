const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{';
const bootstrap={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx};',bootstrap);const {ctx}=bootstrap.module.exports;
vm.runInContext(`(async()=>{
  const checks=[],comparisons=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
  function fresh(chapter=null,seed=1,n=2,difficulty='hard',policy='current'){
    evalResetTokens();evalSetSeed(seed);SIZE=4;game=new Game(n,{},null,{aiOnly:true,fastTest:true,aiDifficulty:difficulty});
    game.players[0].isAI=false;game.players.forEach(p=>p.aiPolicy=policy);game.currentPlayerIdx=1;
    if(chapter)configureStoryMatch(game,chapter);return game;
  }
  function arrange(hands,board=[]){
    game.board=Array.from({length:4},()=>Array(4).fill(null));game.wasteland=game.wasteland.map(row=>row.map(()=>false));game.shopCards=[];game.kourindouEnabled=false;
    game.players.forEach((p,i)=>{p.hand=hands[i].slice();p.discard=[];});for(const[r,c,id]of board)game.setCardAt(r,c,id);
    const used=[...hands.flat(),...board.map(at=>at[2])];assert.equal(new Set(used).size,used.length);
    game.drawPile=CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion&&!used.includes(card.id)).map(card=>card.id);
    game.startingCardIds=new Set([...used,...game.drawPile]);game.handKnowledge=game.players.map(()=>new Map());game.reserveAges=game.players.map(()=>({}));
    game.ui.pickOwnHandCards=async()=>null;game.ui.pickCell=async(t,cells)=>cells[0];game.pickUI=async(p,method,args)=>game.ui[method]?.(...args);
  }
  for(const chapter of [1,2,3,4]){
    for(let seed=0;seed<32;seed++){
      const g=fresh(chapter,seed);assert(g.handKnowledge.every(memory=>memory.size===0));assert(!('openingHand' in g.storyMatch));
      assert(g.knownHandCards(1).every(card=>card.playerIdx===1));assert.equal(g.knownHandCards(1).length,6);
      assert.equal(aiLearningFourFaction(g,g.storyMatch),null);assert.equal(aiLearningProtectedFactions(g,1).size,0);
    }
    ok(true,'Chapter '+chapter+' begins without shared opening knowledge, a hidden opening list or a faction inferred from that list across 32 actual deals');
  }
  for(const n of [2,3,4])for(const difficulty of Object.keys(AI_DIFFICULTIES))for(const policy of ['current','previous','baseline']){
    for(let seed=0;seed<8;seed++){
      const g=fresh(null,seed,n,difficulty,policy);assert(g.handKnowledge.every(memory=>memory.size===0));
      for(const p of g.players){assert.equal(g.knownHandCards(p.idx).length,p.hand.length);assert(g.knownHandCards(p.idx).every(card=>card.playerIdx===p.idx));}
    }
    ok(true,'Ordinary '+n+'-player '+difficulty+'/'+policy+' openings expose only each AI’s own hand across eight deals');
  }
  for(let seed=0;seed<16;seed++){
    fresh(null,seed);configureTutorialMatch(game);assert.equal(aiTutorialKnownHand(game).length,6);assert(game.players[0].hand.every(id=>game.handKnowledge[1].get(id)===0));
    const next=game.takeFromDrawPile(0);game.addToHand(0,next);assert(!aiTutorialKnownHand(game).includes(next));
  }
  ok(true,'Only the final tutorial keeps all six starting cards, without gaining knowledge of subsequent hidden draws');
  fresh();configureTutorialMatch(game);fresh();ok(game.handKnowledge.every(memory=>memory.size===0),'Leaving the tutorial does not carry its special knowledge into an ordinary match');

  const variants=[['sdm_flandre','sdm_patchouli','reimu','marisa','yuuka','medicine'],['mtn_sanae','mtn_aya','reimu','marisa','yuuka','medicine']];
  for(const mode of ['current','previous','baseline',1,2,3,4]){
    const observations=[];
    for(const human of variants){
      fresh(typeof mode==='number'?mode:null,44,2,'hard',typeof mode==='string'?mode:'current');arrange([human,['sdm_remilia','hourai_mokou']]);
      if(game.storyMatch)Object.defineProperty(game.storyMatch,'openingHand',{configurable:true,get(){throw Error('A story policy read a private legacy opening list');}});
      const before=JSON.stringify(game.testRuleState()),metrics=JSON.stringify(game.testMetrics),gain=game.estimateHandGain(1,'sdm_remilia');
      evalSetSeed(991);const action=await aiDecideAction(1);assert.equal(before,JSON.stringify(game.testRuleState()));assert.equal(metrics,JSON.stringify(game.testMetrics));
      assert(game.knownHandCards(1).every(card=>card.playerIdx===1));observations.push({action,gain});
      if(game.storyMatch){aiLearningFourFaction(game,game.storyMatch);aiLearningProtectedFactions(game,1);delete game.storyMatch.openingHand;}
    }
    assert.deepEqual(observations[0],observations[1]);assert(observations[0].gain>0&&observations[0].gain<1);
    comparisons.push({mode,...observations[0]});ok(true,'Policy '+mode+' makes the same decision and Remilia estimate when two unrevealed Mansion cards are exchanged with hidden deck cards');
  }
  fresh(3);arrange([variants[0],['sdm_remilia','hourai_mokou']]);
  const blind=await aiDecideAction(1);assert.equal(blind.type,'draw');game.revealHand(0,game.players[0].hand,[1]);
  ok(game.estimateHandGain(1,'sdm_remilia')===2&&(await aiDecideAction(1)).cardId==='sdm_remilia','A legitimately revealed hand makes Remilia’s gain exact and enables the chapter-three gathering opportunity');
  fresh(4);const human=game.players[0].hand.slice();game.drawForEveryone(1);
  ok(game.players[0].hand.length===7&&game.knownHandCards(1).every(card=>card.playerIdx===1)&&human.every(id=>!game.handKnowledge[1].has(id)),'Shared drawing reveals no opponent starting cards or the opponent’s new draw');

  fresh();arrange([variants[0],['mtn_aya','hourai_mokou']]);game.removeFromHand(1,'mtn_aya');await game.internalPlace('mtn_aya',1,1,1,0);
  const report=game.knownHandCards(1).filter(card=>card.playerIdx===0);
  ok(report.length===4&&report.every(card=>game.players[0].hand.includes(card.id))&&game.paperReports.length===1,'The real Aya skill still records exactly four revealed opponent cards and creates a newspaper');evalConservation(game);
  fresh();arrange([variants[0],['palace_satori','hourai_mokou']]);const selected=await game.chooseHandCard(1,0,'Satori',{presentation:'satori'});
  ok(!!selected&&game.knownHandCards(1).filter(card=>card.playerIdx===0).length===4,'The real Satori chooser reveals only four cards while keeping the other two unknown');
  fresh();arrange([variants[0],['hourai_reisen','hourai_mokou']]);game.removeFromHand(1,'hourai_reisen');await game.internalPlace('hourai_reisen',1,1,1,0);
  ok(game.knownHandCards(1).filter(card=>card.playerIdx===0).length===6&&!!game.forcedPlay[0],'The real Reisen skill can reveal the target hand and impose its chosen mandatory card');evalConservation(game);
  fresh();arrange([variants[0],['sdm_remilia','hourai_mokou']]);const publicCard=game.takeFromDrawPile(0);game.addToHand(0,publicCard,true);
  ok(game.handKnowledge[1].size===1&&game.handKnowledge[1].get(publicCard)===0,'A publicly acquired card grants knowledge of that card, without exposing the rest of the hand');
  game.removeFromHand(0,publicCard);game.drawPile.push(publicCard);
  ok(game.handKnowledge[1].size===0,'A revealed card leaving the hand clears its remembered location');evalConservation(game);
  const snapshot=evalNewOpening('stability-validation-0',2,4,'hard'),complete=await evalRunMatch(snapshot,['current','current'],'stability-validation-0');
  ok(complete.reason==='win'||complete.reason==='stalemate','A complete ordinary match ends without runtime errors, conservation failures or a turn-limit abort under the private-hand estimate');
  const ordinaryMatch={reason:complete.reason,winner:complete.winner,points:complete.points,turns:complete.turns};
  return {status:'pass',count:checks.length,checks,storyOpenings:128,ordinaryOpenings:216,tutorialOpenings:16,comparisons,ordinaryMatch,rulesVersion:REWORK_RULES_VERSION,scope:'Actual ordinary/story/tutorial deals, hidden-hand counterfactual decisions across seven policies/modes, ignored legacy opening lists, actual Aya/Reisen skills and Satori chooser, public acquisitions, memory expiry and an ordinary full match. Introduction language-switch coverage is in the renewal suite; no browser pixel verification.'};
})()`,ctx).then(result=>{fs.writeFileSync(__dirname+'/story-private-opening-2026-10-16-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' private-opening and legitimate-information checks passed');}).catch(error=>{console.error(error.stack);process.exitCode=1;});
