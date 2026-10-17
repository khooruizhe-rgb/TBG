const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8');
const fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{';
const box={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx};',box);const {ctx}=box.module.exports;
let completed=false;
process.once('beforeExit',()=>{if(!completed){console.error('The Sakuya round suite did not reach its completion marker');process.exitCode=1;}});
vm.runInContext(`(async()=>{
 const checks=[],routes=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
 function make(seed=1,chapter=6){
  evalResetTokens();evalSetSeed('sakuya-round-'+seed);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard'});configureStoryMatch(game,chapter);
  game.ui.pickOwnHandCards=async()=>null;game.ui.pickCell=async(t,cells)=>cells[0];game.pickUI=async(p,method,args)=>game.ui[method]?.(...args);return game;
 }
 function inventory(){return [...game.board.flat(),...game.shopCards,...game.drawPile,...game.players.flatMap(p=>[...p.hand,...p.discard])].filter(Boolean);}
 function arrange({hands=[[],[]],board=[],discards=[[],[]],shop=['shop_rinnosuke','sdm_meiling','mtn_nitori','hourai_tewi']}={}){
  game.board=Array.from({length:4},()=>Array(4).fill(null));game.wasteland=game.board.map(row=>row.map(()=>false));game.players.forEach((p,i)=>{p.hand=hands[i].slice();p.discard=discards[i].slice();});game.shopCards=shop.slice();
  for(const[r,c,id]of board)game.setCardAt(r,c,id);
  const used=[...hands.flat(),...discards.flat(),...board.map(at=>at[2]),...shop.filter(Boolean)];assert.equal(new Set(used).size,used.length);assert(used.every(id=>CARD[id]));
  game.drawPile=CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion&&!used.includes(card.id)).map(card=>card.id);game.startingCardIds=new Set([...used,...game.drawPile]);assert.equal(game.startingCardIds.size,40);
  game.handKnowledge=game.players.map(()=>new Map());game.reserveAges=game.players.map(()=>({}));game.currentPlayerIdx=0;game.winner=null;game.stalemateMessage='';game.beginPlayerTurn(0);evalConservation(game);
 }
 async function play(actions,scheduled=0,onAction=()=>{}){
  const original=aiDecideAction,used=[],times=[];
  game.ui.onTimeStop=value=>times.push(value);
  aiDecideAction=async(p)=>{
   assert.equal(p,0,'The opponent cannot act inside a continuous player round');const action=actions.shift();assert(action,'No unplanned action may run');
   onAction(action,used.length);used.push({type:action.type,cardId:action.cardId,score:game.winCount(game.players[p]),startScore:game.storyMatch.turnStartScore,blocked:game.isPlacementBlocked(p),traded:!!game.tradedThisTurn[p]});return action;
  };
  try{const flags=await doPlayerAction(0);await afterAction(0,flags,scheduled);}finally{aiDecideAction=original;}
  assert.equal(actions.length,0);evalConservation(game);return {used,times};
 }
 const humanHands=new Set(),otherCards=new Set(),rivals=new Set(),actors=new Set(),slots=new Set();
 for(let seed=1;seed<=1024;seed++){
  const g=make(seed),human=g.players[0].hand;assert(g.players.every(p=>p.hand.length===6));assert.equal(human.filter(id=>id==='sdm_sakuya').length,1);assert.equal(inventory().filter(id=>id==='sdm_sakuya').length,1);assert.equal(inventory().length,40);evalConservation(g);
  assert(!CARD.sdm_sakuya.createdCopy&&!g.permanentAbilities.sdm_sakuya);assert(g.handKnowledge.every(memory=>memory.size===0));assert.equal(g.aiDifficulty,'normal');
  humanHands.add(human.slice().sort().join(','));rivals.add(g.players[1].hand.slice().sort().join(','));actors.add(g.currentPlayerIdx);slots.add(human.indexOf('sdm_sakuya'));for(const id of human)if(id!=='sdm_sakuya')otherCards.add(id);
 }
 ok(humanHands.size>1000&&rivals.size>1000&&otherCards.size===35,'1,024 real chapter-six deals contain exactly one original Sakuya and five random originals, retain private six-card hands and conserve all 40 cards');
 ok(actors.size===2&&slots.size===6,'The first actor and Sakuya’s position in the hand remain randomized');
 make(91);const first=JSON.stringify([game.currentPlayerIdx,game.players.map(p=>p.hand),game.drawPile,game.shopCards]);make(91);ok(JSON.stringify([game.currentPlayerIdx,game.players.map(p=>p.hand),game.drawPile,game.shopCards])===first,'A seeded deal remains reproducible');
 for(const chapter of [1,2,3,4,5]){
  let missing=false;for(let seed=1;seed<=48;seed++){make(seed,chapter);assert(game.players.every(p=>p.hand.length===6));missing ||= !game.players[0].hand.includes('sdm_sakuya');evalConservation(game);}ok(missing,'Chapter '+chapter+' does not inherit the sixth chapter’s guaranteed Sakuya');
 }
 const setupBoard=[[0,0,'sdm_remilia'],[0,1,'sdm_patchouli'],[2,1,'temple_shou'],[2,2,'temple_byakuren'],[3,1,'temple_nue']];
 for(let seed=1;seed<=16;seed++){
  make(seed);arrange({hands:[['sdm_sakuya','sdm_flandre','temple_murasa','medicine'],['reimu']],board:setupBoard});game.choosePlayer=async()=>1;game.chooseHandCard=async(p,t)=>game.players[t].hand[0];
  const result=await play([{type:'place',cardId:'sdm_sakuya',r:0,c:2},{type:'place',cardId:'sdm_flandre',r:1,c:1},{type:'place',cardId:'temple_murasa',r:3,c:2}]);
  assert.deepEqual(result.used.map(action=>action.score),[0,0,4]);assert(result.used.every(action=>action.startScore===0));assert.deepEqual(result.times,[true,false]);
  assert.equal(game.winCount(game.players[0]),8);assert.equal(game.winner?.idx,0);assert.deepEqual(game.storyMatch.claimedFactions,['sdm','temple']);assert(game.storyMatch.progress.surprise);assert.equal(storyMatchStars(game),3);assert.equal(game.currentPlayerIdx,0);
  assert(game.players[0].hand.includes('medicine'),'Winning during stopped time preserves the original cancellation behavior');routes.push({seed,actions:result.used,points:8,stars:3});
 }
 ok(routes.length===16,'Sixteen actual Sakuya chains use her two bonus turns to collect two four-card factions, score eight points and earn all three stars');
 make();arrange({hands:[['sdm_sakuya','sdm_flandre','medicine','heaven_iku'],['reimu']],board:[[0,0,'sdm_remilia'],[0,1,'sdm_patchouli'],[1,0,'sdm_meiling'],[3,3,'heaven_tenshi']],shop:['shop_rinnosuke',null,'mtn_nitori','hourai_tewi']});game.choosePlayer=async()=>0;game.chooseHandCard=async()=> 'medicine';
 const exact=await play([{type:'place',cardId:'sdm_sakuya',r:1,c:1},{type:'place',cardId:'sdm_flandre',r:2,c:0},{type:'place',cardId:'heaven_iku',r:3,c:2}]);
 ok(exact.used.map(action=>action.score).join(',')==='0,4,5'&&game.winCount(game.players[0])===7&&game.storyMatch.progress.surprise,'Exactly seven points from real claims and an ability across the original turn and both extra turns satisfies the threshold');
 make();arrange({hands:[['sdm_sakuya','haku_youmu','hourai_mokou','medicine'],['reimu']],board:[[0,0,'sdm_remilia'],[0,1,'sdm_patchouli'],[1,0,'sdm_flandre'],[3,3,'haku_yuyuko']]});
 const nested=await play([{type:'place',cardId:'sdm_sakuya',r:1,c:1},{type:'place',cardId:'haku_youmu',r:3,c:2},{type:'place',cardId:'hourai_mokou',r:2,c:1},{type:'draw'}]);
 ok(nested.used.map(action=>action.score).join(',')==='0,4,6,6'&&nested.used.every(action=>action.startScore===0)&&!game.storyMatch.progress.surprise,'A nested free Youmu placement keeps the same scoring window and six points do not earn the seven-point star');
 ok(game.currentPlayerIdx===1&&game.players[0].hand.length===0&&game.drawPile.includes('medicine')&&nested.times.join(',')==='true,false','A nonwinning Sakuya chain completes both bonus turns, sweeps the remaining hand once, resumes time and advances to the opponent once');
 make();arrange({hands:[['sdm_sakuya','haku_youmu','hourai_mokou'],['reimu']],board:[[0,0,'sdm_remilia'],[0,1,'sdm_patchouli'],[1,0,'sdm_flandre'],[3,3,'haku_yuyuko']]});
 const restricted=await play([{type:'place',cardId:'sdm_sakuya',r:1,c:1},{type:'draw'},{type:'place',cardId:'haku_youmu',r:3,c:2},{type:'place',cardId:'hourai_mokou',r:2,c:1}],0,(action,index)=>{
  if(index===0){game.placementBlockTurns[0]=1;game.tradedThisTurn[0]=true;}
 });
 ok(restricted.used[1].blocked&&!restricted.used[2].blocked&&restricted.used.slice(1).every(action=>!action.traded)&&game.placementBlockTurns[0]===0,'Extra turns still consume Murasa-style restrictions and reset trading independently of the shared story scoring window');
 const twoClaims=[[0,0,'sdm_remilia'],[0,1,'sdm_patchouli'],[1,0,'sdm_sakuya'],[2,1,'temple_shou'],[2,2,'temple_byakuren'],[3,1,'temple_nue']];
 make();arrange({hands:[['sdm_flandre','temple_murasa'],['reimu']],board:twoClaims});game.choosePlayer=async()=>1;game.chooseHandCard=async()=> 'reimu';
 game.pendingExtraTurns[0]=1;const scheduled=await play([{type:'place',cardId:'sdm_flandre',r:1,c:1},{type:'place',cardId:'temple_murasa',r:3,c:2}],game.takeScheduledExtraTurns(0));
 ok(scheduled.used.map(action=>action.score).join(',')==='0,4'&&scheduled.used.every(action=>action.startScore===0)&&game.storyMatch.progress.surprise,'A scheduled dancer extra turn also shares its original turn’s scoring window');
 make();arrange({hands:[['sdm_flandre','temple_murasa'],['reimu']],board:twoClaims});game.choosePlayer=async()=>1;game.chooseHandCard=async()=> 'reimu';
 game.removeFromHand(0,'sdm_flandre');await game.internalPlace('sdm_flandre',1,1,0,0);assert.equal(game.winCount(game.players[0]),4);game.endPlayerTurn(0);game.beginPlayerTurn(0);
 game.removeFromHand(0,'temple_murasa');await game.internalPlace('temple_murasa',3,2,0,0);evalConservation(game);
 ok(game.winner?.idx===0&&game.storyMatch.turnStartScore===4&&!game.storyMatch.progress.surprise,'A separate regular turn resets the baseline even when the same player acts again');
 make();delete game.storyMatch;game.beginPlayerTurn(game.currentPlayerIdx);const snapshot=captureAIEvaluationSnapshot(game);snapshot.rulesVersion='2026-10-17-story-unlocked-shop-v23';const saved=JSON.stringify(game.players.map(p=>p.hand));evalRestore(snapshot,['current','current']);evalConservation(game);
 ok(JSON.stringify(game.players.map(p=>p.hand))===saved,'A v23 regular-turn AI evaluation snapshot still imports with its original card inventory');
 return {status:'pass',count:checks.length,checks,routes,rulesVersion:REWORK_RULES_VERSION,randomOpenings:1024,scope:'Actual engine, opening dealer, production action/follow-up flow, real faction claims, threshold boundary, nested free placement, hand sweep, time-stop cancellation and per-turn controls; no browser-pixel claims.'};
})()`,ctx).then(result=>{fs.writeFileSync(__dirname+'/story-sakuya-round-2026-10-17-results.json',JSON.stringify(result,null,2)+'\n');completed=true;console.log(result.count+' Sakuya-round checks, 1,024 openings and sixteen actual eight-point clears passed');}).catch(error=>{console.error(error.stack);process.exitCode=1;});
