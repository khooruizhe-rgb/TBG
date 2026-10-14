const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
const builder=vm.createContext({});
vm.runInContext(html.slice(html.indexOf('function buildAIEvaluationWorkerSource'),html.indexOf('\nfunction evalHashSeed')),builder);builder.html=html;
const ctx=vm.createContext({console,setTimeout,clearTimeout,self:{},assert});
vm.runInContext(vm.runInContext('buildAIEvaluationWorkerSource(html)',builder),ctx);
vm.runInContext(`(async()=>{
  const checks=[],details={};const ok=(value,name)=>{assert(value,name);checks.push(name);console.log('PASS '+name);};
  let trace=[],landing={r:1,c:1};
  function setup({ai=false,size=4,shop=true}={}){
    evalResetTokens();SIZE=size;game=new Game(3,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard',kourindouEnabled:shop});
    game.currentPlayerIdx=0;game.board=Array.from({length:size},()=>Array(size).fill(null));game.shopCards=[];game.drawPile=[];
    game.players.forEach(p=>{p.hand=[];p.discard=[];p.isAI=ai;});game.startingCardIds=new Set(CARDS.map(c=>c.id));game.aiMakesMistake=()=>false;game.render=()=>{};
    trace=[];landing={r:1,c:1};
    game.ui={pickCell:async(_title,cells)=>{ok(cells.some(cell=>cell.r===landing.r&&cell.c===landing.c),'Koishi chooser receives the current legal landing '+landing.r+','+landing.c);return {...landing};},
      pickOwnHandCards:async(_title,ids,options)=>ids.slice(0,options.minCount),
      onFactionClaim:({playerIdx,faction,count})=>trace.push({kind:'claim',playerIdx,faction,count}),
      onKoishiSelfPlace:({playerIdx})=>trace.push({kind:'enter',playerIdx}),
      onCostPaid:({playerIdx,count})=>trace.push({kind:'cost',playerIdx,count})};
    game.pickUI=async(_p,method,args)=>game.ui[method](...args);return game;
  }
  const put=(id,r,c)=>game.setCardAt(r,c,id),hold=(p,ids)=>game.players[p].hand=ids;
  const points=p=>game.winCount(game.players[p]);
  const claims=()=>trace.filter(item=>item.kind==='claim');
  function palace(){put('palace_satori',0,0);put('palace_rin',0,1);put('palace_utsuho',1,0);}
  function scarlet(){put('sdm_remilia',2,0);put('sdm_flandre',2,1);put('sdm_sakuya',3,0);game.permanentAbilities.sdm_patchouli='__draw_one';hold(0,['sdm_patchouli']);}
  async function placeActor(id,r,c,p=0){game.removeFromHand(p,id);return await game.internalPlace(id,r,c,p,0);}
  function copyKoishi(){const id='created_card_'+(++nextCreatedCard);CARD[id]=blueprintCopy('palace_koishi',id,'palace_koishi');game.startingCardIds.add(id);return id;}

  setup();palace();scarlet();hold(1,['palace_koishi']);landing={r:3,c:3};
  await placeActor('sdm_patchouli',3,1);
  ok(points(0)===4&&points(1)===0,'Only the actor scores when her placement claims and Koishi’s landing does not');
  ok(claims().length===1&&claims()[0].playerIdx===0&&claims()[0].faction==='sdm','The actor’s claim is not reassigned to Koishi’s holder');
  ok(trace.findIndex(item=>item.kind==='claim')<trace.findIndex(item=>item.kind==='enter'),'The actor’s claim completes before Koishi’s presentation');
  details.actorOnly={scores:[points(0),points(1)],trace:trace.slice()};

  setup();put('palace_satori',0,0);put('palace_rin',0,1);hold(0,['sage_kasen']);hold(1,['palace_koishi']);landing={r:1,c:1};
  await placeActor('sage_kasen',1,0);
  ok(points(0)===0&&points(1)===4,'Only Koishi’s holder scores when Kasen alone cannot claim');
  ok(claims().length===1&&claims()[0].playerIdx===1,'The new Palace claim belongs to Koishi’s holder');
  ok(game.testSeatMetrics(1).claims.palace===1&&!game.testSeatMetrics(0).claims.palace,'Claim counters identify the actual scoring player');
  details.koishiOnly={scores:[points(0),points(1)],trace:trace.slice()};

  setup();palace();scarlet();hold(1,['palace_koishi']);landing={r:1,c:1};
  await placeActor('sdm_patchouli',3,1);
  ok(points(0)===4&&points(1)===4,'Separate actor and Koishi claims each award their own four points');
  ok(claims().length===2&&claims()[0].playerIdx===0&&claims()[0].faction==='sdm'&&claims()[1].playerIdx===1&&claims()[1].faction==='palace','Both scoring batches settle actor first and Koishi’s holder second');
  ok(game.players[0].discard.every(id=>CARD[id].faction==='sdm')&&game.players[1].discard.every(id=>CARD[id].faction==='palace'),'Claimed cards are separated between the correct discard piles');
  ok(game.testSeatMetrics(0).scoreSources['faction:sdm'].points===4&&game.testSeatMetrics(1).scoreSources['faction:palace'].points===4,'Score-source measurements reconcile both batches');
  details.both={scores:[points(0),points(1)],trace:trace.slice()};

  setup();put('palace_satori',0,0);put('palace_rin',0,1);put('sage_yukari',2,1);put('sage_matara',2,2);put('sage_ran',1,2);
  hold(0,['sage_kasen']);hold(1,['palace_koishi']);landing={r:1,c:1};
  await placeActor('sage_kasen',1,1);
  ok(points(0)===4&&points(1)===0&&game.players[0].discard.includes('sage_kasen'),'The actor collects shared Kasen before Koishi can use her as a Palace member');
  ok(game.isOnBoard('palace_koishi')&&!game.players[1].hand.includes('palace_koishi'),'A trigger latched before Kasen’s collection still places Koishi');
  ok(game.cardAt(1,1)==='palace_koishi','Koishi can use the legal cell newly freed by the actor’s claim');
  ok(game.factionCells('palace').length===3&&!game.findFactionClaim('palace').length,'Koishi rechecks the remaining board rather than claiming a stale four-card group');
  ok(claims().length===1&&claims()[0].faction==='sage','A shared card is neither claimed twice nor transferred between winners');

  setup();palace();scarlet();hold(1,['palace_koishi']);game.players[0].discard=['mtn_sanae','hourai_mokou','temple_shou'];landing={r:1,c:1};
  await placeActor('sdm_patchouli',3,1);
  ok(game.winner===game.players[0]&&points(0)===7,'An actor who reaches seven in the first batch wins before Koishi’s batch');
  ok(game.players[1].hand.includes('palace_koishi')&&!game.isOnBoard('palace_koishi')&&!trace.some(item=>item.kind==='enter'),'A finished game does not consume or animate the pending Koishi');
  setup();palace();scarlet();hold(1,['palace_koishi']);game.players[1].discard=['mtn_sanae','hourai_mokou','temple_shou'];landing={r:1,c:1};
  await placeActor('sdm_patchouli',3,1);
  ok(points(0)===4&&points(1)===7&&game.winner===game.players[1],'Koishi’s holder can win in the second batch after the actor scores');

  setup();palace();scarlet();const paid=copyKoishi();hold(1,[paid,'hourai_tewi']);landing={r:1,c:1};
  await placeActor('sdm_patchouli',3,1);
  ok(points(0)===4&&points(1)===4&&game.testSeatMetrics(1).diagnostics.costCards===1,'A copied Koishi’s holder pays once and receives the second claim');
  ok(trace.findIndex(item=>item.kind==='claim'&&item.playerIdx===0)<trace.findIndex(item=>item.kind==='cost'),'The actor’s batch settles before the copied Koishi pays her surcharge');
  ok(game.testSeatMetrics(1).abilityDetails['palace_koishi:palace_koishi'].costPaid===1,'Koishi’s payment is recorded against her holder and ability');
  setup();palace();scarlet();const unpaid=copyKoishi();hold(1,[unpaid]);landing={r:1,c:1};
  await placeActor('sdm_patchouli',3,1);
  ok(points(0)===4&&points(1)===0&&game.players[1].hand.includes(unpaid)&&!game.isOnBoard(unpaid),'Unpaid Koishi stays in hand after the actor’s already completed claim');

  setup();palace();put('sdm_remilia',0,2);put('sdm_flandre',0,3);put('sdm_sakuya',1,2);hold(0,['sdm_patchouli']);
  // Fill every other tile; the actor's claim must supply Koishi's landing.
  const filler=['hourai_eirin','hourai_mokou','hourai_tewi','mtn_aya','mtn_sanae','mtn_suwako','temple_shou','temple_nue','hell_clownpiece'];
  const reserved={r:1,c:3};let index=0;
  for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(!game.cardAt(r,c)&&!(r===reserved.r&&c===reserved.c))put(filler[index++],r,c);
  game.permanentAbilities.sdm_patchouli='__draw_one';hold(1,['palace_koishi']);landing={r:0,c:2};
  await placeActor('sdm_patchouli',reserved.r,reserved.c);
  ok(points(0)===4&&points(1)===4,'An actor’s claim opens a previously full board for Koishi’s scoring placement');
  ok(game.testSeatMetrics(1).placements.palace_koishi===1,'Newly freed cells are refreshed rather than using the full-board pre-claim list');

  setup();palace();put('sdm_remilia',2,0);put('sdm_flandre',2,1);put('sdm_sakuya',3,0);game.permanentAbilities.sdm_patchouli='__draw_one';hold(1,['sdm_patchouli']);hold(2,['palace_koishi']);landing={r:1,c:1};
  await placeActor('sdm_patchouli',3,1,1);
  ok(game.currentPlayerIdx===0&&points(1)===4&&points(2)===4&&points(0)===0,'An explicit nested actor and a third-seat Koishi receive separate batches');
  ok(claims()[0].playerIdx===1&&claims()[1].playerIdx===2,'Batch order is independent of the global current-turn index');

  setup();palace();hold(0,['hourai_mokou']);game.drawPile=['palace_koishi'];landing={r:1,c:1};
  await placeActor('hourai_mokou',3,3);
  ok(points(0)===0&&game.players[0].hand.length===0,'Mokou with no discard gains no Koishi and creates no phantom claim');
  setup();palace();hold(0,['mtn_sanae']);game.drawPile=['palace_koishi'];landing={r:1,c:1};
  await placeActor('mtn_sanae',3,3);
  ok(points(0)===4&&game.testSeatMetrics(0).placements.palace_koishi===1,'Koishi drawn during the placed ability enters and scores after that ability completes');
  setup();palace();hold(1,['palace_koishi']);landing={r:1,c:1};await game.resolveKoishiCascade(0,0);
  ok(points(0)===0&&points(1)===4,'A hand-gaining action with no actor claim still awards Koishi’s new claim to her holder');

  setup();palace();scarlet();hold(1,['palace_koishi']);game.placementBlockedForTurn[1]=true;
  await placeActor('sdm_patchouli',3,1);
  ok(points(0)===4&&game.players[1].hand.includes('palace_koishi'),'A blocked holder does not delay the actor’s batch or place Koishi illegally');
  setup();palace();scarlet();hold(1,['palace_koishi']);game.permanentAbilities.palace_koishi='__draw_one';
  await placeActor('sdm_patchouli',3,1);ok(points(0)===4&&game.players[1].hand.includes('palace_koishi'),'Rin-overwritten Koishi no longer auto-enters');
  setup();palace();scarlet();hold(1,['palace_koishi']);game.ui.pickCell=async()=>null;
  await placeActor('sdm_patchouli',3,1);ok(points(0)===4&&game.players[1].hand.includes('palace_koishi'),'A cancelled landing returns Koishi without undoing or duplicating the actor’s claim');

  for(const shop of [false,true])for(const difficulty of ['easy','normal','hard']){
    setup({ai:true,shop});game.aiDifficulty=difficulty;palace();scarlet();hold(1,['palace_koishi']);
    await placeActor('sdm_patchouli',3,1);
    ok(points(0)===4&&points(1)===4&&claims()[0].playerIdx===0&&claims()[1].playerIdx===1,'The real AI Koishi chooses against the post-actor board at '+difficulty+', shop '+shop);
  }
  setup({ai:true});hold(0,['sage_kasen']);put('palace_satori',0,0);put('palace_rin',0,1);
  hold(1,['palace_koishi']);const before=JSON.stringify(captureAIEvaluationSnapshot(game));
  const first=aiEvaluateCard(0,'sage_kasen');hold(1,['mtn_aya']);const second=aiEvaluateCard(0,'sage_kasen');
  ok(first?.immediatePoints===0&&second?.immediatePoints===0&&JSON.stringify(first)===JSON.stringify(second),'The actor’s AI neither credits the opponent’s Koishi points nor reads that hidden identity');
  hold(1,['palace_koishi']);ok(JSON.stringify(captureAIEvaluationSnapshot(game))===before,'The scoring preview restores hands, board, counters and private knowledge');

  setup();const saved=copyKoishi();hold(1,[saved,'mtn_sanae']);palace();
  game.startingCardIds=new Set([...game.board.flat(),...game.players.flatMap(p=>[...p.hand,...p.discard]),...game.drawPile].filter(Boolean));
  const snapshot=captureAIEvaluationSnapshot(game);snapshot.rulesVersion='2026-10-13-swapped-creators-claim-owner-v7';
  evalRestore(snapshot,['current','current','current']);await game.resolveKoishiCascade(0,0);
  ok(points(0)===0&&points(1)===4&&CARD[saved].createdCopy,'A regular v7 snapshot restores into the staged owner-claim rules without losing its copy');
  return {status:'pass',count:checks.length,checks,details,rulesVersion:REWORK_RULES_VERSION,scope:'Actual actor/entrant placement and claims, shared Kasen, costs, ordering, AI information boundary and v7 restore'};
})()`,ctx).then(result=>{fs.writeFileSync(__dirname+'/koishi-claim-order-2026-10-14-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' Koishi staged-claim checks passed');}).catch(error=>{console.error(error.stack);process.exitCode=1;});
