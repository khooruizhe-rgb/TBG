const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{';
const bootstrap={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx};',bootstrap);const {ctx}=bootstrap.module.exports;
vm.runInContext(`(async()=>{
  const checks=[],stagingRoutes=[],ok=(value,name)=>{assert(value,name);checks.push(name);},realAction=doPlayerAction;
  function make(chapter=2,seed=1,actor=1){
    evalResetTokens();evalSetSeed(seed);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard'});game.players[0].isAI=false;game.currentPlayerIdx=actor;configureStoryMatch(game,chapter);game.render=()=>{};
    game.ui.pickOwnHandCards=async()=>null;game.ui.pickCell=async(t,cells)=>cells[0];game.ui.promptText=async()=>null;game.pickUI=async(p,method,args)=>game.ui[method]?.(...args);return game;
  }
  function arrange(hands,board=[],emptyPile=false){
    game.board=Array.from({length:4},()=>Array(4).fill(null));game.wasteland=game.board.map(row=>row.map(()=>false));game.players.forEach((p,i)=>{p.hand=hands[i].slice();p.discard=[];});
    for(const[r,c,id]of board)game.setCardAt(r,c,id);const used=[...hands.flat(),...board.map(at=>at[2])];assert.equal(used.length,new Set(used).size);
    game.drawPile=emptyPile?[]:CARDS.filter(c=>!c.token&&!c.shopkeeper&&!c.shopExpansion&&!used.includes(c.id)).map(c=>c.id);game.startingCardIds=new Set([...used,...game.drawPile]);
    game.handKnowledge=game.players.map(()=>new Map());game.reserveAges=game.players.map(()=>({}));game.logLines=[];
    if(game.storyMatch.chapter===1)game.revealHand(0,hands[0],[1]);
  }
  for(const chapter of [1,2,3,4,5]){
    for(let seed=0;seed<64;seed++){
      const g=make(chapter,seed,seed%2),opening=g.players[0].hand.slice();assert(g.players.every(p=>p.hand.length===6));assert.equal(g.currentPlayerIdx,seed%2);assert(!('openingHand' in g.storyMatch));
      assert.equal(g.handKnowledge[0].size,0);assert.equal(g.handKnowledge[1].size,chapter===1?6:0);assert.equal(g.knownHandCards(1).length,chapter===1?12:6);
      if(chapter===1){assert(opening.every(id=>g.handKnowledge[1].get(id)===0));const next=g.takeFromDrawPile(0);g.addToHand(0,next);assert(!g.handKnowledge[1].has(next));}
      evalConservation(g);
    }
    ok(true,'Chapter '+chapter+' keeps six-card random deals, first actor and conservation; only chapter one reveals exactly the learner’s opening six across 64 deals');
  }
  make(1);const start=game.players[0].hand[0];game.removeFromHand(0,start);game.drawPile.push(start);assert(!game.handKnowledge[1].has(start));game.drawPile.pop();game.addToHand(0,start);assert(!game.handKnowledge[1].has(start));
  ok(true,'First-chapter opening knowledge expires when a card leaves and does not follow its later hidden return');evalConservation(game);
  make(1);const published=game.takeFromDrawPile(0);game.addToHand(0,published,true);ok(game.handKnowledge[1].get(published)===0,'Legitimately public acquisitions remain visible after the starting-hand exception');
  make(1);arrange([['mtn_sanae','mtn_aya','haku_youmu','haku_yuyuko','reimu','marisa'],['mtn_kanako','mtn_suwako','temple_shou','temple_nue','temple_murasa','temple_byakuren']]);
  const focus=aiLearningFourFaction(game,game.storyMatch),plan=await aiDecideAction(1);ok(focus==='mountain'&&plan.type==='place'&&CARD[plan.cardId].faction==='mountain','The first-chapter mentor uses the actual opening clue to support the learner’s four-card faction');
  make(1);game.cancelled=true;game=new Game(2,{},null,{aiOnly:true,fastTest:true});ok(!game.storyMatch&&game.handKnowledge.every(memory=>memory.size===0),'Leaving chapter one does not carry opening knowledge into ordinary play');

  for(const chapter of [2,3])for(const faction of ['hourai','mountain','palace','sage','hell','temple']){
    make(chapter);const cards=storyFactionCards(faction);arrange([[cards[3],'reimu'],[...cards.slice(0,3),'marisa']]);
    const before=JSON.stringify(captureAIEvaluationSnapshot(game)),metrics=JSON.stringify(game.testMetrics),random=Math.random;
    Math.random=()=>{throw Error('Support planning cannot consume RNG');};let first;
    try{first=await aiDecideAction(1);}finally{Math.random=random;}
    assert.equal(first.type,'place');assert.equal(CARD[first.cardId].faction,faction);assert.equal(JSON.stringify(captureAIEvaluationSnapshot(game)),before);assert.equal(JSON.stringify(game.testMetrics),metrics);
    for(let step=0;step<3;step++){
      const action=await aiDecideAction(1);assert.equal(action.type,'place');assert.equal(CARD[action.cardId].faction,faction);await realAction(1);assert.equal(game.factionCells(faction).length,step+1);evalConservation(game);
    }
    const members=game.factionCells(faction);assert(game.isConnected(members));assert.equal(aiStoryThreeCardAction(1),null);assert.equal(game.winCount(game.players[1]),0);
    ok(true,'Chapter '+chapter+' really stages three connected '+faction+' cards before delay draws, without scoring them for the opponent or mutating forecasts');
    game.currentPlayerIdx=0;const cell=aiCurrentFactionPlacement(0,cards[3],game.emptyOrWastelandForCard(CARD[cards[3]],0));assert(cell);game.removeFromHand(0,cards[3]);await game.internalPlace(cards[3],cell.r,cell.c,0,0);evalConservation(game);
    ok(game.winCount(game.players[0])===4&&game.factionCells(faction).length===0,'The learner can place the real fourth '+faction+' card and collect all four in chapter '+chapter);
    stagingRoutes.push({chapter,faction,learnerPoints:game.winCount(game.players[0])});
  }
  for(const chapter of [2,3]){
    make(chapter);arrange([['palace_rin'],['palace_satori','palace_utsuho','reimu']]);assert(aiStoryThreeCardAction(1));await realAction(1);assert(aiStoryThreeCardAction(1));await realAction(1);
    const next='palace_koishi';game.drawPile.splice(game.drawPile.indexOf(next),1);game.addToHand(1,next);assert.equal((await aiDecideAction(1)).cardId,next);await realAction(1);evalConservation(game);
    ok(game.factionCells('palace').length===3&&game.isConnected(game.factionCells('palace')),'Chapter '+chapter+' starts with matching pairs and continues the same public set when its third card is drawn');
    make(chapter);arrange([['palace_rin'],['palace_koishi']],[[0,0,'palace_satori'],[0,2,'palace_utsuho']]);const bridge=aiStoryThreeCardAction(1);
    ok(bridge?.r===0&&bridge?.c===1,'Chapter '+chapter+' bridges two separated cards into a connected three-card offer with room for the fourth');
    make(chapter);arrange([[],storyFactionCards('palace')]);ok(aiStoryThreeCardAction(1)===null,'Chapter '+chapter+' does not advertise a collection when its own hand contains every possible Palace finisher');
    make(chapter);arrange([[],['palace_rin']],[[0,0,'palace_satori'],[0,1,'palace_utsuho'],[1,0,'palace_koishi']]);ok(aiStoryThreeCardAction(1)===null,'Chapter '+chapter+' stops the dedicated support plan at three and does not use it to take the fourth');
    make(chapter);arrange([['palace_rin'],['palace_satori','palace_utsuho','palace_koishi']]);game.wasteland=game.wasteland.map(row=>row.map(()=>true));ok(aiStoryThreeCardAction(1)===null&&(await aiDecideAction(1)).type==='draw','Chapter '+chapter+' respects terrain and uses a legal draw when no staging landing exists');
    game.placementBlockedForTurn[1]=true;ok(aiStoryThreeCardAction(1)===null&&(await aiDecideAction(1)).type==='draw','Chapter '+chapter+' respects a placement blockade');
    make(chapter);arrange([[],['reimu']],[],true);await realAction(1);ok(game.isOnBoard('reimu'),'Chapter '+chapter+' still takes an otherwise unattractive mandatory legal placement');
    const observations=[];
    for(const human of [['palace_rin','hourai_mokou'],['mtn_sanae','sdm_flandre']]){make(chapter);arrange([human,['palace_satori','palace_utsuho','palace_koishi','reimu']]);observations.push(await aiDecideAction(1));assert.equal(game.handKnowledge[1].size,0);}
    ok(JSON.stringify(observations[0])===JSON.stringify(observations[1]),'Chapter '+chapter+' makes the same support decision after unseen human and deck cards are exchanged');
  }
  make(2);arrange([['sdm_remilia'],['sdm_sakuya','reimu']],[[0,0,'sdm_flandre'],[0,1,'sdm_patchouli']]);
  for(const age of [0,3,4]){game.reserveAges[1].sdm_sakuya=age;assert.equal(aiStoryThreeCardAction(1),null);}ok(true,'Chapter two keeps delaying Mansion cards before all core Mansion cards have appeared, even after the three-turn hold');
  game.storyMatch.sdmPlaced=storyScarletCards();game.reserveAges[1].sdm_sakuya=3;assert.equal(aiStoryThreeCardAction(1),null);game.reserveAges[1].sdm_sakuya=4;
  ok(aiStoryThreeCardAction(1)?.cardId==='sdm_sakuya','After the appearance condition is met, chapter two still admits Mansion support only after the holding period');
  make(3);arrange([['palace_rin'],['haku_youmu','palace_satori','palace_utsuho','palace_koishi']]);assert(aiStoryThreeCardAction(1));ok((await aiDecideAction(1)).cardId==='haku_youmu','Chapter three’s immediate Youmu rule remains ahead of an available three-card support route');
  for(const chapter of [1,4,5]){make(chapter);arrange([['palace_rin'],['palace_satori','palace_utsuho','palace_koishi']]);ok(aiStoryThreeCardAction(1)===null,'The three-card support override is absent from chapter '+chapter);}
  return {status:'pass',count:checks.length,checks,chapterOpenings:320,stagingRoutes,rulesVersion:REWORK_RULES_VERSION,scope:'Real opening knowledge and expiry, privacy in chapters two through five and ordinary mode, actual three-card staging and learner claims across six factions in both chapters, planning purity, legal-action constraints and existing chapter priorities. Difficulty classification is based on actual configuration/dispatch, not measured equivalent win rates.'};
})()`,ctx).then(result=>{fs.writeFileSync(__dirname+'/story-mentor-support-2026-10-16-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' first-chapter knowledge and three-card mentor checks passed');}).catch(error=>{console.error(error.stack);process.exitCode=1;});
