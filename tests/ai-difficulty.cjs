// Difficulty capabilities use actual game decisions; no browser UI is needed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file=process.argv[2]||(fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const js=fs.readFileSync(file,'utf8').split('<script>')[1].split('</script>')[0];new vm.Script(js);
let seed=20261008,forced=null;const math=Object.create(Math);math.random=()=>forced??((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const context={console,Math:math,setTimeout:fn=>{fn();return 0;},clearTimeout(){},triggerPlacementPresentation(){},speakRinnosuke(){},logOverride(){},renderAll(){},lastPlacedCell:null};
vm.createContext(context);
const slice=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a)));
vm.runInContext(slice('const DIRS4','/* ===================== UI layer')+'\nlet game=null;\n'+slice('const NO_PLACED_ABILITY','async function doPlayerAction')+`
this.api={Game,CARD,AI_DIFFICULTIES,aiKnows,aiPolicyHas,aiEvaluateCard,aiBestTrade,aiBasicEvaluateCard,aiPublicThreatScore,aiDecideAction,aiDecideHardAction,aiChooseCostCards,aiRetentionValue,aiFactionPlacement,aiKomachiTarget,aiPlacementCells,setGame:g=>game=g,setSize:n=>SIZE=n};`,context);
const A=context.api,plain=x=>JSON.parse(JSON.stringify(x)),tests=[],test=(name,fn)=>tests.push([name,fn]);
function setup({difficulty='hard',size=4,hand=[],board=[],deck=[],opponents=[[],[]]}={}){
 A.setSize(size);const g=new A.Game(3,{},null,{aiOnly:true,fastTest:true,aiDifficulty:difficulty});
 g.players.forEach((p,i)=>{p.hand=(i===0?hand:opponents[i-1]).slice();p.discard=[];});g.board=Array.from({length:size},()=>Array(size).fill(null));g.wasteland=Array.from({length:size},()=>Array(size).fill(false));
 g.drawPile=deck.slice();g.shopCards=['shop_rinnosuke',null,null,null];g.handKnowledge=g.players.map(()=>new Map());g.currentPlayerIdx=0;g.winner=null;
 for(const [r,c,id]of board)g.setCardAt(r,c,id);A.setGame(g);return g;
}
test('Difficulty exposes increasingly rich skills and never injects a mistake probability',()=>{
 const skills={easy:['basic'],normal:['basic','trade','value','defense'],hard:['basic','trade','value','defense','clues','reserve','forecast']};
 for(const difficulty of Object.keys(skills)){
  const g=setup({difficulty});assert.deepEqual(plain(A.AI_DIFFICULTIES[difficulty].skills),skills[difficulty]);
  for(const skill of skills.hard)assert.equal(A.aiKnows(0,skill),skills[difficulty].includes(skill));
  for(const kind of ['action','target','cost','guess'])for(const roll of [0,.1,.5,.99999]){forced=roll;assert.equal(g.aiMakesMistake(kind),false);}
 }forced=null;
});
test('Every difficulty completes an immediate faction win rather than deliberately missing it',async()=>{
 for(const difficulty of ['hard','normal','easy']){
  const g=setup({difficulty,hand:['haku_youmu'],board:[[0,0,'haku_yuyuko']],deck:['mtn_aya']});g.players[0].discard=['sdm_remilia','sdm_patchouli','hourai_mokou','hourai_reisen','palace_rin','medicine'];
  const before=JSON.stringify(g.testRuleState());for(let i=0;i<12;i++){const action=await A.aiDecideAction(0,false);assert.equal(action.type,'place');assert.equal(action.cardId,'haku_youmu');assert(g.wouldCompleteFaction(action.cardId,action.r,action.c));}
  assert.equal(JSON.stringify(g.testRuleState()),before);
 }
});
test('Easy pays a basic eligible cost; Normal evaluates immediate material; Hard keeps its retention rule',()=>{
 for(const difficulty of ['easy','normal','hard']){
  const g=setup({difficulty,hand:['haku_youmu','mtn_aya','sage_yukari'],board:[[0,0,'haku_yuyuko']]});const eligible=g.payableCards(0),before=g.players[0].hand.slice();
  const chosen=A.aiChooseCostCards(0,eligible,1);assert.equal(chosen.length,1);assert(eligible.includes(chosen[0]));assert.deepEqual(g.players[0].hand,before);
  if(difficulty==='easy')assert.equal(chosen[0],eligible[0]);else assert.notEqual(chosen[0],'haku_youmu');
 }
});
test('Basic bonus placements can complete a visible faction on every difficulty',()=>{
 for(const difficulty of ['easy','normal','hard']){
  const g=setup({difficulty,board:[[0,0,'palace_satori'],[0,1,'palace_rin'],[1,0,'palace_utsuho']]});const before=JSON.stringify(g.testRuleState());
  const cell=A.aiFactionPlacement(0,'palace_koishi',g.emptyCells(0),'palace');assert(cell);assert(g.wouldCompleteFaction('palace_koishi',cell.r,cell.c));assert.equal(JSON.stringify(g.testRuleState()),before);
 }
});
test('Only Normal and Hard can trade, including an immediate winning purchase',async()=>{
 for(const difficulty of ['easy','normal','hard']){
  const g=setup({difficulty,hand:['sage_kasen'],board:[[0,0,'yuuka']]});g.players[0].discard=['mtn_aya','mtn_sanae','palace_rin','sage_ran','hell_clownpiece'];g.shopCards=['shop_rinnosuke','medicine','mtn_nitori','hell_kutaka'];
  const action=await A.aiDecideAction(0);if(difficulty==='easy'){assert.equal(A.aiBestTrade(0),null);assert.notEqual(action.type,'trade');}else{assert.equal(action.type,'trade');assert(action.winningTrade);}
 }
});
test('Clue memory, Sage retention and multi-turn forecasts belong only to Hard',()=>{
 for(const difficulty of ['easy','normal','hard']){
  const g=setup({difficulty,hand:['mtn_kanako','mtn_aya'],opponents:[['hourai_kaguya'],[]]});g.revealHand(1,['hourai_kaguya'],[0]);
  assert.equal(g.knownHandCards(0).some(c=>c.playerIdx===1),difficulty==='hard');assert(g.knownHandCards(0).some(c=>c.id==='mtn_aya'&&c.playerIdx===0));
  assert.deepEqual(plain(g.preferSageIds(0,['mtn_aya','sage_yukari'])),difficulty==='hard'?['sage_yukari']:['mtn_aya','sage_yukari']);
  for(const feature of ['assembly','placement-space','nitori','hecatia'])assert.equal(A.aiPolicyHas(0,feature),difficulty==='hard');
  assert.equal(!!A.aiEvaluateCard(0,'mtn_kanako').reserveCombo,difficulty==='hard');
 }
});
test('Normal values immediate ability gains while Easy ranks only basic placement and claims',()=>{
 for(const difficulty of ['easy','normal']){
  setup({difficulty,hand:['sage_ran','mtn_aya'],deck:['sage_ran','medicine','sdm_remilia']});
  const pick=A.aiBasicEvaluateCard(0,'sage_ran');assert.equal(pick.handGain,difficulty==='normal'?1:0);assert.equal(pick.rate>0,difficulty==='normal');
 }
});
test('Normal detects public threats without inspecting hidden opponent card identities',()=>{
 const g=setup({difficulty:'normal',hand:['sdm_remilia','hell_eiki'],board:[[0,0,'haku_yuyuko']],opponents:[['mtn_aya','mtn_sanae'],['sage_ran']]});
 g.players[1].discard=['mtn_suwako','palace_rin','sage_kasen','hourai_mokou','medicine'];assert(A.aiPublicThreatScore(0)>0);
 const first=plain(A.aiBasicEvaluateCard(0,'sdm_remilia'));g.players[1].hand=['sdm_patchouli','sdm_flandre'];g.players[2].hand=['sdm_sakuya'];
 assert.deepEqual(plain(A.aiBasicEvaluateCard(0,'sdm_remilia')),first);
});
test('Easy takes a legal basic chooser option, while Normal compares immediate card usefulness',async()=>{
 for(const difficulty of ['easy','normal']){
  const g=setup({difficulty,board:[[0,0,'haku_yuyuko']]});assert.equal(await g.chooseDrawPileCard(0,['mtn_aya','haku_youmu'],'test'),difficulty==='easy'?'mtn_aya':'haku_youmu');
 }
 const g=setup({difficulty:'easy'});assert.equal(await g.chooseChimeraAbility(0,['palace_yuugi','temple_murasa'],1,1),'palace_yuugi');
});
test('Blocked or full-hand turns never invent actions or target Kourindou as an ability',async()=>{
 for(const difficulty of ['easy','normal','hard']){
  const g=setup({difficulty,hand:['mtn_aya']});g.placementBlockedForTurn[0]=true;assert.equal((await A.aiDecideAction(0)).type,'pass');g.drawPile=['hourai_mokou'];assert.equal((await A.aiDecideAction(0)).type,'draw');
  g.players[0].hand=['mtn_aya','mtn_suwako','mtn_sanae','medicine','hourai_mokou','hourai_reisen','hourai_tewi'];assert.equal((await A.aiDecideAction(0)).type,'pass');
  g.placementBlockedForTurn[0]=false;const action=await A.aiDecideAction(0,false);assert.equal(action.type,'place');assert(action.r>=0&&action.c>=0&&action.r<4&&action.c<4);
 }
});
test('Evaluation fingerprints match changed rules and strategy; historical controls are unchanged',()=>{
 for(const [key,start,end]of [['AI_EVALUATION_RULES_DIGEST','const DIRS4','/* ===================== UI layer'],['AI_EVALUATION_POLICY_DIGEST','const NO_PLACED_ABILITY','async function doPlayerAction']]){
  const expected=js.match(new RegExp("const "+key+"='([a-f0-9]+)'"))[1];assert.equal(crypto.createHash('sha256').update(slice(start,end)).digest('hex'),expected);
 }
 assert(js.includes("currentPolicy:'skill-tiers-online-2026-10-09'"));
 for(const [key,start,end,offset]of [['AI_PREVIOUS_DIGEST','const AI_PREVIOUS_POLICY=(()=>{\n','function aiEvaluateCard(...args)',0],['AI_BASELINE_DIGEST','const AI_FROZEN_POLICY=(()=>{\n','return {aiEvaluateCard',-1]]){
  const a=js.indexOf(start)+start.length,b=js.indexOf(end,a)+offset,expected=js.match(new RegExp("const "+key+"='([a-f0-9]+)'"))[1];assert.equal(crypto.createHash('sha256').update(js.slice(a,b)).digest('hex'),expected);
 }
});
(async()=>{for(const [name,fn]of tests){await fn();console.log('PASS '+name);}console.log(`${tests.length}/${tests.length} difficulty checks passed`);})().catch(e=>{console.error(e);process.exitCode=1;});
