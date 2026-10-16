const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8');
const marker='vm.runInContext(`(async()=>{';assert(fixture.includes(marker));
const bootstrap={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,el,storage};',bootstrap);
const {ctx}=bootstrap.module.exports;
vm.runInContext(`(async()=>{
  const checks=[],walkthroughs=[],ok=(value,name)=>{assert(value,name);checks.push(name);},definitions=JSON.stringify(CARDS);
  const originalAction=doPlayerAction;
  function setup(mode=3,actor=0,seed=1){
    evalResetTokens();evalSetSeed(seed);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard',kourindouEnabled:mode==='tutorial'});
    game.currentPlayerIdx=actor;game.players[0].isAI=false;
    if(mode==='tutorial')configureTutorialMatch(game);else configureStoryMatch(game,mode);
    game.render=()=>{};game.ui.pickOwnHandCards=async()=>null;game.ui.pickCell=async(t,cells)=>cells[0];game.ui.promptText=async()=>null;
    game.pickUI=async(p,method,args)=>game.ui[method](...args);return game;
  }
  function inventory(){return [...game.drawPile,...game.shopCards.filter(Boolean),...game.mainBoardCells().map(cell=>game.cardAt(cell.r,cell.c)),...game.players.flatMap(p=>[...p.hand,...p.discard])];}
  function arrange({hands=[[],[]],board=[],discards=[[],[]],emptyPile=false,shop=[]}={}){
    game.board=Array.from({length:SIZE},()=>Array(SIZE).fill(null));game.wasteland=Array.from({length:SIZE},()=>Array(SIZE).fill(false));
    game.players.forEach((player,index)=>{player.hand=hands[index].slice();player.discard=discards[index].slice();});
    for(const[r,c,id]of board)game.setCardAt(r,c,id);game.shopCards=shop.slice();
    const used=[...hands.flat(),...discards.flat(),...board.map(cell=>cell[2]),...shop];assert.equal(used.length,new Set(used).size);
    game.drawPile=emptyPile?[]:shuffle(CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion&&!used.includes(card.id)).map(card=>card.id));
    game.startingCardIds=new Set([...used,...game.drawPile]);game.handKnowledge=game.players.map(()=>new Map());game.reserveAges=game.players.map(()=>({}));
    const lesson=game.storyMatch||game.tutorialLesson;lesson.openingHand=hands[0].slice();game.revealHand(0,hands[0],[1]);
    game.winner=null;game.stalemateMessage='';game.logLines=[];
  }
  async function place(id,p=0,r=1,c=1){assert(game.players[p].hand.includes(id),'Retain '+id+' in '+JSON.stringify(game.players[p].hand)+'; progress '+JSON.stringify(game.storyMatch?.progress)+'; log '+JSON.stringify(game.logLines.slice(-12)));game.removeFromHand(p,id);return game.internalPlace(id,r,c,p,0);}
  function detach(id){for(const player of game.players){const i=player.hand.indexOf(id);if(i>=0)game.removeFromHand(player.idx,id);}const at=game.drawPile.indexOf(id);if(at>=0)game.drawPile.splice(at,1);}
  function award(p,id){detach(id);assert(game.addToDiscard(p,id,{effect:'test-fixture'}));}
  const humanHands=new Set(),rivalHands=new Set(),positions=new Set(),missingCounts=new Set(),actors=new Set();
  for(let seed=0;seed<256;seed++){
    const g=setup(3,seed%2,seed),human=g.players[0].hand,rival=g.players[1].hand,ids=inventory();actors.add(g.currentPlayerIdx);
    assert(human.includes('haku_yuyuko'));assert.equal(rival.filter(id=>CARD[id].faction==='sdm').length,2);
    assert(g.players.every(p=>p.hand.length===6));assert.equal(g.currentPlayerIdx,seed%2);assert(!g.kourindouEnabled&&g.shopCards.length===0);
    assert.equal(ids.length,36);assert.equal(new Set(ids).size,36);assert(ids.every(id=>g.startingCardIds.has(id)));
    assert(human.every(id=>g.handKnowledge[1].get(id)===0));assert.equal(g.handKnowledge[0].size,0);
    assert(CARDS.every(card=>g.cardAbilityEnabled(card.id)===['sdm','hakugyokurou'].includes(card.faction)));
    const absent=storyFactionCards('hakugyokurou').filter(id=>!human.includes(id)&&!rival.includes(id)),deck=g.drawPile.slice();
    const next=Array.from({length:5},()=>g.takeFromDrawPile(0));assert(absent.every(id=>next.includes(id)));
    absent.forEach(id=>positions.add(next.indexOf(id)+1));missingCounts.add(absent.length);g.drawPile=deck;
    humanHands.add(human.slice().sort().join(','));rivalHands.add(rival.slice().sort().join(','));
  }
  ok(humanHands.size>240&&rivalHands.size>240,'Both chapter-three hands vary across 256 actual randomized openings');
  ok(positions.size===5&&missingCounts.has(0)&&missingCounts.has(1),'Undealt Youmu is reserved in any of the actual next five draw positions, while already-dealt cards stay in hand');
  ok(actors.size===2,'Chapter three preserves either first actor');
  ok(true,'Every seeded opening has Yuyuko, exactly two opponent Mansion cards, unique stock, cumulative skills and correct mentor knowledge');
  const random=Math.random;
  for(const value of [0,.999999]){setup(3,0,'constant');Math.random=()=>value;try{configureStoryMatch(game,3);ok(game.players[0].hand.includes('haku_yuyuko')&&game.players[1].hand.filter(id=>CARD[id].faction==='sdm').length===2,'Constrained dealing terminates with constant randomness '+value);}finally{Math.random=random;}}

  const targets=[[0,1,'sdm_remilia'],[1,0,'mtn_aya'],[1,2,'hourai_mokou'],[2,1,'temple_shou']],payment=['sdm_sakuya','sdm_flandre','sdm_patchouli','mtn_sanae'];
  setup();arrange({hands:[['haku_yuyuko','haku_youmu',...payment],[]],board:targets});
  const stockBefore=new Set(inventory());game.ui.pickOwnHandCards=async(t,ids,o)=>ids.filter(id=>payment.includes(id)).slice(0,o.maxCount);
  await place('haku_yuyuko');
  ok(game.winCount(game.players[0])===4&&game.storyMatch.progress.yuyuko&&!game.storyMatch.progress.haku,'Yuyuko actually pays four cards and earns four skill points before any faction claim');
  ok(payment.every(id=>game.drawPile.includes(id))&&targets.every(cell=>game.players[0].discard.includes(cell[2])),'Four actual costs return to the deck and four actual orthogonal targets enter the player discard');
  let ids=inventory();ok(ids.length===stockBefore.size&&new Set(ids).size===ids.length&&ids.every(id=>stockBefore.has(id)),'The four-point resolution conserves every real card');
  await place('haku_youmu',0,1,2);ok(game.storyMatch.progress.haku&&game.winCount(game.players[0])===6,'A subsequent actual Yuyuko–Youmu claim records Hakugyokurou separately');
  setup();arrange({hands:[['haku_yuyuko',...payment],[]],board:targets,discards:[['medicine','yuuka'],[]]});
  game.ui.pickOwnHandCards=async(t,ids)=>ids.filter(id=>payment.includes(id)).slice(0,2);await place('haku_yuyuko');
  ok(game.winCount(game.players[0])===4&&!game.storyMatch.progress.yuyuko,'Two skill points added to two old points do not satisfy a four-point Yuyuko use');
  setup();arrange({hands:[['haku_yuyuko',...payment],[]],board:targets});game.ui.pickOwnHandCards=async()=>null;await place('haku_yuyuko');
  ok(!game.storyMatch.progress.yuyuko&&game.winCount(game.players[0])===0,'Declining the cost does not complete the Yuyuko objective');
  setup();arrange({hands:[[],['haku_yuyuko',...payment]],board:targets});game.players[1].isAI=false;
  game.ui.pickOwnHandCards=async(t,ids,o)=>ids.filter(id=>payment.includes(id)).slice(0,o.maxCount);await place('haku_yuyuko',1);
  ok(!game.storyMatch.progress.yuyuko&&game.storyMatch.opponentReachedFour,'Opponent Yuyuko points fail the race and never satisfy the player ability goal');
  setup();arrange({board:[[1,1,'haku_yuyuko'],[1,2,'haku_youmu']]});game.checkClaims(1);
  ok(!game.storyMatch.progress.haku,'An opponent Hakugyokurou claim is not a player objective');
  setup();arrange();for(const id of ['mtn_sanae','sage_ran','hourai_mokou'])award(1,id);
  ok(!storyRaceLost(game),'Three opponent points leave the race open');award(1,'temple_shou');
  ok(storyRaceLost(game)&&game.storyMatch.opponentReachedFour,'The exact fourth opponent point permanently records a lost race');
  const lost=game.players[1].discard.pop();game.addToHand(1,lost,true);game.checkWin();
  ok(game.winCount(game.players[1])===3&&storyRaceLost(game),'Dropping below four later cannot erase the earlier race failure');
  for(const rivalPoints of [0,3,4]){
    setup();arrange({discards:[['mtn_sanae','mtn_aya','hourai_mokou','temple_shou','sage_ran','yuuka','medicine'],['sdm_remilia','sdm_flandre','sdm_sakuya','sdm_patchouli'].slice(0,rivalPoints)]});
    game.storyMatch.progress={haku:true,yuyuko:true};game.checkWin();
    ok(storyMatchComplete(game)&&storyMatchStars(game)===(rivalPoints<4?3:2),'Victory clears the chapter while the race awards one independent star: '+rivalPoints);
  }
  for(const missing of ['haku','yuyuko']){setup();game.storyMatch.progress={haku:true,yuyuko:true};game.storyMatch.progress[missing]=false;game.winner=game.players[0];ok(storyMatchComplete(game)&&storyMatchStars(game)===2,'The '+missing+' objective awards a star without gating victory');}

  for(const mode of ['tutorial',1,2,3])for(const card of ['reimu','haku_yuyuko']){
    setup(mode,1);arrange({hands:[[],[card]],emptyPile:true});
    const before=JSON.stringify(captureAIEvaluationSnapshot(game)),metrics=JSON.stringify(game.testMetrics);Math.random=()=>{throw Error('Teaching planning must be pure');};let action;
    try{action=await aiDecideAction(1);}finally{Math.random=random;}
    ok(canAct(1)&&action.type==='place'&&action.cardId===card,'Teaching mode '+mode+' places a legal card even without strategic ability value: '+card);
    ok(before===JSON.stringify(captureAIEvaluationSnapshot(game))&&metrics===JSON.stringify(game.testMetrics),'The mandatory-action fallback preserves rules, metrics and randomness: '+mode+'/'+card);
    await originalAction(1);ok(game.isOnBoard(card),'The actual turn executes its mandatory legal placement: '+mode+'/'+card);
  }
  setup(2,1);arrange({hands:[[],['sdm_sakuya']],emptyPile:true});
  ok((await aiDecideAction(1)).type==='place','A newly acquired Mansion card can be played immediately');
  setup(2,1);arrange({hands:[[],['sdm_sakuya','hourai_mokou']],emptyPile:true});
  ok((await aiDecideAction(1)).cardId==='sdm_sakuya','A filler alternative does not make the AI avoid its Mansion card');
  setup(3,1);arrange({hands:[[],['haku_youmu','reimu']],emptyPile:true});
  const followup=await originalAction(1);await afterAction(1,followup);
  ok(game.isOnBoard('haku_youmu')&&game.isOnBoard('reimu')&&!game.players[1].hand.length,'The actual Youmu extra action also places a strategically unwanted but legal remaining card');
  setup('tutorial',1);arrange({hands:[[],['reimu']],emptyPile:true});game.placementBlockedForTurn[1]=true;
  ok(!canAct(1)&&(await aiDecideAction(1)).type==='pass','An actual placement block and empty deck allow a pass');
  detach('mtn_sanae');game.drawPile=['mtn_sanae'];game.startingCardIds.add('mtn_sanae');
  ok(canAct(1)&&(await aiDecideAction(1)).type==='draw','A placement-blocked teacher still draws whenever drawing is legal');
  setup(3,1);arrange({hands:[[],['reimu']],emptyPile:true});game.wasteland=game.wasteland.map(row=>row.map(()=>true));
  ok(!canAct(1)&&(await aiDecideAction(1)).type==='pass','Terrain with no legal landing and no draw is a genuine unavailable turn');
  setup('tutorial',1);arrange({hands:[[],['reimu']],emptyPile:true,shop:['shop_rinnosuke','mtn_kanako','sdm_meiling','hourai_tewi']});game.wasteland=game.wasteland.map(row=>row.map(()=>true));
  ok(canAct(1)&&(await aiDecideAction(1)).type==='trade','A teaching opponent can trade for a card that permits its otherwise unavailable placement');
  await originalAction(1);ok(game.tradedThisTurn[1]&&game.isOnBoard('mtn_kanako'),'The actual teaching turn trades once and completes the legal placement');

  setup(3,1);arrange({hands:[[],['hourai_mokou']]});
  ok((await aiDecideAction(1)).type==='draw','Before both Hakugyokurou cards appear, the opponent delays through legal shared draws');
  game.storyMatch.hakuPlaced=storyFactionCards('hakugyokurou');ok((await aiDecideAction(1)).type==='place','Once both Hakugyokurou cards appeared, the opponent resumes active placement');
  setup(3,1);arrange({hands:[[],['sdm_patchouli']],board:[[1,0,'sdm_remilia'],[1,1,'sdm_flandre'],[2,1,'sdm_sakuya']]});
  let action=await aiDecideAction(1);ok(action.type==='place'&&action.cardId==='sdm_patchouli','An immediate Mansion collection takes priority over chapter-three stalling');
  await originalAction(1);ok(game.winCount(game.players[1])===4&&storyRaceLost(game),'The opponent really collects Mansion and the race fails at its four points');
  setup(3,1);arrange({hands:[['sdm_flandre','sdm_patchouli'],['sdm_remilia','sdm_sakuya']]});
  const redBefore=JSON.stringify(captureAIEvaluationSnapshot(game)),redMetrics=JSON.stringify(game.testMetrics);Math.random=()=>{throw Error('Chapter-three planning must not consume RNG');};
  try{action=await aiDecideAction(1);}finally{Math.random=random;}
  ok(redBefore===JSON.stringify(captureAIEvaluationSnapshot(game))&&redMetrics===JSON.stringify(game.testMetrics),'Mansion pursuit changes no real state, metrics, race history or randomness during planning');
  ok(action.type==='place'&&action.cardId==='sdm_remilia','The opponent uses known Remilia opportunities to pursue its Mansion faction during the delay');
  await originalAction(1);ok(game.players[1].hand.includes('sdm_flandre')&&game.players[1].hand.includes('sdm_patchouli'),'Remilia pursuit obtains the actual known player cards');

  // Legal mid-match positions after Remilia gathered three cards: validate ability costs, Youmu followups and the full clear together.
  for(const actor of [0,1])for(let seed=0;seed<8;seed++){
    setup(3,actor,seed+900);arrange({hands:[['haku_yuyuko','haku_youmu','yuuka','medicine',...payment],['mtn_kanako','mtn_suwako','palace_rin','temple_murasa','hell_eiki','sage_ran']],board:targets});
    const originalStock=new Set(inventory()),match=game;let turns=0;
    game.ui.pickOwnHandCards=async(t,ids,o)=>ids.filter(id=>payment.includes(id)).slice(0,o.maxCount);
    const choosePlayer=game.choosePlayer.bind(game),chooseHandCard=game.chooseHandCard.bind(game);
    game.choosePlayer=async(p,...args)=>p===0?0:choosePlayer(p,...args);
    game.chooseHandCard=async(p,target,...args)=>p===0?game.players[target].hand.find(id=>game.canHandEnterPile(id)):chooseHandCard(p,target,...args);
    doPlayerAction=async p=>{
      if(p===1)return originalAction(p);
      const hand=match.players[0].hand;
      const id=!match.storyMatch.progress.yuyuko?'haku_yuyuko':!match.storyMatch.progress.haku?'haku_youmu'
        :hand.includes('sdm_flandre')&&hand.length>1?'sdm_flandre'
        :hand.includes('medicine')&&match.isOnBoard('yuuka')?'medicine'
        :hand.includes('yuuka')&&(hand.includes('medicine')||match.isOnBoard('medicine'))?'yuuka':null;
      if(!id){assert(match.canDrawNormally(0),'The student must have a legal draw');match.drawForEveryone(0);await match.resolveKoishiCascade(0);return {};}
      const cells=match.emptyOrWastelandForCard(CARD[id],0).filter(cell=>inBounds(cell.r,cell.c));let cell;
      if(id==='haku_yuyuko')cell=cells.find(at=>at.r===1&&at.c===1);
      else{const member=match.factionCells(CARD[id].faction)[0];cell=member?cells.find(at=>Math.abs(at.r-member.r)+Math.abs(at.c-member.c)===1):cells[0];}
      assert(cell,'A legal student landing exists for '+id);return place(id,0,cell.r,cell.c);
    };
    while(!match.winner&&!match.stalemateMessage&&turns++<32){const p=match.currentPlayerIdx;match.beginPlayerTurn(p);match.tradedThisTurn[p]=false;const flags=await doPlayerAction(p);await afterAction(p,flags,match.takeScheduledExtraTurns(p));}
    doPlayerAction=originalAction;
    ok(storyMatchComplete(match)&&match.winner?.idx===0,'A real mid-match route completes all chapter-three goals: '+actor+'/'+seed);
    const stock=inventory();ok(stock.length===originalStock.size&&new Set(stock).size===stock.length&&stock.every(id=>originalStock.has(id)),'The chapter-three route conserves every original: '+actor+'/'+seed);
    walkthroughs.push({actor,seed,turns,points:match.players.map(p=>match.winCount(p)),progress:{...match.storyMatch.progress},raceLost:storyRaceLost(match)});
  }
  ok(JSON.stringify(CARDS)===definitions,'Neither the new chapter nor mandatory teaching moves mutate printed card definitions');
  const productionMatches=[];
  for(let seed=0;seed<8;seed++){
    const match=setup(3,seed%2,'production-'+seed);match.players[0].isAI=true;let turns=0,idle=0;
    while(!match.winner&&!match.stalemateMessage&&turns++<180){
      const p=match.currentPlayerIdx;match.beginPlayerTurn(p);match.tradedThisTurn[p]=false;
      if(!canAct(p)){if(++idle>=match.numPlayers){endStalemate();break;}advanceTurn();}
      else{
        idle=0;
        if(p===1&&!match.forcedPlay[p]){
          const planned=await aiDecideAction(p),legal=match.players[p].hand.some(id=>match.emptyOrWastelandForCard(CARD[id],p).some(at=>inBounds(at.r,at.c)));
          assert(planned.type!=='pass'||!legal&&!match.canDrawNormally(p),'An actual random chapter-three turn cannot strategically pass');
        }
        const flags=await originalAction(p);await afterAction(p,flags,match.takeScheduledExtraTurns(p));
      }
      evalConservation(match);
    }
    ok((!!match.winner||!!match.stalemateMessage)&&turns<180,'An actual random chapter-three match ends without a runtime error, illegal pass or turn-limit abort: '+seed);
    productionMatches.push({seed,turns,winner:match.winner?.idx??null,stalemate:!!match.stalemateMessage,points:match.players.map(p=>match.winCount(p)),progress:{...match.storyMatch.progress},raceLost:storyRaceLost(match)});
  }
  returnToMainMenu();openStoryMenu();showStoryChapterIntro(3);
  ok(el('story-card-grid').children.map(card=>card.dataset.cardId).sort().join(',')==='haku_youmu,haku_yuyuko','Chapter three introduces only the two newly unlocked Hakugyokurou cards');
  ok(el('story-card-grid').children.every(card=>movableTableCardEnabled(card)),'Chapter-three introductions enable the same movable-card interaction');
  el('story-begin').events.click();ok(isStoryMatch()&&game.storyMatch.chapter===3&&el('tutorial-feedback').innerHTML.includes('Yuyuko: gain four points'),'The introduction starts chapter three and displays its actual objectives');
  for(const id of ['mtn_sanae','sage_ran','hourai_mokou','temple_shou'])award(1,id);updateTutorialProgress();
  ok(el('tutorial-feedback').innerHTML.includes('✗')&&el('tutorial-feedback').innerHTML.includes('opponent reached four points'),'The fourth opponent point immediately displays a failed race and a retry explanation');
  const retired=game;el('tutorial-retry').events.click();ok(retired.cancelled&&game.storyMatch.chapter===3&&!game.storyMatch.opponentReachedFour&&!Object.values(game.storyMatch.progress).some(Boolean),'Retry retires chapter three and resets its goals and permanent race history');
  game.storyMatch.progress={haku:true,yuyuko:true};game.winner=game.players[0];updateTutorialProgress();ok(storyClearedChapters().includes(3),'A true chapter-three clear saves its own progress');
  el('restart-btn').events.click();ok(game===null&&storyMenuChapter===null&&el('story-levels').children.length===3,'Finishing the last available chapter returns to the three-chapter selection');
  return {status:'pass',count:checks.length,checks,walkthroughs,productionMatches,randomOpenings:256,uniqueHumanHands:humanHands.size,uniqueOpponentHands:rivalHands.size,reservePositions:[...positions].sort(),rulesVersion:REWORK_RULES_VERSION,scope:'Actual constrained deals, rule-level action availability and executed teaching turns, real cost/score/claim/race ownership, sixteen arranged legal mid-match clears, eight complete actual random matches without a strategic teaching pass, and chapter lifecycle in a controlled DOM. No random-opening clear guarantee or browser pixel verification.'};
})()`,ctx).then(result=>{fs.writeFileSync(__dirname+'/story-hakugyokurou-2026-10-16-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' Hakugyokurou checks and '+result.walkthroughs.length+' mid-match clear routes passed');}).catch(error=>{console.error(error.stack);process.exitCode=1;});
