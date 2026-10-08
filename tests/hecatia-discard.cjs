// Real rule mutations and active AI forecasts; no rendered-browser assertions.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2]||(fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(file,'utf8'),js=html.split('<script>')[1].split('</script>')[0];new vm.Script(js);
const slice=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a)));
let seed=20261009;const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const ctx={console,Math:math,setTimeout:fn=>{fn();return 0;},clearTimeout(){},triggerPlacementPresentation(){},speakRinnosuke(){},logOverride(){},lastPlacedCell:null};vm.createContext(ctx);
vm.runInContext(slice('const DIRS4','/* ===================== UI layer')+'\nvar game=null;\n'+slice('const NO_PLACED_ABILITY','async function doPlayerAction')+`
this.api={Game,CARD,createAITestMetrics,createAITestStats,recordCompletedAITest,aiCurrentClaims,aiEvaluateCard,setGame:g=>game=g,setSize:n=>SIZE=n};`,ctx);
const A=ctx.api,tests=[],test=(name,fn)=>tests.push([name,fn]);
const hell=['hell_eiki','hell_clownpiece','hell_komachi','hell_kutaka'];
function setup({discard=[],board=[],hand=[],otherHand=[],borrowed={},waste=[]}={}){
 A.setSize(4);const effects={discard:[],returned:[],claims:[]},g=new A.Game(3,{onDiscard:e=>effects.discard.push(e),onDrawPileReturn:e=>effects.returned.push(e),onFactionClaim:e=>effects.claims.push(e)},null,{aiOnly:true});
 for(const p of g.players){p.hand=[];p.discard=[];}g.players[0].hand=hand.slice();g.players[1].hand=otherHand.slice();g.players[0].discard=discard.slice();g.drawPile=[];
 g.borrowedAbilities={...borrowed};g.board=Array.from({length:4},()=>Array(4).fill(null));g.wasteland=Array.from({length:4},()=>Array(4).fill(false));g.testMetrics=A.createAITestMetrics();g.currentPlayerIdx=0;
 for(const [r,c,id] of board)g.setCardAt(r,c,id);for(const [r,c] of waste)g.setWastelandAt(r,c,true);A.setGame(g);return {g,effects};
}
const boardWith=substitute=>[[1,1,'hell_hecatia'],[1,2,'hell_eiki'],[2,1,'hell_clownpiece'],[2,2,substitute]];
function state(g){return JSON.stringify([g.testRuleState(),g.testMetrics,g.winner,g.logLines],(_k,v)=>v instanceof Set?[...v]:v);}
test('The restriction rejects zero through two Hell cards and accepts exactly three or more',()=>{
 for(let n=0;n<=4;n++){const {g}=setup({discard:hell.slice(0,n).concat(['medicine','sdm_meiling'])});assert.equal(g.canEnterDiscard(0,'hell_hecatia'),n>=3,'Hell count '+n);}
 const {g}=setup();assert.equal(g.canEnterDiscard(0,'hell_hecatia',{allowHecatiaFromClaim:true}),false,'An old claim flag cannot bypass the actual pile count');
});
test('A rejected board discard leaves Hecatia and terrain untouched with no departure effects',()=>{
 const {g,effects}=setup({board:[[1,1,'hell_hecatia']],discard:hell.slice(0,2),waste:[[1,1]]});const originalDiscard=g.players[0].discard.slice();
 assert.equal(g.moveBoardToDiscard(1,1,0,'yuyuko'),false);assert.equal(g.cardAt(1,1),'hell_hecatia');assert(g.wastelandAt(1,1));assert.deepEqual(Array.from(g.players[0].discard),originalDiscard);
 assert.equal(g.drawPile.length,0);assert.equal(effects.discard.length,0);assert.equal(effects.returned.length,0);assert(g.logLines.at(-1).includes('at least 3'));
});
test('An accepted board discard at exactly three Hell cards moves once and grants three points',()=>{
 const {g,effects}=setup({board:[[1,1,'hell_hecatia']],discard:hell.slice(0,3)});
 assert.equal(g.moveBoardToDiscard(1,1,0,'yuyuko'),true);assert.equal(g.cardAt(1,1),null);assert.equal(g.players[0].discard.filter(id=>id==='hell_hecatia').length,1);assert.equal(g.winCount(g.players[0]),6);
 assert.equal(effects.discard.length,1);assert.equal(effects.returned.length,0);assert.equal(g.testMetrics.scoreSources['ability:yuyuko'].points,3);
});
test('A complete physical Hell claim admits its three ordinary members before Hecatia',()=>{
 const {g,effects}=setup({board:boardWith('hell_komachi')});const pile=g.players[0].discard,before=state(g),randomBefore=seed;
 const claims=A.aiCurrentClaims(0);assert.equal(claims.find(c=>c.faction==='hell').points,6);assert.equal(state(g),before);assert.equal(g.players[0].discard,pile);assert.equal(seed,randomBefore);
 g.checkClaims(0);assert.equal(g.cardAt(1,1),null);assert.equal(g.players[0].discard.length,4);assert.equal(g.winCount(g.players[0]),6);
 assert.equal(effects.discard.at(-1).cardId,'hell_hecatia');assert.equal(effects.claims[0].count,4);assert.equal(g.testMetrics.cardActions.hell_hecatia.claimMembers,1);assert.equal(effects.returned.length,0);
});
test('A substituted Hell claim with too few real Hell members collects the others and leaves Hecatia',()=>{
 const {g,effects}=setup({board:boardWith('sage_kasen'),waste:[[1,1]]});const before=state(g),claims=A.aiCurrentClaims(0);
 assert.equal(claims.find(c=>c.faction==='hell').points,3);assert.equal(state(g),before);g.checkClaims(0);
 assert.equal(g.cardAt(1,1),'hell_hecatia');assert(g.wastelandAt(1,1));assert.equal(g.players[0].discard.length,3);assert.equal(g.winCount(g.players[0]),3);assert.equal(g.drawPile.length,0);
 assert.equal(effects.discard.length,3);assert(!effects.discard.some(e=>e.cardId==='hell_hecatia'));assert.equal(effects.returned.length,0);assert.equal(effects.claims[0].count,3);
 assert.equal(g.testMetrics.cardActions.hell_hecatia,undefined);assert.equal(g.testMetrics.scoreSources['faction:hell'].cards,3);assert.equal(g.testMetrics.substituteClaims.hell,1);
 g.checkClaims(0);assert.equal(effects.claims.length,1,'The incomplete remainder cannot be claimed again');
});
test('Existing Hell cards plus newly claimed members can satisfy the threshold without counting Hecatia herself',()=>{
 const {g,effects}=setup({board:boardWith('sage_kasen'),discard:['hell_kutaka']});const claims=A.aiCurrentClaims(0);
 assert.equal(claims.find(c=>c.faction==='hell').points,6);g.checkClaims(0);assert.equal(g.cardAt(1,1),null);assert(g.players[0].discard.includes('hell_hecatia'));assert.equal(g.winCount(g.players[0]),7);assert.equal(g.winner.idx,0);assert.equal(effects.claims[0].count,4);
});
test('Current placement evaluation predicts a partial claim instead of a false Hecatia win',()=>{
 for(const difficulty of ['easy','normal','hard']){const {g}=setup({board:boardWith('sage_kasen').slice(0,3),hand:['sage_kasen'],discard:['medicine']});g.aiDifficulty=difficulty;const before=state(g),pick=A.aiEvaluateCard(0,'sage_kasen');
  assert(pick.claimsNow);assert.equal(pick.winsNow,false);assert.equal(pick.rate,3);assert.equal(state(g),before);}
});
test('Nue borrowing Hecatia uses the same threshold and can remain after a Temple claim',()=>{
 const {g,effects}=setup({borrowed:{temple_nue:'hell_hecatia'},board:[[1,1,'temple_nue'],[1,2,'temple_byakuren'],[2,1,'temple_shou'],[2,2,'temple_murasa']]});
 assert.equal(g.canEnterDiscard(0,'temple_nue'),false);assert.equal(A.aiCurrentClaims(0).find(c=>c.faction==='temple').points,3);g.checkClaims(0);assert.equal(g.cardAt(1,1),'temple_nue');assert.equal(effects.claims[0].count,3);assert.equal(effects.returned.length,0);
 g.players[0].discard.push(...hell.slice(0,3));assert.equal(g.canEnterDiscard(0,'temple_nue'),true);
});
test('Eirin continues to disable both the discard restriction and triple scoring',()=>{
 const {g}=setup({board:[[1,1,'hell_hecatia'],[3,3,'hourai_eirin']]});assert.equal(g.canEnterDiscard(0,'hell_hecatia'),true);assert.equal(g.moveBoardToDiscard(1,1,0,'yuyuko'),true);assert.equal(g.winCount(g.players[0]),1);
});
test('A board discard checks the final board state after Eirin leaves',()=>{
 const {g}=setup({board:[[1,1,'hourai_eirin']],discard:['hell_hecatia',...hell.slice(0,3)]});assert.equal(g.winCount(g.players[0]),4);
 assert.equal(g.moveBoardToDiscard(1,1,0,'yuyuko'),true);assert.equal(g.cardAt(1,1),null);assert.equal(g.winCount(g.players[0]),7);assert.equal(g.winner.idx,0);
});
test('Flandre cannot remove a hand card when its final discard check fails',async()=>{
 const {g,effects}=setup({board:[[1,1,'sdm_flandre']],otherHand:['hell_hecatia']});g.choosePlayer=async()=>1;g.chooseHandCard=async()=> 'hell_hecatia';
 await g.resolveAbility('sdm_flandre',1,1,0,0);assert.deepEqual(Array.from(g.players[1].hand),['hell_hecatia']);assert.equal(g.players[1].discard.length,0);assert.equal(effects.discard.length,0);assert.equal(g.testMetrics.cardActions.sdm_flandre.abilityEffective,0);
});
test('The restriction leaves other legitimate board movements available',()=>{
 const {g}=setup({board:[[1,1,'hell_hecatia']]});assert(g.moveBoardToHand(1,1,0,'reimu'));assert(g.players[0].hand.includes('hell_hecatia'));assert.equal(g.cardAt(1,1),null);
});
test('The English and Chinese rule text use the inclusive three-card threshold',()=>{
 assert(A.CARD.hell_hecatia.desc.includes('already has at least 3 Hell cards'));assert(html.includes('只有弃牌堆已有 3 张及以上地狱卡牌时'));assert(!html.includes('已有超过 3 张地狱卡牌'));
});
(async()=>{let failed=0;for(const [name,fn]of tests)try{await fn();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}console.log(`${tests.length-failed}/${tests.length} Hecatia discard checks passed`);process.exitCode=failed?1:0;})();
