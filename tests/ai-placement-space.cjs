// Real candidate selection and card-rule previews; no browser-rendering assertions.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2]||(fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(file,'utf8'),js=html.split('<script>')[1].split('</script>')[0];new vm.Script(js);
const slice=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a)));
let seed=20261009;const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const ctx={console,Math:math,setTimeout:fn=>{fn();return 0;},clearTimeout(){},triggerPlacementPresentation(){},speakRinnosuke(){},logOverride(){},lastPlacedCell:null};vm.createContext(ctx);
vm.runInContext(slice('const DIRS4','/* ===================== UI layer')+'\nvar game=null;\n'+slice('const NO_PLACED_ABILITY','async function doPlayerAction')+`
this.api={Game,CARD,FACTIONS,aiEvaluateCard,aiCurrentEvaluateCard,aiDecideHardAction,aiFactionPlacement,aiWithPlacement,aiPlacementSpace,aiComparePlacementSpace,aiBetterCandidate,aiPlacementCells,setGame:g=>game=g,setSize:n=>SIZE=n};`,ctx);
const A=ctx.api,tests=[],test=(name,fn)=>tests.push([name,fn]);
function setup({size=4,hand=[],board=[],waste=[],discard=[],shop=false}={}){
 A.setSize(size);const g=new A.Game(3,{},null,{kourindou:shop});g.players.forEach(p=>{p.hand=[];p.discard=[];});g.players[1].hand=hand.slice();g.players[1].discard=discard.slice();g.drawPile=[];g.currentPlayerIdx=1;g.aiDifficulty='hard';
 g.handKnowledge=g.players.map(()=>new Map());g.board=Array.from({length:size},()=>Array(size).fill(null));g.wasteland=Array.from({length:size},()=>Array(size).fill(false));
 for(const [r,c,id]of board)g.setCardAt(r,c,id);for(const [r,c]of waste)g.setWastelandAt(r,c,true);A.setGame(g);return g;
}
const state=g=>JSON.stringify([g.testRuleState(),g.players,g.testMetrics,g.winner,g.logLines],(_k,v)=>v instanceof Set?[...v]:v);
const at=(id,cell,preferred=null)=>A.aiWithPlacement(id,cell,()=>A.aiPlacementSpace(1,id,cell,preferred),1);
test('An own faction plan chooses an open interior on both main-board sizes',async()=>{
 for(const size of [4,5]){setup({size,hand:['sdm_remilia','sdm_patchouli']});const pick=A.aiEvaluateCard(1,'sdm_remilia');
  assert(pick.spacePlan.forClaim);assert(pick.cell.r>0 && pick.cell.c>0 && pick.cell.r<size-1 && pick.cell.c<size-1);
  const action=await A.aiDecideHardAction(1,false);assert.equal(action.type,'place');assert(action.r>0 && action.c>0 && action.r<size-1 && action.c<size-1);}
});
test('An isolated ability card deliberately chooses the smallest expansion area',()=>{
 for(const size of [4,5]){setup({size,hand:['sdm_remilia']});const pick=A.aiEvaluateCard(1,'sdm_remilia');assert.equal(pick.spacePlan.forClaim,false);
  assert([0,size-1].includes(pick.cell.r) && [0,size-1].includes(pick.cell.c));}
});
test('Own assembly still connects to an existing member before opening a separate group',()=>{
 setup({size:5,hand:['sdm_remilia','sdm_flandre'],board:[[0,0,'sdm_patchouli']]});const pick=A.aiEvaluateCard(1,'sdm_remilia');
 assert(pick.spacePlan.forClaim);assert(pick.spacePlan.connected);assert.equal(pick.cell.r+pick.cell.c,1);
});
test('Connected bonus placements choose the larger shared frontier rather than the cramped branch',()=>{
 setup({hand:['sdm_remilia','sdm_sakuya'],board:[[0,0,'sdm_patchouli'],[1,1,'sdm_flandre']],waste:[[2,0],[2,1]]});
 const open={r:0,c:1},tight={r:1,c:0},a=at('sdm_remilia',open),b=at('sdm_remilia',tight);
 assert(a.connected && b.connected);assert(a.room>b.room);assert(a.frontier>b.frontier);
 const pick=A.aiFactionPlacement(1,'sdm_remilia',[tight,open],'sdm');assert.deepEqual([pick.r,pick.c],[0,1]);
});
test('Bonus placements without own faction material choose less space',()=>{
 setup({hand:['sdm_remilia']});const pick=A.aiFactionPlacement(1,'sdm_remilia',[{r:1,c:1},{r:0,c:0}],'sdm');assert.deepEqual([pick.r,pick.c],[0,0]);
});
test('Immediate winning claims keep priority over geometric preferences',async()=>{
 const g=setup({hand:['medicine'],board:[[1,1,'yuuka']],discard:['mtn_aya','mtn_sanae','mtn_suwako','palace_rin','palace_utsuho']});
 const pick=A.aiEvaluateCard(1,'medicine');assert(pick.winsNow);assert.equal(Math.abs(pick.cell.r-1)+Math.abs(pick.cell.c-1),1);
 const action=await A.aiDecideHardAction(1,false);assert.equal(action.cardId,'medicine');g.setCardAt(action.r,action.c,'medicine');g.checkClaims(1);assert.equal(g.winner.idx,1);
});
test('Wasteland, enemy cards and protected empty spaces cannot inflate useful room',()=>{
 setup({hand:['sdm_remilia','sdm_patchouli']});const cell={r:1,c:1},open=at('sdm_remilia',cell);
 setup({hand:['sdm_remilia','sdm_patchouli'],board:[[0,1,'medicine']],waste:[[1,0],[2,1]]});const blocked=at('sdm_remilia',cell);
 assert(blocked.room<open.room);assert.equal(blocked.frontier,1);
 setup({hand:['sdm_remilia','sdm_patchouli'],board:[[0,0,'shop_rinnosuke']]});const protectedTile=at('sdm_remilia',cell);
 assert.equal(protectedTile.usable,false);assert(A.aiComparePlacementSpace(open,protectedTile)>0);
});
test('Claim space counts unique expansion cells across the whole connected group',()=>{
 setup({hand:['sdm_remilia','sdm_sakuya'],board:[[0,0,'sdm_patchouli'],[1,1,'sdm_flandre']],waste:[[2,1]]});
 const space=at('sdm_remilia',{r:0,c:1});assert.equal(space.members,3);assert.equal(space.frontier,3);assert.equal(space.room,3);
});
test('Kasen uses four-card faction material and cannot turn a pair into an own claim plan',()=>{
 setup({hand:['sage_kasen','medicine'],board:[[3,3,'yuuka']]});let pick=A.aiEvaluateCard(1,'sage_kasen');assert.equal(pick.spacePlan.forClaim,false);assert.equal(A.FACTIONS[pick.spacePlan.faction].size,4);
 setup({hand:['sage_kasen','sdm_patchouli'],board:[[0,0,'sdm_flandre']]});pick=A.aiEvaluateCard(1,'sage_kasen');assert.equal(pick.spacePlan.faction,'sdm');assert(pick.spacePlan.forClaim && pick.spacePlan.connected);
});
test('Known remaining Kaguya guesses supply a claim plan without inspecting hidden identities',()=>{
 const g=setup({board:[[0,0,'hourai_kaguya']]});g.players[2].hand=['hourai_eirin'];g.revealHand(2,['hourai_eirin'],[1]);
 const plan=at('hourai_mokou',{r:0,c:1},'hourai');assert(plan.forClaim);g.handKnowledge[1].clear();const blind=at('hourai_mokou',{r:0,c:1},'hourai');assert.equal(blind.forClaim,false);
});
test('Easy still deliberately selects weaker legal geometry',()=>{
 const g=setup({hand:['sdm_remilia','sdm_patchouli']});const best=A.aiCurrentEvaluateCard(1,'sdm_remilia'),worst=A.aiCurrentEvaluateCard(1,'sdm_remilia',{worst:true});
 assert(best.spacePlan.room>worst.spacePlan.room);assert(A.aiPlacementCells(g,'sdm_remilia',g.emptyOrWastelandForCard(A.CARD.sdm_remilia)).some(t=>t.r===worst.cell.r && t.c===worst.cell.c));
});
test('Space comparisons do not change the ranking of different cards or a winning action',()=>{
 const common={winsNow:false,losesNow:false,suppressedCrown:false,lowPriority:false,claimSize:0,rate:1,handGain:0,noAbility:false,position:0};
 const a={...common,cardId:'sdm_remilia',spacePlan:{usable:true,forClaim:true,connected:true,canFinish:true,room:8,frontier:4,region:10}},b={...common,cardId:'medicine',position:1,spacePlan:{usable:true,forClaim:false,room:0,frontier:0,region:0}};
 assert.equal(A.aiBetterCandidate(a,b),false);assert(A.aiBetterCandidate({...a,winsNow:true,rate:0},b));
});
test('All spatial previews preserve card state, references, metrics and the random stream',()=>{
 for(const size of [4,5]){const g=setup({size,hand:['sage_kasen','sdm_remilia','sdm_patchouli'],board:[[0,0,'sdm_flandre']],shop:true});
  const before=state(g),randomBefore=seed,hand=g.players[1].hand,board=g.board,discard=g.players[1].discard;
  for(const id of g.players[1].hand){A.aiEvaluateCard(1,id);A.aiCurrentEvaluateCard(1,id,{worst:true});}
  assert.equal(state(g),before);assert.equal(seed,randomBefore);assert.equal(g.players[1].hand,hand);assert.equal(g.board,board);assert.equal(g.players[1].discard,discard);}
});
test('Historical decision profiles omit the new spatial rule',()=>{
 const g=setup({hand:['sdm_remilia','sdm_patchouli']});for(const policy of ['baseline','previous']){g.players[1].aiPolicy=policy;assert.equal(at('sdm_remilia',{r:1,c:1}),null);assert(!A.aiEvaluateCard(1,'sdm_remilia').spacePlan);}
});
(async()=>{let failed=0;for(const [name,fn]of tests)try{await fn();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}console.log(`${tests.length-failed}/${tests.length} placement-space checks passed`);process.exitCode=failed?1:0;})();
