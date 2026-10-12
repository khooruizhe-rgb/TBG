const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=require('node:path').resolve(__dirname,'..');
const html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
for(const [,code] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(code);
const builder=html.slice(html.indexOf('function buildAIEvaluationWorkerSource'),html.indexOf('\nfunction evalHashSeed'));
const builderContext=vm.createContext({});vm.runInContext(builder,builderContext);
builderContext.scriptText=html;
const worker=vm.runInContext('buildAIEvaluationWorkerSource(scriptText)',builderContext);
const context=vm.createContext({setTimeout,clearTimeout,console,self:{}});
vm.runInContext(worker,context);
context.expectedCardCount=43;
const count=Number(process.argv[2]||180);
context.testCount=count;
vm.runInContext(`(async()=>{
  const totals={games:0,wins:0,stalemates:0,errors:0,turnLimit:0,configurations:{},abilityTypes:new Set(),cardsUsed:new Set()};
  const start=Date.now();
  for(let i=0;i<testCount;i++){
    const n=[2,3,4][i%3],size=[4,5][Math.floor(i/3)%2];
    const seed='stability-validation-'+i;
    const snapshot=evalNewOpening(seed,n,size,'hard');
    console.log('engine start',i+1,n,size);
    const result=await evalRunMatch(snapshot,Array(n).fill('current'),seed);
    if(result.reason==='error'){console.log('engine error',i,result.error);totals.errors++;}
    else if(result.reason==='turn-limit')totals.turnLimit++;
    else totals[result.reason==='win'?'wins':'stalemates']++;
    totals.games++;
    totals.configurations[n+'/'+size]=(totals.configurations[n+'/'+size]||0)+1;
    for(const p of result.seats){for(const id of Object.keys(p.placements))totals.cardsUsed.add(id);for(const d of Object.values(p.abilityDetails))totals.abilityTypes.add(d.ability);}
    const stats=createAITestStats();
    if(result.reason==='win'||result.reason==='stalemate'){
      if(!recordCompletedAITest(stats,game)||recordCompletedAITest(stats,game))throw new Error('Duplicate or missing result recording');
      if(stats.games!==1||Object.values(stats.cards).reduce((v,c)=>v+c.placements,0)!==stats.placements)throw new Error('Placements do not reconcile');
    }
    console.log('engine progress',i+1,Date.now()-start);
  }
  totals.cardsUsed=[...totals.cardsUsed];totals.abilityTypes=[...totals.abilityTypes];totals.durationMs=Date.now()-start;
  return totals;
})()`,context).then(result=>{
  fs.writeFileSync(root+'/tests/reworked-engine-2026-10-12-results.json',JSON.stringify(result,null,2));
  assert.strictEqual(result.errors,0);assert.strictEqual(result.turnLimit,0);
  console.log(JSON.stringify(result));
}).catch(e=>{console.error(e.stack);process.exitCode=1});
