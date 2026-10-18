// Conserved random openings, real Byakuren effects and production bonus-turn chains.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{',box={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,storage};',box);
const {ctx,storage}=box.module.exports;ctx.testStorage=storage;
let completed=false;process.once('beforeExit',()=>{if(!completed&&!process.exitCode){console.error('Temple checks did not finish.');process.exitCode=1;}});
async function scenario(){
 const checks=[],routes=[],ok=(value,name)=>{assert(value,name);checks.push(name);};let effects=[],costs=[];
 function choices(){game.players[0].isAI=false;effects=[];costs=[];game.ui={pickOwnHandCards:async(_t,ids,o)=>ids.slice(0,o.maxCount),onCostPaid:event=>costs.push(event.count)};game.pickUI=async(p,method,args)=>game.ui[method]?.(...args);game.chooseDrawPileCard=async(p,ids)=>ids[0];game.chooseCells=async(p,n,targets)=>targets.filter(cell=>CARD[game.cardAt(cell.r,cell.c)].faction!=='temple').slice(0,n);game.aiMakesMistake=()=>false;game.chooseByakurenEffect=async()=>effects.shift()??null;}
 function make(seed=1,chapter=13){if(storyState)clearStoryMatch();evalResetTokens();evalSetSeed('temple-'+seed);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard'});if(chapter)configureStoryMatch(game,chapter);choices();return game;}
 function arrange({hands=[[],[]],board=[],discards=[[],[]],shop=['shop_rinnosuke','temple_ichirin','sdm_meiling','hourai_tewi']}={}){
  game.currentPlayerIdx=0;game.board=Array.from({length:4},()=>Array(4).fill(null));game.wasteland=game.board.map(row=>row.map(()=>false));game.players.forEach((p,i)=>{p.hand=hands[i].slice();p.discard=discards[i].slice();});game.shopCards=shop.slice();for(const[r,c,id]of board)game.setCardAt(r,c,id);
  const used=[...hands.flat(),...board.map(at=>at[2]),...discards.flat(),...shop.filter(Boolean)];assert.equal(used.length,new Set(used).size);assert(used.every(id=>CARD[id]));game.drawPile=CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion&&!used.includes(card.id)).map(card=>card.id);game.startingCardIds=new Set([...used,...game.drawPile]);game.handKnowledge=game.players.map(()=>new Map());game.reserveAges=game.players.map(()=>({}));game.pendingExtraTurns={};game.winner=null;game.stalemateMessage='';game.beginPlayerTurn(0);evalConservation(game);
 }
 async function place(id,p=0,r=1,c=1){assert(game.players[p].hand.includes(id));game.currentPlayerIdx=p;game.removeFromHand(p,id);const flags=await game.internalPlace(id,r,c,p,0);evalConservation(game);return flags;}
 async function play(actions,scheduled=0){const original=aiDecideAction,used=[];game.players[0].isAI=true;aiDecideAction=async p=>{assert.equal(p,0);const action=actions.shift();assert(action,'Unexpected extra action');used.push(action.cardId);return action;};try{const flags=await doPlayerAction(0);await afterAction(0,flags,scheduled);}finally{aiDecideAction=original;}assert.equal(actions.length,0);evalConservation(game);return used;}
 const openingHands=new Set(),rivals=new Set(),stocks=new Set(),firstActors=new Set(),slots=new Set();
 for(let seed=1;seed<=1024;seed++){
  const g=make(seed),human=g.players[0].hand,all=[...g.players.flatMap(p=>p.hand),...g.drawPile,...g.shopCards];assert(g.players.every(p=>p.hand.length===6));assert(human.includes('temple_byakuren'));assert(human.filter(id=>CARD[id].faction==='temple').length>=2);assert.equal(all.length,40);assert.equal(new Set(all).size,40);assert(g.handKnowledge.every(memory=>memory.size===0));assert.equal(g.aiDifficulty,'normal');assert(!aiIsTeachingOpponent(g,1));assert(g.shopCards.includes('temple_ichirin'));assert.equal(g.shopCards[0],'shop_rinnosuke');assert(g.shopCards.slice(1).every(id=>storyShopCards(13).includes(id)));assert(g.drawPile.filter(id=>CARD[id].faction==='temple').every(id=>g.drawPile.slice(-5).includes(id)));assert(g.cardAbilityEnabled('temple_ichirin'));assert.equal(g.storyMatch.byakurenEffects.length,0);assert.equal(g.storyMatch.extraTurnsRemaining,0);assert.equal(g.storyMatch.extraTurnsAtVictory,null);evalConservation(g);
  openingHands.add(human.slice().sort().join(','));rivals.add(g.players[1].hand.slice().sort().join(','));stocks.add(g.shopCards.slice(1).join(','));firstActors.add(g.currentPlayerIdx);slots.add(human.indexOf('temple_byakuren'));
 }
 ok(openingHands.size>950&&rivals.size>950&&stocks.size===90&&firstActors.size===2&&slots.size===6,'1024 unique conserved private six-card deals guarantee Byakuren and an ally, reserve undealt Temple cards in the next five draws, and vary first actor, card slots and all 90 Ichirin shop arrangements');
 ok(storyChapterCards(13).join(',')==='temple_byakuren,temple_shou,temple_nue,temple_murasa'&&!storyChapterCards(13).includes('temple_ichirin'),'The new introduction has the four Temple originals and lets the fifth card be discovered in Kourindou');
 make(1,12);ok(!game.cardAbilityEnabled('temple_byakuren')&&!storyShopCards(12).includes('temple_ichirin'),'Temple abilities and Ichirin remain locked before chapter thirteen');
 const allies=[[0,0,'temple_shou'],[0,1,'temple_nue'],[1,0,'temple_murasa']],targets=[[2,0,'sdm_remilia'],[2,1,'sdm_flandre'],[2,2,'sdm_patchouli']],points=['reimu','marisa','yuuka'];
 const orders=[['turns','return','look'],['turns','look','return'],['return','turns','look'],['return','look','turns'],['look','return','turns'],['look','turns','return']];
 for(const order of orders){
  make();arrange({hands:[['temple_byakuren','medicine'],['hourai_mokou']],board:[...allies,...targets],discards:[points,[]]});effects=order.slice();const flags=await place('temple_byakuren');
  assert.equal(flags.extraTurns,3);assert.equal(game.winner?.idx,0);assert.equal(game.winCount(game.players[0]),7);assert.equal(game.storyMatch.byakurenEffects.length,3);assert(game.storyMatch.progress.byakurenAll&&game.storyMatch.progress.temple);assert.equal(game.storyMatch.extraTurnsAtVictory,3);assert.equal(costs.reduce((a,b)=>a+b,0),1);assert.equal(storyMatchStars(game),3);assert(targets.every(([r,c])=>game.wasteland[r][c]&&!game.cardAt(r,c)));routes.push({order,paid:costs.reduce((a,b)=>a+b,0),points:7,extraRemaining:3,stars:3});
  ok(true,'Actual Byakuren '+order.join(' → ')+' uses all three discounted effects, pays one card, collects Temple and wins with three bonus turns left');
 }
 storyState={chapter:13,practice:game,complete:false,savedStars:null,cancel(){}};testStorage.clear();updateStoryProgress();
 ok(storyBestStars(13)===3&&storyChapterPerfect(13)&&el('tutorial-feedback').classList.contains('story-perfect')&&storyStarColor(13)===FACTIONS.temple.color,'A real single-placement three-star win saves the three new goal keys and uses Temple-colored perfect stars');
 el('restart-btn').events.click();ok(game===null&&storyMenuChapter===null&&el('story-levels').children.length===13,'Finishing the final Temple chapter returns to all thirteen replayable chapters');
 returnToMainMenu();openStoryMenu();assert(el('story-levels').children[12].children[2].children[1].className.includes('story-stars-perfect'));showStoryChapterIntro(13);assert.equal(el('story-card-grid').children.length,4);el('story-begin').events.click();
 ok(isStoryMatch()&&game.storyMatch.chapter===13&&!tutorialState&&game.players[0].hand.includes('temple_byakuren')&&game.shopCards.includes('temple_ichirin'),'The real introduction starts chapter thirteen without a prelude and retains its opening guarantees');
 ok(!Object.values(game.storyMatch.progress).some(Boolean)&&!el('tutorial-feedback').classList.contains('story-perfect'),'Replay clears live objectives while preserving the saved perfect rating');returnToMainMenu();
 make();arrange({hands:[['temple_byakuren'],['hourai_mokou']]});effects=['turns'];await place('temple_byakuren');
 ok(!game.storyMatch.byakurenEffects.length&&!game.storyMatch.progress.byakurenAll&&game.storyMatch.extraTurnsRemaining===0,'An unaffordable selected effect does not count as using Byakuren or granting turns');
 make();arrange({hands:[['temple_byakuren','medicine'],['hourai_mokou']],board:allies});game.ui.pickOwnHandCards=async()=>null;effects=['turns'];await place('temple_byakuren');
 ok(!game.storyMatch.byakurenEffects.length&&!game.storyMatch.extraTurnsRemaining,'Declining the actual payment records neither an effect nor a bonus turn');
 make();arrange({hands:[['temple_byakuren'],['hourai_mokou']],board:allies});effects=['look'];game.ui.arrangeDrawPileCards=async()=>({taken:'missing',order:[]});await place('temple_byakuren');
 ok(!game.storyMatch.byakurenEffects.length,'An invalid peek-and-take arrangement cannot count as a successful look effect');
 make();arrange({hands:[['temple_byakuren'],['hourai_mokou']],board:allies});effects=['return'];game.chooseCells=async()=>[];await place('temple_byakuren');
 ok(!game.storyMatch.byakurenEffects.length,'Cancelling every return target does not count as a successful return effect');
 make();arrange({hands:[['temple_byakuren'],['hourai_mokou']],board:allies});effects=['look'];await place('temple_byakuren');
 ok(game.storyMatch.byakurenEffects.join(',')==='look'&&!game.storyMatch.progress.byakurenAll,'One successful free look records exactly that effect and does not complete all three');
 const claimAllies=[[0,0,'temple_byakuren'],[0,1,'temple_nue'],[1,0,'temple_murasa']],step=(cardId,r,c)=>({type:'place',cardId,r,c});
 for(const filler of [null,'hourai_mokou','haku_youmu']){
  make();arrange({hands:[['sdm_sakuya','temple_shou','medicine',...(filler?[filler]:[])],['hourai_reisen']],board:claimAllies,discards:[points,[]]});const actions=[step('sdm_sakuya',3,3),...(filler?[step(filler,3,2)]:[]),step('temple_shou',1,1)];await play(actions);const expected=filler==='hourai_mokou'?0:1;
  assert.equal(game.winner?.idx,0);assert.equal(game.storyMatch.extraTurnsAtVictory,expected);assert.equal(storyStarGoals(game).find(goal=>goal.key==='extraAtWin').done,expected>0);
  ok(true,'Production Sakuya chain '+(filler||'direct claim')+' distinguishes a remaining bonus turn from winning on the last one; Youmu does not consume another bonus turn');
 }
 make();arrange({hands:[['haku_youmu','temple_shou','medicine'],['hourai_mokou']],board:claimAllies,discards:[points,[]]});await play([step('haku_youmu',3,3),step('temple_shou',1,1)]);
 ok(game.winner?.idx===0&&game.storyMatch.extraTurnsAtVictory===0&&!storyStarGoals(game).find(goal=>goal.key==='extraAtWin').done,'A free Youmu placement on its own is not an unspent bonus turn');
 make();arrange({hands:[['sage_mai_satono'],['hourai_mokou']],board:[[0,0,'sage_yukari'],[0,1,'sage_matara'],[1,0,'sage_ran']],discards:[points,[]],shop:['shop_rinnosuke','temple_ichirin','sdm_meiling','hourai_tewi']});await place('sage_mai_satono');
 ok(game.winner?.idx===0&&game.pendingExtraTurns[0]===1&&game.storyMatch.extraTurnsAtVictory===1&&storyStarGoals(game).find(goal=>goal.key==='extraAtWin').done,'Mai and Satono granting a future bonus action on the winning claim also counts');
 for(const winInExtra of [false,true]){
  make();arrange({hands:[['temple_shou','hourai_mokou','medicine'],['hourai_reisen']],board:claimAllies,discards:[points,[]]});game.pendingExtraTurns[0]=1;const scheduled=game.takeScheduledExtraTurns(0);assert.equal(game.storyMatch.extraTurnsRemaining,1);assert.equal(game.pendingExtraTurns[0],0);await play([...(winInExtra?[step('hourai_mokou',3,3)]:[]),step('temple_shou',1,1)],scheduled);
  ok(game.winner?.idx===0&&game.storyMatch.extraTurnsAtVictory===(winInExtra?0:1),'Scheduled dancer turns are transferred once and '+(winInExtra?'consumed before their action':'still available during the preceding regular action'));
 }
 make();arrange({hands:[['medicine'],['sdm_sakuya']]});await place('sdm_sakuya',1,3,3);
 ok(game.storyMatch.extraTurnsRemaining===0,'An opponent’s time stop never grants progress or spare turns to the player');
 make();arrange({hands:[['sdm_sakuya','hourai_mokou','medicine'],['hourai_reisen']]});await play([step('sdm_sakuya',3,3),step('hourai_mokou',3,2),step('medicine',3,1)]);
 ok(!game.winner&&game.storyMatch.extraTurnsRemaining===0&&game.currentPlayerIdx===1,'Completing both time-stop turns exhausts the count and advances to the opponent normally');
 for(const chapter of [null,12]){make(1,chapter);arrange({hands:[['sdm_sakuya'],['hourai_mokou']]});await place('sdm_sakuya');assert(!game.storyMatch||game.storyMatch.extraTurnsRemaining===0);}
 ok(true,'Bonus bookkeeping leaves ordinary matches and earlier chapters unaffected');
 make();arrange({hands:[['temple_byakuren','medicine'],['hourai_mokou']],board:allies});const before=JSON.stringify(game.storyMatch);for(let seed=1;seed<=8;seed++){evalSetSeed(seed);await aiDecideAction(1,false);assert.equal(JSON.stringify(game.storyMatch),before);}
 ok(true,'Eight AI evaluation seeds cannot leak hypothetical Byakuren activations or bonus turns into live objectives');
 make();arrange({hands:[['temple_shou'],['hourai_mokou']]});for(const id of ['temple_byakuren','temple_nue','temple_murasa']){const i=game.drawPile.indexOf(id);game.drawPile.splice(i,1);assert(game.addToDiscard(0,id));}assert(!game.storyMatch.progress.temple);game.removeFromHand(0,'temple_shou');game.addToDiscard(0,'temple_shou');evalConservation(game);
 ok(game.storyMatch.progress.temple,'The Temple faction objective honors the existing complete-discard-pile rule as well as board collection');
 for(const key of ['cancelled','winner','stalemateMessage']){
  make();arrange({hands:[['medicine'],['hourai_mokou']]});game[key]=key==='winner'?game.players[0]:key==='cancelled'?true:'Ended';game.recordStoryByakurenEffect(0,'turns');game.recordStoryExtraTurns(0,3);assert.equal(game.storyMatch.byakurenEffects.length,0);assert.equal(game.storyMatch.extraTurnsRemaining,0);
 }
 ok(true,'Cancelled, won and stalemated matches cannot gain additional Temple effect or bonus-turn progress');
 make();arrange({hands:[['medicine'],['hourai_mokou']]});game.recordStoryByakurenEffect(1,'look');game.recordStoryExtraTurns(1,3);assert.equal(game.storyMatch.byakurenEffects.length,0);assert.equal(game.storyMatch.extraTurnsRemaining,0);
 ok(true,'The opponent cannot complete the human Byakuren objective');
 testStorage.clear();saveStoryStars(13,['temple']);saveStoryStars(13,['byakurenAll']);saveStoryStars(13,['extraAtWin']);
 ok(storyBestStars(13)===3&&!storyChapterPerfect(13),'Separate victories can accumulate the three Temple stars without becoming a perfect single-match clear');
 const randomMatches=[];
 for(let seed=1;seed<=4;seed++){
  const g=make('full-'+seed);for(const key of ['pickUI','chooseDrawPileCard','chooseCells','aiMakesMistake','chooseByakurenEffect'])delete g[key];g.ui={};g.players.forEach(p=>p.isAI=true);let actions=0,idle=0;
  while(!g.winner&&!g.stalemateMessage&&actions<220){const p=g.currentPlayerIdx;g.beginPlayerTurn(p);g.tradedThisTurn[p]=false;const scheduled=g.takeScheduledExtraTurns(p);if(!canAct(p)){if(++idle>=g.numPlayers){endStalemate();break;}advanceTurn();continue;}idle=0;const flags=await doPlayerAction(p);evalConservation(g);actions++;await afterAction(p,flags,scheduled);evalConservation(g);}
  assert((g.winner||g.stalemateMessage)&&actions<220);randomMatches.push({seed,actions,turns:g.testMetrics.turns,winner:g.winner?.idx??null,points:g.players.map(p=>g.winCount(p)),effects:g.storyMatch.byakurenEffects,extraAtWin:g.storyMatch.extraTurnsAtVictory});
 }
 ok(randomMatches.length===4,'Four complete private Medium-AI Temple matches use the real unrestricted planners, ability choosers and bonus-turn controller without a runtime error or turn-limit abort');
 return {status:'pass',count:checks.length,checks,routes,randomMatches,openings:{samples:1024,hands:openingHands.size,rivals:rivals.size,stocks:stocks.size},rulesVersion:REWORK_RULES_VERSION,scope:'Real conserved deals and ability payments, all six Byakuren effect orders, actual faction wins, production Sakuya/Youmu/dancer action chains, four full production AI matches, snapshot-safe AI evaluation, story UI and persistence. Controlled DOM, not browser pixel QA.'};
}
vm.runInContext('('+scenario.toString()+')()',ctx).then(result=>{
 const material=fs.readFileSync(__dirname+'/card-materials-2026-10-12.cjs','utf8'),renderer={module:{exports:{}},require,__dirname,console};vm.runInNewContext(material.slice(0,material.indexOf("const copy='created_card_910'"))+'\nmodule.exports={A};',renderer);const A=renderer.module.exports.A;
 const texts=vm.runInContext('[STORY_CHAPTERS[12].title,STORY_CHAPTERS[12].body,STORY_CHAPTERS[12].hint,"Claim Myouren Temple","Use all three of Byakuren’s effects","Win with an extra turn still remaining",STORY_CHAPTERS[4].body,"Read a newspaper, then make a correct guess"]',ctx);
 for(const language of ['en','zh-CN','en']){A.setLanguage(language);for(const text of texts)assert.equal(A.translateGameText(text)===text,language==='en',text);result.checks.push('Chapter thirteen title, overview, exact flavor hint and goals plus the revised newspaper objective follow the actual '+language+' localization path');}
 A.setLanguage('zh-CN');assert.equal(A.translateGameText(texts[2]),'无论如何，使用圣白莲的所有功能必须要有很多卡牌来支付代价吧。但是，如果有羁绊的力量，轻松的完成也不是不可能的？');result.count=result.checks.length;
 fs.writeFileSync(__dirname+'/story-temple-2026-10-19-results.json',JSON.stringify(result,null,2)+'\n');completed=true;console.log(result.count+' Temple chapter and remaining-turn checks passed');
}).catch(error=>{console.error(error);process.exitCode=1;});
