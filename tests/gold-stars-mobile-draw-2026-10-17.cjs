// Real star persistence/renderers, mobile docking, draw handler and flight anchors.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),js=html.split('<script>')[1].split('</script>')[0],css=html.split('<style>')[1].split('</style>')[0];
new vm.Script(js);
const fixture=fs.readFileSync(__dirname+'/card-materials-2026-10-12.cjs','utf8'),marker="const copy='created_card_910'",box={module:{exports:{}},require,__dirname,console};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,A,el,Element,documentFixture};',box);
const {ctx,A,el,Element,documentFixture:document}=box.module.exports,run=code=>vm.runInContext(code,ctx),checks=[],ok=(v,n)=>{assert(v,n);checks.push(n);};
const one=name=>{const i=js.indexOf('function '+name+'(');return js.slice(i,js.indexOf('\n}',i)+2);};
const style=(selector,property)=>{let value;for(const m of css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g))if(m[1].split(',').map(s=>s.trim()).includes(selector))for(const d of m[2].split(';')){const i=d.indexOf(':');if(d.slice(0,i).trim()===property)value=d.slice(i+1).trim();}return value;};
Element.prototype.insertBefore=function(node,next){node.remove();const index=this.children.indexOf(next);assert(index>=0);this.children.splice(index,0,node);node.parentElement=this;node.isConnected=true;return node;};
const storage=new Map();ctx.window.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};ctx.online=null;ctx.closeStoryIntroCards=()=>{};
vm.runInContext(js.slice(js.indexOf('let storyState=null,'),js.indexOf('function showStoryChapterIntro('))+one('renderStoryCoach'),ctx);
run('saveStoryStars(6,["twoFactions"]);saveStoryStars(6,["lockedFaction"]);saveStoryStars(6,["surprise"]);openStoryMenu();');
let rating=el('story-levels').children[5].children[2].children[1];
ok(rating.textContent.trim()==='★★★'&&!rating.className.includes('story-stars-perfect'),'Three stars collected across separate victories retain the ordinary cumulative rating');
run('saveStoryStars(6,["twoFactions","lockedFaction","surprise"]);openStoryMenu();');rating=el('story-levels').children[5].children[2].children[1];
ok(rating.className.includes('story-stars-perfect')&&rating.values.get('--story-star-color')==='#d4af37','A saved single-match chapter-six perfect clear renders gold in chapter selection');
for(const chapter of [2,3,5])assert(run('storyStarColor('+chapter+')===FACTIONS[STORY_CHAPTERS['+(chapter-1)+'].introduced].color'));
ok(run('storyStarColor(4)')==='#2563eb'&&run('storyStarColor(4)!==FACTIONS.hourai.color'),'Eientei stars use saturated blue while the other faction chapters retain their existing palettes');
run('game=new Game(2,{},null,{fastTest:true});configureStoryMatch(game,6);storyState={chapter:6,practice:game,complete:false};game.storyMatch.progress={twoFactions:true,lockedFaction:true,surprise:true};renderStoryCoach();');
ok(!el('tutorial-feedback').classList.contains('story-perfect'),'Meeting all optional objectives before victory does not grant perfect-clear styling');
run('game.winner=game.players[0];storyState.complete=true;renderStoryCoach();');
ok(el('tutorial-feedback').classList.contains('story-perfect')&&el('tutorial-feedback').values.get('--story-star-color')==='#d4af37','The completed chapter-six match also renders its full stars in gold');
run('game.winner=null;storyState=null;');

