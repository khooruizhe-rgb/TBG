const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=require('node:path').resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
let clock=1000,serial=0;
class FixtureDate extends Date{static now(){return clock;}}
const timers=new Map(),frames=new Map(),elements=new Map(),documentListeners=new Map();
function element(id=''){
  if(elements.has(id))return elements.get(id);
  const classes=new Set(),listeners=new Map();
  const node={id,style:{},hidden:false,disabled:false,checked:false,textContent:'',innerHTML:'',isConnected:true,
    classList:{add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),contains:v=>classes.has(v),toggle(v,on){if(on===undefined)on=!classes.has(v);on?classes.add(v):classes.delete(v);return on;}},
    addEventListener(type,fn){listeners.set(type,[...(listeners.get(type)||[]),fn]);},
    emit(type,event){for(const fn of listeners.get(type)||[])fn(event);},
    focus(){},replaceChildren(){this.innerHTML='';},querySelectorAll(){return [];},setAttribute(){}};
  elements.set(id,node);return node;
}
const document={body:element('body'),documentElement:element('html'),
  addEventListener(type,fn){documentListeners.set(type,[...(documentListeners.get(type)||[]),fn]);},removeEventListener(){},
  querySelectorAll(){return [];},querySelector(selector){return selector.split(',').some(s=>{const m=s.match(/^#([^\.]+)\.show$/);return m&&element(m[1]).classList.contains('show')})?{}:null;}};
const context=vm.createContext({console,Date:FixtureDate,document,window:{scrollTo(){},__resolveHumanTurn:null},el:element,
  setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,due:clock+(ms||0)});return id;},clearTimeout:id=>timers.delete(id),
  requestAnimationFrame(fn){const id=++serial;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
  ruleTextHtml:v=>String(v),escapeLogHtml:v=>String(v),translateGameText:v=>String(v),setRuleText:(node,v)=>node.textContent=String(v),
  waitForVisualEffects:async()=>true,location:{reload(){throw new Error('Page reload attempted')}},
  renderBoard(){context.drawCalls++;},renderHand(){},renderPlayers(){},renderLog(){},renderStatus(){},updateTutorialProgress(){},publishSnapshot(){},playGameCue(){},drawCalls:0,
  runNextTurn(){context.turnStarts++;},turnStarts:0,speakRinnosuke(){},queueMobileViewport(){},closeAITestDashboard(){element('ai-test-overlay').classList.remove('show');},
  closeOnlineSession(){},startOnlineHost(){},showOnlineError(){},clearTitleTableSlides(){}});
context.closeAILab=()=>element('ai-lab-overlay').classList.remove('show');
context.renderTitleTableCards=()=>{};context.updateStartButtonState=()=>{};context.fullscreenElement=()=>null;
vm.runInContext(html.slice(html.indexOf('const DIRS4 ='),html.indexOf('/* ===================== UI layer')),context);
vm.runInContext(`var game=null,online=null,ui={},customizeOn=false,customSelected=new Set(),chosenBoardSize=4,chosenPlayerCount=3,chosenAIDifficulty='hard';
var pendingRemoteTurn=null,pendingRemoteChoice=null,pendingPlayerChoice=null,pendingHandChoice=null,pendingRectChoice=null,cancelLookIntoView=null;
var cancelKoishiWalk=null,activeTenshiUpdraft=null,cancelRemiliaGather=null,rinnosukeOpeningTimer=null,rinnosukeLastSpoke=0;
var presentationWaiters=new Set(),sanaeArrivalUntil=new Map(),mokouArrivalUntil=new Map(),yukariArrivalUntil=new Map(),yuukaSunflowerUntil=new Map(),yuukaSunflowerBlooms=new Map(),wastelandCreationUntil=new Map(),remiliaArrivals=new Map(),koishiArrivalUntil=new Map();
var ruleTextSources=new WeakMap();
function clearRinnosukeBubble(){clearTimeout(rinnosukeOpeningTimer);rinnosukeOpeningTimer=null;}
`,context);
for(const name of ['closeTitleMemoryGame','closeDebugControls','cancelByakurenPeek','finishTitleCardDrag','clearTableCardSlides','clearTutorialPractice','clearHandDragPhysics','clearHandPlacementArrivals','closeMobileJournal','clearCrownBackdrop','clearMindEffects','releaseRectPointer','removeYuukaBloom','clearExpansionEffects','closeCardDetails'])context[name]=()=>{};
vm.runInContext(html.slice(html.indexOf('function pruneRuleTextSources()'),html.indexOf('\nfunction canonicalCardName')),context);
vm.runInContext(html.slice(html.indexOf('let announcedGameResult='),html.indexOf('/* generic UI choosers')),context);
vm.runInContext(html.slice(html.indexOf('/* Completed-game statistics'),html.indexOf('/* AI evaluation engine start */')),context);
vm.runInContext(html.slice(html.indexOf('function resetGameView()'),html.indexOf('\nfunction startNewGame')),context);
vm.runInContext(html.slice(html.indexOf('function startNewGame('),html.indexOf('/* Rinnosuke speaks')),context);
vm.runInContext(html.slice(html.indexOf('function updateStartButtonState('),html.indexOf("el('customize-toggle').addEventListener",html.indexOf('function updateStartButtonState('))),context);
vm.runInContext(html.slice(html.indexOf("el('start-btn').addEventListener('click'"),html.indexOf('\nrenderTitleTableCards();',html.indexOf("el('start-btn').addEventListener('click'"))),context);
function flushFrames(){const timer=vm.runInContext('fastAITestRenderTimer',context);if(timers.has(timer)){const job=timers.get(timer);timers.delete(timer);clock=job.due;job.fn();}const jobs=[...frames.values()];frames.clear();for(const fn of jobs)fn();}
function press(key,options={}){const event={key,repeat:false,isComposing:false,target:{closest(){return options.input?{}:null;}},preventDefault(){this.prevented=true;},...options};for(const fn of documentListeners.get('keydown')||[])fn(event);return event;}
const result={checks:[]};
const check=(label,fn)=>{fn();result.checks.push(label);};
(async()=>{
  vm.runInContext('chosenAITestMode=true;startNewGame();',context);flushFrames();
  check('N does not abandon an unfinished round',()=>{const n=context.turnStarts;press('n');assert.strictEqual(context.turnStarts,n);});
  press('p');assert(vm.runInContext('aiTestPaused',context));
  const pending=vm.runInContext('waitAITestReady(game)',context);press('p');assert.strictEqual(await pending,true);result.checks.push('P pauses and releases waiting actions');
  press('d');assert(element('ai-test-overlay').classList.contains('show'));assert(vm.runInContext('aiTestPaused',context));
  press('F8',{input:true});assert(!element('ai-test-overlay').classList.contains('show'));assert(vm.runInContext('aiTestPaused',context));result.checks.push('D opens a paused dashboard and closing it retains pause');
  press('p');
  await vm.runInContext('game.winner=game.players[0];game.testMetrics.turns=1;finishAITestRound(game)',context);
  check('Manual restart is the default and records the round once',()=>{assert(vm.runInContext('aiTestWaitingForNext && aiTestStats.games===1 && aiTestRestartTimer===null',context));assert(!element('ai-test-next-btn').disabled);});
  await vm.runInContext('finishAITestRound(game)',context);assert(vm.runInContext('aiTestStats.games===1',context));
  check('Typing, held keys and modifiers do not restart a game',()=>{const n=context.turnStarts;press('n',{input:true});press('n',{repeat:true});press('n',{ctrlKey:true});assert.strictEqual(context.turnStarts,n);});
  press('n');flushFrames();assert(vm.runInContext('aiTestStats.games===1 && !aiTestWaitingForNext',context));result.checks.push('N starts the next round and retains cumulative statistics');
  await vm.runInContext('setContinuousAITest(true);game.winner=game.players[0];finishAITestRound(game)',context);
  let autoId=vm.runInContext('aiTestRestartTimer',context);assert(autoId!==null);const cancelledCallback=timers.get(autoId).fn;
  press('d');assert(!timers.has(autoId));const before=context.turnStarts;cancelledCallback();assert.strictEqual(context.turnStarts,before);
  press('d');press('p');autoId=vm.runInContext('aiTestRestartTimer',context);assert(autoId!==null);
  timers.get(autoId).fn();timers.delete(autoId);assert.strictEqual(context.turnStarts,before+1);flushFrames();result.checks.push('Continuous mode resumes and dashboard opening cancels pending restart');
  await vm.runInContext('game.winner=game.players[0];finishAITestRound(game)',context);
  const stale=timers.get(vm.runInContext('aiTestRestartTimer',context)).fn;
  vm.runInContext('resetGameView();',context);stale();assert.strictEqual(vm.runInContext('game',context),null);result.checks.push('A cancelled round cannot restart through a stale callback');
  vm.runInContext('setContinuousAITest(false);startNewGame();',context);flushFrames();context.drawCalls=0;
  vm.runInContext('for(let i=0;i<30;i++)renderAll();',context);assert.strictEqual(context.drawCalls,0);flushFrames();assert.strictEqual(context.drawCalls,1);result.checks.push('Thirty fast render requests coalesce into one frame');
  vm.runInContext('for(let i=0;i<10000;i++)ruleTextSources.set({isConnected:false},{value:"old"});pruneRuleTextSources();',context);
  assert.strictEqual(vm.runInContext('ruleTextSources instanceof WeakMap',context),true);result.checks.push('Rule-text tracking uses weak references for detached nodes');
  vm.runInContext(`for(let i=0;i<1500;i++){startNewGame();game.makeTrap();game.makeTrap();const copy='created_card_'+(++nextCreatedCard);CARD[copy]=blueprintCopy('sage_ran',copy,'sage_ran');game.startingCardIds.add(copy);game.players[0].hand.push(copy);CARD.satori_hidden_999={id:'satori_hidden_999',hiddenChoice:true,token:true};}`,context);flushFrames();
  result.tokenDefinitions=vm.runInContext('Object.keys(CARD).filter(id=>/^trap_token_/.test(id)).length',context);
  result.snapshotTokens=vm.runInContext('captureAIEvaluationSnapshot(game).tokens.length',context);
  assert.strictEqual(result.tokenDefinitions,2);assert.strictEqual(result.snapshotTokens,2);result.checks.push('Fifteen hundred in-place restarts retain only the current two trap definitions');
  assert.strictEqual(vm.runInContext('Object.keys(CARD).filter(id=>/^created_card_/.test(id)).length',context),1);assert.strictEqual(vm.runInContext('Object.keys(CARD).filter(id=>CARD[id].hiddenChoice).length',context),1);result.checks.push('Fifteen hundred restarts release copied cards and hidden-choice aliases');
  context.importedStats=vm.runInContext('({...createAITestStats(),games:1500,wins:1400,stalemates:100})',context);
  vm.runInContext('aiTestStats=importedStats;',context);
  assert.strictEqual(vm.runInContext('aiTestExportData().statistics.games',context),1500);
  fs.writeFileSync(root+'/tests/ai-controls-2026-10-12-reexport.csv',vm.runInContext('aiTestCSV()',context));result.checks.push('Cumulative 1500-game totals remain available through JSON and CSV export');
  const retired=vm.runInContext('game',context);let retiredAtResolve=false;
  const humanWait=new Promise(resolve=>{context.window.__resolveHumanTurn=value=>{retiredAtResolve=retired.cancelled;resolve(value);};});
  vm.runInContext('resetGameView()',context);assert.deepStrictEqual({...await humanWait},{});assert(retiredAtResolve);assert.strictEqual(context.window.__resolveHumanTurn,null);
  result.checks.push('Reset resolves a pending human action only after retiring its match');
  for(let i=0;i<3;i++){
    const before=context.turnStarts;element('start-btn').emit('click',{});flushFrames();assert.strictEqual(context.turnStarts,before+1);assert(element('game').classList.contains('active'));
    element('ai-lab-overlay').classList.add('show');element('online-overlay').classList.add('show');element('ai-test-overlay').classList.add('show');
    vm.runInContext('returnToMainMenu()',context);assert.strictEqual(vm.runInContext('game',context),null);assert(!element('game').classList.contains('active'));assert.strictEqual(element('setup').style.display,'');
    for(const id of ['ai-lab-overlay','online-overlay','ai-test-overlay'])assert(!element(id).classList.contains('show'));
  }
  result.checks.push('Returning to the menu removes leftover overlays and the start button works across repeated games');
  vm.runInContext("customizeOn=true;customSelected.clear();customSelected.add('hourai_eirin');customSelected.add('mtn_sanae');customSelected.add('palace_rin');updateStartButtonState();",context);
  assert(!element('start-btn').disabled);const beforePartial=context.turnStarts;element('start-btn').emit('click',{});flushFrames();
  assert.equal(context.turnStarts,beforePartial+1);assert(vm.runInContext("game.players.every(p=>p.hand.length===6)&&['hourai_eirin','mtn_sanae','palace_rin'].every(id=>game.players[0].hand.includes(id))",context));
  result.checks.push('The real start button accepts three selected opening cards and randomly fills the remaining slots');
  vm.runInContext('customizeOn=false;customSelected.clear();',context);
  fs.writeFileSync(root+'/tests/ai-controls-2026-10-12-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e.stack);process.exitCode=1});
