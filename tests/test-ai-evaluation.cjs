const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2]||(fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(file,'utf8'),js=html.split('<script>')[1].split('</script>')[0];new vm.Script(js);
const start=js.indexOf('/* AI evaluation engine start */'),end=js.indexOf('\n/* AI evaluation engine end */',start);
const builder={};vm.createContext(builder);vm.runInContext(js.slice(start,end),builder);
const workerSource=builder.buildAIEvaluationWorkerSource(js);new vm.Script(workerSource);
const math=Object.create(Math),messages=[],context={console,Math:math,setTimeout,clearTimeout,self:{postMessage:m=>messages.push(m)}};
vm.createContext(context);vm.runInContext(workerSource+`\nthis.api={Game,CARD,CARDS,AI_POLICY_PROFILES,AI_BASELINE_DIGEST,evalMixedLineups,evalInterval,evalScoreShares,evalCompareSummary,evalForkSummary,evalSampleHidden,evalNewOpening,evalRestore,evalLegalActions,evalRunMatch,evalCompare,evalFork,evalValidateSnapshot,captureAIEvaluationSnapshot,aiEvaluateCard,aiDecideAction,evalCanonicalAction,
 setGame:g=>game=g,getGame:()=>game,setSize:n=>SIZE=n,rulesRandom:()=>{evalRandomPhase='rules';return Math.random();},decisionsRandom:()=>{evalRandomPhase='decisions';return Math.random();},setSeed:evalSetSeed};`,context);
const A=context.api,plain=x=>JSON.parse(JSON.stringify(x)),tests=[],test=(name,fn)=>tests.push([name,fn]);
test('The shipped inline script and the exact background worker compile',()=>{assert(workerSource.includes('class Game {'));assert(workerSource.includes('AI_FROZEN_POLICY'));assert(workerSource.includes('async function afterAction'));assert(workerSource.includes('installAIEvaluationWorker();'));});
test('Every mixed lineup gives each seat equal current and comparison exposure',()=>{
 for(const [n,count] of [[2,2],[3,6],[4,14]]){const lineups=plain(A.evalMixedLineups(n,'baseline'));assert.equal(lineups.length,count);for(let seat=0;seat<n;seat++)assert.equal(lineups.filter(row=>row[seat]==='current').length,count/2);assert(lineups.every(row=>row.includes('current')&&row.includes('baseline')));}
});
test('Game random outcomes and decision random choices use separate streams',()=>{
 const hostRandom=Math.random;A.setSeed(50);const expected=A.rulesRandom();A.setSeed(50);for(let i=0;i<100;i++)A.decisionsRandom();assert.equal(A.rulesRandom(),expected);assert.equal(Math.random,hostRandom);
});
test('Opening seeds reproduce hands, shop, terrain and draw-pile order on both board sizes',()=>{
 for(const size of [4,5])assert.deepEqual(plain(A.evalNewOpening(316,3,size,'hard')),plain(A.evalNewOpening(316,3,size,'hard')));
});
test('Snapshot restoration preserves restrictions, borrowed abilities, knowledge and scheduled actions',()=>{
 const s=plain(A.evalNewOpening(71,3,4,'hard'));s.state.placementBlockTurns=[0,2,0];s.state.pendingExtraTurns={2:1};s.state.tradedThisTurn=[true,false,false];s.state.forcedPlay={1:s.state.players[1].hand[0]};s.state.borrowedAbilities={temple_nue:'mtn_sanae'};s.scheduledExtra=1;
 const g=A.evalRestore(s,['current','baseline','no-kanako']);assert.deepEqual(plain(g.placementBlockTurns),s.state.placementBlockTurns);assert.deepEqual(plain(g.pendingExtraTurns),s.state.pendingExtraTurns);assert.deepEqual(plain(g.borrowedAbilities),s.state.borrowedAbilities);assert.equal(g.players[1].aiPolicy,'baseline');assert.equal(s.scheduledExtra,1);
});
test('Hidden-card sampling is invariant to the actual private allocation and preserves the actor clues',()=>{
 const s=plain(A.evalNewOpening(90,3,4,'hard')),changed=plain(s),known=s.state.players[1].hand[0];s.state.handKnowledge[0]=[[known,1]];changed.state.handKnowledge[0]=[[known,1]];
 [changed.state.players[1].hand[1],changed.state.players[2].hand[0]]=[changed.state.players[2].hand[0],changed.state.players[1].hand[1]];
 const sample=x=>plain(A.evalSampleHidden(x,0,(()=>{let value=11;return ()=>((value=Math.imul(value,1664525)+1013904223>>>0)/4294967296);})()));
 const a=sample(s),b=sample(changed);assert.deepEqual(a.state.players.map(p=>p.hand),b.state.players.map(p=>p.hand));assert.deepEqual(a.state.drawPile,b.state.drawPile);assert(a.state.players[1].hand.includes(known));assert.deepEqual(a.state.players[0].hand,s.state.players[0].hand);assert.equal(s.state.players[1].hand[0],known);
});
test('Known Reisen directives survive hidden-card sampling',()=>{
 const s=plain(A.evalNewOpening(92,3,4,'hard')),forced=s.state.players[1].hand[0];s.state.forcedPlay={1:forced};const sample=plain(A.evalSampleHidden(s,0,()=>.6));assert(sample.state.players[1].hand.includes(forced));
});
test('Forks include legal placements rejected by the AI strategic safety filters',()=>{
 const s=plain(A.evalNewOpening(96,3,4,'hard')),g=A.evalRestore(s);g.board=Array.from({length:4},()=>Array(4).fill(null));g.players[0].hand=['haku_yuyuko'];g.setCardAt(0,1,'mtn_aya');
 const actions=plain(A.evalLegalActions(g));assert(actions.some(action=>action.type==='place' && action.cardId==='haku_yuyuko' && action.r===0 && action.c===0));
});
test('Unknown and duplicated cards cannot be imported as an evaluation position',()=>{
 const s=plain(A.evalNewOpening(32,3,4,'hard'));s.state.players[1].hand[0]=s.state.players[0].hand[0];assert.throws(()=>A.evalValidateSnapshot(s),/duplicated/);s.state.players[1].hand[0]='fake';assert.throws(()=>A.evalValidateSnapshot(s),/Unknown/);
});
function fakeReport(blocks=20){
 const roster=plain(A.evalMixedLineups(3,'baseline'));
 return {config:{seed:'test',opponent:'baseline'},finished:true,blocks:Array.from({length:blocks},(_,index)=>({index,expected:6,matches:roster.map(row=>({roster:row,reason:'win',winner:row.indexOf('current'),points:[0,0,0],seats:row.map(()=>({seen:[],placements:{},claims:{},handTurns:{},held:[]}))}))}))};
}
test('The paired opening group is the uncertainty unit, including stalemate score sharing',()=>{
 const r=fakeReport(),s=A.evalCompareSummary(r);assert.equal(s.validBlocks,20);assert.equal(s.rows.current.seats,s.rows.opponent.seats);assert(s.interval.low>0);assert.equal(s.conclusion,'current-better');assert.deepEqual(plain(A.evalScoreShares({reason:'stalemate',points:[3,3,1]})),[.5,.5,0]);
});
test('A runtime error removes the entire matched opening group from comparisons',()=>{
 const r=fakeReport();r.blocks[0].matches[0].reason='error';const s=A.evalCompareSummary(r);assert.equal(s.validBlocks,19);assert.equal(s.excludedBlocks,1);assert.equal(s.abortedMatches,1);assert.equal(s.rows.current.seats,19*9);assert.equal(s.conclusion,'insufficient');
});
test('Interim results and tiny tests never claim a strength gain',()=>{
 let r=fakeReport(19);assert.equal(A.evalCompareSummary(r).conclusion,'insufficient');r=fakeReport(20);r.finished=false;assert.equal(A.evalCompareSummary(r).conclusion,'insufficient');
});
test('Each requested strategy ablation is independently addressable',()=>{
 for(const feature of ['assembly','kanako','nitori','hecatia','yukari','matara'])assert.equal(A.AI_POLICY_PROFILES['no-'+feature].disabled,feature);assert.match(A.AI_BASELINE_DIGEST,/^[a-f0-9]{64}$/);
});
test('Changing a policy leaves card rules unchanged and restores the previous decision route',async()=>{
 const s=plain(A.evalNewOpening(51,3,4,'hard'));const g=A.evalRestore(s);g.board=Array.from({length:4},()=>Array(4).fill(null));g.players[0].hand=['mtn_nitori','mtn_kanako','mtn_sanae','mtn_aya'];g.drawPile=[];
 const current=A.aiEvaluateCard(0,'mtn_nitori');g.players[0].aiPolicy='baseline';const old=A.aiEvaluateCard(0,'mtn_nitori');assert(current.setupValue>0);assert.equal(old.setupValue,undefined);g.players[0].aiPolicy='no-nitori';assert.equal(A.aiEvaluateCard(0,'mtn_nitori').setupValue,0);
 assert.equal(g.hasOtherHellCard(),false);g.setCardAt(0,0,'hell_clownpiece');assert.equal(g.hasOtherHellCard(),true);
});
test('A full mixed-version seed block completes under the actual turn and ability engine',async()=>{
 const config={seed:'lab-regression',phase:'development',opponent:'baseline',players:3,size:'both',difficulty:'hard',blocks:2};
 const report=await A.evalCompare(config,()=>{});assert(report.finished);assert.equal(report.blocks.length,2);assert.equal(report.blocks[0].matches.length,6);assert.equal(report.blocks[1].size,5);assert(report.blocks.flatMap(b=>b.matches).every(m=>['win','stalemate'].includes(m.reason)),JSON.stringify(report.blocks.flatMap(b=>b.matches).filter(m=>m.error)));assert.equal(report.summary.rows.current.seats,report.summary.rows.opponent.seats);
 console.log('  Mixed-version matches: '+report.summary.completedMatches);
});
test('Fork trials apply each requested move, pair hidden states, and finish without live-state mutation',async()=>{
 const s=plain(A.evalNewOpening(5,3,4,'hard'));s.state.board=Array.from({length:4},()=>Array(4).fill(null));s.state.drawPile=[];s.state.players.forEach(p=>{p.hand=[];p.discard=[];});s.state.players[0].hand=['sdm_flandre','mtn_aya'];s.state.players[0].discard=['haku_yuyuko','haku_youmu','hourai_mokou','hourai_reisen','palace_rin','palace_utsuho'];
 s.state.startingCardIds=[...s.state.shopCards,...s.state.players.flatMap(p=>[...p.hand,...p.discard])];const original=JSON.stringify(s);
 const config={seed:'fork-regression',trials:2,continuations:['current','baseline'],a:{type:'place',cardId:'sdm_flandre',r:0,c:0},b:{type:'place',cardId:'mtn_aya',r:0,c:1}};
 const report=await A.evalFork(s,config,()=>{});assert.equal(JSON.stringify(s),original);assert.equal(report.pairs.length,4);assert.equal(report.summary.invalidPairs,0);assert(report.pairs.every(p=>p.a.seats[0].placements.sdm_flandre>=1 && p.b.seats[0].placements.mtn_aya>=1));assert(report.pairs.every(p=>p.a.reason==='win'));assert.equal(report.summary.conclusion,'insufficient');
});
test('Mixed policies finish legal two- and four-player matches on both board sizes',async()=>{
 for(const n of [2,4])for(const size of [4,5]){
  const snapshot=plain(A.evalNewOpening(610+n+size,n,size,'hard')),roster=Array.from({length:n},(_,i)=>i%2?'baseline':'current');
  const result=await A.evalRunMatch(snapshot,roster,912+n+size);assert(['win','stalemate'].includes(result.reason),result.error);assert(result.turns>=1);
 }
});
test('Forced-placement forks honor the chosen coordinate without consuming another turn start',async()=>{
 const s=plain(A.evalNewOpening(5,3,4,'hard'));s.state.board=Array.from({length:4},()=>Array(4).fill(null));s.state.drawPile=[];s.state.players.forEach(p=>{p.hand=[];p.discard=[];});s.state.players[0].hand=['sdm_flandre','mtn_aya'];s.state.players[0].discard=['haku_yuyuko','haku_youmu','hourai_mokou','hourai_reisen','palace_rin','palace_utsuho'];s.state.forcedPlay={0:'sdm_flandre'};s.state.startingCardIds=[...s.state.shopCards,...s.state.players.flatMap(p=>[...p.hand,...p.discard])];
 const result=await A.evalRunMatch(s,['current','baseline','current'],29,{type:'place',cardId:'sdm_flandre',r:2,c:3});assert.equal(result.reason,'win');assert.equal(A.getGame().cardAt(2,3),'sdm_flandre');assert.equal(result.turns,1);
});
test('CSV export preserves seeds, lineups, matched forks and observed card metrics',()=>{
 const a=js.indexOf('function aiLabExportCSV('),b=js.indexOf("el('menu-ai-lab')",a);vm.runInContext(js.slice(a,b),context);const r=fakeReport(1);r.type='comparison';r.blocks[0].seed=10;r.blocks[0].size=4;r.blocks[0].matches.forEach(m=>{m.turns=1;m.seats[0].placements={mtn_nitori:1};});const csv=context.aiLabExportCSV(r);assert(csv.includes('opening_size'));assert(csv.includes('hand_turns'));assert(csv.includes('mtn_nitori'));assert.equal(csv.split('\r\n').length,19);
});
test('The hidden lab opens, runs, pauses and stops through its real UI event handlers',()=>{
 class Element{
  constructor(){this.children=[];this.events={};this._value='';this.disabled=false;this.textContent='';this.innerHTML='';const classes=new Set();this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)};}
  get value(){return this._value||this.children[0]?.value||'';}set value(v){this._value=String(v);}
  addEventListener(name,callback){this.events[name]=callback;}replaceChildren(...children){this.children=children;this._value='';}appendChild(node){this.children.push(node);}focus(){}click(){this.events.click?.({target:this});}remove(){}
 }
 const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},workers=[];
 class MockWorker{constructor(url){this.url=url;this.messages=[];workers.push(this);}postMessage(message){this.messages.push(plain(message));}terminate(){this.stopped=true;}}
 Object.assign(context,{el,Worker:MockWorker,Blob,URL:{createObjectURL:()=> 'blob:lab',revokeObjectURL(){}},document:{scripts:[{textContent:js}],createElement:()=>new Element(),body:new Element(),addEventListener(){}},setRuleText:(node,text)=>node.textContent=text,ruleTextHtml:text=>String(text),translateGameText:text=>text,escapeLogHtml:text=>String(text),closeDebugControls(){},aiTestTable:(head,rows)=>JSON.stringify([head,rows])});
 vm.runInContext(js.slice(js.indexOf('/* AI evaluation lab UI start */'),js.indexOf('\n/* AI evaluation lab UI end */')),context);
 for(const [id,value] of Object.entries({'ai-lab-blocks':20,'ai-lab-players':3,'ai-lab-size':'both','ai-lab-opponent':'baseline','ai-lab-difficulty':'hard','ai-lab-seed':'ui-test','ai-lab-phase':'development','ai-lab-trials':2,'ai-lab-continuation':'both'}))el(id).value=value;
 el('menu-ai-lab').click();assert(el('ai-lab-overlay').classList.contains('show'));const live=A.getGame(),before=JSON.stringify(live.testRuleState());el('ai-lab-start').click();const worker=workers[0];assert.equal(worker.messages[0].type,'comparison');assert.equal(worker.messages[0].config.blocks,20);assert.equal(el('ai-lab-start').disabled,true);
 el('ai-lab-pause').click();assert.equal(worker.messages.at(-1).type,'pause');el('ai-lab-pause').click();assert.equal(worker.messages.at(-1).type,'resume');el('ai-lab-stop').click();assert(worker.stopped);assert.equal(el('ai-lab-start').disabled,false);assert.equal(JSON.stringify(live.testRuleState()),before);
 context.labTest={el,workers};
});
test('The actual position UI offers legal choices and submits paired forks and exports',()=>{
 const {el,workers}=context.labTest,s=plain(A.evalNewOpening(19,3,4,'hard'));const g=A.evalRestore(s);g.evaluationSnapshot=s;const actions=plain(A.evalLegalActions(g));
 el('ai-lab-load-position').click();const worker=workers.at(-1);assert.equal(worker.messages[0].type,'inspect');worker.onmessage({data:{type:'position',snapshot:s,actions,recommendations:{current:actions[0],baseline:actions[1]}}});
 assert.equal(el('ai-lab-action-a').value,'0');assert.equal(el('ai-lab-action-b').value,'1');assert(el('ai-lab-position').innerHTML.includes('Turn-start position'));
 el('ai-lab-fork').click();const request=worker.messages.at(-1);assert.equal(request.type,'fork');assert.equal(request.config.trials,2);assert.deepEqual(request.config.a,actions[0]);assert.deepEqual(request.config.b,actions[1]);
 const r=fakeReport(20);r.type='comparison';r.summary=plain(A.evalCompareSummary(r));worker.onmessage({data:{type:'complete',report:r}});assert.equal(el('ai-lab-export').disabled,false);assert(el('ai-lab-report').innerHTML.includes('Current AI performs better'));el('ai-lab-export').click();el('ai-lab-export-csv').click();assert.equal(el('ai-lab-start').disabled,false);
});
test('Incremental report blocks remain complete when the UI stops or exports',()=>{
 const {el,workers}=context.labTest;el('ai-lab-start').click();const worker=workers.at(-1),full=fakeReport(2);full.type='comparison';full.finished=false;full.summary=plain(A.evalCompareSummary(full));
 for(const block of full.blocks)worker.onmessage({data:{type:'report',appendBlock:true,report:{...full,blocks:[block]}}});
 const accumulated=vm.runInContext('aiLabReport',context);assert.equal(accumulated.blocks.length,2);assert.equal(accumulated.blocks.flatMap(b=>b.matches).length,12);assert.equal(context.aiLabExportCSV(accumulated).split('\r\n').length,37);
 el('ai-lab-stop').click();assert.equal(vm.runInContext('aiLabReport.blocks.length',context),2);assert.equal(el('ai-lab-export').disabled,false);
 full.finished=true;worker.onmessage({data:{type:'complete',report:full}});assert.equal(vm.runInContext('aiLabReport.blocks.length',context),2);
});
(async()=>{for(const [name,fn] of tests){await fn();console.log('PASS '+name);}console.log(`${tests.length}/${tests.length} AI evaluation checks passed`);})().catch(error=>{console.error(error);process.exitCode=1;});
