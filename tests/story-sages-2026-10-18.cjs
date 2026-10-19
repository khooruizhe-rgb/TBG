// Real chapter-eight deals, claims, re-placement, menu lifecycle and chapter-seven AI guards.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{',box={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,storage};',box);const {ctx,storage}=box.module.exports;ctx.testStorage=storage;
let finished=false;process.once('beforeExit',()=>{if(!finished){console.error('Sage checks did not finish');process.exitCode=1;}});
vm.runInContext(`(async()=>{
 const checks=[],matches=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
 function make(seed=1,chapter=8){
  evalResetTokens();evalSetSeed(seed);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true});configureStoryMatch(game,chapter);game.players[0].isAI=false;
  game.ui.pickOwnHandCards=async()=>[];game.ui.pickCardPool=async(_title,options)=>options[0]?.id;game.ui.pickCell=async(_title,cells)=>cells[0];game.ui.pickAbilityCards=async()=>null;game.pickUI=async(p,method,args)=>game.ui[method]?.(...args);return game;
 }
 function arrange({hands=[[],[]],board=[],discards=[[],[]],shop=['shop_rinnosuke','sage_mai_satono','sdm_meiling','hourai_tewi']}={}){
  game.currentPlayerIdx=0;game.board=Array.from({length:4},()=>Array(4).fill(null));game.wasteland=game.board.map(row=>row.map(()=>false));game.players.forEach((p,i)=>{p.hand=hands[i].slice();p.discard=discards[i].slice();});game.shopCards=shop.slice();
  for(const[r,c,id]of board)game.setCardAt(r,c,id);
  const used=[...hands.flat(),...discards.flat(),...board.map(at=>at[2]),...shop.filter(Boolean)];assert.equal(used.length,new Set(used).size);assert(used.every(id=>CARD[id]));
  game.drawPile=CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion&&!used.includes(card.id)).map(card=>card.id);game.startingCardIds=new Set([...used,...game.drawPile]);game.handKnowledge=game.players.map(()=>new Map());game.reserveAges=game.players.map(()=>({}));game.winner=null;game.stalemateMessage='';evalConservation(game);
 }
 async function place(id,p=0,r=1,c=1){assert(game.players[p].hand.includes(id));game.removeFromHand(p,id);const flags=await game.internalPlace(id,r,c,p,0);evalConservation(game);return flags;}
 function copy(source){const id='created_card_'+(++nextCreatedCard);CARD[id]=blueprintCopy(source,id);game.startingCardIds.add(id);return id;}
 const openings=new Set(),stocks=new Set(),actors=new Set();
 for(let seed=1;seed<=1024;seed++){
  const g=make(seed),all=[...g.players.flatMap(p=>p.hand),...g.drawPile,...g.shopCards];
  assert(g.players.every(p=>p.hand.length===6));assert(g.players[0].hand.includes('sage_matara'));assert(g.players[0].hand.filter(id=>CARD[id].faction==='sage').length>=2);
  assert.equal(all.length,40);assert.equal(new Set(all).size,40);assert(g.drawPile.filter(id=>CARD[id].faction==='sage').every(id=>g.drawPile.slice(-5).includes(id)));assert(g.shopCards[0]==='shop_rinnosuke'&&g.shopCards.includes('sage_mai_satono')&&g.shopCards.length===4);
  assert(g.handKnowledge.every(memory=>memory.size===0));assert(!('openingHand' in g.storyMatch));assert.equal(g.aiDifficulty,'normal');assert(!aiIsTeachingOpponent(g,1));assert(g.kourindouEnabled);assert(CARDS.filter(c=>c.shopExpansion&&!storyShopCards(8).includes(c.id)).every(c=>!all.includes(c.id)));
  for(const card of CARDS)assert.equal(g.cardAbilityEnabled(card.id),!!(card.token||card.shopkeeper||g.storyMatch.skillFactions.includes(card.faction)),card.id);
  evalConservation(g);openings.add(g.players[0].hand.slice().sort().join(','));stocks.add(g.shopCards.slice(1).join(','));actors.add(g.currentPlayerIdx);
 }
 ok(openings.size>850&&stocks.size===36&&actors.size===2,'1024 private six-card deals preserve inventory, both first actors, Matara plus another Sage, top-five undealt Sages, mandatory dancers and randomized unlocked stock');
 ok(storyChapterCards(8).slice().sort().join(',')===['sage_yukari','sage_matara','sage_kasen','sage_ran'].sort().join(',')&&storyShopCards(8).includes('sage_mai_satono')&&!storyChapterCards(8).includes('sage_mai_satono'),'The introduction contains exactly four core Sages and leaves the dancers for shop discovery');
 for(let mask=0;mask<8;mask++){
  make(mask+1);game.storyMatch.progress={sage:!!(mask&1),sameCardFaction:!!(mask&2),placeTwice:!!(mask&4)};assert.equal(storyMatchStars(game),0);game.winner=game.players[0];assert.equal(storyMatchStars(game),[1,2,4].filter(bit=>mask&bit).length);game.winner=game.players[1];assert.equal(storyMatchStars(game),0);
 }
 ok(true,'All eight objective combinations award independent stars only after a player victory');
 make();arrange({board:[[1,1,'sage_yukari'],[1,2,'sage_matara'],[2,1,'sage_kasen'],[2,2,'sage_ran']]});game.checkClaims(0);
 ok(game.storyMatch.progress.sage&&game.players[0].discard.length===4,'An actual four-card Sage claim satisfies the first objective');
 make();arrange({board:[[1,1,'sage_yukari'],[1,2,'sage_matara'],[2,1,'sage_kasen'],[2,2,'sage_ran']]});game.checkClaims(1);
 ok(!game.storyMatch.progress.sage,'An opponent Sage claim does not earn the player a star');
 make();arrange({hands:[['sage_matara','sage_yukari','sage_ran','sage_kasen','yuuka'],[]],board:[[0,0,'medicine'],[3,0,'hourai_mokou'],[3,3,'sdm_patchouli']]});
 game.ui.pickAbilityCards=async(_title,ids)=>ids.includes('medicine')?'medicine':null;game.ui.pickCell=async(_title,cells)=>cells.find(at=>at.r===0&&at.c===1);
 await place('sage_matara',0,2,2);const created=game.players[0].discard.find(id=>CARD[id]?.createdCopy);
 ok(created&&cardBaseId(created)==='medicine'&&game.players[0].discard.includes('medicine')&&game.storyMatch.progress.sameCardFaction&&game.winCount(game.players[0])===2,'Real Matara creation and immediate placement claim a two-card faction from one original prototype');
 assert.equal(game.storyMatch.placementCounts.sage_matara,1);game.ui.pickAbilityCards=async()=>null;
 await place('sage_yukari',0,2,2);assert(game.players[0].hand.includes('sage_matara'));await place('sage_matara',0,2,3);
 ok(game.storyMatch.progress.placeTwice&&game.storyMatch.placementCounts.sage_matara===2,'Yukari returns the actual Matara card, whose second successful placement earns the re-placement objective');
 // Ran draws the last Sage and, with Yukari active, really places it immediately.
 game.removeFromHand(0,'sage_kasen');game.drawPile.push('sage_kasen');game.ui.pickCell=async(_title,cells)=>cells.find(at=>at.r===1&&at.c===3);
 await place('sage_ran',0,1,2);assert(game.storyMatch.progress.sage&&game.winCount(game.players[0])===6);await place('yuuka',0,0,0);
 // Yuuka alone cannot pair with the already discarded Medicine; finish with a real Hakurei pair.
 for(const id of ['reimu','marisa']){const index=game.drawPile.indexOf(id);assert(index>=0);game.drawPile.splice(index,1);game.addToHand(0,id);}
 await place('reimu',0,0,2);await place('marisa',0,0,3);
 ok(game.winner?.idx===0&&game.winCount(game.players[0])===8&&storyMatchStars(game)===3,'One legal eight-point route creates a same-type pair, re-places Matara, claims the Sages and wins with all three objectives');
 for(const p of [0,1]){
  make();arrange();const id=copy('reimu');game.drawPile.splice(game.drawPile.indexOf('reimu'),1);game.setCardAt(0,0,'reimu');game.setCardAt(0,1,id);game.checkClaims(p);evalConservation(game);assert.equal(!!game.storyMatch.progress.sameCardFaction,p===0);
 }
 ok(true,'Same-prototype copy claims are credited to the actual collector only');
 make();arrange({board:[[0,0,'reimu'],[0,1,'marisa']]});game.checkClaims(0);
 ok(!game.storyMatch.progress.sameCardFaction,'An ordinary two-card pair with different prototypes does not satisfy the copy objective');
 make();arrange();const copies=[copy('sage_ran'),copy('sage_ran'),copy('sage_ran'),copy('sage_ran')];copies.forEach((id,i)=>game.setCardAt(Math.floor(i/2),i%2,id));game.checkClaims(0);evalConservation(game);
 ok(game.storyMatch.progress.sage&&game.storyMatch.progress.sameCardFaction,'Four identical Sage copies also satisfy the literal single-card-type faction objective');
 make();arrange({hands:[['sage_kasen'],[]]});await place('sage_kasen',0,0,0);game.moveBoardToHand(0,0,1);await place('sage_kasen',1,0,1);
 ok(!game.storyMatch.progress.placeTwice,'One placement by each seat is not two player placements');
 make();arrange({hands:[['sage_kasen'],[]],board:[[0,0,'hourai_mokou']]});await game.internalPlace('sage_kasen',0,0,0,0);game.wouldCompleteFaction('sage_kasen',1,1);
 ok(!game.storyMatch.placementCounts.sage_kasen&&!game.storyMatch.progress.placeTwice,'Rejected occupied placements and speculative placement checks never increment the counter');
 make();arrange();const a=copy('sage_kasen'),b=copy('sage_kasen');game.addToHand(0,a);game.addToHand(0,b);await place(a,0,0,0);await place(b,0,0,1);
 ok(game.storyMatch.placementCounts[a]===1&&game.storyMatch.placementCounts[b]===1&&!game.storyMatch.progress.placeTwice,'Two separately created copies do not count as placing one physical card twice');
 make();arrange({hands:[['sage_kasen'],[]]});await place('sage_kasen',0,0,0);game.moveBoardToHand(0,0,0);await place('sage_kasen',0,0,1);
 ok(game.storyMatch.progress.placeTwice,'A genuine return to hand followed by a second player placement counts even with no active Placed skill');
 make();arrange({hands:[['sdm_sakuya'],[]]});await place('sdm_sakuya',0,0,0);
 ok(game.storyMatch.placementCounts.sdm_sakuya===1&&!game.storyMatch.progress.placeTwice,'Granting extra turns is still just one card placement');
 // Chapter-seven AI restrictions are strategic: forced decrees and automatic abilities retain real rules.
 for(const chapter of [7,8]){
  make(11,chapter);arrange({hands:[[],['palace_koishi','palace_rin','hourai_mokou']]});game.currentPlayerIdx=1;
  const spaces=game.emptyOrWastelandForCard(CARD.palace_koishi,1),mary=aiPlacementCells(game,'palace_koishi',spaces,1),rin=aiPlacementCells(game,'palace_rin',spaces,1);
  assert.equal(mary.length===0,chapter===7);assert.equal(rin.length===0,chapter===7);assert(aiPlacementCells(game,'palace_koishi',spaces,0).length);assert(aiForcedPlacementCells(game,'palace_koishi',spaces).length);
 }
 ok(true,'Only the chapter-seven opponent avoids voluntary Mary and empty-discard Rin placements; human choices, forced decrees and chapter eight retain ordinary rules');
 make(11,7);arrange({hands:[[],['palace_koishi','palace_rin','hourai_mokou']]});game.currentPlayerIdx=1;
 for(let seed=1;seed<=32;seed++){evalSetSeed(seed);const action=await aiDecideAction(1,false);assert(action.type!=='place'||!['palace_koishi','palace_rin'].includes(action.cardId));}
 ok(true,'The real Medium action policy chooses a different card or draws across 32 seeds instead of leaking a forbidden placement');
 for(const owner of [0,1]){
  make(13,7);arrange({hands:[[],['palace_rin']],discards:owner?[[],['reimu']]:[['reimu'],[]]});game.currentPlayerIdx=1;assert(aiPlacementCells(game,'palace_rin',game.emptyOrWastelandForCard(CARD.palace_rin,1),1).length);
 }
 ok(true,'A card in either player discard pile makes Rin available to the chapter-seven opponent');
 make(15,7);arrange({hands:[[],['palace_rin','palace_koishi','hourai_mokou']]});game.currentPlayerIdx=1;await doPlayerAction(1);evalConservation(game);
 ok(!game.isOnBoard('palace_rin')&&!game.isOnBoard('palace_koishi'),'The actual AI turn executor respects both chapter-seven filters');
 returnToMainMenu();testStorage.clear();openStoryMenu();ok(el('story-levels').children.length===14,'The menu exposes fourteen replayable story chapters');showStoryChapterIntro(8);
 ok(el('story-card-grid').children.length===4&&el('story-card-grid').children.every(node=>CARD[node.dataset.cardId].faction==='sage'&&!CARD[node.dataset.cardId].shopExpansion),'The real chapter-eight introduction shows four movable Sage cards without the fifth card');
 el('story-begin').events.click();ok(isStoryMatch()&&game.storyMatch.chapter===8&&!tutorialState&&game.players[0].hand.includes('sage_matara'),'The eighth chapter starts directly with its guaranteed opening and no extra prelude');
 game.storyMatch.progress.sage=true;game.winner=game.players[0];updateStoryProgress();assert.equal(storyBestStars(8),1);returnToMainMenu();openStoryChapter(8);game.storyMatch.progress.sameCardFaction=true;game.winner=game.players[0];updateStoryProgress();returnToMainMenu();openStoryChapter(8);game.storyMatch.progress.placeTwice=true;game.winner=game.players[0];updateStoryProgress();
 ok(storyBestStars(8)===3&&!storyChapterPerfect(8),'Different victories can collect all three stars without marking a single-match perfect clear');
 returnToMainMenu();openStoryChapter(8);game.storyMatch.progress={sage:true,sameCardFaction:true,placeTwice:true};game.winner=game.players[0];updateStoryProgress();
 ok(storyChapterPerfect(8)&&[0,1,2].map(i=>storyStarColor(8,i)).join(',')===['#f39ac7','#b8860b','#5b2b85'].join(',')&&el('tutorial-feedback').classList.contains('story-perfect'),'A perfect one-match clear uses pink, dark gold and deep purple Sage stars in the requested order');
 el('restart-btn').events.click();ok(game===null&&storyMenuChapter===9&&el('story-card-grid').children.length===2,'Clearing chapter eight opens the Hakurei introduction');
 for(let seed=1;seed<=4;seed++){
  const g=make(seed);g.players.forEach(p=>p.isAI=true);let actions=0;
  while(!g.winner&&!g.stalemateMessage&&actions<220){const p=g.currentPlayerIdx;g.beginPlayerTurn(p);g.tradedThisTurn[p]=false;if(!canAct(p)){g.endPlayerTurn(p);g.currentPlayerIdx=1-p;if(!canAct(1-p)){endStalemate();break;}continue;}const flags=await doPlayerAction(p);evalConservation(g);actions++;await afterAction(p,flags);}
  assert(g.winner||g.stalemateMessage);assert(actions<220);evalConservation(g);matches.push({seed,actions,winner:g.winner?.idx??null,stalemate:!!g.stalemateMessage});
 }
 ok(matches.length===4,'Four complete chapter-eight Medium matches finish with conserved originals and created cards');
 return {status:'pass',count:checks.length,checks,openings:1024,matches,rulesVersion:REWORK_RULES_VERSION,scope:'Real randomized private deals, Sage ability unlocks, Matara creation and same-prototype two-card claims, entity-specific repeated placements, legal perfect-clear route, chapter-seven voluntary AI guards, real menus and cumulative stars, four complete Medium matches. Controlled DOM; no browser pixel verification.'};
})()`,ctx).then(result=>{
 const material=fs.readFileSync(__dirname+'/card-materials-2026-10-12.cjs','utf8'),materialBox={module:{exports:{}},require,__dirname,console};vm.runInNewContext(material.slice(0,material.indexOf("const copy='created_card_910'"))+'\nmodule.exports={A};',materialBox);const A=materialBox.module.exports.A;
 const messages=vm.runInContext('JSON.stringify([STORY_CHAPTERS[7].title,STORY_CHAPTERS[7].body,STORY_CHAPTERS[6].hint,...storyStarGoals({storyMatch:{chapter:8,progress:{}}}).map(goal=>goal.label)])',ctx);
 for(const language of ['en','zh-CN']){A.setLanguage(language);for(const message of JSON.parse(messages)){const translated=A.translateGameText(message);assert.equal(translated===message,language==='en');if(language==='zh-CN')assert(/[\u3400-\u9fff]/.test(translated));}}
 result.checks.push('The chapter-eight title, overview, objectives and exact new Mary hint translate through the actual bilingual path');result.count=result.checks.length;
 fs.writeFileSync(__dirname+'/story-sages-2026-10-18-results.json',JSON.stringify(result,null,2)+'\n');finished=true;console.log(result.count+' Sage checks, 1024 private openings and four complete Medium matches passed');
}).catch(error=>{console.error(error.stack);process.exitCode=1;});
