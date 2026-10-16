const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{',box={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,storage};',box);const {ctx,storage}=box.module.exports;
vm.runInContext(`(async()=>{
 const checks=[],productionMatches=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
 function make(seed=1,actor=0){evalResetTokens();evalSetSeed(seed);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard'});game.players[0].isAI=false;game.currentPlayerIdx=actor;configureStoryMatch(game,6);game.pickUI=async(p,method,args)=>game.ui[method]?.(...args);return game;}
 function arrange({hands=[[],[]],board=[],discards=[[],[]],shop=['shop_rinnosuke','sdm_meiling','mtn_nitori','hell_kutaka']}={}){
  game.board=Array.from({length:4},()=>Array(4).fill(null));game.wasteland=game.board.map(row=>row.map(()=>false));game.players.forEach((p,i)=>{p.hand=hands[i].slice();p.discard=discards[i].slice();});game.shopCards=shop;
  for(const[r,c,id]of board)game.setCardAt(r,c,id);
  const used=[...hands.flat(),...discards.flat(),...board.map(at=>at[2]),...shop.filter(Boolean)];assert.equal(new Set(used).size,used.length);assert(used.every(id=>CARD[id]),used.join(","));
  game.drawPile=CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion&&!used.includes(card.id)).map(card=>card.id);game.startingCardIds=new Set([...used,...game.drawPile]);assert.equal(game.startingCardIds.size,40,'A legal chapter-six position has the 36 core originals, keeper and exactly three fifth cards');
  game.handKnowledge=game.players.map(()=>new Map());game.reserveAges=game.players.map(()=>({}));game.winner=null;game.stalemateMessage='';game.currentPlayerIdx=0;game.beginPlayerTurn(0);
 }
 async function place(id,p=0,r=1,c=1){assert(game.players[p].hand.includes(id));game.removeFromHand(p,id);return game.internalPlace(id,r,c,p,0);}
 const hands=new Set(),rivals=new Set(),stocks=new Set(),actors=new Set();
 for(let seed=1;seed<=512;seed++){
  const g=make(seed,seed%2),ids=[...g.players.flatMap(p=>p.hand),...g.drawPile,...g.shopCards];
  assert(g.players.every(p=>p.hand.length===6));assert.equal(ids.length,40);assert.equal(new Set(ids).size,40);assert.equal(g.startingCardIds.size,40);evalConservation(g);
  assert(g.handKnowledge.every(memory=>memory.size===0));assert(!('openingHand' in g.storyMatch));assert(g.players.every(p=>p.hand.every(id=>!CARD[id].shopExpansion&&!CARD[id].shopkeeper)));
  assert(g.kourindouEnabled&&g.shopTiles.length===4&&g.allTiles().length===20&&g.shopCards.length===4&&g.shopCards[0]==='shop_rinnosuke'&&g.shopCards.slice(1).every(id=>CARD[id].shopExpansion));
  assert.equal(g.aiDifficulty,'normal');assert(!aiIsTeachingOpponent(g,1));assert(aiKnows(1,'basic')&&aiKnows(1,'trade')&&aiKnows(1,'value')&&aiKnows(1,'defense'));assert(!aiKnows(1,'clues')&&!aiKnows(1,'reserve')&&!aiKnows(1,'forecast'));
  for(const card of CARDS)assert.equal(g.cardAbilityEnabled(card.id),!!(card.shopExpansion||card.shopkeeper||card.token||g.storyMatch.skillFactions.includes(card.faction)),card.id);
  hands.add(g.players[0].hand.slice().sort().join(','));rivals.add(g.players[1].hand.slice().sort().join(','));stocks.add(g.shopCards.slice().sort().join(','));actors.add(g.currentPlayerIdx);
 }
 ok(hands.size>500&&rivals.size>500&&stocks.size===35&&actors.size===2,'512 random chapter-six deals preserve two private six-card hands, all 36 originals and four shop cards, random first actor and all 35 merchandise combinations');
 ok(STORY_CHAPTERS.length===6&&storyChapterCards(6).length===7&&storyChapterCards(6).every(id=>CARD[id].shopExpansion),'Kourindou introduces exactly the seven fifth cards');
 make();ok(storyStarGoals(game).map(g=>g.key).join(',')==='twoFactions,lockedFaction,surprise'&&storyStarGoals(game).at(-1).label==='Do something that surprises me!','The three optional goals include the literal surprise request without disclosing its threshold');
 const ordinaryDecision=aiCurrentDecideAction,mentor=aiTutorialMentorAction,ordinaryPlacement=aiCurrentFactionPlacement;
 let ordinaryCalls=0,placementCalls=0;aiCurrentDecideAction=async()=>{ordinaryCalls++;return {type:'draw',sentinel:true};};aiTutorialMentorAction=async()=>{throw Error('Chapter six must not use the teaching opponent');};
 assert((await aiDecideAction(1)).sentinel);aiCurrentFactionPlacement=()=>{placementCalls++;return {r:2,c:3};};assert.deepEqual(aiFactionPlacement(1,'reimu',[{r:2,c:3}]),{r:2,c:3});
 aiCurrentDecideAction=ordinaryDecision;aiTutorialMentorAction=mentor;aiCurrentFactionPlacement=ordinaryPlacement;
 ok(ordinaryCalls===1&&placementCalls===1,'Chapter six dispatches both its decision and forced-placement planning to the ordinary AI, with no teaching delay or three-card assistance');
 for(const chapter of [2,3,4,5]){make();configureStoryMatch(game,chapter);assert.equal(game.aiDifficulty,'easy');assert(aiIsTeachingOpponent(game,1));assert(!game.kourindouEnabled);assert(CARDS.filter(c=>c.shopExpansion).every(c=>!game.cardAbilityEnabled(c.id)));}ok(true,'Earlier chapters retain Easy teaching opponents and lock the fifth cards until chapter six');
 make();arrange({hands:[['reimu'],['marisa']]});const target=game.tradeCells()[0],bought=game.cardAt(target.r,target.c);assert(game.canTrade(0,'reimu'));game.tradeCard(0,'reimu',target);
 ok(game.players[0].hand.includes(bought)&&game.shopCards.includes('reimu')&&game.tradedThisTurn[0]&&game.currentPlayerIdx===0&&game.shopCards[0]==='shop_rinnosuke','A real chapter-six trade exchanges a hand card for merchandise, leaves the keeper and uses no turn');evalConservation(game);
 make();arrange({hands:[['hourai_tewi'],['reimu']],shop:['shop_rinnosuke','sdm_meiling','mtn_nitori','medicine']});await place('hourai_tewi');const trap=game.players[1].hand.find(id=>/^trap_token_/.test(id));assert(trap&&game.cardAbilityEnabled(trap));
 game.currentPlayerIdx=1;game.chooseOwnHandCard=async()=> 'reimu';game.ui.pickOwnHandCard=async()=> 'reimu';game.players[1].isAI=false;await place(trap,1,0,0);
 ok(!game.players[1].hand.includes('reimu')&&game.drawPile.includes('reimu'),'Traps generated by an unlocked fifth card retain their printed return ability instead of becoming blank story tokens');evalConservation(game);
 // Real claims establish faction identity; unrelated points never stand in for collecting a faction.
 make();arrange({board:[[0,0,'reimu'],[0,1,'marisa']]});game.checkClaims(0);
 ok(game.storyMatch.claimedFactions.join(',')==='hakurei'&&game.storyMatch.progress.lockedFaction&&!game.storyMatch.progress.twoFactions&&game.winCount(game.players[0])===2,'An actual locked Hakurei pair earns the locked-faction goal and counts as one distinct faction');
 game.removeFromHand(0,'medicine');game.drawPile.splice(game.drawPile.indexOf('medicine'),1);game.addToDiscard(0,'medicine',{effect:'test'});assert(!game.storyMatch.progress.twoFactions);
 game.drawPile.splice(game.drawPile.indexOf('yuuka'),1);game.setCardAt(1,0,'yuuka');game.players[0].discard.splice(game.players[0].discard.indexOf('medicine'),1);game.setCardAt(1,1,'medicine');game.checkClaims(0);
 ok(game.storyMatch.progress.twoFactions&&game.storyMatch.claimedFactions.length===2,'A second, different actual faction claim completes the two-faction objective');evalConservation(game);
 make();arrange({board:[[0,0,'haku_yuyuko'],[0,1,'haku_youmu']]});game.checkClaims(0);
 ok(!game.storyMatch.progress.lockedFaction&&game.storyMatch.claimedFactions.join(',')==='hakugyokurou','Collecting an already unlocked faction cannot satisfy the locked-faction objective');
 make();arrange({board:[[0,0,'temple_shou'],[0,1,'temple_byakuren'],[1,0,'temple_nue'],[1,1,'temple_ichirin']],shop:['shop_rinnosuke','sdm_meiling','mtn_nitori','medicine']});game.checkClaims(0);
 ok(game.storyMatch.progress.lockedFaction&&game.players[0].discard.includes('temple_ichirin'),'A fifth card with an unlocked skill can help collect its still-locked core faction');
 make();arrange({board:[[0,0,'reimu'],[0,1,'marisa']]});game.checkClaims(1);ok(game.storyMatch.claimedFactions.length===0&&!game.storyMatch.progress.lockedFaction,'Opponent claims never satisfy the player’s goals');
 // A legal Meiling push joins a disconnected Hell fourth card while completing Mansion.
 const burstBoard=[[3,0,'sdm_remilia'],[3,1,'sdm_sakuya'],[3,2,'sdm_patchouli'],[0,0,'hell_eiki'],[0,1,'hell_komachi'],[1,0,'hell_hecatia'],[2,1,'hell_clownpiece']];
 for(let seed=1;seed<=16;seed++){
  make(seed);arrange({hands:[['medicine'],['reimu']],board:burstBoard,shop:['shop_rinnosuke','sdm_meiling','mtn_nitori','hell_kutaka']});assert(!game.findFactionClaim('sdm').length&&!game.findFactionClaim('hell').length);assert(game.tradeCard(0,'medicine',1));evalConservation(game);game.chooseBoardCell=async()=>({r:2,c:1});
  await place('sdm_meiling',0,2,2);evalConservation(game);
  assert(game.winner?.idx===0&&game.winCount(game.players[0])===8&&storyMatchStars(game)===3);assert.deepEqual(game.storyMatch.claimedFactions,['sdm','hell']);assert(game.storyMatch.progress.surprise);assert.equal(game.storyMatch.turnStartScore,0);
 }
 ok(true,'Sixteen real Meiling placements push the disconnected fourth Hell card into place, claim Mansion and Hell, earn eight points in one turn and complete all three goals before the win is banked');
 make();arrange({discards:[['reimu','marisa','yuuka','medicine'],[]]});game.drawPile.splice(game.drawPile.indexOf('mtn_sanae'),1);game.addToDiscard(0,'mtn_sanae',{effect:'ability'});game.drawPile.splice(game.drawPile.indexOf('hourai_mokou'),1);game.addToDiscard(0,'hourai_mokou',{effect:'ability'});game.drawPile.splice(game.drawPile.indexOf('haku_youmu'),1);game.addToDiscard(0,'haku_youmu',{effect:'ability'});
 ok(game.winner?.idx===0&&!game.storyMatch.progress.surprise,'Reaching seven total points after starting the turn with four is not seven points gained in one turn');
 make();arrange();const seven=['reimu','marisa','yuuka','medicine','temple_shou','temple_byakuren','temple_nue'];
 for(const id of seven.slice(0,4)){game.drawPile.splice(game.drawPile.indexOf(id),1);game.addToDiscard(0,id,{effect:'ability'});}game.endPlayerTurn(0);game.currentPlayerIdx=1;game.beginPlayerTurn(1);game.endPlayerTurn(1);game.currentPlayerIdx=0;game.beginPlayerTurn(0);
 for(const id of seven.slice(4)){game.drawPile.splice(game.drawPile.indexOf(id),1);game.addToDiscard(0,id,{effect:'ability'});}ok(game.winner?.idx===0&&!game.storyMatch.progress.surprise,'Four points in one turn plus three in the next do not accumulate into the hidden one-turn goal');
 make();arrange();game.currentPlayerIdx=1;game.beginPlayerTurn(1);for(const id of seven){game.drawPile.splice(game.drawPile.indexOf(id),1);game.addToDiscard(0,id,{effect:'koishi',deferWinCheck:true});}
 ok(!game.storyMatch.progress.surprise,'Seven off-turn points do not count as the player’s own single turn');
 // Save semantics: victory remains mandatory, but the goals can be banked across wins.
 returnToMainMenu();openStoryChapter(6);assert(tutorialAllowsTrade());assert.equal(game.aiDifficulty,'normal');assert.equal(game.shopTiles.length,4);assert(el('tutorial-feedback').innerHTML.includes('☆☆☆'));game.storyMatch.progress.twoFactions=true;updateStoryProgress();assert.equal(storyBestStars(6),null);game.winner=game.players[0];updateStoryProgress();assert.equal(storyBestStars(6),1);
 returnToMainMenu();openStoryChapter(6);assert(el('tutorial-feedback').innerHTML.includes('☆☆☆'));game.storyMatch.progress.lockedFaction=true;game.winner=game.players[0];updateStoryProgress();returnToMainMenu();openStoryChapter(6);game.storyMatch.progress.surprise=true;game.winner=game.players[0];updateStoryProgress();
 ok(storyBestStars(6)===3&&!storyChapterPerfect(6)&&el('tutorial-feedback').innerHTML.includes('★☆☆'),'Chapter six banks distinct objectives over wins while each replay displays only its own stars');
 returnToMainMenu();openStoryChapter(6);game.storyMatch.progress={twoFactions:true,lockedFaction:true,surprise:true};game.winner=game.players[0];updateStoryProgress();ok(storyChapterPerfect(6)&&el('tutorial-feedback').classList.contains('story-perfect')&&storyStarColor(6)===FACTIONS.kourindou.color,'A one-match full clear uses Kourindou’s color');
 el('restart-btn').events.click();ok(game===null&&storyMenuChapter===null&&el('story-levels').children.length===6,'Finishing the sixth and final available chapter returns to the six-chapter menu');
 showStoryChapterIntro(6);ok(el('story-card-grid').children.length===7&&el('story-card-grid').children.every(node=>Number.isFinite(Number(node.dataset.angle))),'The actual introduction gives all seven fifth cards valid angles and both renewed and worn faces');closeStoryMenu();
 for(let seed=1;seed<=4;seed++){
  const g=make(seed,seed%2);g.players[0].isAI=true;let actions=0;const counts={place:0,draw:0,trade:0};
  while(!g.winner&&!g.stalemateMessage&&actions<200){const p=g.currentPlayerIdx;g.beginPlayerTurn(p);g.tradedThisTurn[p]=false;if(!canAct(p)){g.endPlayerTurn(p);g.currentPlayerIdx=1-p;if(!canAct(1-p)){endStalemate();break;}continue;}const original=aiDecideAction;aiDecideAction=async(...args)=>{const action=await original(...args);if(action.type==='pass')throw Error('Medium opponent skipped a legal action');counts[action.type]=(counts[action.type]||0)+1;return action;};let flags;try{flags=await doPlayerAction(p);}finally{aiDecideAction=original;}evalConservation(g);actions++;await afterAction(p,flags);}
  assert(g.winner||g.stalemateMessage);assert(actions<200);evalConservation(g);productionMatches.push({seed,actions,reason:g.stalemateMessage?'stalemate':'win',winner:g.winner?.idx??null,points:g.players.map(p=>g.winCount(p)),...counts});
 }
 ok(productionMatches.length===4,'Four real random chapter-six matches complete with ordinary Medium decisions, live shop trades and conserved cards, without strategic passes');
 return {status:'pass',count:checks.length,checks,rulesVersion:REWORK_RULES_VERSION,randomOpenings:512,burstRoutes:16,productionMatches,scope:'Real core rules, private random openings, normal-AI dispatch and difficulty features, shop exchanges, fifth-card and trap unlocks, actual faction claims and an eight-point one-turn Meiling route, current-only/cumulative stars, controlled chapter lifecycle and four full random matches. Browser pixels are not verified.'};
})()`,ctx).then(result=>{
 const material=fs.readFileSync(__dirname+'/card-materials-2026-10-12.cjs','utf8'),end="const copy='created_card_910'",renderBox={module:{exports:{}},require,__dirname,console};vm.runInNewContext(material.slice(0,material.indexOf(end))+'\nmodule.exports={ctx,A,el};',renderBox);const {ctx:render,A,el}=renderBox.module.exports;
 vm.runInContext(html.slice(html.indexOf('let titleCardDrag='),html.indexOf('function drawTitlePreviewCards('))+html.slice(html.indexOf('function tableCardBounds('),html.indexOf('function setTitleCardFace(')),render);
 render.cancelAnimationFrame=()=>{};render.online=null;render.window.localStorage={getItem:()=>null,setItem(){}};vm.runInContext(html.slice(html.indexOf('/* Guided practice uses'),html.indexOf('/* CSS lays out the phone table')),render);
 for(const language of ['en','zh-CN']){A.setLanguage(language);vm.runInContext('showStoryChapterIntro(6);',render);const text=el('story-intro').innerHTML;
 assert(text.includes(language==='en'?'Kourindou opens':'香霖堂开放'));assert(text.includes(language==='en'?'do something that surprises me!':'做点让我惊讶的东西吧！'));assert(!/7|seven|七|一回合/.test(text));assert(!text.includes('card-text-link'));assert.equal(el('story-card-grid').children.length,7);assert(el('story-card-grid').children.every(node=>node.innerHTML.includes('story-old-face')&&node.innerHTML.includes('story-new-face')&&node.values.get('--story-glow-color')));result.checks.push('The actual '+language+' sixth-chapter introduction shows all seven faction-colored renewed cards and keeps the surprise threshold hidden');}
 result.count=result.checks.length;fs.writeFileSync(__dirname+'/story-kourindou-2026-10-16-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' Kourindou checks, 512 private openings, sixteen actual burst clears and four full Medium matches passed');
}).catch(error=>{console.error(error);process.exitCode=1;});
