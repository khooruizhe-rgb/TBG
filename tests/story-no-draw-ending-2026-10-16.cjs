const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{',box={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx};',box);const {ctx}=box.module.exports;
vm.runInContext(html.slice(html.indexOf('async function runNextTurn(){'),html.indexOf('\n/* Wire human hand-card')).replace('async function runNextTurn(){','async function actualStoryTurn(){'),ctx);
let completed=false;process.on('beforeExit',()=>{if(!completed){console.error('The story-ending suite did not reach its completion marker');process.exitCode=1;}});
vm.runInContext(`(async()=>{
 const checks=[],routes=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
 const full=['sdm_remilia','sdm_flandre','hourai_mokou','hourai_reisen','mtn_kanako','mtn_sanae','palace_satori','palace_rin','sage_yukari','sage_kasen','hell_eiki','hell_komachi','temple_nue','temple_murasa','reimu','yuuka'];
 function make(chapter=5,actor=0){
  evalResetTokens();evalSetSeed('story-ending-'+chapter+'-'+actor);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true});configureStoryMatch(game,chapter);game.players[0].isAI=false;game.currentPlayerIdx=actor;
  game.board=Array.from({length:4},(_,r)=>Array.from({length:4},(_,c)=>full[r*4+c]));game.wasteland=game.board.map(row=>row.map(()=>false));game.players[0].hand=['haku_yuyuko'];game.players[1].hand=['haku_youmu'];game.players[0].discard=['palace_utsuho','sage_ran'];game.players[1].discard=['medicine'];
  const used=[...full,...game.shopCards.filter(Boolean),...game.players.flatMap(p=>[...p.hand,...p.discard])];assert.equal(used.length,new Set(used).size);game.drawPile=CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion&&!used.includes(card.id)).map(card=>card.id);game.startingCardIds=new Set([...used,...game.drawPile]);
  game.forcedPlay={};game.handKnowledge=game.players.map(()=>new Map());game.reserveAges=game.players.map(()=>({}));game.winner=null;game.stalemateMessage='';game.logLines=[];game.beginPlayerTurn(actor);game.evaluationSnapshot=null;stuckStreak=0;evalConservation(game);return game;
 }
 function swapBoardForDeck(id,replacement){const at=game.boardCells(c=>c.id===id)[0],index=game.drawPile.indexOf(replacement);assert(at&&index>=0);game.drawPile.splice(index,1,id);game.setCardAt(at.r,at.c,replacement);return at;}
 function emptySpace(wasteland=false){const id=game.cardAt(0,0);game.setCardAt(0,0,null);game.wasteland[0][0]=wasteland;game.drawPile.push(id);}
 for(const chapter of [1,2,3,4,5,6])for(const actor of [0,1]){
  const g=make(chapter,actor),before=JSON.stringify(captureAIEvaluationSnapshot(g)),pile=g.drawPile.slice(),hands=g.players.map(p=>p.hand.slice()),scores=g.players.map(p=>g.winCount(p));
  assert(g.drawPile.length>0&&g.players.every(p=>g.canDrawNormally(p.idx)));assert(g.storyDrawOnlyStalemate());assert.equal(JSON.stringify(captureAIEvaluationSnapshot(g)),before);
  let actions=0,draws=0,begins=0;const action=doPlayerAction,draw=g.drawForEveryone,begin=g.beginPlayerTurn;doPlayerAction=async()=>{actions++;throw Error('A dead story table asked for another action');};g.drawForEveryone=()=>{draws++;throw Error('A dead story table drew another card');};g.beginPlayerTurn=()=>{begins++;};
  await actualStoryTurn();doPlayerAction=action;g.drawForEveryone=draw;g.beginPlayerTurn=begin;
  assert.equal(actions,0);assert.equal(draws,0);assert.equal(begins,0);assert.deepEqual(g.drawPile,pile);assert.deepEqual(g.players.map(p=>p.hand),hands);assert(g.winner?.idx===0&&g.stalemateMessage.startsWith('No more cards can be placed.'));assert.deepEqual(g.players.map(p=>g.winCount(p)),scores);evalConservation(g);
  if(chapter===5)assert(g.storyMatch.progress.stalemate);if(chapter===3)assert(storyStarGoals(g).find(goal=>goal.key==='race').done);
  routes.push({chapter,actor,points:scores,preservedDeck:pile.length});ok(true,'Chapter '+chapter+', actor '+actor+': the actual turn entry ends immediately with the existing score, unopened deck and unchanged hands, without starting or requesting a draw turn');
 }
 for(const flags of [{skipAdvance:true},{extraTurns:2},{}]){
  make();const action=doPlayerAction;let calls=0,cancelled=0;doPlayerAction=async()=>{calls++;throw Error('Requested an unnecessary extra action');};await afterAction(0,{...flags,cancelExtra:()=>cancelled++},2);doPlayerAction=action;
  ok(calls===0&&cancelled===1&&game.winner?.idx===0&&game.storyMatch.progress.stalemate,'A newly closed board cancels free placements, Sakuya follow-ups and scheduled dancer turns before asking for meaningless draws: '+JSON.stringify(flags));evalConservation(game);
 }
 make();const action=doPlayerAction;let followups=0;doPlayerAction=async()=>{followups++;throw Error('A free action requested a draw');};await resolveFollowups(0,{skipAdvance:true});doPlayerAction=action;
 ok(followups===0&&game.winner?.idx===0,'A nested follow-up also stops at a closed story table');
 for(const tied of [false,true]){
  make();const card=game.players[0].discard.pop();game.drawPile.push(card);if(!tied){const rival=game.players[1].discard[0];game.players[1].discard=[];game.players[0].discard.push(rival);}
  // For an opponent lead use an actual redistribution of existing scoring cards.
  if(!tied){game.players[1].discard=game.players[0].discard.splice(0);}
  endStalemate();ok(game.storyMatch.progress.stalemate&&(tied?game.winner===null:game.winner?.idx===1)&&!storyMatchComplete(game),'Early stalemate preserves '+(tied?'a tied result':'an opponent victory')+' and cannot invent a player clear');evalConservation(game);
 }
 make();emptySpace();const untouched=JSON.stringify(captureAIEvaluationSnapshot(game));ok(!game.storyDrawOnlyStalemate()&&JSON.stringify(captureAIEvaluationSnapshot(game))===untouched,'An ordinary empty board space prevents early ending without mutating the position');
 make();emptySpace(true);ok(game.storyDrawOnlyStalemate(),'Wasteland counts as closed terrain when no remaining card has legal wasteland entry');
 make();emptySpace(true);swapBoardForDeck('mtn_kanako','mtn_suwako');ok(!game.storyDrawOnlyStalemate(),'An active Suwako keeps the match alive when a remaining Mountain card can enter the empty wasteland');
 make(6);emptySpace(true);assert(game.tradeCard(0,'haku_yuyuko',3));ok(game.players[0].hand.includes('hell_kutaka')&&!game.storyDrawOnlyStalemate(),'A real shop purchase of Kutaka can still enter wasteland and prevents early ending');evalConservation(game);
 game.placementBlockTurns[0]=2;game.placementBlockedForTurn[0]=true;const blocked=JSON.stringify(captureAIEvaluationSnapshot(game));ok(!game.storyDrawOnlyStalemate()&&JSON.stringify(captureAIEvaluationSnapshot(game))===blocked,'Temporary placement blocks are ignored only for the eventual-placement check and are never mutated');
 make(6);swapBoardForDeck('sage_yukari','marisa');ok(game.storyDrawOnlyStalemate(),'A locked Yukari in the deck cannot keep an otherwise closed story table alive');
 game.storyMatch.skillFactions.push('sage');const yi=game.drawPile.indexOf('sage_yukari');game.drawPile.splice(yi,1);game.drawPile.unshift('sage_yukari');assert(game.drawPile.at(-1)!=='sage_yukari');
 ok(!game.storyDrawOnlyStalemate(),'An unlocked playable card anywhere in the deck, including beneath unusable draws, keeps the game alive');
 game.drawPile.splice(0,1);game.addToHand(0,'sage_yukari');ok(!game.storyDrawOnlyStalemate(),'A legal override still in hand prevents premature ending even when the entire remaining deck is unusable');evalConservation(game);
 game.forcedPlay[0]='haku_yuyuko';game.placementBlockedForTurn[0]=true;game.placementBlockTurns[0]=2;ok(!game.storyDrawOnlyStalemate(),'A forced unplayable card and a timed blockade do not hide a placement that becomes available after they expire');
 make(6);game.storyMatch.skillFactions.push('sage');swapBoardForDeck('sage_yukari','marisa');game.drawPile.splice(game.drawPile.indexOf('sage_yukari'),1);game.drawPile.push(game.shopCards[1]);game.shopCards[1]='sage_yukari';
 assert(game.players.every(p=>p.hand.every(id=>!game.emptyOrWastelandForCard(CARD[id],p.idx,true).length)));assert(game.drawPile.every(id=>!game.emptyOrWastelandForCard(CARD[id],0,true).length));
 const tradeState=JSON.stringify(captureAIEvaluationSnapshot(game));ok(!game.storyDrawOnlyStalemate()&&JSON.stringify(captureAIEvaluationSnapshot(game))===tradeState,'An available trade for a legally placeable card preserves play without executing the trade or teaching the AI hidden hand information');
 assert(game.tradeCard(0,'haku_yuyuko',1));ok(game.players[0].hand.includes('sage_yukari')&&!game.storyDrawOnlyStalemate(),'The preserved shop continuation is a real executable trade, not a hypothetical placement');evalConservation(game);
 make(6);const merchandise=game.shopCards[3];game.shopCards[3]=null;game.drawPile.push(merchandise);ok(!game.storyDrawOnlyStalemate(),'An empty shop space that the human can legally use prevents a premature full-main-board ending');
 game.players[0].isAI=true;ok(game.storyDrawOnlyStalemate(),'AI-only seats cannot invent a shop placement forbidden by their normal placement rules');
 make();const placement=aiPlacementCells;aiPlacementCells=()=>{throw Error('Stalemate must not depend on an AI heuristic');};assert(game.storyDrawOnlyStalemate());aiPlacementCells=placement;ok(true,'The end judge uses rule legality instead of optional AI evaluation filters');
 make();const match=game;delete match.storyMatch;match.players[0].isAI=true;const beforeNormal=match.drawPile.length;let normalDraws=0;const normalDraw=match.drawForEveryone;match.drawForEveryone=function(...args){normalDraws++;return normalDraw.apply(this,args);};await actualStoryTurn();
 ok(normalDraws===1&&match.drawPile.length===beforeNormal-2&&!match.stalemateMessage,'The same full position in ordinary mode still executes its original shared draw rather than adopting the story rule');evalConservation(match);
 match.tutorialLesson={humanSeat:0,aiSeat:1,openingHand:[],progress:{four:false,two:false,ability:false}};ok(!match.storyDrawOnlyStalemate(),'The original tutorial does not acquire the story-only ending rule');
 return {status:'pass',count:checks.length,checks,routes,rulesVersion:REWORK_RULES_VERSION,scope:'Real rule-level placements and production turn and follow-up entry points, all six chapters and both first actors, conserved real-card positions, immediate scored stalemate without draws, unchanged deck/hands, race and Mountain goals, ties/opponent wins, normal/tutorial isolation, wasteland permissions, temporary blocks, deep-deck and held overrides, actual trade continuation, human versus AI shop scope, and heuristic independence.'};
})()`,ctx).then(result=>{
 const material=fs.readFileSync(__dirname+'/card-materials-2026-10-12.cjs','utf8'),end="const copy='created_card_910'",renderBox={module:{exports:{}},require,__dirname,console};vm.runInNewContext(material.slice(0,material.indexOf(end))+'\nmodule.exports={ctx,A,el,Element};',renderBox);const {ctx:render,A,el,Element}=renderBox.module.exports;
 Element.prototype.prepend=function(node){this.appendChild(node);this.children.unshift(this.children.pop());};
 vm.runInContext(html.slice(html.indexOf('let titleCardDrag='),html.indexOf('function drawTitlePreviewCards('))+html.slice(html.indexOf('function tableCardBounds('),html.indexOf('function setTitleCardFace(')),render);
 render.cancelAnimationFrame=()=>{};render.online=null;render.window.localStorage={getItem:()=>null,setItem(){}};render.ui={};render.runNextTurn=()=>{};render.closeAITestDashboard=()=>{};render.updateAITestControls=()=>{};render.queueMobileViewport=()=>{};render.renderAll=()=>{};render.window.scrollTo=()=>{};
 vm.runInContext(html.slice(html.indexOf('/* Guided practice uses'),html.indexOf('/* CSS lays out the phone table')),render);
 render.resetGameView=()=>vm.runInContext('if(game)game.cancelled=true;clearTutorialPractice();clearStoryMatch();game=null;',render);render.returnToMainMenu=render.resetGameView;
 const run=code=>vm.runInContext(code,render),ok=(value,name)=>{assert(value,name);result.checks.push(name);},noLinks=markup=>!/<button|<a\s|data-inspect-card|data-rule-term/.test(markup);
 for(const language of ['en','zh-CN','en']){
  A.setLanguage(language);render.returnToMainMenu();run('openStoryMenu();');
  for(const button of el('story-levels').children){const description=button.children[1];render.description=description;ok(noLinks(description.innerHTML)&&run('ruleTextSources.get(description).options.cards===false'),'The actual '+language+' chapter-list description has no nested card links and retains the no-link option for later language refresh');}
  for(const chapter of [1,2,3,4,5,6]){
   render.returnToMainMenu();run('showStoryChapterIntro('+chapter+');');ok(noLinks(el('story-intro').innerHTML),'The actual '+language+' chapter '+chapter+' introduction is free of inline card links');
   const count=chapter===1?0:chapter===6?7:chapter===3?2:4;assert.equal(el('story-card-grid').children.length,count);if(count)assert(el('story-card-grid').children.every(node=>node.events.click?.length===1));
   run('closeStoryMenu();openStoryChapter('+chapter+');');ok(noLinks(el('tutorial-feedback').innerHTML),'The actual '+language+' chapter '+chapter+' objectives and hints have no inline card links while current-match stars remain visible');
   assert(el('tutorial-feedback').innerHTML.includes('☆☆☆'));if(chapter===2){run('game.storyMatch.progress.remilia=true;renderStoryCoach();');assert(noLinks(el('tutorial-feedback').innerHTML));}
  }
 }
 A.setLanguage('en');ok(run('ruleTextHtml(CARD.sdm_remilia.name)').includes('data-inspect-card'),'Ordinary rule text retains its existing clickable card references');
 for(const language of ['en','zh-CN']){A.setLanguage(language);const win=A.translateGameText('No more cards can be placed. You wins by stalemate with 2 discard points!'),tie=A.translateGameText('No more cards can be placed. Stalemate! You & AI 1 tie with 1 discard point each.');ok(language==='en'?win.includes('No more cards')&&tie.includes('Stalemate!'):win.includes('已无卡牌可以继续放置')&&tie.includes('平局')&&!/[A-Za-z]{3,}/.test(win+tie),'The '+language+' early-ending win and tie messages are translated by the actual localization path');}
 result.count=result.checks.length;result.scope+=' Actual bilingual chapter selection, introductions and match-coach renderers are checked with preserved card click handlers and language-refresh options; browser pixels are not verified.';
 fs.writeFileSync(__dirname+'/story-no-draw-ending-2026-10-16-results.json',JSON.stringify(result,null,2)+'\n');completed=true;console.log(result.count+' story link and no-draw ending checks passed');
}).catch(error=>{console.error(error);process.exitCode=1;});
