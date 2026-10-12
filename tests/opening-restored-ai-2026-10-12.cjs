const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
const baseline=JSON.parse(fs.readFileSync(__dirname+'/restored-ai-baseline-2026-10-11.json','utf8'));
let sourceChecks=0;
for(const [name,expected]of Object.entries(baseline.functions)){
  const start=html.indexOf((name.includes('Decide')?'async ':'')+'function '+name+'('),end=html.indexOf('\n}',start)+2;
  assert.equal(crypto.createHash('sha256').update(html.slice(start,end)).digest('hex'),expected,name+' must keep the pre-rework decision code');sourceChecks++;
}
assert(!html.includes('function aiStrictComboPlan('));assert(!html.includes('strictComboExecutions'));sourceChecks++;
const build=vm.createContext({});
vm.runInContext(html.slice(html.indexOf('function buildAIEvaluationWorkerSource'),html.indexOf('\nfunction evalHashSeed')),build);build.html=html;
const ctx=vm.createContext({console,setTimeout,clearTimeout,self:{},assert});
vm.runInContext(vm.runInContext('buildAIEvaluationWorkerSource(html)',build),ctx);
vm.runInContext(`(async()=>{
  const checks=[];const ok=(value,name)=>{assert(value,name);checks.push(name);console.log('PASS '+name);};
  const rng=Math.random;
  try{
    for(const n of [2,3,4])for(const size of [4,5]){
      SIZE=size;
      for(let seat=0;seat<n;seat++){
        Math.random=()=>((seat+.5)/n);
        const match=new Game(n,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard'});
        ok(match.currentPlayerIdx===seat,'Opening supports seat '+seat+' at '+n+' players on '+size+'×'+size);
        ok(match.players.every((p,i)=>p.idx===i&&p.hand.length===6),'First actor selection preserves seats and dealt hand sizes');
      }
    }
  }finally{Math.random=rng;}
  for(const n of [2,3,4]){
    const first=evalNewOpening('opening-repro-'+n,n,5,'hard'),second=evalNewOpening('opening-repro-'+n,n,5,'hard');
    ok(first.state.currentPlayerIdx===second.state.currentPlayerIdx&&JSON.stringify(first.state.players.map(p=>p.hand))===JSON.stringify(second.state.players.map(p=>p.hand)),'Seeded opening reproduces first actor and hands for '+n+' players');
    const actor=first.state.currentPlayerIdx;
    ok(first.state.reserveAges[actor]&&Object.values(first.state.reserveAges[actor]).every(age=>age===1)&&first.state.players.filter((_,i)=>i!==actor).every(p=>!Object.keys(first.state.reserveAges[p.idx]).length),'Only the randomized first actor begins the opening turn');
    evalRestore(first,Array(n).fill('current'));
    ok(game.currentPlayerIdx===actor,'Restoring a snapshot retains the first actor without a reroll');
  }
  const actorCounts=[0,0,0,0];for(let i=0;i<80;i++)actorCounts[evalNewOpening('opening-coverage-'+i,4,4,'hard').state.currentPlayerIdx]++;
  ok(actorCounts.every(n=>n>0),'Seeded test openings can begin with every seat');
  function setup(){evalResetTokens();SIZE=4;game=new Game(3,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard'});game.currentPlayerIdx=0;game.board=Array.from({length:4},()=>Array(4).fill(null));game.shopCards=[];game.drawPile=[];game.startingCardIds=new Set();game.players.forEach(p=>{p.hand=[];p.discard=[];p.isAI=true;});game.render=()=>{};}
  setup();game.board[0][0]='hourai_eirin';game.board[0][1]='hourai_kaguya';game.board[1][0]='hourai_reisen';game.board[1][1]='hourai_mokou';
  game.board[3][3]='sage_kasen';game.board[2][3]='mtn_aya';game.board[2][2]='mtn_sanae';game.board[3][2]='mtn_suwako';
  const original=JSON.stringify(game.board),claims=aiCurrentClaims(0);
  ok(claims.length===1&&claims[0].faction==='hourai'&&JSON.stringify(game.board)===original,'Restored AI previews Eirin mute across the whole claim batch and restores the board');
  game.checkClaims(0);ok(game.players[0].discard.length===4&&game.isOnBoard('sage_kasen'),'Real claim retains the confirmed Eirin rule after AI rollback');
  setup();game.players[0].hand=['sdm_sakuya','haku_youmu'];game.reserveAges[0].sdm_sakuya=20;
  const pick=aiEvaluateCard(0,'sdm_sakuya');
  ok(!pick.comboProof&&!pick.kasenRisk&&game.players[0].aiPolicy==='current','Default current AI returns the restored evaluation format');
  ok(['place','draw','trade','place-fallback','pass'].includes((await aiDecideAction(0,false)).type),'Restored default AI produces a legal action type');
  setup();game.players[0].hand=['haku_yuyuko'];game.permanentAbilities.haku_yuyuko='__draw_one';game.drawPile=['mtn_sanae'];
  ok(game.estimateDirectDiscardPoints(0,'haku_yuyuko',1,1)===0&&game.estimateHandGain(0,'haku_yuyuko')===1,'Rewritten cards use their current draw effect instead of their old skill');
  setup();game.board[1][1]='sage_matara';game.board[0][0]='haku_yuyuko';game.players[0].hand=['sdm_remilia'];
  ok(!aiAbilityPlan(0,'sage_matara',1,1).direct,'Matara creation cannot count an immediate channeled score');
  return {checks,actorCounts,status:'pass'};
})()`,ctx).then(result=>{
  result.sourceChecks=sourceChecks;fs.writeFileSync(__dirname+'/opening-restored-ai-2026-10-12-results.json',JSON.stringify(result,null,2));
  console.log(result.checks.length+' opening/compatibility checks and '+sourceChecks+' baseline source checks passed');
}).catch(error=>{console.error(error.stack);process.exitCode=1;});
