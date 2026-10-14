const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
const builder=vm.createContext({});
vm.runInContext(html.slice(html.indexOf('function buildAIEvaluationWorkerSource'),html.indexOf('\nfunction evalHashSeed')),builder);builder.html=html;
const ctx=vm.createContext({console,setTimeout,clearTimeout,self:{},assert});
vm.runInContext(vm.runInContext('buildAIEvaluationWorkerSource(html)',builder),ctx);
vm.runInContext(`(async()=>{
  const checks=[],details={};const ok=(value,name)=>{assert(value,name);checks.push(name);};
  const picks=['sdm_remilia','sdm_flandre','sdm_patchouli','hourai_eirin','mtn_sanae','palace_rin'];
  function stock(match){return [...match.drawPile,...match.players.flatMap(p=>[...p.hand,...p.discard]),...match.shopCards.filter(Boolean)];}
  function opening(seed,n,size,custom,aiOnly=true){
    evalResetTokens();SIZE=size;const rng=Math.random;Math.random=evalPRNG(evalHashSeed(seed));
    try{return new Game(n,{},custom,{aiOnly,fastTest:true,aiDifficulty:'hard'});}finally{Math.random=rng;}
  }
  for(const n of [2,3,4])for(const size of [4,5])for(const aiOnly of [false,true])for(let count=0;count<=6;count++){
    const chosen=picks.slice(0,count),match=opening('partial-'+n+'-'+size+'-'+aiOnly+'-'+count,n,size,chosen,aiOnly),ids=stock(match);
    const good=match.players.every(p=>p.hand.length===6)&&chosen.every((id,i)=>match.players[0].hand[i]===id)
      &&new Set(ids).size===ids.length&&ids.length===match.startingCardIds.size&&ids.every(id=>match.startingCardIds.has(id))
      &&match.players.every(p=>p.hand.every(id=>!CARD[id].token&&!CARD[id].shopkeeper&&!CARD[id].shopExpansion));
    ok(good,'Reserve '+count+' chosen cards and randomly complete six without duplicates: '+n+' players, '+size+'×'+size+', AI '+aiOnly);
    if(count)ok(match.logLines[0].includes(match.players[0].hand.map(id=>CARD[id].name).join(', '))
      &&(!aiOnly||match.logLines[0].startsWith('AI 1 starts')),'The custom-opening log names the actual six-card hand and owner: '+n+'/'+size+'/'+aiOnly+'/'+count);
  }
  for(const n of [2,3,4]){
    const a=opening('empty-pick-'+n,n,4,null),b=opening('empty-pick-'+n,n,4,[]);
    ok(JSON.stringify(a.players)===JSON.stringify(b.players)&&a.currentPlayerIdx===b.currentPlayerIdx&&JSON.stringify(a.drawPile)===JSON.stringify(b.drawPile),
      'Zero picks retain normal seeded dealing and first actor for '+n+' players');
  }
  for(const invalid of [[picks[0],picks[0]],picks.concat('hell_komachi'),['shop_rinnosuke'],['mtn_nitori'],['missing_card'],'abcdef']){
    const match=opening('invalid-'+JSON.stringify(invalid),3,4,invalid),ids=stock(match);
    ok(match.players.every(p=>p.hand.length===6)&&new Set(ids).size===ids.length,'Invalid opening input falls back to a conserved random deal: '+JSON.stringify(invalid));
  }
  const replayA=opening('replay-partial',4,5,picks.slice(0,3)),replayB=opening('replay-partial',4,5,picks.slice(0,3));
  ok(JSON.stringify(replayA.players)===JSON.stringify(replayB.players)&&replayA.currentPlayerIdx===replayB.currentPlayerIdx,'Partial custom openings remain seed-reproducible');

  function setup(difficulty='hard',size=4){
    evalResetTokens();SIZE=size;game=new Game(3,{},null,{aiOnly:true,fastTest:true,aiDifficulty:difficulty});
    game.currentPlayerIdx=0;game.board=Array.from({length:size},()=>Array(size).fill(null));game.shopCards=[];game.drawPile=[];
    game.players.forEach(p=>{p.hand=[];p.discard=[];p.isAI=true;});game.startingCardIds=new Set(CARDS.map(c=>c.id));game.render=()=>{};
    return game;
  }
  const put=(id,r,c)=>game.setCardAt(r,c,id),hold=ids=>game.players[0].hand=ids;
  function finishField(){put('hell_hecatia',0,0);put('hell_clownpiece',0,1);put('hell_kutaka',1,0);put('mtn_aya',3,3);hold(['hell_komachi']);}
  for(const difficulty of ['easy','normal','hard'])for(const mistake of [false,true]){
    setup(difficulty);finishField();put('hell_komachi',1,1);game.players[0].hand=[];game.aiMakesMistake=()=>mistake;
    const candidates=[{r:3,c:3},{r:0,c:0},{r:0,c:1},{r:1,c:0}],rng=Math.random;Math.random=()=>.99;let target;
    try{target=aiKomachiTarget(0,1,1,candidates);}finally{Math.random=rng;}
    ok(target&&CARD[game.cardAt(target.r,target.c)].faction==='hell','Komachi preserves the finishing Hell claim at '+difficulty+', target mistake '+mistake);
    const old=game.cardAt(target.r,target.c);game.setCardAt(1,1,old);game.setCardAt(target.r,target.c,'hell_komachi');
    ok(aiCurrentClaims(0).some(claim=>claim.faction==='hell'&&claim.points===6),'The selected swap really retains six Hell points at '+difficulty+', mistake '+mistake);
  }
  for(const difficulty of ['easy','normal','hard']){
    setup(difficulty);finishField();game.aiMakesMistake=()=>false;
    const before=JSON.stringify(captureAIEvaluationSnapshot(game)),metrics=JSON.stringify(game.testMetrics),board=game.board,hand=game.players[0].hand;
    const rng=Math.random;Math.random=()=>{throw Error('Preview must not consume randomness');};let pick;
    try{pick=aiEvaluateCard(0,'hell_komachi',{acceptCandidate:c=>c.cell.r===1&&c.cell.c===1});}finally{Math.random=rng;}
    ok(pick?.claimsNow&&pick.immediatePoints===6&&!pick.winsNow,'Placement evaluation counts the actual post-swap Hell finish at '+difficulty);
    ok(JSON.stringify(captureAIEvaluationSnapshot(game))===before&&JSON.stringify(game.testMetrics)===metrics&&game.board===board&&game.players[0].hand===hand,
      'Komachi preview restores board, hand, counters and knowledge at '+difficulty);
    game.removeFromHand(0,'hell_komachi');await game.internalPlace('hell_komachi',pick.cell.r,pick.cell.c,0,0);
    ok(game.winCount(game.players[0])===6&&game.players[0].discard.includes('hell_komachi'),'The real Komachi placement collects the predicted six points at '+difficulty);
  }
  setup();put('hell_hecatia',0,1);put('hell_clownpiece',1,0);put('hell_kutaka',1,1);put('mtn_nitori',0,0);put('mtn_aya',3,3);hold(['hell_komachi']);
  ok(!aiPlacementCells(game,'hell_komachi',[{r:2,c:1}],0).length,'An unavoidable swap that destroys a finishing claim is rejected as a voluntary landing');
  const forced=aiEvaluateCard(0,'hell_komachi',{forced:true,acceptCandidate:c=>c.cell.r===2&&c.cell.c===1});
  ok(forced&&!forced.claimsNow&&forced.immediatePoints===0&&!forced.winsNow,'A forced Komachi landing scores the broken post-swap board rather than phantom points');
  game.removeFromHand(0,'hell_komachi');await game.internalPlace('hell_komachi',2,1,0,0);
  ok(game.cardAt(3,3)==='hell_komachi'&&game.winCount(game.players[0])===0,'Mandatory play still performs its legal swap when no preserving target exists');

  setup();put('hell_komachi',1,1);put('hell_clownpiece',0,0);put('hell_eiki',1,2);put('mtn_aya',3,3);hold(['hell_kutaka']);
  const next=aiKomachiTarget(0,1,1,[{r:3,c:3},{r:0,c:0},{r:1,c:2}],false);
  ok(next.r!==3||next.c!==3,'Komachi preserves a remaining one-card connection route instead of swapping to a distant island');

  setup();finishField();game.permanentAbilities.hell_komachi='__draw_one';
  ok(aiPlacementCells(game,'hell_komachi',[{r:1,c:1}],0).length===1,'Rin-overwritten Komachi follows the draw ability rather than the swap guard');
  const overwritten=aiEvaluateCard(0,'hell_komachi',{acceptCandidate:c=>c.cell.r===1&&c.cell.c===1});
  ok(overwritten?.immediatePoints===6,'An overwritten Komachi can finish with its unchanged body');

  for(const payable of [false,true]){
    setup();finishField();const id='created_card_'+(++nextCreatedCard);CARD[id]=blueprintCopy('hell_komachi',id,'hell_komachi');game.startingCardIds.add(id);
    hold(payable?[id,'hourai_mokou']:[id]);game.aiMakesMistake=()=>false;
    const candidate=aiEvaluateCard(0,id,{acceptCandidate:c=>c.cell.r===1&&c.cell.c===1});
    ok(candidate?.immediatePoints===6,'Copied Komachi has a real six-point finish with surcharge payment '+payable);
    game.removeFromHand(0,id);await game.internalPlace(id,1,1,0,0);
    ok(game.winCount(game.players[0])===6&&game.testSeatMetrics(0).diagnostics.costCards===Number(payable),'Copied Komachi matches its predicted body/swap finish and fee, payment '+payable);
  }
  setup();finishField();const doubled='created_card_'+(++nextCreatedCard);CARD[doubled]=blueprintCopy('hell_komachi',doubled,'hell_komachi',2);game.startingCardIds.add(doubled);hold([doubled,'hourai_mokou']);game.aiMakesMistake=()=>false;
  const twice=aiEvaluateCard(0,doubled,{acceptCandidate:c=>c.cell.r===1&&c.cell.c===1});
  ok(twice?.immediatePoints===6,'Legacy doubled Komachi previews both swaps without losing the finishing claim');
  game.removeFromHand(0,doubled);await game.internalPlace(doubled,1,1,0,0);
  ok(game.winCount(game.players[0])===6&&game.testSeatMetrics(0).diagnostics.costCards===1,'Both real swaps preserve the claim and reuse one surcharge payment');

  setup('hard',5);const nueCopy='created_card_'+(++nextCreatedCard);CARD[nueCopy]=blueprintCopy('temple_nue',nueCopy,'hell_komachi');game.startingCardIds.add(nueCopy);
  put('temple_shou',0,0);put('temple_ichirin',0,1);put('temple_murasa',1,0);put('hell_hecatia',4,4);put('hell_eiki',1,2);put('hell_kutaka',2,1);put('hell_clownpiece',2,2);
  hold([nueCopy,'hourai_mokou']);game.players[0].discard=['mtn_sanae'];game.aiMakesMistake=()=>false;
  const win=aiEvaluateCard(0,nueCopy,{acceptCandidate:c=>c.cell.r===1&&c.cell.c===1});
  ok(win?.winsNow&&win.immediatePoints===6,'An immediate winning swap may outrank preserving a lower-valued finishing faction');
  game.removeFromHand(0,nueCopy);await game.internalPlace(nueCopy,1,1,0,0);
  ok(game.winner===game.players[0]&&game.winCount(game.players[0])===7,'The winning borrowed-skill copy really swaps Hecatia into a six-point Hell claim');

  setup();finishField();put('hell_komachi',1,1);hold([]);game.players[1].hand=['sdm_sakuya','sage_kasen'];game.drawPile=['mtn_sanae'];
  const a=aiKomachiTarget(0,1,1,game.selectableBoardCells(0,t=>!(t.r===1&&t.c===1)),false);
  game.players[1].hand=['palace_koishi','mtn_nitori'];game.drawPile=['hourai_eirin'];
  const b=aiKomachiTarget(0,1,1,game.selectableBoardCells(0,t=>!(t.r===1&&t.c===1)),false);
  ok(JSON.stringify(a)===JSON.stringify(b),'Unrevealed opponent identities and deck order do not change Komachi’s target');

  game=opening('v8-partial-restore',3,4,picks.slice(0,3));game.drawPile.push(...game.players[0].hand.splice(3));const snapshot=captureAIEvaluationSnapshot(game);
  snapshot.rulesVersion='2026-10-14-koishi-staged-claims-v8';evalRestore(snapshot,['current','current','current']);
  ok(JSON.stringify(game.players.map(p=>({hand:p.hand,discard:p.discard})))===JSON.stringify(snapshot.state.players.map(p=>({hand:p.hand,discard:p.discard})))&&game.currentPlayerIdx===snapshot.state.currentPlayerIdx,
    'A regular v8 snapshot restores existing hands without redealing or refilling them');
  details.openingCases=84;details.targetScope='Winning claims first; preserve the finisher and its connection route; mistakes stay inside the retained scoring tier';
  return {status:'pass',count:checks.length,checks,details,rulesVersion:REWORK_RULES_VERSION};
})()`,ctx).then(result=>{fs.writeFileSync(__dirname+'/komachi-opening-2026-10-14-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' Komachi/opening checks passed');}).catch(error=>{console.error(error.stack);process.exitCode=1;});
