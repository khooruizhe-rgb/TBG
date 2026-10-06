// Real engine, AI action chains and test-controller regression checks; no rendered-browser assertions.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2]||(fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(file,'utf8'),js=html.split('<script>')[1].split('</script>')[0],css=html.split('<style>')[1].split('</style>')[0];new vm.Script(js);
const slice=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a)));
class Element{
 constructor(){this.events={};this.dataset={};this.names=new Set();this.classList={add:(...s)=>s.forEach(v=>this.names.add(v)),remove:(...s)=>s.forEach(v=>this.names.delete(v)),contains:s=>this.names.has(s),toggle:(s,on)=>{if(on===undefined)on=!this.names.has(s);on?this.names.add(s):this.names.delete(s);return on;}};this.hidden=false;}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn);}setAttribute(){}focus(){}appendChild(){}remove(){}click(){}
}
const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
const modeButtons=['play','ai-test'].map(mode=>Object.assign(new Element(),{dataset:{mode}}));
const document={body:new Element(),querySelectorAll:s=>s==='#game-mode-opts .pill-btn'?modeButtons:[],createElement:()=>new Element()};
let seed=73,nextTimer=0,restarts=0;const timers=new Map(),frames=new Map();const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const ctx={console,Math:math,Date,document,el,window:{},setTimeout:(fn,ms)=>{if(ms===80||ms===900){timers.set(++nextTimer,fn);return nextTimer;}fn();return 0;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{frames.set(++nextTimer,fn);return nextTimer;},cancelAnimationFrame:id=>frames.delete(id),
 triggerPlacementPresentation(){},speakRinnosuke(){},logOverride(){},lastPlacedCell:null,renderAll(){},humanActionResolving:false,playGameCue(){},
 setRuleText:(node,text)=>node.textContent=text,ruleTextHtml:s=>String(s),translateGameText:s=>s,escapeLogHtml:s=>String(s).replace(/[<>]/g,''),updateStartButtonState(){},waitForVisualEffects:async()=>true,
 startNewGame:opts=>{restarts++;assert.equal(opts.testContinuation,true);},ui:{}};
vm.createContext(ctx);
vm.runInContext(slice('const DIRS4','/* ===================== UI layer')+'\nvar game=null;\n'+
 slice('const NO_PLACED_ABILITY','async function doPlayerAction')+
 slice('function canTakeTurnAction','/* Cards with no "Placed:')+
 slice('async function doPlayerAction','/* Wire human hand-card')+
 slice('/* AI-only testing keeps','let chosenPlayerCount = 3;')+`
this.api={Game,CARD,CARDS,FACTIONS,createAITestStats,recordCompletedAITest,doPlayerAction,resolveFollowups,canAct,runNextTurn,endStalemate,aiDecideAction,
 waitAITestReady,toggleAITestPause,cancelAITestAutomation,finishAITestRound,renderAITestStats,openAITestDashboard,aiTestExportData,aiTestCSV,
 setGame:g=>game=g,setSize:n=>SIZE=n,stats:()=>aiTestStats,resetStats:()=>aiTestStats=createAITestStats(),paused:()=>aiTestPaused,
 mode:()=>chosenAITestMode,setPaused:v=>aiTestPaused=v,choices:()=>({chosenAITestMode,chosenFastAITest})};`,ctx);
const A=ctx.api,tests=[],test=(name,fn)=>tests.push([name,fn]);
const flush=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
function blank(players=3,options={}){
 A.cancelAITestAutomation();A.setPaused(false);A.setSize(4);const g=new A.Game(players,{},null,{aiOnly:true,fastTest:true,...options});A.setGame(g);
 for(const p of g.players){p.hand=[];p.discard=[];}g.drawPile=[];g.shopCards=['shop_rinnosuke','sdm_meiling','hourai_tewi','hell_kutaka'];g.testMetrics.seen.clear();return g;
}
function snapshot(g){return JSON.stringify([g.board,g.players,g.drawPile,g.shopCards,g.testMetrics.placements,[...g.testMetrics.seen],g.testMetrics.claims]);}
function cssValue(selector,property){let value;for(const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){const selectors=m[1].replace(/\/\*[\s\S]*?\*\//g,'').split(',').map(s=>s.trim());if(!selectors.includes(selector))continue;for(const declaration of m[2].split(';')){const i=declaration.indexOf(':');if(declaration.slice(0,i).trim()===property)value=declaration.slice(i+1).trim();}}return value;}
test('Every selection overlay, inspector, glossary and winner stays above all global effect layers',()=>{
 const effects=['.mind-fx.temple-fx','.touch-drag-ghost','html.time-stopped::after','.master-spark','.gap-rift','.ability-flight','.discard-vanish','.draw-flight-card'];
 const maximum=Math.max(...effects.map(s=>parseInt(cssValue(s,'z-index'))||0));assert(maximum>=230);
 for(const selector of ['#modal-overlay','#look-into-overlay','#byakuren-peek-overlay','#ai-test-overlay']){assert(Number(cssValue(selector,'z-index'))>maximum,selector);assert.equal(cssValue(selector,'isolation'),'isolate');}
 assert(Number(cssValue('#card-detail-overlay','z-index'))>Number(cssValue('#byakuren-peek-overlay','z-index')));
 assert(Number(cssValue('#rule-term-popover','z-index'))>Number(cssValue('#card-detail-overlay','z-index')));
});
test('AI-only mode uses AI in all two, three or four seats without changing ordinary play',()=>{
 for(const count of [2,3,4]){const g=new A.Game(count,{},null,{aiOnly:true,fastTest:true});assert(g.players.every(p=>p.isAI));assert.deepEqual(Array.from(g.players,p=>p.name),Array.from({length:count},(_,i)=>`AI ${i+1}`));assert(g.fastAITest);assert.equal(g.testMetrics.seen.size,count*6);}
 const g=new A.Game(3,{},null,{fastTest:true});assert(!g.players[0].isAI);assert(g.players.slice(1).every(p=>p.isAI));assert.equal(g.testMetrics,null);assert.equal(g.fastAITest,false);
});
test('Actual draw, trade, hand entry, placement and faction claim mutations are measured once',async()=>{
 const g=blank();g.players[0].hand=['medicine'];g.drawPile=['hourai_mokou'];assert(g.drawForEveryone(0));assert.equal(g.testMetrics.drawActions,1);assert.equal(g.drawForEveryone(0),0);assert.equal(g.testMetrics.drawActions,1);
 const offered=g.players[0].hand[0];assert(g.tradeCard(0,offered,1));assert(!g.tradeCard(0,g.players[0].hand[0],2));assert.equal(g.testMetrics.trades,1);assert(g.testMetrics.seen.has('sdm_meiling'));
 g.setCardAt(2,1,'yuuka');await g.internalPlace('medicine',2,2,0,0);assert.equal(g.testMetrics.placements.medicine,1);assert.equal(g.testMetrics.claims.sunflower,1);g.checkClaims(0);assert.equal(g.testMetrics.claims.sunflower,1);
 g.addToDiscard(0,'palace_rin');assert.equal(g.testMetrics.claims.palace,undefined);
});
test('Invalid placements and AI forecasts cannot change placement or opportunity statistics',async()=>{
 const g=blank();g.players[0].hand=['medicine','sdm_meiling'];g.setCardAt(0,0,'hourai_eirin');await g.internalPlace('medicine',0,0,0,0);assert.deepEqual(Object.keys(g.testMetrics.placements),[]);
 const before=snapshot(g);await A.aiDecideAction(0);assert.equal(snapshot(g),before);
});
test('Generated Trap tokens aggregate as one card type rather than disappearing from totals',async()=>{
 const g=blank();const token=g.makeTrap();g.addToHand(0,token,true);assert(g.testMetrics.seen.has('trap_token'));await g.internalPlace(token,0,0,0,0);assert.equal(g.testMetrics.placements.trap_token,1);
 g.winner=g.players[0];const s=A.createAITestStats();assert(A.recordCompletedAITest(s,g));assert.equal(s.cards.trap_token.placements,1);assert.equal(s.placements,1);
});
test('Koishi self-placement counts as real card usage, including the triggered Palace claim',async()=>{
 const g=blank();g.players[1].hand=['palace_koishi'];g.recordTestSeen('palace_koishi');
 for(const [r,c,id] of [[1,1,'palace_satori'],[1,2,'palace_rin'],[2,1,'palace_utsuho']])g.setCardAt(r,c,id);
 await g.resolveKoishiCascade(0);assert.equal(g.testMetrics.placements.palace_koishi,1);assert.equal(g.testMetrics.claims.palace,1);assert.equal(g.players[1].discard.length,4);
});
test('Only completed matches contribute and a finished match cannot be recorded twice',()=>{
 const g=blank(),s=A.createAITestStats();g.testMetrics.turns=12;g.testMetrics.seen.add('medicine');g.testMetrics.placements.medicine=2;g.testMetrics.claims.sunflower=2;
 assert.equal(A.recordCompletedAITest(s,g),false);assert.equal(s.games,0);g.winner=g.players[1];assert(A.recordCompletedAITest(s,g));assert.equal(A.recordCompletedAITest(s,g),false);
 assert.equal(s.games,1);assert.equal(s.wins,1);assert.equal(s.turns,12);assert.equal(s.cards.medicine.usedGames,1);assert.equal(s.cards.medicine.seenGames,1);assert.equal(s.cards.medicine.placements,2);assert.equal(s.factions.sunflower.games,1);assert.equal(s.factions.sunflower.claims,2);
 assert.equal(s.seats[0].wins,0);assert.equal(s.seats[1].wins,1);
});
test('Card opportunity denominators, seat eligibility and settings survive mixed match configurations',()=>{
 const s=A.createAITestStats();let g=blank(2);g.winner=g.players[0];g.testMetrics.seen.add('medicine');g.testMetrics.placements.medicine=1;A.recordCompletedAITest(s,g);
 g=blank(4,{aiDifficulty:'easy'});g.stalemateMessage='tie';g.testMetrics.seen.add('medicine');g.testMetrics.seen.add('palace_rin');A.recordCompletedAITest(s,g);
 assert.equal(s.games,2);assert.equal(s.stalemates,1);assert.equal(s.cards.medicine.seenGames,2);assert.equal(s.cards.medicine.usedGames,1);assert.equal(s.cards.palace_rin.usedGames,0);assert.equal(s.seats[3].games,1);assert.equal(s.seats[0].games,2);assert.equal(Object.keys(s.configurations).length,2);
});
test('Runtime errors, turn-limit aborts and cancelled matches are excluded from rate denominators',()=>{
 const s=A.createAITestStats();for(const reason of ['error','turn-limit']){const g=blank();g.testAbortReason=reason;g.testMetrics.placements.medicine=4;g.testError=reason==='error'?'example failure':null;assert(A.recordCompletedAITest(s,g));}
 assert.equal(s.aborted,2);assert.equal(s.errors,1);assert.equal(s.games,0);assert.equal(s.placements,0);const g=blank();g.winner=g.players[0];g.cancelled=true;assert.equal(A.recordCompletedAITest(s,g),false);
});
test('Fast test skips cosmetic callbacks, preserves logs and renders, and normal tests retain effects',()=>{
 let effects=0,logs=0,renders=0;const ui={onDiscard:()=>effects++,onLog:()=>logs++,render:()=>renders++};
 const fast=new A.Game(3,ui,null,{aiOnly:true,fastTest:true});fast.ui.onDiscard({});fast.ui.onLog('test');fast.ui.render();assert.equal(effects,0);assert.equal(logs,1);assert.equal(renders,1);
 const visual=new A.Game(3,ui,null,{aiOnly:true});visual.ui.onDiscard({});assert.equal(effects,1);visual.cancelled=true;visual.ui.onDiscard({});assert.equal(effects,1);
});
test('Pausing gates AI actions and resuming or cancelling settles every pending waiter',async()=>{
 const g=blank();A.toggleAITestPause();assert(A.paused());let ready=false;const waiting=A.waitAITestReady(g).then(v=>ready=v);await flush();assert.equal(ready,false);A.toggleAITestPause();await waiting;assert.equal(ready,true);
 A.toggleAITestPause();const cancelled=A.waitAITestReady(g);A.cancelAITestAutomation();assert.equal(await cancelled,false);A.setPaused(false);
});
test('Wins and stalemates auto-restart once, keep statistics and obey pause',async()=>{
 A.resetStats();restarts=0;let g=blank();g.winner=g.players[0];await A.finishAITestRound(g);await A.finishAITestRound(g);assert.equal(timers.size,1);const callback=[...timers.values()][0];timers.clear();await callback();assert.equal(restarts,1);assert.equal(A.stats().games,1);
 g=blank();g.stalemateMessage='tie';A.toggleAITestPause();const pending=A.finishAITestRound(g);await flush();assert.equal(timers.size,0);assert.equal(A.stats().games,2);A.toggleAITestPause();await pending;assert.equal(timers.size,1);
 A.toggleAITestPause();const cb=[...timers.values()][0];timers.clear();const paused=cb();await flush();assert.equal(restarts,1);A.toggleAITestPause();await paused;assert.equal(restarts,2);
});
test('Manual exit cancels scheduled restarts and retired matches cannot add data',async()=>{
 const g=blank();g.winner=g.players[0];await A.finishAITestRound(g);assert.equal(timers.size,1);const stale=[...timers.values()][0];A.cancelAITestAutomation();g.cancelled=true;A.setGame(null);assert.equal(timers.size,0);await stale();const count=A.stats().games;await A.finishAITestRound(g);assert.equal(A.stats().games,count);
});
test('Dashboard and CSV/JSON use completed real counts and show definitions and settings',()=>{
 const g=blank();A.resetStats();g.winner=g.players[0];g.testMetrics.seen.add('medicine');g.testMetrics.placements.medicine=1;g.testMetrics.claims.sunflower=1;A.recordCompletedAITest(A.stats(),g);
 A.openAITestDashboard();assert(el('ai-test-overlay').classList.contains('show'));assert(el('ai-test-factions').innerHTML.includes('100.0%'));assert(el('ai-test-cards').innerHTML.includes('Medicine'));assert(el('ai-test-settings').innerHTML.includes('4×4'));
 const data=A.aiTestExportData();assert.equal(data.statistics.games,1);assert(data.definitions.useRate.includes('entered any hand'));const csv=A.aiTestCSV();assert(csv.startsWith('\uFEFF'));assert(csv.includes('"card","medicine","1","1","1","100.0%","100.0%"'));assert(csv.includes('"faction","sunflower","1","1","1","100.0%"'));
});
test('Mode selection exposes all-AI settings and returns to ordinary play without altering other options',()=>{
 for(const button of modeButtons){for(const handler of button.events.click)handler();assert.equal(A.mode(),button.dataset.mode==='ai-test');assert.equal(el('menu-ai-test-settings').hidden,button.dataset.mode!=='ai-test');}
 assert(html.includes('id="hand-title"'));assert(html.includes('id="ai-test-export-csv"'));assert(html.includes('id="ai-test-export-json"'));
});
test('The real turn loop finishes a no-move match and schedules the next without human input',async()=>{
 const g=blank(2);A.resetStats();g.players.forEach(p=>p.hand=[]);await A.runNextTurn();await flush();assert(g.stalemateMessage);assert.equal(A.stats().games,1);assert.equal(A.stats().stalemates,1);assert.equal(timers.size,1);assert.equal(ctx.window.__resolveHumanTurn,undefined);
});
test('The real first-seat AI winning action records once and automatically schedules a fresh game',async()=>{
 const g=blank();A.resetStats();g.players[0].hand=['medicine'];g.players[0].discard=['sdm_remilia','sdm_flandre','sdm_patchouli','sdm_sakuya','hourai_eirin'];g.setCardAt(2,2,'yuuka');
 await A.runNextTurn();assert.equal(g.winner?.idx,0);assert.equal(A.stats().games,1);assert.equal(A.stats().seats[0].wins,1);assert.equal(A.stats().factions.sunflower.claims,1);assert.equal(timers.size,1);assert.equal(ctx.window.__resolveHumanTurn,undefined);
});
test('The real turn loop reports a thrown ability or excessive turn count and continues the batch',async()=>{
 let g=blank();A.resetStats();g.players[0].hand=['medicine'];g.resolveAbility=async()=>{throw Error('ability regression');};await A.runNextTurn();assert.equal(A.stats().errors,1);assert.equal(A.stats().games,0);assert.equal(A.stats().lastResult.error,'ability regression');assert.equal(timers.size,1);
 g=blank();g.testMetrics.turns=600;await A.runNextTurn();assert.equal(A.stats().aborted,2);assert.equal(A.stats().lastResult.reason,'turn-limit');assert.equal(timers.size,1);
});
test('Seeded full-AI matches exercise every seat, conserve cards and complete with real metrics',async()=>{
 for(const [size,count,difficulty] of [[4,2,'hard'],[4,3,'normal'],[5,4,'hard'],[5,3,'easy']]){
  A.cancelAITestAutomation();A.setPaused(false);A.setSize(size);const g=new A.Game(count,{},null,{aiOnly:true,fastTest:true,aiDifficulty:difficulty});A.setGame(g);let stuck=0;
  for(let t=0;t<200&&!g.winner&&!g.stalemateMessage;t++){
   const p=g.currentPlayerIdx;g.beginPlayerTurn(p);g.tradedThisTurn[p]=false;const extras=g.takeScheduledExtraTurns(p);
   if(!A.canAct(p)){stuck=g.isPlacementBlocked(p)||g.placementBlockTurns.some(n=>n>0)?0:stuck+1;if(stuck>=count)A.endStalemate();}
   else{stuck=0;await A.resolveFollowups(p,await A.doPlayerAction(p));for(let i=0;i<extras&&!g.winner&&A.canAct(p);i++){g.tradedThisTurn[p]=false;await A.resolveFollowups(p,await A.doPlayerAction(p));}}
   const ids=[...g.drawPile,...g.boardCells().map(cell=>g.cardAt(cell.r,cell.c)),...g.players.flatMap(p=>[...p.hand,...p.discard])];assert.equal(new Set(ids).size,ids.length);for(const id of g.startingCardIds)assert(ids.includes(id),'Lost '+id);
   g.endPlayerTurn(p);g.currentPlayerIdx=(p+1)%count;
  }
  assert(g.winner||g.stalemateMessage,`${size}x${size}/${count}/${difficulty} must finish`);assert(g.testMetrics.turns>0);assert(Object.values(g.testMetrics.placements).reduce((a,b)=>a+b,0)>0);assert.equal(ctx.window.__resolveHumanTurn,undefined);
  const s=A.createAITestStats();assert(A.recordCompletedAITest(s,g));assert.equal(s.games,1);console.log(`  ${size}x${size}, ${count} AI, ${difficulty}: ${g.testMetrics.turns} turns`);
 }
});
(async()=>{let failed=0;for(const [name,fn] of tests){try{await fn();console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+'\n'+e.stack);}}A.cancelAITestAutomation();console.log(`${tests.length-failed}/${tests.length} AI test mode and layer checks passed`);process.exitCode=failed?1:0;})();
