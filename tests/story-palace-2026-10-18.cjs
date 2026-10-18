const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{',box={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,storage};',box);const {ctx,storage}=box.module.exports;ctx.testStorage=storage;
vm.runInContext(`(async()=>{
 const checks=[],productionMatches=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
 function make(seed=1){evalResetTokens();evalSetSeed(seed);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard'});configureStoryMatch(game,7);game.players[0].isAI=false;game.ui.pickOwnHandCards=async()=>[];game.ui.pickCardPool=async(_title,options)=>options[0]?.id;game.ui.pickCell=async(_title,cells)=>cells[0];game.pickUI=async(p,method,args)=>game.ui[method]?.(...args);return game;}
 function arrange({hands=[[],[]],board=[],discards=[[],[]],shop=['shop_rinnosuke','palace_yuugi','sdm_meiling','hourai_tewi']}={}){
  game.currentPlayerIdx=0;game.board=Array.from({length:4},()=>Array(4).fill(null));game.wasteland=game.board.map(row=>row.map(()=>false));game.players.forEach((p,i)=>{p.hand=hands[i].slice();p.discard=discards[i].slice();});game.shopCards=shop.slice();
  for(const[r,c,id]of board)game.setCardAt(r,c,id);
  const used=[...hands.flat(),...discards.flat(),...board.map(at=>at[2]),...shop.filter(Boolean)];assert.equal(used.length,new Set(used).size);assert(used.every(id=>CARD[id]));
  game.drawPile=CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion&&!used.includes(card.id)).map(card=>card.id);game.startingCardIds=new Set([...used,...game.drawPile]);game.handKnowledge=game.players.map(()=>new Map());game.reserveAges=game.players.map(()=>({}));game.winner=null;game.stalemateMessage='';evalConservation(game);
 }
 async function place(id,p=0,r=1,c=1){assert(game.players[p].hand.includes(id));game.removeFromHand(p,id);const flags=await game.internalPlace(id,r,c,p,0);evalConservation(game);return flags;}
 const openings=new Set(),stocks=new Set(),actors=new Set();
 for(let seed=1;seed<=768;seed++){
  const g=make(seed);assert(g.players.every(p=>p.hand.length===6));assert(g.players[0].hand.includes('palace_satori'));assert(g.players[0].hand.filter(id=>CARD[id].faction==='palace').length>=2);
  const all=[...g.players.flatMap(p=>p.hand),...g.drawPile,...g.shopCards];assert.equal(all.length,40);assert.equal(new Set(all).size,40);assert(g.drawPile.filter(id=>CARD[id].faction==='palace').every(id=>g.drawPile.slice(-5).includes(id)));assert(g.shopCards[0]==='shop_rinnosuke'&&g.shopCards.includes('palace_yuugi')&&g.shopCards.length===4);
  assert(g.handKnowledge.every(memory=>memory.size===0));assert(!('openingHand' in g.storyMatch));assert.equal(g.aiDifficulty,'normal');assert(!aiIsTeachingOpponent(g,1));assert(g.kourindouEnabled);assert(CARDS.filter(c=>c.shopExpansion&&!storyShopCards(7).includes(c.id)).every(c=>!all.includes(c.id)));
  for(const card of CARDS)assert.equal(g.cardAbilityEnabled(card.id),!!(card.token||card.shopkeeper||g.storyMatch.skillFactions.includes(card.faction)),card.id);
  evalConservation(g);openings.add(g.players[0].hand.slice().sort().join(','));stocks.add(g.shopCards.slice(1).join(','));actors.add(g.currentPlayerIdx);
 }
 ok(openings.size>600&&stocks.size===18&&actors.size===2,'768 random deals keep six-card private hands, randomized first actors, Satori plus another Palace card, undealt Palace cards within the next five draws and Yuugi among three distinct shop goods');
 ok(storyChapterCards(7).length===4&&storyChapterCards(7).every(id=>CARD[id].faction==='palace'&&!CARD[id].shopExpansion),'The chapter introduces exactly Satori, Rin, Utsuho and Koishi, leaving the fifth card for discovery');
 ok(storyShopCards(6).join(',')==='sdm_meiling,hourai_tewi,mtn_nitori'&&storyShopCards(7).includes('palace_yuugi'),'Chapter seven adds Yuugi without changing chapter six’s three-card stock pool');
 for(let mask=0;mask<8;mask++){
  make(mask+1);game.storyMatch.progress={palace:!!(mask&1),newAbility:!!(mask&2)};game.storyMatch.koishiAppeared=!(mask&4);
  assert.equal(storyStarGoals(game).find(goal=>goal.key==='noMary').done,false);game.winner=game.players[0];assert.equal(storyMatchStars(game),[1,2,4].filter(bit=>mask&bit).length);assert(storyMatchComplete(game));
  game.winner=game.players[1];assert.equal(storyMatchStars(game),0);assert(!storyMatchComplete(game));
 }
 ok(true,'All eight objective masks award independent stars only on a player victory; keeping Mary away remains pending until victory');
 make();arrange({hands:[['palace_rin'],[]],discards:[[],['reimu']]});assert(!game.cardAbilityEnabled('reimu'));await place('palace_rin',0,0,0);
 ok(game.storyMatch.progress.newAbility&&game.players[0].hand.includes('reimu')&&game.cardAbilityEnabled('reimu')&&game.abilityId('reimu')==='__draw_one','An actual Rin retrieval gives a locked Hakurei card Overwrite and earns the new-ability objective');
 const before=game.players[0].hand.length;await place('reimu',0,2,2);
 ok(game.players[0].hand.length===before&&game.permanentAbilities.reimu==='__draw_one','The newly assigned ability really draws on placement instead of remaining blocked by the faction lock');
 make();arrange({hands:[['palace_rin'],[]],discards:[[],['mtn_sanae']]});await place('palace_rin',0,0,0);ok(!game.storyMatch.progress.newAbility,'Replacing an already unlocked ability does not count as giving a skillless card an ability');
 make();arrange({hands:[[],['palace_rin']],discards:[['reimu'],[]]});await place('palace_rin',1,0,0);ok(!game.storyMatch.progress.newAbility&&game.cardAbilityEnabled('reimu'),'The opponent’s retrieval changes the card but does not earn the player’s objective');
 make();arrange({hands:[['palace_rin'],[]],discards:[[],['reimu']]});game.ui.pickCardPool=async()=>null;await place('palace_rin',0,0,0);ok(!game.storyMatch.progress.newAbility&&!game.cardAbilityEnabled('reimu'),'Cancelling a retrieval leaves the skillless card and objective unchanged');
 for(const p of [0,1]){
  make();arrange({hands:p?[[],['palace_koishi']]:[['palace_koishi'],[]]});await place('palace_koishi',p,0,0);assert(game.storyMatch.koishiAppeared);game.moveBoardToHand(0,0,p);game.winner=game.players[0];assert(storyStarGoals(game).find(goal=>goal.key==='noMary').failed);
 }
 ok(true,'Either player manually placing Koishi permanently fails the Mary objective even if she later leaves the board');
 for(const p of [0,1]){
  make();arrange({hands:p?[[],['palace_koishi']]:[['palace_koishi'],[]],board:[[0,0,'palace_satori'],[3,2,'palace_rin'],[3,3,'palace_utsuho']]});
  await game.resolveKoishiCascade(0,0);evalConservation(game);assert(game.storyMatch.koishiAppeared);assert(!game.players[p].hand.includes('palace_koishi'));
 }
 ok(true,'Automatic Koishi entries from either hand are recorded before their claim settlement');
 make();arrange({hands:[['palace_koishi'],[]],board:[[0,0,'reimu']]});await game.internalPlace('palace_koishi',0,0,0,0);assert(!game.storyMatch.koishiAppeared);
 game.wouldCompleteFaction('palace_koishi',1,1);assert(!game.storyMatch.koishiAppeared);
 ok(true,'Rejected placements and read-only placement previews never count as a Mary appearance');
 make();arrange({board:[[0,0,'palace_satori'],[0,1,'palace_rin'],[1,0,'palace_utsuho'],[1,1,'palace_yuugi']],shop:['shop_rinnosuke','sdm_meiling','mtn_nitori','hourai_tewi']});game.checkClaims(1);ok(!game.storyMatch.progress.palace,'An opponent’s Palace claim does not satisfy the player’s claim goal');
 make();arrange({hands:[['palace_rin','marisa','yuuka','medicine','mtn_sanae'],[]],board:[[1,0,'palace_satori'],[1,1,'palace_utsuho']],discards:[[],['reimu']]});
 assert(game.tradeCard(0,'mtn_sanae',1));await place('palace_rin',0,0,0);await place('palace_yuugi',0,0,1);assert(game.storyMatch.progress.palace&&game.winCount(game.players[0])===4);assert(!game.storyMatch.koishiAppeared);
 await place('reimu',0,3,0);await place('marisa',0,3,1);await place('yuuka',0,2,0);await place('medicine',0,2,1);
 ok(game.winner?.idx===0&&game.winCount(game.players[0])===8&&storyMatchStars(game)===3&&!game.storyMatch.koishiAppeared,'A real Yuugi trade, Rin overwrite, Palace claim and two later pair claims produce a legal eight-point three-star victory without Koishi');
 returnToMainMenu();testStorage.clear();
 // Actual menu/coach lifecycle and persistent goals, using the same storage as production.
 openStoryChapter(7);game.storyMatch.progress.palace=true;game.winner=game.players[0];updateStoryProgress();assert.equal(storyBestStars(7),2);
 returnToMainMenu();openStoryChapter(7);game.storyMatch.progress.newAbility=true;game.storyMatch.koishiAppeared=true;game.winner=game.players[0];updateStoryProgress();assert.equal(storyBestStars(7),3);assert(!storyChapterPerfect(7));
 returnToMainMenu();openStoryChapter(7);game.storyMatch.progress={palace:true,newAbility:true};game.winner=game.players[0];updateStoryProgress();assert(storyChapterPerfect(7));assert.equal(storyStarColor(7),FACTIONS.palace.color);
 ok(el('tutorial-feedback').classList.contains('story-perfect'),'Chapter-seven stars accumulate across wins and gain Palace color only after a single-match perfect clear');
 el('restart-btn').events.click();ok(game===null&&storyMenuChapter===8&&el('story-card-grid').children.length===4,'Clearing chapter seven now opens the Sage introduction for chapter eight');
 showStoryChapterIntro(7);ok(el('story-card-grid').children.length===4&&el('story-card-grid').children.every(node=>!CARD[node.dataset.cardId].shopExpansion),'The real chapter-seven introduction displays four movable renewed cards without a fifth-card explanation');closeStoryMenu();
 for(let seed=1;seed<=4;seed++){
  const g=make(seed);g.players.forEach(p=>p.isAI=true);let actions=0;
  while(!g.winner&&!g.stalemateMessage&&actions<220){const p=g.currentPlayerIdx;g.beginPlayerTurn(p);g.tradedThisTurn[p]=false;if(!canAct(p)){g.endPlayerTurn(p);g.currentPlayerIdx=1-p;if(!canAct(1-p)){endStalemate();break;}continue;}const flags=await doPlayerAction(p);evalConservation(g);actions++;await afterAction(p,flags);}
  assert(g.winner||g.stalemateMessage);assert(actions<220);evalConservation(g);productionMatches.push({seed,actions,winner:g.winner?.idx??null,stalemate:!!g.stalemateMessage,koishiAppeared:g.storyMatch.koishiAppeared});
 }
 ok(productionMatches.length===4,'Four complete chapter-seven Medium matches finish with conserved cards and the full Palace rules');
 return {status:'pass',count:checks.length,checks,openings:768,productionMatches,rulesVersion:REWORK_RULES_VERSION,scope:'Actual randomized opening deals, private information, mandatory Yuugi stock, active overwrites and draws, human/opponent and automatic Mary entries, legal placement previews, full three-star scoring route, persistence/menu/intro lifecycle and four complete normal-AI matches. Browser pixels are not measured.'};
})()`,ctx).then(result=>{fs.writeFileSync(__dirname+'/story-palace-2026-10-18-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' Palace checks, 768 private openings and four complete Medium matches passed');}).catch(error=>{console.error(error.stack);process.exitCode=1;});
