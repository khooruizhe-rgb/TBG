const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{';
assert(fixture.includes(marker));const box={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,storage};',box);
const {ctx,storage}=box.module.exports;ctx.testStorage=storage;
vm.runInContext(`(async()=>{
  const checks=[],mixedPlacements=[],ok=(value,name)=>{assert(value,name);checks.push(name);},originalAction=doPlayerAction;
  function make(chapter=3,seed=1){
    evalResetTokens();evalSetSeed(seed);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard',kourindouEnabled:false});configureStoryMatch(game,chapter);
    game.players[0].isAI=false;game.currentPlayerIdx=1;game.ui.pickOwnHandCards=async()=>null;game.ui.promptText=async()=>null;game.ui.pickCell=async(t,cells)=>cells[0];
    game.pickUI=async(p,method,args)=>game.ui[method](...args);return game;
  }
  function arrange({hands=[[],[]],board=[],discards=[[],[]],emptyPile=false}={}){
    game.board=Array.from({length:SIZE},()=>Array(SIZE).fill(null));game.wasteland=Array.from({length:SIZE},()=>Array(SIZE).fill(false));
    game.players.forEach((player,index)=>{player.hand=hands[index].slice();player.discard=discards[index].slice();});
    for(const[r,c,id]of board)game.setCardAt(r,c,id);const used=[...hands.flat(),...board.map(cell=>cell[2]),...discards.flat()];assert.equal(new Set(used).size,used.length);
    game.drawPile=emptyPile?[]:shuffle(CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion&&!used.includes(card.id)).map(card=>card.id));
    game.startingCardIds=new Set([...used,...game.drawPile]);game.handKnowledge=game.players.map(()=>new Map());
    game.reserveAges=game.players.map(()=>({}));game.winner=null;game.logLines=[];
  }
  async function place(id,p=0,r=1,c=1){assert(game.players[p].hand.includes(id));game.removeFromHand(p,id);return game.internalPlace(id,r,c,p,0);}
  for(const chapter of [2,3])for(let mask=0;mask<8;mask++){
    make(chapter);game.storyMatch.progress=chapter===2?{sdm:!!(mask&1),remilia:!!(mask&2),flandre:!!(mask&4)}:{haku:!!(mask&1),yuyuko:!!(mask&2)};
    if(chapter===3)game.storyMatch.opponentReachedFour=!(mask&4);
    game.winner=game.players[0];const stars=[1,2,4].filter(bit=>mask&bit).length;
    ok(storyMatchComplete(game)&&storyMatchStars(game)===stars,'Chapter '+chapter+' clears with exactly '+stars+' independent stars for mask '+mask);
    assert.equal(storyStarGoals(game).length,3);assert(storyStarGoals(game).every(goal=>goal.label!=='Victory'));
    game.winner=game.players[1];assert(!storyMatchComplete(game)&&storyMatchStars(game)===0);
  }
  make(1);game.winner=game.players[0];ok(storyMatchComplete(game)&&storyMatchStars(game)===3&&storyStarGoals(game).length===0,'The introductory chapter has no extra objective rows and a completed introductory rating');
  make(3);game.storyMatch.progress={haku:true,yuyuko:true};ok(storyMatchStars(game)===0&&!storyMatchComplete(game),'Completed extra actions award no saved stars before victory');

  // Yuyuko may hit either target at random; only the complete placement's actual net score counts.
  let example=null;
  for(let seed=0;seed<24;seed++){
    make(3,seed);arrange({hands:[['haku_yuyuko','mtn_sanae','sage_ran'],[]],board:[[1,2,'haku_youmu'],[0,1,'hourai_mokou'],[1,0,'temple_shou']]});
    game.ui.pickOwnHandCards=async(t,ids,o)=>ids.slice(0,o.maxCount);await place('haku_yuyuko');
    const points=game.winCount(game.players[0]);assert.equal(game.storyMatch.progress.yuyuko,points>=4);evalConservation(game);
    if(game.storyMatch.progress.haku&&points===4){mixedPlacements.push(seed);example??=seed;}
  }
  ok(mixedPlacements.length>0,'Two Yuyuko skill points plus the immediately resulting two-point Hakugyokurou claim earn the four-point placement star');
  ok(true,'Twenty-four actual randomized resolutions count only the actual complete placement result and conserve every original');
  make(3,example);arrange({hands:[['haku_yuyuko','haku_youmu','mtn_sanae','sage_ran'],[]],board:[[0,1,'hourai_mokou'],[1,0,'temple_shou']]});
  game.ui.pickOwnHandCards=async(t,ids,o)=>ids.filter(id=>id!=='haku_youmu').slice(0,o.maxCount);await place('haku_yuyuko');
  assert.equal(game.winCount(game.players[0]),2);await place('haku_youmu',0,1,2);
  ok(game.winCount(game.players[0])===4&&!game.storyMatch.progress.yuyuko,'A later separate Youmu placement does not retroactively add points to Yuyuko’s earlier placement');
  make(3,example);arrange({hands:[['haku_yuyuko','mtn_sanae','sage_ran'],[]],board:[[1,2,'haku_youmu'],[0,1,'hourai_mokou'],[1,0,'temple_shou']],discards:[['yuuka','medicine','heaven_tenshi'],[]]});
  game.ui.pickOwnHandCards=async(t,ids,o)=>ids.slice(0,o.maxCount);
  storyState={chapter:3,practice:game,complete:false,savedStars:null,cancel(){}};game.ui.render=()=>updateStoryProgress();
  await place('haku_yuyuko');updateStoryProgress();
  ok(game.winCount(game.players[0])===7&&game.storyMatch.progress.haku&&game.storyMatch.progress.yuyuko&&storyMatchStars(game)===3,'A winning two-skill-plus-two-claim placement records all three stars after final settlement');
  ok(storyBestStars(3)===3,'The winning placement saves its final star count rather than an intermediate value');

  for(const chapter of [2,3]){
    make(chapter);arrange({hands:[[],['sdm_sakuya','hourai_mokou']],emptyPile:true});
    let action=await aiDecideAction(1);ok(action.type==='place'&&action.cardId===(chapter===2?'hourai_mokou':'sdm_sakuya')&&!!aiStoryPlacement(1,'sdm_sakuya',game.emptyCells(1))===(chapter===3),'Chapter '+chapter+' applies its own fresh Mansion holding preference');
    make(chapter);arrange({hands:[[],['sdm_patchouli']],board:[[1,0,'sdm_remilia'],[1,1,'sdm_flandre'],[2,1,'sdm_sakuya']]});
    const before=JSON.stringify(captureAIEvaluationSnapshot(game)),metrics=JSON.stringify(game.testMetrics),random=Math.random;
    Math.random=()=>{throw Error('Planning must not consume RNG');};try{action=await aiDecideAction(1);}finally{Math.random=random;}
    ok((chapter===2?action.type==='draw':action.type==='place'&&action.cardId==='sdm_patchouli')&&before===JSON.stringify(captureAIEvaluationSnapshot(game))&&metrics===JSON.stringify(game.testMetrics),'Chapter '+chapter+' applies its own claim-versus-delay preference without mutating the real state');
    await originalAction(1);ok(game.winCount(game.players[1])===(chapter===2?0:4),'Chapter '+chapter+' executes its chosen delay or Mansion collection');
    make(chapter);arrange({hands:[['sdm_flandre','sdm_patchouli'],['sdm_remilia','sdm_sakuya']]});game.revealHand(0,game.players[0].hand,[1]);action=await aiDecideAction(1);
    ok(chapter===2?action.type==='draw':action.type==='place'&&action.cardId==='sdm_remilia','Chapter '+chapter+' applies its own Remilia-versus-delay preference');
    make(chapter);arrange({hands:[[],['sdm_flandre']]});ok((await aiDecideAction(1)).type==='draw','Chapter '+chapter+' still delays through a legal draw when no urgent Mansion opportunity exists');
  }

  returnToMainMenu();testStorage.clear();testStorage.set(STORY_PROGRESS_KEY,JSON.stringify([1,2]));
  ok(storyBestStars(1)===3&&storyBestStars(2)===3&&storyBestStars(3)===null,'Legacy full-objective chapter clears migrate to three stars without inventing a new clear');
  saveStoryStars(3,0);const migrated=JSON.parse(testStorage.get(STORY_PROGRESS_KEY));
  ok(migrated.version===3&&migrated.chapters['3'].legacyStars===0&&migrated.chapters['3'].goals.length===0&&storyClearedChapters().includes(3),'One atomic progress record distinguishes a zero-star clear from an unplayed chapter');
  for(const value of ['null','false','{','{"version":2,"chapters":{"2":5,"3":-1}}']){testStorage.set(STORY_PROGRESS_KEY,value);assert.deepEqual(storyProgressRecords(),{});}
  ok(true,'Malformed records and out-of-range star counts are rejected');
  testStorage.clear();
  for(let stars=0;stars<=3;stars++){
    openStoryChapter(2);const keys=['sdm','remilia','flandre'];keys.forEach((key,index)=>game.storyMatch.progress[key]=index<stars);game.winner=game.players[0];updateStoryProgress();
    const feedback=el('tutorial-feedback').innerHTML,rows=feedback.match(/class="tutorial-goal(?: [^"]*)?"/g)||[];
    ok(storyState.complete&&!el('tutorial-next').disabled&&storyBestStars(2)===stars&&rows.length===3&&!feedback.includes('Victory')&&feedback.includes('★'.repeat(stars)+'☆'.repeat(3-stars)),'A '+stars+'-star victory saves, displays three extra goals and enables progression');
    returnToMainMenu();
  }
  openStoryChapter(2);game.winner=game.players[0];updateStoryProgress();returnToMainMenu();
  ok(storyBestStars(2)===3,'A lower-star replay never overwrites the best result');
  openStoryMenu();const status=el('story-levels').children[1].children[2];
  ok(status.children[0].textContent==='Cleared'&&status.children[1].textContent.includes('★★★'),'Chapter selection displays the best saved star rating beside its separate localized status');
  closeStoryMenu();testStorage.clear();openStoryChapter(3);game.winner=game.players[1];game.storyMatch.progress={haku:true,yuyuko:true};updateStoryProgress();
  ok(!storyState.complete&&el('tutorial-next').disabled&&storyBestStars(3)===null,'Losing with completed extra actions does not save a clear or unlock progression');
  returnToMainMenu();testStorage.clear();const setter=window.localStorage.setItem;window.localStorage.setItem=()=>{throw Error('Quota');};
  try{openStoryChapter(2);game.winner=game.players[0];updateStoryProgress();ok(storyState.complete&&!el('tutorial-next').disabled,'Unavailable storage does not block a legitimate chapter victory');}finally{window.localStorage.setItem=setter;returnToMainMenu();}
  return {status:'pass',count:checks.length,checks,mixedPlacements,rulesVersion:REWORK_RULES_VERSION,scope:'All chapter-two/three star masks, actual Yuyuko ability-plus-claim settlement including a winning placement, independent progression and persistent best stars with legacy migration, pure and executed Mansion actions in both chapters, and controlled DOM lifecycle. No browser pixel verification.'};
})()`,ctx).then(result=>{fs.writeFileSync(__dirname+'/story-stars-2026-10-16-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' independent-star, placement-settlement and Mansion-AI checks passed');}).catch(error=>{console.error(error.stack);process.exitCode=1;});
