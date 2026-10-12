const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
const builder=vm.createContext({});
vm.runInContext(html.slice(html.indexOf('function buildAIEvaluationWorkerSource'),html.indexOf('\nfunction evalHashSeed')),builder);
builder.html=html;
const ctx=vm.createContext({console,setTimeout,clearTimeout,self:{},assert});
vm.runInContext(vm.runInContext('buildAIEvaluationWorkerSource(html)',builder),ctx);
vm.runInContext(`(async()=>{
  const checks=[],details={};
  function ok(value,name){assert(value,name);checks.push(name);console.log('PASS '+name);}
  function setup(difficulty='hard'){
    evalResetTokens();SIZE=4;game=new Game(3,{},null,{aiOnly:true,fastTest:true,aiDifficulty:difficulty});
    game.currentPlayerIdx=0;game.board=Array.from({length:4},()=>Array(4).fill(null));
    game.shopCards=[];game.drawPile=[];game.startingCardIds=new Set();game.render=()=>{};
    game.players.forEach(p=>{p.hand=[];p.discard=[];p.isAI=true;});return game;
  }
  function hold(p,ids){game.players[p].hand=ids;ids.forEach(id=>game.startingCardIds.add(id));}
  function put(id,r,c){game.setCardAt(r,c,id);game.startingCardIds.add(id);}
  function spaces(p,id){return game.emptyOrWastelandForCard(CARD[id],p);}
  for(const difficulty of ['easy','normal','hard']){
    setup(difficulty);hold(0,['sage_yukari']);game.drawPile=['mtn_sanae'];game.startingCardIds.add('mtn_sanae');
    ok(aiEvaluateCard(0,'sage_yukari')===null,'Yukari cannot deploy without override or points at '+difficulty);
    ok((await aiDecideAction(0,false)).type==='draw','Yukari stays held while drawing at '+difficulty);
    game.drawPile=[];
    ok((await aiDecideAction(0,false)).type!=='place','An empty draw pile does not bypass the Yukari guard at '+difficulty);
  }
  setup();hold(0,['sage_yukari']);put('mtn_sanae',1,1);
  const occupied=aiPlacementCells(game,'sage_yukari',spaces(0,'sage_yukari'),0);
  ok(occupied.length===1&&occupied[0].r===1&&occupied[0].c===1,'Yukari retains a legal override and rejects other empty cells');
  const override=aiEvaluateCard(0,'sage_yukari');ok(override.cell.r===1&&override.cell.c===1,'Ordinary action evaluation selects the override');
  setup();hold(0,['sage_yukari']);put('sage_matara',0,0);put('sage_ran',0,1);put('sage_mai_satono',1,0);
  const claim=aiEvaluateCard(0,'sage_yukari');ok(claim?.claimsNow&&!game.cardAt(claim.cell.r,claim.cell.c),'Yukari may use an empty cell that immediately scores a faction');
  const claimMatch=game;await doPlayerAction(0);
  ok(claimMatch.winCount(claimMatch.players[0])===4,'The allowed empty-cell Yukari placement actually scores four points');
  setup();hold(0,['sage_yukari']);game.permanentAbilities.sage_yukari='__draw_one';game.drawPile=['mtn_sanae'];
  ok(aiPlacementCells(game,'sage_yukari',spaces(0,'sage_yukari'),0).length===16,'Rin-overwritten Yukari follows its draw ability rather than the override restriction');
  setup();const yukariCopy='created_card_'+(++nextCreatedCard);CARD[yukariCopy]=blueprintCopy('sage_yukari',yukariCopy,'sage_yukari');hold(0,[yukariCopy]);
  ok(!aiPlacementCells(game,yukariCopy,spaces(0,yukariCopy),0).length,'Created Yukari uses the same no-empty-deployment rule');
  setup();hold(0,['sage_yukari']);put('hourai_eirin',1,1);
  ok(aiEvaluateCard(0,'sage_yukari')===null,'Eirin muting does not turn an unavailable override into an empty placement');

  setup();hold(1,['mtn_sanae','hourai_mokou']);put('mtn_kanako',0,0);put('mtn_aya',0,1);put('mtn_suwako',1,0);
  const state=JSON.stringify(captureAIEvaluationSnapshot(game)),knowledge=game.handKnowledge[1],hand=game.players[1].hand;
  const rng=Math.random;Math.random=()=>{throw Error('A forecast must not consume randomness');};
  let mountain;
  try{mountain=aiReisenChoice(0,1,game.players[1].hand);}finally{Math.random=rng;}
  ok(mountain.id==='hourai_mokou','Reisen avoids forcing a Mountain card that completes the public set');
  ok(mountain.choices.find(x=>x.id==='mtn_sanae').pick.immediatePoints===4,'Reisen evaluates the target’s best scoring destination');
  ok(JSON.stringify(captureAIEvaluationSnapshot(game))===state&&game.handKnowledge[1]===knowledge&&game.players[1].hand===hand,'Preview restores actor, board, hands, private clues and metrics');
  const chosen=await game.chooseHandCard(0,1,'Force this card to be played next turn',{presentation:'reisen'});
  ok(chosen==='hourai_mokou','The real Reisen chooser uses the board forecast after revealing the hand');
  ok(game.testSeatMetrics(0).diagnostics.events.some(e=>e.type==='reisen-card'),'Reisen choices are recorded for later diagnosis');
  details.mountain=mountain.choices.map(x=>({id:x.id,points:x.pick?.immediatePoints,cell:x.pick?.cell}));
  setup();hold(1,['mtn_sanae','hourai_mokou']);put('hourai_eirin',0,0);put('hourai_kaguya',0,1);put('hourai_reisen',1,0);
  const eientei=aiReisenChoice(0,1,game.players[1].hand);
  ok(eientei.id==='mtn_sanae','The same hand produces the opposite command when the board has three Eientei cards');
  details.eientei=eientei.choices.map(x=>({id:x.id,points:x.pick?.immediatePoints,cell:x.pick?.cell}));

  setup();hold(1,['mtn_sanae']);put('mtn_kanako',0,0);put('mtn_aya',0,1);put('mtn_suwako',1,0);game.currentPlayerIdx=1;
  const legal=spaces(1,'mtn_sanae'),forced=aiChooseForcedCell(1,'mtn_sanae',legal);
  ok(game.wouldCompleteFaction('mtn_sanae',forced.r,forced.c),'A commanded AI chooses a scoring landing rather than a random one');
  ok(JSON.stringify(evalForcedCell(1,'mtn_sanae',legal))===JSON.stringify(forced),'Live and worker forced placement selectors agree');
  evalForcedAction={seat:1,action:{cardId:'mtn_sanae',r:3,c:3}};
  ok(evalForcedCell(1,'mtn_sanae',legal).r===3&&evalForcedAction===null,'Explicit evaluation fork actions still override the policy');
  game.forcedPlay[1]='mtn_sanae';await doPlayerAction(1);
  ok(game.winCount(game.players[1])===4&&!game.forcedPlay[1],'The real forced turn resolves the four-point claim and clears the decree');

  setup();hold(0,['sage_yukari']);game.forcedPlay[0]='sage_yukari';await doPlayerAction(0);
  ok(game.isOnBoard('sage_yukari')&&!game.players[0].hand.includes('sage_yukari'),'Reisen’s mandatory placement bypasses Yukari’s voluntary guard');
  setup();hold(1,['mtn_sanae','hell_clownpiece']);game.wasteland=Array.from({length:4},()=>Array(4).fill(true));
  const terrain=aiReisenChoice(0,1,game.players[1].hand);
  ok(terrain.id==='mtn_sanae'&&!terrain.pick&&terrain.choices[1].pick,'A no-destination command is distinguished from a legal wasteland card');
  game.currentPlayerIdx=1;game.forcedPlay[1]=terrain.id;await doPlayerAction(1);
  ok(game.players[1].hand.includes('mtn_sanae')&&!game.forcedPlay[1],'No-destination commands consume the turn without an illegal placement');

  setup();hold(1,['mtn_sanae','hourai_mokou']);put('mtn_kanako',0,0);put('mtn_aya',0,1);put('mtn_suwako',1,0);
  game.placementBlockedForTurn[1]=true;game.placementBlockTurns[1]=2;
  ok(aiReisenChoice(0,1,game.players[1].hand).id==='hourai_mokou'&&game.placementBlockedForTurn[1]&&game.placementBlockTurns[1]===2,'A Murasa delay is not mistaken for a permanent lack of legal destinations');
  setup();hold(1,['sdm_remilia','mtn_sanae']);hold(0,['hourai_mokou']);hold(2,['sdm_sakuya','sdm_flandre']);
  game.startingCardIds=new Set(CARDS.map(c=>c.id)); // Same public card pool under either hidden deal.
  const first=aiReisenChoice(0,1,game.players[1].hand);
  hold(2,['sage_matara','sage_ran']);game.handKnowledge[1].set('sage_matara',2);
  const second=aiReisenChoice(0,1,game.players[1].hand);
  ok(JSON.stringify(first)===JSON.stringify(second),'Unrevealed third-player card identities and target-private clues do not change the command');
  setup();hold(1,['mtn_sanae']);const owner=game,originalSleep=sleep;
  sleep=async()=>{owner.cancelled=true;};
  try{ok(await owner.chooseHandCard(0,1,'Force this card to be played next turn',{presentation:'reisen'})===null,'Cancelling during Reisen’s pause retires the old choice');}
  finally{sleep=originalSleep;}
  setup();hold(0,['sage_yukari']);game.players[0].aiPolicy='baseline';
  ok(AI_FROZEN_POLICY.aiEvaluateCard(0,'sage_yukari')!==null,'The historical comparison policy keeps its original Yukari candidates');
  return {status:'pass',checks,details};
})()`,ctx).then(result=>{
  fs.writeFileSync(__dirname+'/yukari-reisen-ai-2026-10-12-results.json',JSON.stringify(result,null,2));
  console.log(result.checks.length+' Yukari/Reisen checks passed');
}).catch(error=>{console.error(error.stack);process.exitCode=1;});
