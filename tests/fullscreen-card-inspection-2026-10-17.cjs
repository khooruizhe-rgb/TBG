// Real inspection, shared title/story gestures and fullscreen callbacks.
// Native dialog ordering is modeled explicitly; this is not browser pixel QA.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),js=html.split('<script>')[1].split('</script>')[0],css=html.split('<style>')[1].split('</style>')[0];
const fixture=fs.readFileSync(__dirname+'/card-materials-2026-10-12.cjs','utf8'),marker="const copy='created_card_910'",box={module:{exports:{}},require,__dirname,console};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,A,el,Element,documentFixture,documentListeners,windowListeners};',box);
const {ctx,A,el,Element,documentFixture:document,documentListeners,windowListeners}=box.module.exports,run=code=>vm.runInContext(code,ctx),checks=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
let completed=false;process.once('beforeExit',()=>{if(!completed&&!process.exitCode){console.error('Fullscreen inspection checks did not finish.');process.exitCode=1;}});
let now=1000;ctx.Date={now:()=>now};ctx.performance={now:()=>now};ctx.cancelAnimationFrame=()=>{};ctx.ui={};ctx.online=null;ctx.touchHandDrag=null;ctx.navigator={maxTouchPoints:1};ctx.screen={orientation:{lock:async()=>{},unlock(){}}};
ctx.window.matchMedia=query=>({matches:query.includes('coarse')});ctx.window.scrollTo=()=>{};ctx.window.innerWidth=844;ctx.window.innerHeight=390;ctx.window.localStorage={getItem:()=>null,setItem(){}};
Element.prototype.contains=function(node){for(;node;node=node.parentElement)if(node===this)return true;return false;};
Element.prototype.getAttribute=function(name){return this.attributes[name]??null;};
Element.prototype.prepend=function(node){this.appendChild(node);this.children.unshift(this.children.pop());};
Element.prototype.closest=function(){return null;};
Element.prototype.setPointerCapture=function(id){(this.captures||=new Set()).add(id);};Element.prototype.hasPointerCapture=function(id){return this.captures?.has(id)||false;};Element.prototype.releasePointerCapture=function(id){this.captures?.delete(id);};
const oldRect=Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect=function(){
 if(!this.dataset.titlePreview&&!this.dataset.storyCard)return oldRect.call(this);
 const number=(value,total)=>String(value).endsWith('%')?parseFloat(value)*total/100:parseFloat(value)||0,w=this.dataset.storyCard==='true'?parseFloat(el('story-card-grid').values.get('--story-card-width'))||140:93;
 const x=number(this.values.get('--table-x'),ctx.window.innerWidth),y=number(this.values.get('--table-y'),ctx.window.innerHeight),h=w*4/3;
 return {left:x-w/2,top:y-h/2,right:x+w/2,bottom:y+h/2,width:w,height:h};
};
const walk=node=>node.children.flatMap(child=>[child,...walk(child)]);
document.querySelectorAll=selector=>walk(document.body).filter(node=>node.classList.contains(selector.slice(1)));
for(const id of ['title-table-cards','game','setup','story-overlay','story-panel','card-detail-overlay','rule-term-popover'])document.body.appendChild(el(id));
el('card-detail-overlay').appendChild(el('card-detail'));const effect=new Element();effect.appendChild(el('card-detail-description'));el('card-detail').appendChild(effect);
document.documentElement.appendChild(document.body);el('story-card-grid').rect={left:20,top:100,width:804,height:220,right:824,bottom:320};el('story-panel').appendChild(el('story-card-grid'));
vm.runInContext(js.slice(js.indexOf('let titleCardDrag='),js.indexOf('function cardChoiceGroupSeat(')),ctx);
vm.runInContext(js.slice(js.indexOf('/* Guided practice uses'),js.indexOf('/* CSS lays out the phone table')),ctx);
vm.runInContext(js.slice(js.indexOf('function fullscreenElement(){'),js.indexOf("el('fullscreen-btn').addEventListener('click'")),ctx);
const overlay=el('card-detail-overlay'),popover=el('rule-term-popover'),layer=[],closeEvents=[];let shows=0,closes=0;
const remove=node=>{const i=layer.indexOf(node);if(i>=0)layer.splice(i,1);};
overlay.open=false;overlay.showModal=function(){if(this.open)return;this.open=true;remove(this);layer.push(this);shows++;};
overlay.close=function(){if(!this.open)return;this.open=false;remove(this);closes++;closeEvents.push(()=>dispatch(this,'close'));};
document.documentElement.requestFullscreen=()=>{document.fullscreenElement=document.documentElement;remove(document.documentElement);layer.push(document.documentElement);return Promise.resolve();};
document.exitFullscreen=()=>{remove(document.documentElement);document.fullscreenElement=null;return Promise.resolve();};
function dispatch(node,type,extra={}){const event={type,currentTarget:node,target:node,button:0,pointerId:3,pointerType:'touch',detail:1,clientX:80,clientY:90,isTrusted:true,timeStamp:now,preventDefault(){this.prevented=true;},stopPropagation(){},...extra};for(const handler of node.events[type]||[])handler(event);return event;}
function flushClose(){while(closeEvents.length)closeEvents.shift()();}
function tap(node){const r=node.getBoundingClientRect(),point={clientX:r.left+r.width/2,clientY:r.top+r.height/2};dispatch(node,'pointerdown',point);now+=40;dispatch(node,'pointerup',point);now+=100;}
async function settle(){for(let i=0;i<8;i++)await Promise.resolve();flushClose();}
const noGame=()=>{A.setGame(null);run('storyState=null;');el('game').classList.remove('active');};
function menuCard(){noGame();run('renderTitleTableCards();');return el('title-table-cards').children[0];}
function introCard(chapter){noGame();run('showStoryChapterIntro('+chapter+');');return el('story-card-grid').children[0];}
function assertOpen(id){assert(overlay.open&&overlay.classList.contains('show'));assert.equal(layer.at(-1),overlay);assert(el('card-detail-name').textContent);assert.equal(run('detailCardId'),id);assert.equal(popover.parentElement,overlay);}
(async()=>{
 assert(/<dialog id="card-detail-overlay"[^>]*role="dialog"/.test(html));ok(css.includes('#card-detail-overlay::backdrop{background:transparent;}'),'Inspection is a native dialog with a fullscreen-sized, independently styled backdrop');
 await run('requestGameFullscreen();');assert.equal(document.fullscreenElement,document.documentElement);
 for(const language of ['en','zh-CN']){
  A.setLanguage(language);let card=menuCard();tap(card);tap(card);assertOpen(card.dataset.cardId);
  ok(document.fullscreenElement===document.documentElement,'The actual '+language+' menu double tap opens native inspection while staying fullscreen');
  dispatch(el('card-detail'),'dblclick');flushClose();ok(!overlay.open&&!overlay.classList.contains('show')&&document.activeElement===card&&popover.parentElement===document.body,'Double-tap dismissal closes the native modal, restores the '+language+' card focus and releases the rule popup');
  for(const chapter of [2,3,4,5,6]){
   now+=600;card=introCard(chapter);const before=card.getBoundingClientRect();tap(card);assertOpen(card.dataset.cardId);
   assert(card.classList.contains('story-card-seen'));assert.deepEqual(card.getBoundingClientRect(),before);
   ok(true,'A single '+language+' tap opens a chapter '+chapter+' introduction card in fullscreen without moving it');
   dispatch(overlay,'cancel');flushClose();assert(!overlay.open&&el('story-overlay').classList.contains('show'));
  }
 }
 A.setLanguage('en');noGame();run('game=new Game(2,{},null,{aiDifficulty:"easy"});');el('game').classList.add('active');A.renderHand();
 const handState=run('JSON.stringify(game.testRuleState())'),handCard=el('hand').children[0];dispatch(handCard,'dblclick');assertOpen(handCard.dataset.cardId);A.closeCardDetails();flushClose();
 ok(run('JSON.stringify(game.testRuleState())')===handState,'Native inspection of an actual in-match hand card preserves the board, hands and turn');
 let card=menuCard();dispatch(card,'keydown',{key:'i'});assertOpen(card.dataset.cardId);ok(true,'Keyboard inspection uses the same native modal in fullscreen');
 effect.scrollTop=47;const before=el('card-detail-description').innerHTML,focus=el('card-detail');focus.focus();const baselineShows=shows;
 // Model the browser promoting fullscreen after inspection has already opened.
 await document.documentElement.requestFullscreen();assert.equal(layer.at(-1),document.documentElement);run('onGameFullscreenChange();');flushClose();
 ok(shows===baselineShows+1&&overlay.open&&layer.at(-1)===overlay&&effect.scrollTop===47&&el('card-detail-description').innerHTML===before&&document.activeElement===focus,'A late fullscreen promotion re-raises inspection without losing rules, scroll position or focus');
 const anchor=new Element();anchor.dataset.ruleTerm='cost';el('card-detail').appendChild(anchor);ctx.termAnchor=anchor;run('openRuleTerm("cost",termAnchor);');
 ok(!popover.hidden&&popover.parentElement===overlay&&overlay.contains(popover),'Cost/Wasteland help remains inside the native modal rather than an inert background');
 await run('toggleGameFullscreen();');flushClose();ok(!document.fullscreenElement&&overlay.open&&layer.at(-1)===overlay&&!popover.hidden&&popover.parentElement===overlay,'Leaving fullscreen keeps the open card and its rule popup usable');
 A.closeCardDetails();flushClose();await run('requestGameFullscreen();');A.openCardDetails('sdm_remilia');effect.scrollTop=59;A.openCardDetails('hourai_kaguya',{followReference:true});
 const remembered=run('detailHistory.length');await document.documentElement.requestFullscreen();run('onGameFullscreenChange();');flushClose();assert.equal(run('detailHistory.length'),remembered);
 let cancel=dispatch(overlay,'cancel');ok(cancel.prevented&&overlay.open&&run('detailCardId')==='sdm_remilia'&&effect.scrollTop===59,'Native cancel returns from a referenced card before dismissing its source, preserving saved scroll');
 cancel=dispatch(overlay,'cancel');flushClose();ok(cancel.prevented&&!overlay.open&&run('detailHistory.length')===0,'A second native cancel closes the original inspection and clears history');
 A.openCardDetails('mtn_sanae');overlay.close();flushClose();ok(!overlay.classList.contains('show')&&popover.parentElement===document.body&&run('detailCardId')===null,'A browser-driven dialog close cleans the application state and popup host');
 A.openCardDetails('hourai_mokou');A.closeCardDetails();A.openCardDetails('haku_yuyuko');flushClose();assertOpen('haku_yuyuko');ok(true,'A queued close from the previous card cannot dismiss a newly reopened inspection');A.closeCardDetails();flushClose();
 // The initial trusted tap starts fullscreen in capture phase, then inspects.
 await run('toggleGameFullscreen();');card=introCard(2);run('mobileFullscreenArmed=true;');const r=card.getBoundingClientRect(),point={clientX:r.left+r.width/2,clientY:r.top+r.height/2};
 dispatch(card,'pointerdown',point);ctx.autoEvent={type:'pointerup',target:card,isTrusted:true};run('onAutomaticMobileFullscreen(autoEvent);');dispatch(card,'pointerup',point);await settle();
 assertOpen(card.dataset.cardId);ok(document.fullscreenElement===document.documentElement,'A first trusted introduction tap can enter fullscreen and still display the selected card');A.closeCardDetails();flushClose();
 const nativeShow=overlay.showModal,nativeClose=overlay.close;delete overlay.showModal;delete overlay.close;A.openCardDetails('mtn_aya');
 ok(overlay.classList.contains('show')&&run('detailCardId')==='mtn_aya','Browsers without native dialog methods retain the previous overlay inspection');A.closeCardDetails();assert(!overlay.classList.contains('show'));
 overlay.showModal=()=>{throw Error('Native dialog temporarily unavailable');};overlay.close=nativeClose;A.openCardDetails('mtn_sanae');ok(overlay.classList.contains('show'),'An unavailable native modal falls back to the visible overlay without aborting inspection');A.closeCardDetails();overlay.showModal=nativeShow;flushClose();

 vm.runInContext(js.slice(js.indexOf('let announcedGameResult='),js.indexOf('/* Printed creation choices:')),ctx);
 for(const name of ['publishSnapshot','renderBoard','renderHand','renderPlayers','renderLog','renderStatus'])ctx[name]=()=>{};
 for(const reason of ['winner','stalemate']){
  noGame();run('game=new Game(2,{},null,{aiDifficulty:"easy"});');A.openCardDetails('mtn_sanae');assert(overlay.open);
  run(reason==='winner'?'game.winner=game.players[1];':'game.stalemateMessage="Test stalemate.";');run('renderAll(true);');flushClose();
  ok(!overlay.open&&!overlay.classList.contains('show')&&el('winner-banner').classList.contains('show'),'A '+reason+' announcement closes native inspection so the result and menu remain accessible');
 }
 noGame();el('winner-banner').classList.remove('show');

 const declaration=(selector,property,source=css)=>{let value;for(const rule of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)){if(!rule[1].split(',').map(s=>s.trim()).includes(selector))continue;for(const entry of rule[2].split(';')){const colon=entry.indexOf(':');if(entry.slice(0,colon).trim()===property)value=entry.slice(colon+1).trim();}}return value;};
 const clamp=(expression,width,cardWidth)=>{let result=expression.replace(/var\(--memory-card-width,var\(--title-preview-card-width\)\)|var\(--story-card-width\)/g,String(cardWidth));result=result.replace(/([.\d]+)vw/g,(_,n)=>String(Number(n)*width/100)).replace(/([.\d]+)px/g,'$1').replace(/calc\(([^()]*)\)/g,(_,value)=>String(vm.runInNewContext(value)));const m=result.match(/^clamp\(([^,]+),([^,]+),([^,]+)\)$/);assert(m,result);return Math.max(Number(m[1]),Math.min(Number(m[3]),Number(m[2])));};
 const mobileBlocks=[...css.matchAll(/@media\(max-width:980px\),\(any-pointer:coarse\)\{([\s\S]*?)\n\}/g)].map(m=>m[1]),detailCSS=mobileBlocks.find(s=>s.includes('.card-detail-header')),introCSS=mobileBlocks.find(s=>s.includes('#story-card-grid'));
 assert(detailCSS&&introCSS);const landscapeCSS=css.match(/@media\(orientation:landscape\) and \(max-height:700px\) and \(max-width:1400px\)\{([\s\S]*?)\n\}/)[1];
 for(const [width,height,cardWidth]of [[320,568,63],[390,844,96],[844,390,93],[960,432,109]]){
  const name=clamp(declaration('.title-preview-compact .board-card .cname','font-size'),width,cardWidth),icon=clamp(declaration('.title-preview-compact .board-card .card-faction-badge','--card-faction-icon-size'),width,cardWidth);
  assert(name>Math.max(8,Math.min(16,cardWidth*.10)));assert(icon<Math.max(12,Math.min(28,cardWidth*.18)));
  ok(true,'Mobile menu text grows and its faction badge shrinks at '+width+'×'+height);
  const introWidth=width<height?149:120,introName=clamp(declaration('#story-card-grid .story-ability-card .cname','font-size',introCSS),width,introWidth),introIcon=clamp(declaration('#story-card-grid .story-ability-card .card-faction-badge','--card-faction-icon-size',introCSS),width,introWidth);
  ok(introName>Math.max(11,Math.min(17,introWidth*.076))&&introIcon<30,'The introduction keeps its card size while increasing its name and reducing its emblem at '+width+'×'+height);
  const source=width>height?landscapeCSS:detailCSS,text=clamp(declaration('.card-detail-description','font-size',source),width,0),badge=Number(declaration('.card-detail-header','--detail-icon-size',source).replace('px',''));
  ok(text>=(width>height?14:16)&&badge<64,'Inspection uses readable rules and a smaller header emblem before a match starts at '+width+'×'+height);
 }
 for(const handWidth of [126,174,232]){const m=A.mobileHandMetrics(handWidth,240,7),cardWidth=(handWidth-10-(m.columns-1)*4)/m.columns;ok(m.font>Math.max(7,Math.min(10,cardWidth*.15)),'Hand text grows without changing the existing column count at width '+handWidth);}
 ok(declaration('body.game-mobile .board-card .card-faction-badge','--card-faction-icon-size').includes('13px')&&!css.includes('body.mobile-landscape .card-detail-description{font-size:11px'),'Board badges are smaller and the obsolete tiny in-match-only inspection style is removed');
 const result={status:'pass',count:checks.length,checks,nativeShows:shows,nativeCloses:closes,scope:'Actual menu/story taps, card rendering, native dialog presentation and close/cancel events, fullscreen entry/exit and late promotion, rule popup ownership, reference history, stale-close handling, fallback and mobile typography formulas in a controlled DOM. Browser/device pixels are not verified.'};
 fs.writeFileSync(__dirname+'/fullscreen-card-inspection-2026-10-17-results.json',JSON.stringify(result,null,2)+'\n');completed=true;console.log(result.count+' fullscreen card inspection and mobile typography checks passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
