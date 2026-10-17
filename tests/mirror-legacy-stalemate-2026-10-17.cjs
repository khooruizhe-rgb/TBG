// Native settings/gesture handlers, pinned historical kernels and real story ending entry points.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),js=html.split('<script>')[1].split('</script>')[0],css=html.split('<style>')[1].split('</style>')[0];
const fixture=fs.readFileSync(__dirname+'/drag-settings-2026-10-17.cjs','utf8'),marker='\n(async()=>{';
const box={module:{exports:{}},require,__dirname,console,process:{once(){},exitCode:0}};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={F,ctx,A,el,Element,document,documentListeners,windowListeners,run,dispatch,menuCard,frame,makeHand,beginHand,drag,fire,settle,storage,prefs};',box);
const F=box.module.exports,{ctx,A,el,document,run,dispatch,menuCard,frame,makeHand,beginHand,drag,fire,settle,storage,prefs}=F;
const checks=[],ok=(value,name)=>{assert(value,name);checks.push(name);};let completed=false;
process.once('beforeExit',()=>{if(!completed){console.error('Mirror/history/story checks did not finish');process.exitCode=1;}});
const style=(selector,property)=>{
 let value;for(const rule of css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g))if(rule[1].split(',').map(s=>s.trim()).includes(selector)){
  for(const declaration of rule[2].split(';')){const i=declaration.indexOf(':');if(declaration.slice(0,i).trim()===property)value=declaration.slice(i+1).trim();}
 }return value;
};
const historical=JSON.parse(fs.readFileSync(__dirname+'/fixtures/card-physics-v24.json','utf8'));
const reference=vm.createContext({Math,window:{matchMedia:()=>({matches:false})},moveTitleCard:(_node,x,y)=>({x,y})});
vm.runInContext('const TABLE_CARD_FRICTION=1800,TABLE_CARD_SPIN_DRAG=5.5;'+Object.values(historical.functions).join('\n'),reference);
(async()=>{
 const icon=fs.readFileSync(root+'/touhou_uploaded_images/images/ui/settings-gear.png');
 ok(crypto.createHash('sha256').update(icon).digest('hex')==='ce30c2c29d93f38c1075fced7651d66455547a49debd10e6019bcfc76ce7c8fc'&&icon.readUInt32BE(16)===512&&icon.readUInt32BE(20)===512,'The uploaded 512-pixel transparent gear is used byte-for-byte as a real repository asset');
 const launcher=html.match(/<div id="settings-launchers">([\s\S]*?)<\/div>/)[1];
 ok((launcher.match(/class="settings-icon"/g)||[]).length===2&&launcher.includes('images/ui/settings-gear.png')&&html.indexOf('<div id="settings-launchers">')<html.indexOf('<div id="app">'),'Both menu and match use the supplied image outside the transformed menu/app ancestors');
 ok(style('#settings-launchers','position')==='fixed'&&style('#settings-launchers','left').includes('safe-area-inset-left')&&style('#settings-launchers','top').includes('safe-area-inset-top'),'Settings are anchored at the viewport top left with phone safe-area spacing');
 ok(style('#settings-launchers #game-settings-btn','display')==='none'&&style('body:has(#game.active) #settings-launchers #menu-settings-btn','display')==='none'&&style('body:has(#game.active) #settings-launchers #game-settings-btn','display')==='grid','Only the appropriate menu or match launcher is shown');
 ok(style('body:has(#game.active) #game-toolbar','padding-left')==='44px','The toolbar reserves space so the left settings gear cannot cover its first button');
 ok(style('body.mobile-landscape #settings-launchers .settings-gear','height')==='32px'&&style('body.mobile-landscape #settings-launchers .settings-icon','height')==='24px','The phone landscape gear fits its toolbar height rather than overlapping the hand heading');
 let queued=0;ctx.queueMobileViewport=()=>queued++;
 const stateBefore=run('game?JSON.stringify(game.testRuleState()):null');el('settings-mirror-phone').checked=true;dispatch(el('settings-mirror-phone'),'change',{target:el('settings-mirror-phone')});
 ok(prefs().mirrorPhone&&document.body.classList.contains('mobile-mirrored')&&JSON.parse(storage.get('boundary-card-presentation-v1')).mirrorPhone&&queued===1,'The actual mirror checkbox changes the layout class, saves the choice and schedules new layout measurements');
 ok(run('loadCardPresentationSettings().mirrorPhone')&&run('game?JSON.stringify(game.testRuleState()):null')===stateBefore,'Mirror preference survives reload without changing the live rules state');
 const mirror='body.mobile-landscape.mobile-mirrored';
 ok(style(mirror+' #hand-area','grid-column')==='2'&&style(mirror+' #board-wrap','grid-column')==='1'&&style(mirror+' #board-panel','grid-template-columns').endsWith('var(--mobile-hand-width,190px)'),'Mirroring puts the hand to the right of the board, including matches without a shop');
 ok(style(mirror+'.mobile-has-shop .layout','grid-template-columns').startsWith('var(--mobile-shop-width,136px)')&&style(mirror+'.mobile-has-shop #log-panel','grid-column')==='1'&&style(mirror+'.mobile-has-shop #board-panel','grid-column')==='2','A phone shop match changes from hand/board/shop to shop/board/hand');
 ok(style(mirror+' #instruction-bar','left')==='5px'&&style(mirror+' #instruction-bar','right').includes('--mobile-hand-width')&&style(mirror+'.mobile-log-open #log-panel','right')==='auto','Placement instructions and the journal drawer follow the mirrored sides');
 ok(!/scaleX\(\s*-1\s*\)|rotateY\(\s*180deg\s*\)|(?:^|[;{])\s*direction\s*:\s*rtl/.test(css.slice(css.indexOf('/* Mirror only'),css.indexOf('</style>')<0?css.length:css.indexOf('</style>'))),'Mirroring rearranges regions without reversing text or card artwork');
 el('settings-mirror-phone').checked=false;dispatch(el('settings-mirror-phone'),'change',{target:el('settings-mirror-phone')});ok(!prefs().mirrorPhone&&!document.body.classList.contains('mobile-mirrored'),'Turning mirror off restores the default layout preference');
 for(const language of ['en','zh-CN']){
  A.setLanguage(language);for(const text of ['Mirror phone layout · swap hand and shop','Previous · original physics','Chapter 1 cleared by stalemate!','No more cards can be placed. Chapter 1 cleared by stalemate!','No one has a legal move left. Chapter 1 cleared by stalemate!'])assert.equal(A.translateGameText(text)===text,language==='en',text);
 }ok(true,'Mirror settings, the historical physics option and every first-chapter stalemate ending translate both ways');
 const bodyOf=s=>s.slice(s.indexOf('{'));const start=js.indexOf('function stepPreviousHandDragPhysics('),legacySource=js.slice(start,js.indexOf('\n}',start)+2);
 ok(historical.commit==='8acee0a787376d35a31558c24173ebdcf50016a1'&&bodyOf(legacySource)===bodyOf(historical.functions.stepHandDragPhysics),'The previous hand solver is the exact body from the version before settings were added');
 for(const name of ['tableCardGrip','stepTableCardSlide','stepTableCardDrag']){const start=js.indexOf('function '+name+'('),actual=js.slice(start,js.indexOf('\n}',start)+2);assert.equal(actual,historical.functions[name],name);}
 ok(true,'Table grip, torque, angular drag, friction and edge collisions retain the exact previous-version equations');
 for(const dt of [0,1/120,1/60,1/30,.05,.1]){
  const initial={x:15,y:20,vx:240,vy:-90,angle:2,tilt:-1,scale:1.02};ctx.priorBody={...initial};ctx.priorTarget={x:160,y:80};ctx.priorDt=dt;
  reference.body={...initial};reference.target={x:160,y:80};reference.dt=dt;
  const actual=run('stepPreviousHandDragPhysics(priorBody,priorTarget,priorDt)'),expected=vm.runInContext('stepHandDragPhysics(body,target,dt)',reference);
  for(const key of Object.keys(initial))assert.equal(actual[key],expected[key],dt+'/'+key);
 }ok(true,'Historical spring, speed, tilt and scaling match the pinned solver at six frame intervals');
 run('setCardPresentationSetting("physics","classic");');let source=makeHand();beginHand(source);frame();
 const previous=drag();ok(previous.previousPhysics&&previous.body.x!==previous.goal.x&&previous.body.angle!==0&&previous.body.scale>1,'Selecting previous physics routes the actual gesture through the original spring rather than direct following');fire('pointercancel');await settle();
 let node=menuCard(),rect=node.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2,angle=Number(node.dataset.angle);
 dispatch(node,'pointerdown',{pointerId:1,pointerType:'touch',clientX:x,clientY:y+35});for(let i=1;i<=5;i++)dispatch(node,'pointermove',{pointerId:1,pointerType:'touch',clientX:x+i*18,clientY:y+35,timeStamp:1000+i*16});dispatch(node,'pointerup',{pointerId:1,pointerType:'touch',clientX:x+90,clientY:y+35,timeStamp:1080});
 ok(Number(node.dataset.angle)!==angle&&run('tableCardSlides.size')===1,'Previous tabletop physics retains the original automatic rotation and release momentum');run('clearTableCardSlides();setCardPresentationSetting("physics","physical");');
 source=makeHand();beginHand(source);frame();ok(!drag().previousPhysics&&drag().body.x!==drag().goal.x,'Switching back selects the optimized solver while retaining physical following');fire('pointercancel');await settle();
 // Run the actual engine's regular turn entry at a legally closed story board.
 const ending=fs.readFileSync(__dirname+'/story-no-draw-ending-2026-10-16.cjs','utf8'),entry='vm.runInContext(`(async()=>{';
 const engineBox={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout,process:{on(){},once(){},exitCode:0}};
 vm.runInNewContext(ending.slice(0,ending.indexOf('\n'+entry))+'\nmodule.exports={ctx};',engineBox);const engine=engineBox.module.exports.ctx;
 const result=await vm.runInContext(`(async()=>{
  const cases=[],full=['sdm_remilia','sdm_flandre','hourai_mokou','hourai_reisen','mtn_kanako','mtn_sanae','palace_satori','palace_rin','sage_yukari','sage_kasen','hell_eiki','hell_komachi','temple_nue','temple_murasa','reimu','yuuka'];
  function dead(chapter,a,b,actor=0){
   evalResetTokens();evalSetSeed('first-stalemate-'+chapter+a+b+actor);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true});configureStoryMatch(game,chapter);game.players[0].isAI=false;game.currentPlayerIdx=actor;
   game.board=Array.from({length:4},(_,r)=>Array.from({length:4},(_,c)=>full[r*4+c]));game.wasteland=game.board.map(row=>row.map(()=>false));game.players[0].hand=['haku_yuyuko'];game.players[1].hand=['haku_youmu'];game.players.forEach(p=>p.discard=[]);
   const used=[...full,...game.shopCards.filter(Boolean),'haku_yuyuko','haku_youmu'],rest=CARDS.filter(c=>!c.token&&!c.shopkeeper&&!c.shopExpansion&&!used.includes(c.id)).map(c=>c.id);game.players[0].discard=rest.splice(0,a);game.players[1].discard=rest.splice(0,b);game.drawPile=rest;
   game.startingCardIds=new Set([...used,...game.players.flatMap(p=>p.discard),...rest]);game.handKnowledge=game.players.map(()=>new Map());game.reserveAges=game.players.map(()=>({}));game.winner=null;game.stalemateMessage='';evalConservation(game);assert(game.storyDrawOnlyStalemate());return game;
  }
  for(const actor of [0,1])for(const [a,b]of [[0,0],[0,3],[2,1]]){
   const g=dead(1,a,b,actor),before=JSON.stringify([g.drawPile,g.players.map(p=>[p.hand,p.discard])]);await actualStoryTurn();assert(g.winner?.idx===0&&g.storyMatch.stalemateClear&&storyMatchComplete(g));assert.equal(storyMatchStars(g),3);assert.equal(JSON.stringify([g.drawPile,g.players.map(p=>[p.hand,p.discard])]),before);assert(g.stalemateMessage.endsWith('Chapter 1 cleared by stalemate!'));evalConservation(g);cases.push({actor,a,b,cleared:true});
  }
  storyState={chapter:1,practice:game,complete:false,savedStars:null};updateStoryProgress();assert(storyState.complete&&storyBestStars(1)===3);
  const noDraw=doPlayerAction;let actions=0;doPlayerAction=async()=>{actions++;throw Error('A dead table must not request an action');};dead(1,0,3);await afterAction(0,{extraTurns:2},1);doPlayerAction=noDraw;assert(actions===0&&game.winner.idx===0&&game.storyMatch.stalemateClear);
  for(const chapter of [2,3,4,5,6])for(const tie of [false,true]){dead(chapter,tie?1:0,tie?1:3);await actualStoryTurn();assert(!game.storyMatch.stalemateClear&&!storyMatchComplete(game));assert(tie?game.winner===null:game.winner?.idx===1);evalConservation(game);}
  dead(1,0,3);delete game.storyMatch;game.tutorialLesson={humanSeat:0,aiSeat:1,progress:{four:false,two:false,ability:false}};endStalemate();assert(game.winner===null);
  dead(1,0,3);delete game.storyMatch;endStalemate();assert(game.winner===null);
  dead(1,0,3);await actualStoryTurn();configureStoryMatch(game,2);assert(!game.storyMatch.stalemateClear&&!game.winner);
  return {cases,savedFirstChapter:storyBestStars(1),otherChapters:10,tutorialIsolated:true,normalIsolated:true,followupsStopped:true};
 })()`,engine);
 ok(result.cases.length===6,'Both first actors clear chapter one on a tied, trailing or leading stalemate while keeping every actual card and score');
 ok(result.savedFirstChapter===3,'A first-chapter stalemate follows the real progress-saving route');
 ok(result.followupsStopped,'A closed first-chapter board completes before requesting bonus turns or further actions');
 ok(result.otherChapters===10&&result.tutorialIsolated&&result.normalIsolated,'Opponent wins and ties in chapters two through six, ordinary mode and the original tutorial keep their own ending rules');
 // Execute the actual result renderer with controlled surrounding view updates.
 ctx.deferFastAITestRender=()=>false;ctx.publishSnapshot=()=>{};ctx.renderPlayers=()=>{};ctx.renderLog=()=>{};ctx.updateTutorialProgress=()=>{};
 run('var fastAITestRenderTimer=null,fastAITestLastRender=0,announcedGameResult=null;');
 const renderStart=js.indexOf('function renderAll(');vm.runInContext(js.slice(renderStart,js.indexOf('\n}',renderStart)+2),ctx);
 run('game.aiTestMode=false;game.storyMatch={chapter:1,humanSeat:0,skillFactions:[],stalemateClear:true};game.winner=game.players[0];renderAll(true);');
 ok(el('winner-text').textContent==='Chapter 1 cleared by stalemate!'&&el('winner-banner').classList.contains('show'),'The result banner reports a chapter-one stalemate clear instead of inventing a points victory');
 const output={status:'pass',count:checks.length,checks,historicalCommit:historical.commit,endingRoutes:result,scope:'Actual settings and gesture handlers, immutable historical physical equations, original icon bytes, CSS region declarations, native fullscreen regression, real closed-board turn/follow-up/progress entry points and result renderer; phone/browser pixels are not measured.'};
 fs.writeFileSync(__dirname+'/mirror-legacy-stalemate-2026-10-17-results.json',JSON.stringify(output,null,2)+'\n');completed=true;console.log(output.count+' mirror, historical physics and first-chapter stalemate checks passed');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
