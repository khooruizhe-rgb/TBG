const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
const fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{';
const bootstrap={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,storage};',bootstrap);
const {ctx,storage}=bootstrap.module.exports;ctx.testStorage=storage;
const turnSource=html.slice(html.indexOf('async function runNextTurn(){'),html.indexOf('\n/* Wire human hand-card'));
vm.runInContext(turnSource.replace('async function runNextTurn(){','async function actualStoryRunNextTurn(){'),ctx);
vm.runInContext(`(async()=>{
  const checks=[],walkthroughs=[],productionMatches=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
  const realAction=doPlayerAction,definitions=JSON.stringify(CARDS);
  function make(chapter=4,seed=1,actor=0){
    evalResetTokens();evalSetSeed(seed);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard'});
    game.currentPlayerIdx=actor;game.players[0].isAI=false;configureStoryMatch(game,chapter);
    game.ui.pickOwnHandCards=async()=>null;game.ui.pickCell=async(t,cells)=>cells[0];game.ui.promptText=async()=>null;
    game.pickUI=async(p,method,args)=>game.ui[method]?.(...args);game.confirm=async()=>false;return game;
  }
  function arrange({hands=[[],[]],board=[],discards=[[],[]],emptyPile=false}={}){
    game.board=Array.from({length:SIZE},()=>Array(SIZE).fill(null));game.wasteland=Array.from({length:SIZE},()=>Array(SIZE).fill(false));
    game.players.forEach((player,index)=>{player.hand=hands[index].slice();player.discard=discards[index].slice();});
    for(const[r,c,id]of board)game.setCardAt(r,c,id);
    const used=[...hands.flat(),...discards.flat(),...board.map(cell=>cell[2])];assert.equal(new Set(used).size,used.length);
    game.drawPile=emptyPile?[]:shuffle(CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion&&!used.includes(card.id)).map(card=>card.id));
    game.startingCardIds=new Set([...used,...game.drawPile]);game.handKnowledge=game.players.map(()=>new Map());game.reserveAges=game.players.map(()=>({}));
    game.winner=null;game.stalemateMessage='';game.logLines=[];
  }
  function inventory(){return [...game.drawPile,...game.mainBoardCells().map(cell=>game.cardAt(cell.r,cell.c)),...game.players.flatMap(p=>[...p.hand,...p.discard])];}
  async function place(id,p=0,r=0,c=0){assert(game.players[p].hand.includes(id));game.removeFromHand(p,id);return game.internalPlace(id,r,c,p,0);}
  function guessReisen(){game.confirm=async()=>true;game.choosePlayer=async()=>1;game.guessCardName=async(p,ids)=>ids.includes('hourai_reisen')?'hourai_reisen':null;game.chooseHandCard=async()=>null;game.chooseCell=async()=>({r:1,c:0});}
  const humanHands=new Set(),rivalHands=new Set(),positions=new Set(),actors=new Set();
  for(let seed=0;seed<512;seed++){
    const g=make(4,seed,seed%2),human=g.players[0].hand,rival=g.players[1].hand;actors.add(g.currentPlayerIdx);
    assert(g.players.every(p=>p.hand.length===6));assert(human.includes('hourai_kaguya'));assert(human.filter(id=>CARD[id].faction==='hourai').length>=2);
    assert(rival.includes('haku_yuyuko'));assert.equal(rival.filter(id=>CARD[id].faction==='sdm').length,1);assert.equal(rival.filter(id=>CARD[id].faction==='hourai').length,1);
    const ids=inventory();assert.equal(ids.length,36);assert.equal(new Set(ids).size,36);assert(ids.every(id=>g.startingCardIds.has(id)));
    assert(CARDS.every(card=>g.cardAbilityEnabled(card.id)===(['sdm','hakugyokurou','hourai'].includes(card.faction)&&!card.shopExpansion)));
    assert(g.handKnowledge.every(memory=>memory.size===0));assert(!('openingHand' in g.storyMatch));
    const absent=storyFactionCards('hourai').filter(id=>!human.includes(id)&&!rival.includes(id)),draws=Array.from({length:5},()=>g.takeFromDrawPile(0));
    assert(absent.every(id=>draws.includes(id)));absent.forEach(id=>positions.add(draws.indexOf(id)+1));
    humanHands.add(human.slice().sort().join(','));rivalHands.add(rival.slice().sort().join(','));
  }
  ok(humanHands.size>480&&rivalHands.size>480,'512 real Eientei deals keep both six-card hands random with all required originals');
  ok(positions.size===5&&actors.size===2,'Undealt Eientei appears within the next five actual draws and both first actors remain possible');
  ok(true,'All 512 deals conserve 36 unique cards, keep both opening hands private and unlock exactly three factions');
  const random=Math.random;
  for(const value of [0,.999999]){make();Math.random=()=>value;try{configureStoryMatch(game,4);assert(game.players.every(p=>p.hand.length===6));assert(game.players[0].hand.includes('hourai_kaguya'));assert(game.players[1].hand.includes('haku_yuyuko'));assert.equal(new Set(inventory()).size,36);}finally{Math.random=random;}}
  ok(true,'Constrained dealing terminates without duplicate or missing cards even with constant randomness');

  for(const chapter of [2,3]){
    make(chapter,1,1);arrange({hands:[[],['sdm_sakuya','hourai_mokou']],emptyPile:true});
    assert.equal((await aiDecideAction(1)).cardId,chapter===2?'hourai_mokou':'sdm_sakuya');
  }
  ok(true,'Only chapter two restores the older Mansion holding strategy');
  for(let age=1;age<=4;age++){
    make(2,age,1);arrange({hands:[[],['sdm_patchouli','hourai_mokou']],emptyPile:true});game.reserveAges[1].sdm_patchouli=age;
    assert.equal(!!aiStoryPlacement(1,'sdm_patchouli',game.emptyCells(1)),age>3);
  }
  ok(true,'Chapter two holds Mansion cards through the first three turns and admits them from the fourth');
  make(2,0,1);arrange({hands:[['sdm_remilia'],['sdm_flandre']],emptyPile:true});assert.equal((await aiDecideAction(1)).cardId,'sdm_flandre');
  ok(true,'The holding preference still yields to the mandatory legal-action rule');
  for(const board of [[],[[1,1,'haku_yuyuko']]]){
    make(3,1,1);arrange({hands:[['sdm_flandre'],['haku_youmu','sdm_remilia']],board});game.revealHand(0,game.players[0].hand,[1]);
    let calls=0;const before=JSON.stringify(captureAIEvaluationSnapshot(game)),metrics=JSON.stringify(game.testMetrics);Math.random=()=>{calls++;throw Error('Planning must remain pure');};
    let action;try{action=await aiDecideAction(1);}finally{Math.random=random;}
    assert.equal(action.cardId,'haku_youmu');assert.equal(calls,0);assert.equal(before,JSON.stringify(captureAIEvaluationSnapshot(game)));assert.equal(metrics,JSON.stringify(game.testMetrics));
    await realAction(1);assert(game.logLines.some(line=>line.includes('places Youmu')));
    if(board.length)assert.equal(game.winCount(game.players[1]),2);
  }
  ok(true,'Chapter-three Youmu immediately outranks drawing, Remilia and protected Hakugyokurou claims, with pure planning and real execution');
  make(3,1,1);arrange({hands:[[],['haku_youmu','hourai_mokou']]});game.placementBlockedForTurn[1]=true;
  assert.equal((await aiDecideAction(1)).type,'draw');game.placementBlockedForTurn[1]=false;game.wasteland=game.wasteland.map(row=>row.map(()=>true));
  assert.equal((await aiDecideAction(1)).type,'draw');ok(true,'Immediate Youmu still respects actual placement blocks and terrain');

  make(4,1,1);arrange({hands:[['reimu'],['hourai_mokou','sage_ran']],discards:[[],['yuuka','medicine']]});
  const planBefore=JSON.stringify(captureAIEvaluationSnapshot(game)),metricsBefore=JSON.stringify(game.testMetrics);Math.random=()=>{throw Error('Chapter-four planning must remain pure');};let action;
  try{action=await aiDecideAction(1);}finally{Math.random=random;}
  assert.equal(action.cardId,'hourai_mokou');assert.equal(planBefore,JSON.stringify(captureAIEvaluationSnapshot(game)));assert.equal(metricsBefore,JSON.stringify(game.testMetrics));
  await realAction(1);ok(game.players[1].hand.length===3&&game.isOnBoard('hourai_mokou'),'Chapter four uses a normally useful unlocked ability before its delay draw');
  make(4,1,1);arrange({hands:[[],['reimu','sage_ran']]});assert.equal((await aiDecideAction(1)).type,'draw');
  game.storyMatch.houraiPlaced=storyFactionCards('hourai');assert.equal((await aiDecideAction(1)).type,'place');game.board=game.board.map(row=>row.map(()=>null));assert(storyEienteiAllPlaced(game));
  ok(true,'Chapter four delays with shared drawing when no useful active skill exists, then resumes placement after all four Eientei originals have appeared');
  make(4,1,1);arrange({hands:[[],['reimu']],emptyPile:true});await realAction(1);ok(game.isOnBoard('reimu'),'Chapter four never strategically passes when only a locked but legal card remains');

  make();arrange({hands:[['hourai_kaguya'],[]],board:[[0,1,'hourai_eirin'],[1,1,'hourai_mokou'],[1,0,'hourai_reisen']]});await place('hourai_kaguya');
  ok(game.storyMatch.progress.hourai&&game.storyMatch.progress.kaguya&&game.winCount(game.players[0])===4,'Kaguya earns both faction and four-point stars through the collection caused by her own placement');evalConservation(game);
  make();arrange({hands:[['hourai_kaguya'],['hourai_reisen']],board:[[0,1,'hourai_eirin'],[1,1,'hourai_mokou']]});guessReisen();await place('hourai_kaguya');
  ok(game.storyMatch.progress.hourai&&game.storyMatch.progress.kaguya&&game.winCount(game.players[0])===4,'Kaguya includes points from a correctly guessed card’s nested placement and collection');evalConservation(game);
  make();arrange({hands:[['hourai_kaguya'],[]],board:[[2,2,'haku_yuyuko'],[2,3,'haku_youmu']],discards:[['yuuka','medicine'],[]]});await place('hourai_kaguya');
  ok(game.winCount(game.players[0])===4&&!game.storyMatch.progress.kaguya,'Two new points added to two old points do not satisfy Kaguya’s four-point placement goal');
  make();arrange({hands:[['hourai_kaguya','hourai_reisen'],[]],board:[[0,1,'hourai_eirin'],[1,1,'hourai_mokou']]});await place('hourai_kaguya');await place('hourai_reisen',0,1,0);
  ok(game.storyMatch.progress.hourai&&!game.storyMatch.progress.kaguya,'A later separate placement can collect Eientei without retroactively completing Kaguya’s earlier goal');
  make();arrange({hands:[[],['hourai_kaguya']],board:[[0,1,'hourai_eirin'],[1,1,'hourai_mokou'],[1,0,'hourai_reisen']]});game.players[1].isAI=false;await place('hourai_kaguya',1);
  ok(game.winCount(game.players[1])===4&&!game.storyMatch.progress.hourai&&!game.storyMatch.progress.kaguya,'An opponent’s Eientei collection never grants the player either placement star');
  make();arrange({hands:[['hourai_mokou','hourai_kaguya','mtn_sanae','sage_ran','temple_shou','reimu'],[]],discards:[['sdm_patchouli','sdm_flandre','yuuka','medicine','marisa'],[]]});await place('hourai_mokou');
  ok(game.players[0].hand.length===10&&game.storyMatch.progress.handTen,'The actual Mokou ability can exceed the normal draw limit and latch the ten-card goal');
  const spent=game.players[0].hand.find(id=>id!=='hourai_kaguya');game.removeFromHand(0,spent);game.drawPile.push(spent);ok(game.players[0].hand.length===9&&game.storyMatch.progress.handTen,'Spending a card after reaching ten preserves the earned objective');evalConservation(game);
  make();const stock=CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion).map(card=>card.id);arrange({hands:[stock.slice(0,9),stock.slice(9,18)]});
  game.addToHand(1,game.takeFromDrawPile(1));assert.equal(game.players[1].hand.length,10);assert(!game.storyMatch.progress.handTen);
  game.addToHand(0,game.takeFromDrawPile(0));ok(game.storyMatch.progress.handTen,'The ten-card objective tracks the player’s actual hand, never the opponent’s peak');evalConservation(game);
  make();arrange({hands:[stock.slice(0,9),[]]});const beforePreview=JSON.stringify(captureAIEvaluationSnapshot(game)),previewMetrics=JSON.stringify(game.testMetrics);
  aiEvaluateCard(0,'hourai_eirin');ok(beforePreview===JSON.stringify(captureAIEvaluationSnapshot(game))&&previewMetrics===JSON.stringify(game.testMetrics)&&!game.storyMatch.progress.handTen,'AI creation previews cannot falsely complete the player’s ten-card objective');
  game.pickUI=async(p,method,args)=>args[1][0];const copy=await game.createCard(0,storyFactionCards('hourai'),{double:true,excludeBaseId:'hourai_eirin'});
  ok(CARD[copy].createdCopy&&game.players[0].hand.length===10&&game.storyMatch.progress.handTen,'A real created card also counts toward the ten-card hand objective');evalConservation(game);

  // A real mid-match route: five existing discard points, Mokou grows the hand, then Kaguya collects four.
  for(let seed=0;seed<16;seed++){
    make(4,seed);arrange({hands:[['hourai_mokou','hourai_kaguya','mtn_sanae','sage_ran','temple_shou','reimu'],['hourai_reisen']],board:[[0,1,'hourai_eirin']],discards:[['sdm_patchouli','sdm_flandre','yuuka','medicine','marisa'],[]]});
    await place('hourai_mokou',0,1,1);assert.equal(game.players[0].hand.length,10);guessReisen();await place('hourai_kaguya');
    assert(storyMatchComplete(game));assert.equal(storyMatchStars(game),3);evalConservation(game);
    walkthroughs.push({seed,points:game.players.map(p=>game.winCount(p)),progress:{...game.storyMatch.progress}});
  }
  ok(true,'Sixteen legal mid-match Mokou–Kaguya routes win with all three independent Eientei stars and conserve every original');
  for(let mask=0;mask<8;mask++){
    make();game.storyMatch.progress={hourai:!!(mask&1),kaguya:!!(mask&2),handTen:!!(mask&4)};game.winner=game.players[0];
    assert(storyMatchComplete(game));assert.equal(storyMatchStars(game),[1,2,4].filter(bit=>mask&bit).length);assert.equal(storyStarGoals(game).length,3);
    game.winner=game.players[1];assert(!storyMatchComplete(game));assert.equal(storyMatchStars(game),0);
  }
  ok(true,'All eight star combinations remain independent of winning, and losing grants no clear or stars');

  // Execute complete random matches with the real story opponent, not scripted opponent moves.
  for(let seed=0;seed<6;seed++){
    make(4,'eientei-live-'+seed,seed%2);game.players[0].isAI=true;const match=game;let turns=0;
    while(!match.winner&&!match.stalemateMessage&&turns++<180){
      const p=match.currentPlayerIdx;match.beginPlayerTurn(p);match.tradedThisTurn[p]=false;
      if(!canAct(p)){stuckStreak++;if(stuckStreak>=2)endStalemate();else advanceTurn();continue;}stuckStreak=0;
      if(p===1&&!match.forcedPlay[p]){const planned=await aiDecideAction(p);assert(planned.type!=='pass'||!canAct(p));}
      const flags=await realAction(p);await afterAction(p,flags,match.takeScheduledExtraTurns(p));evalConservation(match);
    }
    assert((match.winner||match.stalemateMessage)&&turns<180);
    productionMatches.push({seed,turns,winner:match.winner?.idx??null,stalemate:!!match.stalemateMessage,points:match.players.map(p=>match.winCount(p)),progress:{...match.storyMatch.progress}});
  }
  ok(true,'Six complete random Eientei matches end without runtime errors, strategic passes, duplicate cards or a turn-limit abort');
  ok(JSON.stringify(CARDS)===definitions,'Story execution preserves original card blueprints');

  returnToMainMenu();testStorage.clear();const render=renderAll,loop=runNextTurn,frames=[];
  renderAll=()=>frames.push({phase:'paint',sizes:game.players.map(p=>p.hand.length),match:game});runNextTurn=async()=>frames.push({phase:'loop',sizes:game.players.map(p=>p.hand.length),match:game});
  let previous=null;
  for(let retry=0;retry<32;retry++){
    openStoryChapter(3);if(previous)assert(previous.cancelled);assert(game.players.every(p=>p.hand.length===6));previous=game;
    assert.equal(frames.at(-2).phase,'paint');assert.equal(frames.at(-1).phase,'loop');assert(frames.at(-2).sizes.every(n=>n===6));
  }
  renderAll=render;runNextTurn=loop;ok(true,'Thirty-two chapter-three retries immediately paint exactly six cards before starting one turn loop and cancel every retired match');
  returnToMainMenu();
  let drawGame=null;
  for(let seed=0;seed<64;seed++){make(2,seed,1);if((await aiDecideAction(1)).type==='draw'){drawGame=game;break;}}
  assert(drawGame);const beforeDraw=inventory().slice().sort().join(',');await actualStoryRunNextTurn();
  ok(drawGame.players.every(p=>p.hand.length===7)&&inventory().slice().sort().join(',')===beforeDraw&&drawGame.logLines.some(line=>line.includes('draws for 2')),'A genuine AI-first shared draw explains seven cards before the player acts, with no duplicate deal');
  let release;const gate=new Promise(resolve=>{release=resolve;});doPlayerAction=async()=>{await gate;return {};};
  make(3,2,1);const old=game,pending=actualStoryRunNextTurn();old.cancelled=true;make(3,3,0);const newGame=game,newSnapshot=JSON.stringify(captureAIEvaluationSnapshot(newGame));release();await pending;doPlayerAction=realAction;
  ok(game===newGame&&JSON.stringify(captureAIEvaluationSnapshot(newGame))===newSnapshot,'A retired asynchronous turn cannot advance, draw into or mutate the replacement match');
  let entered=false,releaseAction;const actionGate=new Promise(resolve=>{releaseAction=resolve;});doPlayerAction=async()=>{entered=true;await actionGate;return {};};
  make(3,4,1);const retiredActionGame=game,actionPending=actualStoryRunNextTurn();await Promise.resolve();assert(entered);retiredActionGame.cancelled=true;make(3,5,0);
  const afterRestart=JSON.stringify(captureAIEvaluationSnapshot(game));releaseAction();await actionPending;doPlayerAction=realAction;
  ok(JSON.stringify(captureAIEvaluationSnapshot(game))===afterRestart,'Restart during a pending action also prevents the old follow-up loop from advancing the new match');

  returnToMainMenu();testStorage.clear();saveStoryStars(2,3);saveStoryStars(3,2);saveStoryStars(4,1);testStorage.set('unrelated-setting','keep');openStoryMenu();
  assert.equal(el('story-levels').children.length,9);assert(!el('story-debug-reset').hidden);el('story-debug-reset').events.click();
  ok([2,3,4].every(chapter=>storyBestStars(chapter)===0)&&storyBestStars(1)===null&&storyClearedChapters().length===3&&testStorage.get('unrelated-setting')==='keep','The DEBUG button resets only earned star ratings, preserves clears and unrelated settings, and does not invent a chapter-one clear');
  saveStoryStars(4,3);ok(storyBestStars(4)===3,'Stars can be acquired again after a DEBUG reset');
  showStoryChapterIntro(4);ok(el('story-card-grid').children.length===4&&el('story-debug-reset').hidden,'Chapter four introduces four Eientei cards and hides the DEBUG control during its introduction');
  el('story-begin').events.click();ok(game.storyMatch.chapter===4&&game.players.every(p=>p.hand.length===6),'The chapter-four introduction launches a real constrained six-card deal');
  game.winner=game.players[0];updateStoryProgress();el('restart-btn').events.click();ok(game===null&&storyMenuChapter===5&&el('story-card-grid').children.length===4,'Finishing chapter four opens the Mountain introduction');
  returnToMainMenu();
  return {status:'pass',count:checks.length,checks,randomOpenings:512,walkthroughs,productionMatches,rulesVersion:REWORK_RULES_VERSION,scope:'Real constrained deals, actual skills, nested placement/claim ownership, independent stars, six random full matches, mandatory legal actions, pure planning, real turn cancellation and controlled UI restart/debug lifecycle. No browser pixel verification.'};
})()`,ctx).then(async result=>{
  // Use the shipped sleep implementation with a controlled clock, independently of the fast worker override.
  const timers=new Map();let serial=0;const clock=vm.createContext({setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id)});
  vm.runInContext(html.slice(html.indexOf('const matchSleepWaiters='),html.indexOf('\nfunction romanNumeral'))+'\nvar game=null;',clock);
  await vm.runInContext(`(async()=>{game={};const old=game;let resolved=0;const wait=sleep(1000).then(()=>resolved++);game={};const current=game;let live=0;const next=sleep(1000).then(()=>live++);old.cancelled=true;cancelMatchSleeps(old);await wait;await Promise.resolve();if(resolved!==1||live!==0)throw Error('Cancellation crossed match ownership');cancelMatchSleeps(current);await next;if(live!==1)throw Error('Live wait did not resolve');})()`,clock);
  assert.equal(timers.size,0);assert(html.includes('if(game){game.cancelled=true;cancelMatchSleeps(game);}'));
  result.checks.push('Cancelling retired-match animation/turn waits releases their timers immediately without touching the next match');result.count=result.checks.length;
  fs.writeFileSync(__dirname+'/story-eientei-2026-10-16-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' Eientei, mentor rollback and restart checks passed');
}).catch(error=>{console.error(error.stack);process.exitCode=1;});
