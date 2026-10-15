const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
const builder=vm.createContext({});vm.runInContext(html.slice(html.indexOf('function buildAIEvaluationWorkerSource'),html.indexOf('\nfunction evalHashSeed')),builder);builder.html=html;
const engine=vm.createContext({console,setTimeout,clearTimeout,self:{},assert});vm.runInContext(vm.runInContext('buildAIEvaluationWorkerSource(html)',builder),engine);
vm.runInContext(html.slice(html.indexOf('const TUTORIALS='),html.indexOf('let tutorialState='))+html.slice(html.indexOf('function configureTutorialGame('),html.indexOf('function tutorialAllowsAction(')),engine);

(async()=>{
  const rules=await vm.runInContext(`(async()=>{
    const checks=[],samples={},ok=(value,name)=>{assert(value,name);checks.push(name);};
    function opening(mode,seed){
      evalResetTokens();evalSetSeed(seed);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard',kourindouEnabled:mode==='tutorial'});
      const actor=game.currentPlayerIdx;
      if(mode==='tutorial')configureTutorialMatch(game);else configureStoryMatch(game,mode);
      return {match:game,actor};
    }
    const stock=match=>[...match.players.flatMap(p=>[...p.hand,...p.discard]),...match.drawPile,...match.shopCards.filter(Boolean),...match.mainBoardCells().map(cell=>match.cardAt(cell.r,cell.c))];
    const stamp=match=>JSON.stringify({hands:match.players.map(p=>p.hand),deck:match.drawPile,shop:match.shopCards,actor:match.currentPlayerIdx});
    for(const mode of [1,2,'tutorial']){
      const layouts=new Set(),humans=new Set(),rivals=new Set(),lords=new Set(),redCounts=new Set();let withoutRemilia=0;
      for(let seed=0;seed<256;seed++){
        const {match,actor}=opening(mode,seed),ids=stock(match),human=match.players[0].hand,rival=match.players[1].hand;
        assert.equal(match.currentPlayerIdx,actor);assert(match.players.every(p=>p.hand.length===6));
        assert.equal(ids.length,new Set(ids).size);assert.equal(ids.length,match.startingCardIds.size);assert(ids.every(id=>match.startingCardIds.has(id)));
        assert(match.players.every(p=>p.hand.every(id=>!CARD[id].token&&!CARD[id].shopkeeper&&!CARD[id].shopExpansion)));
        assert(human.every(id=>match.handKnowledge[1].get(id)===0));assert.equal(match.handKnowledge[0].size,0);
        const red=human.filter(id=>CARD[id].faction==='sdm').length;redCounts.add(red);
        if(!human.includes('sdm_remilia'))withoutRemilia++;
        if(mode===2){assert(human.includes('sdm_remilia'));assert(red>=2);assert.equal(human.filter(id=>id==='sdm_remilia').length,1);}
        if(mode==='tutorial'){assert.equal(match.shopCards[0],'shop_rinnosuke');assert.equal(match.shopCards.length,4);assert(match.shopCards.slice(1).every(id=>CARD[id].shopExpansion));}
        else assert.equal(match.shopCards.length,0);
        layouts.add(stamp(match));humans.add(human.slice().sort().join(','));rivals.add(rival.slice().sort().join(','));human.forEach(id=>lords.add(id));
      }
      ok(layouts.size===256&&humans.size>240&&rivals.size>240,'Both six-card hands and remaining deck vary across 256 seeded '+mode+' openings');
      ok(mode===2?withoutRemilia===0&&redCounts.size>=2:withoutRemilia>0&&redCounts.size>=3,'Only chapter two reserves Remilia and another Mansion card; extra Mansion cards remain possible: '+mode);
      ok(lords.size>=35,'A random opening samples broadly from the ordinary card pool: '+mode);
      const a=opening(mode,'replay-'+mode).match,first=stamp(a),b=opening(mode,'replay-'+mode).match;
      ok(stamp(b)===first,'The same seed reproduces hands, deck, shop and first actor: '+mode);
      samples[mode]={seeds:256,uniqueHands:humans.size,uniqueOpponentHands:rivals.size,distinctCards:lords.size,redCounts:[...redCounts].sort(),withoutRemilia};
    }
    const exerciseSamples=[];
    for(let step=0;step<6;step++){
      const hands=new Set(),shops=new Set();
      for(let seed=0;seed<64;seed++){
        evalResetTokens();evalSetSeed('exercise-'+step+'-'+seed);SIZE=4;game=new Game(3,{},null,{aiOnly:true,fastTest:true});configureTutorialGame(game,step);
        const ids=stock(game),hand=game.players[0].hand;assert.equal(ids.length,new Set(ids).size);assert.equal(ids.length,game.startingCardIds.size);
        assert(game.players.every(player=>player.hand.every(id=>!CARD[id].token&&!CARD[id].shopkeeper&&!CARD[id].shopExpansion)));
        if(step<2)assert(hand.includes('mtn_sanae'));
        if(step===1)assert(['mtn_kanako','mtn_suwako','mtn_aya'].every(id=>game.isOnBoard(id)));
        if(step===2)assert.equal(game.players.map(p=>p.hand.length).join(','),'6,7,3');
        if(step===3){assert(hand.includes('heaven_iku'));assert.equal(hand.length,4);assert.equal(game.tutorialExercise.areaTargets.length,2);assert(game.tutorialExercise.areaTargets.every(id=>CARD[id].faction!=='heaven'&&!CARD[id].triple));}
        if(step>=4){assert.equal(hand.length,2);assert(hand.includes(game.tutorialExercise.tradeCard));assert(!CARD[game.tutorialExercise.tradeCard].override);}
        hands.add(hand.slice().sort().join(','));shops.add(game.shopCards.slice(1).sort().join(','));
      }
      ok(hands.size>48&&shops.size>=5,'Guided page '+step+' randomizes hand identities and merchandise while retaining its necessary lesson cards');
      const match=game,initialPileSize=game.drawPile.length;game.players[0].isAI=false;
      game.ui={pickOwnHandCards:async(t,ids,options)=>ids.slice(0,options.maxCount),pickRectByDrag:async()=>game.rectCells({r:0,c:0},2,{r:1,c:1})};game.pickUI=async(p,method,args)=>game.ui[method](...args);
      if(step<2){game.removeFromHand(0,'mtn_sanae');await game.internalPlace('mtn_sanae',2,2,0,0);}
      else if(step===2)game.drawForEveryone(0);
      else if(step===3){game.removeFromHand(0,'heaven_iku');await game.internalPlace('heaven_iku',3,3,0,0);}
      else{const offered=game.tutorialExercise.tradeCard;assert(game.tradeCard(0,offered,game.tradeCells()[0]));}
      ok(tutorialObjectiveMet({practice:match,step:step===4?5:step,initialPileSize}),'The real rules still complete the randomized single-step exercise '+step);
      evalConservation(match);exerciseSamples.push({step,seeds:64,uniqueHands:hands.size,uniqueShopStocks:shops.size});
    }
    const rng=Math.random;Math.random=()=>0;
    try{const {match}=opening(2,'constant');ok(match.players[0].hand.includes('sdm_remilia')&&match.players[0].hand.some(id=>id!=='sdm_remilia'&&CARD[id].faction==='sdm'),'Conditional dealing terminates even under a constant RNG');}finally{Math.random=rng;}
    opening('tutorial','adaptive');
    const hands=[['palace_satori','palace_koishi','haku_youmu','haku_yuyuko','marisa','hell_clownpiece'],['palace_rin','palace_utsuho','hourai_mokou','temple_shou','heaven_tenshi','heaven_iku']];
    game.players.forEach((p,i)=>p.hand=hands[i].slice());game.tutorialLesson.openingHand=hands[0].slice();game.handKnowledge=game.players.map(()=>new Map());game.revealHand(0,hands[0],[1]);
    const state=JSON.stringify(captureAIEvaluationSnapshot(game)),metrics=JSON.stringify(game.testMetrics);let focus;
    Math.random=()=>{throw Error('Adaptive mentoring must not consume RNG');};
    try{focus=aiLearningFourFaction(game,game.tutorialLesson);await aiTutorialMentorAction(1);}finally{Math.random=rng;}
    ok(focus==='palace','The tutorial mentor adapts to the random player faction instead of always supporting Mountain');
    ok(state===JSON.stringify(captureAIEvaluationSnapshot(game))&&metrics===JSON.stringify(game.testMetrics),'Adaptive mentoring restores the board, hands, knowledge and statistics');
    const randomMatches=[];
    for(const mode of [1,2,'tutorial']){
      const {match}=opening(mode,'random-full-'+mode);let turns=0,idle=0;
      while(!match.winner&&!match.stalemateMessage&&turns++<160){
        const p=match.currentPlayerIdx;match.beginPlayerTurn(p);match.tradedThisTurn[p]=false;
        if(!canAct(p)){if(++idle>=match.numPlayers){endStalemate();break;}advanceTurn();}
        else{idle=0;const flags=await doPlayerAction(p);await afterAction(p,flags,match.takeScheduledExtraTurns(p));}
        evalConservation(match);
      }
      ok((!!match.winner||!!match.stalemateMessage)&&turns<160,'A full match from an actual random '+mode+' opening ends without a runtime error or turn-limit abort');
      randomMatches.push({mode,turns,ending:match.winner?'win':'stalemate',winner:match.winner?.idx??null,points:match.players.map(p=>match.winCount(p)),progress:mode==='tutorial'?{...match.tutorialLesson.progress}:{...match.storyMatch.progress}});
    }
    return {checks,samples,exerciseSamples,randomMatches,rulesVersion:REWORK_RULES_VERSION};
  })()`,engine);

  // Reuse the established renderer fixture without running its unrelated animation checks.
  const material=fs.readFileSync(__dirname+'/card-materials-2026-10-12.cjs','utf8'),marker="const copy='created_card_910'";
  assert(material.includes(marker));const box={module:{exports:{}},require,__dirname,console};
  vm.runInNewContext(material.slice(0,material.indexOf(marker))+`\nmodule.exports={ctx,A,el,Element,documentFixture,windowListeners,documentListeners,setReduced:v=>reducedMotion=v};`,box);
  const {ctx,A,el,Element,documentFixture,windowListeners,setReduced}=box.module.exports,checks=rules.checks.slice();
  const ok=(value,name)=>{assert(value,name);checks.push(name);};let now=100000,frameId=0,frames=new Map(),loopStarts=0;
  ctx.Date=class extends Date{static now(){return now;}};ctx.performance={now:()=>now};
  ctx.requestAnimationFrame=fn=>{const id=++frameId;frames.set(id,fn);return id;};ctx.cancelAnimationFrame=id=>frames.delete(id);
  ctx.ui={};ctx.online=null;ctx.closeAITestDashboard=()=>{};ctx.updateAITestControls=()=>{};ctx.runNextTurn=()=>{loopStarts++;};ctx.queueMobileViewport=()=>{};ctx.window.scrollTo=()=>{};
  const originalRect=Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect=function(){
    if(this.dataset.storyCard==='true'){
      const width=parseFloat(el('story-card-grid').values.get('--story-card-width')||'190'),height=width*4/3,x=parseFloat(this.values.get('--table-x')||'0'),y=parseFloat(this.values.get('--table-y')||'0');
      return {left:x-width/2,top:y-height/2,width,height,right:x+width/2,bottom:y+height/2};
    }return originalRect.call(this);
  };
  Element.prototype.setPointerCapture=function(id){this.pointer=id;};Element.prototype.hasPointerCapture=function(id){return this.pointer===id;};Element.prototype.releasePointerCapture=function(){this.pointer=null;};
  Element.prototype.prepend=function(node){this.appendChild(node);this.children.unshift(this.children.pop());};
  vm.runInContext(html.slice(html.indexOf('let titleCardDrag='),html.indexOf('function drawTitlePreviewCards('))+html.slice(html.indexOf('function tableCardBounds('),html.indexOf('function setTitleCardFace(')),ctx);
  vm.runInContext(html.slice(html.indexOf('/* Guided practice uses'),html.indexOf('/* CSS lays out the phone table'))+'this.introAPI={show:showStoryChapterIntro,close:closeStoryMenu,menu:openStoryMenu,layout:layoutStoryIntroCards,session:()=>storyIntroSession,drag:()=>titleCardDrag,slides:()=>tableCardSlides.size,start:openStoryChapter};',ctx);
  ctx.resetGameView=()=>vm.runInContext('if(game)game.cancelled=true;clearTutorialPractice();clearStoryMatch();game=null;',ctx);ctx.returnToMainMenu=ctx.resetGameView;
  const U=ctx.introAPI,flush=()=>{const batch=[...frames];frames.clear();for(const [,fn]of batch)fn(now);},resizeCount=()=>windowListeners.get('resize')?.length||0;
  const trigger=(node,type,extra={})=>{const rect=node.getBoundingClientRect(),event={currentTarget:node,target:node,type,pointerId:11,pointerType:'mouse',button:0,isPrimary:true,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2,timeStamp:now,detail:1,preventDefault(){},stopPropagation(){},...extra};for(const fn of node.events[type]||[])fn(event);};
  el('story-card-grid').rect={left:100,top:170,width:900,height:400,right:1000,bottom:570};
  const match={storyMatch:{skillFactions:[]},players:[{idx:0,isAI:false,hand:['sdm_remilia','hourai_mokou']}],currentPlayerIdx:0,forcedPlay:{},permanentAbilities:{},borrowedAbilities:{},createdActivations:{},
    isPlacementBlocked:()=>false,isSageMuted:()=>false,isOnBoard:()=>false,cardAbilityEnabled:A.Game.prototype.cardAbilityEnabled,abilityId:A.Game.prototype.abilityId};
  A.setGame(match);
  for(const id of ['sdm_remilia','hourai_mokou']){
    const face=A.cardBoardHtml(id);ok(face.includes('card-rin-worn')&&face.includes('card-wear-overlay')&&!face.includes('Overwrite'),'A story card without skills has Rin wear without an Overwrite label: '+id);
    A.openCardDetails(id);ok(el('card-detail').classList.contains('card-rin-worn')&&!el('card-detail-description').innerHTML&&el('card-detail-ability').hidden,'Worn story details retain their empty skill text: '+id);A.closeCardDetails();
  }
  match.storyMatch.skillFactions=['sdm'];
  ok(!A.cardBoardHtml('sdm_remilia').includes('card-rin-worn')&&A.cardBoardHtml('hourai_mokou').includes('card-rin-worn'),'Only still-locked factions remain worn in chapter two');
  A.renderHand();ok(!el('hand').children[0].classList.contains('card-rin-worn')&&el('hand').children[1].classList.contains('card-rin-worn'),'The actual hand renderer uses the same story material state');
  A.setGame(null);A.openCardDetails('hourai_mokou');ok(!el('card-detail').classList.contains('card-rin-worn')&&!!el('card-detail-description').innerHTML,'Leaving the story restores the original card appearance and ability');A.closeCardDetails();
  const listenerBase=resizeCount();U.show(2);flush();let cards=U.session().cards;
  ok(cards.length===4&&parseFloat(el('story-card-grid').values.get('--story-card-width'))>=180,'The introduction has four freely movable large cards');
  for(const card of cards){
    ok(card.innerHTML.includes('story-new-face')&&card.innerHTML.includes('story-old-face')&&card.innerHTML.includes('card-rin-worn')&&card.innerHTML.includes('story-refresh-scan')&&card.innerHTML.includes('story-card-glow'),'Each introduction card has fresh art, a worn layer, a renewal scan and an invitation glow: '+card.dataset.cardId);
  }
  ok(/@keyframes storyCardRenew\{from\{clip-path:inset\(0 0 0 0\)\}to\{clip-path:inset\(100% 0 0 0\)\}\}/.test(html),'The renewal removes the old layer from top to bottom');
  const first=cards[0],rect=first.getBoundingClientRect();trigger(first,'pointerdown');now+=70;trigger(first,'pointerup',{clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2});
  ok(el('card-detail-overlay').classList.contains('show')&&first.classList.contains('story-card-seen'),'One pointer tap opens the actual card details and acknowledges its glow');
  A.closeCardDetails();now+=500;
  const touch=cards[3];trigger(touch,'pointerdown',{pointerType:'touch'});now+=70;trigger(touch,'pointerup',{pointerType:'touch'});
  ok(el('card-detail-overlay').classList.contains('show')&&touch.classList.contains('story-card-seen'),'One touch tap opens the card even when compatibility clicks are suppressed');A.closeCardDetails();now+=500;
  const touchMove=cards[2],tp=touchMove.getBoundingClientRect();trigger(touchMove,'pointerdown',{pointerType:'touch'});now+=30;trigger(touchMove,'pointermove',{pointerType:'touch',clientX:tp.left+tp.width/2+24});now+=20;trigger(touchMove,'pointerup',{pointerType:'touch',clientX:tp.left+tp.width/2+24});trigger(touchMove,'click');
  ok(!el('card-detail-overlay').classList.contains('show')&&!touchMove.classList.contains('story-card-seen'),'A touch drag and its synthetic click do not inspect the card');U.layout();now+=500;
  const drag=cards[1],before=drag.getBoundingClientRect();trigger(drag,'pointerdown');now+=40;trigger(drag,'pointermove',{clientX:before.left+before.width/2+100,clientY:before.top+before.height/2+30});now+=30;
  trigger(drag,'pointerup',{clientX:before.left+before.width/2+100,clientY:before.top+before.height/2+30});trigger(drag,'click');
  ok(!el('card-detail-overlay').classList.contains('show')&&!drag.classList.contains('story-card-seen')&&Number(drag.dataset.storyX)>.3,'Dragging and its compatibility click move the card without opening details');
  ok(drag.parentElement===el('story-card-grid')&&U.drag()===null,'A dragged card stays in the story overlay and releases pointer capture');
  ok(U.slides()>0,'Released story cards use the shared table sliding physics');
  U.layout();now+=500;trigger(drag,'click',{detail:0});ok(el('card-detail-overlay').classList.contains('show'),'A keyboard or screen-reader click can also inspect a card');A.closeCardDetails();
  const keyboard=cards[2],x=Number(keyboard.dataset.storyX);trigger(keyboard,'keydown',{key:'ArrowRight'});
  ok(Number(keyboard.dataset.storyX)>x&&!el('card-detail-overlay').classList.contains('show'),'Arrow keys move cards without inspecting them');trigger(keyboard,'keydown',{key:'Enter'});
  ok(el('card-detail-overlay').classList.contains('show')&&keyboard.classList.contains('story-card-seen'),'Enter inspects the focused introduction card');A.closeCardDetails();
  const saved=Number(cards[3].dataset.storyX);el('story-card-grid').rect={left:20,top:180,width:350,height:440,right:370,bottom:620};U.layout();
  const moved=cards[3].getBoundingClientRect();ok(moved.left>=20&&moved.right<=370&&moved.top>=180&&moved.bottom<=620&&Math.abs(Number(cards[3].dataset.storyX)-saved)<.2,'Resizing keeps moved cards reachable within the smaller table');
  flush();trigger(cards[0],'pointerdown');U.close();ok(U.session()===null&&U.drag()===null&&U.slides()===0&&frames.size===0&&resizeCount()===listenerBase,'Closing during a gesture clears cards, capture, slides, layout callbacks and listeners');
  U.show(2);U.close();flush();ok(U.session()===null&&el('story-card-grid').children.length===0,'Closing before the first animation frame cannot restore stale cards');
  U.show(2);flush();cards=U.session().cards;setReduced(true);const reduced=cards[0],rp=reduced.getBoundingClientRect();trigger(reduced,'pointerdown');now+=10;trigger(reduced,'pointermove',{clientX:rp.left+rp.width/2+35});now+=10;trigger(reduced,'pointerup',{clientX:rp.left+rp.width/2+35});
  ok(U.slides()===0&&!el('card-detail-overlay').classList.contains('show')&&html.includes('.story-ability-card>.story-old-face,.story-ability-card>.story-refresh-scan{display:none;animation:none}'),'Reduced motion keeps cards draggable while skipping renewal motion and throws');setReduced(false);U.close();
  U.show(2);flush();el('story-begin').events.click[0]();ok(loopStarts===1&&U.session()===null&&!el('story-overlay').classList.contains('show'),'Starting the chapter disposes of the introduction before launching one game loop');
  ctx.resetGameView();U.show(1);ok(U.session()===null&&el('story-card-grid').hidden,'Chapter one has no skill-renewal cards');U.close();
  A.setLanguage('zh-CN');ok(A.translateGameText('Click a glowing card to read its ability. Drag cards freely to move and stack them.').includes('单击'),'The new introduction instructions are localized');
  const result={status:'pass',count:checks.length,checks,samples:rules.samples,exerciseSamples:rules.exerciseSamples,randomMatches:rules.randomMatches,rulesVersion:rules.rulesVersion,scope:'768 actual seeded full-match openings, 384 guided exercise configurations with actual completions, complete random matches, real renderers and shared pointer physics in a controlled DOM; no browser pixel verification'};
  fs.writeFileSync(__dirname+'/random-learning-renewal-2026-10-15-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' random-learning and renewal checks passed across 768 openings');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
