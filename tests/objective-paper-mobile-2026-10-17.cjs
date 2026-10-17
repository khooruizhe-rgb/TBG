// Actual menu sizing, story openers and paper handlers with deterministic geometry.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),js=html.split('<script>')[1].split('</script>')[0];
const fixture=fs.readFileSync(__dirname+'/table-previews.cjs','utf8'),marker="test('The full-screen menu grid",box={module:{exports:{}},require,__dirname,console,process:{argv:[]}};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,A,Element,window,document,el,render,dispatch,events,storage};',box);
const {ctx,A,Element,window,document,el,render,dispatch,events,storage}=box.module.exports,run=code=>vm.runInContext(code,ctx),checks=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
Element.prototype.append=function(...nodes){nodes.forEach(node=>this.appendChild(node));};
Element.prototype.contains=function(node){while(node){if(node===this)return true;node=node.parentElement;}return false;};
Element.prototype.closest=function(selector){for(let node=this;node;node=node.parentElement)if(selector.split(',').includes(node.tagName?.toLowerCase()))return node;return null;};
Element.prototype.prepend=function(node){this.appendChild(node);this.children.unshift(this.children.pop());};
for(const [width,height]of [[320,568],[390,844],[844,390],[960,432]]){
 window.innerWidth=width;window.innerHeight=height;const cards=render().slice(),expected=A.titleMemoryLayout().width;
 ok(cards.length===10&&cards.every(card=>card.classList.contains('title-preview-compact')&&Math.abs(card.getBoundingClientRect().width-expected)<1e-8),'All ten mobile menu cards use the memory game width at '+width+'×'+height);
 for(const card of cards){const before=card.dataset.cardId;dispatch(card,'click');assert.equal(card.dataset.cardId,before);}
 ok(A.memory()===null,'Small menu cards still flip independently at '+width+'×'+height);
 for(const handler of events.resize)handler();assert(cards.every(card=>Math.abs(card.getBoundingClientRect().width-expected)<1e-8));
}
window.innerWidth=1200;window.innerHeight=800;let cards=render().slice();ok(cards.every(card=>!card.classList.contains('title-preview-compact')),'Desktop preview cards retain their normal size');
window.innerWidth=844;window.innerHeight=390;for(const handler of events.resize)handler();ok(cards.every(card=>card.classList.contains('title-preview-compact')&&card.getBoundingClientRect().width===A.titleMemoryLayout().width),'Rotating or resizing existing menu cards updates their size without replacing them');
window.innerWidth=1200;window.innerHeight=800;for(const handler of events.resize)handler();ok(cards.every(card=>!card.classList.contains('title-preview-compact')),'Returning to desktop restores the original menu presentation');

