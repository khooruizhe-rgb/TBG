const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
for(const [,code]of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(code);
const builder=vm.createContext({});vm.runInContext(html.slice(html.indexOf('function buildAIEvaluationWorkerSource'),html.indexOf('\nfunction evalHashSeed')),builder);builder.html=html;
class Node{
  constructor(){this.children=[];this.parentElement=null;this.events={};this.dataset={};this.attributes={};this.style={setProperty(){}};this.names=new Set();this.classList={add:n=>this.names.add(n),remove:n=>this.names.delete(n),contains:n=>this.names.has(n),toggle:(n,on)=>{if(on===undefined)on=!this.names.has(n);on?this.names.add(n):this.names.delete(n);return on;}};this.isConnected=true;}
  appendChild(child){child.parentElement=this;this.children.push(child);return child;}insertBefore(child){return this.appendChild(child);}prepend(child){child.parentElement=this;this.children.unshift(child);}
  querySelector(){return new Node();}addEventListener(name,fn){this.events[name]=fn;}removeEventListener(name){delete this.events[name];}setAttribute(name,value){this.attributes[name]=String(value);}focus(){this.focused=true;}
}
const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
const ctx=vm.createContext({console,setTimeout,clearTimeout,self:{},assert,el,performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
  document:{activeElement:new Node(),body:new Node(),querySelectorAll:()=>[],addEventListener(){}},window:{scrollTo(){},addEventListener(){},removeEventListener(){}},
  setRuleText:(node,text)=>node.textContent=text,ruleTextHtml:text=>text,closeAITestDashboard(){},updateAITestControls(){},queueMobileViewport(){},waitForVisualEffects:async()=>true});
vm.runInContext(vm.runInContext('buildAIEvaluationWorkerSource(html)',builder),ctx);
vm.runInContext(html.slice(html.indexOf('let titleCardDrag='),html.indexOf('function drawTitlePreviewCards('))+html.slice(html.indexOf('function tableCardBounds('),html.indexOf('function setTitleCardFace(')),ctx);
const tutorial=html.slice(html.indexOf('/* Guided practice uses'),html.indexOf('/* CSS lays out the phone table'));
vm.runInContext(tutorial+`
  let tutorialLoopStarts=0,menuReturns=0,normalRestarts=0,online=null;
  runNextTurn=async()=>{tutorialLoopStarts++;};
  function resetGameView(){if(game)game.cancelled=true;window.__resolveHumanTurn?.({});window.__resolveHumanTurn=null;clearTutorialPractice();game=null;}
  function returnToMainMenu(){menuReturns++;resetGameView();}
  function startNewGame(){normalRestarts++;}
`,ctx);
const restartStart=html.indexOf("el('restart-btn').addEventListener('click'");
vm.runInContext(html.slice(restartStart,html.indexOf('\n});',restartStart)+4),ctx);
vm.runInContext(`(async()=>{
  const checks=[],walkthroughs=[];function ok(value,name){assert(value,name);checks.push(name);}
  const originalAction=doPlayerAction;
  function setup(actor=0,seed=0){
    evalResetTokens();evalSetSeed(seed);SIZE=4;game=new Game(2,{},null,{aiDifficulty:'hard',aiOnly:true,fastTest:true});game.currentPlayerIdx=actor;game.players[0].isAI=false;
    configureTutorialMatch(game);game.aiMakesMistake=()=>false;game.render=()=>{};
    // Exercise the actual restored production deal without replacing its hands or reshuffling its deck.
    game.ui.pickOwnHandCards=async()=>null;
    game.ui.pickCell=async(_title,cells)=>cells[0];
    game.ui.pickFromList=async(_title,options)=>options[0]?.value;
    game.pickUI=async(p,method,args)=>game.ui[method](...args);
    return game;
  }
  function inventory(g){return [...g.drawPile,...g.shopCards.filter(Boolean),...g.mainBoardCells().map(cell=>g.cardAt(cell.r,cell.c)),...g.players.flatMap(p=>[...p.hand,...p.discard])];}
  const last=TUTORIALS.length-1;
  ok(TUTORIALS[last].goal==='match'&&TUTORIALS.length===7,'The final match follows the original six tutorial pages, including both shop pages');
  for(const actor of [0,1]){
    const g=setup(actor,actor),ids=inventory(g);
    ok(g.currentPlayerIdx===actor&&g.numPlayers===2&&g.players.every(p=>p.hand.length===6),'The lesson preserves either randomized first actor and deals two full opening hands: '+actor);
    ok(ids.length===new Set(ids).size&&ids.every(id=>g.startingCardIds.has(id))&&ids.length===g.startingCardIds.size,'The lesson contains unique real cards and conserves its full stock: '+actor);
    ok(g.players[0].hand.every(id=>g.handKnowledge[1].get(id)===0)&&g.handKnowledge[0].size===0,'Only the lesson opponent knows the learner opening hand: '+actor);
  }
  setup();const initial=aiTutorialKnownHand(game),drawn=game.takeFromDrawPile(0);game.addToHand(0,drawn);
  ok(initial.length===6&&!aiTutorialKnownHand(game).includes(drawn),'Opening knowledge does not become access to every later unrevealed draw');
  const state=JSON.stringify(captureAIEvaluationSnapshot(game)),lesson=JSON.stringify(game.tutorialLesson),random=Math.random;
  let planned;
  Math.random=()=>{throw Error('Mentor planning must not consume randomness');};
  try{planned=await aiTutorialMentorAction(1);}finally{Math.random=random;}
  ok(planned.type==='place'&&planned.cardId==='mtn_kanako'&&state===JSON.stringify(captureAIEvaluationSnapshot(game))&&lesson===JSON.stringify(game.tutorialLesson),'Mentor planning supports the four-card set without changing cards, scores, knowledge or RNG');
  await originalAction(1);
  ok(game.factionCells('mountain').length===2&&game.players[1].discard.length===0,'Kanako legally places Suwako to leave two Mountain cards for the learner');
  const mountains=game.factionCells('mountain'),nearEmpty=game.emptyCells(0).filter(cell=>mountains.some(member=>Math.abs(member.r-cell.r)+Math.abs(member.c-cell.c)===1));
  ok(nearEmpty.length>=2&&game.wasteland.flat().filter(Boolean).length===6,'Doubled Suwako leaves the learner assembly space while creating six legal wasteland tiles');
  game.removeFromHand(0,'mtn_sanae');game.setCardAt(nearEmpty[0].r,nearEmpty[0].c,'mtn_sanae');
  game.removeFromHand(0,'mtn_aya');game.players[1].hand.push('mtn_aya');
  ok(aiTutorialPlacement(1,'mtn_aya',game.emptyOrWastelandForCard(CARD.mtn_aya,1))===null,'The opponent refuses to take the final four-card collection itself');
  ok(await game.selectCostCards(1,2,2,'cost')===null,'The lesson opponent declines optional destructive costs');

  async function studentAction(order,firstCell){
    const progress=game.tutorialLesson.progress;
    let id;
    if(order==='pair-first'&&!progress.two)id=game.players[0].hand.includes('haku_youmu')?'haku_youmu':'haku_yuyuko';
    else if(!progress.four)id=game.players[0].hand.includes('mtn_sanae')?'mtn_sanae':'mtn_aya';
    else if(!progress.two)id=game.players[0].hand.includes('haku_youmu')?'haku_youmu':'haku_yuyuko';
    else id='marisa';
    assert(game.players[0].hand.includes(id),'The lesson path must retain '+id+' '+JSON.stringify({order,firstCell,hand:game.players[0].hand,progress,logs:game.logLines.slice(-20),board:game.board}));
    const cells=game.emptyOrWastelandForCard(CARD[id],0).filter(cell=>inBounds(cell.r,cell.c));
    // With Suwako active, newly legal wasteland can lie too far from the set.
    // Keep the instructed route completable with the remaining real cards.
    const firstFits=id==='mtn_sanae'&&firstCell&&cells.some(at=>at.r===firstCell.r&&at.c===firstCell.c)
      && aiWithPlacement(id,firstCell,()=>aiCanConnectFaction('mountain',Math.max(0,4-game.factionCells('mountain').length)),0);
    const cell=firstFits?firstCell:aiCurrentFactionPlacement(0,id,cells);
    assert(cell,'A learner landing must exist for '+id);
    game.removeFromHand(0,id);return await game.internalPlace(id,cell.r,cell.c,0,0);
  }
  for(const actor of [0,1])for(const order of ['four-first','pair-first'])for(let opening=0;opening<16;opening++){
    const g=setup(actor,100+actor*100+opening),before=new Set(inventory(g)),firstCell={r:Math.floor(opening/4),c:opening%4};
    doPlayerAction=async p=>p===0?studentAction(order,firstCell):originalAction(p);
    let turns=0;
    while(!g.winner&&!g.stalemateMessage&&turns++<24){
      const p=g.currentPlayerIdx;g.beginPlayerTurn(p);g.tradedThisTurn[p]=false;
      const flags=await doPlayerAction(p);await afterAction(p,flags,g.takeScheduledExtraTurns(p));
    }
    doPlayerAction=originalAction;
    const t={step:last,practice:g};
    ok(g.winner?.idx===0&&tutorialObjectiveMet(t)&&Object.values(g.tutorialLesson.progress).every(Boolean),'The real rules complete all goals and learner victory: actor '+actor+', '+order+', opening '+opening);
    const ids=inventory(g);
    ok(ids.length===before.size&&new Set(ids).size===ids.length&&ids.every(id=>before.has(id)),'A complete lesson conserves every real card: actor '+actor+', '+order+', opening '+opening);
    walkthroughs.push({actor,order,opening,turns,learnerPoints:g.winCount(g.players[0]),opponentPoints:g.winCount(g.players[1])});
  }

  setup();let t={step:last,practice:game,complete:false,cancel(){}};tutorialState=t;
  ok(tutorialAllowsAction('place','marisa')&&tutorialAllowsAction('draw')&&tutorialAllowsTrade(),'The final lesson allows normal card choice, drawing and trading');
  game.players[0].discard=['mtn_aya','mtn_sanae','mtn_suwako','mtn_kanako','haku_youmu','haku_yuyuko','hourai_mokou'];game.checkWin();
  ok(game.winner?.idx===0&&!tutorialObjectiveMet(t),'Seven points without recorded learning actions cannot pass the final page');
  for(const key of ['four','two','ability']){
    game.tutorialLesson.progress={four:true,two:true,ability:true};game.tutorialLesson.progress[key]=false;
    ok(!tutorialObjectiveMet(t),'The final page requires the actual '+key+' goal');
  }
  game.tutorialLesson.progress={four:true,two:true,ability:true};game.winner=game.players[1];
  ok(!tutorialObjectiveMet(t),'Completing learning goals without beating the opponent is insufficient');
  game.winner=game.players[0];updateTutorialProgress();
  ok(t.complete&&!el('tutorial-next').disabled&&el('restart-btn').textContent==='Finish'&&el('tutorial-feedback').innerHTML.includes('✓ Victory'),'A completed real match unlocks Finish and all four checklist items');
  game.tutorialLesson.progress.ability=false;updateTutorialProgress();
  ok(!t.complete&&el('tutorial-next').disabled&&el('restart-btn').textContent==='Retry'&&el('tutorial-feedback').innerHTML.includes('Retry'),'Winning with missing goals offers a retry instead of passing');
  const returns=menuReturns;tutorialStep(1);ok(menuReturns===returns,'Next cannot bypass an unfinished match');
  game.tutorialLesson.progress.ability=true;updateTutorialProgress();tutorialStep(1);
  ok(menuReturns===returns+1&&tutorialState===null&&game===null,'Finish retires the lesson and returns to the menu');

  setup();game.addToDiscard(1,'sdm_patchouli',{effect:'marisa'});
  ok(!game.tutorialLesson.progress.ability,'An opponent skill score does not satisfy the learner goal');
  game.addToDiscard(0,'sdm_flandre',{claimFaction:'sdm',deferWinCheck:true});
  ok(!game.tutorialLesson.progress.ability,'Faction score is not misreported as ability score');
  setup();game.drawPile=game.drawPile.filter(id=>!['sdm_flandre','sdm_sakuya'].includes(id));
  game.addToHand(0,'sdm_sakuya');game.setCardAt(1,1,'sdm_flandre');
  game.choosePlayer=async()=>0;game.chooseHandCard=async()=> 'sdm_sakuya';
  await game.resolveAbility('sdm_flandre',1,1,1,0);
  ok(game.players[0].discard.includes('sdm_sakuya')&&!game.tutorialLesson.progress.ability,'Receiving a point from an opponent ability does not mean the learner used that ability');
  setup();game.drawPile=game.drawPile.filter(id=>!['sdm_flandre','sdm_sakuya'].includes(id));
  game.addToHand(0,'sdm_sakuya');game.setCardAt(1,1,'sdm_flandre');
  game.choosePlayer=async()=>0;game.chooseHandCard=async()=> 'sdm_sakuya';
  await game.resolveAbility('sdm_flandre',1,1,0,0);
  ok(game.tutorialLesson.progress.ability,'A genuine learner hand-discard ability can also satisfy the scoring goal');

  returnToMainMenu();const loops=tutorialLoopStarts;openTutorial(last);const first=game;
  ok(first.numPlayers===2&&tutorialLoopStarts===loops+1&&first.tutorialLesson&&tutorialState.step===last,'The actual final-page opener starts the normal two-player game loop');
  first.tutorialLesson.progress.four=true;first.currentPlayerIdx=0;
  const retiredTurn=originalAction(0);first.winner=first.players[1];updateTutorialProgress();el('restart-btn').events.click();await retiredTurn;
  ok(first.cancelled&&game!==first&&!Object.values(game.tutorialLesson.progress).some(Boolean),'Retry resets lesson objectives and cancels the previous match');
  ok(window.__resolveHumanTurn===null,'Retry resolves the old idle human turn without retaining its controls');
  game.tutorialLesson.progress={four:true,two:true,ability:true};game.winner=game.players[0];updateTutorialProgress();
  const finished=menuReturns;el('restart-btn').events.click();
  ok(menuReturns===finished+1&&tutorialState===null&&game===null,'The result-banner Finish action also completes and retires the lesson');
  returnToMainMenu();game=new Game(2,{},null,{aiDifficulty:'hard'});
  ok(!game.tutorialLesson&&game.handKnowledge.every(memory=>memory.size===0),'A later ordinary match has no mentor policy or leaked opening knowledge');
  el('restart-btn').events.click();ok(normalRestarts===1,'The ordinary result-banner action still uses the normal restart');
  game=null;
  for(const step of [0,1,2,3,4,5]){
    const g=new Game(3,{},null,{aiDifficulty:'hard'});configureTutorialGame(g,step);
    ok(!g.tutorialLesson&&g.numPlayers===3&&g.currentPlayerIdx===0,'Original guided fixture remains separate from the final match: page '+step);
  }
  return {status:'pass',count:checks.length,checks,walkthroughs,rulesVersion:REWORK_RULES_VERSION,scope:'Real engine and turn-followup walkthroughs plus controlled tutorial DOM lifecycle; browser pixels are not verified.'};
})()`,ctx).then(result=>{
  fs.writeFileSync(__dirname+'/tutorial-final-match-2026-10-14-results.json',JSON.stringify(result,null,2)+'\n');
  console.log(result.count+' tutorial checks and '+result.walkthroughs.length+' complete learner matches passed');
}).catch(error=>{console.error(error.stack);process.exitCode=1;});
