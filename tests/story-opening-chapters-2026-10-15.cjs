const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
for(const [,script]of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script);
const builder=vm.createContext({});vm.runInContext(html.slice(html.indexOf('function buildAIEvaluationWorkerSource'),html.indexOf('\nfunction evalHashSeed')),builder);builder.html=html;
class Node{
  constructor(){this.children=[];this.parentElement=null;this.style={setProperty(){}};this.dataset={};this.events={};this.attributes={};this.names=new Set();this.isConnected=true;this.hidden=false;
    this.classList={add:(...names)=>names.forEach(name=>this.names.add(name)),remove:(...names)=>names.forEach(name=>this.names.delete(name)),contains:name=>this.names.has(name),toggle:(name,on)=>{if(on===undefined)on=!this.names.has(name);on?this.names.add(name):this.names.delete(name);return on;}};}
  appendChild(node){this.children.push(node);node.parentElement=this;return node;}append(...nodes){nodes.forEach(node=>this.appendChild(node));}
  replaceChildren(){this.children=[];}insertBefore(node){return this.appendChild(node);}prepend(node){node.parentElement=this;this.children.unshift(node);}
  addEventListener(name,fn){this.events[name]=fn;}removeEventListener(name){delete this.events[name];}setAttribute(key,value){this.attributes[key]=value;}querySelector(){return new Node();}
  querySelectorAll(){return [];}getClientRects(){return this.hidden?[]:[{}];}focus(){documentFixture.activeElement=this;}
}
const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);},storage=new Map(),listeners={};
const documentFixture={activeElement:new Node(),body:new Node(),createElement:()=>new Node(),querySelectorAll:()=>[],
  querySelector:selectors=>selectors.split(',').map(selector=>selector.match(/^#([\w-]+)\.show$/)?.[1]).map(id=>nodes.get(id)).find(node=>node?.classList.contains('show'))||null,
  addEventListener:(name,fn)=>{(listeners[name]||=[]).push(fn);}};
const ctx=vm.createContext({console,setTimeout,clearTimeout,self:{},assert,el,document:documentFixture,performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
  window:{scrollTo(){},addEventListener(){},removeEventListener(){},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}},
  setRuleText:(node,text)=>node.textContent=text,ruleTextHtml:text=>text,cardBoardHtml:id=>'<div>'+id+'</div>',openCardDetails(){},
  closeAITestDashboard(){},updateAITestControls(){},queueMobileViewport(){},waitForVisualEffects:async()=>true});
vm.runInContext(vm.runInContext('buildAIEvaluationWorkerSource(html)',builder),ctx);
vm.runInContext(html.slice(html.indexOf('let titleCardDrag='),html.indexOf('function drawTitlePreviewCards('))+html.slice(html.indexOf('function tableCardBounds('),html.indexOf('function setTitleCardFace(')),ctx);
vm.runInContext(html.slice(html.indexOf('/* Guided practice uses'),html.indexOf('/* CSS lays out the phone table'))+`
  let online=null,storyLoopStarts=0,ordinaryRestarts=0;
  runNextTurn=async()=>{storyLoopStarts++;};
  function resetGameView(){if(game)game.cancelled=true;window.__resolveHumanTurn?.({});window.__resolveHumanTurn=null;clearTutorialPractice();clearStoryMatch();game=null;}
  function returnToMainMenu(){resetGameView();}
  function startNewGame(){ordinaryRestarts++;}
`,ctx);
ctx.pendingHandChoice=null;ctx.pendingRectChoice=null;ctx.selectedHandCard=null;
ctx.actualPreludeRun=vm.runInContext('runTutorialTurn',ctx);ctx.runTutorialTurn=()=>{};
const restart=html.indexOf("el('restart-btn').addEventListener('click'");vm.runInContext(html.slice(restart,html.indexOf('\n});',restart)+4),ctx);
const hotkeys=html.indexOf("document.addEventListener('keydown',event=>{\n  if(event.repeat");vm.runInContext(html.slice(hotkeys,html.indexOf('\n});',hotkeys)+4),ctx);
ctx.pressStoryKey=key=>{let stopped=false;const event={key,target:{closest:()=>null},preventDefault(){},stopImmediatePropagation(){stopped=true;}};for(const handler of listeners.keydown){handler(event);if(stopped)break;}};
vm.runInContext(`(async()=>{
  const checks=[],walkthroughs=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
  const originalAction=doPlayerAction,definitions=JSON.stringify(CARDS);
  function setup(chapter=2,actor=0,seed=1,fixed=true){
    evalResetTokens();evalSetSeed(seed);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard',kourindouEnabled:false});
    game.currentPlayerIdx=actor;game.players[0].isAI=false;configureStoryMatch(game,chapter);game.render=()=>{};
    // Arrange real cards for skill and route regressions; production random deals are tested separately.
    if(fixed){
      const hands=[['sdm_remilia','sdm_flandre','haku_youmu','haku_yuyuko','yuuka','medicine'],['sdm_patchouli','sdm_sakuya','hourai_mokou','temple_shou','mtn_kanako','mtn_suwako']];
      game.players.forEach((player,i)=>player.hand=hands[i].slice());const used=new Set(hands.flat());
      game.drawPile=shuffle(CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion&&!used.has(card.id)).map(card=>card.id));
      game.startingCardIds=new Set([...used,...game.drawPile]);game.handKnowledge=game.players.map(()=>new Map());if(chapter===1)game.revealHand(0,game.players[0].hand,[1]);
    }
    game.ui.pickOwnHandCards=async()=>null;game.ui.pickCell=async(t,cells)=>cells[0];game.ui.promptText=async()=>null;
    game.pickUI=async(p,method,args)=>game.ui[method](...args);game.choosePlayer=async()=>1;
    game.chooseHandCard=async(p,target)=>game.players[target].hand.find(id=>game.canHandEnterPile(id));return game;
  }
  function inventory(match){return [...match.drawPile,...match.shopCards.filter(Boolean),...match.mainBoardCells().map(cell=>match.cardAt(cell.r,cell.c)),...match.players.flatMap(player=>[...player.hand,...player.discard])];}
  async function place(id,p=0,r=1,c=1){game.removeFromHand(p,id);return game.internalPlace(id,r,c,p,0);}
  ok(STORY_CHAPTERS.length===7&&storyScarletCards().length===4,'The prototype contains seven chapters and the four core Mansion cards');
  for(const chapter of [1,2])for(const actor of [0,1]){
    setup(chapter,actor);const ids=inventory(game);
    ok(game.numPlayers===2&&game.currentPlayerIdx===actor&&!game.kourindouEnabled&&game.players.every(p=>p.hand.length===6),'The chapter keeps a randomized first actor, two six-card hands and a basic table: '+chapter+'/'+actor);
    ok(ids.length===new Set(ids).size&&ids.length===game.startingCardIds.size&&ids.every(id=>game.startingCardIds.has(id)),'A chapter uses unique real cards with conserved inventory: '+chapter+'/'+actor);
    ok((chapter===1?game.players[0].hand.every(id=>game.handKnowledge[1].get(id)===0)&&game.handKnowledge[0].size===0:game.handKnowledge.every(memory=>memory.size===0))&&!('openingHand' in game.storyMatch),'Only the first story chapter receives the learner opening hand, without a stored opening list: '+chapter+'/'+actor);
  }
  for(const card of CARDS.filter(card=>!card.token&&!card.shopkeeper)){
    setup(1);game.board[1][1]=card.id;const before=JSON.stringify(game.testRuleState());const flags=await game.resolveAbility(card.id,1,1,0,0);
    ok(game.abilityId(card.id)==='__story_no_ability'&&game.isCardAbilityDisabled(card.id)&&JSON.stringify(game.testRuleState())===before&&!flags.extraTurns&&!flags.skipAdvance,'Chapter one suppresses every active and passive ability: '+card.id);
  }
  setup(1);game.setCardAt(0,0,'mtn_kanako');game.setCardAt(0,1,'hourai_eirin');
  ok(!game.hasActiveAbility('mtn_kanako')&&game.kanakoMultiplier()===1&&!game.eirinActive()&&!game.isWildActive('sage_kasen')&&game.pointValue('hell_hecatia')===1,'No Kanako, Eirin, Kasen or Hecatia passive survives chapter one');
  ok(!game.canOverrideTarget('sage_yukari','mtn_sanae')&&!game.canPlaceOnWasteland(CARD.mtn_kanako),'Override and wasteland permissions are also disabled');
  setup(2);
  ok(CARDS.every(card=>game.cardAbilityEnabled(card.id)===(card.faction==='sdm'&&!card.shopExpansion)),'Chapter two unlocks only the Mansion faction');
  await place('sdm_remilia');
  ok(game.storyMatch.progress.remilia&&game.players[0].hand.filter(id=>CARD[id].faction==='sdm').length===3,'Actual Remilia resolution gathers the other three Mansion cards and records the goal');
  ok(game.players[1].hand.every(id=>CARD[id].faction!=='sdm'),'Remilia transfers real cards instead of generating substitutes');
  setup(2);game.players[1].hand=game.players[1].hand.filter(id=>id!=='sdm_sakuya');await place('sdm_remilia');
  ok(!game.storyMatch.progress.remilia,'Remilia ending with fewer than three Mansion cards does not satisfy the goal');
  setup(2);game.players[0].hand.push('sdm_patchouli','sdm_sakuya');
  ok(!game.storyMatch.progress.remilia,'Merely holding three or more Mansion cards does not imply using Remilia');
  for(const caster of [0,1])for(const target of [0,1]){
    setup(2);game.choosePlayer=async()=>target;game.chooseHandCard=async()=>game.players[target].hand.find(id=>CARD[id].faction!=='sdm');
    const victim=game.players[target].hand.find(id=>CARD[id].faction!=='sdm');
    const flagsBefore=game.storyMatch.progress.flandre;game.setCardAt(1,1,'sdm_flandre');await game.resolveAbility('sdm_flandre',1,1,caster,0);
    ok(game.players[target].discard.includes(victim)&&game.storyMatch.progress.flandre===(caster===0&&target===1),'Flandre requires the player to discard an opponent hand card: '+caster+'/'+target);
  }
  setup(2);game.chooseHandCard=async()=>null;await place('sdm_flandre');ok(!game.storyMatch.progress.flandre,'Cancelling Flandre selection leaves its objective incomplete');
  setup(2);game.board=Array.from({length:4},()=>Array(4).fill(null));storyScarletCards().forEach((id,i)=>{game.removeFromHand(game.players[0].hand.includes(id)?0:1,id);game.setCardAt(Math.floor(i/2),i%2,id);});
  game.checkClaims(1);ok(!game.storyMatch.progress.sdm,'The opponent claiming Mansion does not satisfy the player objective');
  setup(2);storyScarletCards().forEach((id,i)=>{game.removeFromHand(game.players[0].hand.includes(id)?0:1,id);game.setCardAt(Math.floor(i/2),i%2,id);});
  game.checkClaims(0);ok(game.storyMatch.progress.sdm&&game.players[0].discard.length===4,'The player must really claim the connected four-card Mansion faction');
  for(let turn=0;turn<=4;turn++){
    setup(2);game.drawPile=[];game.players[1].hand=['sdm_sakuya','sdm_patchouli'];
    for(let i=0;i<turn;i++){game.beginPlayerTurn(1);game.endPlayerTurn(1);}
    const action=await aiDecideAction(1);
    ok(action.type==='place'&&CARD[action.cardId].faction==='sdm','A legal Mansion placement takes precedence over strategic holding when it is the only available action: '+turn);
  }
  setup(2);game.beginPlayerTurn(1);game.beginPlayerTurn(1);game.beginPlayerTurn(1);game.beginPlayerTurn(1);game.removeFromHand(1,'sdm_sakuya');game.addToHand(1,'sdm_sakuya');
  ok(!aiStoryPlacement(1,'sdm_sakuya',game.emptyCells(1)),'Reacquiring a Mansion card resets its three-turn holding preference');
  setup(2);game.removeFromHand(1,'mtn_suwako');game.drawPile.push('mtn_suwako');game.drawPile.splice(game.drawPile.indexOf('palace_rin'),1);game.addToHand(1,'palace_rin');game.reserveAges[1]={sdm_patchouli:99,sdm_sakuya:99};ok((await aiDecideAction(1)).type==='draw','Without a three-card support route, AI prefers a legal shared draw over playing mature Mansion cards before all Mansion cards appear');
  setup(2);game.players[0].hand.push('hell_kutaka');game.players[1].hand.push('sage_ran');game.reserveAges[1]={sdm_patchouli:99,sdm_sakuya:99};
  let action=await aiDecideAction(1);ok(action.type==='place'&&CARD[action.cardId].faction!=='sdm','When hands are full, the chapter-two AI prefers filler while Mansion awaits Remilia');
  setup(2);game.storyMatch.sdmPlaced=storyScarletCards();action=await aiDecideAction(1);
  ok(action.type==='place','Once all core Mansion cards have appeared, the opponent resumes placing cards');
  const record=game.storyMatch.sdmPlaced.slice();game.board=Array.from({length:4},()=>Array(4).fill(null));
  ok(storyScarletAllPlaced(game)&&JSON.stringify(game.storyMatch.sdmPlaced)===JSON.stringify(record),'The delay condition records past placements even after faction collection empties the board');
  setup(2);const snapshot=JSON.stringify(captureAIEvaluationSnapshot(game)),metrics=JSON.stringify(game.testMetrics),random=Math.random;
  Math.random=()=>{throw Error('Story planning must not consume RNG');};try{await aiDecideAction(1);}finally{Math.random=random;}
  ok(snapshot===JSON.stringify(captureAIEvaluationSnapshot(game))&&metrics===JSON.stringify(game.testMetrics),'Story planning does not mutate state, statistics or randomness');

  function studentCell(id,first){
    const cells=game.emptyOrWastelandForCard(CARD[id],0).filter(cell=>inBounds(cell.r,cell.c));if(first&&cells.some(cell=>cell.r===first.r&&cell.c===first.c))return first;
    let best=null;for(const cell of cells){const pick=aiWithPlacement(id,cell,()=>{
      const members=game.factionCells(CARD[id].faction).filter(at=>at.r!==cell.r||at.c!==cell.c),points=aiCurrentClaims(0).reduce((sum,claim)=>sum+claim.points,0);
      const distance=members.length?Math.min(...members.map(at=>Math.abs(at.r-cell.r)+Math.abs(at.c-cell.c))):0;
      return {cell,value:points*1000-distance*10+DIRS4.filter(([dr,dc])=>inBounds(cell.r+dr,cell.c+dc)&&!game.cardAt(cell.r+dr,cell.c+dc)).length};
    },0);if(!best||pick.value>best.value)best=pick;}return best?.cell;
  }
  for(const chapter of [1,2])for(const actor of [0,1])for(let opening=0;opening<16;opening++){
    setup(chapter,actor,chapter*1000+actor*100+opening);const before=new Set(inventory(game)),match=game;
    const order=chapter===1?['haku_youmu','haku_yuyuko','sdm_remilia','sdm_flandre','yuuka','medicine']:['sdm_remilia','sdm_flandre','yuuka','medicine','sdm_patchouli','sdm_sakuya','haku_youmu','haku_yuyuko'];let index=0,turns=0;
    doPlayerAction=async p=>{if(p!==0)return originalAction(p);const id=order[index++];assert(game.players[0].hand.includes(id),'Retain lesson card '+id+' at '+chapter+'/'+actor+'/'+opening+', step '+index+', hand '+JSON.stringify(game.players[0].hand)+', log '+JSON.stringify(game.logLines.slice(-10)));const cell=studentCell(id,index===1?{r:Math.floor(opening/4),c:opening%4}:null);assert(cell);return place(id,0,cell.r,cell.c);};
    while(!match.winner&&!match.stalemateMessage&&turns++<30){const p=match.currentPlayerIdx;match.beginPlayerTurn(p);const flags=await doPlayerAction(p);await afterAction(p,flags,match.takeScheduledExtraTurns(p));}
    doPlayerAction=originalAction;
    ok(storyMatchComplete(match)&&match.winner?.idx===0,'A real full story match clears every objective: '+chapter+'/'+actor+'/'+opening);
    const ids=inventory(match);ok(ids.length===before.size&&new Set(ids).size===ids.length&&ids.every(id=>before.has(id)),'The walkthrough conserves all original cards: '+chapter+'/'+actor+'/'+opening);
    walkthroughs.push({chapter,actor,opening,turns,playerPoints:match.winCount(match.players[0]),opponentPoints:match.winCount(match.players[1]),progress:{...match.storyMatch.progress}});
  }
  setup(2);game.winner=game.players[0];
  ok(storyMatchComplete(game)&&storyMatchStars(game)===0,'A zero-star victory clears chapter two');
  for(const key of ['sdm','remilia','flandre']){game.storyMatch.progress={sdm:true,remilia:true,flandre:true};game.storyMatch.progress[key]=false;ok(storyMatchComplete(game)&&storyMatchStars(game)===2,'Each extra objective awards one independent star: '+key);}
  game.storyMatch.progress={sdm:true,remilia:true,flandre:true};game.winner=game.players[1];ok(!storyMatchComplete(game),'All extra goals without victory are insufficient');
  setup(1);game.winner=game.players[0];ok(storyMatchComplete(game),'Chapter one requires victory without impossible ability objectives');
  ok(JSON.stringify(CARDS)===definitions,'Story chapters do not mutate global printed card definitions');

  returnToMainMenu();openStoryMenu();ok(el('story-overlay').classList.contains('show')&&el('story-levels').children.length===7,'The menu offers seven replayable prototype chapters');
  showStoryChapterIntro(2);ok(el('story-card-grid').children.length===4&&!el('story-begin').hidden&&game===null,'Chapter two shows all four active core cards before a match begins');
  const starts=storyLoopStarts;el('story-begin').events.click();const old=game;
  ok(isStoryMatch()&&game.storyMatch.chapter===2&&storyLoopStarts===starts+1&&!el('story-overlay').classList.contains('show'),'Start chapter launches one real match after the card introduction');
  ok(!tutorialAllowsTrade()&&tutorialAllowsAction('place','sdm_remilia')&&tutorialAllowsAction('draw'),'Story matches retain normal placement and shared drawing with the shop omitted');
  game.winner=game.players[0];updateTutorialProgress();ok(storyState.complete&&storyBestStars(2)===0&&!el('tutorial-next').disabled,'Winning with missing goals saves a zero-star clear and permits the next chapter');
  game.storyMatch.progress={sdm:true,remilia:true,flandre:true};updateTutorialProgress();ok(storyState.complete&&storyClearedChapters().includes(2)&&!el('tutorial-next').disabled,'A true clear records progress and enables chapter navigation');
  el('restart-btn').events.click();ok(old.cancelled&&game===null&&storyState===null&&storyMenuChapter===3&&el('story-card-grid').children.length===2,'Finishing chapter two retires its match and opens the Hakugyokurou skill introduction');
  showStoryChapterIntro(1);el('story-begin').events.click();assert(isTutorialPractice()&&tutorialState.preludeChapter===1);el('tutorial-skip').events.click();game.winner=game.players[0];updateTutorialProgress();el('restart-btn').events.click();
  ok(game===null&&storyMenuChapter===2&&el('story-card-grid').children.length===4,'Clearing chapter one leads to the Mansion skill introduction');
  el('story-begin').events.click();const retired=game;game.storyMatch.progress.remilia=true;let idleResolved=0;window.__resolveHumanTurn=()=>idleResolved++;el('tutorial-retry').events.click();
  ok(retired.cancelled&&game!==retired&&!Object.values(game.storyMatch.progress).some(Boolean),'Retry resets objectives, holding ages and the entire old match');
  ok(idleResolved===1&&window.__resolveHumanTurn===null,'Story retry resolves the retired idle human turn and releases its controls');
  game.winner=game.players[1];updateTutorialProgress();const beforeKey=game;pressStoryKey('n');
  ok(game!==beforeKey&&beforeKey.cancelled&&game.storyMatch.chapter===2&&ordinaryRestarts===0,'N retries the current story chapter instead of starting an ordinary match');
  game.winner=game.players[0];game.storyMatch.progress={sdm:true,remilia:true,flandre:true};updateTutorialProgress();pressStoryKey('n');
  ok(game===null&&storyMenuChapter===3&&el('story-card-grid').children.length===2&&ordinaryRestarts===0,'N after chapter two follows the Hakugyokurou introduction');
  returnToMainMenu();game=new Game(2,{},null,{aiDifficulty:'hard'});ok(!game.storyMatch&&game.cardAbilityEnabled('sage_kasen')&&game.abilityId('sdm_sakuya')==='sdm_sakuya','Returning to ordinary play restores every normal ability');
  el('restart-btn').events.click();ok(ordinaryRestarts===1,'Ordinary result controls retain their normal behavior');
  return {status:'pass',count:checks.length,checks,walkthroughs,rulesVersion:REWORK_RULES_VERSION,scope:'Shipped story rules and AI, complete real-rule walkthroughs and controlled chapter UI lifecycle; no browser pixel verification'};
})()`,ctx).then(result=>{fs.writeFileSync(root+'/tests/story-opening-chapters-2026-10-15-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' story checks and '+result.walkthroughs.length+' complete matches passed');}).catch(error=>{console.error(error.stack);process.exitCode=1;});
