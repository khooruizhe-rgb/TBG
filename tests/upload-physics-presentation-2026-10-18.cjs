// Replay the uploaded equations and pointer trajectory, then exercise actual card details.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),js=html.split('<script>')[1].split('</script>')[0],css=html.split('<style>')[1].split('</style>')[0];
const fixture=fs.readFileSync(__dirname+'/drag-settings-2026-10-17.cjs','utf8'),marker='\n(async()=>{',box={module:{exports:{}},require,__dirname,console,process:{once(){},exitCode:0}};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,A,el,Element,document,run,dispatch,menuCard,frame};',box);
const {ctx,A,el,Element,document,run,dispatch,menuCard,frame}=box.module.exports,checks=[],ok=(v,n)=>{assert(v,n);checks.push(n);};
const pinned=JSON.parse(fs.readFileSync(__dirname+'/fixtures/card-physics-upload-2026-10-18.json','utf8'));
const extract=name=>{const i=js.indexOf('function '+name+'(');return js.slice(i,js.indexOf('\n}',i)+2);};
const reference=vm.createContext({Math,window:{innerWidth:ctx.window.innerWidth,innerHeight:ctx.window.innerHeight,matchMedia:()=>({matches:false})},tableCardEventTime:event=>event.timeStamp,liftTitleCard(){}});
vm.runInContext(pinned.functions.stepTableCardSlide+'\n'+pinned.functions.onTitleCardPointerMove,reference);
reference.moveTitleCard=(_node,x,y)=>({x:Math.max(24,Math.min(reference.window.innerWidth-24,x)),y:Math.max(24,Math.min(reference.window.innerHeight-24,y))});
ok(pinned.sha256==='c6e954ad94d47b6f6fb0695c06e4ad232c931c704bec35567b29b5bc7d336ab4'&&extract('stepPreviousTableCardSlide')===pinned.functions.stepTableCardSlide.replace('function stepTableCardSlide(', 'function stepPreviousTableCardSlide('),'The previous tabletop solver is exactly the one in the user-supplied HTML snapshot');
ok(extract('stepPreviousHandDragPhysics')===pinned.functions.stepHandDragPhysics.replace('function stepHandDragPhysics(', 'function stepPreviousHandDragPhysics('),'The previous hand spring also matches the uploaded version byte-for-byte');
for(const dt of [0,.001,1/120,1/60,1/30,.1,.3])for(const edge of [false,true]){
 const initial={x:edge?98:50,y:edge?98:50,vx:500,vy:180,angle:12,spin:22},bounds={left:0,top:0,right:100,bottom:100};ctx.body={...initial};ctx.bounds=bounds;ctx.dt=dt;reference.body={...initial};reference.bounds=bounds;reference.dt=dt;
 const actual=run('stepPreviousTableCardSlide(body,dt,bounds)'),expected=vm.runInContext('stepTableCardSlide(body,dt,bounds)',reference);
 for(const key of Object.keys(initial))assert.equal(actual[key],expected[key],dt+'/'+edge+'/'+key);
}
ok(true,'Uploaded friction, small angular decay and stopping at the edge agree at fourteen time/edge cases');
function trajectory(mode){
 run('clearTableCardSlides();finishTitleCardDrag(true);closeStoryMenu();setCardPresentationSetting("physics","'+mode+'");');
 const node=menuCard();node.rect={left:300,top:180,width:144,height:192,right:444,bottom:372};node.dataset.angle='0';node.style.setProperty('--table-angle','0deg');
 dispatch(node,'pointerdown',{pointerId:1,pointerType:'touch',clientX:372,clientY:311,timeStamp:1000});
 const start=run('titleCardDrag');
 if(mode==='classic')reference.titleCardDrag={...start,node:{classList:{add(){}},style:{setProperty(){}}},samplePoint:{...start.samplePoint},center:{...start.center}};
 const samples=[];
 for(let i=1;i<=5;i++){
  const event={pointerId:1,clientX:372+i*16,clientY:311,timeStamp:1000+i*16};dispatch(node,'pointermove',{...event,pointerType:'touch'});
  const drag=run('titleCardDrag');samples.push({x:drag.centerPoint.x,y:drag.centerPoint.y,rotation:drag.rotation,vx:drag.vx,vy:drag.vy});
  if(mode==='classic'){
   vm.runInContext('onTitleCardPointerMove(event)',Object.assign(reference,{event}));const old=reference.titleCardDrag;
   for(const key of ['vx','vy','rotation'])assert.equal(drag[key],old[key],key+'/'+i);assert.equal(drag.centerPoint.x,old.samplePoint.x);assert.equal(drag.centerPoint.y,old.samplePoint.y);
  }
 }
 dispatch(node,'pointerup',{pointerId:1,pointerType:'touch',clientX:452,clientY:311,timeStamp:1080});ctx.sampleNode=node;
 const slide=run('tableCardSlides.get(sampleNode)');assert(slide);return {node,samples,slide};
}
const old=trajectory('classic');
ok(old.samples.every(s=>Math.abs(s.rotation)<=7)&&old.slide.previousPhysics&&Math.abs(old.slide.body.spin)<=28,'The actual previous-mode pointer trajectory matches the upload and releases with its small-angle spin limit');
ok(Math.hypot(old.slide.body.vx,old.slide.body.vy)<=Math.sqrt(2*2400*129.6)+1e-8,'The previous throw uses the uploaded 0.9-card-width travel limit and 2400 friction');
const modern=trajectory('physical');
ok(!modern.slide.previousPhysics&&JSON.stringify(modern.samples)!==JSON.stringify(old.samples),'The same real pointer gesture now produces visibly different old and new rotation/trajectory equations');
run('clearTableCardSlides();');
const style=(selector,key)=>{let value;for(const rule of css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g))if(rule[1].split(',').map(s=>s.trim()).includes(selector))for(const d of rule[2].split(';')){const i=d.indexOf(':');if(d.slice(0,i).trim()===key)value=d.slice(i+1).trim();}return value;};
ok(Number(style('.table-scatter-card.table-card-moved','z-index'))>Number(style('body:not(:has(#game.active)):not(.title-memory-active) #app','z-index')),'Moved cards sit above the menu paper so a modern throw cannot hide its pointer target underneath');
ok(Number(style('.table-scatter-card.table-card-moved','z-index'))<Number(style('#settings-launchers','z-index')),'The persistent settings gear remains above moved menu cards');
dispatch(modern.node,'pointerdown',{pointerId:1,pointerType:'touch',clientX:372,clientY:311,timeStamp:1200});
ok(run('titleCardDrag?.node')===modern.node,'A thrown modern card can be grabbed again with the actual handler');dispatch(modern.node,'pointercancel',{pointerId:1});
run('game=new Game(2,{},null,{fastTest:true});configureStoryMatch(game,7);');
for(const language of ['en','zh-CN']){
 A.setLanguage(language);A.openCardDetails('reimu');
 assert.equal(el('card-detail-ability').textContent,language==='en'?'None':'无');assert(!el('card-detail-ability').hidden);
 assert.equal(el('card-detail-description').innerHTML,language==='en'?'This card has no ability yet. Perhaps we will find some inspiration later?':'这张卡牌还没有技能呢，也许后面我们就有灵感了？');A.closeCardDetails();
}
ok(true,'A locked story card shows the exact requested None title and placeholder in both languages');
run('game.permanentAbilities.reimu="__draw_one";');A.openCardDetails('reimu');
ok(el('card-detail-ability').textContent==='覆盖'&&el('card-detail-description').innerHTML.includes('抽一张牌')&&el('card-detail').classList.contains('card-rin-worn'),'Giving the card Overwrite replaces the placeholder with its active skill while preserving its retrieved-card wear');A.closeCardDetails();
for(const language of ['en','zh-CN']){
 A.setLanguage(language);const text=A.translateGameText(A.CARD.mtn_aya.desc);assert.equal((text.match(language==='en'?/\./g:/。/g)||[]).length,2);assert(text.includes(language==='en'?'four cards':'四张手牌'));assert(text.includes(language==='en'?'pay you a hand card':'付你一张手牌'));
}
ok(true,'Aya has exactly two short sentences preserving four-card information and the subscription payment in both languages');
A.openCardDetails('hourai_eirin');
ok(el('card-detail-portrait').children[0].className==='detail-art-hourai_eirin'&&style('.card-detail-portrait img.detail-art-hourai_eirin','transform')==='scale(1.2)'&&style('.card-art-eirin','background-size').includes('124%'),'Eirin’s real portrait markup receives the larger detail and compact-card crop');A.closeCardDetails();
for(const language of ['en','zh-CN'])for(const text of ['Chapter 7 · Palace of the Earth Spirits','Claim Palace of the Earth Spirits','Give an ability to a card with none','Keep Miss Mary off the board','A blank card may still have a future.']){
 A.setLanguage(language);assert.equal(A.translateGameText(text)===text,language==='en');
}
ok(true,'The new chapter title, objectives and hint translate both ways');
const result={status:'pass',count:checks.length,checks,uploadedSha256:pinned.sha256,oldTrajectory:old.samples,newTrajectory:modern.samples,scope:'Uploaded physical kernels and exact live pointer replay, old/new trajectory distinction and travel limits, menu CSS stacking and re-grabbing, actual bilingual card detail and ability rendering, compact/detail Eirin scaling. Browser pixels are not measured.'};
fs.writeFileSync(__dirname+'/upload-physics-presentation-2026-10-18-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' uploaded physics and presentation checks passed');
