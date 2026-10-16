const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{',box={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx};',box);const {ctx}=box.module.exports;
const checks=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
vm.runInContext(`
  const basicEvaluate=aiBasicEvaluateCard;let basicCalls=0;aiBasicEvaluateCard=(...args)=>{basicCalls++;return basicEvaluate(...args);};
  for(const chapter of [2,3,4,5]){
    game=new Game(2,{},null,{aiOnly:true,fastTest:true,aiDifficulty:'hard'});configureStoryMatch(game,chapter);
    assert.equal(game.aiDifficulty,'easy');assert(aiKnows(1,'basic'));for(const feature of ['trade','value','defense','clues','reserve','forecast'])assert(!aiKnows(1,feature));
    const id=game.players[1].hand[0],before=basicCalls;aiEvaluateCard(1,id);assert.equal(basicCalls,before+1);
  }
  aiBasicEvaluateCard=basicEvaluate;
`,ctx);ok(true,'All four later chapters override a hard caller with Easy and actually dispatch card evaluation to the basic evaluator without advanced difficulty features');

const material=fs.readFileSync(__dirname+'/card-materials-2026-10-12.cjs','utf8'),end="const copy='created_card_910'",renderBox={module:{exports:{}},require,__dirname,console};
vm.runInNewContext(material.slice(0,material.indexOf(end))+'\nmodule.exports={ctx,A,el,Element,documentFixture};',renderBox);
const {ctx:render,A,el,Element,documentFixture}=renderBox.module.exports,storage=new Map();
Element.prototype.prepend=function(node){this.appendChild(node);this.children.unshift(this.children.pop());};
render.window.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
render.ui={};render.online=null;render.closeAITestDashboard=()=>{};render.updateAITestControls=()=>{};render.runNextTurn=()=>{};render.queueMobileViewport=()=>{};render.window.scrollTo=()=>{};render.renderAll=()=>{};
vm.runInContext(html.slice(html.indexOf('let titleCardDrag='),html.indexOf('function drawTitlePreviewCards('))+html.slice(html.indexOf('function tableCardBounds('),html.indexOf('function setTitleCardFace(')),render);
vm.runInContext(html.slice(html.indexOf('/* Guided practice uses'),html.indexOf('/* CSS lays out the phone table')),render);
render.runTutorialTurn=()=>{};
render.pendingRectChoice=null;
render.resetGameView=()=>vm.runInContext('if(game)game.cancelled=true;clearTutorialPractice();clearStoryMatch();game=null;',render);render.returnToMainMenu=render.resetGameView;
const run=code=>vm.runInContext(code,render),feedback=()=>el('tutorial-feedback').innerHTML,done=()=>((feedback().match(/class="tutorial-goal done"/g))||[]).length;
for(const chapter of [2,3,4,5]){
  render.returnToMainMenu();run('saveStoryStars('+chapter+',STORY_GOAL_KEYS['+chapter+']);openStoryChapter('+chapter+');');
  ok(run('game.aiDifficulty')==='easy','The actual chapter '+chapter+' opener starts Easy AI');
  ok(done()===0&&!/[★☆]/.test(feedback())&&!feedback().includes('story-stars')&&!el('tutorial-feedback').classList.contains('story-perfect'),'A previously perfect chapter '+chapter+' starts with three incomplete current-match goals and no star rating');
  ok(el('tutorial-copy').innerHTML===''&&html.includes('.story-practice #tutorial-copy{display:none;}'),'Chapter '+chapter+' removes and hides the duplicate in-match introduction');
  run('game.storyMatch.progress[STORY_GOAL_KEYS['+chapter+'][0]]=true;updateStoryProgress();');
  ok(done()===1&&feedback().includes('✓')&&feedback().includes('○')&&!feedback().includes('Collected in an earlier victory'),'Chapter '+chapter+' marks exactly the one objective performed this match');
  const previous=run('game');el('tutorial-retry').events.click[0]();
  ok(previous.cancelled&&run('game')!==previous&&run('game.aiDifficulty')==='easy'&&done()===0&&run('storyBestStars('+chapter+')')===3,'Retry of chapter '+chapter+' clears current checks while preserving menu stars and Easy difficulty');
  run('game.storyMatch.progress[STORY_GOAL_KEYS['+chapter+'][0]]=true;'+(chapter===3?'game.storyMatch.opponentReachedFour=true;':'')+'game.winner=game.players[0];updateStoryProgress();');
  ok(done()===1&&!/[★☆]/.test(feedback())&&run('storyState.complete')&&run('storyChapterPerfect('+chapter+')'),'A one-goal replay win in chapter '+chapter+' keeps only that match’s check visible without erasing a saved perfect record');
  if(chapter===3)ok(feedback().includes('tutorial-goal failed')&&!feedback().includes('Collected in an earlier victory'),'A previously banked race star cannot hide the current match’s failed race');
  render.returnToMainMenu();run('openStoryMenu();');const rating=el('story-levels').children[chapter-1].children[2].children[1];
  ok(rating.textContent.includes('★★★')&&rating.classList.contains('story-stars-perfect'),'Chapter '+chapter+' still displays cumulative stars and faction color in selection');
}
render.returnToMainMenu();storage.clear();run('saveStoryStars(2,["sdm"]);saveStoryStars(2,["remilia"]);saveStoryStars(2,["flandre"]);openStoryChapter(2);');
ok(done()===0&&!/[★☆]/.test(feedback())&&!run('storyChapterPerfect(2)'),'Cumulative three-star progress also cannot pre-complete a fresh match');
render.returnToMainMenu();run('openStoryMenu();');const cumulative=el('story-levels').children[1].children[2].children[1];
ok(cumulative.textContent.includes('★★★')&&!cumulative.classList.contains('story-stars-perfect'),'Cumulative and single-run stars remain distinct in the menu');
for(const language of ['en','zh-CN']){
  render.returnToMainMenu();A.setLanguage(language);run('openStoryChapter(2);');
  ok(feedback().includes(language==='en'?'Match objectives':'本局目标')&&!/[★☆]/.test(feedback())&&el('tutorial-copy').innerHTML==='','The actual '+language+' match renderer shows local objectives without stars or duplicate copy');
  render.returnToMainMenu();run('openStoryChapter(3);game.storyMatch.opponentReachedFour=true;updateStoryProgress();');
  ok(feedback().includes(language==='en'?'This objective is unavailable':'本局无法完成此目标')&&feedback().includes('tutorial-goal failed'),'The '+language+' race-failure hint describes the current objective rather than a stored star');
}
render.returnToMainMenu();A.setLanguage('en');run('openStoryChapter(1);');ok(run('game.aiDifficulty')==='hard'&&!/[★☆]/.test(feedback())&&el('tutorial-copy').innerHTML==='','Chapter one retains its mentor base while using the same clean in-match panel');
render.returnToMainMenu();run('openTutorial(0);');
ok(el('tutorial-copy').innerHTML.includes('Select')&&el('tutorial-copy').innerHTML.includes('Sanae')&&!documentFixture.body.classList.contains('story-practice'),'Leaving story mode restores the original tutorial instructions and removes the story-only hiding class');
render.returnToMainMenu();run('game=new Game(2,{},null,{aiDifficulty:"hard"});');ok(run('game.aiDifficulty')==='hard'&&!run('game.storyMatch'),'Ordinary Hard matches retain their selected difficulty');
const result={status:'pass',count:checks.length,checks,scope:'Actual Easy evaluator dispatch and live chapter openers; real translated coach/menu renderers with replay, current-only progress, race failure, persistent cumulative/perfect stars, ordinary difficulty and tutorial restoration in a controlled DOM. Browser pixels are not verified.'};
fs.writeFileSync(__dirname+'/story-match-objectives-easy-2026-10-16-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' current-match objectives and Easy-story checks passed');