const body=document.body,boardPanel=el('board-panel'),boardWrap=el('board-wrap'),table=el('table-wrap'),handArea=el('hand-area'),dock=el('mobile-draw-dock'),pile=el('draw-pile'),controls=el('controls'),draw=el('draw-btn'),sound=el('sound-toggle');
body.appendChild(boardPanel);boardPanel.append(boardWrap,handArea);boardWrap.append(table,el('status-line'),controls);table.append(el('seats'),pile,el('board'));pile.append(el('draw-pile-face'),el('draw-pile-label'));el('draw-pile-label').appendChild(el('draw-pile-count'));controls.append(draw,sound);handArea.append(el('hand-title'),el('hand-choice-bar'),el('hand'),dock);
document.documentElement=new Element();ctx.dockTutorialCoach=()=>{};ctx.closeMobileJournal=()=>body.classList.remove('mobile-log-open');ctx.positionRinnosukeBubble=ctx.repositionYuukaBlooms=()=>{};ctx.mobileFullscreenWanted=()=>ctx.window.innerWidth<=980;ctx.getComputedStyle=()=>({paddingLeft:'0',paddingRight:'0'});ctx.displayedHandSeat=()=>0;
let reduced=false;ctx.window.matchMedia=()=>({matches:reduced});
Object.defineProperty(table,'getBoundingClientRect',{value:()=>{const width=ctx.window.innerWidth-(run('game.kourindouEnabled')?parseFloat(body.values.get('--mobile-shop-width'))+6:0)-parseFloat(body.values.get('--mobile-hand-width'))-16;const height=(ctx.window.visualViewport?.height||ctx.window.innerHeight)-36-12-30-(controls.parentElement===boardWrap?34:0);return {left:0,top:36,width,height,right:width,bottom:36+height};}});
Object.defineProperty(el('hand'),'getBoundingClientRect',{value:()=>({left:0,top:55,width:parseFloat(body.values.get('--mobile-hand-width'))||190,height:Math.max(40,(ctx.window.visualViewport?.height||ctx.window.innerHeight)-138)})});
el('game').classList.add('active');
let appended=0;const appendDock=dock.appendChild.bind(dock);dock.appendChild=node=>{appended++;return appendDock(node);};
const layouts=[];
for(const [width,height]of [[568,320],[667,375],[844,390],[960,432]])for(const shop of [false,true])for(const mirror of [false,true])for(const size of [4,5]){
 ctx.window.innerWidth=width;ctx.window.innerHeight=height;delete ctx.window.visualViewport;body.classList.toggle('mobile-mirrored',mirror);run('game.kourindouEnabled='+shop+';SIZE='+size+';');
 const before=run('JSON.stringify(game.testRuleState())');A.actualSyncMobileViewport();
 assert.equal(pile.parentElement,dock);assert.equal(controls.parentElement,dock);assert.equal(dock.parentElement,handArea);
 const rect=table.getBoundingClientRect(),now=parseFloat(body.values.get('--mobile-board-width')),old=Math.max(36,Math.floor(Math.min(360,(rect.height-34-52)*.8,rect.width-132)));
 assert(now>=old&&now*1.25<=rect.height-44+1.25);assert.equal(run('JSON.stringify(game.testRuleState())'),before);
 layouts.push({width,height,shop,mirror,size,before:old,after:now});
}
ok(layouts.length===32&&layouts.some(x=>x.after>x.before),'At 32 controlled phone/shop/mirror layouts the actual sizing handler uses reclaimed draw-row space, never reduces the board and preserves game state');
const moves=appended;A.actualSyncMobileViewport();A.actualSyncMobileViewport();
ok(appended===moves&&dock.children.length===2&&dock.children[0]===pile&&dock.children[1]===controls,'Repeated viewport refreshes preserve the same live pile and controls without reparenting or duplicating them');
ok(style('body.game-mobile #mobile-draw-dock','grid-row')==='4'&&style('body.game-mobile #mobile-draw-dock #draw-pile','position')==='static'&&style('body.game-mobile #mobile-draw-dock #controls','flex-direction')==='column','The pile, count and existing actions form a compact strip adjoining the hand');
ok(style('body.mobile-landscape.mobile-mirrored #hand-area','grid-column')==='2'&&dock.parentElement===handArea,'The draw strip follows the hand to the opposite side in mirrored play');
ok(style('body.mobile-landscape #table-wrap','padding')==='32px 0 0'&&style('body.game-mobile #mobile-draw-dock #controls .big-btn','white-space')==='normal','The board keeps headroom for seats while narrow English draw labels can wrap inside the side strip');
ctx.window.innerWidth=390;ctx.window.innerHeight=844;A.actualSyncMobileViewport();
ok(body.classList.contains('game-mobile')&&!body.classList.contains('mobile-landscape')&&pile.parentElement===dock,'Portrait phones keep the same adjacent-hand draw strip');
ctx.window.innerWidth=1200;ctx.window.innerHeight=800;A.actualSyncMobileViewport();
ok(pile.parentElement===table&&table.children.indexOf(pile)<table.children.indexOf(el('board'))&&controls.parentElement===boardWrap&&dock.children.length===0,'Returning to desktop restores the original pile position, DOM order and board actions');
ctx.window.innerWidth=844;ctx.window.innerHeight=390;ctx.window.visualViewport={height:310};A.actualSyncMobileViewport();
ok(parseFloat(body.values.get('--mobile-board-width'))*1.25<=table.getBoundingClientRect().height-44+1.25&&controls.parentElement===dock,'A smaller visual viewport recomputes a bounded board while keeping mobile controls docked');
delete ctx.window.visualViewport;
el('game').classList.remove('active');A.actualSyncMobileViewport();
ok(pile.parentElement===table&&controls.parentElement===boardWrap&&!body.classList.contains('game-mobile'),'Leaving a match restores desktop anchors instead of retaining stale mobile placement');
el('game').classList.add('active');A.actualSyncMobileViewport();

