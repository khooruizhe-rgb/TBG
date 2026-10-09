// Difficulty mistakes use actual game decisions; no browser UI is needed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file=process.argv[2]||(fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const js=fs.readFileSync(file,'utf8').split('<script>')[1].split('</script>')[0];new vm.Script(js);
let seed=20261008,forced=null;const math=Object.create(Math);math.random=()=>forced??((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const context={console,Math:math,setTimeout:fn=>{fn();return 0;},clearTimeout(){},triggerPlacementPresentation(){},speakRinnosuke(){},logOverride(){},renderAll(){},lastPlacedCell:null};
vm.createContext(context);
const slice=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a)));
vm.runInContext(slice('const DIRS4','/* ===================== UI layer')+'\nlet game=null;\n'+slice('const NO_PLACED_ABILITY','async function doPlayerAction')+`
this.api={Game,CARD,AI_DIFFICULTIES,aiDecideAction,aiDecideHardAction,aiChooseCostCards,aiRetentionValue,aiFactionPlacement,aiKomachiTarget,aiPlacementCells,setGame:g=>game=g,setSize:n=>SIZE=n};`,context);
const A=context.api,plain=x=>JSON.parse(JSON.stringify(x)),tests=[],test=(name,fn)=>tests.push([name,fn]);
function setup({difficulty='hard',size=4,hand=[],board=[],deck=[],opponents=[[],[]]}={}){
 A.setSize(size);const g=new A.Game(3,{},null,{aiOnly:true,fastTest:true,aiDifficulty:difficulty});
 g.players.forEach((p,i)=>{p.hand=(i===0?hand:opponents[i-1]).slice();p.discard=[];});g.board=Array.from({length:size},()=>Array(size).fill(null));g.wasteland=Array.from({length:size},()=>Array(size).fill(false));
 g.drawPile=deck.slice();g.shopCards=['shop_rinnosuke',null,null,null];g.handKnowledge=g.players.map(()=>new Map());g.currentPlayerIdx=0;g.winner=null;
 for(const [r,c,id]of board)g.setCardAt(r,c,id);A.setGame(g);return g;
}
test('Normal has the exact old Easy rates, Easy has 95 percent mistakes, and Hard stays at zero',()=>{
 for(const [difficulty,rates]of [['normal',{action:.45,target:.5,cost:.45,guess:.45}],['easy',{action:.95,target:.95,cost:.95,guess:.95}],['hard',{action:0,target:0,cost:0,guess:0}]]){
  const g=setup({difficulty});for(const [kind,rate]of Object.entries(rates)){
   assert.equal(A.AI_DIFFICULTIES[difficulty][kind],rate);let count=0;
   for(let i=0;i<1000;i++){forced=i/1000;count+=g.aiMakesMistake(kind);}assert.equal(count,rate*1000);
  }
 }forced=null;
});
test('Easy misses an available faction win far more often than Normal; all chosen actions remain legal',async()=>{
 const results={};
 for(const difficulty of ['hard','normal','easy']){
  const g=setup({difficulty,hand:['haku_youmu'],board:[[0,0,'haku_yuyuko']],deck:['mtn_aya']});g.players[0].discard=['sdm_remilia','sdm_patchouli','hourai_mokou','hourai_reisen','palace_rin','medicine'];
  seed=701;let missed=0;
  for(let i=0;i<100;i++){
   const before=JSON.stringify(g.testRuleState()),action=await A.aiDecideAction(0,false);assert.equal(JSON.stringify(g.testRuleState()),before);
   if(action.type==='draw'){assert(g.canDrawNormally(0));missed++;}else{
    assert.equal(action.cardId,'haku_youmu');assert(A.aiPlacementCells(g,action.cardId,g.emptyOrWastelandForCard(A.CARD[action.cardId])).some(c=>c.r===action.r&&c.c===action.c));
    if(!g.wouldCompleteFaction(action.cardId,action.r,action.c))missed++;
   }
  }results[difficulty]=missed;
 }
 assert.equal(results.hard,0);assert(results.normal>20&&results.normal<70);assert(results.easy>=90);console.log('  Missed faction-win opportunities per 100: '+JSON.stringify(results));
});
test('Easy costs deliberately spend the most valuable eligible card; normal mistakes retain random payment',()=>{
 for(const difficulty of ['easy','normal','hard']){
  const g=setup({difficulty,hand:['haku_youmu','mtn_aya','sage_yukari'],board:[[0,0,'haku_yuyuko']]});
  const eligible=g.payableCards(0),values=eligible.map(id=>[id,A.aiRetentionValue(0,id)]),original=g.players[0].hand.slice();
  g.aiMakesMistake=()=>difficulty!=='hard';forced=.999999;const chosen=A.aiChooseCostCards(0,eligible,1);forced=null;
  assert.equal(chosen.length,1);assert(eligible.includes(chosen[0]));assert.deepEqual(g.players[0].hand,original);
  const chosenValue=values.find(([id])=>id===chosen[0])[1];
  if(difficulty==='easy')assert.equal(chosenValue,Math.max(...values.map(row=>row[1])));
  if(difficulty==='hard')assert.equal(chosenValue,Math.min(...values.map(row=>row[1])));
  if(difficulty==='normal')assert.equal(chosen[0],eligible[0]);
 }
});
test('An Easy bonus placement avoids a nearby Palace claim; Hard completes it',()=>{
 for(const difficulty of ['easy','hard']){
  const g=setup({difficulty,board:[[0,0,'palace_satori'],[0,1,'palace_rin'],[1,0,'palace_utsuho']]});g.aiMakesMistake=()=>difficulty==='easy';
  const before=JSON.stringify(g.testRuleState()),cell=A.aiFactionPlacement(0,'palace_koishi',g.emptyCells(0),'palace');assert(cell);assert.equal(JSON.stringify(g.testRuleState()),before);
  assert.equal(g.wouldCompleteFaction('palace_koishi',cell.r,cell.c),difficulty==='hard');assert(cell.r>=0&&cell.c>=0&&cell.r<4&&cell.c<4);
 }
});
test('Easy Komachi swaps away from a completing Hell group without mutating the board forecast',()=>{
 for(const difficulty of ['easy','hard']){
  const g=setup({difficulty,board:[[0,0,'hell_komachi'],[1,0,'mtn_aya'],[1,1,'hell_eiki'],[1,2,'hell_clownpiece'],[1,3,'hell_kutaka'],[3,3,'mtn_suwako']]});g.aiMakesMistake=()=>difficulty==='easy';
  const before=JSON.stringify(g.testRuleState()),cell=A.aiKomachiTarget(0,0,0,[{r:1,c:0},{r:3,c:3}]);assert.equal(JSON.stringify(g.testRuleState()),before);assert.deepEqual(plain(cell),difficulty==='hard'?{r:1,c:0}:{r:3,c:3});
 }
});
test('Easy skill mistakes take a weaker draw-pile card and can choose an unusable illusion ability',async()=>{
 let g=setup({difficulty:'easy',hand:['haku_yuyuko']});g.aiMakesMistake=()=>true;
 assert.equal(await g.chooseDrawPileCard(0,['haku_youmu','mtn_aya'],'test'),'mtn_aya');
 assert.equal(await g.chooseDrawPileCard(0,['haku_youmu','mtn_aya'],'test',true),'haku_youmu');
 g=setup({difficulty:'easy'});g.aiMakesMistake=()=>true;assert.equal(await g.chooseChimeraAbility(0,['palace_yuugi','temple_murasa'],1,1),'palace_yuugi');
});
test('Normal preserves a random skill mistake while Easy selects a worse player target',async()=>{
 let g=setup({difficulty:'normal',hand:['haku_yuyuko']});g.aiMakesMistake=()=>true;forced=0;assert.equal(await g.chooseDrawPileCard(0,['haku_youmu','mtn_aya'],'test'),'haku_youmu');forced=null;
 g=setup({difficulty:'easy',opponents:[['mtn_aya','mtn_suwako','mtn_sanae'],[]]});g.aiMakesMistake=()=>true;
 assert.equal(await g.choosePlayer(0,'test',{excludeSelf:true,preferOpponent:true}),2);assert.notEqual(await g.choosePlayer(0,'test',{preferSelf:true}),0);
});
test('Easy can miss a profitable preparatory trade, whereas Normal retains the old Easy repair',async()=>{
 for(const difficulty of ['normal','easy']){
  const g=setup({difficulty,hand:['medicine','sdm_meiling'],deck:['mtn_aya']});g.shopCards=['shop_rinnosuke','yuuka','hourai_tewi','hell_kutaka'];g.aiMakesMistake=kind=>kind==='action';
  forced=0;const action=await A.aiDecideAction(0);forced=null;
  if(difficulty==='easy')assert.notEqual(action.type,'trade');else if(action.thenPlace?.cardId==='medicine')assert.equal(action.type,'trade');
  assert(!action.cardId||g.players[0].hand.includes(action.cardId));
 }
});
test('Blocked or full-hand Easy turns cannot invent draws, placements or shop targets',async()=>{
 const g=setup({difficulty:'easy',hand:['mtn_aya']});g.aiMakesMistake=()=>true;g.placementBlockedForTurn[0]=true;
 assert.equal((await A.aiDecideAction(0)).type,'pass');g.drawPile=['hourai_mokou'];assert.equal((await A.aiDecideAction(0)).type,'draw');
 g.players[0].hand=['mtn_aya','mtn_suwako','mtn_sanae','medicine','hourai_mokou','hourai_reisen','hourai_tewi'];assert.equal((await A.aiDecideAction(0)).type,'pass');
 g.placementBlockedForTurn[0]=false;const action=await A.aiDecideAction(0,false);assert.equal(action.type,'place');assert(action.r>=0&&action.c>=0&&action.r<4&&action.c<4);
});
test('Evaluation exports fingerprint the changed engine and policy; historical policy snapshots stay unchanged',()=>{
 for(const [key,start,end]of [['AI_EVALUATION_RULES_DIGEST','const DIRS4','/* ===================== UI layer'],['AI_EVALUATION_POLICY_DIGEST','const NO_PLACED_ABILITY','async function doPlayerAction']]){
  const expected=js.match(new RegExp("const "+key+"='([a-f0-9]+)'"))[1];assert.equal(crypto.createHash('sha256').update(slice(start,end)).digest('hex'),expected);
 }
 assert(js.includes("currentPolicy:'placement-space-2026-10-09'"));
 for(const [key,start,end,offset]of [['AI_PREVIOUS_DIGEST','const AI_PREVIOUS_POLICY=(()=>{\n','function aiEvaluateCard(...args)',0],['AI_BASELINE_DIGEST','const AI_FROZEN_POLICY=(()=>{\n','return {aiEvaluateCard',-1]]){
  const a=js.indexOf(start)+start.length,b=js.indexOf(end,a)+offset,expected=js.match(new RegExp("const "+key+"='([a-f0-9]+)'"))[1];
  assert.equal(crypto.createHash('sha256').update(js.slice(a,b)).digest('hex'),expected);
 }
});
(async()=>{for(const [name,fn]of tests){await fn();console.log('PASS '+name);}console.log(`${tests.length}/${tests.length} difficulty checks passed`);})().catch(e=>{console.error(e);process.exitCode=1;});
