// Real human selection/placement/trade handlers and real board renderer.
// Controlled DOM; this does not measure browser painting or touch latency.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),js=html.split('<script>')[1].split('</script>')[0],fixture=fs.readFileSync(__dirname+'/story-final-presentation-2026-10-19.cjs','utf8'),box={module:{exports:{}},require,__dirname,console,process:{once(){}}};
vm.runInNewContext(fixture.slice(0,fixture.indexOf('let g=setup();'))+'\nmodule.exports={ctx,A,el,Element,document,run,setup,flush};',box);
const {ctx,A,el,run,setup,flush}=box.module.exports,checks=[],ok=(v,n)=>{assert(v,n);checks.push(n);};
const section=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a)));
for(const name of ['onCellClick','onCellDragOver','onCellDragLeave','onCellDrop','positionRinnosukeBubble','syncNitoriCamouflage','repositionYuukaBlooms','renderStatus','syncHandSelection','captureHandPlacementArrival','logOverride','renderAll','cancelHandSelection','speakRinnosuke','triggerPlacementPresentation'])ctx[name]=()=>{};
ctx.localSeat=()=>0;ctx.localTurnReady=()=>true;ctx.tutorialAllowsTrade=()=>true;ctx.tutorialAllowsAction=()=>true;ctx.canAct=()=>true;ctx.handDragSettling=false;ctx.online=null;ctx.humanActionResolving=false;
run(section('function renderBoard(){','function renderShop(){'));run(section('function humanUsesYukari(','function onHandCardDragStart('));run('sleep=()=>Promise.resolve();');
let completed=false;process.once('beforeExit',()=>{if(!completed&&!process.exitCode){console.error('Final controls checks did not finish.');process.exitCode=1;}});
function make(){const g=setup();g.render=()=>{};g.players.forEach(p=>{g.drawPile.push(...p.hand);p.hand=[];});g.currentPlayerIdx=0;g.players[0].isAI=false;run('selectedHandCard=null;pendingCellChoice=null;humanActionResolving=false;');ctx.window.__resolveHumanTurn=()=>{};return g;}
function take(g,base){const index=g.drawPile.findIndex(id=>run('cardBaseId')(id)===base);assert(index>=0,base);const [id]=g.drawPile.splice(index,1);g.players[0].hand.push(id);return id;}
function inventory(g){return run('finalInventoryIds')(g).slice().sort().join(',');}
(async()=>{
 let g=make(),first=take(g,'sage_yukari'),selected=take(g,'sage_yukari');ctx.picked=selected;
 const before=inventory(g),merchandise=g.shopCards[1];let resolves=0;ctx.window.__resolveHumanTurn=()=>resolves++;
 run('onHandCardClick(picked);');assert.equal(run('pendingCellChoice.yukariShop'),true);assert.equal(run('pendingCellChoice.shopSlots.length'),0);assert.equal(run('shopActionHint(picked)'),'');
 ok(run('pendingCellChoice.cells.some(c=>c.r===game.shopTiles[1].r&&c.c===game.shopTiles[1].c)'),'Clicking a printed Yukari exposes actual merchandise as an override target without showing ordinary trade actions');
 await run('pendingCellChoice.resolveShop(1);');
 ok(g.shopCards[1]===selected&&g.players[0].hand.includes(first)&&!g.players[0].hand.includes(selected)&&g.players[0].hand.includes(merchandise)&&resolves===1&&inventory(g)===before,'The shop resolver places the exact selected second Yukari, keeps the other print, takes merchandise and resolves one placement with conserved inventory');
 g=make();selected=take(g,'sage_yukari');ctx.picked=selected;run('prepareHandCardDrag(picked);');ok(run('pendingCellChoice.yukariShop&&pendingCellChoice.dragOnly'),'Dragging a printed Yukari retains the same override selection mode');
 g.permanentAbilities[selected]='__draw_one';ok(!run('humanUsesYukari(picked)')&&run('humanShopSlots(picked).join()')==='0','A permanently overwritten printed Yukari follows its new ability and can use ordinary trade controls');
 g=make();selected=take(g,'medicine');ctx.picked=selected;resolves=0;const resolve=()=>resolves++;ctx.window.__resolveHumanTurn=resolve;const original=inventory(g),goods=g.shopCards[1];
 run('onHandCardClick(picked);');ok(!run('pendingCellChoice.yukariShop')&&run('pendingCellChoice.shopSlots.join()')==='0','Ordinary final prints still select the keeper to open trade choices');
 run('pendingCellChoice.resolveShop(0);');ok(run('pendingCellChoice.shopTrade&&pendingCellChoice.cells.length===7'),'Choosing the keeper opens all seven available fifth-card purchase targets');
 await run('pendingCellChoice.resolve(game.shopTiles[1]);');
 ok(g.finalChallenge.removed.includes(selected)&&g.players[0].hand.includes(goods)&&g.finalStockRemaining(1)===9&&inventory(g)===original&&resolves===0&&ctx.window.__resolveHumanTurn===resolve,'A real human purchase removes exactly the paid print, refills stock and preserves the ongoing turn resolver');
 g=make();const center=take(g,'hell_hecatia'),other=take(g,'hell_hecatia'),normal=take(g,'medicine');for(const[id,r,c]of [[center,1,1],[other,1,2],[normal,0,1]]){g.removeFromHand(0,id);g.setCardAt(r,c,id);}run('renderBoard();');
 const cells=el('board').children;for(const[r,c]of [[1,1],[1,2]]){const cell=cells[r*4+c];assert(cell.classList.contains('hecatia-cell'));assert(!cell.classList.contains('gravity-warp'));assert([...cell.values.values()].every(v=>!String(v).includes('NaN')));}
 ok(el('board').classList.contains('hecatia-active'),'Both physical Hecatia prints keep the gravity-center appearance without self-pull or NaN transforms');
 const warped=cells[1];ok(warped.classList.contains('gravity-warp')&&['--gravity-x','--gravity-y','--gravity-turn'].every(key=>Number.isFinite(parseFloat(warped.values.get(key)))),'Other cards retain finite visible gravity displacement');
 run('SIZE=4;game=new Game(2,{});');ok(run('humanUsesYukari("sage_yukari")&&!humanUsesYukari("medicine")'),'Ordinary single-copy games preserve the previous Yukari control classification');
 const result={status:'pass',count:checks.length,checks,scope:'Actual human click, drag, shop and placement resolvers with unique physical prints; ordinary-mode classification and actual board gravity renderer. Controlled DOM, no browser pixel claim.'};
 fs.writeFileSync(__dirname+'/story-final-controls-2026-10-19-results.json',JSON.stringify(result,null,2)+'\n');completed=true;console.log(result.count+' final controls checks passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