// Execute the actual player draw click after moving its original DOM node.
ctx.tutorialAllowsAction=()=>true;ctx.localSeat=()=>0;ctx.localTurnReady=()=>true;ctx.renderHand=ctx.renderStatus=ctx.renderAll=()=>{};
run('game=new Game(2,{},null,{fastTest:true,kourindouEnabled:false});game.currentPlayerIdx=0;game.players[0].isAI=false;game.players.forEach((p,i)=>p.hand=[i?"marisa":"reimu"]);game.drawPile=["mtn_sanae","hell_komachi"];pendingCellChoice=null;var humanActionResolving=false;');
let resolved=0;ctx.window.__resolveHumanTurn=()=>resolved++;
const drawStart=js.indexOf("el('draw-btn').addEventListener('click', async () => {");vm.runInContext(js.slice(drawStart,js.indexOf('\n});',drawStart)+4),ctx);
let soundPresses=0;sound.addEventListener('click',()=>soundPresses++);
(async()=>{
 await draw.events.click[0]();sound.events.click[0]();
 ok(resolved===1&&run('game.drawPile.length===0&&game.players.every(p=>p.hand.length===2)')&&soundPresses===1,'The moved original draw button executes the real shared draw once, and the sound button keeps its listener');
 A.actualSyncMobileViewport();ctx.drawFlightSerial=0;ctx.drawPileLiftTimer=null;
 vm.runInContext(one('updateDrawPileDisplay')+'\n'+one('showDrawFlight'),ctx);
 let anchorReads=0;el('draw-pile-face').getBoundingClientRect=()=>{anchorReads++;return {left:body.classList.contains('mobile-mirrored')?720:70,top:280,width:22,height:27};};
 handArea.rect={left:0,top:40,width:190,height:300};
 for(const mirror of [false,true]){
  body.classList.toggle('mobile-mirrored',mirror);run('showDrawFlight({playerIdx:0});');const flight=body.children.at(-1);
  assert.equal(flight.style.left,((mirror?720:70)-15)+'px');assert.equal(flight.style.top,'259.5px');assert.equal(flight.className,'pile-card-face draw-flight-card');
 }
 ok(anchorReads===2,'Real draw flights measure the relocated pile face on both normal and mirrored phone layouts');
 reduced=true;const count=body.children.length;run('showDrawFlight({playerIdx:0});');
 ok(body.children.length===count&&el('draw-pile-count').textContent==='0','Reduced-motion draws still update the correct pile count without adding a flight');
 const result={status:'pass',count:checks.length,checks,layouts,scope:'Actual persistence and menu/match star renderers; phone docking, original draw handler and flight functions, controlled portrait/landscape/shop/mirror/visual-viewport rectangles and desktop restoration. CSS declarations and sizing are checked; physical browser pixels and phone FPS are not measured.'};
 fs.writeFileSync(__dirname+'/gold-stars-mobile-draw-2026-10-17-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' gold-star and mobile draw-area checks passed');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
