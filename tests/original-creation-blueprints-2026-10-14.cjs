// Run the shipped creation rules and AI previews, including altered sources and old saves.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
const builder=vm.createContext({});
vm.runInContext(html.slice(html.indexOf('function buildAIEvaluationWorkerSource'),html.indexOf('\nfunction evalHashSeed')),builder);builder.html=html;
const ctx=vm.createContext({console,setTimeout,clearTimeout,self:{},assert});
vm.runInContext(vm.runInContext('buildAIEvaluationWorkerSource(html)',builder),ctx);
vm.runInContext(`(async()=>{
  const checks=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
  function setup(){
    evalResetTokens();SIZE=4;game=new Game(3,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard'});
    game.currentPlayerIdx=0;game.board=Array.from({length:4},()=>Array(4).fill(null));game.shopCards=[];game.drawPile=[];
    game.players.forEach(p=>{p.hand=[];p.discard=[];p.isAI=false;});game.startingCardIds=new Set();game.render=()=>{};
    game.ui={pickAbilityCards:async(t,ids)=>ids[0],pickCell:async(t,cells)=>cells[0],pickHandCard:async(t,ids)=>ids[0],pickOwnHandCards:async(t,ids,o)=>ids.slice(0,o.maxCount)};
    game.pickUI=async(p,method,args)=>game.ui[method](...args);return game;
  }
  const put=(id,r,c)=>{game.setCardAt(r,c,id);game.startingCardIds.add(id);};
  const hold=(p,ids)=>{game.players[p].hand.push(...ids);ids.forEach(id=>game.startingCardIds.add(id));};
  function legacy(base,{ability=base,cost=1,double=false}={}){
    const id='created_card_'+(++nextCreatedCard);CARD[id]={...blueprintCopy(base,id,null),copiedAbility:ability,costBonus:cost,abilityMultiplier:double?2:1};
    return id;
  }
  setup();const frozen=ORIGINAL_CARD_BLUEPRINTS.haku_yuyuko,original=JSON.stringify(frozen),live={...CARD.haku_yuyuko};
  ok(Object.isFrozen(ORIGINAL_CARD_BLUEPRINTS)&&Object.isFrozen(frozen),'Original definitions and their index are immutable');
  ok(frozen!==CARD.haku_yuyuko,'The blueprint is independent of the live card definition');
  try{
    Object.assign(CARD.haku_yuyuko,{name:'Altered',desc:'Placed: Draw a card.',faction:'hell'});
    const copy=await game.createCard(0,['haku_yuyuko']);
    ok(CARD[copy].name===live.name+'?'&&CARD[copy].desc===live.desc&&CARD[copy].faction===live.faction,'Creation uses original name, faction and description despite altered live fields');
    ok(JSON.stringify(frozen)===original,'Changing live fields cannot rewrite the saved blueprint');
  }finally{Object.assign(CARD.haku_yuyuko,live);}

  for(const base of ['haku_yuyuko','temple_nue','mtn_sanae','hourai_eirin','hell_hecatia']){
    for(const double of [false,true]){
      setup();const source=legacy(base,{ability:'__draw_one',cost:5,double:true});hold(0,[source]);
      game.permanentAbilities[source]='__draw_one';game.borrowedAbilities[source]='sdm_sakuya';
      const before=JSON.stringify(CARD[source]),created=await game.createCard(0,[source],{double});
      ok(created!==source&&game.players[0].hand.includes(source)&&game.players[0].hand.includes(created),'Creation preserves its independent source: '+base+'/'+double);
      ok(game.abilityId(created)===base&&CARD[created].copiedAbility===base,'Overwrite and borrowed abilities are not inherited: '+base+'/'+double);
      ok(CARD[created].costBonus===1&&CARD[created].abilityMultiplier===(double?2:1),'Only this creation supplies its one surcharge and optional double effect: '+base+'/'+double);
      ok(JSON.stringify(CARD[source])===before&&game.permanentAbilities[source]==='__draw_one'&&game.borrowedAbilities[source]==='sdm_sakuya','Existing source modifications remain intact: '+base+'/'+double);
    }
  }

  setup();const alias1=legacy('mtn_sanae'),alias2=legacy('mtn_sanae',{cost:4,double:true});
  const self=legacy('sage_matara'),trap=game.makeTrap();let offered;
  const pool=creationBlueprintIds(['mtn_sanae',alias1,alias2,'sage_matara',self,trap,'trap_token','shop_rinnosuke','missing'], 'sage_matara');
  ok(JSON.stringify(pool)==='["mtn_sanae"]','Pool deduplicates original types, excludes every self alias and rejects non-card sources');
  game.ui.pickAbilityCards=async(t,ids,o)=>{offered=ids;assert(o.createdPreview===true);return ids[0];};
  const canonical=await game.createCard(0,[alias1,alias2,'mtn_sanae']);
  ok(offered.length===1&&offered[0]==='mtn_sanae'&&CARD[canonical].baseId==='mtn_sanae','Human offers use canonical original IDs');
  game.ui.pickAbilityCards=async()=>alias1;
  ok(await game.createCard(0,[alias1])===null,'Returning a non-offered source instance is rejected');
  game.ui.pickAbilityCards=async()=>null;
  ok(await game.createCard(0,['mtn_sanae'])===null,'Cancelling creation adds no card');
  const eirinAlias=legacy('hourai_eirin');
  ok(creationBlueprintIds(['hourai_eirin',eirinAlias],'hourai_eirin').length===0,'Eirin still excludes all versions of herself');
  ok(creationBlueprintIds(['sdm_meiling','hourai_tewi','mtn_nitori']).length===3,'Fifth faction cards remain eligible original types');

  setup();put('sage_matara',1,1);put('haku_yuyuko',3,3);put('mtn_sanae',3,2);put('sdm_meiling',0,0);
  game.permanentAbilities.haku_yuyuko='__draw_one';game.ui.pickAbilityCards=async(t,ids)=>{assert(ids.includes('haku_yuyuko'));return 'haku_yuyuko';};
  await game.resolveAbility('sage_matara',1,1,0,0);
  let created=[...game.startingCardIds].find(id=>CARD[id]?.createdCopy);
  ok(CARD[created].baseId==='haku_yuyuko'&&game.abilityId(created)==='haku_yuyuko'&&CARD[created].abilityMultiplier===1,'Real Matara creates ordinary original Yuyuko rather than Overwrite');
  ok(game.isOnBoard(created)&&game.isOnBoard('haku_yuyuko')&&game.abilityId('haku_yuyuko')==='__draw_one','Matara immediately plays the new card and leaves the altered source intact');

  setup();put('hourai_eirin',1,1);game.permanentAbilities.hourai_reisen='__draw_one';
  game.ui.pickAbilityCards=async(t,ids)=>{assert(ids.includes('hourai_reisen')&&!ids.includes('hourai_eirin'));return 'hourai_reisen';};
  await game.resolveAbility('hourai_eirin',1,1,0,0);created=game.players[0].hand[0];
  ok(CARD[created].baseId==='hourai_reisen'&&game.abilityId(created)==='hourai_reisen'&&CARD[created].abilityMultiplier===2&&CARD[created].costBonus===1,'Real Eirin doubles original Reisen and keeps the copy in hand');

  setup();put('temple_nue',3,3);game.borrowedAbilities.temple_nue='hell_komachi';
  created=await game.createCard(0,['temple_nue']);hold(0,['sdm_sakuya']);
  let seed=0;
  for(;seed<10000;seed++){evalSetSeed(seed);if(shuffle(CARDS.filter(c=>!c.token&&!c.shopkeeper&&c.id!=='temple_nue'&&c.id!==created).map(c=>c.id)).slice(0,3).includes('sage_ran'))break;}
  assert(seed<10000);evalSetSeed(seed);let borrowed=0;game.chooseChimeraAbility=async(p,ids)=>{assert(ids.includes('sage_ran'));borrowed++;return 'sage_ran';};
  game.removeFromHand(0,created);put(created,0,0);await game.resolveAbility(created,0,0,0,0);
  ok(borrowed===1&&game.borrowedAbilities[created]==='sage_ran'&&game.players[0].hand.includes('sdm_sakuya'),'Created Nue makes her own fresh skill choice and resolves it');
  ok(game.borrowedAbilities.temple_nue==='hell_komachi'&&game.testSeatMetrics(0).diagnostics.costCards===1,'Nue creation preserves the old choice and pays only its own surcharge');

  setup();const modified=legacy('palace_satori',{ability:'__draw_one',cost:4,double:true});hold(0,[modified]);
  created=await game.createCard(0,[modified],{double:true});game.removeFromHand(0,created);put(created,1,1);
  hold(0,['sdm_sakuya','sdm_meiling']);hold(1,['mtn_sanae','hourai_mokou']);game.choosePlayer=async()=>1;
  await game.resolveAbility(created,1,1,0,0);
  ok(game.players[1].hand.length===0&&game.testSeatMetrics(0).diagnostics.costCards===2,'Recreated Satori pays original Cost I plus one, once, for both effects');
  setup();const oldYuyuko=legacy('haku_yuyuko',{ability:'__draw_one',cost:4});created=await game.createCard(0,[oldYuyuko]);put(created,1,1);
  put('sdm_meiling',1,0);put('hourai_tewi',1,2);hold(0,['mtn_sanae','hourai_mokou','sdm_sakuya']);
  await game.resolveAbility(created,1,1,0,0);
  ok(game.players[0].discard.length===2&&game.testSeatMetrics(0).diagnostics.costCards===3,'Recreated Yuyuko uses original variable Cost N=2 plus one surcharge');

  setup();put('palace_rin',1,1);created=await game.createCard(0,['haku_yuyuko']);game.removeFromHand(0,created);game.players[1].discard=[created];
  game.chooseFromList=async(p,entries)=>entries[0].value;await game.resolveAbility('palace_rin',1,1,0,0);
  ok(game.abilityId(created)==='__draw_one'&&game.players[0].hand.includes(created),'A new created card can still be overwritten later in the match');
  const fresh=await game.createCard(0,[created]);
  ok(game.abilityId(fresh)==='haku_yuyuko'&&game.abilityId(created)==='__draw_one','Creating from that overwritten copy resets only the new card to its original skill');

  setup();put('haku_youmu',0,0);const aiSource=legacy('haku_yuyuko',{ability:'__draw_one',cost:4,double:true});
  game.permanentAbilities.haku_yuyuko='__draw_one';game.borrowedAbilities[aiSource]='hell_komachi';
  hold(0,['mtn_sanae','hourai_mokou','sdm_meiling','hourai_tewi']);game.players[0].isAI=true;
  const state=JSON.stringify(captureAIEvaluationSnapshot(game)),metrics=JSON.stringify(game.testMetrics),definitions=JSON.stringify(CARD),hand=game.players[0].hand,board=game.board;
  const rng=Math.random;Math.random=()=>{throw Error('Creation previews must not consume RNG');};
  try{
    for(const options of [{},{double:true},{immediate:true},{immediate:true,double:true}]){
      ok(aiCreatedValue(0,'haku_yuyuko',options)===aiCreatedValue(0,aiSource,options),'AI values aliases from the same original blueprint: '+JSON.stringify(options));
      ok(JSON.stringify(aiCreatedPlacementInfo(0,'haku_yuyuko',options))===JSON.stringify(aiCreatedPlacementInfo(0,aiSource,options)),'AI placement forecasts ignore altered source abilities: '+JSON.stringify(options));
    }
  }finally{Math.random=rng;}
  ok(JSON.stringify(captureAIEvaluationSnapshot(game))===state&&JSON.stringify(game.testMetrics)===metrics&&JSON.stringify(CARD)===definitions&&game.players[0].hand===hand&&game.board===board,'AI previews restore definitions, board, hand, state and statistics');
  game.borrowedAbilities={};hold(0,[aiSource]);put('sdm_remilia',1,1);
  const newPlan=aiCreatedPlacementInfo(0,aiSource),oldPlan=aiCreatedPlacementInfo(0,aiSource,{alreadyCopy:true});
  ok(newPlan.points===0&&oldPlan.points===2,'A future original Yuyuko forecast differs from the existing overwritten copy forecast: '+JSON.stringify({newPlan,oldPlan}));
  const forecasts=[],raw=aiCreatedValue;aiCreatedValue=(p,id)=>{forecasts.push(id);return raw(p,id);};
  try{created=await game.createCard(0,[aiSource,'haku_yuyuko']);}finally{aiCreatedValue=raw;}
  ok(CARD[created].baseId==='haku_yuyuko'&&CARD[created].costBonus===1&&forecasts.every(id=>id==='haku_yuyuko'),'AI confirms the same canonical creation as humans');

  setup();put('sage_matara',1,1);put('mtn_sanae',0,0);put('hourai_mokou',3,3);put('hell_clownpiece',3,0);
  hold(0,['sdm_sakuya','sdm_meiling']);game.players[0].isAI=true;
  const beforePlan=aiMataraCreationPlan(0,'sage_matara',{r:1,c:1}),duplicate=legacy('mtn_sanae',{ability:'__draw_one',cost:5,double:true});
  put(duplicate,0,1);const afterPlan=aiMataraCreationPlan(0,'sage_matara',{r:1,c:1});
  ok(beforePlan.points===afterPlan.points&&beforePlan.source===afterPlan.source,'Duplicate copies do not weight Matara’s three-offer guarantee toward a repeated character');

  setup();const saved=legacy('haku_yuyuko',{ability:'__draw_one',cost:3,double:true});hold(0,[saved]);game.permanentAbilities[saved]='__draw_one';
  game.beginPlayerTurn(0);const snapshot=captureAIEvaluationSnapshot(game);snapshot.rulesVersion='2026-10-14-guided-final-match-v11';
  evalRestore(snapshot,['current','current','current']);
  ok(game.players[0].hand.includes(saved)&&game.abilityId(saved)==='__draw_one'&&CARD[saved].costBonus===3&&CARD[saved].abilityMultiplier===2,'A v11 save retains its existing overwritten double card and accumulated surcharge');
  created=await game.createCard(0,[saved]);
  ok(game.abilityId(created)==='haku_yuyuko'&&CARD[created].costBonus===1&&CARD[created].abilityMultiplier===1,'New creation from a restored old copy obeys the original blueprint rule');
  ok(evalValidateSnapshot(captureAIEvaluationSnapshot(game)).rulesVersion===REWORK_RULES_VERSION,'The restored and newly created cards conserve a valid unique inventory');
  return {status:'pass',count:checks.length,checks,rulesVersion:REWORK_RULES_VERSION,scope:'Actual original blueprints, altered sources, creations, payments, deterministic AI previews and v11 save compatibility'};
})()`,ctx).then(result=>{fs.writeFileSync(root+'/tests/original-creation-blueprints-2026-10-14-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' original-creation checks passed');}).catch(error=>{console.error(error.stack);process.exitCode=1;});