const coach=el('tutorial-coach'),handle=el('tutorial-paper-handle'),content=el('tutorial-paper-content'),fold=el('tutorial-paper-fold');
handle.tagName='DIV';fold.tagName='BUTTON';coach.hidden=true;handle.append(el('tutorial-progress'),el('tutorial-title'),fold);content.append(el('tutorial-copy'),el('tutorial-feedback'),el('tutorial-back'),el('tutorial-retry'),el('tutorial-next'));coach.append(handle,content);el('log-panel').appendChild(coach);document.body.appendChild(el('log-panel'));
let expandedHeight=285,resizeObserver;
ctx.ResizeObserver=class{constructor(fn){resizeObserver=fn;}observe(node){assert.equal(node,coach);}};
Object.defineProperties(coach,{
 offsetWidth:{get(){const width=coach.classList.contains('paper-folded')?(coach.classList.contains('paper-compact')?190:222):coach.classList.contains('paper-compact')?300:342;return Math.min(width,window.innerWidth-24,parseFloat(coach.values.get('--objective-paper-width'))||Infinity);}},
 offsetHeight:{get(){return Math.min(coach.classList.contains('paper-folded')?62:expandedHeight,parseFloat(coach.values.get('--objective-paper-room'))||window.innerHeight-24);}}
});
ctx.ui={};ctx.online=null;ctx.pendingHandChoice=null;ctx.pendingCellChoice=null;ctx.pendingRectChoice=null;ctx.selectedHandCard=null;ctx.humanActionResolving=false;ctx.renderAll=()=>{};ctx.ruleTextHtml=value=>String(value);ctx.runNextTurn=()=>{};ctx.closeAITestDashboard=()=>{};ctx.updateAITestControls=()=>{};
vm.runInContext(js.slice(js.indexOf('/* Guided practice uses'),js.indexOf('/* CSS lays out the phone table')),ctx);
ctx.runTutorialTurn=()=>{};
ctx.resetGameView=()=>run('if(game)game.cancelled=true;clearTutorialPractice();clearStoryMatch();game=null;');ctx.returnToMainMenu=ctx.resetGameView;
const state=()=>run('objectivePaperState'),pos=()=>({x:parseFloat(coach.values.get('--objective-paper-x')),y:parseFloat(coach.values.get('--objective-paper-y'))}),snapshot=()=>run('JSON.stringify({match:game.testRuleState(),progress:game.storyMatch,knowledge:game.handKnowledge.map(memory=>[...memory])})');
const pointer=(type,x,y,extra={})=>dispatch(handle,type,{target:handle,pointerId:19,clientX:x,clientY:y,...extra});
function inside(){const p=pos(),v=run('objectivePaperViewport()');return p.x>=v.left+11.99&&p.y>=v.top+11.99&&p.x+coach.offsetWidth<=v.left+v.width-11.99&&p.y+coach.offsetHeight<=v.top+v.height-11.99;}
for(const [width,height]of [[320,568],[390,844],[844,390],[960,432],[1200,800]]){
 window.innerWidth=width;window.innerHeight=height;ctx.resetGameView();run('openStoryChapter(2);');
 const compact=width<=980,match=run('game'),initial=snapshot(),saved=JSON.stringify([...storage]);
 ok(coach.parentElement===document.body&&state().folded===compact&&content.hidden===compact&&inside(),'Chapter two opens a floating, correctly folded and bounded paper at '+width+'×'+height);
 if(compact){dispatch(fold,'click',{target:fold});assert(!state().folded&&!content.hidden);}
 ok(!content.hidden&&fold.attributes['aria-expanded']==='true'&&inside(),'Unfolding keeps the entire readable sheet inside '+width+'×'+height);
 const before=pos();pointer('pointerdown',before.x+35,before.y+20);pointer('pointermove',before.x-85,before.y+75);
 const dragged=pos();assert(state().drag&&handle.hasPointerCapture(19));run('game.storyMatch.progress.remilia=true;updateStoryProgress();dockTutorialCoach('+compact+');');
 ok(state().drag&&handle.hasPointerCapture(19)&&pos().x===dragged.x&&pos().y===dragged.y,'A real objective update and layout refresh preserve the current pointer grip at '+width+'×'+height);
 pointer('pointerup',before.x-85,before.y+75);ok(!state().drag&&!handle.hasPointerCapture(19)&&inside(),'Releasing a moved paper clears its capture and preserves its position at '+width+'×'+height);
 run('game.storyMatch.progress.remilia=false;');assert.equal(snapshot(),initial);assert.equal(run('game'),match);assert.equal(JSON.stringify([...storage]),saved);
 for(const [x,y]of [[-500,-500],[5000,5000]]){const start=pos();pointer('pointerdown',start.x+25,start.y+15);pointer('pointermove',x,y);pointer('pointerup',x,y);assert(inside());}
 ok(true,'Dragging toward either offscreen corner cannot lose the paper at '+width+'×'+height);
 const start=pos();pointer('pointerdown',start.x+25,start.y+15);pointer('pointermove',start.x+60,start.y+45);pointer('pointercancel',0,0);assert.deepEqual(pos(),start);assert(!handle.hasPointerCapture(19));
 ok(true,'A cancelled gesture restores its starting position and releases capture at '+width+'×'+height);
 document.activeElement=el('tutorial-retry');dispatch(fold,'click',{target:fold});ok(content.hidden&&document.activeElement===fold&&fold.attributes['aria-expanded']==='false','Folding moves focus out of hidden actions at '+width+'×'+height);
 run('renderStoryCoach();dockTutorialCoach(false);');ok(content.hidden&&state().userFolded,'Objective rerenders and viewport refreshes respect a player’s fold choice at '+width+'×'+height);
 dispatch(handle,'keydown',{target:handle,key:'Enter'});assert(!content.hidden);dispatch(handle,'keydown',{target:handle,key:'ArrowLeft'});assert(inside());
 const controls=state().folded;dispatch(handle,'keydown',{target:fold,key:'Enter'});assert.equal(state().folded,controls);
 ok(true,'Keyboard movement and folding work without intercepting navigation-button keys at '+width+'×'+height);
 assert.equal(snapshot(),initial);assert.equal(run('game'),match);assert.equal(JSON.stringify([...storage]),saved);
}
window.innerWidth=844;window.innerHeight=390;ctx.resetGameView();run('openStoryChapter(5);');dispatch(fold,'click',{target:fold});run('positionObjectivePaper(999,999);');
expandedHeight=350;resizeObserver();ok(inside(),'A growing hint or checklist is clamped back inside the visible viewport');
window.visualViewport={offsetLeft:23,offsetTop:30,width:390,height:240};run('dockTutorialCoach(true);');ok(inside()&&coach.offsetWidth<=366&&coach.offsetHeight<=216&&!content.hidden,'A resized visual viewport keeps an unfolded note above the software keyboard without losing the user’s fold choice');
delete window.visualViewport;window.innerWidth=390;window.innerHeight=844;for(const handler of events.resize)handler();run('dockTutorialCoach(true);');ok(inside()&&!content.hidden,'Rotating into portrait keeps the user’s paper accessible');
let p=pos();pointer('pointerdown',p.x+20,p.y+20);pointer('pointermove',p.x+60,p.y+50);for(const handler of events.blur)handler();ok(!state().drag&&!handle.hasPointerCapture(19)&&inside(),'Losing focus cancels an active paper drag without leaving a stuck pointer');
pointer('pointerdown',p.x+20,p.y+20,{target:fold});ok(!state().drag,'Pressing the fold button never starts a paper drag');
run('game.storyMatch.progress.newsGuess=true;updateStoryProgress();');dispatch(el('tutorial-retry'),'click',{target:el('tutorial-retry')});ok(state().folded&&content.hidden&&!run('game.storyMatch.progress.newsGuess'),'Retry starts a fresh compact story sheet and resets only the new match’s objectives');
ctx.resetGameView();run('openTutorial(0);');ok(!state().folded&&!content.hidden&&coach.parentElement===document.body,'Guided teaching instructions start unfolded on a phone');
ctx.resetGameView();run('game=new Game(2,{},null,{aiDifficulty:"hard"});dockTutorialCoach(true);');ok(coach.hidden&&!state().owner,'Ordinary matches never show a leftover objective sheet');
const css=html.split('<style>')[1].split('</style>')[0];ok(/#tutorial-coach\{position:fixed/.test(css)&&css.includes('#tutorial-paper-content[hidden]{display:none;}')&&css.includes('#tutorial-paper-handle')&&css.includes('touch-action:none')&&css.includes('#tutorial-paper-content{animation:none;}'),'The sheet floats outside layout, folds out of interaction, provides a touch handle and honors reduced motion');
const result={status:'pass',count:checks.length,checks,scope:'Real shared menu layout and resize handlers, story/tutorial openers, paper pointer/keyboard/fold handlers, objective updates, retries and focus/capture cleanup; phone geometry includes portrait, landscape and a software-keyboard visual viewport. Controlled DOM, not browser pixels.'};
fs.writeFileSync(__dirname+'/objective-paper-mobile-2026-10-17-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' mobile preview and objective paper checks passed');
