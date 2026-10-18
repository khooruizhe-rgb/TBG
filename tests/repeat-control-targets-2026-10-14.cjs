const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
const builder=vm.createContext({});
vm.runInContext(html.slice(html.indexOf('function buildAIEvaluationWorkerSource'),html.indexOf('\nfunction evalHashSeed')),builder);
builder.html=html;
const ctx=vm.createContext({console,setTimeout,clearTimeout,self:{},assert});
vm.runInContext(vm.runInContext('buildAIEvaluationWorkerSource(html)',builder),ctx);
vm.runInContext(`(async()=>{
  const checks=[],observations={};
  function ok(value,name){assert(value,name);checks.push(name);}
  function setup(n=3,difficulty='hard',actor=0){
    evalResetTokens();SIZE=4;game=new Game(n,{},null,{aiOnly:true,fastTest:true,aiDifficulty:difficulty});
    game.currentPlayerIdx=actor;game.board=Array.from({length:4},()=>Array(4).fill(null));
    game.shopCards=[];game.drawPile=[];game.startingCardIds=new Set();game.render=()=>{};
    game.players.forEach(p=>{p.hand=[];p.discard=[];p.isAI=true;});
    game.aiMakesMistake=()=>false;
    const targets=[];
    game.presentAbility=(type,data)=>{if(type==='reisen'&&data.stage==='focus')targets.push(data.targetIdx);};
    game.presentTemple=(type,data)=>{if(type==='murasa')targets.push(data.playerIdx);};
    return targets;
  }
  function hold(p,ids){game.players[p].hand=ids.slice();ids.forEach(id=>game.startingCardIds.add(id));}
  function put(id,r,c){game.setCardAt(r,c,id);game.startingCardIds.add(id);}
  function copy(base,ability=base){const id='created_card_'+(++nextCreatedCard);CARD[id]=blueprintCopy(base,id,ability,2);game.startingCardIds.add(id);return id;}
  function paid(p){return game.testSeatMetrics(p).diagnostics.costCards;}
  function prepareOpponents(p){
    const opponents=game.players.filter(other=>other.idx!==p).map(other=>other.idx);
    const hands=[['mtn_sanae','mtn_aya','mtn_suwako'],['sdm_sakuya','sdm_patchouli'],['palace_satori']];
    opponents.forEach((seat,i)=>hold(seat,hands[i]));
    game.players[opponents[0]].discard=['yuuka','medicine'];
    if(opponents[1]!=null)game.players[opponents[1]].discard=['haku_youmu'];
    game.players.forEach(other=>other.discard.forEach(id=>game.startingCardIds.add(id)));
    return opponents;
  }
  for(const difficulty of ['easy','normal','hard'])for(const n of [2,3,4])for(let actor=0;actor<n;actor++){
    for(const ability of ['hourai_reisen','temple_murasa']){
      const targets=setup(n,difficulty,actor),opponents=prepareOpponents(actor),id=copy(ability);
      hold(actor,['hourai_mokou']);put(id,1,1);
      await game.resolveAbility(id,1,1,actor,0);
      const label=ability+' '+difficulty+' '+n+' players, actor '+actor;
      ok(targets.length===2&&new Set(targets).size===Math.min(2,n-1)&&targets.every(seat=>seat!==actor),'Repeated effects cover different available opponents: '+label);
      ok(paid(actor)===1&&game.testSeatMetrics(actor).diagnostics.costEvents===1,'Repeats still pay the creation surcharge only once: '+label);
      if(ability==='hourai_reisen'){
        ok(opponents.filter(seat=>!!game.forcedPlay[seat]).length===Math.min(2,n-1),'The actual forced commands remain on both selected hands: '+label);
      }else{
        ok(opponents.filter(seat=>game.placementBlockTurns[seat]===2).length===Math.min(2,n-1)&&game.placementBlockTurns[actor]===1,'The actual seals affect two opponents and only one self turn: '+label);
        ok(targets[0]===opponents[0],'Murasa keeps the leader as its first target: '+label);
      }
      ok(game.ruleContext===null&&game.activeRuleAbility===null,'Resolution restores its activation context: '+label);
    }
  }

  let targets=setup();hold(1,['mtn_sanae','mtn_aya','mtn_suwako']);hold(2,['sdm_sakuya']);game.forcedPlay[1]='mtn_sanae';
  put('hourai_reisen',1,1);await game.resolveAbility('hourai_reisen',1,1,0,0);
  ok(targets[0]===2&&game.forcedPlay[1]==='mtn_sanae'&&game.forcedPlay[2]==='sdm_sakuya','A later Reisen leaves an existing valid command intact and binds an uncommanded opponent');
  targets=setup();hold(1,['mtn_sanae']);put('hourai_reisen',1,1);await game.resolveAbility('hourai_reisen',1,1,0,0);
  ok(targets.length===1&&targets[0]===1&&game.forcedPlay[1]==='mtn_sanae','Reisen skips an empty hand when another opponent can be commanded');
  setup();hold(1,['mtn_sanae']);hold(2,['sdm_sakuya']);game.forcedPlay[1]='mtn_aya';
  ok(aiReisenPlayerCandidates(game,0).includes(1),'A stale command for a card no longer held does not reject that opponent');
  targets=setup();put('hourai_reisen',1,1);await game.resolveAbility('hourai_reisen',1,1,0,0);
  ok(!targets.length&&Object.values(game.forcedPlay).every(id=>!id),'No opponent cards produces no illegal target or command');
  setup();hold(1,['mtn_sanae']);hold(2,['sdm_sakuya']);game.forcedPlay[1]='mtn_sanae';game.forcedPlay[2]='sdm_sakuya';
  ok(aiReisenPlayerCandidates(game,0).length===2,'When all opponents already have commands, the original legal target choices remain available');

  targets=setup(4);prepareOpponents(0);game.placementBlockTurns[1]=2;put('temple_murasa',1,1);
  await game.resolveAbility('temple_murasa',1,1,0,0);
  ok(targets[0]===2&&game.placementBlockTurns[1]===2&&game.placementBlockTurns[2]===2,'A separate Murasa use targets the next highest scorer rather than an already fully sealed leader');
  game.placementBlockTurns[2]=1;
  ok(aiMurasaTarget(game,0)===2,'A one-turn seal can still be extended and competes by score');
  game.placementBlockTurns[2]=2;game.placementBlockTurns[3]=2;
  ok(aiMurasaTarget(game,0)===1,'When every opponent has two sealed turns, Murasa retains a legal opponent fallback');

  for(const ability of ['hourai_reisen','temple_murasa']){
    targets=setup();prepareOpponents(0);game.aiMakesMistake=()=>true;
    const id=copy(ability);hold(0,['hourai_mokou']);put(id,1,1);await game.resolveAbility(id,1,1,0,0);
    ok(new Set(targets).size===2,'Difficulty mistakes cannot waste a repeat while a fresh opponent exists: '+ability);
    targets=setup();prepareOpponents(0);const refused=copy(ability);put(refused,1,1);
    await game.resolveAbility(refused,1,1,0,0);
    ok(!targets.length&&!Object.values(game.forcedPlay).some(Boolean)&&Object.values(game.placementBlockTurns).every(n=>!n),'An unpaid copy cannot grant either repeated effect: '+ability);
    targets=setup();prepareOpponents(0);const borrowed=copy('temple_nue');put(borrowed,1,1);hold(0,['hourai_mokou']);
    let seed=0;
    for(;seed<10000;seed++){evalSetSeed(seed);const options=shuffle(CARDS.filter(card=>!card.token&&!card.shopkeeper&&card.id!=='temple_nue'&&card.id!==borrowed).map(card=>card.id)).slice(0,3);if(options.includes(ability))break;}
    assert(seed<10000);evalSetSeed(seed);let choices=0;
    game.chooseChimeraAbility=async(p,ids)=>{assert(ids.includes(ability));choices++;return ability;};
    await game.resolveAbility(borrowed,1,1,0,0);
    ok(choices===1&&new Set(targets).size===2&&paid(0)===1,'Double Nue also spreads the cached borrowed control ability and pays once: '+ability);
  }

  setup();prepareOpponents(0);game.forcedPlay[1]=game.players[1].hand[0];game.placementBlockTurns[1]=2;
  const state=JSON.stringify(captureAIEvaluationSnapshot(game)),rng=Math.random;
  Math.random=()=>{throw Error('Target filtering must not consume randomness');};
  let reisen,murasa;
  try{reisen=aiReisenPlayerCandidates(game,0);murasa=aiMurasaTarget(game,0);}finally{Math.random=rng;}
  ok(reisen.length===1&&reisen[0]===2&&murasa===2&&JSON.stringify(captureAIEvaluationSnapshot(game))===state,'Target filters use public control state without mutating the board, hands, counters or RNG');
  hold(2,['sage_ran','sage_matara']);const first=aiReisenPlayerCandidates(game,0),seal=aiMurasaTarget(game,0);
  hold(2,['sdm_sakuya','sdm_patchouli']);game.handKnowledge[0].clear();
  ok(JSON.stringify(first)===JSON.stringify(aiReisenPlayerCandidates(game,0))&&seal===aiMurasaTarget(game,0),'Unrevealed hand identities do not change which opponent receives the repeat');

  for(const ability of ['hourai_reisen','temple_murasa']){
    targets=setup();prepareOpponents(0);game.players[0].isAI=false;game.choosePlayer=async()=>1;
    game.chooseHandCard=async(p,t)=>game.players[t].hand[0];game.selectCostCards=async(p,min,max)=>game.payableCards(p).slice(0,max);
    const id=copy(ability);hold(0,['hourai_mokou']);put(id,1,1);await game.resolveAbility(id,1,1,0,0);
    ok(targets.length===2&&targets.every(seat=>seat===1),'Human players may still choose the same opponent twice: '+ability);
  }
  setup();game.players[0].isAI=false;game.ui={pickPlayer:async(title,candidates)=>{assert(candidates.includes(1));return 1;}};
  ok(await game.choosePlayer(0,'Human target',{excludeSelf:true,aiCandidates:[2]})===1,'AI candidate preferences do not constrain the human target picker');
  for(const policy of ['previous','baseline']){
    targets=setup();prepareOpponents(0);game.players[0].aiPolicy=policy;
    const id=copy('hourai_reisen');hold(0,['hourai_mokou']);put(id,1,1);await game.resolveAbility(id,1,1,0,0);
    ok(targets.length===2&&targets.every(seat=>seat===1),'The historical comparison policy retains its original target choice: '+policy);
  }

  setup();const restored=copy('hourai_reisen');hold(0,[restored,'hourai_mokou']);prepareOpponents(0);game.beginPlayerTurn(0);
  const snap=captureAIEvaluationSnapshot(game);snap.rulesVersion='2026-10-14-komachi-opening-observer-v9';
  evalRestore(snap,['current','current','current']);
  ok(game.players[0].hand.includes(restored)&&CARD[restored].abilityMultiplier===2&&REWORK_RULES_VERSION.endsWith('v28'),'A v9 regular-turn save retains its existing double cards under the target correction');

  setup();game.shopCards=['shop_rinnosuke',null,null,null];game.startingCardIds.add('shop_rinnosuke');
  hold(0,['mtn_kanako','hourai_kaguya']);put('hourai_mokou',0,0);put('hourai_reisen',0,1);put('hourai_tewi',1,0);
  game.shopCards[1]='mtn_sanae';game.startingCardIds.add('mtn_sanae');
  const kanako=aiCurrentKanakoTrade(0,{type:'place',cardId:'mtn_kanako',r:3,c:3});
  observations.kanakoSetup={offered:kanako?.cardId,bought:kanako?game.cardAt(kanako.target.r,kanako.target.c):null,gain:kanako?.gain,thenPlace:kanako?.thenPlace};
  observations.scope='Trading code is unchanged; the setup example records the current branch behavior, not a balance recommendation.';
  return {status:'pass',count:checks.length,checks,observations,rulesVersion:REWORK_RULES_VERSION};
})()`,ctx).then(result=>{
  fs.writeFileSync(__dirname+'/repeat-control-targets-2026-10-14-results.json',JSON.stringify(result,null,2)+'\n');
  console.log(result.count+' repeated-control checks passed');console.log(result.observations);
}).catch(error=>{console.error(error.stack);process.exitCode=1;});
