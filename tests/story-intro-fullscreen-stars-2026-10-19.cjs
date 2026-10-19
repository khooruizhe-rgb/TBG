// Real story intro gestures, layout lifecycle, persistence and star renderers.
// Controlled rectangles model CSS containing blocks and rotated card bounds;
// this is not a physical-phone or browser pixel test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),js=html.split('<script>')[1].split('</script>')[0],css=html.split('<style>')[1].split('</style>')[0];
new vm.Script(js);
const source=fs.readFileSync(__dirname+'/fullscreen-card-inspection-2026-10-17.cjs','utf8'),box={module:{exports:{}},require,__dirname,console,process:{once(){}}};
vm.runInNewContext(source.slice(0,source.indexOf('(async()=>{'))+'\nmodule.exports={ctx,A,el,Element,document,documentListeners,windowListeners,run,dispatch,introCard,flushClose};',box);
const {ctx,A,el,Element,document,documentListeners,windowListeners,run,dispatch,introCard,flushClose}=box.module.exports,checks=[],ok=(v,n)=>{assert(v,n);checks.push(n);};
run(js.slice(js.indexOf('const DEFAULT_CROWN_LIGHT'),js.indexOf('let previousCrownSoundIndex')));
let nextFrame=0;const frames=new Map(),observers=[],viewportListeners=new Map(),storage=new Map();
ctx.requestAnimationFrame=fn=>{const id=++nextFrame;frames.set(id,fn);return id;};ctx.cancelAnimationFrame=id=>frames.delete(id);
ctx.ResizeObserver=class{constructor(fn){this.callback=fn;this.targets=[];this.connected=true;observers.push(this);}observe(node){this.targets.push(node);}disconnect(){this.connected=false;this.targets=[];}};
ctx.window.visualViewport={addEventListener:(type,fn)=>viewportListeners.set(type,[...(viewportListeners.get(type)||[]),fn]),removeEventListener:(type,fn)=>viewportListeners.set(type,(viewportListeners.get(type)||[]).filter(x=>x!==fn))};
ctx.window.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
const grid=el('story-card-grid');grid.clientLeft=1;grid.clientTop=1;
const rules=[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)],declaration=(selector,key)=>{
 let value;for(const rule of rules)if(rule[1].split(',').map(s=>s.trim()).includes(selector))for(const entry of rule[2].split(';')){const i=entry.indexOf(':');if(entry.slice(0,i).trim()===key)value=entry.slice(i+1).trim();}return value;
};
const selector='#story-card-grid .story-ability-card';
ok(declaration(selector,'position')==='absolute'&&declaration('#story-card-grid','position')==='relative'&&declaration(selector,'left')==='calc(var(--table-x) - var(--story-grid-left,0px))'&&declaration(selector,'top')==='calc(var(--table-y) - var(--story-grid-top,0px))','Introduction cards use the grid containing block and translate shared screen-space gesture coordinates to grid-local positions');
const oldRect=Element.prototype.getBoundingClientRect,width=()=>parseFloat(grid.values.get('--story-card-width'))||190;
Object.defineProperty(Element.prototype,'offsetWidth',{configurable:true,get(){return this.dataset.storyCard==='true'?width():undefined;}});
Object.defineProperty(Element.prototype,'offsetHeight',{configurable:true,get(){return this.dataset.storyCard==='true'?width()*4/3:undefined;}});
Element.prototype.getBoundingClientRect=function(){
 if(this.dataset.storyCard!=='true')return oldRect.call(this);
 const area=grid.rect,w=width(),h=w*4/3,a=(parseFloat(this.values.get('--table-angle'))||0)*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),rw=w*c+h*s,rh=w*s+h*c;
 // Absolute card origin is the grid padding box, including a one-pixel border.
 const x=area.left+grid.clientLeft+parseFloat(this.values.get('--table-x')||0)-parseFloat(grid.values.get('--story-grid-left')||0),y=area.top+grid.clientTop+parseFloat(this.values.get('--table-y')||0)-parseFloat(grid.values.get('--story-grid-top')||0);
 return {left:x-rw/2,top:y-rh/2,right:x+rw/2,bottom:y+rh/2,width:rw,height:rh};
};
const flush=()=>{for(let i=0;frames.size&&i<5;i++){const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(1000));}assert.equal(frames.size,0);};
const cards=()=>grid.children,close=()=>{A.closeCardDetails();flushClose();run('closeStoryMenu();');};
function size(w,h){ctx.window.innerWidth=w;ctx.window.innerHeight=h;const left=18+(w<=600?16:23),height=w>h&&h<=600?Math.max(160,h*.48):w<=600?Math.max(240,h*.5):Math.max(220,Math.min(430,h*.52));grid.rect={left,top:120,width:w-left*2,height,right:w-left,bottom:120+height};}
function bounds(){const area=grid.rect;for(const node of cards()){const r=node.getBoundingClientRect();assert(r.left>=area.left-.01&&r.right<=area.right+.01&&r.top>=area.top-.01&&r.bottom<=area.bottom+.01,JSON.stringify({id:node.dataset.cardId,r,area}));assert(r.left>=0&&r.right<=ctx.window.innerWidth);}return cards().map(node=>node.getBoundingClientRect());}
function separate(){const rects=bounds();for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];assert(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,'Cards must not cover one another after an automatic rearrangement');}}
function tap(node){const r=node.getBoundingClientRect(),point={clientX:(r.left+r.right)/2,clientY:(r.top+r.bottom)/2};dispatch(node,'pointerdown',point);dispatch(node,'pointerup',point);assert(el('card-detail-overlay').open&&run('detailCardId')===node.dataset.cardId);A.closeCardDetails();flushClose();}
(async()=>{
 const viewports=[[320,568],[390,844],[568,320],[667,375],[844,390],[932,430],[1024,768],[1280,800]],layouts=[];
 for(const [w,h]of viewports)for(let chapter=2;chapter<=13;chapter++){
  size(w,h);introCard(chapter);flush();separate();
  const ordered=cards().slice().sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);tap(ordered[0]);tap(ordered.at(-1));
  layouts.push({w,h,chapter,cards:cards().length,width:width()});
  ok(true,'All chapter '+chapter+' cards fit without overlap and both edge cards open at '+w+'×'+h);close();
 }
 // Reproduce the real automatic portrait -> fullscreen landscape transition.
 size(390,844);introCard(2);flush();assert.equal(run('storyIntroSession.columns'),2);
 size(844,390);document.fullscreenElement=document.documentElement;run('onGameFullscreenChange();');assert(frames.size>0);flush();
 separate();assert.equal(run('storyIntroSession.columns'),4);assert.equal(new Set(cards().map(n=>Number(n.dataset.storyX))).size,4);
 ok(true,'Fullscreen entry without a window resize replaces the old two-row positions with four distinct visible positions');
 for(const index of [0,3])tap(cards()[index]);ok(true,'Both outer cards remain directly inspectable after the same fullscreen transition');
 const moved=cards()[1];dispatch(moved,'keydown',{key:'ArrowRight'});const saved=Number(moved.dataset.storyX);run('onGameFullscreenChange();');flush();
 ok(Math.abs(Number(moved.dataset.storyX)-saved)<.000001,'A refresh with the same row/column count preserves a manually moved card');
 size(390,844);document.fullscreenElement=null;run('onGameFullscreenChange();');flush();separate();
 ok(run('storyIntroSession.columns')===2&&new Set(cards().map(n=>n.dataset.storyY)).size===2,'Leaving fullscreen restores two rows without leaving cards hidden behind one another');
 size(932,430);for(const fn of viewportListeners.get('resize')||[])fn();flush();separate();
 ok(run('storyIntroSession.columns')===4,'Visual viewport changes also refresh the introduction even when the window resize event is absent');
 const activeObserver=observers.findLast(observer=>observer.connected);assert(activeObserver.targets.includes(grid));
 size(375,667);activeObserver.callback([]);activeObserver.callback([]);assert.equal(frames.size,1);flush();separate();
 ok(run('storyIntroSession.columns')===2,'Grid size observation coalesces duplicate notifications and recomputes the two-row layout');
 const before=cards().map(node=>node.getBoundingClientRect());grid.rect={...grid.rect,top:grid.rect.top-70,bottom:grid.rect.bottom-70};
 const scrolled=cards().map(node=>node.getBoundingClientRect());assert(scrolled.every((r,i)=>Math.abs(r.top-before[i].top+70)<.001));
 for(const handler of el('story-panel').events.scroll||[])handler({target:el('story-panel')});
 assert(cards().every((node,i)=>Math.abs(node.getBoundingClientRect().top-scrolled[i].top)<.001));bounds();
 ok(true,'Cards naturally follow a scrolling grid and recalculation neither double-offsets nor jumps their positions');
 for(const [w,h]of [[320,568],[568,320],[844,390]])for(const angle of [25,45,90]){
  size(w,h);cards().forEach((node,i)=>{node.dataset.angle=String(i%2?angle:-angle);node.style.setProperty('--table-angle',node.dataset.angle+'deg');});run('layoutStoryIntroCards();');bounds();
 }
 ok(true,'Rotated card extents remain within the table when a phone layout is recomputed');
 run('storyIntroSession.queueLayout();');assert(frames.size);close();assert.equal(frames.size,0);assert(!activeObserver.connected);
 ok([...viewportListeners.values()].every(list=>list.length===0)&&run('storyIntroSession===null'),'Closing the introduction removes observers, visual viewport listeners and pending frames');
 activeObserver.callback([]);flush();ok(cards().length===0,'A late observer notification cannot recreate a closed introduction');
 // Ordinary cumulative stars stay ordinary; a single-match perfect clear opts in.
 for(let chapter=2;chapter<=13;chapter++){
  storage.clear();const keys=run('STORY_GOAL_KEYS['+chapter+']');assert.equal(keys.length,3);
  for(const key of keys){ctx.goalKey=key;run('saveStoryStars('+chapter+',[goalKey]);');}run('openStoryMenu();');
  let rating=el('story-levels').children[chapter-1].children[2].children[1];assert(!rating.classList.contains('story-stars-perfect'));assert(!rating.classList.contains('story-stars-rainbow'));assert.equal(run('storyBestStars('+chapter+')'),3);
  run('saveStoryStars('+chapter+',STORY_GOAL_KEYS['+chapter+']);openStoryMenu();');rating=el('story-levels').children[chapter-1].children[2].children[1];
  assert(rating.classList.contains('story-stars-perfect'));assert.equal(rating.values.get('--story-star-color'),run('storyStarColor('+chapter+')'));
  assert.equal(rating.classList.contains('story-stars-rainbow'),chapter===13);if(chapter===13){assert.equal((rating.innerHTML.match(/class="story-star"/g)||[]).length,3);assert.equal(rating.attributes['aria-label'],'3 / 3');}
  ok(true,'Chapter '+chapter+' uses the perfect gradient only after one winning match completes all goals; its palette and cumulative saves remain intact');close();
 }
 ok(run('storyStarColor(6)')==='#d4af37'&&run('[0,1,2].map(i=>storyStarColor(8,i)).join(",")')==='#f39ac7,#b8860b,#5b2b85','Gold chapter-six stars and the three independent Sage colors remain the base of their gradients');
 run('game=new Game(2,{},null,{fastTest:true});configureStoryMatch(game,8);storyState={chapter:8,practice:game,complete:false};game.storyMatch.progress={sage:true,sameCardFaction:true,placeTwice:true};renderStoryCoach();');
 assert(!el('tutorial-feedback').classList.contains('story-perfect'));run('game.winner=game.players[0];storyState.complete=true;renderStoryCoach();');
 assert(el('tutorial-feedback').classList.contains('story-perfect'));for(const color of ['#f39ac7','#b8860b','#5b2b85'])assert(el('tutorial-feedback').innerHTML.includes('--story-star-color:'+color));
 ok(true,'The match result selects the same gradient treatment with all three individual Sage palettes');
 run('game.winner=null;game.storyMatch.progress={};storyState.complete=false;renderStoryCoach();');
 ok(!el('tutorial-feedback').classList.contains('story-perfect')&&(el('tutorial-feedback').innerHTML.match(/★/g)||[]).length===0,'Fresh match objectives do not inherit the previous perfect result');
 const gradientRule=rules.find(rule=>rule[1].includes('.story-perfect .story-star-rating')&&rule[2].includes('linear-gradient(135deg,'));assert(gradientRule);
 for(const selector of ['.story-perfect .story-star-rating','.story-stars-perfect','.story-perfect .story-star','.story-stars-perfect .story-star'])assert(gradientRule[1].split(',').map(s=>s.trim()).includes(selector));
 const rainbow=rules.find(rule=>rule[1].trim()==='.story-stars-rainbow');assert(rainbow);assert(['#e53935','#ed8b19','#d6c52d','#36a35a','#25b9c9','#477bd7','#a77bd7'].every(color=>rainbow[2].includes(color)));assert(rainbow[2].includes('linear-gradient(135deg,#120c2f66 0%,#ffffff00 50%,#ffffff66 100%)'));
 ok(gradientRule[2].includes('background-clip:text')&&gradientRule[2].includes('-webkit-background-clip:text')&&gradientRule[2].includes('var(--story-star-gradient,linear-gradient(135deg,color-mix(in srgb,var(--story-star-color) 65%,#18213d) 0%,var(--story-star-color) 48%,color-mix(in srgb,var(--story-star-color) 68%,white) 100%))')&&gradientRule[2].includes('text-shadow:none'),'Perfect stars shade from dark top-left to light bottom-right; each Temple glyph inherits all seven rainbow hues with the same diagonal shading and WebKit clipping');
 ok(css.includes('@supports (color:color-mix(in srgb,white,black)) and ((background-clip:text) or (-webkit-background-clip:text))')&&css.includes('@media(forced-colors:active){.story-perfect .story-star-rating')&&css.includes('-webkit-text-fill-color:CanvasText'),'Unsupported clipping or color mixing keeps the existing solid palette and forced-color mode uses legible system text');
 const result={status:'pass',count:checks.length,checks,layouts,scope:'Real story layout/inspection/fullscreen callbacks, viewport and observer lifecycle, scrolling containing-block arithmetic, rotated bounds, actual saved and in-match star renderers, gradient CSS and accessibility fallbacks. Controlled DOM; physical-phone pixels and performance are not measured.'};
 fs.writeFileSync(__dirname+'/story-intro-fullscreen-stars-2026-10-19-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' story introduction fullscreen and perfect-gradient checks passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
