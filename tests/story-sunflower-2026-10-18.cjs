// Chapter-ten rules, actual hand-emptying routes, turn deadline and private AI.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{',box={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,storage};',box);const {ctx,storage}=box.module.exports;ctx.testStorage=storage;
let completed=false;process.once('beforeExit',()=>{if(!completed){console.error('Sunflower checks did not finish');process.exitCode=1;}});
vm.runInContext(`(async()=>{
 const checks=[],matches=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
 function choices(){game.ui={pickCell:async(_title,cells)=>cells[0],pickOwnHandCards:async()=>[],pickCardPool:async(_title,options)=>options[0]?.id};game.pickUI=async(p,method,args)=>game.ui[method]?.(...args);game.choosePlayer=async()=>1;}
 function make(seed=1,chapter=10){evalResetTokens();evalSetSeed(seed);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true});configureStoryMatch(game,chapter);game.players[0].isAI=false;choices();return game;}
 function copy(base,multiplier=1){const id='created_card_'+(++nextCreatedCard);CARD[id]=blueprintCopy(base,id,null,multiplier);return id;}
 function arrange({hands=[[],[]],board=[],discards=[[],[]],shop=['shop_rinnosuke','sdm_meiling','hourai_tewi','mtn_nitori']}={}){
  game.currentPlayerIdx=0;game.board=Array.from({length:4},()=>Array(4).fill(null));game.wasteland=game.board.map(row=>row.map(()=>false));game.players.forEach((p,i)=>{p.hand=hands[i].slice();p.discard=discards[i].slice();});game.shopCards=shop.slice();
  for(const[r,c,id]of board)game.setCardAt(r,c,id);
  const used=[...hands.flat(),...board.map(at=>at[2]),...discards.flat(),...shop.filter(Boolean)];assert.equal(used.length,new Set(used).size);assert(used.every(id=>CARD[id]));
  game.drawPile=CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion&&!used.includes(card.id)).map(card=>card.id);game.startingCardIds=new Set([...used,...game.drawPile]);game.handKnowledge=game.players.map(()=>new Map());game.reserveAges=game.players.map(()=>({}));game.winner=null;game.stalemateMessage='';evalConservation(game);
 }
 async function place(id,p=0,r=1,c=1){assert(game.players[p].hand.includes(id));game.currentPlayerIdx=p;game.removeFromHand(p,id);const flags=await game.internalPlace(id,r,c,p,0);evalConservation(game);return flags;}
 const openings=new Set(),stocks=new Set(),actors=new Set(),humanCards=new Set();
 for(let seed=1;seed<=1024;seed++){
  const g=make(seed),all=[...g.players.flatMap(p=>p.hand),...g.drawPile,...g.shopCards];assert(g.players.every(p=>p.hand.length===6&&p.hand.filter(id=>CARD[id].faction==='sunflower').length===1));
  assert.equal(all.length,40);assert.equal(new Set(all).size,40);assert(g.handKnowledge.every(memory=>memory.size===0));assert(!('openingHand' in g.storyMatch));assert.equal(g.aiDifficulty,'normal');assert(!aiIsTeachingOpponent(g,1));assert(g.kourindouEnabled);assert.equal(g.shopCards.length,4);assert.equal(g.shopCards[0],'shop_rinnosuke');assert(g.shopCards.slice(1).every(id=>storyShopCards(10).includes(id)));assert(!g.drawPile.some(id=>CARD[id].faction==='sunflower'));
  for(const card of CARDS)assert.equal(g.cardAbilityEnabled(card.id),!!(card.token||card.shopkeeper||g.storyMatch.skillFactions.includes(card.faction)),card.id);
  assert.equal(g.storyMatch.aiTurns,0);assert.equal(g.storyMatch.humanTurns,0);assert(!g.storyMatch.progress.emptyOpponent);evalConservation(g);openings.add(g.players[0].hand.slice().sort().join(','));stocks.add(g.shopCards.slice(1).join(','));actors.add(g.currentPlayerIdx);humanCards.add(g.players[0].hand.find(id=>CARD[id].faction==='sunflower'));
 }
 ok(openings.size>950&&stocks.size===60&&actors.size===2&&humanCards.size===2,'1024 conserved private six-card deals split Yuuka and Medicine between both seats, keep random first actors and retain all 60 unlocked shop orders');
 ok(storyChapterCards(10).join(',')==='yuuka,medicine'&&storyShopCards(10).join(',')===storyShopCards(9).join(','),'Exactly the two Sunflower originals gain skills, with no invented fifth card or extra shop restriction');
 for(let mask=0;mask<8;mask++){
  make();game.storyMatch.progress={sunflower:!!(mask&1),emptyOpponent:!!(mask&2)};game.storyMatch.humanTurns=mask&4?9:10;assert(!storyStarGoals(game).find(goal=>goal.key==='beforeTen').done);game.winner=game.players[0];assert.equal(storyMatchStars(game),[1,2,4].filter(bit=>mask&bit).length);game.winner=game.players[1];assert.equal(storyMatchStars(game),0);
 }
 ok(true,'All eight goal combinations award independent stars only after a human victory; the deadline star stays pending beforehand');
 for(const collector of [0,1]){make();arrange({board:[[0,0,'yuuka'],[0,1,'medicine']],hands:[['marisa'],['haku_youmu']]});game.checkClaims(collector);evalConservation(game);assert.equal(game.storyMatch.progress.sunflower,collector===0);}
 ok(true,'An actual complete Sunflower claim credits only the player who collects it');
 make();const clone=copy('medicine');arrange({board:[[0,0,'medicine'],[0,1,clone]],hands:[['marisa'],['haku_youmu']]});game.checkClaims(0);evalConservation(game);
 ok(game.storyMatch.progress.sunflower,'A legal same-prototype Sunflower pair also satisfies the faction objective');

 make();arrange({hands:[['medicine'],['hell_clownpiece','temple_murasa']]});await place('medicine');assert.equal(game.players[1].hand.length,0);const drawn=game.takeFromDrawPile(1);game.addToHand(1,drawn);evalConservation(game);
 ok(game.storyMatch.progress.emptyOpponent&&game.players[1].hand.length===1,'Medicine returning the last two cards earns a lasting objective even if the opponent later draws');
 make();arrange({hands:[['sdm_remilia'],['sdm_flandre','sdm_patchouli']]});await place('sdm_remilia');
 ok(game.storyMatch.progress.emptyOpponent&&game.players[1].hand.length===0&&game.players[0].hand.length===2,'Remilia taking the opponent’s last Mansion cards is a second real route to emptying their hand');
 make();arrange({hands:[['sdm_patchouli'],['hell_clownpiece']]});game.guessCardName=async()=> 'hell_clownpiece';await place('sdm_patchouli');
 ok(game.storyMatch.progress.emptyOpponent&&game.players[0].hand.includes('hell_clownpiece'),'A correct actual Patchouli guess taking the last card earns the objective');
 make();arrange({hands:[['palace_satori','medicine'],['hell_clownpiece']]});game.ui.pickOwnHandCards=async(_title,ids)=>ids.filter(id=>id==='medicine');game.chooseHandCard=async()=> 'hell_clownpiece';await place('palace_satori');
 ok(game.storyMatch.progress.emptyOpponent&&game.players[0].hand.includes('hell_clownpiece')&&game.drawPile.includes('medicine'),'Satori’s actual paid theft can empty the opponent without confusing the player’s cost with the goal');
 make();arrange({hands:[['sdm_flandre'],['hell_clownpiece']]});game.chooseHandCard=async()=> 'hell_clownpiece';await place('sdm_flandre');
 ok(game.storyMatch.progress.emptyOpponent&&game.players[1].discard.includes('hell_clownpiece'),'Flandre sending the opponent’s last hand card to their own discard also earns the objective');
 make();arrange({hands:[['hourai_kaguya'],['hourai_reisen']]});game.confirm=async()=>true;game.guessCardName=async()=> 'hourai_reisen';await place('hourai_kaguya');
 ok(game.storyMatch.progress.emptyOpponent&&game.isOnBoard('hourai_reisen'),'Kaguya taking and placing the opponent’s last guessed card records the empty hand');
 make();arrange({hands:[['medicine'],['hell_clownpiece']]});await place('hell_clownpiece',1);
 ok(game.storyMatch.progress.emptyOpponent,'The opponent’s own actual last-card placement counts during their turn');
 make();arrange({hands:[['medicine'],['haku_youmu']]});game.currentPlayerIdx=1;assert.equal(game.commitCostCards(1,['haku_youmu'],1,1),1);evalConservation(game);
 ok(game.storyMatch.progress.emptyOpponent&&game.players[1].hand.length===0,'An actual committed cost that spends the opponent’s last card is recorded');
 make();arrange({hands:[['medicine'],['sdm_sakuya','hell_clownpiece']]});const time=await place('sdm_sakuya',1);assert(!game.storyMatch.progress.emptyOpponent);time.afterExtra();evalConservation(game);
 ok(game.storyMatch.progress.emptyOpponent&&game.players[1].hand.length===0,'Sakuya’s real delayed bulk return is recorded after time resumes');
 make();arrange({hands:[['medicine'],['yuuka','hell_clownpiece']]});await place('yuuka',1);
 ok(game.storyMatch.progress.emptyOpponent&&game.players[1].hand.length===4,'Yuuka’s real bulk return records an empty hand before she refills it in the same turn');
 make();const doubled=copy('medicine',2);arrange({hands:[[doubled,'medicine'],['sdm_remilia','sdm_flandre','sdm_patchouli','sdm_sakuya']]});game.ui.pickOwnHandCards=async(_title,ids)=>ids.filter(id=>id==='medicine');await place(doubled);
 ok(game.storyMatch.progress.emptyOpponent&&game.players[1].hand.length===0&&game.createdActivations[doubled]===true,'A paid double Medicine copy can empty four opponent cards through real repeated resolutions');
 make();const trap=game.makeTrap();arrange({hands:[['medicine'],['hell_clownpiece',trap]]});await place('medicine');
 ok(!game.storyMatch.progress.emptyOpponent&&game.players[1].hand.length===1&&game.players[1].hand[0]===trap,'An unreturnable Trap still in the opponent’s hand prevents the zero-card objective');
 make();arrange({hands:[['hell_clownpiece'],['medicine']]});await place('hell_clownpiece');game.removeFromHand(1,'not_in_hand');
 ok(!game.storyMatch.progress.emptyOpponent&&game.players[0].hand.length===0,'Only the opponent’s real empty hand counts; an empty player hand or an invalid removal does not');
 make();arrange({hands:[['medicine'],['haku_youmu']]});game.currentPlayerIdx=1;const target=game.tradeCells()[0];assert(target);assert(game.tradeCard(1,'haku_youmu',target));evalConservation(game);
 ok(!game.storyMatch.progress.emptyOpponent&&game.players[1].hand.length===1,'An atomic one-card-for-one-card shop trade never invents an empty-hand event');
 make();arrange({hands:[['medicine','sdm_flandre'],['palace_satori','mtn_sanae']]});game.currentPlayerIdx=1;const before=JSON.stringify(game.storyMatch),hands=JSON.stringify(game.players.map(p=>p.hand));
 for(let seed=1;seed<=8;seed++){evalSetSeed(seed);await aiDecideAction(1,false);assert.equal(JSON.stringify(game.storyMatch),before);assert.equal(JSON.stringify(game.players.map(p=>p.hand)),hands);}
 ok(true,'Eight real AI evaluation seeds cannot leak speculative payments or hand previews into story progress');
 make();arrange({hands:[['medicine'],['haku_youmu']]});game.cancelled=true;game.removeFromHand(1,'haku_youmu');
 ok(!game.storyMatch.progress.emptyOpponent,'A retired match cannot earn new empty-hand progress');
 make(1,9);arrange({hands:[['medicine'],['haku_youmu']]});game.removeFromHand(1,'haku_youmu');
 ok(!('emptyOpponent' in game.storyMatch.progress),'Empty-hand tracking does not add objectives to earlier chapters');

 for(const first of [0,1]){
  make();let actor=first;while(game.storyMatch.humanTurns<9){game.currentPlayerIdx=actor;game.beginPlayerTurn(actor);game.endPlayerTurn(actor);actor=1-actor;}assert.equal(game.storyMatch.aiTurns,first===0?8:9);
  game.winner=game.players[0];assert.equal(game.storyMatch.humanTurns,9);assert(storyStarGoals(game).find(goal=>goal.key==='beforeTen').done);game.winner=null;game.beginPlayerTurn(0);const deadline=storyStarGoals(game).find(goal=>goal.key==='beforeTen');assert(deadline.failed&&!deadline.done&&!game.winner&&!game.stalemateMessage);game.winner=game.players[0];assert(!storyStarGoals(game).find(goal=>goal.key==='beforeTen').done);
 }
 ok(true,'Winning during the ninth player turn qualifies for either first actor; starting the tenth only fails that star and still permits a later chapter victory');
 make();arrange({hands:[['sdm_sakuya','hell_clownpiece','temple_murasa'],['medicine']]});game.storyMatch.humanTurns=7;game.beginPlayerTurn(0);const flags=await place('sdm_sakuya'),action=doPlayerAction;let extras=0;
 try{doPlayerAction=async p=>{assert.equal(p,0);const id=['hell_clownpiece','temple_murasa'][extras++];return await place(id,p,2+extras%2,2);};await afterAction(0,flags);}finally{doPlayerAction=action;}
 ok(extras===2&&game.storyMatch.humanTurns===10&&storyStarGoals(game).find(goal=>goal.key==='beforeTen').failed,'The production Sakuya follow-up loop counts both actual extra turns toward the ten-turn deadline');
 make();arrange({hands:[['haku_youmu','hell_clownpiece'],['medicine']]});game.beginPlayerTurn(0);const free=await place('haku_youmu'),originalAction=doPlayerAction;let freeActions=0;
 try{doPlayerAction=async p=>{freeActions++;return await place('hell_clownpiece',p,2,2);};await afterAction(0,free);}finally{doPlayerAction=originalAction;}
 ok(freeActions===1&&game.storyMatch.humanTurns===1,'Youmu’s turn-free follow-up stays within the current turn rather than consuming a second turn');

 for(const held of ['yuuka','medicine']){
  make();arrange({hands:[['mtn_sanae','haku_yuyuko'],[held,'hell_clownpiece']],board:[[0,0,'sage_ran']]});game.currentPlayerIdx=1;
  for(let turn=1;turn<=4;turn++){
   game.beginPlayerTurn(1);assert.equal(game.storyMatch.aiTurns,turn);assert.equal(aiPlacementCells(game,held,game.emptyOrWastelandForCard(CARD[held],1),1).length>0,turn>3);
   if(turn<=3)for(let seed=1;seed<=8;seed++){evalSetSeed(seed);const action=await aiDecideAction(1,false);assert(action.type!=='place'||action.cardId!==held);}
   game.endPlayerTurn(1);
  }
 }
 ok(true,'The actual Medium policy holds either Sunflower card for three normal AI turns across eight seeds, then releases it for evaluation on turn four');
 make();game.beginPlayerTurn(1);game.beginPlayerTurn(1,{continuation:true});game.beginPlayerTurn(0);game.beginPlayerTurn(0,{continuation:true});
 ok(game.storyMatch.aiTurns===1&&game.storyMatch.humanTurns===2,'AI holding counts normal AI turns while the player deadline includes actual extra turns');
 make();arrange({hands:[['mtn_sanae'],['medicine']],board:[[0,0,'sage_ran']]});game.currentPlayerIdx=1;game.beginPlayerTurn(1);assert(aiForcedPlacementCells(game,'medicine',game.emptyOrWastelandForCard(CARD.medicine,1)).length);game.players[0].hand.push(...game.drawPile.splice(0));assert(aiPlacementCells(game,'medicine',game.emptyOrWastelandForCard(CARD.medicine,1),1).length);assert(canAct(1));await doPlayerAction(1);evalConservation(game);
 ok(game.isOnBoard('medicine'),'The hold yields when no other placement or shared draw exists; forced placement remains legal and the AI cannot skip a playable turn');
 make(1,8);arrange({hands:[['mtn_sanae'],['medicine']]});game.currentPlayerIdx=1;
 ok(aiPlacementCells(game,'medicine',game.emptyOrWastelandForCard(CARD.medicine,1),1).length>0,'The Sunflower opening hold does not leak into earlier chapters');

 returnToMainMenu();testStorage.clear();openStoryMenu();ok(el('story-levels').children.length===13,'All thirteen chapters are replayable from the real story menu');
 const create=document.createElement;document.createElement=()=>{const node=create();node.values=new Map();node.style.setProperty=(key,value)=>node.values.set(key,value);return node;};
 showStoryChapterIntro(9);const shrine=new Map(el('story-card-grid').children.map(node=>[node.dataset.cardId,node]));
 ok(shrine.get('marisa').values.get('--story-glow-color')==='#ffeb3b'&&shrine.get('reimu').values.get('--story-glow-color')===FACTIONS.hakurei.color,'The real introduction gives only Marisa a yellow renewal scan and invitation glow while Reimu keeps Hakurei red');
 showStoryChapterIntro(10);const introduction=el('story-card-grid').children;
 ok(introduction.length===2&&introduction.map(node=>node.dataset.cardId).join(',')==='yuuka,medicine'&&introduction.every(node=>node.events.pointerdown&&node.events.click&&node.values.get('--story-glow-color')===FACTIONS.sunflower.color)&&el('story-intro').textContent===STORY_CHAPTERS[9].body,'The new pre-match introduction renders two movable active Sunflower cards with faction-colored renewal and the rules overview');document.createElement=create;
 el('story-begin').events.click();ok(isStoryMatch()&&game.storyMatch.chapter===10&&!tutorialState&&game.players.every(p=>p.hand.length===6&&p.hand.filter(id=>CARD[id].faction==='sunflower').length===1)&&el('tutorial-feedback').innerHTML.includes(STORY_CHAPTERS[9].hint),'Beginning the chapter starts one real private six-card deal and displays the exact separate hint');
 game.storyMatch.humanTurns=10;game.storyMatch.progress.sunflower=true;game.winner=game.players[0];updateStoryProgress();returnToMainMenu();openStoryChapter(10);game.storyMatch.humanTurns=10;game.storyMatch.progress.emptyOpponent=true;game.winner=game.players[0];updateStoryProgress();returnToMainMenu();openStoryChapter(10);game.storyMatch.humanTurns=9;game.winner=game.players[0];updateStoryProgress();
 ok(storyBestStars(10)===3&&!storyChapterPerfect(10),'Three independent winning runs can accumulate all goals without claiming a single-match perfect clear');
 returnToMainMenu();testStorage.clear();openStoryChapter(10);choices();arrange({hands:[['medicine','marisa','sdm_patchouli'],['hell_clownpiece','temple_murasa']],board:[[0,0,'yuuka'],[2,0,'sdm_remilia'],[2,1,'sdm_flandre'],[3,0,'sdm_sakuya'],[3,3,'sage_ran']]});
 game.beginPlayerTurn(0);await place('medicine',0,0,1);assert(game.storyMatch.progress.sunflower&&game.storyMatch.progress.emptyOpponent);game.endPlayerTurn(0);game.beginPlayerTurn(0);game.ui.pickCell=async(_title,cells)=>cells.find(cell=>game.cardAt(cell.r,cell.c)==='sage_ran');await place('marisa',0,1,1);game.endPlayerTurn(0);game.beginPlayerTurn(0);game.guessCardName=async()=>null;await place('sdm_patchouli',0,2,2);updateStoryProgress();
 ok(game.winner?.idx===0&&game.winCount(game.players[0])===7&&game.storyMatch.humanTurns===3&&storyMatchStars(game)===3&&storyChapterPerfect(10)&&el('tutorial-feedback').classList.contains('story-perfect')&&storyStarColor(10)===FACTIONS.sunflower.color,'A real Medicine empty-hand and Sunflower claim, Marisa blast, and Mansion claim win seven points in three player turns and save a gold perfect clear');
 el('restart-btn').events.click();ok(game===null&&storyMenuChapter===11&&el('story-card-grid').children.length===4,'Clearing Sunflower opens the four-card Hell introduction');
 for(let seed=1;seed<=4;seed++){
  const g=make(seed);g.players.forEach(p=>p.isAI=true);let actions=0;
  while(!g.winner&&!g.stalemateMessage&&actions<220){const p=g.currentPlayerIdx;g.beginPlayerTurn(p);g.tradedThisTurn[p]=false;if(!canAct(p)){g.endPlayerTurn(p);g.currentPlayerIdx=1-p;if(!canAct(1-p)){endStalemate();break;}continue;}const flags=await doPlayerAction(p);evalConservation(g);actions++;await afterAction(p,flags);}
  assert(g.winner||g.stalemateMessage);assert(actions<220);evalConservation(g);matches.push({seed,actions,winner:g.winner?.idx??null,stalemate:!!g.stalemateMessage,aiTurns:g.storyMatch.aiTurns,humanTurns:g.storyMatch.humanTurns});
 }
 ok(matches.length===4,'Four complete Medium Sunflower matches finish with conserved cards, the three-turn hold and active deadline tracking');
 return {status:'pass',count:checks.length,checks,openings:1024,matches,rulesVersion:REWORK_RULES_VERSION,scope:'Real private openings, ten distinct empty-hand routes and speculative/trade/Trap/cancellation negatives, ninth/tenth boundary, real Sakuya and Youmu follow-ups, AI holding and mandatory fallback, movable introduction renewal colors, cumulative and perfect saves, legal seven-point three-star route, and four complete Medium matches. Controlled DOM; no browser pixel verification.'};
})()`,ctx).then(result=>{
 const material=fs.readFileSync(__dirname+'/card-materials-2026-10-12.cjs','utf8'),materialBox={module:{exports:{}},require,__dirname,console};vm.runInNewContext(material.slice(0,material.indexOf("const copy='created_card_910'"))+'\nmodule.exports={A};',materialBox);const A=materialBox.module.exports.A;
 const values=JSON.parse(vm.runInContext('JSON.stringify([STORY_CHAPTERS[9].title,STORY_CHAPTERS[9].body,STORY_CHAPTERS[9].hint,...storyStarGoals({storyMatch:{chapter:10,humanTurns:0,progress:{}}}).map(goal=>goal.label)])',ctx));
 for(const language of ['en','zh-CN']){A.setLanguage(language);for(const value of values)assert.equal(A.translateGameText(value)===value,language==='en');}
 A.setLanguage('zh-CN');assert.equal(A.translateGameText(values[0]),'第十关 · 太阳花田');assert.equal(A.translateGameText(values[2]),'让对手有0张牌的方法可不只有一个哦，仔细想想？');assert.deepEqual(values.slice(3).map(value=>A.translateGameText(value)),['收取太阳花田阵营','任意回合内对手有0张牌','在你的第十回合前获胜']);result.checks.push('The real bilingual path translates the tenth title, rules, exact hint and all three objective labels');result.count=result.checks.length;
 fs.writeFileSync(__dirname+'/story-sunflower-2026-10-18-results.json',JSON.stringify(result,null,2)+'\n');completed=true;console.log(result.count+' Sunflower checks, 1024 private deals and four complete Medium matches passed');
}).catch(error=>{console.error(error.stack);process.exitCode=1;});
