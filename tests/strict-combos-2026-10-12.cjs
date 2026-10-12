// Runs the shipped worker source, including actual claim and placement resolution.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
const html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
if(!html.includes('function aiStrictComboPlan(')){
  console.log('SKIP: strict-combo policy was rolled back. This suite documents commit 8575afe; run opening-restored-ai-2026-10-12.cjs for the active policy.');
  process.exit(0);
}
const build=vm.createContext({});
vm.runInContext(html.slice(html.indexOf('function buildAIEvaluationWorkerSource'),html.indexOf('\nfunction evalHashSeed')),build);
build.html=html;
const ctx=vm.createContext({console,setTimeout,clearTimeout,self:{},assert});
vm.runInContext(vm.runInContext('buildAIEvaluationWorkerSource(html)',build),ctx);
ctx.escapeLogHtml=v=>String(v).replace(/[<>"&]/g,'');ctx.localSeat=()=>1;
vm.runInContext(html.slice(html.indexOf('function newspaperHtml(entry)'),html.indexOf("document.addEventListener('click',async event=>{",html.indexOf('function newspaperHtml(entry)'))),ctx);
vm.runInContext(`(async()=>{
  const checks=[];const ok=(value,name)=>{assert(value,name);checks.push(name);console.log('PASS '+name);};
  function setup(size=4){
    evalResetTokens();SIZE=size;game=new Game(3,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard'});
    game.players.forEach(p=>{p.hand=[];p.discard=[];p.isAI=true;p.aiPolicy='current';});
    game.board=Array.from({length:size},()=>Array(size).fill(null));game.wasteland=game.board.map(row=>row.map(()=>false));
    game.drawPile=[];game.shopCards=[];game.startingCardIds=new Set();game.render=()=>{};return game;
  }
  function put(id,r,c){game.setCardAt(r,c,id);game.startingCardIds.add(id);}
  function hand(p,ids){game.players[p].hand.push(...ids);ids.forEach(id=>game.startingCardIds.add(id));}
  function score(p,ids){game.players[p].discard.push(...ids);ids.forEach(id=>game.startingCardIds.add(id));}
  function shop(ids){game.shopCards=['shop_rinnosuke',...ids];game.shopCards.forEach(id=>game.startingCardIds.add(id));}
  function copy(base){const id='created_card_'+(++nextCreatedCard);CARD[id]=blueprintCopy(base,id,game.abilityId(base),1);game.startingCardIds.add(id);return id;}
  function proof(id,r,c){return aiWithPlacement(id,{r,c},()=>aiStrictComboPlan(0,id,r,c),0);}
  function stamp(){return JSON.stringify([game.board,game.shopCards,game.players.map(p=>[p.hand,p.discard]),game.wasteland,game.testMetrics]);}
  setup();
  put('hourai_eirin',0,0);put('hourai_kaguya',0,1);put('hourai_reisen',1,0);put('hourai_mokou',1,1);
  put('sage_kasen',3,3);put('mtn_aya',2,3);put('mtn_sanae',2,2);put('mtn_suwako',3,2);
  const before=stamp(),claims=aiCurrentClaims(0);
  ok(claims.length===1&&claims[0].faction==='hourai','Eirin mute survives her removal within AI claim preview');
  ok(stamp()===before&&game.claimEirinMute===undefined,'Claim preview restores cards, scores, metrics and mute latch');
  game.checkClaims(0);
  ok(game.players[0].discard.length===4&&game.isOnBoard('sage_kasen'),'Same real claim batch does not reactivate Kasen');
  ok(!game.eirinActive()&&game.claimEirinMute===undefined,'Eirin mute ends after the batch');
  game.checkClaims(0);
  ok(!game.isOnBoard('sage_kasen')&&game.players[0].discard.length===8,'Later claim batch uses the restored Kasen ability');
  setup();try{game.withClaimMute(()=>{throw Error('test');});}catch(_){}
  ok(game.claimEirinMute===undefined,'Exceptional claim preview cannot leave a stale mute');

  setup();hand(0,['sage_kasen']);game.drawPile=['hourai_mokou'];game.startingCardIds.add('hourai_mokou');
  let candidate=aiCurrentEvaluateCard(0,'sage_kasen');
  ok(candidate.reserveCombo&&candidate.lowPriority&&candidate.setupValue===0,'Uncontested Kasen has no speculative setup bonus');
  ok((await aiCurrentDecideAction(0,false)).type==='draw','AI keeps Kasen when a draw is available');
  put('mtn_aya',0,0);put('mtn_sanae',0,1);shop(['mtn_suwako']);hand(1,['hourai_tewi']);
  score(1,['haku_youmu','heaven_iku','temple_shou']);
  candidate=aiWithPlacement('sage_kasen',{r:1,c:0},()=>aiKasenRisk(0,'sage_kasen'),0);
  ok(candidate.sources.some(x=>x.source==='shop'&&x.seat===1),'Kasen risk includes an opponent buying the visible shop card');
  ok(candidate.wins&&candidate.penalty>=12,'A shop completion that gives an opponent victory receives the full penalty');
  const risk1=JSON.stringify(candidate);game.players[1].hand=['sdm_flandre'];
  const risk2=JSON.stringify(aiWithPlacement('sage_kasen',{r:1,c:0},()=>aiKasenRisk(0,'sage_kasen'),0));
  ok(risk1===risk2,'Risk evaluation is invariant to hidden hand identities');
  game.placementBlockTurns[1]=1;
  ok(!aiWithPlacement('sage_kasen',{r:1,c:0},()=>aiKasenRisk(0,'sage_kasen'),0).sources.some(x=>x.seat===1),'Blocked rivals cannot produce a next-turn shop threat');
  setup();hand(0,['sage_kasen']);put('mtn_aya',0,0);put('mtn_sanae',0,1);put('mtn_suwako',1,0);
  candidate=aiCurrentEvaluateCard(0,'sage_kasen');
  ok(candidate.claimsNow&&!candidate.reserveCombo,'Kasen may take a completed faction immediately');

  for(const difficulty of ['easy','normal','hard']){
    setup();game.aiDifficulty=difficulty;hand(0,['sdm_sakuya','haku_youmu']);game.reserveAges[0].sdm_sakuya=20;
    candidate=aiCurrentEvaluateCard(0,'sdm_sakuya');
    ok(candidate.reserveCombo&&!candidate.winsNow,'Old Sakuya stays reserved at '+difficulty+' difficulty');
  }
  setup();hand(0,['mtn_kanako','mtn_sanae']);
  ok(!proof('mtn_kanako',1,1).approved,'A playable Mountain card alone does not release Kanako');
  setup();hand(0,['hourai_kaguya']);hand(1,['hourai_mokou','hourai_tewi']);game.revealHand(1,game.players[1].hand,[0]);
  ok(!proof('hourai_kaguya',1,1).approved,'Two known Eientei cards alone do not release Kaguya');
  setup();hand(0,['hell_komachi','mtn_sanae']);put('hell_eiki',0,0);
  ok(!proof('hell_komachi',1,1).approved,'A free action alone does not release Komachi');

  setup();hand(0,['sdm_sakuya','haku_yuyuko']);put('haku_youmu',0,0);put('mtn_aya',0,2);
  ok(!proof('sdm_sakuya',1,0).approved,'A stable two-point follow-up is kept for later');
  score(0,['mtn_suwako','mtn_sanae','hourai_tewi','palace_satori','palace_rin']);
  const untouched=stamp(),win=proof('sdm_sakuya',1,0);
  ok(win.approved&&win.wins&&win.gain===2&&win.steps[0]?.cardId==='haku_yuyuko','Verified immediate victory can release Sakuya');
  ok(stamp()===untouched,'Bounded combo search restores the entire simulated material state');
  game.removeFromHand(0,'sdm_sakuya');const flags=await game.internalPlace('sdm_sakuya',1,0,0,0);
  ok(flags.extraTurns===2,'Approved Sakuya starts her real extra turns');
  const action=await aiCurrentDecideAction(0,false);
  ok(action.comboContinuation&&action.cardId==='haku_yuyuko','Actual extra action follows the proved placement');
  game.removeFromHand(0,action.cardId);await game.internalPlace(action.cardId,action.r,action.c,0,0);
  ok(game.winCount(game.players[0])===7&&!!game.winner,'Real execution realizes the proved win without Yuyuko payment');
  flags.cancelExtra?.();

  setup();hand(0,['sdm_sakuya']);put('sdm_remilia',0,0);put('sdm_patchouli',0,1);put('sdm_flandre',1,0);
  ok(!proof('sdm_sakuya',1,1).approved,'Four points alone are not enough if the opportunity is stable');
  hand(0,['palace_satori']);
  ok((await aiCurrentDecideAction(0,false)).cardId==='palace_satori','When drawing is impossible, an ordinary legal placement preserves the reserved combo');
  game.players[0].hand=['sdm_sakuya'];
  const rivalSakuya=copy('sdm_sakuya');hand(1,[rivalSakuya,'mtn_sanae']);game.revealHand(1,[rivalSakuya],[0]);
  const urgent=proof('sdm_sakuya',1,1);
  ok(urgent.approved&&urgent.expires&&urgent.gain===4,'Known rival completion makes the present scoring window urgent');
  hand(0,['mtn_kanako','mtn_sanae','mtn_aya','mtn_suwako','sage_kasen','haku_yuyuko','heaven_tenshi']);
  const costly=proof('sdm_sakuya',1,1);
  ok(!costly.approved&&costly.fee>4,'Sakuya hand-return cost can outweigh an urgent four-point claim');

  setup();hand(0,['temple_byakuren','haku_yuyuko','mtn_sanae','mtn_aya','mtn_suwako']);put('haku_youmu',0,0);put('sdm_patchouli',0,2);
  score(0,['hourai_tewi','hourai_mokou','hourai_reisen','palace_satori','palace_rin']);
  const paid=proof('temple_byakuren',1,0);
  ok(!paid.approved,'Byakuren cannot count the same hand card as both payment and winning follow-up');
  ok(!paid.steps.some(s=>paid.payment.includes(s.cardId)),'Every proposed paid line keeps payment and placement cards disjoint');

  setup();hand(0,['mtn_kanako','mtn_sanae']);put('mtn_aya',0,0);put('mtn_suwako',0,1);
  score(0,['hourai_tewi','palace_satori','palace_rin']);
  const mountainWin=proof('mtn_kanako',1,0);
  ok(mountainWin.approved&&mountainWin.wins&&mountainWin.steps[0]?.kind==='kanako','Kanako can prove a necessary Mountain follow-up');
  game.removeFromHand(0,'mtn_kanako');await game.internalPlace('mtn_kanako',1,0,0,0);
  ok(game.winCount(game.players[0])===7&&!!game.winner,'Kanako executes the exact winning hand card and position');

  setup();hand(0,['hourai_kaguya']);hand(1,['hourai_mokou']);game.revealHand(1,['hourai_mokou'],[0]);
  put('hourai_eirin',0,0);put('hourai_reisen',0,1);score(0,['mtn_aya','palace_satori','palace_rin']);
  const moonWin=proof('hourai_kaguya',1,0);
  ok(moonWin.approved&&moonWin.wins&&moonWin.steps[0]?.kind==='kaguya','Known opponent cards can prove a Kaguya win without hidden-hand access');
  game.removeFromHand(0,'hourai_kaguya');await game.internalPlace('hourai_kaguya',1,0,0,0);
  ok(game.winCount(game.players[0])===7&&!!game.winner,'Kaguya executes the known winning guess and stops');

  setup();hand(0,['hell_komachi']);put('hell_clownpiece',0,0);put('hell_eiki',1,0);put('hell_kutaka',1,1);
  score(0,['mtn_aya','palace_satori','palace_rin']);
  const hellWin=proof('hell_komachi',0,1);
  ok(hellWin.approved&&hellWin.wins&&!!hellWin.swapTarget,'Komachi proves her result after the mandatory swap');
  game.removeFromHand(0,'hell_komachi');await game.internalPlace('hell_komachi',0,1,0,0);
  ok(game.winCount(game.players[0])===7&&!!game.winner,'Komachi uses the proved swap and realizes the claim');

  setup();hand(0,['temple_byakuren','haku_yuyuko','sdm_patchouli','sdm_remilia']);
  put('temple_nue',3,3);put('temple_shou',3,2);put('haku_youmu',0,0);put('mtn_aya',0,2);
  score(0,['hourai_tewi','hourai_mokou','hourai_reisen','palace_satori','palace_rin']);
  const templeWin=proof('temple_byakuren',1,0);
  ok(templeWin.approved&&templeWin.wins&&templeWin.payment.length===2,'Byakuren can prove a win after her reduced real payment');
  game.removeFromHand(0,'temple_byakuren');const templeFlags=await game.internalPlace('temple_byakuren',1,0,0,0);
  ok(templeFlags.extraTurns===3&&templeWin.payment.every(id=>!game.players[0].hand.includes(id)),'Byakuren pays the exact budgeted cards before extra actions');
  const templeAction=await aiCurrentDecideAction(0,false);
  game.removeFromHand(0,templeAction.cardId);await game.internalPlace(templeAction.cardId,templeAction.r,templeAction.c,0,0);
  ok(game.winCount(game.players[0])===7&&!!game.winner,'Byakuren realizes the paid winning line');

  setup();put('mtn_aya',1,1);hand(1,['sdm_remilia','sdm_flandre']);await game.resolveAbility('mtn_aya',1,1,0,0);
  const paper=game.paperReports[0],folded=newspaperHtml(game.newsForSeat(paper,1)),readable=newspaperHtml(game.newsForSeat(paper,0));
  ok(folded.includes('文々。新聞')&&folded.includes('news-folded-cover')&&folded.includes('news-subscribe'),'Unsubscribed newspaper retains its masthead, folded cover and subscription button');
  ok(!folded.includes('Remilia Scarlet')&&!folded.includes('Flandre Scarlet')&&!folded.includes('news-story-heading'),'Folded newspaper contains no hidden story or card names');
  ok(['news-edition','news-headline','news-byline','news-columns','news-story-heading','news-footer'].every(s=>readable.includes(s)),'Authorized newspaper restores edition, headline, byline, columns and footer');
  ok(readable.includes('Remilia Scarlet')&&!readable.includes('news-subscribe'),'Editor sees full reports without a subscription prompt');
  return {checks,status:'pass'};
})()`,ctx).then(result=>{
  fs.writeFileSync(root+'/tests/strict-combos-2026-10-12-results.json',JSON.stringify(result,null,2));
  console.log(result.checks.length+' strict-combo, claim and newspaper checks passed');
}).catch(error=>{console.error(error.stack);process.exitCode=1;});
