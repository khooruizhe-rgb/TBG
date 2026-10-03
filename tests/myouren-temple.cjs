const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||'touhou_board_game_github_textures.html','utf8');
const js=html.split('<script>')[1].split('</script>')[0];new vm.Script(js);
const slice=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b));
let seed=3;const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const ctx={Math:math,console,setTimeout:f=>{f();return 0},clearTimeout(){},triggerPlacementPresentation(){},speakRinnosuke(){},lastPlacedCell:null,renderAll(){},humanActionResolving:false};
vm.createContext(ctx);
vm.runInContext(slice('const DIRS4','/* ===================== UI layer')+'\nlet game=null;\n'+slice('const NO_PLACED_ABILITY','async function doPlayerAction')+slice('function canTakeTurnAction','/* Cards with no "Placed:')+slice('async function doPlayerAction','async function afterAction')+
`\nthis.api={Game,CARD,CARDS,FACTIONS,romanNumeral,aiCostCanResolve,aiEvaluateCard,canAct,doPlayerAction,resolveFollowups,setGame:g=>game=g,setSize:n=>SIZE=n};`,ctx);
const A=ctx.api,tests=[];const test=(n,f)=>tests.push([n,f]);
const pay=['mtn_suwako','mtn_aya','palace_utsuho','palace_rin','sage_ran','medicine','hourai_reisen'];
function setup({hand=[],board=[],waste=[],deck=[],ui={},size=4}={}){
 A.setSize(size);const g=new A.Game(3,ui);g.players.forEach(p=>{p.hand=[];p.discard=[];});g.players[1].hand=hand.slice();g.currentPlayerIdx=1;g.board=Array.from({length:size},()=>Array(size).fill(null));g.wasteland=Array.from({length:size},()=>Array(size).fill(false));g.drawPile=deck.slice();g.shopCards=['shop_rinnosuke','sdm_meiling','hourai_tewi','hell_kutaka'];
 for(const [r,c,id]of board)g.setCardAt(r,c,id);for(const [r,c]of waste)g.setWastelandAt(r,c,true);A.setGame(g);return g;
}
test('Temple has four starting cards, a crown, and one shop-only fifth card',()=>{
 assert.equal(A.FACTIONS.temple.size,4);assert.equal(A.CARDS.filter(c=>c.faction==='temple'&&!c.shopExpansion).length,4);assert(A.CARD.temple_byakuren.crown);assert(A.CARD.temple_ichirin.shopExpansion);
 for(let i=0;i<25;i++){const g=new A.Game(3,{});const starting=[...g.drawPile,...g.players.flatMap(p=>p.hand)];assert(!starting.includes('temple_ichirin'));for(const id of ['temple_byakuren','temple_shou','temple_nue','temple_murasa'])assert(starting.includes(id));assert(g.shopCards.slice(1).every(id=>A.CARD[id].shopExpansion));}
});
test('Kourindou starts as four normal tiles and its menu option is removed',()=>{
 const g=setup();assert.equal(g.shopTiles.length,4);assert(g.shopTiles.every(t=>!g.wastelandAt(t.r,t.c)));assert(!html.includes('shop-option'));assert(!html.includes('Cost X'));assert(A.CARD.haku_yuyuko.costN);assert(A.CARD.haku_yuyuko.desc.includes('Send N random'));assert.equal(A.romanNumeral(7),'VII');
});
test('Byakuren discount includes herself and physical Temple members, excludes protected merchandise and wild Kasen',()=>{
 const g=setup({board:[[1,1,'temple_byakuren'],[1,2,'temple_nue'],[1,3,'sage_kasen']]});assert.equal(g.byakurenCost(),5);g.setCardAt(6,0,'temple_shou');assert.equal(g.byakurenCost(),5);g.setCardAt(1,1,null);assert.equal(g.byakurenCost({r:1,c:1}),5);
});
test('Byakuren pays the discounted cost, discards three, makes three wastelands and grants three turns',async()=>{
 const events=[];const g=setup({hand:pay.slice(0,6),board:[[1,1,'temple_byakuren'],[0,0,'sdm_patchouli'],[0,1,'sdm_flandre'],[0,2,'hourai_mokou']],ui:{onTempleEffect:e=>events.push(e),onDiscard:e=>events.push(e),render(){}}});
 g.chooseCells=async(_p,count,cells,title)=>cells.filter(t=>title.includes('discard')?g.cardAt(t.r,t.c)!=='temple_byakuren':t.r===3).slice(0,count);
 const flags=await g.resolveAbility('temple_byakuren',1,1,1,0);assert.equal(flags.extraTurns,3);assert.equal(g.players[1].hand.length,0);assert.equal(g.players[1].discard.length,3);assert.equal(g.drawPile.length,6);assert.equal(g.templeWasteland().length,3);assert(events.some(e=>e.effect==='byakuren'));assert.equal(events.filter(e=>e.effect==='strength').length,3);
});
test('Byakuren can skip an unaffordable cost and is suppressed by Eirin',async()=>{
 for(const board of [[],[[3,3,'hourai_eirin']]]){const g=setup({hand:pay.slice(0,5),board:[[1,1,'temple_byakuren'],...board]});assert.deepEqual({...await g.resolveAbility('temple_byakuren',1,1,1,0)},{});assert.equal(g.templeWasteland().length,0);assert.equal(g.players[1].hand.length,5);}
});
test('Shou counts all wasteland, clears it, and draws past the normal seven-card limit',async()=>{
 const g=setup({hand:pay,board:[[1,1,'temple_shou']],waste:[[0,0],[0,1],[0,2]],deck:['sdm_patchouli','sdm_flandre','hourai_mokou']});await g.resolveAbility('temple_shou',1,1,1,0);assert.equal(g.players[1].hand.length,9);assert.equal(g.templeWasteland().length,0);assert.equal(g.drawPile.length,1);
});
test('Shou clears every wasteland even when the pile runs out',async()=>{
 const g=setup({hand:['medicine'],waste:[[0,0],[0,1],[0,2],[0,3],[1,0]]});await g.resolveAbility('temple_shou',2,2,1,0);assert.equal(g.players[1].hand.length,1);assert.equal(g.templeWasteland().length,0);
});
test('Nue offers exactly three different valid abilities, executes from her tile and records the choice',async()=>{
 const g=setup({board:[[1,1,'temple_nue']],deck:['medicine','hourai_mokou']});let offered=[];g.chooseChimeraAbility=async(_p,ids)=>{offered=Array.from(ids);return ids[0];};let copied;
 const original=g.resolveAbility.bind(g);g.resolveAbility=async function(id,r,c,p,d){if(d>0){copied={id,r,c,p};return {extraTurns:2};}return original(id,r,c,p,d);};
 const f=await g.resolveAbility('temple_nue',1,1,1,0);assert.equal(new Set(offered).size,3);assert(offered.every(id=>!A.CARD[id].token&&!A.CARD[id].shopkeeper&&id!=='temple_nue'));assert.equal(g.borrowedAbilities.temple_nue,offered[0]);assert.deepEqual(copied,{id:offered[0],r:1,c:1,p:1});assert.equal(f.extraTurns,2);
});
test('Nue copied passives cover Kasen, Eirin, Nitori, Kanako and Hecatia scoring',()=>{
 const g=setup({board:[[1,1,'temple_nue'],[3,3,'medicine']]});g.borrowedAbilities.temple_nue='sage_kasen';assert(g.boardMatchesFaction(1,1,'hourai'));
 g.borrowedAbilities.temple_nue='hourai_eirin';assert(g.eirinActive());assert(g.isCrownAbilityDisabled('mtn_kanako'));
 g.borrowedAbilities.temple_nue='mtn_nitori';assert(!g.canSelectBoardCard(1,1));assert(g.canSelectBoardCard(3,3));
 g.borrowedAbilities.temple_nue='mtn_kanako';assert(g.hasActiveAbility('mtn_kanako'));
 g.borrowedAbilities.temple_nue='hell_hecatia';assert.equal(g.pointValue('temple_nue'),3);assert(!g.canEnterDiscard(1,'temple_nue'));g.setCardAt(0,0,'hourai_eirin');assert.equal(g.pointValue('temple_nue'),1);
});
test('Nue can use borrowed Yukari override before rerolling and copied Koishi can trigger from hand',async()=>{
 const g=setup({hand:['temple_nue'],board:[[0,0,'medicine'],[0,1,'palace_satori'],[1,0,'palace_rin'],[1,1,'palace_utsuho']]});
 g.borrowedAbilities.temple_nue='sage_yukari';assert(g.emptyOrWastelandForCard(A.CARD.temple_nue).some(t=>t.r===0&&t.c===0));
 g.chooseChimeraAbility=async()=>null;g.removeFromHand(1,'temple_nue');await g.internalPlace('temple_nue',0,0,1,0);
 assert.equal(g.cardAt(0,0),'temple_nue');assert(g.players[1].hand.includes('medicine'));assert(!g.borrowedAbilities.temple_nue);
 g.setCardAt(0,0,null);g.players[1].hand=['temple_nue'];g.borrowedAbilities.temple_nue='palace_koishi';const trigger=g.checkKoishiTrigger(0);assert.equal(trigger.cardId,'temple_nue');assert.equal(g.players[1].hand.length,0);
});
test('Matara repeats Nue’s chosen ability as Matara, and copy recursion is bounded',async()=>{
 const g=setup({board:[[1,1,'temple_nue'],[2,2,'sage_matara']],deck:['medicine']});g.borrowedAbilities.temple_nue='mtn_sanae';await g.resolveAbility('temple_nue',2,2,1,2);assert.equal(g.players[1].hand.length,1);assert.deepEqual({...await g.resolveAbility('sage_matara',2,2,1,6)},{});
});
test('Ichirin pushes outer cards first, sends edge cards to draw and spares her faction',async()=>{
 const g=setup({hand:['medicine','palace_rin'],board:[[1,1,'temple_ichirin'],[1,2,'sdm_patchouli'],[1,3,'sdm_flandre'],[2,1,'temple_nue'],[0,0,'hourai_mokou']]});await g.resolveAbility('temple_ichirin',1,1,1,0);assert.equal(g.cardAt(1,3),'sdm_patchouli');assert.equal(g.cardAt(1,2),null);assert.equal(g.cardAt(2,1),'temple_nue');assert(g.drawPile.includes('sdm_flandre'));assert(g.drawPile.includes('hourai_mokou'));assert.equal(g.players[1].hand.length,0);
});
test('Ichirin preserves protected cards and cannot push into an occupied or illegal wasteland tile',async()=>{
 const g=setup({hand:['medicine','palace_rin'],board:[[1,1,'temple_ichirin'],[1,2,'sdm_patchouli'],[1,3,'temple_nue'],[2,1,'sdm_flandre'],[0,0,'shop_rinnosuke'],[0,1,'hourai_mokou']],waste:[[3,1]]});await g.resolveAbility('temple_ichirin',1,1,1,0);assert.equal(g.cardAt(1,2),'sdm_patchouli');assert.equal(g.cardAt(2,1),'sdm_flandre');assert.equal(g.cardAt(0,1),'hourai_mokou');
});
test('Murasa seals two actual turns, allows drawing and trading, preserves Reisen, then expires',async()=>{
 const g=setup({hand:['medicine'],deck:['hourai_mokou','sdm_flandre','sdm_patchouli']});g.choosePlayer=async()=>1;await g.resolveAbility('temple_murasa',1,1,0,0);g.forcedPlay[1]='medicine';
 for(let turn=0;turn<2;turn++){g.beginPlayerTurn(1);assert(g.isPlacementBlocked(1));assert.equal(g.emptyOrWastelandForCard(A.CARD.medicine).length,0);assert(g.canTrade(1,'medicine'));assert(A.canAct(1));await A.doPlayerAction(1);assert.equal(g.forcedPlay[1],'medicine');assert.equal(g.board.flat().filter(Boolean).length,0);g.endPlayerTurn(1);}
 g.beginPlayerTurn(1);assert(!g.isPlacementBlocked(1));assert(g.emptyOrWastelandForCard(A.CARD.medicine).length>0);
});
test('Murasa prevents automatic Koishi placement between the sealed player’s turns',()=>{
 const g=setup({board:[[0,0,'palace_satori'],[0,1,'palace_rin'],[1,0,'palace_utsuho']]});g.players[2].hand=['palace_koishi'];g.placementBlockTurns[2]=2;assert.equal(g.checkKoishiTrigger(0),null);assert(g.players[2].hand.includes('palace_koishi'));
});
test('Extra turns consume Murasa’s seal once per turn and free placements do not consume it',async()=>{
 const g=setup({hand:['medicine']});g.placementBlockTurns[1]=2;const seen=[];vm.runInContext('doPlayerAction=async p=>{this.seen.push(game.isPlacementBlocked(p));return {};};',ctx);ctx.seen=seen;g.canTrade=()=>false;g.canDrawNormally=()=>true;
 await A.resolveFollowups(1,{extraTurns:3});assert.deepEqual(seen,[true,true,false]);
 g.placementBlockTurns[1]=2;g.placementBlockedForTurn[1]=false;seen.length=0;await A.resolveFollowups(1,{skipAdvance:true});assert.deepEqual(seen,[false]);assert.equal(g.placementBlockTurns[1],2);
});
test('Four connected Temple cards claim exactly four, and Ichirin substitutes for a missing member',()=>{
 const g=setup({board:[[0,0,'temple_byakuren'],[0,1,'temple_shou'],[1,0,'temple_nue'],[1,1,'temple_ichirin']]});g.checkClaims(1);assert.equal(g.players[1].discard.length,4);assert.equal(g.mainBoardCells().length,0);
});
test('AI understands Byakuren’s discount, Shou’s wasteland gain and Murasa’s denial',()=>{
 const g=setup({hand:['temple_byakuren',...pay.slice(0,6)],board:[[0,0,'temple_nue']],waste:[[0,1],[1,0],[2,0]]});assert(A.aiCostCanResolve(1,'temple_byakuren',1,1));assert.equal(g.abilityCost('temple_byakuren',{r:1,c:1}),5);assert.equal(g.estimateHandGain(1,'temple_shou'),1);assert(A.aiEvaluateCard(1,'temple_murasa').rate>=1);
});
test('Temporary Murasa seals cannot end a full-board match before the seals expire',async()=>{
 vm.runInContext(slice('async function afterAction','/* Wire human hand-card')+'\nthis.api.runNextTurn=runNextTurn;',ctx);
 const g=setup();g.players.forEach(p=>p.hand=[]);for(let r=0;r<4;r++)for(let c=0;c<4;c++)g.setCardAt(r,c,'hourai_eirin');
 g.placementBlockTurns[1]=2;g.currentPlayerIdx=0;
 await A.runNextTurn();for(let i=0;i<100;i++)await Promise.resolve();
 assert(g.stalemateMessage);assert.equal(g.placementBlockTurns[1],0);assert(!g.isPlacementBlocked(1));
});
test('Every Temple card has small/detail artwork, the faction has icon/background, and Unzan is layered behind Ichirin',()=>{
 const mappings=slice('const FACTION_BG_CLASS','function cardBgClass');for(const id of ['temple_byakuren','temple_shou','temple_nue','temple_murasa','temple_ichirin'])assert(mappings.includes(id));assert(html.includes('icons/myouren_temple.webp'));assert(html.includes('backgrounds/myouren_temple.webp'));assert(/background-image:var\(--temple-ichirin\),var\(--temple-unzan\),var\(--temple-bg\)/.test(html));assert(html.includes("[['Unzan',TEMPLE_UNZAN_PORTRAIT],['Ichirin'"));assert(html.includes("'pickAbilityCards','pickFromList'"));
});
(async()=>{for(const [n,f]of tests){await f();console.log('PASS '+n);}console.log(`${tests.length}/${tests.length} Myouren Temple checks passed`);})().catch(e=>{console.error(e);process.exitCode=1;});
