const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
const builder=vm.createContext({});
vm.runInContext(html.slice(html.indexOf('function buildAIEvaluationWorkerSource'),html.indexOf('\nfunction evalHashSeed')),builder);builder.html=html;
const ctx=vm.createContext({console,setTimeout,clearTimeout,self:{},assert});
vm.runInContext(vm.runInContext('buildAIEvaluationWorkerSource(html)',builder),ctx);
vm.runInContext(`(async()=>{
  const checks=[],details={};
  function ok(value,name){assert(value,name);checks.push(name);console.log('PASS '+name);}
  function setup(difficulty='hard'){
    evalResetTokens();SIZE=4;game=new Game(3,{},null,{aiOnly:true,fastTest:true,aiDifficulty:difficulty,kourindouEnabled:true});
    game.currentPlayerIdx=0;game.board=Array.from({length:4},()=>Array(4).fill(null));game.shopCards=[];game.drawPile=[];
    game.players.forEach(p=>{p.hand=[];p.discard=[];p.isAI=true;});game.startingCardIds=new Set(CARDS.map(c=>c.id));game.render=()=>{};
    return game;
  }
  const hold=(p,ids)=>game.players[p].hand=ids,put=(id,r,c)=>game.setCardAt(r,c,id);
  const copied=(base,multiplier=1)=>{const id='created_card_'+(++nextCreatedCard);CARD[id]=blueprintCopy(base,id,base,multiplier);game.startingCardIds.add(id);return id;};
  function scarlet(){put('sdm_remilia',1,2);put('sdm_flandre',0,2);put('sdm_patchouli',0,1);}
  for(const difficulty of ['easy','normal','hard']){
    setup(difficulty);hold(0,['sdm_meiling']);scarlet();put('mtn_aya',2,1);
    const snapshot=JSON.stringify(captureAIEvaluationSnapshot(game)),board=game.board,hand=game.players[0].hand;
    const rng=Math.random;Math.random=()=>{throw Error('Preview must not use randomness');};let plan;
    try{plan=aiWithPlacement('sdm_meiling',{r:1,c:1},()=>aiMeilingPushPlan(0,1,1),0);}finally{Math.random=rng;}
    ok(plan?.safe&&plan.move.r===2&&plan.move.c===1,'Meiling prefers a non-faction push that preserves the four-card claim at '+difficulty);
    ok(JSON.stringify(captureAIEvaluationSnapshot(game))===snapshot&&game.board===board&&game.players[0].hand===hand,'Meiling preview restores board, hand, metrics and knowledge at '+difficulty);
    game.removeFromHand(0,'sdm_meiling');await game.internalPlace('sdm_meiling',1,1,0,0);
    ok(game.winCount(game.players[0])===4&&game.cardAt(3,1)==='mtn_aya','The actual push preserves and collects Meiling’s own faction at '+difficulty);
    setup(difficulty);hold(0,['sdm_meiling']);scarlet();
    const destinations=aiPlacementCells(game,'sdm_meiling',game.emptyOrWastelandForCard(CARD.sdm_meiling,0),0);
    ok(!destinations.some(cell=>cell.r===1&&cell.c===1),'A voluntary placement that can only break its own claim is rejected at '+difficulty);
    const forced=aiEvaluateCard(0,'sdm_meiling',{forced:true,acceptCandidate:c=>c.cell.r===1&&c.cell.c===1});
    ok(forced&&!forced.claimsNow&&forced.immediatePoints===0,'Forced Meiling evaluation scores the actual post-push board at '+difficulty);
    game.removeFromHand(0,'sdm_meiling');await game.internalPlace('sdm_meiling',1,1,0,0);
    ok(game.isOnBoard('sdm_meiling')&&game.cardAt(1,3)==='sdm_remilia'&&game.winCount(game.players[0])===0,'A forced placement still performs its mandatory push at '+difficulty);
  }
  setup();hold(0,['sdm_meiling','sdm_flandre']);put('sdm_remilia',1,2);put('sdm_patchouli',0,0);
  const future=aiWithPlacement('sdm_meiling',{r:1,c:1},()=>({before:aiCanConnectFaction('sdm',1),plan:aiMeilingPushPlan(0,1,1)}),0);
  ok(future.before&&!future.plan.safe,'Meiling rejects moving a member beyond the remaining one-card connection budget');
  setup();const twice=copied('sdm_meiling',2);hold(0,[twice,'hourai_tewi']);scarlet();put('mtn_aya',2,1);
  ok(!aiPlacementCells(game,twice,[{r:1,c:1}],0).length,'A legacy doubled Meiling considers both mandatory pushes');
  setup();const unpaid=copied('sdm_meiling');hold(0,[unpaid]);scarlet();
  ok(aiPlacementCells(game,unpaid,[{r:1,c:1}],0).length===1,'An unpaid copy may collect with its body when no push can activate');
  game.removeFromHand(0,unpaid);await game.internalPlace(unpaid,1,1,0,0);
  ok(game.winCount(game.players[0])===4,'The unpaid Meiling copy really collects without moving a member');
  setup();hold(0,['sdm_meiling']);scarlet();game.permanentAbilities.sdm_meiling='__draw_one';
  ok(aiPlacementCells(game,'sdm_meiling',[{r:1,c:1}],0).length===1,'Rin-overwritten Meiling uses its current ability rather than the old push guard');
  setup();hold(0,['sdm_meiling']);scarlet();game.players[0].aiPolicy='baseline';
  ok(aiPlacementCells(game,'sdm_meiling',[{r:1,c:1}],0).length===1,'The historical comparison policy keeps its original placement choices');

  for(const owner of [0,1,2]){
    setup();hold(owner,['palace_koishi']);hold(0,[...(game.players[0].hand),'sage_kasen']);put('palace_satori',0,0);put('palace_rin',0,1);
    game.removeFromHand(0,'sage_kasen');await game.internalPlace('sage_kasen',1,0,0,0);
    ok(game.winCount(game.players[owner])===4&&game.players.filter(p=>p.idx!==owner).every(p=>game.winCount(p)===0),'Kasen-triggered Koishi claims belong to holder '+owner+' after actor claims settle');
    ok(game.testSeatMetrics(owner).placements.palace_koishi===1&&game.testSeatMetrics(owner).cardActions.palace_koishi?.abilityCalls===1,'Koishi usage and placement remain with holder '+owner);
    ok(game.testSeatMetrics(owner).scoreSources['faction:palace']?.points===4,'Koishi claim measurements belong to holder '+owner);
  }
  setup();hold(2,['palace_koishi']);hold(1,['sage_kasen']);put('palace_satori',0,0);put('palace_rin',0,1);
  game.removeFromHand(1,'sage_kasen');await game.internalPlace('sage_kasen',1,0,1,0);
  ok(game.currentPlayerIdx===0&&game.winCount(game.players[2])===4&&game.winCount(game.players[1])===0,'Nested Koishi claims belong to the entrant’s holder, independently of the current turn');
  setup();const koishiCopy=copied('palace_koishi');hold(1,[koishiCopy,'mtn_sanae']);put('palace_satori',0,0);put('palace_rin',0,1);put('palace_utsuho',1,0);
  await game.resolveKoishiCascade(0,0);
  ok(game.winCount(game.players[1])===4&&game.winCount(game.players[0])===0&&game.testSeatMetrics(1).diagnostics.costCards===1&&game.testSeatMetrics(0).diagnostics.costCards===0,'A copied Koishi charges the holder and awards her new claim to the holder');
  setup();const nestedCopy=copied('palace_koishi');hold(1,[nestedCopy,'mtn_sanae']);put('palace_satori',0,0);put('palace_rin',0,1);put('palace_utsuho',1,0);
  const parent={caster:'sage_matara',ability:'sage_matara',playerIdx:0,paid:[],gained:[],stolen:[],information:false};game.testAbilityFrames=[parent];
  await game.resolveKoishiCascade(0,0);
  ok(game.testSeatMetrics(1).abilityDetails['palace_koishi:palace_koishi'].costPaid===1&&!parent.paid.length&&game.testAbilityFrames[0]===parent,'Nested Koishi costs belong to her holder and do not pollute the parent ability frame');
  setup();const blocked=copied('palace_koishi');hold(1,[blocked]);put('palace_satori',0,0);put('palace_rin',0,1);put('palace_utsuho',1,0);
  await game.resolveKoishiCascade(0,0);ok(game.players[1].hand.includes(blocked)&&!game.isOnBoard(blocked)&&game.winCount(game.players[0])===0,'An unaffordable copied Koishi stays in the holder’s hand without scoring');
  setup();hold(1,['palace_koishi']);put('palace_satori',0,0);put('palace_rin',0,1);put('palace_utsuho',1,0);game.players[1].discard=['mtn_sanae','hourai_mokou','sdm_patchouli'];
  await game.resolveKoishiCascade(0,0);ok(game.winner===game.players[1],'A Koishi-triggered winning claim awards the win to her holder');

  for(const difficulty of ['easy','normal','hard']){
    setup(difficulty);hold(0,['hourai_eirin']);put('hourai_kaguya',0,0);put('hourai_reisen',0,1);
    const before=JSON.stringify(captureAIEvaluationSnapshot(game)),defs=JSON.stringify(CARD);const rng=Math.random;
    Math.random=()=>{throw Error('Creator preview must not use randomness');};let pick;
    try{pick=aiEvaluateCard(0,'hourai_eirin');}finally{Math.random=rng;}
    ok(pick&&!pick.claimsNow&&pick.immediatePoints===0,'Swapped Eirin no longer receives a fictitious immediate second placement at '+difficulty);
    ok(aiAcquisitionValue(0,'hourai_eirin').claimPoints===0,'Acquisition scoring treats Eirin’s copy as hand material at '+difficulty);
    ok(JSON.stringify(captureAIEvaluationSnapshot(game))===before&&JSON.stringify(CARD)===defs,'Creator preview preserves definitions and full game state at '+difficulty);
  }
  setup();hold(0,['hourai_eirin','hourai_mokou']);put('hourai_kaguya',0,0);
  const forecast=aiWithPlacement('hourai_eirin',{r:0,c:1},()=>aiFactionForecast(0,'hourai_eirin'),0);
  ok(forecast.size===4&&forecast.rate===4/3&&forecast.bonus===0,'Eirin’s extra member needs a later normal placement rather than a free action');
  setup();put('hourai_eirin',1,1);put('sage_kasen',0,0);const realCreate=game.createCard;
  game.createCard=function(p,ids,options){ok(options.double&&!options.immediate&&options.excludeBaseId==='hourai_eirin','Eirin creates doubled hand material and excludes herself');return realCreate.call(this,p,['hourai_reisen'],options);};
  await game.resolveAbility('hourai_eirin',1,1,0,0);const made=game.players[0].hand.find(id=>CARD[id]?.createdCopy);
  ok(made&&CARD[made].abilityMultiplier===2&&CARD[made].costBonus===1&&!game.isOnBoard(made),'The real Eirin copy stays in hand with double ability and one surcharge');
  ok(game.isSageMuted('sage_kasen'),'Swapping the create effect retains Eirin’s Sage mute');

  setup();put('sage_matara',1,1);put('mtn_aya',0,0);put('hourai_mokou',0,1);let prompts=0;game.createCard=async()=>{prompts++;return null;};
  await game.resolveAbility('sage_matara',1,1,0,0);ok(prompts===0,'Three main-board cards cannot start Matara creation');
  put('sdm_patchouli',3,3);await game.resolveAbility('sage_matara',1,1,0,0);ok(prompts===1,'Four main-board cards including Matara retain the creation threshold');
  setup();put('sage_matara',0,0);game.shopCards=['shop_rinnosuke','mtn_nitori','palace_yuugi','hell_kutaka'];ok(!game.canCreateWithMatara(),'Shop cards do not satisfy Matara’s main-board threshold');
  setup();const mataraCopy=copied('sage_matara');put(mataraCopy,1,1);put('mtn_aya',0,0);put('hourai_mokou',0,1);hold(0,['sdm_patchouli']);
  await game.resolveAbility(mataraCopy,1,1,0,0);ok(game.players[0].hand.includes('sdm_patchouli')&&!game.testSeatMetrics(0).diagnostics.costCards,'An ineligible Matara copy does not charge its surcharge');
  setup();put('sage_matara',1,1);put('sdm_patchouli',0,0);put('sdm_flandre',0,1);put('sdm_remilia',1,0);hold(0,['hourai_tewi']);
  const before=JSON.stringify(captureAIEvaluationSnapshot(game)),defs=JSON.stringify(CARD);const matara=aiMataraCreationPlan(0,'sage_matara',{r:1,c:1});
  ok(matara?.points===4&&matara.claims[0].faction==='sdm','Matara counts an immediate faction claim available from every three-card offer');
  ok(JSON.stringify(captureAIEvaluationSnapshot(game))===before&&JSON.stringify(CARD)===defs,'Matara copy/payment previews restore board, definitions, hands and metrics');
  const create=game.createCard;game.createCard=function(p,ids,options){ok(options.immediate&&!options.double&&options.excludeBaseId==='sage_matara','Matara creates an ordinary copy for immediate play and excludes herself');return create.call(this,p,ids,options);};
  await game.resolveAbility('sage_matara',1,1,0,0);const played=game.players[0].discard.find(id=>CARD[id]?.createdCopy);
  ok(game.winCount(game.players[0])===4&&played&&CARD[played].abilityMultiplier===1,'Actual Matara selects and lands a scoring ordinary copy');
  ok(game.testSeatMetrics(0).diagnostics.costCards===1,'The immediately played clone pays its creation surcharge once');
  setup();put('sage_matara',1,1);put('sdm_patchouli',0,0);put('sdm_flandre',0,1);put('sdm_remilia',1,0);put('mtn_aya',3,0);put('hourai_mokou',3,3);put('temple_murasa',2,3);hold(0,['hourai_tewi']);
  const randomPlan=aiMataraCreationPlan(0,'sage_matara',{r:1,c:1});
  ok(randomPlan?.points===0,'Matara cannot assume a scoring Scarlet template will appear in a random three-card offer');
  details.randomOfferFloor=randomPlan.points;
  setup();put('sage_matara',1,1);put('haku_youmu',0,0);put('hourai_mokou',0,1);put('mtn_aya',3,3);
  game.createCard=function(p,ids,options){return create.call(this,p,['haku_youmu'],options);};
  await game.resolveAbility('sage_matara',1,1,0,0);const inert=game.board.flat().find(id=>CARD[id]?.createdCopy)||game.players[0].discard.find(id=>CARD[id]?.createdCopy);
  ok(inert&&game.createdActivations[inert]===false,'Without payment Matara’s created card can still enter as an inactive body');
  setup();put('sage_matara',1,1);put('haku_youmu',0,0);put('hourai_mokou',0,1);put('mtn_aya',3,3);
  game.wasteland=Array.from({length:4},()=>Array(4).fill(true));game.createCard=function(p,ids,options){return create.call(this,p,['haku_youmu'],options);};
  await game.resolveAbility('sage_matara',1,1,0,0);ok(game.players[0].hand.some(id=>CARD[id]?.createdCopy&&!game.isOnBoard(id)),'A created card with no legal destination remains in hand');
  setup();const saved=copied('hourai_reisen',2);hold(0,[saved]);game.startingCardIds=new Set([saved]);
  const snap=captureAIEvaluationSnapshot(game);snap.rulesVersion='2026-10-13-matara-threshold-eirin-v6';
  evalRestore(snap,['current','current','current']);ok(game.players[0].hand.includes(saved)&&CARD[saved].abilityMultiplier===2&&REWORK_RULES_VERSION.endsWith('v29'),'Regular v6 snapshots restore their existing double cards under the swapped rules');
  return {status:'pass',count:checks.length,checks,details,rulesVersion:REWORK_RULES_VERSION,scope:'Actual placements, costs, ownership, deterministic previews and three-card offer bounds'};
})()`,ctx).then(result=>{fs.writeFileSync(__dirname+'/creators-claim-owner-2026-10-13-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' creator/claim-owner checks passed');}).catch(error=>{console.error(error.stack);process.exitCode=1;});
