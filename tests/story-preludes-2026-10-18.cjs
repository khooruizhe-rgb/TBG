// Actual story entry, practice rules, controls, cancellation and reserved real matches.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),js=html.split('<script>')[1].split('</script>')[0],fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{',box={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,el,storage};',box);
const {ctx,el,storage}=box.module.exports,run=code=>vm.runInContext(code,ctx),checks=[],ok=(v,n)=>{assert(v,n);checks.push(n);};
ctx.tileElement=(r,c)=>el('tile-'+r+'-'+c);ctx.beginShopTrade=()=>run('pendingCellChoice={shopTrade:true,cells:[]};');
const state=()=>run('tutorialState'),match=()=>run('game');
const stringify=value=>JSON.stringify(value,(key,item)=>key==='ui'?undefined:Object.prototype.toString.call(item)==='[object Set]'||Object.prototype.toString.call(item)==='[object Map]'?[...item]:item);
const click=id=>el(id).events.click();
function begin(chapter){run('returnToMainMenu();showStoryChapterIntro('+chapter+');');click('story-begin');return state();}
function normalSnapshot(g){return stringify(g);}
async function place(id,r,c){
 const t=state(),g=t.practice;g.aiTestMode=true;g.fastAITest=true;g.removeFromHand(0,id);await g.internalPlace(id,r,c,0,0);await run('finishTutorialAction(tutorialState)');
}
let finished=false;process.once('beforeExit',()=>{if(!finished){console.error('Prelude checks did not finish');process.exitCode=1;}});
(async()=>{
 storage.set('boundary-card-presentation-v1','{"physics":"classic","mirrorPhone":true}');storage.set('unrelated','keep');const saved=JSON.stringify([...storage]);
 for(const chapter of [1,3,6]){
  const t=begin(chapter),prepared=t.preludeMatch,initial=normalSnapshot(prepared),practice=t.practice;
  ok(t.preludeChapter===chapter&&practice!==prepared&&!run('isStoryMatch()')&&run('isTutorialPractice()')&&!el('tutorial-skip').hidden,'Chapter '+chapter+' starts a separate skippable exercise from the real introduction button');
  assert(prepared.players.every(p=>p.hand.length===6));assert(!prepared.winner&&!prepared.cancelled);assert.equal(run('storyBestStars('+chapter+')'),null);
  const starts=run('storyLoopStarts');click('tutorial-skip');click('tutorial-skip');
  ok(match()===prepared&&normalSnapshot(prepared)===initial&&practice.cancelled&&run('isStoryMatch()')&&el('tutorial-skip').hidden&&run('storyLoopStarts')===starts+1,'Skipping chapter '+chapter+' starts exactly once and preserves the exact reserved hands, deck, score, first actor and objectives');
  assert.equal(JSON.stringify([...storage]),saved);
 }
 let t=begin(1),prepared=t.preludeMatch,initial=normalSnapshot(prepared);
 ok(t.practice.players.length===2&&!t.practice.kourindouEnabled&&run('CARDS.every(card=>!game.cardAbilityEnabled(card.id))')&&!run('tutorialAllowsTrade()'),'The first prelude has no card abilities or shop and uses the same two-seat table');
 assert(!run('tutorialAllowsAction("draw")'));assert(!run('tutorialAllowsAction("place","marisa")'));assert(run('tutorialAllowsAction("place","mtn_sanae")'));
 click('tutorial-next');assert.equal(state(),t);await place('mtn_sanae',0,0);
 ok(t.complete&&t.practice.players[0].hand.length===0&&t.practice.drawPile.length===t.initialPileSize,'The first placement completes without silently drawing a skill card, and Next is gated by the real exercise result');
 click('tutorial-next');t=state();assert.equal(t.step,1);assert.equal(t.preludeMatch,prepared);const firstExercise=t.practice;
 await place('mtn_sanae',2,2);
 ok(t.complete&&t.practice.players[0].discard.length===4&&el('tutorial-next').textContent==='Start chapter','The second first-chapter page requires an actual four-card faction claim');
 click('tutorial-next');
 ok(match()===prepared&&firstExercise.cancelled&&normalSnapshot(prepared)===initial&&JSON.stringify([...storage])===saved,'Completing both first-chapter pages starts the same untouched reserved chapter with no saved stars or setting changes');
 t=begin(3);prepared=t.preludeMatch;initial=normalSnapshot(prepared);
 ok(run('tutorialPage().goal')==='cost'&&t.practice.players[0].hand.join(',')==='haku_yuyuko,hell_clownpiece'&&run('tutorialAllowsAction("place","haku_yuyuko")')&&!run('tutorialAllowsAction("place","heaven_iku")'),'The cost prelude teaches the newly unlocked Yuyuko with exactly one payable hand card');
 t.practice.ui.pickOwnHandCards=async(_title,ids)=>[ids[0]];await place('haku_yuyuko',1,1);
 ok(t.complete&&t.practice.drawPile.includes('hell_clownpiece')&&t.practice.players[0].discard.includes('mtn_aya')&&t.practice.players[0].hand.length===0,'The real cost payment returns the chosen card to the pile and Yuyuko scores the adjacent target');
 click('tutorial-next');ok(match()===prepared&&normalSnapshot(prepared)===initial,'Finishing cost practice preserves the formal Yuyuko opening and its untouched score goals');
 t=begin(3);prepared=t.preludeMatch;initial=normalSnapshot(prepared);t.practice.ui.pickOwnHandCards=async()=>null;await place('haku_yuyuko',1,1);
 ok(!t.complete&&el('tutorial-next').disabled&&t.finishedAction,'Declining the optional cost does not falsely complete the cost exercise');
 const failed=t.practice;click('tutorial-retry');
 ok(failed.cancelled&&state().preludeMatch===prepared&&state().practice.players[0].hand.length===2&&!state().finishedAction&&normalSnapshot(prepared)===initial,'Retry restores only the practice cards while keeping the original reserved formal match');
 click('tutorial-skip');assert.equal(match(),prepared);
 t=begin(6);prepared=t.preludeMatch;initial=normalSnapshot(prepared);
 ok(t.step===4&&run('tutorialAllowsTrade()')&&t.practice.shopCards.join(',')==='shop_rinnosuke,sdm_meiling,hourai_tewi,mtn_nitori','The trade prelude starts at the Rinnosuke offer page using only chapter-six shop cards');
 ctx.beginShopTrade();run('updateTutorialProgress();');
 ok(state()===t&&t.step===5&&run('tutorialPage().goal')==='trade'&&!el('tutorial-skip').hidden,'Opening merchandise advances to the second trade page without replacing the practice or its reserved match');
 t.practice.tradeCard(0,t.practice.tutorialExercise.tradeCard,1);run('pendingCellChoice=null;updateTutorialProgress();');for(let i=0;i<8;i++)await Promise.resolve();
 ok(t.complete&&t.practice.tradedThisTurn[0]&&t.practice.currentPlayerIdx===0,'An actual shop exchange completes the trade lesson without consuming the player’s turn');
 click('tutorial-next');ok(match()===prepared&&normalSnapshot(prepared)===initial&&!prepared.tradedThisTurn.some(Boolean),'Finishing trade practice restores the reserved random stock, Sakuya hand and unused trade allowance');
 t=begin(1);await place('mtn_sanae',0,0);click('tutorial-next');prepared=state().preludeMatch;initial=normalSnapshot(prepared);click('tutorial-skip');assert.equal(match(),prepared);assert.equal(normalSnapshot(prepared),initial);
 t=begin(6);ctx.beginShopTrade();run('updateTutorialProgress();');prepared=t.preludeMatch;initial=normalSnapshot(prepared);click('tutorial-skip');
 ok(match()===prepared&&normalSnapshot(prepared)===initial,'Skipping from either multi-page lesson’s final page also preserves the formal match');
 t=begin(3);prepared=t.preludeMatch;click('tutorial-back');
 ok(match()===null&&prepared.cancelled&&run('storyMenuChapter')===3&&el('story-overlay').classList.contains('show'),'Back on the first page exits to the chapter introduction and discards the unused reserved match');
 t=begin(1);prepared=t.preludeMatch;await place('mtn_sanae',0,0);click('tutorial-next');const second=state().practice;click('tutorial-back');
 ok(state().step===0&&second.cancelled&&state().preludeMatch===prepared&&!prepared.cancelled,'Back within a multi-page prelude restarts the earlier exercise while retaining the same formal opening');
 run('returnToMainMenu();');ok(prepared.cancelled&&state()===null&&el('tutorial-skip').hidden,'Leaving for the main menu cancels both the exercise and its unused reserved match');
 for(const chapter of [2,4,5,7]){begin(chapter);assert(run('isStoryMatch()'));assert(state()===null);assert(el('tutorial-skip').hidden);}
 ok(true,'The other four chapters still start directly from their card introductions');
 run('returnToMainMenu();openTutorial(0);');
 ok(state().preludeChapter===null&&state().practice.players.length===3&&el('tutorial-back').disabled&&el('tutorial-skip').hidden&&run('TUTORIALS.length')===7,'The standalone Learn to Play keeps its original seven-page sequence and three-seat first exercise');

 // A stale real cost picker must never act on the newly started formal chapter.
 let entered=false,release;const gate=new Promise(resolve=>release=resolve);ctx.costPicker=async(_title,ids)=>{entered=true;await gate;return [ids[0]];};run('ui.pickOwnHandCards=costPicker;');
 t=begin(3);prepared=t.preludeMatch;initial=normalSnapshot(prepared);const retired=t.practice;retired.aiTestMode=retired.fastAITest=true;
 const originalAction=run('doPlayerAction');ctx.pendingAction=async()=>{retired.removeFromHand(0,'haku_yuyuko');return await retired.internalPlace('haku_yuyuko',1,1,0,0);};run('doPlayerAction=pendingAction;');
 const pending=ctx.actualPreludeRun(t);
 for(let i=0;i<100&&!entered;i++)await new Promise(resolve=>setTimeout(resolve,1));assert(entered);
 click('tutorial-skip');assert.equal(match(),prepared);release();await pending;ctx.originalAction=originalAction;run('doPlayerAction=originalAction;');
 ok(retired.cancelled&&match()===prepared&&normalSnapshot(prepared)===initial&&state()===null,'Skipping during an actual suspended cost payment cancels the old human turn and prevents stale settlement from touching the formal chapter');
 let releaseVisual;const visuals=new Promise(resolve=>releaseVisual=resolve);ctx.waitForVisualEffects=()=>visuals;
 t=begin(1);prepared=t.preludeMatch;initial=normalSnapshot(prepared);const finishing=run('finishTutorialAction(tutorialState)');click('tutorial-skip');releaseVisual(true);await finishing;
 ok(match()===prepared&&normalSnapshot(prepared)===initial&&state()===null,'A delayed exercise-completion callback cannot re-enable tutorial controls or alter the formal match after skipping');ctx.waitForVisualEffects=async()=>true;
 let probes=0;ctx.onProbe=()=>probes++;run('ui.onPreludeProbe=onProbe;');t=begin(3);prepared=t.preludeMatch;click('tutorial-skip');prepared.ui.onPreludeProbe();assert.equal(probes,1);run('returnToMainMenu();');prepared.ui.onPreludeProbe();
 ok(probes===1,'Adopting the reserved formal game retains the normal owner-cancellation guards for UI effects');
 assert.equal(JSON.stringify([...storage]),saved);

 const material=fs.readFileSync(__dirname+'/card-materials-2026-10-12.cjs','utf8'),materialBox={module:{exports:{}},require,__dirname,console};vm.runInNewContext(material.slice(0,material.indexOf("const copy='created_card_910'"))+'\nmodule.exports={A};',materialBox);const A=materialBox.module.exports.A;
 const pages=run('JSON.stringify(Object.values(STORY_PRELUDES).flatMap(lesson=>lesson.steps.map(step=>({...TUTORIALS[step],...lesson.pages[step]}))))');
 const messages=['Skip tutorial','Chapter tutorial · 1 / 2','This is a separate practice. You can skip it; your chapter cards and objectives stay unchanged.',...JSON.parse(pages).flatMap(page=>[page.title,page.body,page.success]).filter(Boolean)];
 for(const language of ['en','zh-CN']){A.setLanguage(language);for(const message of messages){const translated=A.translateGameText(message);assert.equal(translated===message,language==='en',message);if(language==='zh-CN')assert(/[\u3400-\u9fff]/.test(translated),translated);}}
 ok(true,'Every prelude title, instruction, success message, progress counter and skip control translates through the actual bilingual path');
 const result={status:'pass',count:checks.length,checks,scope:'Actual story-begin/skip/back/retry/next handlers; reserved game identity and full serialized state; real placement, faction claim, cost payment and trade; no story storage/settings writes; standard-tutorial compatibility; pending real cost and visual cancellation; effect owner guards and bilingual texts. Controlled DOM, no browser pixel verification.'};
 fs.writeFileSync(__dirname+'/story-preludes-2026-10-18-results.json',JSON.stringify(result,null,2)+'\n');finished=true;console.log(result.count+' story prelude and isolation checks passed');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
