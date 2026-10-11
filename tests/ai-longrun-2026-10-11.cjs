// Run: node --expose-gc test-ai-longrun.cjs --games=30
// Executes the shipped engine, policy and rendering scheduler. No browser/GPU is simulated.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const candidate=process.argv.find(x=>x.endsWith('.html'));
const filename=candidate||(fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(filename,'utf8'),js=html.split('<script>')[1].split('</script>')[0];
const section=(a,b)=>{const from=js.indexOf(a),to=js.indexOf('\n'+b,from);assert(from>=0&&to>from,a);return js.slice(from,to);};
new vm.Script(js);
const output={startedAt:new Date().toISOString(),sourceSha256:require('node:crypto').createHash('sha256').update(html).digest('hex'),checks:[],checkpoints:[],scope:'Exact shipped rule/AI engine, Node GC and DOM scheduler fixtures; no rendered-browser or GPU test'};
const pass=(name,detail)=>{output.checks.push({name,...detail});console.log('PASS '+name+(detail?' '+JSON.stringify(detail):''));};

async function testReleasedTextNodes(){
 const ctx={ruleTextHtml:v=>String(v)};vm.createContext(ctx);
 vm.runInContext(section('const languageTextSources=','Object.assign(ZH_TEXT,')+section('function setRuleText(','function ruleTooltip(')+'this.setText=setRuleText;this.sources=ruleTextSources;',ctx);
 assert.equal(ctx.sources.constructor.name,'WeakMap');
 if(!global.gc){pass('Rule text uses weak ownership (use --expose-gc to check collection)');return;}
 const weak=[];
 for(let i=0;i<10000;i++){const node={innerHTML:''};ctx.setText(node,'card '+i);weak.push(new WeakRef(node));}
 for(let i=0;i<4;i++){await new Promise(setImmediate);global.gc();}
 const collected=weak.filter(ref=>!ref.deref()).length;
 assert(collected>=9990,`detached text nodes retained: ${10000-collected}`);
 pass('Detached rule-text nodes are collected',{created:10000,collected});
}

function testRenderScheduler(){
 let now=1000,serial=0,renders=0,logs=0,maximumTimers=0;const timers=new Map();
 const ctx={Date:{now:()=>now},publishSnapshot(){},renderBoard(){renders++;},renderHand(){},renderPlayers(){},renderLog(){logs++;},renderStatus(){},updateTutorialProgress(){},queueAITestStatsRender(){},
  el:()=>({classList:{remove(){},add(){}}}),setTimeout:(fn,ms)=>{timers.set(++serial,{fn,ms});maximumTimers=Math.max(maximumTimers,timers.size);return serial;},clearTimeout:id=>timers.delete(id)};
 vm.createContext(ctx);
 vm.runInContext('let game={aiTestMode:true,fastAITest:true,cancelled:false},aiTestPaused=false;'+section('const FAST_AI_TEST_RENDER_INTERVAL','/* generic UI choosers')+
  'this.api={renderAll,cancelFastAITestRender,setPaused:v=>aiTestPaused=v,replaceGame:()=>game={aiTestMode:true,fastAITest:true,cancelled:false}};',ctx);
 for(let i=0;i<10000;i++)ctx.api.renderAll();
 assert.equal(renders,1);assert.equal(timers.size,1);assert.equal(maximumTimers,1);
 const queued=[...timers.values()][0];timers.clear();now+=200;queued.fn();assert.equal(renders,2);
 ctx.api.renderAll();const stale=[...timers.values()][0];ctx.api.replaceGame();timers.clear();now+=200;stale.fn();assert.equal(renders,2);
 ctx.api.setPaused(true);ctx.api.renderAll(true);assert.equal(renders,3);assert.equal(timers.size,0);ctx.api.cancelFastAITestRender();
 pass('Ten thousand render requests coalesce; paused view flushes and stale matches cannot draw',{requests:10000,renderedBeforeFlush:1,maximumPendingTimers:maximumTimers});
 // Normal play has an immediate log path; only the fast-test path is deferred.
 const onLog=js.match(/onLog\(\)\{ if\(game\?\.aiTestMode && game.fastAITest\)renderAll\(\);else renderLog\(\); \}/)?.[0];assert(onLog);
 vm.runInContext('this.logHandler=({'+onLog+'}).onLog;this.normalGame=()=>game={aiTestMode:false,fastAITest:false,cancelled:false};',ctx);
 ctx.normalGame();const before=logs;ctx.logHandler();assert.equal(logs,before+1);
 pass('Ordinary game logging is immediate');
}

async function runMatches(){
 const builder={};vm.createContext(builder);vm.runInContext(section('/* AI evaluation engine start */','/* AI evaluation engine end */'),builder);
 const source=builder.buildAIEvaluationWorkerSource(js);new vm.Script(source);
 const context={console,Math:Object.create(Math),setTimeout,clearTimeout,self:{postMessage(){}}};vm.createContext(context);
 vm.runInContext(source+'this.api={Game,CARD,CARDS,evalNewOpening,evalRunMatch,createAITestStats,recordCompletedAITest,clearGeneratedTrapCards,testCardId,getGame:()=>game};',context);
 const A=context.api;
 for(let match=0;match<1000;match++){
  const g=new A.Game(3,{},null,{aiOnly:true,fastTest:true});for(let i=0;i<6;i++)g.makeTrap();
  assert.equal(Object.keys(A.CARD).length,A.CARDS.length+6);A.clearGeneratedTrapCards();assert.equal(Object.keys(A.CARD).length,A.CARDS.length);
 }
 assert.equal(A.testCardId('trap_token_99999'),'trap_token');
 pass('One thousand restarts release generated tokens and old snapshots retain token labels',{restarts:1000,remainingDefinitions:Object.keys(A.CARD).length});
 const stats=A.createAITestStats(),games=Number(process.argv.find(x=>x.startsWith('--games='))?.split('=')[1]||30);
 assert(Number.isInteger(games)&&games>=1&&games<=10000);let totalTurns=0,maximumTokens=0;
 const before=performance.now();
 for(let i=0;i<games;i++){
  const opening=A.evalNewOpening(10000+i,3,4,'hard');
  let deadline;
  const result=await Promise.race([A.evalRunMatch(opening,['current','current','current'],20000+i),new Promise((_,reject)=>{
   deadline=setTimeout(()=>{const current=A.getGame();reject(new Error('Match timed out: '+JSON.stringify({index:i,turns:current?.testMetrics?.turns,seat:current?.currentPlayerIdx,players:current?.players.map(p=>({AI:p.isAI,hand:p.hand})),log:current?.logLines.slice(-8)})));},30000);
  })]);clearTimeout(deadline);
  assert(['win','stalemate'].includes(result.reason),result.error||result.reason);
  const game=A.getGame();assert(A.recordCompletedAITest(stats,game));assert(!A.recordCompletedAITest(stats,game));
  assert(stats.endings.length<=30);
  const tokens=Object.values(A.CARD).filter(c=>c.token&&c.id!=='trap_token').length;maximumTokens=Math.max(maximumTokens,tokens);assert(tokens<=game.startingCardIds.size);
  totalTurns+=result.turns;
  if((i+1)%10===0||i===0||i===games-1){
   if(global.gc)global.gc();
   const point={games:i+1,turns:totalTurns,wins:stats.wins,stalemates:stats.stalemates,heapUsedMiB:+(process.memoryUsage().heapUsed/1048576).toFixed(2),statsBytes:Buffer.byteLength(JSON.stringify(stats)),tokenDefinitions:tokens,seconds:+((performance.now()-before)/1000).toFixed(2)};
   output.checkpoints.push(point);console.log('PROGRESS '+JSON.stringify(point));
  }
 }
 output.matches={games:stats.games,wins:stats.wins,stalemates:stats.stalemates,errors:stats.errors,aborted:stats.aborted,turns:totalTurns,placements:stats.placements,maximumTokens,endSnapshots:stats.endings.length};
 pass('Continuous real three-player Hard games conserve cards and complete',{games,turns:totalTurns,errors:stats.errors,aborted:stats.aborted});
}

(async()=>{
 await testReleasedTextNodes();testRenderScheduler();await runMatches();output.finishedAt=new Date().toISOString();
 const dir=path.join(path.dirname(filename),'validation-output');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'ai-longrun-results.json'),JSON.stringify(output,null,2));
 console.log('RESULT '+JSON.stringify(output.matches));
})().catch(error=>{console.error(error);process.exitCode=1;});
