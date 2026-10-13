const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
if(!html.includes("const REWORK_RULES_VERSION='2026-10-13-matara-threshold-eirin-v6'")){console.log('Historical v6 Eirin/Matara checks superseded by creators-claim-owner-2026-10-13.cjs');process.exit(0);}
const builder=vm.createContext({});vm.runInContext(html.slice(html.indexOf('function buildAIEvaluationWorkerSource'),html.indexOf('\nfunction evalHashSeed')),builder);builder.html=html;
const ctx=vm.createContext({console,setTimeout,clearTimeout,self:{},assert});vm.runInContext(vm.runInContext('buildAIEvaluationWorkerSource(html)',builder),ctx);
vm.runInContext(`(async()=>{
  const checks=[],details={};const ok=(value,name)=>{assert(value,name);checks.push(name);console.log('PASS '+name);};
  function setup(difficulty='hard',shop=true){
    evalResetTokens();SIZE=4;game=new Game(3,{},null,{aiOnly:true,fastTest:true,aiDifficulty:difficulty,kourindouEnabled:shop});
    game.currentPlayerIdx=0;game.board=Array.from({length:4},()=>Array(4).fill(null));game.drawPile=[];game.shopCards=[];
    game.players.forEach(p=>{p.hand=[];p.discard=[];p.isAI=true;});game.startingCardIds=new Set(CARDS.map(c=>c.id));game.render=()=>{};
    return game;
  }
  const hold=(ids)=>game.players[0].hand=ids,put=(id,r,c)=>game.setCardAt(r,c,id);
  const copied=(base)=>{const id='created_card_'+(++nextCreatedCard);CARD[id]=blueprintCopy(base,id,base);game.startingCardIds.add(id);return id;};
  setup();put('sage_matara',1,1);put('mtn_aya',0,0);put('hourai_mokou',0,1);
  let prompts=0;game.createCard=async()=>{prompts++;};
  await game.resolveAbility('sage_matara',1,1,0,0);
  ok(!game.canCreateWithMatara()&&prompts===0,'Three main-board cards cannot activate Matara or start printing');
  put('sdm_patchouli',3,3);await game.resolveAbility('sage_matara',1,1,0,0);
  ok(game.canCreateWithMatara()&&prompts===1,'Four main-board cards, including Matara herself, activate creation');
  setup();put('sage_matara',0,0);game.shopCards=['shop_rinnosuke','mtn_nitori','palace_yuugi','hell_kutaka'];
  ok(!game.canCreateWithMatara(),'Shop cards do not bypass the main-board threshold');
  setup();const mataraCopy=copied('sage_matara');put(mataraCopy,1,1);put('mtn_aya',0,0);put('hourai_mokou',0,1);hold(['sdm_patchouli']);
  await game.resolveAbility(mataraCopy,1,1,0,0);
  ok(game.players[0].hand.includes('sdm_patchouli')&&!game.testSeatMetrics(0).diagnostics.costCards,'An ineligible copied Matara does not charge its creation surcharge');
  ok(!aiCostCanResolve(0,mataraCopy,1,1)&&game.estimateHandGain(0,mataraCopy)===0,'AI does not credit Matara with an unavailable creation');
  put('mtn_sanae',3,3);ok(aiCostCanResolve(0,mataraCopy,1,1),'AI recognizes the four-card threshold once it is met');
  setup();put('sage_matara',1,1);put('mtn_aya',0,0);put('hourai_mokou',0,1);put('sdm_patchouli',3,3);hold(['hourai_tewi']);
  await game.resolveAbility('sage_matara',1,1,0,0);
  const made=game.players[0].hand.find(id=>CARD[id]?.createdCopy);
  ok(made&&CARD[made].abilityMultiplier===2&&cardBaseId(made)!=='sage_matara','An eligible Matara still creates a doubled card and excludes herself');
  for(const difficulty of ['easy','normal','hard']){
    setup(difficulty);hold(['hourai_eirin']);put('hourai_kaguya',0,0);put('hourai_reisen',0,1);
    const owner=game,board=game.board,hand=game.players[0].hand,defs=JSON.stringify(CARD),snapshot=JSON.stringify(captureAIEvaluationSnapshot(game));
    const rng=Math.random;Math.random=()=>{throw Error('A preview must not consume random choices');};let pick;
    try{pick=aiEvaluateCard(0,'hourai_eirin');}finally{Math.random=rng;}
    ok(pick?.claimsNow&&pick.immediatePoints===4,'Eirin plus her immediate copy completes a four-card set at '+difficulty);
    ok(JSON.stringify(CARD)===defs&&game===owner&&game.board===board&&game.players[0].hand===hand&&JSON.stringify(captureAIEvaluationSnapshot(game))===snapshot,'Eirin preview restores definitions, board, hand, counters and metrics at '+difficulty);
    const acquired=aiAcquisitionValue(0,'hourai_eirin');
    ok(acquired.claimPoints===4&&acquired.claimSize===4,'Acquisition scoring sees Eirin as a two-member finish at '+difficulty);
    const action=await aiDecideAction(0,false);ok(action.type==='place'&&action.cardId==='hourai_eirin','The actual AI action uses the immediate Eirin claim at '+difficulty);
    await doPlayerAction(0);
    ok(game.winCount(game.players[0])===4&&game.players[0].discard.includes('hourai_eirin'),'The real Eirin action chooses a scoring copy landing at '+difficulty);
  }
  setup();hold(['hourai_eirin']);put('hourai_kaguya',0,0);put('hourai_reisen',0,1);game.players[0].discard=['haku_youmu','sdm_patchouli','mtn_aya'];
  ok(aiEvaluateCard(0,'hourai_eirin')?.winsNow,'Eirin’s immediately played copy is included in a winning action');
  setup();hold(['hourai_eirin','hourai_reisen','hourai_mokou','sdm_patchouli','mtn_sanae']);put('hourai_kaguya',0,0);
  const future=aiWithPlacement('hourai_eirin',{r:0,c:1},()=>aiFactionForecast(0,'hourai_eirin'),0);
  ok(future.size===4&&future.rate===2,'Eirin’s free second member shortens a future assembly by one normal action');
  details.future=future;
  setup();hold(['hourai_eirin']);put('hourai_kaguya',0,0);put('hourai_reisen',3,3);
  ok(!aiEvaluateCard(0,'hourai_eirin')?.claimsNow,'A disconnected board does not receive fictitious immediate claim points');
  setup();hold(['hourai_eirin']);put('hourai_kaguya',0,0);put('hourai_reisen',0,1);
  game.wasteland=Array.from({length:4},()=>Array(4).fill(true));game.wasteland[1][0]=false;
  ok(!aiEvaluateCard(0,'hourai_eirin')?.claimsNow,'Eirin does not count a second member when the copy has no legal landing');
  setup();hold(['hourai_eirin']);put('hourai_kaguya',0,0);put('sage_kasen',0,1);
  ok(!aiEvaluateCard(0,'hourai_eirin')?.claimsNow,'Eirin’s Sage mute prevents counting Kasen as a remaining Eientei member');
  setup();hold(['hourai_eirin']);game.permanentAbilities.hourai_eirin='__draw_one';put('hourai_kaguya',0,0);put('hourai_reisen',0,1);
  ok(!aiEvaluateCard(0,'hourai_eirin')?.claimsNow,'Rin-overwritten Eirin is one member and has no creation follow-up');
  setup();ok(typeof game.isCrownAbilityDisabled('sdm_patchouli')==='boolean','Ordinary and copied disable flags use booleans for candidate ranking');const eirinCopy=copied('hourai_eirin');hold([eirinCopy]);put('hourai_kaguya',0,0);put('hourai_reisen',0,1);
  ok(!aiEvaluateCard(0,eirinCopy)?.claimsNow,'An unpaid Eirin copy does not receive a free second member');
  hold([eirinCopy,'sdm_patchouli']);ok(aiEvaluateCard(0,eirinCopy)?.immediatePoints===4,'A payable Eirin copy receives its real creation follow-up');
  await doPlayerAction(0);ok(game.winCount(game.players[0])===4,'The copied Eirin forecast matches actual activation, payment and collection');
  for(const source of ['hourai_kaguya','hourai_reisen','hourai_mokou','hourai_tewi']){
    setup('hard',false);hold(['hourai_eirin','hourai_mokou','hourai_tewi','sdm_patchouli']);put('hourai_kaguya',0,0);put('hourai_reisen',0,1);
    // Control the offered template to exercise each legal copy ability, while
    // using the real creation, payment, placement and claim rules afterward.
    const realCreate=game.createCard;game.createCard=function(p,ids,options){return realCreate.call(this,p,[source],options);};
    const pick=aiEvaluateCard(0,'hourai_eirin');game.removeFromHand(0,'hourai_eirin');await game.internalPlace('hourai_eirin',pick.cell.r,pick.cell.c,0,0);
    ok(game.winCount(game.players[0])===4,'Every legal Eirin template preserves the immediate claim: '+source);
  }
  setup();hold(['hourai_eirin']);put('hourai_kaguya',0,0);put('hourai_reisen',0,1);
  const first=aiEvaluateCard(0,'hourai_eirin');game.players[1].hand=['sdm_sakuya','sage_kasen'];game.drawPile=['mtn_sanae','hell_clownpiece'];
  const second=aiEvaluateCard(0,'hourai_eirin');
  ok(JSON.stringify(first)===JSON.stringify(second),'Unrevealed opponent identities and deck order do not change the guaranteed Eirin claim');
  game.startingCardIds=new Set([...game.board.flat(),...game.players.flatMap(p=>[...p.hand,...p.discard]),...game.drawPile].filter(Boolean));
  const snap=captureAIEvaluationSnapshot(game);snap.rulesVersion='2026-10-13-single-cost-double-copy-v5';
  evalRestore(snap,['current','current','current']);ok(REWORK_RULES_VERSION.endsWith('v6'),'Regular v5 snapshots restore under the new Matara rule');
  return {status:'pass',count:checks.length,checks,details,scope:'Boundary rules, deterministic previews, actual creation and claim resolution'};
})()`,ctx).then(result=>{fs.writeFileSync(__dirname+'/eirin-matara-2026-10-13-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' Eirin/Matara checks passed');}).catch(error=>{console.error(error.stack);process.exitCode=1;});
