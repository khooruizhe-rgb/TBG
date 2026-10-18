// Eiki's real cost/return/draw settlement, Hell objectives and isolated chapter AI.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{',box={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,storage};',box);const {ctx,storage}=box.module.exports;ctx.testStorage=storage;
let completed=false;process.once('beforeExit',()=>{if(!completed){console.error('Hell/Eiki checks did not finish');process.exitCode=1;}});
vm.runInContext(`(async()=>{
 const checks=[],matches=[],youmuAudit=[],ok=(value,name)=>{assert(value,name);checks.push(name);};let events;
 function choices(){events={draws:[],costs:[],returns:[]};game.ui={pickCell:async(_title,cells)=>cells[0],pickOwnHandCards:async(_title,ids)=>ids.slice(0,1),pickCardPool:async(_title,options)=>options[0]?.id,pickFromList:async(_title,options)=>options[0]?.value,onDrawCard:event=>events.draws.push(event),onCostPaid:event=>events.costs.push(event),onDrawPileReturn:event=>events.returns.push(event)};game.pickUI=async(p,method,args)=>game.ui[method]?.(...args);}
 function make(seed=1,chapter=11){evalResetTokens();evalSetSeed(seed);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard'});if(chapter)configureStoryMatch(game,chapter);game.players[0].isAI=false;choices();return game;}
 function copy(base,multiplier=1){const id='created_card_'+(++nextCreatedCard);CARD[id]=blueprintCopy(base,id,null,multiplier);return id;}
 function arrange({hands=[[],[]],board=[],discards=[[],[]],shop=[],emptyPile=false}={}){
  game.currentPlayerIdx=0;game.board=Array.from({length:4},()=>Array(4).fill(null));game.wasteland=game.board.map(row=>row.map(()=>false));game.players.forEach((p,i)=>{p.hand=hands[i].slice();p.discard=discards[i].slice();});game.shopCards=shop.slice();
  for(const[r,c,id]of board)game.setCardAt(r,c,id);
  const used=[...hands.flat(),...board.map(at=>at[2]),...discards.flat(),...shop.filter(Boolean)];assert.equal(used.length,new Set(used).size);assert(used.every(id=>CARD[id]));
  game.drawPile=CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion&&!used.includes(card.id)).map(card=>card.id);game.startingCardIds=new Set([...used,...game.drawPile]);if(emptyPile)game.players[1].hand.push(...game.drawPile.splice(0));game.handKnowledge=game.players.map(()=>new Map());game.reserveAges=game.players.map(()=>({}));game.winner=null;game.stalemateMessage='';evalConservation(game);
 }
 async function place(id,p=0,r=1,c=1){assert(game.players[p].hand.includes(id));game.currentPlayerIdx=p;game.removeFromHand(p,id);const flags=await game.internalPlace(id,r,c,p,0);evalConservation(game);return flags;}
 const eikiDraws=()=>events.draws.filter(event=>event.effect==='eiki').length;
 const mansion=[[0,0,'sdm_remilia'],[0,1,'sdm_flandre'],[1,0,'sdm_patchouli']];
 make(1,null);arrange({hands:[['hell_eiki','medicine'],['haku_youmu']],board:mansion});await place('hell_eiki',0,3,3);
 ok(eikiDraws()===3&&game.players[0].hand.length===3&&events.costs.reduce((n,event)=>n+event.count,0)===1&&mansion.every(([r,c])=>!game.cardAt(r,c)),'Eiki really pays Cost I, returns three majority-faction cards, shuffles and draws three');
 make(1,null);arrange({hands:[['hell_eiki','medicine'],['haku_youmu']],board:mansion,emptyPile:true});assert.equal(game.drawPile.length,0);await place('hell_eiki',0,3,3);
 ok(eikiDraws()===3&&game.players[0].hand.length===3&&game.drawPile.length===1,'An initially empty deck is funded by the actual paid and returned cards, so Eiki still draws three');
 make(1,null);arrange({hands:[['hell_eiki','medicine'],['haku_youmu']],board:[[0,0,'shop_rinnosuke'],[0,1,'sdm_remilia'],[2,0,'sdm_flandre'],[3,0,'sdm_patchouli']]});await place('hell_eiki',0,3,3);
 ok(eikiDraws()===2&&game.cardAt(0,1)==='sdm_remilia'&&!game.cardAt(2,0)&&!game.cardAt(3,0),'A protected majority member remains on the board and supplies no replacement draw');
 make(1,null);arrange({hands:[['hell_eiki','medicine'],['haku_youmu']],board:[[1,1,'shop_rinnosuke'],...mansion]});await place('hell_eiki',0,3,3);
 ok(eikiDraws()===1&&!game.isOnBoard('hell_eiki')&&mansion.every(([r,c,id])=>game.cardAt(r,c)===id),'Fully protected cards have no effective board faction, so only Eiki herself returns and supplies one draw');
 make(1,null);arrange({hands:[['hell_eiki','medicine'],['haku_youmu']],board:[[0,0,'sdm_remilia'],[0,1,'sdm_flandre'],[2,0,'mtn_suwako'],[2,1,'mtn_sanae']]});game.ui.pickFromList=async(_title,options)=>options.find(option=>option.value.fk==='mountain')?.value;await place('hell_eiki',0,3,3);
 ok(eikiDraws()===2&&game.cardAt(0,0)==='sdm_remilia'&&game.cardAt(0,1)==='sdm_flandre'&&!game.cardAt(2,0)&&!game.cardAt(2,1),'An actual tied-maximum chooser removes exactly the selected faction and draws its actual returned count');
 make(1,null);arrange({hands:[['hell_eiki','medicine'],['haku_youmu']],board:mansion});game.ui.pickOwnHandCards=async()=>[];await place('hell_eiki',0,3,3);
 ok(eikiDraws()===0&&events.costs.length===0&&mansion.every(([r,c,id])=>game.cardAt(r,c)===id),'Declining Cost I leaves all targets and gives no free draw');
 make(1,null);arrange({hands:[['hell_eiki'],['haku_youmu']],board:mansion});await place('hell_eiki',0,3,3);
 ok(eikiDraws()===0&&events.costs.length===0,'An Eiki with no payable hand card cannot activate the return-and-draw skill');
 make(1,null);arrange({hands:[['hell_eiki','medicine'],['haku_youmu']],board:[[0,0,'hell_clownpiece'],[0,1,'hell_komachi']]});await place('hell_eiki',0,1,0);
 ok(eikiDraws()===3&&!game.isOnBoard('hell_eiki')&&game.players[0].hand.length===3,'Eiki finishes drawing even when the largest faction includes herself and she returns with it');
 make(1,null);arrange({hands:[['hell_eiki','medicine','haku_yuyuko','haku_youmu','mtn_aya','palace_rin','marisa'],['hourai_mokou']],board:mansion});await place('hell_eiki',0,3,3);
 ok(eikiDraws()===3&&game.players[0].hand.length===8&&!game.canDrawNormally(0),'Eiki’s ability draw can exceed the normal seven-card drawing limit');
 make(1,null);const doubled=copy('hell_eiki',2);arrange({hands:[[doubled,'medicine','reimu'],['haku_youmu']],board:[...mansion,[2,0,'mtn_suwako'],[2,1,'mtn_sanae']]});game.ui.pickOwnHandCards=async(_title,ids)=>ids.slice(0,2);await place(doubled,0,3,3);
 ok(eikiDraws()===5&&events.costs.reduce((n,event)=>n+event.count,0)===2&&game.createdActivations[doubled]===true&&game.players[0].hand.length===5,'A double Eiki copy draws three then two after re-evaluating the board, paying its single Cost I plus one creation surcharge only once');
 make(1,null);arrange({hands:[['hell_eiki','medicine'],['haku_youmu']],board:mansion});const aiBefore=JSON.stringify(game.testRuleState());const value=aiWithPlacement('hell_eiki',{r:3,c:3},()=>({gain:game.estimateHandGain(0,'hell_eiki'),plan:aiAbilityPlan(0,'hell_eiki',3,3)}),0);
 ok(value.gain===3&&value.plan.handGain===3&&JSON.stringify(game.testRuleState())===aiBefore,'Current AI values the three actual Eiki replacement draws without mutating the real board, hands or deck');

 const openings=new Set(),stocks=new Set(),actors=new Set(),humanHell=new Set();
 for(let seed=1;seed<=1024;seed++){
  const g=make(seed),all=[...g.players.flatMap(p=>p.hand),...g.drawPile,...g.shopCards];assert(g.players.every(p=>p.hand.length===6));assert(g.players[0].hand.some(id=>CARD[id].faction==='hell'));assert(!g.players[0].hand.includes('hell_hecatia'));assert(g.players[1].hand.includes('hell_hecatia'));assert.equal(all.length,40);assert.equal(new Set(all).size,40);assert(g.handKnowledge.every(memory=>memory.size===0));assert(!('openingHand' in g.storyMatch));assert.equal(g.aiDifficulty,'normal');assert(!aiIsTeachingOpponent(g,1));assert(g.kourindouEnabled);assert.equal(g.shopCards.length,4);assert(g.shopCards.includes('hell_kutaka'));assert.equal(new Set(g.shopCards).size,4);assert(g.shopCards.slice(1).every(id=>storyShopCards(11).includes(id)));assert(g.drawPile.filter(id=>CARD[id].faction==='hell').every(id=>g.drawPile.slice(-5).includes(id)));assert.equal(g.storyMatch.aiTurns,0);assert.equal(g.storyMatch.wastelandCleared,0);assert(!g.storyMatch.hecatiaOpeningPlayed);
  for(const card of CARDS)assert.equal(g.cardAbilityEnabled(card.id),!!(card.token||card.shopkeeper||g.storyMatch.skillFactions.includes(card.faction)),card.id);
  evalConservation(g);openings.add(g.players[0].hand.slice().sort().join(','));stocks.add(g.shopCards.slice(1).join(','));actors.add(g.currentPlayerIdx);for(const id of g.players[0].hand)if(CARD[id].faction==='hell')humanHell.add(id);
 }
 ok(openings.size>950&&stocks.size===60&&actors.size===2&&humanHell.size===3,'1024 conserved private random six-card deals reserve Hecatia for the AI, a Hell card for the player, undealt Hell originals in the next five draws, and Kutaka in all 60 shop orders');
 ok(storyChapterCards(11).join(',')==='hell_hecatia,hell_clownpiece,hell_eiki,hell_komachi'&&storyShopCards(11).includes('hell_kutaka'),'The introduction unlocks four Hell originals and leaves the guaranteed fifth card for shop exploration');
 for(const first of [0,1]){
  make();arrange({hands:[['hourai_mokou'],['hell_hecatia','mtn_sanae']]});game.currentPlayerIdx=first;if(first===0){game.beginPlayerTurn(0);await place('hourai_mokou',0,0,0);game.endPlayerTurn(0);}game.currentPlayerIdx=1;game.beginPlayerTurn(1);assert.equal(game.storyMatch.aiTurns,1);const action=await aiDecideAction(1,true);assert.equal(action.cardId,'hell_hecatia');await doPlayerAction(1);evalConservation(game);assert(game.isOnBoard('hell_hecatia')&&game.storyMatch.hecatiaOpeningPlayed);
  const at=game.boardCells(cell=>cell.id==='hell_hecatia')[0];game.moveBoardToHand(at.r,at.c,1,'yukari');assert.equal(aiStoryHellOpeningAction(1),null);
 }
 ok(true,'For either first actor the real first AI action places Hecatia despite its ordinary setup guard, and returning her later does not repeat the scripted opening');
 make();arrange({hands:[['medicine'],['hell_hecatia','hell_clownpiece']]});game.currentPlayerIdx=1;game.beginPlayerTurn(1);game.forcedPlay[1]='hell_clownpiece';await doPlayerAction(1);
 ok(game.isOnBoard('hell_clownpiece')&&!game.isOnBoard('hell_hecatia'),'The chapter opening respects Reisen’s mandatory card instead of overriding game rules');
 make();arrange({hands:[['medicine'],['hell_hecatia','mtn_sanae']]});game.currentPlayerIdx=1;game.beginPlayerTurn(1);game.placementBlockedForTurn[1]=true;assert.equal(aiStoryHellOpeningAction(1),null);const blocked=await aiDecideAction(1,false);
 ok(blocked.type==='draw','A blocked Hecatia opening takes a legal shared draw rather than an illegal placement or voluntary pass');
 make(1,10);arrange({hands:[['medicine'],['hell_hecatia','mtn_sanae']]});game.currentPlayerIdx=1;game.beginPlayerTurn(1);
 ok(aiStoryHellOpeningAction(1)===null,'The Hecatia opening override is absent from earlier chapters');
 for(const collector of [0,1]){make();arrange({hands:[['medicine'],['haku_youmu']],board:[[0,0,'hell_hecatia'],[0,1,'hell_clownpiece'],[1,0,'hell_eiki'],[1,1,'hell_komachi']]});game.checkClaims(collector);evalConservation(game);assert.equal(game.storyMatch.progress.hell,collector===0);assert.equal(game.winCount(game.players[collector]),6);}
 ok(true,'A real four-card Hell collection records the player objective and admits Hecatia after the other three Hell cards for six points');
 for(let mask=0;mask<8;mask++){make();game.storyMatch.progress={hell:!!(mask&1),clearEight:!!(mask&2),kutaka:!!(mask&4)};game.winner=game.players[0];assert.equal(storyMatchStars(game),[1,2,4].filter(bit=>mask&bit).length);game.winner=game.players[1];assert.equal(storyMatchStars(game),0);}
 ok(true,'All eight objective combinations remain independent and require a human victory before awarding stars');

 make();arrange({hands:[['hell_clownpiece'],['haku_youmu']]});for(const[dr,dc]of DIRS8)game.wasteland[1+dr][1+dc]=true;await place('hell_clownpiece');
 ok(game.storyMatch.wastelandCleared===8&&game.storyMatch.progress.clearEight,'Clownpiece actually clearing all eight surrounding wasteland tiles earns the goal');
 make();const otherClown=copy('hell_clownpiece');arrange({hands:[['hell_clownpiece',otherClown,'medicine'],['haku_youmu']]});for(const[r,c]of [[0,0],[0,1],[0,2],[1,0],[1,3],[2,3],[3,2],[3,3]])game.wasteland[r][c]=true;await place('hell_clownpiece');assert.equal(game.storyMatch.wastelandCleared,4);assert(!game.storyMatch.progress.clearEight);await place(otherClown,0,2,2);
 ok(game.storyMatch.wastelandCleared===8&&game.storyMatch.progress.clearEight,'Two real four-tile clears, including a paid created Clownpiece, accumulate to eight in the same match');
 make();arrange({hands:[['yuuka'],['haku_youmu']]});for(const[r,c]of [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1]])game.wasteland[r][c]=true;game.chooseRectArea=async()=>game.rectCells({r:0,c:0},3);await place('yuuka',0,3,3);
 ok(game.storyMatch.progress.clearEight&&game.storyMatch.wastelandCleared===8,'Yuuka’s actual clear also counts; the objective is not locked to Clownpiece');
 make();arrange({hands:[['medicine'],['hell_clownpiece']]});for(const[dr,dc]of DIRS8)game.wasteland[1+dr][1+dc]=true;await place('hell_clownpiece',1);
 ok(!game.storyMatch.progress.clearEight&&game.storyMatch.wastelandCleared===0,'An opponent-owned clearing ability never advances the player’s goal');
 make();arrange({hands:[['hell_clownpiece'],['haku_youmu']]});game.wasteland[0][0]=true;assert(game.clearWasteland(0,0));assert(!game.clearWasteland(0,0));game.setWastelandAt(0,1,false);
 ok(game.storyMatch.wastelandCleared===0&&!game.storyMatch.progress.clearEight,'Setup edits, already-clear tiles and calls outside an owned ability do not manufacture cleared-tile progress');
 make();arrange({hands:[['hell_eiki','medicine'],['haku_youmu']],board:mansion});const planning=JSON.stringify(game.storyMatch);for(let seed=1;seed<=8;seed++){evalSetSeed(seed);aiEvaluateCard(0,'hell_eiki');assert.equal(JSON.stringify(game.storyMatch),planning);}
 ok(true,'Current AI return-and-draw previews cannot mutate either Hell objective or the real clearing count');

 make();arrange({hands:[['hell_kutaka'],['haku_youmu']]});await place('hell_kutaka');
 ok(game.storyMatch.progress.kutaka&&DIRS4.every(([dr,dc])=>game.wastelandAt(1+dr,1+dc)),'Kutaka creating actual new orthogonal wasteland successfully triggers her objective');
 make();arrange({hands:[['hell_kutaka'],['haku_youmu']]});game.wasteland[1][1]=true;game.ui.pickCardPool=async(_title,options)=>options.find(option=>option.id==='hell_eiki')?.id;await place('hell_kutaka');
 ok(game.storyMatch.progress.kutaka&&game.players[0].hand.includes('hell_eiki'),'Kutaka really taking a Hell card from the deck on wasteland is the other successful branch');
 make();arrange({hands:[['hell_kutaka'],['haku_youmu']]});game.wasteland[1][1]=true;game.ui.pickCardPool=async()=>null;await place('hell_kutaka');
 ok(!game.storyMatch.progress.kutaka,'Cancelling Kutaka’s retrieval does not award an unperformed effect');
 make();arrange({hands:[['hell_kutaka'],['hell_hecatia','hell_clownpiece','hell_eiki','hell_komachi']]});game.wasteland[1][1]=true;await place('hell_kutaka');
 ok(!game.storyMatch.progress.kutaka,'An empty Hell search on wasteland is not a successful trigger');
 make();arrange({hands:[['hell_kutaka'],['haku_youmu']]});for(const[dr,dc]of DIRS4)game.wasteland[1+dr][1+dc]=true;await place('hell_kutaka');
 ok(!game.storyMatch.progress.kutaka,'Turning already-wasteland neighbors into wasteland produces no successful-trigger progress');
 make();arrange({hands:[['medicine'],['hell_kutaka']]});await place('hell_kutaka',1);
 ok(!game.storyMatch.progress.kutaka,'Only the player’s actual Kutaka effect counts');
 make();const copiedKutaka=copy('hell_kutaka');arrange({hands:[[copiedKutaka,'medicine'],['haku_youmu']]});await place(copiedKutaka);
 ok(game.storyMatch.progress.kutaka&&game.createdActivations[copiedKutaka]===true,'A real paid Kutaka copy can trigger the same skill objective');
 make();arrange({hands:[['hell_kutaka'],['haku_youmu']]});game.permanentAbilities.hell_kutaka='__draw_one';await place('hell_kutaka');
 ok(!game.storyMatch.progress.kutaka,'A Kutaka rewritten to draw one no longer triggers the original ability goal');
 make(1,10);arrange({hands:[['hell_clownpiece','hell_kutaka'],['haku_youmu']]});for(const[dr,dc]of DIRS8)game.wasteland[1+dr][1+dc]=true;await place('hell_clownpiece');await place('hell_kutaka',0,3,3);
 ok(!('clearEight' in game.storyMatch.progress)&&!('kutaka' in game.storyMatch.progress),'Hell objective hooks do not add skills or progress to previous chapters');

 // Exercise actual dispatch, rather than relying solely on a chapter predicate.
 const mentor=aiStoryMentorAction;let mentorCalls=0;aiStoryMentorAction=async(...args)=>{mentorCalls++;return await mentor(...args);};
 try{
  for(const paired of [false,true]){make(1,null);arrange({hands:[['mtn_sanae'],paired?['haku_youmu','haku_yuyuko']:['haku_youmu','hourai_mokou','palace_rin']]});game.currentPlayerIdx=1;game.beginPlayerTurn(1);const candidate=aiEvaluateCard(1,'haku_youmu'),action=await aiDecideAction(1,false);assert(!aiIsTeachingOpponent(game,1));assert.equal(mentorCalls,0);assert.equal(candidate.lowPriority,!paired);assert.equal(action.type,paired?'place':'draw');if(paired)assert.equal(action.cardId,'haku_youmu');youmuAudit.push({chapter:null,difficulty:game.aiDifficulty,paired,teaching:false,action,lowPriority:candidate.lowPriority});}
  ok(true,'Ordinary Hard AI never calls the story mentor: an isolated Youmu is reserved, while a held Yuyuko pairing can justify an opening Youmu');
  make(1,3);arrange({hands:[['mtn_sanae'],['haku_youmu','hourai_mokou','palace_rin']]});game.currentPlayerIdx=1;game.beginPlayerTurn(1);const forced=await aiDecideAction(1,false);assert(aiIsTeachingOpponent(game,1));assert.equal(forced.cardId,'haku_youmu');assert.equal(mentorCalls,1);youmuAudit.push({chapter:3,difficulty:game.aiDifficulty,paired:false,teaching:true,action:forced});
  ok(true,'Chapter three alone enters the mentor and explicitly chooses Youmu without a pairing');
  returnToMainMenu();make(1,null);arrange({hands:[['mtn_sanae'],['haku_youmu','hourai_mokou','palace_rin']]});game.currentPlayerIdx=1;const afterStory=await aiDecideAction(1,false);assert.equal(afterStory.type,'draw');assert.equal(mentorCalls,1);assert(!game.storyMatch&&!game.tutorialLesson&&aiStoryHellOpeningAction(1)===null);
  ok(true,'Leaving the actual story session and constructing an ordinary match removes both the teaching and scripted-Hecatia state');
 }finally{aiStoryMentorAction=mentor;}

 returnToMainMenu();testStorage.clear();openStoryMenu();ok(el('story-levels').children.length===12,'The story menu offers twelve replayable chapters');showStoryChapterIntro(11);
 ok(el('story-card-grid').children.length===4&&el('story-card-grid').children.every(node=>CARD[node.dataset.cardId].faction==='hell'&&node.dataset.cardId!=='hell_kutaka'&&node.events.click&&node.events.pointerdown)&&el('story-intro').textContent===STORY_CHAPTERS[10].body,'The introduction displays four movable active Hell cards and leaves Kutaka to be discovered in the shop');
 el('story-begin').events.click();ok(isStoryMatch()&&game.storyMatch.chapter===11&&!tutorialState&&game.players[0].hand.length===6&&game.players[1].hand.includes('hell_hecatia')&&game.shopCards.includes('hell_kutaka')&&el('tutorial-feedback').innerHTML.includes(STORY_CHAPTERS[10].hint),'The introduction starts a real private six-card Hell match with the guaranteed shop card and requested separate hint');
 game.storyMatch.progress.hell=true;game.winner=game.players[0];updateStoryProgress();returnToMainMenu();openStoryChapter(11);game.storyMatch.progress.clearEight=true;game.winner=game.players[0];updateStoryProgress();returnToMainMenu();openStoryChapter(11);game.storyMatch.progress.kutaka=true;game.winner=game.players[0];updateStoryProgress();
 ok(storyBestStars(11)===3&&!storyChapterPerfect(11),'Separate winning matches accumulate Hell’s three goals without inventing a one-match perfect clear');
 returnToMainMenu();testStorage.clear();openStoryChapter(11);choices();arrange({hands:[['hell_clownpiece','medicine','hell_komachi','marisa'],['hourai_mokou']],board:[[0,0,'hell_hecatia'],[3,3,'sage_ran']],shop:['shop_rinnosuke','hell_kutaka','sdm_meiling','hourai_tewi']});for(const[dr,dc]of DIRS8)game.wasteland[1+dr][1+dc]=true;
 game.beginPlayerTurn(0);await place('hell_clownpiece');assert(game.storyMatch.progress.clearEight);game.endPlayerTurn(0);game.beginPlayerTurn(0);const kutaka=game.tradeCells().find(cell=>cell.id==='hell_kutaka'||game.cardAt(cell.r,cell.c)==='hell_kutaka');assert(kutaka);assert(game.tradeCard(0,'medicine',kutaka));await place('hell_kutaka',0,0,1);assert(game.storyMatch.progress.kutaka);game.endPlayerTurn(0);game.beginPlayerTurn(0);const swap=await place('hell_komachi',0,1,0);assert(game.storyMatch.progress.hell&&game.winCount(game.players[0])===6);const action=doPlayerAction;
 try{doPlayerAction=async p=>{assert.equal(p,0);game.ui.pickCell=async(_title,cells)=>cells.find(cell=>game.cardAt(cell.r,cell.c)==='sage_ran');return await place('marisa',p,3,2);};await afterAction(0,swap);}finally{doPlayerAction=action;}updateStoryProgress();evalConservation(game);
 ok(game.winner?.idx===0&&game.winCount(game.players[0])===7&&storyMatchStars(game)===3&&storyChapterPerfect(11)&&el('tutorial-feedback').classList.contains('story-perfect')&&storyStarColor(11)===FACTIONS.hell.color,'A legal route clears eight tiles, trades for and triggers Kutaka, claims Hecatia with three Hell cards for six points, then uses Komachi’s free action for a seventh point and a perfect save');
 el('restart-btn').events.click();ok(game===null&&storyMenuChapter===12&&el('story-card-grid').children.length===2,'A Hell clear advances to the two-card Heaven introduction');
 openStoryChapter(11);game.storyMatch.progress.clearEight=true;game.storyMatch.wastelandCleared=8;const retired=game;el('tutorial-retry').events.click();ok(retired.cancelled&&game!==retired&&game.storyMatch.wastelandCleared===0&&!Object.values(game.storyMatch.progress).some(Boolean)&&!game.storyMatch.hecatiaOpeningPlayed&&storyChapterPerfect(11),'Retry resets live Hell goals and opening state while preserving the saved perfect clear');returnToMainMenu();
 for(let seed=1;seed<=4;seed++){
  const g=make(seed);g.players.forEach(p=>p.isAI=true);let actions=0,opening=null;
  while(!g.winner&&!g.stalemateMessage&&actions<220){const p=g.currentPlayerIdx;g.beginPlayerTurn(p);g.tradedThisTurn[p]=false;if(p===1&&!opening){opening={hand:g.players[1].hand.slice(),forced:g.forcedPlay[1]||null,blocked:g.isPlacementBlocked(1)};opening.expected=g.players[1].hand.includes('hell_hecatia')&&!opening.forced&&!opening.blocked&&g.emptyOrWastelandForCard(CARD.hell_hecatia,1).length>0;}if(!canAct(p)){g.endPlayerTurn(p);g.currentPlayerIdx=1-p;if(!canAct(1-p)){endStalemate();break;}continue;}const flags=await doPlayerAction(p);if(p===1&&opening.played===undefined)opening.played=g.storyMatch.hecatiaOpeningPlayed;evalConservation(g);actions++;await afterAction(p,flags);}
  assert(g.winner||g.stalemateMessage);assert(actions<220);evalConservation(g);matches.push({seed,actions,winner:g.winner?.idx??null,stalemate:!!g.stalemateMessage,opening,hecatiaOpeningPlayed:g.storyMatch.hecatiaOpeningPlayed,wastelandCleared:g.storyMatch.wastelandCleared});
 }
 assert(matches.every(match=>!match.opening.expected||match.opening.played),JSON.stringify(matches));
 ok(matches.length===4,'Four complete Medium Hell matches finish with conserved cards; every available unconstrained first AI action places Hecatia');
 return {status:'pass',count:checks.length,checks,openings:1024,matches,youmuAudit,rulesVersion:REWORK_RULES_VERSION,scope:'Actual Eiki cost, tied/protected returns, matching draws, empty deck, self-return, hand limit and paid double-copy rules; constrained private Hell openings, actual mandatory AI action and block/forced exceptions, real faction/terrain/Kutaka objectives and negatives, ordinary-vs-mentor dispatch, actual shop-to-seven-point perfect route and persistence, four complete Medium matches. Controlled DOM; no browser pixel verification.'};
})()`,ctx).then(result=>{
 const material=fs.readFileSync(__dirname+'/card-materials-2026-10-12.cjs','utf8'),materialBox={module:{exports:{}},require,__dirname,console};vm.runInNewContext(material.slice(0,material.indexOf("const copy='created_card_910'"))+'\nmodule.exports={A};',materialBox);const A=materialBox.module.exports.A;
 const values=JSON.parse(vm.runInContext('JSON.stringify([STORY_CHAPTERS[10].title,STORY_CHAPTERS[10].body,STORY_CHAPTERS[10].hint,...storyStarGoals({storyMatch:{chapter:11,progress:{}}}).map(goal=>goal.label),CARD.hell_eiki.desc,"AI 1’s Eiki draws 3 cards after the return."])',ctx));
 for(const language of ['en','zh-CN']){A.setLanguage(language);for(const value of values)assert.equal(A.translateGameText(value)===value,language==='en');}
 A.setLanguage('zh-CN');assert.equal(A.translateGameText(values[0]),'第十一关 · 地狱');assert.equal(A.translateGameText(values[2]),'赫卡提亚？！对于这样的大人物我也只是有所耳闻而已，真没想到她会来到这里啊。');assert.equal(A.translateGameText(values[6]),'[代价 I] 放置：将棋盘上数量最多的阵营的所有卡牌放回抽牌堆，并抽取与放回卡牌相同数量的卡牌。');assert(!/[A-Za-z]{3,}/.test(A.translateGameText(values[7])));result.checks.push('Actual bilingual rendering covers the Hell overview, exact hint, three goals, complete Eiki skill and new draw log');result.count=result.checks.length;
 fs.writeFileSync(__dirname+'/story-hell-eiki-2026-10-18-results.json',JSON.stringify(result,null,2)+'\n');completed=true;console.log(result.count+' Hell/Eiki and AI-isolation checks, 1024 private deals and four complete Medium matches passed');
}).catch(error=>{console.error(error.stack);process.exitCode=1;});
