// Chapter-nine openings, real skill/claim settlement, early AI holding and story lifecycle.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{',box={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,storage};',box);const {ctx,storage}=box.module.exports;ctx.testStorage=storage;
let completed=false;process.once('beforeExit',()=>{if(!completed){console.error('Hakurei checks did not finish');process.exitCode=1;}});
vm.runInContext(`(async()=>{
 const checks=[],matches=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
 function make(seed=1,chapter=9){evalResetTokens();evalSetSeed(seed);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true});configureStoryMatch(game,chapter);game.players[0].isAI=false;game.ui.pickCell=async(_title,cells)=>cells[0];game.ui.pickOwnHandCards=async()=>[];game.ui.pickCardPool=async(_title,options)=>options[0]?.id;game.pickUI=async(p,method,args)=>game.ui[method]?.(...args);return game;}
 function copy(base,multiplier=1){const id='created_card_'+(++nextCreatedCard);CARD[id]=blueprintCopy(base,id,null,multiplier);return id;}
 function arrange({hands=[[],[]],board=[],discards=[[],[]],shop=['shop_rinnosuke','sdm_meiling','hourai_tewi','mtn_nitori']}={}){
  game.currentPlayerIdx=0;game.board=Array.from({length:4},()=>Array(4).fill(null));game.wasteland=game.board.map(row=>row.map(()=>false));game.players.forEach((p,i)=>{p.hand=hands[i].slice();p.discard=discards[i].slice();});game.shopCards=shop.slice();
  for(const[r,c,id]of board)game.setCardAt(r,c,id);
  const used=[...hands.flat(),...board.map(at=>at[2]),...discards.flat(),...shop.filter(Boolean)];assert.equal(used.length,new Set(used).size);assert(used.every(id=>CARD[id]));
  game.drawPile=CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion&&!used.includes(card.id)).map(card=>card.id);game.startingCardIds=new Set([...used,...game.drawPile]);game.handKnowledge=game.players.map(()=>new Map());game.reserveAges=game.players.map(()=>({}));game.winner=null;game.stalemateMessage='';evalConservation(game);
 }
 async function place(id,p=0,r=1,c=1){assert(game.players[p].hand.includes(id));game.removeFromHand(p,id);const flags=await game.internalPlace(id,r,c,p,0);evalConservation(game);return flags;}
 const openings=new Set(),stocks=new Set(),actors=new Set(),humanCards=new Set();
 for(let seed=1;seed<=1024;seed++){
  const g=make(seed),all=[...g.players.flatMap(p=>p.hand),...g.drawPile,...g.shopCards];assert(g.players.every(p=>p.hand.length===6&&p.hand.filter(id=>CARD[id].faction==='hakurei').length===1));
  assert.equal(all.length,40);assert.equal(new Set(all).size,40);assert(g.handKnowledge.every(memory=>memory.size===0));assert(!('openingHand' in g.storyMatch));assert.equal(g.aiDifficulty,'normal');assert(!aiIsTeachingOpponent(g,1));assert(g.kourindouEnabled);assert.equal(g.shopCards.length,4);assert.equal(g.shopCards[0],'shop_rinnosuke');assert(g.shopCards.slice(1).every(id=>storyShopCards(9).includes(id)));assert(!g.drawPile.some(id=>CARD[id].faction==='hakurei'));
  for(const card of CARDS)assert.equal(g.cardAbilityEnabled(card.id),!!(card.token||card.shopkeeper||g.storyMatch.skillFactions.includes(card.faction)),card.id);
  assert.equal(g.storyMatch.aiTurns,0);assert(!g.storyMatch.opponentClaimedFaction);evalConservation(g);openings.add(g.players[0].hand.slice().sort().join(','));stocks.add(g.shopCards.slice(1).join(','));actors.add(g.currentPlayerIdx);humanCards.add(g.players[0].hand.find(id=>CARD[id].faction==='hakurei'));
 }
 ok(openings.size>950&&stocks.size===60&&actors.size===2&&humanCards.size===2,'1024 random private six-card deals split Reimu and Marisa between the two seats, retain random first actors and all 60 unlocked shop orders');
 ok(storyChapterCards(9).join(',')==='reimu,marisa'&&storyShopCards(9).join(',')===storyShopCards(8).join(','),'The introduction unlocks exactly two Hakurei originals without inventing a fifth card');
 for(let mask=0;mask<8;mask++){
  make(mask+1);game.storyMatch.progress={hakurei:!!(mask&1),marisaSage:!!(mask&2)};game.storyMatch.opponentClaimedFaction=!(mask&4);assert.equal(storyStarGoals(game).find(goal=>goal.key==='beforeClaim').done,false);game.winner=game.players[0];assert.equal(storyMatchStars(game),[1,2,4].filter(bit=>mask&bit).length);game.winner=game.players[1];assert.equal(storyMatchStars(game),0);
 }
 ok(true,'All objective combinations save stars only after a player victory; the no-opponent-claim star remains pending until then');
 for(const collector of [0,1]){
  make();arrange({board:[[0,0,'reimu'],[0,1,'marisa']]});game.checkClaims(collector);evalConservation(game);assert.equal(game.storyMatch.progress.hakurei,collector===0);assert.equal(game.storyMatch.opponentClaimedFaction,collector===1);
 }
 ok(true,'A real Hakurei claim credits its collector and permanently marks an opponent claim only for the AI seat');
 for(const target of ['sage_ran','sage_mai_satono','hourai_eirin']){
  make();arrange({hands:[['marisa'],[]],board:[[0,0,target]]});await place('marisa');assert(game.players[0].discard.includes(target));assert(game.storyMatch.progress.marisaSage);ok(true,'Actual Marisa discarding '+target+' satisfies the Sage goal, including Eirin’s hidden exception');
 }
 make();const eirin=copy('hourai_eirin');arrange({hands:[['marisa'],[]],board:[[0,0,eirin]]});await place('marisa');
 ok(game.storyMatch.progress.marisaSage&&game.players[0].discard.includes(eirin),'An Eirin copy retains the moon-Sage exception through its original identity');
 make();const caster=copy('marisa');arrange({hands:[[caster,'medicine'],[]],board:[[0,0,'sage_ran']]});game.ui.pickOwnHandCards=async(_title,ids)=>ids.filter(id=>id==='medicine');await place(caster);
 ok(game.storyMatch.progress.marisaSage&&game.drawPile.includes('medicine'),'Using the actual paid Marisa ability from a created card also earns the ability goal');
 make();arrange({hands:[['marisa'],[]],board:[[0,0,'hourai_mokou']]});await place('marisa');ok(!game.storyMatch.progress.marisaSage,'Marisa discarding an unrelated faction card does not earn the Sage goal');
 make();arrange({hands:[['marisa'],[]],board:[[0,0,'sage_ran']]});game.ui.pickCell=async()=>null;await place('marisa');ok(!game.storyMatch.progress.marisaSage&&game.isOnBoard('sage_ran'),'Cancelling a blast never records an unperformed objective');
 make();arrange({hands:[[],['marisa']],board:[[0,0,'hourai_eirin']]});game.currentPlayerIdx=1;await place('marisa',1);
 ok(!game.storyMatch.progress.marisaSage&&!game.storyMatch.opponentClaimedFaction,'An opponent’s actual skill discard neither earns the player’s skill goal nor counts as an opponent faction claim');
 make();arrange({board:[[0,0,'hourai_eirin']]});game.moveBoardToDiscard(0,0,0,'yuyuko');ok(!game.storyMatch.progress.marisaSage,'Eirin reaching the discard through another effect does not earn the Marisa goal');
 make();arrange({hands:[['marisa'],[]],board:[[0,0,'sage_kasen']]});assert(!game.marisaTargets(1,1,false,true).some(cell=>cell.id==='sage_kasen'));await place('marisa');
 ok(!game.storyMatch.progress.marisaSage&&game.isOnBoard('sage_kasen'),'The objective does not grant Marisa permission to blast an otherwise ineligible Crown Sage');
 make();arrange({hands:[['marisa'],[]],board:[[0,0,'hourai_eirin']],discards:[['reimu','haku_youmu','sdm_remilia','sdm_flandre','mtn_sanae','mtn_aya'],[]]});await place('marisa');
 ok(game.winner?.idx===0&&game.storyMatch.progress.marisaSage&&storyStarGoals(game).find(goal=>goal.key==='beforeClaim').done,'A winning Eirin blast records the hidden goal before the victory can be saved');
 make();arrange({board:[[0,0,'reimu'],[0,1,'marisa']]});game.checkClaims(1);const rin=copy('palace_rin',2);game.startingCardIds.add(rin);game.addToHand(0,rin);const at=game.drawPile.indexOf('medicine');game.drawPile.splice(at,1);game.addToHand(0,'medicine');game.ui.pickOwnHandCards=async(_title,ids)=>ids.filter(id=>id==='medicine');game.ui.pickCardPool=async(_title,options)=>options.find(item=>item.group===1)?.id;
 await place(rin);assert.equal(game.players[1].discard.length,0);game.winner=game.players[0];
 ok(game.storyMatch.opponentClaimedFaction&&storyStarGoals(game).find(goal=>goal.key==='beforeClaim').failed,'Retrieving all AI-discarded claim cards with a real doubled Rin does not erase the historical race failure');
 for(const held of ['reimu','marisa']){
  make();arrange({hands:[[],[held,'hell_clownpiece']],board:[[0,0,held==='reimu'?'marisa':'reimu'],[3,3,held==='reimu'?'sage_matara':'sage_ran']]});game.currentPlayerIdx=1;
  for(let turn=1;turn<=4;turn++){
   game.beginPlayerTurn(1);assert.equal(game.storyMatch.aiTurns,turn);const cells=aiPlacementCells(game,held,game.emptyOrWastelandForCard(CARD[held],1),1);assert.equal(cells.length>0,turn>3);
   if(turn<=3)for(let seed=1;seed<=8;seed++){evalSetSeed(seed);const action=await aiDecideAction(1,false);assert(action.type!=='place'||action.cardId!==held);}
   game.endPlayerTurn(1);
  }
 }
 ok(true,'The real Medium policy excludes either Hakurei card for its first three normal turns and releases it on turn four across eight decision seeds');
 make();game.currentPlayerIdx=1;game.beginPlayerTurn(1);game.beginPlayerTurn(1,{continuation:true});game.beginPlayerTurn(0);ok(game.storyMatch.aiTurns===1,'Bonus continuations and the human turn do not consume the AI’s three-normal-turn holding period');
 make();arrange({hands:[[],['reimu']],board:[[0,0,'sage_matara']]});game.currentPlayerIdx=1;game.beginPlayerTurn(1);assert(aiForcedPlacementCells(game,'reimu',game.emptyOrWastelandForCard(CARD.reimu,1)).length);
 game.players[0].hand.push(...game.drawPile.splice(0));const cells=aiPlacementCells(game,'reimu',game.emptyOrWastelandForCard(CARD.reimu,1),1);assert(cells.length&&canAct(1));await doPlayerAction(1);evalConservation(game);
 ok(game.isOnBoard('reimu'),'Holding yields when shared drawing and other placements are impossible, preserving the rule that a legal action cannot be skipped');
 make(1,8);arrange({hands:[[],['marisa']],board:[[0,0,'sage_ran']]});game.currentPlayerIdx=1;ok(aiPlacementCells(game,'marisa',game.emptyOrWastelandForCard(CARD.marisa,1),1).length>0,'The early-Hakurei holding rule does not affect other chapters');
 // A complete legal three-star route uses Satori to take the held partner.
 make();arrange({hands:[['palace_satori','medicine','marisa','sdm_patchouli'],['reimu']],board:[[0,0,'sdm_remilia'],[0,1,'sdm_sakuya'],[1,0,'sdm_flandre'],[3,3,'sage_ran']]});game.choosePlayer=async()=>1;game.chooseHandCard=async()=> 'reimu';game.ui.pickOwnHandCards=async(_title,ids)=>ids.filter(id=>id==='medicine');
 await place('palace_satori',0,2,2);assert(game.players[0].hand.includes('reimu'));game.ui.pickCell=async(_title,cells)=>cells.find(cell=>game.cardAt(cell.r,cell.c)==='sage_ran');await place('marisa',0,3,2);assert(game.storyMatch.progress.marisaSage);
 game.ui.pickCell=async(_title,cells)=>cells.find(cell=>game.cardAt(cell.r,cell.c)==='palace_satori');await place('reimu',0,3,3);assert(game.storyMatch.progress.hakurei&&game.winCount(game.players[0])===3);await place('sdm_patchouli',0,1,1);
 ok(game.winner?.idx===0&&game.winCount(game.players[0])===7&&storyMatchStars(game)===3&&!game.storyMatch.opponentClaimedFaction,'Real Satori theft, Marisa’s Sage blast, a Hakurei pair and a Mansion claim produce a legal seven-point three-star victory');
 returnToMainMenu();testStorage.clear();openStoryMenu();ok(el('story-levels').children.length===9,'The menu includes nine replayable chapters');
 for(const chapter of [8,9]){
  const definition=STORY_CHAPTERS[chapter-1];assert.equal(el('story-levels').children[chapter-1].children[1].textContent,definition.body);assert(definition.body.includes('Three stars:'));assert(!definition.body.includes(definition.hint));
  showStoryChapterIntro(chapter);assert.equal(el('story-intro').textContent,definition.body);assert.equal(el('story-card-grid').children.length,chapter===8?4:2);el('story-begin').events.click();
  assert.equal(game.storyMatch.chapter,chapter);assert.equal(el('tutorial-copy').textContent,'');assert(el('tutorial-feedback').innerHTML.includes(definition.hint));assert(!el('tutorial-feedback').innerHTML.includes(definition.body));returnToMainMenu();openStoryMenu();
 }
 ok(true,'Chapters eight and nine render rules and three goals in selection and card introductions, then their separate flavor hints on the live objective paper');showStoryChapterIntro(9);ok(el('story-card-grid').children.length===2&&el('story-card-grid').children.every(node=>CARD[node.dataset.cardId].faction==='hakurei'),'The actual new introduction displays two movable Hakurei cards');
 el('story-begin').events.click();ok(isStoryMatch()&&game.storyMatch.chapter===9&&!tutorialState&&game.players.every(p=>p.hand.filter(id=>CARD[id].faction==='hakurei').length===1),'The new introduction starts the real private constrained deal without an extra prelude');
 game.storyMatch.progress.hakurei=true;game.storyMatch.opponentClaimedFaction=true;game.winner=game.players[0];updateStoryProgress();assert.equal(storyBestStars(9),1);returnToMainMenu();openStoryChapter(9);game.storyMatch.progress.marisaSage=true;game.winner=game.players[0];updateStoryProgress();
 ok(storyBestStars(9)===3&&!storyChapterPerfect(9),'The three new objective keys accumulate across wins without inventing a one-match perfect clear');returnToMainMenu();openStoryChapter(9);game.storyMatch.progress={hakurei:true,marisaSage:true};game.winner=game.players[0];updateStoryProgress();
 ok(storyChapterPerfect(9)&&storyStarColor(9)===FACTIONS.hakurei.color&&el('tutorial-feedback').classList.contains('story-perfect'),'A one-match perfect clear uses Hakurei’s red faction stars');el('restart-btn').events.click();ok(game===null&&storyMenuChapter===null&&el('story-levels').children.length===9,'Clearing the ninth chapter returns to the expanded chapter list');
 for(let seed=1;seed<=4;seed++){
  const g=make(seed);g.players.forEach(p=>p.isAI=true);let actions=0;
  while(!g.winner&&!g.stalemateMessage&&actions<220){const p=g.currentPlayerIdx;g.beginPlayerTurn(p);g.tradedThisTurn[p]=false;if(!canAct(p)){g.endPlayerTurn(p);g.currentPlayerIdx=1-p;if(!canAct(1-p)){endStalemate();break;}continue;}const flags=await doPlayerAction(p);evalConservation(g);actions++;await afterAction(p,flags);}
  assert(g.winner||g.stalemateMessage);assert(actions<220);evalConservation(g);matches.push({seed,actions,winner:g.winner?.idx??null,stalemate:!!g.stalemateMessage,aiTurns:g.storyMatch.aiTurns});
 }
 ok(matches.length===4,'Four complete Medium chapter-nine matches finish with conserved cards and the holding policy');
 return {status:'pass',count:checks.length,checks,openings:1024,matches,rulesVersion:REWORK_RULES_VERSION,scope:'Real constrained private deals, Marisa and Eirin/copy exception, negative ability/collector cases, historical faction-claim latch, three-turn AI hold and mandatory fallback, legal full three-star route, actual menu/save/intro lifecycle and four complete Medium matches. Controlled DOM; no browser pixel verification.'};
})()`,ctx).then(result=>{
 const material=fs.readFileSync(__dirname+'/card-materials-2026-10-12.cjs','utf8'),materialBox={module:{exports:{}},require,__dirname,console};vm.runInNewContext(material.slice(0,material.indexOf("const copy='created_card_910'"))+'\nmodule.exports={A};',materialBox);const A=materialBox.module.exports.A;
 const values=vm.runInContext('JSON.stringify([STORY_CHAPTERS[7].body,STORY_CHAPTERS[7].hint,STORY_CHAPTERS[8].title,STORY_CHAPTERS[8].body,STORY_CHAPTERS[8].hint,...storyStarGoals({storyMatch:{chapter:9,progress:{}}}).map(goal=>goal.label)])',ctx);
 for(const language of ['en','zh-CN']){A.setLanguage(language);for(const value of JSON.parse(values)){assert.equal(A.translateGameText(value)===value,language==='en');}}
 A.setLanguage('zh-CN');const stories=JSON.parse(values);assert.equal(A.translateGameText(stories[0]),'贤者的技能也已开放，获胜即可通关。三星目标：收取贤者阵营，使一个被收取的阵营只有一种卡牌，以及放置同一张卡两次。');assert.equal(A.translateGameText(stories[1]),'被收取的阵营只有一种卡牌？这个描述简直就和那些贤者一样谜语人啊。');assert.equal(A.translateGameText(stories[3]),'博丽神社的技能也已开放，获胜即可通关。三星目标：收取博丽神社阵营，使用魔理沙将一张贤者送入弃牌堆，以及在电脑收取阵营前获胜。');assert.equal(A.translateGameText(stories[4]),'这两张牌应该是最先赋予技能的，但却到这里才得以完善，真是有趣呢。');result.checks.push('The restored rules overviews, exact separate hints, ninth title and objectives translate through the actual bilingual path');result.count=result.checks.length;
 fs.writeFileSync(__dirname+'/story-hakurei-2026-10-18-results.json',JSON.stringify(result,null,2)+'\n');completed=true;console.log(result.count+' Hakurei checks, 1024 private deals and four complete Medium matches passed');
}).catch(error=>{console.error(error.stack);process.exitCode=1;});
