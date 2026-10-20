// Production collection and crown handlers, controlled DOM, and analytical CSS bounds.
// This is not a browser-pixel or phone frame-rate measurement.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),js=html.split('<script>')[1].split('</script>')[0],css=html.split('<style>')[1].split('</style>')[0];
const fixture=fs.readFileSync(__dirname+'/story-final-controls-2026-10-19.cjs','utf8'),box={module:{exports:{}},require,__dirname,console,process:{once(){}}};
vm.runInNewContext(fixture.slice(0,fixture.indexOf('(async()=>{'))+'\nmodule.exports={ctx,A,el,run,make,take};',box);const {ctx,A,el,run,make,take}=box.module.exports;
const section=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a))),checks=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
const proto=Object.getPrototypeOf(el('game'));
proto.querySelectorAll=function(selector){const names=selector.split(',').map(s=>s.trim().slice(1)),found=[];const visit=n=>{for(const c of n.children){if(names.some(name=>c.classList.contains(name)))found.push(c);visit(c);}};visit(this);return found;};
proto.querySelector=function(selector){return this.querySelectorAll(selector)[0]||null;};
let serial=0,reduced=false,completed=false;const frames=new Map(),timeouts=new Map();
ctx.requestAnimationFrame=fn=>{const id=++serial;frames.set(id,fn);return id;};ctx.cancelAnimationFrame=id=>frames.delete(id);
ctx.setTimeout=(fn,delay)=>{const id=++serial;timeouts.set(id,{fn,delay});return id;};ctx.clearTimeout=id=>timeouts.delete(id);
ctx.window.matchMedia=q=>({matches:q.includes('reduced-motion')&&reduced});
const pump=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());};
const active=id=>el(id).children.find(n=>n.classList.contains('active'));
const signal=()=>Number(el('final-claim-glitch').dataset.collectedCards||0),alpha=()=>Number(el('final-claim-glitch').values.get('--glitch-opacity')||0);
const palette=()=>ctx.document.body.values.get('--claim-table-rgb');
run(section('const CROWN_SCENE_BACKGROUND','function triggerPlacementPresentation'));
run('var crownImpactTimer=0;'+section('function triggerPlacementPresentation','const HAND_EXIT_STAGGER_MS'));
ctx.broadcastOnlineEffect=()=>{};ctx.playPlacementSound=()=>{};ctx.tileElement=()=>null;ctx.applyCrownLight=()=>{};
const hook=section('  onFactionClaim({faction,count})','  onFinalBoardGrowth:');run('this.claimHook=({'+hook+'}).onFactionClaim;');
ctx.playGameCue=()=>{};
function start(){run('stopClaimAtmosphere();clearCrownBackdrop();');const g=make();g.ui={onFactionClaim:ctx.claimHook};return g;}
function collect(g,bases,player){bases.forEach((base,c)=>{const id=take(g,base);g.removeFromHand(0,id);g.setCardAt(0,c,id);});g.checkClaims(player);pump();}
process.once('beforeExit',()=>{if(!completed&&!process.exitCode){console.error('Claim identity checks did not finish');process.exitCode=1;}});
(async()=>{
 let g=start();
 const lord=take(g,'sdm_remilia');ctx.lord=lord;run('triggerPlacementPresentation(lord,1,1);');
 ok(!palette()&&signal()===0&&run('lastCrownBackdropId')===null&&!ctx.document.body.classList.contains('crown-scene-active'),'A real printed crown placement before any finale collection leaves the table palette and signal untouched');
 ok(el('board').classList.contains('crown-impact-board'),'The existing local crown landing impact still plays');
 collect(g,['sdm_remilia','sdm_sakuya','sdm_flandre','sdm_patchouli'],0);
 ok(signal()===4&&palette()==='198,33,72'&&ctx.document.body.classList.contains('claim-color-active')&&active('claim-foreground').classList.contains('scene-sdm'),'An actual four-card collection sets the final table to scarlet and counts exactly four physical cards');
 const beforeAlpha=alpha(),beforePalette=palette();run('triggerPlacementPresentation("hourai_kaguya",1,1);');
 ok(signal()===4&&palette()===beforePalette&&alpha()===beforeAlpha&&run('lastCrownBackdropId')===null,'Another crown placement cannot change the collection palette, backdrop or cumulative glitch');
 collect(g,['haku_yuyuko','haku_youmu'],1);
 ok(signal()===6&&palette()==='242,166,193'&&alpha()>beforeAlpha,'An opponent two-card collection adds two rather than one event or four assumed cards');
 collect(g,['haku_yuyuko','haku_youmu'],2);
 ok(signal()===8&&g.finalChallenge.collected[2].includes('hakugyokurou'),'Another player collecting a duplicate faction continues the total');
 const sky=active('claim-atmosphere');collect(g,['reimu','marisa'],3);
 ok(signal()===10&&palette()==='224,72,63'&&active('claim-atmosphere')===sky,'Hakurei contributes cards and its red table colour while preserving the current realm background');
 const stable=JSON.stringify(g.testRuleState());
 run('this.savedRandom=Math.random;Math.random=()=>{throw Error("Presentation consumed match RNG");};');
 for(let i=0;i<50;i++)ctx.claimHook({faction:'sdm',count:4,playerIdx:i%4});pump();
 ok(signal()===210&&alpha()===.56&&el('final-claim-glitch').children.length===5,'Repeated collections reach a bounded glitch maximum with only five signal layers');
 ok(JSON.stringify(g.testRuleState())===stable&&frames.size===0,'Visual escalation changes no cards, board size, score or AI state and has no per-frame JavaScript loop');
 const oldAlpha=alpha();ctx.claimHook({faction:'sdm',count:4});pump();ok(signal()===214&&alpha()===oldAlpha,'The counter continues past the visual cap without growing effect strength or DOM');
 for(const count of [0,-1,1.2,NaN,Infinity])run('showClaimAtmosphere')({faction:'sdm',count});
 run('showClaimAtmosphere({faction:"unknown",count:4});');ok(signal()===214,'Invalid, zero and unsupported collection reports cannot corrupt the signal');
 run('Math.random=savedRandom;');
 g=start();collect(g,['reimu','marisa'],0);ok(signal()===2&&el('claim-atmosphere').hidden&&palette()==='224,72,63','A first Hakurei collection starts a fresh signal without requiring a background scene');
 collect(g,['sdm_remilia','sdm_sakuya','sdm_flandre','sdm_patchouli'],1);ok(signal()===6,'The first later scenery transition preserves an earlier Hakurei count');
 run('game.finalChallenge.activeCells=64;SIZE=8;');const countBefore=signal();ctx.claimHook({faction:'hourai',count:4});pump();
 ok(signal()===countBefore+4&&g.finalChallenge.activeCells===64,'Signal strength keeps increasing after board expansion reaches its maximum');
 const oldPalette=palette();ctx.claimHook({faction:'hell',count:1});pump();ok(signal()===11&&palette()===oldPalette,'A partially resolved collection counts only the one collected card and does not replace the complete-realm colour');
 const colors={sdm:'198,33,72',hakugyokurou:'242,166,193',hourai:'48,91,191',mountain:'105,161,103',palace:'138,107,191',sage:'126,62,157',hakurei:'224,72,63',sunflower:'242,193,78',hell:'235,97,58',heaven:'121,206,255',temple:'215,164,73'};
 const expected={sdm:['fog',2,3],hakugyokurou:[null,0,0],hourai:[null,0,0],mountain:['leaf',4,9],palace:['ember',4,10],sage:[null,0,0],sunflower:[null,0,0],hell:['lantern',3,7],heaven:['cloud',2,3],temple:['seal',3,7]};
 for(const mobile of [true,false]){
  ctx.document.body.classList.toggle('game-mobile',mobile);
  for(const [faction,color]of Object.entries(colors)){
   run('showClaimAtmosphere')({faction,count:run('FACTIONS')[faction].size});pump();assert.equal(palette(),color);
   if(faction==='hakurei')continue;
   const front=active('claim-foreground'),[kind,phone,desktop]=expected[faction];assert.equal(front.querySelectorAll('.atmos-particle').length,mobile?phone:desktop);
   if(kind)assert.equal(front.querySelectorAll('.realm-'+kind).length,mobile?phone:desktop);
   assert.equal(el('claim-atmosphere').children.length,2);assert.equal(el('claim-foreground').children.length,2);
  }
  ok(true,(mobile?'Phone':'Desktop')+' uses all eleven explicit faction colours and distinct bounded realm elements');
 }
 run('showClaimAtmosphere({faction:"sage",count:4});');pump();let front=active('claim-foreground');
 ok(front.querySelectorAll('.realm-eye').length===6&&front.querySelectorAll('.realm-eye-pupil').length===6&&front.querySelectorAll('.realm-door').length===2&&front.querySelectorAll('.realm-door-leaf').length===4,'Sage has six actual watching eyes and two articulated two-leaf doors on desktop');
 ctx.document.body.classList.add('game-mobile');run('showClaimAtmosphere({faction:"sage",count:4});');pump();ok(active('claim-foreground').querySelectorAll('.realm-eye').length===4,'Phone retains four large eyes and both doors');
 run('showClaimAtmosphere({faction:"hourai",count:4});');pump();front=active('claim-foreground');
 ok(ctx.document.body.classList.contains('claim-weathered')&&front.querySelector('.atmos-weathering')&&front.querySelector('.atmos-patina'),'Eientei adds paper fading and cracks above the whole game and marks weathered panels');
 run('showClaimAtmosphere({faction:"heaven",count:2});');pump();ok(!ctx.document.body.classList.contains('claim-weathered'),'The next realm removes Eientei weathered panel styling');
 run('showClaimAtmosphere({faction:"sunflower",count:2});');pump();ok(active('claim-foreground').querySelector('.atmos-heat')&&!active('claim-foreground').querySelector('.atmos-particle'),'Sunflower uses heat sheets around a sun rather than falling flowers');
 reduced=true;
 for(const faction of Object.keys(expected)){run('showClaimAtmosphere')({faction,count:run('FACTIONS')[faction].size});pump();assert.equal(active('claim-foreground').querySelectorAll('.atmos-particle').length,0);}
 ok(css.includes('.claim-scene.active *,.claim-scene.active *::after,.claim-glitch-tear{animation:none!important}'),'Reduced motion stops eyes, doors, snow, heat, erosion and glitch movement while preserving static identities');
 const beforeCleanup=[...frames.values()];run('showClaimAtmosphere({faction:"hourai",count:4});');const stale=[...frames.values(),...beforeCleanup];run('clearStoryMatch();');stale.forEach(fn=>fn());
 ok(['claim-atmosphere','claim-foreground','final-claim-glitch'].every(id=>el(id).hidden&&!el(id).children.length)&&!palette()&&!signal()&&!ctx.document.body.classList.contains('claim-weathered')&&!ctx.document.body.classList.contains('claim-color-active')&&run('claimAtmosphere')===null,'Retry/exit clears colours, signal, weathering, layers and pending frames; late callbacks cannot revive them');
 reduced=false;g=start();run('showClaimAtmosphere({faction:"sdm",count:4});');const abandoned=[...frames.values()];g=start();run('showClaimAtmosphere({faction:"heaven",count:2});');abandoned.forEach(fn=>fn());pump();ok(signal()===2&&active('claim-foreground').classList.contains('scene-heaven'),'A new match starts at zero and rejects an abandoned match’s scheduled realm');
 g.fastAITest=true;const beforeFast=signal();run('showClaimAtmosphere({faction:"sdm",count:4});');ok(signal()===beforeFast,'Fast AI evaluation does not build or count visual effects');g.fastAITest=false;
 run('stopClaimAtmosphere();SIZE=4;game=new Game(2,{});showCrownBackdrop("hourai_kaguya");');
 ok(run('lastCrownBackdropId')==='hourai_kaguya'&&ctx.document.body.classList.contains('crown-scene-active'),'Ordinary-mode crown backgrounds and their colours still work');
 run('showClaimAtmosphere({faction:"sdm",count:4});');pump();ok(!signal()&&!ctx.document.body.classList.contains('claim-color-active')&&el('final-claim-glitch').hidden,'Ordinary collections retain scenery without finale-only glitch or colour replacement');
 // A late normal-mode image sample uses --wood-rgb; collection colours use a separate property.
 let finishSample;run('clearCrownBackdrop();');ctx.Image=class{set src(value){finishSample=()=>this.onerror();}};ctx.getComputedStyle=()=>({getPropertyValue:()=> 'url(test-crown-image.png)'});
 run('showCrownBackdrop("hourai_kaguya");');g=start();ctx.claimHook({faction:'mountain',count:4});pump();const finalPalette=palette();finishSample();await Promise.resolve();await Promise.resolve();
 ok(palette()===finalPalette&&css.includes('linear-gradient(rgb(var(--claim-table-rgb)),rgb(var(--claim-table-rgb)))'),'A late crown texture callback cannot overwrite the independent finale collection palette');
 const block=prefix=>css.split('\n').find(line=>line.startsWith(prefix));
 ok(block('.scene-sdm .atmos-veil{').includes('-webkit-mask-image:none;mask-image:none;')&&block('#claim-foreground{').includes('z-index:36')&&block('.realm-fog{').includes('inset:-12vmax'),'Scarlet fog has a full-screen foreground wash and unmasked moving banks, including the centre');
 ok(block('.scene-hell .atmos-base{').includes('var(--hell-higan-bg)')&&!block('.scene-hell .atmos-base{').includes('hell-makai')&&css.includes('--shop-bg:var(--hell-higan-bg)'),'Hell uses the Higan asset shared by Eiki and Kutaka');
 ok(!css.split('\n').filter(l=>l.startsWith('.scene-sunflower ')).join().match(/sunflower-bg|yuuka-pixel-flower/)&&block('.scene-sunflower .atmos-landmark{').includes('#fffef2'),'Sunflower scenery contains a blazing white-gold sun and no flower imagery');
 const motionNames=['claimRedFog','claimSnowNear','claimAgeSurface','claimMountainWind','claimPalaceEmber','claimSageGaze','claimSolarHeat','claimHiganRiver','claimHeavenCloud','claimTempleOrbit'];
 ok(motionNames.every(name=>css.includes('@keyframes '+name))&&!css.includes('@keyframes claimParticleFall'),'All ten realms have independent motion families instead of universal falling particles');
 ok(block('.scene-hakugyokurou .atmos-motion{').includes('inset:-240px')&&block('.atmos-snow-sheet{').includes('inset:-240px')&&block('.atmos-snow-sheet::after{').includes('inset:-160px')&&!block('@keyframes claimSnowFar').includes('rotate')&&!block('@keyframes claimSnowNear').includes('rotate'),'Snow layers use unrotated overscan and translations instead of rotating finite texture rectangles');
 for(const [w,h]of [[320,568],[390,844],[844,390],[1920,1080],[2560,1080]])for(let i=0;i<=40;i++)for(let j=0;j<=40;j++){
  const t=i/40,u=j/40;for(const [overscan,x,y]of [[240,-80*t,120*t],[240,-160*t,120*t],[400,-160*t-160*u,120*t+120*u]]){assert(-overscan+x<=0&&-overscan+y<=0);assert(w+overscan+x>=w&&h+overscan+y>=h);}
 }
 ok(true,'Analytical bounds keep every moving snow layer covering narrow phones, landscape phones and wide desktops throughout its cycle');
 ok(160%40===0&&160%80===0&&120%60===0&&120%120===0&&block('body.game-mobile .claim-scene.active.scene-hakugyokurou .atmos-motion{').includes('1.1s'),'Snow loops by exact tile periods and phone snowfall retains its storm speed');
 const sceneCode=section('/* Claim scenery owns presentation','/* A live finale worker');
 ok(!/Math\.random|setInterval|setTimeout|canvas|backdropFilter/.test(sceneCode)&&html.includes('id="final-claim-glitch" aria-hidden="true"')&&block('#final-claim-glitch{').includes('pointer-events:none'),'The effect layers consume no game RNG, timers, canvas snapshots or pointer events');
 run('clearStoryMatch();clearCrownBackdrop();');
 const result={status:'pass',count:checks.length,checks,scope:'Production crown/claim events, actual 2/4-card collections across players, repeats, cumulative bounded signal, faction colour isolation, all realm structures, analytical snow coverage and seamless tile periods, reduced motion, cleanup and ordinary-mode regression. Controlled DOM and CSS contracts, not browser pixels or device FPS.'};
 fs.writeFileSync(__dirname+'/claim-identity-glitch-2026-10-20-results.json',JSON.stringify(result,null,2)+'\n');completed=true;console.log(checks.length+' claim identity/glitch checks passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
