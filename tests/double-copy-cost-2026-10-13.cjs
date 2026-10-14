// Execute the shipped rules and worker with real payments and exact card accounting.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'touhou_board_game_github_textures.html'),'utf8');
const builder=vm.createContext({});vm.runInContext(html.slice(html.indexOf('function buildAIEvaluationWorkerSource'),html.indexOf('\nfunction evalHashSeed')),builder);builder.src=html;
const ctx=vm.createContext({console,setTimeout,clearTimeout,self:{},assert});vm.runInContext(vm.runInContext('buildAIEvaluationWorkerSource(src)',builder),ctx);
vm.runInContext(`(async()=>{
const checks=[],check=(name,ok)=>{assert(ok,name);checks.push(name);};
function setup(){evalResetTokens();SIZE=4;game=new Game(3,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard'});game.currentPlayerIdx=0;
  game.players.forEach(p=>{p.hand=[];p.discard=[];p.isAI=false;});game.board=Array.from({length:4},()=>Array(4).fill(null));game.drawPile=[];game.shopCards=[];game.startingCardIds=new Set();
  game.ui={pickOwnHandCards:async(t,ids,o)=>ids.slice(0,o.maxCount),pickHandCard:async(t,ids)=>ids[0],pickCell:async(t,cells)=>cells[0]};
  game.pickUI=async(p,method,args)=>game.ui[method](...args);game.choosePlayer=async()=>1;game.render=()=>{};return game;
}
function put(id,r,c){game.setCardAt(r,c,id);game.startingCardIds.add(id);}
function hold(p,ids){game.players[p].hand.push(...ids);ids.forEach(id=>game.startingCardIds.add(id));}
function copy(base){const id='created_card_'+(++nextCreatedCard);CARD[id]=blueprintCopy(base,id,game.abilityId(base),2);game.startingCardIds.add(id);return id;}
function paid(){return game.testSeatMetrics(0).diagnostics.costCards;}
setup();let id=copy('sage_ran');put(id,1,1);hold(0,['sdm_sakuya']);game.drawPile=['mtn_sanae','hourai_mokou'];await game.resolveAbility(id,1,1,0,0);
check('A double draw pays the creation surcharge once',paid()===1);check('One payment still gives both draws',game.testCardActions(id).handGained===2);
setup();id=copy('palace_satori');put(id,1,1);hold(0,['sdm_sakuya','sdm_meiling']);hold(1,['mtn_sanae','hourai_mokou']);await game.resolveAbility(id,1,1,0,0);
check('Double Cost I pays Cost II once, including the creation surcharge',paid()===2&&game.testSeatMetrics(0).diagnostics.costEvents===1);
check('The second Satori effect still works after spending the payment cards',game.players[1].hand.length===0&&game.players[0].hand.length===2);
setup();id=copy('haku_yuyuko');put(id,1,1);[['sdm_meiling',0,1],['hourai_tewi',1,0],['mtn_suwako',1,2],['palace_rin',2,1]].forEach(x=>put(...x));hold(0,['sdm_sakuya','mtn_sanae','hourai_mokou']);await game.resolveAbility(id,1,1,0,0);
check('Variable Cost N=2 plus one surcharge is paid once',paid()===3&&game.testSeatMetrics(0).diagnostics.costEvents===1);
check('Double Yuyuko reuses N=2 with no payment cards left',game.players[0].discard.length===4&&game.players[0].hand.length===0);
setup();id=copy('palace_satori');put(id,1,1);hold(0,['sdm_sakuya','sdm_meiling']);hold(1,['mtn_sanae','hourai_mokou']);let prompts=0;game.ui.pickOwnHandCards=async()=>{prompts++;return null;};await game.resolveAbility(id,1,1,0,0);
check('Declining the first cost cannot grant a free second effect',paid()===0&&game.players[1].hand.length===2&&prompts===1);
setup();id=copy('hell_hecatia');hold(0,['sdm_sakuya']);await game.internalPlace(id,1,1,0,0);
check('Double passive activation needs only one surcharge card',paid()===1&&game.createdActivations[id]===true&&game.pointValue(id)===6);
setup();id=copy('sage_yukari');put('mtn_sanae',1,1);hold(0,[id,'sdm_sakuya']);check('Double Yukari can override with a single surcharge available',game.canOverrideTarget(id,'mtn_sanae'));game.removeFromHand(0,id);await game.internalPlace(id,1,1,0,0);
check('The actual override pays once and returns its target to hand',paid()===1&&game.cardAt(1,1)===id&&game.players[0].hand.includes('mtn_sanae'));
setup();id=copy('palace_koishi');hold(0,[id,'sdm_sakuya']);put('palace_satori',0,0);put('palace_rin',1,0);put('palace_utsuho',2,0);await game.resolveKoishiCascade(0);
check('Double Koishi automatic activation also pays once',paid()===1&&!game.players[0].hand.includes(id));
setup();id=copy('temple_byakuren');put(id,1,1);put('temple_nue',0,0);put('temple_murasa',0,1);put('temple_ichirin',0,2);hold(0,['sdm_sakuya','sdm_meiling','mtn_sanae','hourai_mokou']);let plan=['turns','return',null],modePrompts=0;game.ui.pickFromList=async()=>{modePrompts++;return plan.shift()??null;};game.chooseCells=async(p,n,cells)=>cells.filter(x=>CARD[x.id].faction==='temple').slice(0,n);const flags=await game.resolveAbility(id,1,1,0,0);
check('Byakuren charges each chosen option once even after board discounts disappear',paid()===3&&game.testSeatMetrics(0).diagnostics.costEvents===2);
check('Paid Byakuren turns double while unselected options stay unavailable',flags.extraTurns===6&&game.players[0].hand.length===1&&modePrompts===2);
setup();id=copy('temple_byakuren');put(id,1,1);hold(0,['sdm_sakuya','sdm_meiling','hourai_mokou']);game.drawPile=['mtn_sanae','mtn_suwako','mtn_aya'];game.ui.pickFromList=async()=> 'look';await game.resolveAbility(id,1,1,0,0);
check('Double Byakuren look pays only its original discounted cost plus surcharge',paid()===3&&game.players[0].hand.length===2);
setup();id=copy('temple_nue');put(id,1,1);hold(0,['sdm_sakuya','sdm_meiling']);hold(1,['mtn_sanae','hourai_mokou']);let seed=0;
for(;seed<10000;seed++){evalSetSeed(seed);const options=shuffle(CARDS.filter(card=>!card.token&&!card.shopkeeper&&card.id!=='temple_nue'&&card.id!==id).map(card=>card.id)).slice(0,3);if(options.includes('palace_satori'))break;}
assert(seed<10000);evalSetSeed(seed);let chimeraPrompts=0;game.chooseChimeraAbility=async(p,ids)=>{chimeraPrompts++;assert(ids.includes('palace_satori'));return 'palace_satori';};await game.resolveAbility(id,1,1,0,0);
check('Double Nue repeats its chosen borrowed ability and pays its costs once',chimeraPrompts===1&&paid()===2&&game.players[1].hand.length===0);
setup();id=copy('palace_satori');put(id,1,1);hold(0,['sdm_sakuya','sdm_meiling']);hold(1,['mtn_sanae','hourai_mokou']);game.players[0].isAI=true;game.chooseHandCard=async()=>game.players[1].hand[0];game.selectCostCards=async(p,min,max)=>game.payableCards(p).slice(0,max);await game.resolveAbility(id,1,1,0,0);
check('AI repeats an already-paid effect without rejecting it for a second payment',paid()===2&&game.players[1].hand.length===0);
check('Activation payment state is restored after resolution',game.ruleContext===null&&game.activeRuleAbility===null);
setup();id=copy('mtn_sanae');check('A created card has one question mark',CARD[id].name===CARD.mtn_sanae.name+'?');const second=blueprintCopy(id,'created_card_900','mtn_sanae',2);check('Copying a copy keeps one question mark and one new surcharge',second.name===CARD.mtn_sanae.name+'?'&&second.costBonus===1);
hold(0,[id]);game.beginPlayerTurn(0);const snapshot=captureAIEvaluationSnapshot(game);evalRestore(snapshot,['current','current','current']);check('Restoring a snapshot preserves the copy name and stable identity',CARD[id].name===CARD.mtn_sanae.name+'?'&&testCardId(id)==='mtn_sanae');
const legacy=JSON.parse(JSON.stringify(snapshot));legacy.rulesVersion='2026-10-12-random-start-restored-ai-v4';legacy.generatedCards[0].name=CARD.mtn_sanae.name;evalRestore(legacy,['current','current','current']);check('Compatible v4 turn-start snapshots restore safely under the current copy rules',CARD[id].name===CARD.mtn_sanae.name+'?'&&game.players[0].hand.includes(id));
setup();id=copy('mtn_sanae');hold(1,[id]);game.ui.promptText=async()=>CARD.mtn_sanae.name;check('The visual question mark does not prevent guessing a copy by its original character name',await game.guessCardName(0,[id],'guess')===id);game.ui.promptText=async()=>CARD[id].name;check('A copied card can also be guessed with its question-mark name',await game.guessCardName(0,[id],'guess')===id);
return {status:'pass',count:checks.length,checks};
})()`,ctx).then(result=>{fs.writeFileSync(path.join(root,'tests/double-copy-cost-2026-10-13-results.json'),JSON.stringify(result,null,2)+'\n');console.log(result);}).catch(error=>{console.error(error.stack);process.exitCode=1;});
