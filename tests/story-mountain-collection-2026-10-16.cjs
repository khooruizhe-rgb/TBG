const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{';
const bootstrap={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,storage};',bootstrap);const {ctx,storage}=bootstrap.module.exports;ctx.testStorage=storage;
vm.runInContext(html.slice(html.indexOf('async function runNextTurn(){'),html.indexOf('\n/* Wire human hand-card')).replace('async function runNextTurn(){','async function actualMountainTurn(){'),ctx);
vm.runInContext(`(async()=>{
  const checks=[],productionMatches=[],ok=(value,name)=>{assert(value,name);checks.push(name);},realAction=doPlayerAction;
  function make(chapter=5,seed=1,actor=0){evalResetTokens();evalSetSeed(seed);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard'});game.players[0].isAI=false;game.currentPlayerIdx=actor;if(chapter)configureStoryMatch(game,chapter);game.ui.pickOwnHandCards=async()=>null;game.pickUI=async(p,method,args)=>game.ui[method]?.(...args);game.chooseCells=async(p,n,cells)=>cells.slice(0,n);return game;}
  function arrange({hands=[[],[]],board=[],discards=[[],[]],emptyPile=false}={}){
    game.board=Array.from({length:4},()=>Array(4).fill(null));game.wasteland=game.board.map(row=>row.map(()=>false));game.players.forEach((p,i)=>{p.hand=hands[i].slice();p.discard=discards[i].slice();});
    for(const[r,c,id]of board)game.setCardAt(r,c,id);const used=[...hands.flat(),...discards.flat(),...board.map(at=>at[2])];assert.equal(new Set(used).size,used.length);
    game.shopCards=[];game.kourindouEnabled=false;game.drawPile=emptyPile?[]:CARDS.filter(c=>!c.token&&!c.shopkeeper&&!c.shopExpansion&&!used.includes(c.id)).map(c=>c.id);game.startingCardIds=new Set([...used,...game.drawPile]);
    game.handKnowledge=game.players.map(()=>new Map());game.reserveAges=game.players.map(()=>({}));game.logLines=[];game.winner=null;game.stalemateMessage='';
  }
  async function place(id,p=0,r=1,c=1){assert(game.players[p].hand.includes(id));game.removeFromHand(p,id);return game.internalPlace(id,r,c,p,0);}
  function win(chapter,keys){openStoryChapter(chapter);for(const key of STORY_GOAL_KEYS[chapter])if(key!=='race')game.storyMatch.progress[key]=keys.includes(key);if(chapter===3)game.storyMatch.opponentReachedFour=!keys.includes('race');game.winner=game.players[0];updateStoryProgress();}

  for(const chapter of [2,3,4,5]){
    returnToMainMenu();testStorage.clear();const keys=STORY_GOAL_KEYS[chapter];
    win(chapter,[keys[0]]);assert.equal(storyBestStars(chapter),1);win(chapter,[keys[0]]);assert.equal(storyBestStars(chapter),1);
    win(chapter,[keys[1]]);assert.equal(storyBestStars(chapter),2);win(chapter,[keys[2]]);assert.equal(storyBestStars(chapter),3);
    assert(!storyChapterPerfect(chapter));assert(!el('tutorial-feedback').classList.contains('story-perfect'));
    ok(storyProgressDetails()[chapter].goals.length===3,'Chapter '+chapter+' unions distinct objectives over three victories without double-counting repeats or granting a single-run color');
    returnToMainMenu();openStoryMenu();const rating=el('story-levels').children[chapter-1].children[2].children[1];assert(!rating.className.includes('story-stars-perfect'));
    win(chapter,keys);assert(storyChapterPerfect(chapter));assert(el('tutorial-feedback').classList.contains('story-perfect'));assert(el('tutorial-feedback').innerHTML.includes('★★★'));assert.equal(storyStarColor(chapter),FACTIONS[STORY_CHAPTERS[chapter-1].introduced].color);
    win(chapter,[keys[0]]);assert(storyChapterPerfect(chapter));returnToMainMenu();openStoryMenu();
    ok(el('story-levels').children[chapter-1].children[2].children[1].className.includes('story-stars-perfect'),'Chapter '+chapter+' records a real three-objective victory and preserves its faction-colored stars on later replays');
  }
  returnToMainMenu();testStorage.clear();testStorage.set(STORY_PROGRESS_KEY,JSON.stringify({version:2,chapters:{1:3,2:2,3:3,4:0,99:3}}));
  ok(storyBestStars(2)===2&&storyProgressDetails()[2].goals.length===0&&storyChapterPerfect(3)&&storyBestStars(4)===0&&storyBestStars(5)===null,'Legacy counts preserve unknown objective identities; old three-star runs retain full objectives and their perfect marker');
  saveStoryStars(2,['sdm']);saveStoryStars(2,['remilia']);assert.equal(storyBestStars(2),2);saveStoryStars(2,['flandre']);
  ok(storyBestStars(2)===3&&!storyChapterPerfect(2),'A legacy two-star floor cannot be double-counted and can finish through new distinct objectives');
  saveStoryStars(2,STORY_GOAL_KEYS[2]);testStorage.set('keep-setting','yes');openStoryMenu();el('story-debug-reset').events.click();
  ok(storyBestStars(2)===0&&!storyChapterPerfect(2)&&storyProgressDetails()[2].goals.length===0&&storyClearedChapters().includes(2)&&testStorage.get('keep-setting')==='yes','DEBUG clears objective identities, legacy counts and perfect colors while preserving clears and unrelated settings');
  for(const value of ['null','{','{"version":3,"chapters":{"2":{"cleared":false,"goals":["sdm"],"perfect":true}}}']){testStorage.set(STORY_PROGRESS_KEY,value);assert.deepEqual(storyProgressDetails(),{});}ok(true,'Malformed and uncleared records cannot create stars');
  testStorage.set(STORY_PROGRESS_KEY,JSON.stringify({version:3,chapters:{2:{cleared:true,goals:['sdm','sdm','fake'],legacyStars:-1,perfect:true}}}));
  ok(storyBestStars(2)===1&&!storyChapterPerfect(2),'Duplicate or unknown objectives, invalid floors and incomplete perfect markers are sanitized');
  testStorage.clear();openStoryChapter(5);game.storyMatch.progress={mountain:true,stalemate:true,newsGuess:true};game.winner=game.players[1];updateStoryProgress();
  ok(storyBestStars(5)===null&&!storyState.complete,'The victory requirement still controls banking objectives and clearing the chapter');
  const setter=window.localStorage.setItem;window.localStorage.setItem=()=>{throw Error('Quota');};game.winner=game.players[0];updateStoryProgress();
  ok(storyState.complete&&el('tutorial-feedback').classList.contains('story-perfect')&&el('tutorial-feedback').innerHTML.includes('✓')&&el('tutorial-feedback').innerHTML.includes('★★★'),'A real single-run completion keeps its current-match checklist usable when storage is unavailable');window.localStorage.setItem=setter;returnToMainMenu();testStorage.clear();

  make(null);arrange({hands:[['mtn_kanako','mtn_suwako'],[]]});game.setWastelandAt(0,0,true);
  assert(!game.canPlaceOnWasteland(CARD.mtn_kanako)&&!game.canPlaceOnWasteland(CARD.mtn_suwako));await game.internalPlace('mtn_kanako',0,0,0,0);
  ok(!game.cardAt(0,0)&&!ORIGINAL_CARD_BLUEPRINTS.mtn_kanako.wasteOK,'Neither card can enter wasteland before an active Suwako is already on the board; Kanako’s original blueprint loses its old permission');
  make(null);arrange({hands:[['mtn_kanako'],[]],board:[[1,1,'mtn_suwako']]});game.setWastelandAt(0,0,true);
  ok(storyFactionCards('mountain').concat('mtn_nitori').every(id=>game.canPlaceOnWasteland(CARD[id]))&&!game.canPlaceOnWasteland(CARD.reimu),'Active Suwako grants all Mountain bodies, including the fifth card, wasteland entry without granting it to other factions');
  await place('mtn_kanako',0,0,0);ok(game.cardAt(0,0)==='mtn_kanako'&&game.wastelandAt(0,0),'Actual Kanako placement uses Suwako’s permission and leaves the terrain intact');
  game.setCardAt(1,1,null);ok(!game.canPlaceOnWasteland(CARD.mtn_sanae),'Removing the last active Suwako immediately removes the shared permission');
  make(null);arrange({board:[[1,1,'mtn_suwako'],[1,2,'shop_rinnosuke']]});ok(!game.canPlaceOnWasteland(CARD.mtn_sanae),'A Suwako silenced by Rinnosuke grants no wasteland permission');
  make(null);arrange({board:[[1,1,'mtn_suwako']]});game.permanentAbilities.mtn_suwako='__draw_one';ok(!game.canPlaceOnWasteland(CARD.mtn_kanako),'Overwriting Suwako removes the aura');
  make(null);arrange({hands:[['mtn_aya'],[]],board:[[1,1,'mtn_suwako'],[1,2,'mtn_kanako'],[3,1,'mtn_sanae']]});game.wasteland=game.wasteland.map(row=>row.map(()=>true));
  game.aiMakesMistake=()=>false;
  ok(aiCanConnectFaction('mountain',1),'The current AI recognizes a remaining Mountain connection through Suwako-enabled wasteland');
  const bridge=aiCurrentFactionPlacement(0,'mtn_aya',game.emptyOrWastelandForCard(CARD.mtn_aya,0));
  ok(bridge?.r===2&&bridge?.c===1,'Faction placement chooses the actual one-card wasteland bridge instead of an isolated legal tile');
  await place('mtn_aya',0,bridge.r,bridge.c);ok(game.winCount(game.players[0])===4,'The evaluated wasteland bridge produces a real four-card claim');
  for(const chapter of [4,5]){make(chapter);arrange({board:[[1,1,'mtn_suwako']]});ok(game.canPlaceOnWasteland(CARD.mtn_sanae)===(chapter===5),'Suwako’s aura respects the chapter skill unlock: '+chapter);}
  make(null);arrange({hands:[['mtn_suwako'],[]],board:[[0,0,'mtn_kanako']]});await place('mtn_suwako');
  ok(game.wasteland.flat().filter(Boolean).length===6&&game.hasActiveAbility('mtn_suwako'),'Kanako still doubles Suwako’s three-tile placement while the new shared aura remains active');evalConservation(game);
  for(const pay of [false,true]){
    make(null);arrange({hands:[['sdm_flandre'],[]]});game.ui.pickAbilityCards=async()=> 'mtn_suwako';const copy=await game.createCard(0,['mtn_suwako']);let inactiveDuringPayment=false;
    game.ui.pickOwnHandCards=async()=>{inactiveDuringPayment=!game.canPlaceOnWasteland(CARD.mtn_kanako);return pay?['sdm_flandre']:null;};await place(copy);
    ok(inactiveDuringPayment&&game.canPlaceOnWasteland(CARD.mtn_kanako)===pay,'A created Suwako’s aura requires its creation surcharge and does not activate before payment: '+pay);evalConservation(game);
  }

  const hands=new Set(),rivals=new Set(),positions=new Set();
  for(let seed=0;seed<512;seed++){
    const g=make(5,seed,seed%2),a=g.players[0].hand,b=g.players[1].hand;assert(g.players.every(p=>p.hand.length===6));assert(a.includes('mtn_kanako'));assert(a.filter(id=>CARD[id].faction==='mountain').length>=2);assert.equal(b.filter(id=>CARD[id].faction==='mountain').length,1);
    assert(!('openingHand' in g.storyMatch)&&g.handKnowledge.every(memory=>memory.size===0));assert(CARDS.every(card=>g.cardAbilityEnabled(card.id)===(['sdm','hakugyokurou','hourai','mountain'].includes(card.faction)&&!card.shopExpansion)));
    const stock=[...a,...b,...g.drawPile];assert.equal(stock.length,36);assert.equal(new Set(stock).size,36);const absent=storyFactionCards('mountain').filter(id=>!a.includes(id)&&!b.includes(id)),next=g.drawPile.slice(-5).reverse();assert(absent.every(id=>next.includes(id)));absent.forEach(id=>positions.add(next.indexOf(id)+1));hands.add(a.slice().sort().join(','));rivals.add(b.slice().sort().join(','));
  }
  ok(hands.size>480&&rivals.size>480&&positions.size===5,'512 private six-card Mountain deals preserve stock, all constraints, cumulative unlocks and varied next-five reserve positions');
  ok(game.shopTiles.length===0&&game.allTiles().length===16,'A story table has no hidden shop tiles that could create phantom human actions or prevent stalemate');
  const rng=Math.random;for(const value of [0,.99999]){make();Math.random=()=>value;try{configureStoryMatch(game,5);assert(game.players[0].hand.includes('mtn_kanako'));assert(game.players.every(p=>p.hand.length===6));}finally{Math.random=rng;}}ok(true,'The constrained fifth-chapter deal terminates even under constant randomness');
  make(5,1,1);arrange({hands:[[],['reimu']]});assert.equal((await aiDecideAction(1)).type,'draw');game.storyMatch.mountainPlaced=storyFactionCards('mountain');assert.equal((await aiDecideAction(1)).type,'place');
  ok(true,'The fifth-chapter AI delays through legal shared draws until all core Mountain cards have appeared');
  make(5,1,1);arrange({hands:[['reimu'],['hourai_mokou']],discards:[[],['temple_shou','temple_murasa']]});assert.equal((await aiDecideAction(1)).cardId,'hourai_mokou');await realAction(1);
  ok(game.isOnBoard('hourai_mokou')&&game.players[1].hand.length===2,'A useful unlocked skill takes precedence over fifth-chapter delay');
  make(5,1,1);arrange({hands:[[],['reimu']],emptyPile:true});await realAction(1);ok(game.isOnBoard('reimu'),'The fifth-chapter AI still makes a mandatory legal placement instead of strategically passing');

  for(const id of storyFactionCards('mountain'))for(const allPlaced of [false,true]){
    make(5,1,1);arrange({hands:[['reimu'],['hourai_mokou',id]],discards:[[],['temple_shou','temple_murasa']]});
    if(allPlaced)game.storyMatch.mountainPlaced=storyFactionCards('mountain');
    const before=JSON.stringify(captureAIEvaluationSnapshot(game)),action=await aiDecideAction(1);
    assert.equal(action.type,'place');assert.equal(action.cardId,id);assert(game.emptyOrWastelandForCard(CARD[id],1).some(cell=>cell.r===action.r&&cell.c===action.c));
    assert.equal(JSON.stringify(captureAIEvaluationSnapshot(game)),before);await realAction(1);evalConservation(game);
    ok(game.isOnBoard(id)&&!game.players[1].hand.includes(id),'Chapter five immediately plays '+id+' ahead of a useful Mokou skill and available shared draw; all Mountain cards previously seen: '+allPlaced);
  }
  make(5,1,1);arrange({hands:[[],['reimu']]});game.drawPile=game.drawPile.filter(id=>id!=='mtn_aya').concat('mtn_aya');game.drawForEveryone(1);
  const drawnAction=await aiDecideAction(1);ok(drawnAction.type==='place'&&drawnAction.cardId==='mtn_aya','A newly acquired Mountain card is played at the next action opportunity without waiting for reserve age');evalConservation(game);
  make(5,1,1);arrange({hands:[[],['mtn_suwako','hourai_mokou']]});game.wasteland=game.wasteland.map(row=>row.map(()=>true));
  ok((await aiDecideAction(1)).type==='draw','An unplayable Suwako does not force an illegal wasteland placement or block a legal shared draw');
  make(5,1,1);arrange({hands:[[],['mtn_kanako','hourai_mokou']],board:[[0,0,'mtn_suwako']]});game.wasteland=game.wasteland.map(row=>row.map(()=>true));
  const wasteAction=await aiDecideAction(1);assert.equal(wasteAction.cardId,'mtn_kanako');await realAction(1);evalConservation(game);
  ok(game.isOnBoard('mtn_kanako'),'An active Suwako lets the immediate Mountain policy use a real legal wasteland landing');
  make(5,1,1);arrange({hands:[[],['mtn_aya']]});game.placementBlockedForTurn[1]=true;
  ok((await aiDecideAction(1)).type==='draw'&&game.players[1].hand.includes('mtn_aya'),'The new priority still respects an existing placement blockade');
  make(5,1,1);arrange({hands:[[],['mtn_kanako','mtn_aya']]});game.wasteland=game.wasteland.map(row=>row.map(()=>true));game.wasteland[1][1]=false;
  const multiple=await aiDecideAction(1);ok(multiple.type==='place'&&CARD[multiple.cardId].faction==='mountain'&&multiple.r===1&&multiple.c===1,'Multiple held Mountain cards still select a legal landing when space is limited');
  make(5,1,1);arrange({hands:[['marisa'],['mtn_suwako','reimu']]});game.forcedPlay[1]='reimu';await realAction(1);evalConservation(game);
  ok(game.isOnBoard('reimu')&&game.players[1].hand.includes('mtn_suwako'),'A mandatory Reisen command still resolves before the voluntary Mountain priority');
  make(4,1,1);arrange({hands:[[],['mtn_aya','hourai_mokou']],discards:[[],['temple_shou','temple_murasa']]});
  ok((await aiDecideAction(1)).cardId==='hourai_mokou','The immediate Mountain rule is confined to chapter five and does not change chapter four');

  make();arrange({hands:[['sdm_patchouli'],['marisa']]});game.choosePlayer=async()=>1;game.ui.promptText=async()=>CARD.marisa.name;await place('sdm_patchouli');ok(!game.storyMatch.progress.newsGuess,'A correct guess before reading a newspaper cannot earn the newspaper goal');
  game.addNewspaper(0,[{targetIdx:1,player:'AI 1',cardIds:[],names:{}}],'Later');ok(!game.storyMatch.progress.newsGuess,'Reading a report later does not retroactively credit an earlier correct guess');
  make();arrange({hands:[['sdm_patchouli','reimu'],['marisa']]});const paidReport=game.addNewspaper(1,[{targetIdx:0,player:'You',cardIds:['sdm_patchouli'],names:{}}],'Paid');assert(game.subscribeNews(0,paidReport.paperId,'reimu'));game.choosePlayer=async()=>1;game.ui.promptText=async()=>CARD.marisa.name;await place('sdm_patchouli');
  ok(game.storyMatch.progress.newsGuess&&game.storyMatch.readPapers.includes(paidReport.paperId),'Reading a paid opponent report before a real correct guess still earns the newspaper objective');
  make();arrange({hands:[['sdm_patchouli','reimu'],['marisa']]});const hiddenPaper=game.addNewspaper(1,[{targetIdx:0,player:'You',cardIds:['sdm_patchouli'],names:{}}],'Test');
  ok(!game.recordStoryNewspaperSubscription(0,hiddenPaper.paperId)&&!game.recordStoryNewspaperSubscription(0,999),'Folded unsubscribed papers and invalid paper IDs cannot count as subscription');
  game.recordStoryCorrectGuess(0,1,'marisa');ok(!game.storyMatch.progress.newsGuess&&!game.recordStoryNewspaperRead(0,hiddenPaper.paperId),'A folded unread opponent newspaper does not qualify, even with a correct guess');
  const own=game.addNewspaper(0,[{targetIdx:1,player:'AI 1',cardIds:['marisa'],names:{}}],'Test');assert(!game.recordStoryNewspaperSubscription(0,own.paperId));assert(!game.subscribeNews(0,hiddenPaper.paperId,'missing'));
  ok(game.storyMatch.subscribedPapers.length===0&&game.storyMatch.readPapers.includes(own.paperId),'Producing one’s own readable paper counts as reading without becoming a paid subscription');
  assert(game.subscribeNews(0,hiddenPaper.paperId,'reimu'));assert(game.storyMatch.subscribedPapers.includes(hiddenPaper.paperId));game.choosePlayer=async()=>1;game.ui.promptText=async()=> 'wrong';await place('sdm_patchouli');
  ok(!game.storyMatch.progress.newsGuess,'A paid subscription followed by a wrong guess cannot earn the guess star');

  // A prepared legal mid-game route. No objective flags or result scores are forged.
  make();const board=[[0,0,'mtn_kanako'],[0,1,'mtn_suwako'],[1,0,'mtn_sanae'],[3,0,'sdm_remilia'],[3,1,'sdm_flandre'],[3,2,'sdm_sakuya'],[0,2,'hourai_kaguya'],[0,3,'hourai_eirin'],[1,2,'hourai_reisen'],[1,3,'palace_satori'],[2,0,'palace_rin'],[2,1,'palace_utsuho'],[2,2,'hell_eiki'],[2,3,'hell_komachi'],[3,3,'hell_clownpiece']];
  arrange({hands:[['mtn_aya','sdm_patchouli','haku_yuyuko','reimu','yuuka','medicine'],['marisa','haku_youmu','hourai_mokou','hell_hecatia','palace_koishi','sage_yukari']],board,discards:[[],['temple_shou','temple_murasa','temple_nue']]});
  game.storyMatch.mountainPlaced=['mtn_kanako','mtn_suwako','mtn_sanae'];await place('mtn_aya');
  ok(game.storyMatch.progress.mountain&&game.winCount(game.players[0])===4&&game.paperReports.length===1&&game.storyMatch.readPapers.length===1&&!game.storyMatch.progress.newsGuess,'Aya’s real placement publishes its readable reports and collects Mountain, while still requiring a later correct guess');
  game.choosePlayer=async()=>1;game.ui.promptText=async()=>CARD.marisa.name;await place('sdm_patchouli',0,0,0);
  ok(game.storyMatch.progress.newsGuess&&game.players[0].hand.includes('marisa')&&game.storyMatch.subscribedPapers.length===0,'Reading Aya’s own newspaper followed by a real correct Patchouli guess earns the goal without payment');
  await place('haku_yuyuko',0,0,1);await place('reimu',0,1,0);await place('yuuka',0,1,1);assert.equal(game.boardCells().length,16);assert.equal(game.winCount(game.players[0]),4);game.players[0].isAI=true;stuckStreak=0;
  const closedPile=game.drawPile.slice(),closedHands=game.players.map(p=>p.hand.slice());let turns=0;while(!game.winner&&!game.stalemateMessage&&turns++<16)await actualMountainTurn();assert.equal(turns,1);assert.deepEqual(game.drawPile,closedPile);assert.deepEqual(game.players.map(p=>p.hand),closedHands);
  ok(game.winner?.idx===0&&game.storyMatch.progress.stalemate&&game.stalemateMessage&&storyMatchStars(game)===3,'The actual turn loop directly awards a three-star 4–3 story stalemate on the first closed-board check, preserving the remaining deck and both hands');evalConservation(game);
  storyState={chapter:5,practice:game,complete:false,savedStars:null,cancel(){}};updateStoryProgress();
  ok(storyBestStars(5)===3&&storyChapterPerfect(5)&&el('tutorial-feedback').classList.contains('story-perfect'),'The same real route saves every objective and its perfect menu rating and colors the three stars earned in this match');returnToMainMenu();
  for(const aiLead of [false,true]){make();arrange({hands:[['reimu'],['marisa']],discards:[[],aiLead?['temple_shou']:[]],emptyPile:true});game.wasteland=game.wasteland.map(row=>row.map(()=>true));endStalemate();ok(game.storyMatch.progress.stalemate&&(aiLead?game.winner?.idx===1:game.winner===null)&&!storyMatchComplete(game),'Actual tied or opponent-led stalemates record the goal but do not invent a player victory: '+aiLead+' '+JSON.stringify({actions:game.players.map(p=>canAct(p.idx)),progress:game.storyMatch.progress,winner:game.winner?.idx,score:game.players.map(p=>game.winCount(p)),spaces:game.players.map(p=>p.hand.map(id=>[id,game.emptyOrWastelandForCard(CARD[id],p.idx)])),draw:game.players.map(p=>game.canDrawNormally(p.idx))}));}
  make();arrange({hands:[['reimu'],['marisa']]});endStalemate();ok(!game.storyMatch.progress.stalemate,'An incorrect early end-stalemate call cannot award the no-legal-action objective');
  for(let seed=0;seed<4;seed++){
    make(5,'mountain-live-'+seed,seed%2);game.players[0].isAI=true;const match=game;let turns=0,idle=0;
    while(!match.winner&&!match.stalemateMessage&&turns++<180){const p=match.currentPlayerIdx;match.beginPlayerTurn(p);match.tradedThisTurn[p]=false;if(!canAct(p)){if(++idle>=2)endStalemate();else advanceTurn();continue;}idle=0;const action=await aiDecideAction(p);assert(action.type!=='pass');const flags=await realAction(p);await afterAction(p,flags,match.takeScheduledExtraTurns(p));evalConservation(match);}
    assert((match.winner||match.stalemateMessage)&&turns<180);productionMatches.push({seed,turns,winner:match.winner?.idx??null,stalemate:!!match.stalemateMessage,points:match.players.map(p=>match.winCount(p)),progress:{...match.storyMatch.progress}});
  }
  ok(true,'Four complete random Mountain matches terminate without errors, strategic passes, conservation failures or turn-limit aborts');
  returnToMainMenu();openStoryMenu();showStoryChapterIntro(5);ok(el('story-card-grid').children.length===4&&el('story-levels').hidden,'The fifth chapter introduces four new core cards');el('story-begin').events.click();game.winner=game.players[0];updateStoryProgress();el('restart-btn').events.click();ok(game===null&&storyMenuChapter===6&&el('story-card-grid').children.length===3,'Clearing the fifth chapter opens the three-card Kourindou introduction');
  return {status:'pass',count:checks.length,checks,randomOpenings:512,productionMatches,rulesVersion:REWORK_RULES_VERSION,scope:'Actual goal unions and legacy migration, single-run colors and reset, Suwako original/copy/muting rules, constrained private fifth-chapter deals, real skill and subscription chronology, a complete prepared legal endgame route through the real turn loop, four random matches and controlled chapter lifecycle.'};
})()`,ctx).then(result=>{
  // Actual newspaper, translated card and story-menu renderers in the established DOM fixture.
  // These checks verify events and markup, not browser painting or phone pixels.
  const material=fs.readFileSync(__dirname+'/card-materials-2026-10-12.cjs','utf8'),end="const copy='created_card_910'",box={module:{exports:{}},require,__dirname,console};
  vm.runInNewContext(material.slice(0,material.indexOf(end))+'\nmodule.exports={ctx,A,el,documentListeners};',box);
  const {ctx:render,A,el,documentListeners}=box.module.exports,ok=(value,name)=>{assert(value,name);result.checks.push(name);};
  vm.runInContext(html.slice(html.indexOf('function newspaperHtml('),html.indexOf('function renderLog(')),render);
  const g=new A.Game(2,{},null,{aiOnly:true,fastTest:true});A.setGame(g);g.players[0].isAI=false;g.currentPlayerIdx=0;
  vm.runInContext('configureStoryMatch(game,5);',render);
  const paper=g.addNewspaper(0,[{targetIdx:1,player:'AI 1',cardIds:g.players[1].hand.slice(),names:{}}],'Special Edition');
  render.paper=paper;
  let markup=vm.runInContext('newspaperHtml(paper)',render);
  ok(markup.includes('news-masthead')&&markup.includes('文々。新聞')&&markup.includes('news-story')&&!markup.includes('<details')&&g.storyMatch.subscribedPapers.length===0,'An owner newspaper displays reports directly with its newspaper layout and does not count as a paid subscription');
  const rival=g.addNewspaper(1,[{targetIdx:0,player:'You',cardIds:g.players[0].hand.slice(),names:{}}],'Special Edition');render.paper=rival;
  markup=vm.runInContext('newspaperHtml(paper)',render);
  ok(markup.includes('news-folded')&&markup.includes('data-subscribe-paper')&&!markup.includes('news-story-heading'),'An unsubscribed rival newspaper retains its folded cover and paid subscription control');
  const payment=g.players[0].hand[0];assert(g.subscribeNews(0,rival.paperId,payment));assert(g.players[1].hand.includes(payment));
  markup=vm.runInContext('newspaperHtml(paper)',render);
  ok(g.storyMatch.subscribedPapers.includes(rival.paperId)&&markup.includes('news-story-heading')&&!markup.includes('<details'),'Real payment immediately records subscription and displays its reports without an extra expansion action');
  ok(!html.includes('data-story-read-paper')&&!html.includes('news-reader'),'The redundant newspaper reader and toggle mechanism have been removed');
  for(const language of ['en','zh-CN']){
    A.setLanguage(language);A.openCardDetails('mtn_suwako');const suwako=el('card-detail-description').innerHTML.replace(/<[^>]*>/g,'');A.closeCardDetails();
    A.openCardDetails('mtn_kanako');const kanako=el('card-detail-description').innerHTML.replace(/<[^>]*>/g,'');A.closeCardDetails();
    ok(language==='en'?suwako.includes('all ')&&suwako.includes('cards can be placed on wasteland')&&!kanako.includes('This card can be placed on wasteland'):suwako.includes('所有')&&suwako.includes('都可以放在荒地上')&&!kanako.includes('此卡可以放在荒地上'),'The actual '+language+' detail renderer shows Suwako’s shared aura and Kanako’s removed permission');
  }
  A.setGame(null);const saved=new Map();render.window.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
  render.online=null;render.closeAITestDashboard=()=>{};render.updateAITestControls=()=>{};render.runNextTurn=()=>{};render.queueMobileViewport=()=>{};render.window.scrollTo=()=>{};
  vm.runInContext(html.slice(html.indexOf('let titleCardDrag='),html.indexOf('function drawTitlePreviewCards('))+html.slice(html.indexOf('function tableCardBounds('),html.indexOf('function setTitleCardFace(')),render);
  vm.runInContext(html.slice(html.indexOf('/* Guided practice uses'),html.indexOf('/* CSS lays out the phone table')),render);
  vm.runInContext("saveStoryStars(5,['mountain']);saveStoryStars(5,['stalemate']);saveStoryStars(5,['newsGuess']);openStoryMenu();",render);
  let rating=el('story-levels').children[4].children[2].children[1];
  ok(rating.textContent.trim()==='★★★'&&!rating.classList.contains('story-stars-perfect'),'The actual menu renders three cumulatively collected stars without a single-run color');
  vm.runInContext('saveStoryStars(5,STORY_GOAL_KEYS[5]);openStoryMenu();',render);rating=el('story-levels').children[4].children[2].children[1];
  ok(rating.classList.contains('story-stars-perfect')&&rating.values.get('--story-star-color')===vm.runInContext('FACTIONS.mountain.color',render),'A single-run perfect record applies the real Mountain color custom property to the menu rating');
  result.count=result.checks.length;result.scope+=' Actual newspaper subscription and direct-report rendering, bilingual card details and faction-color menu style are also checked with a controlled DOM; browser pixels are not verified.';
  fs.writeFileSync(__dirname+'/story-mountain-collection-2026-10-16-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' Mountain, cumulative-star and real-stalemate checks passed');
}).catch(error=>{console.error(error.stack);process.exitCode=1;});
