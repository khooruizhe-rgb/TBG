// Use the real hand, board and detail renderers with a DOM fixture.
// This verifies markup/state; it does not simulate browser painting.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'touhou_board_game_github_textures.html'),'utf8');
const js=html.split('<script>')[1].split('</script>')[0];
class Element{
  constructor(){this.names=new Set();this.dataset={};this.children=[];this.attributes={};this.events={};this.values=new Map();this.style={setProperty:(key,value)=>this.values.set(key,String(value)),removeProperty:key=>this.values.delete(key)};this.nodeType=1;this.isConnected=true;this.clientWidth=400;
    this.classList={add:(...names)=>names.forEach(n=>this.names.add(n)),remove:(...names)=>names.forEach(n=>this.names.delete(n)),contains:n=>this.names.has(n),toggle:(n,on)=>on?this.names.add(n):this.names.delete(n)};}
  set className(v){this.names=new Set(v.split(/\s+/).filter(Boolean));}get className(){return [...this.names].join(' ');}
  set innerHTML(v){this.markup=v;this.replaceChildren();}get innerHTML(){return this.markup||'';}
  appendChild(node){if(node.parentElement){const siblings=node.parentElement.children,index=siblings.indexOf(node);if(index>=0)siblings.splice(index,1);}this.children.push(node);node.parentElement=this;node.isConnected=true;return node;}
  append(...nodes){nodes.forEach(node=>this.appendChild(node));}
  remove(){if(this.parentElement){const siblings=this.parentElement.children;siblings.splice(siblings.indexOf(this),1);this.parentElement=null;}this.isConnected=false;}
  replaceChildren(){this.children.forEach(n=>n.parentElement=null);this.children=[];}
  querySelectorAll(){return [];}querySelector(){return null;}
  addEventListener(k,fn){(this.events[k]||=[]).push(fn);}removeEventListener(k,fn){this.events[k]=(this.events[k]||[]).filter(f=>f!==fn);}setAttribute(k,v){this.attributes[k]=v;}removeAttribute(k){delete this.attributes[k];}
  focus(){documentFixture.activeElement=this;}getBoundingClientRect(){return this.rect||(this.classList.contains('creation-hand-placeholder')?{left:80,top:610,width:104,height:126,right:184,bottom:736}:{left:0,top:0,width:400,height:100,bottom:100,right:400});}
}
const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
el('card-detail').appendChild(el('card-detail-description'));
let clock=1000,nextTimer=0,reducedMotion=false;const timers=new Map(),documentListeners=new Map(),windowListeners=new Map();
const documentFixture={activeElement:null,body:new Element(),documentElement:new Element(),createElement:()=>new Element(),querySelectorAll:()=>[],
  addEventListener:(key,fn)=>documentListeners.set(key,[...(documentListeners.get(key)||[]),fn]),removeEventListener:(key,fn)=>documentListeners.set(key,(documentListeners.get(key)||[]).filter(f=>f!==fn))};
const ctx=vm.createContext({console,el,document:documentFixture,window:{innerWidth:1200,innerHeight:800,matchMedia:()=>({matches:reducedMotion}),
  addEventListener:(key,fn)=>windowListeners.set(key,[...(windowListeners.get(key)||[]),fn]),removeEventListener:(key,fn)=>windowListeners.set(key,(windowListeners.get(key)||[]).filter(f=>f!==fn))},
  setTimeout:(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,due:clock+delay});return id;},clearTimeout:id=>timers.delete(id),
  requestAnimationFrame:()=>1,localSeat:()=>0,localTurnReady:()=>true,syncRemiliaArrival(){},updateTutorialProgress(){},queueMobileViewport(){},onHandCardDragEnd(){},
  playGameCue(){},
  Audio:class{addEventListener(){}play(){return Promise.resolve();}pause(){}},
  waitForVisualEffects:async()=>true,
  illusionCardStyle:()=>'',crownLightFor:()=>({main:'#aaa',rgb:'1,2,3'})});
const slice=(start,end)=>js.slice(js.indexOf(start),js.indexOf(end,js.indexOf(start)));
vm.runInContext(slice('const DIRS4 =','/* ===================== UI layer')+'\nlet game=null;\n'+
  slice('const FACTION_BG_CLASS =','const CARD_ABILITY_NAMES =')+
  slice('const CARD_ABILITY_NAMES =','/* Only trusted rule text')+
  slice('/* Only trusted rule text','const yuukaSunflowerUntil=')+
  slice('function escapeLogHtml(','function newspaperHtml(')+
  slice('function serializablePickArgs(','async function humanPick(')+
  slice('function handCardFaceHtml(','function cardNameListHtml(')+`
  var pendingHandChoice=null,selectedHandCard=null,pendingCellChoice=null;
  var mindArrivals=new Map(),sanaeArrivalUntil=new Map(),mokouArrivalUntil=new Map(),yukariArrivalUntil=new Map();
  this.api={Game,CARD,cardBoardHtml,renderHand,openCardDetails,closeCardDetails,backCardDetails,dynamicCardDescription,cardHasOverwrite,cardBgClass,serializablePickArgs,validOnlineChoice,translateGameText,canonicalCardName,
    setGame:g=>game=g,setLanguage:l=>gameLanguage=l};`,ctx);
vm.runInContext(slice('/* Printed creation choices:','/* generic UI choosers')+
  slice('function layoutFlightMargin(node)',"document.addEventListener('keydown',event=>{")+
  'this.api.openCreationChoice=openCreationChoice;this.api.closeCreationChoice=closeCreationChoice;this.api.creationSession=()=>creationChoiceSession;this.api.departures=()=>[...creationDepartureFlights];',ctx);
vm.runInContext('var sfxEnabled=true;'+slice('const CREATION_PRINT_SOUND=','const DRAW_SOUND_INTERVAL_MS'),ctx);
ctx.handOrSeatRect=()=>({left:40,top:610,width:300,height:100,right:340,bottom:710});
vm.runInContext('this.materialChoice={'+slice('  pickAbilityCards(title,ids','  pickFromList(title, options')+'};',ctx);
ctx.api.pickAbilityCards=ctx.materialChoice.pickAbilityCards;
vm.runInContext('this.api.onCreationChoices=({'+slice('  async onCreationChoices(','  onDrawPileReturn:')+'}).onCreationChoices;',ctx);
vm.runInContext(js.slice(js.indexOf('function mindEyeSvg('),js.indexOf('\n}',js.indexOf('function mindEyeSvg('))+2),ctx);
vm.runInContext(slice('function handOrSeatRect(','function showKoishiSelfPlace(')+'this.api.actualHandOrSeatRect=handOrSeatRect;this.api.actualHandCardRect=tradeHandCardRect;',ctx);
vm.runInContext('let mobileViewportFrame=0;'+slice('function mobileHandMetrics(','function queueMobileViewport(')+'this.api.mobileHandMetrics=mobileHandMetrics;this.api.actualSyncMobileViewport=syncMobileViewport;',ctx);
ctx.syncMobileViewport=undefined;
ctx.handOrSeatRect=()=>({left:40,top:610,width:300,height:100,right:340,bottom:710});
const A=ctx.api,tests=[];
function test(name,fn){fn();tests.push(name);console.log('PASS '+name);}
function advance(ms){clock+=ms;for(const [id,timer]of [...timers])if(timer.due<=clock){timers.delete(id);timer.fn();}}
const copy='created_card_910',wornCopy='created_card_911';
A.CARD[copy]={...A.CARD.hourai_mokou,id:copy,baseId:'hourai_mokou',createdCopy:true,copiedAbility:'hourai_mokou',costBonus:1,abilityMultiplier:1};
A.CARD[wornCopy]={...A.CARD.haku_yuyuko,id:wornCopy,baseId:'haku_yuyuko',createdCopy:true,copiedAbility:'__draw_one',costBonus:1,abilityMultiplier:2};
const match={players:[{idx:0,name:'You',isAI:false,hand:['haku_yuyuko',copy,wornCopy,'mtn_sanae']}],currentPlayerIdx:0,forcedPlay:{},permanentAbilities:{haku_yuyuko:'__draw_one'},
  isPlacementBlocked:()=>false,isCardAbilityDisabled:()=>false,isSageMuted:()=>false,isOnBoard:()=>false,abilityId(id){return this.permanentAbilities[id]||A.CARD[id].copiedAbility||id;}};
A.setGame(match);
test('AI test hand follows the acting seat and decree, remains inspectable and cannot be manually played',()=>{
  const observed={...match,aiTestMode:true,currentPlayerIdx:1,permanentAbilities:{},forcedPlay:{1:'hourai_reisen'},players:[
    {idx:0,name:'AI 1',isAI:true,hand:['sdm_remilia']},
    {idx:1,name:'AI 2',isAI:true,hand:['hourai_reisen',copy]},
    {idx:2,name:'AI 3',isAI:true,hand:['mtn_sanae','hell_komachi',wornCopy]}]};
  A.setGame(observed);A.renderHand();
  assert.deepEqual(el('hand').children.map(node=>node.dataset.cardId),['hourai_reisen',copy]);
  assert.equal(el('hand-title').textContent,"AI 2's hand");assert(el('hand').children[0].classList.contains('reisen-bound'));
  assert(el('hand').children[1].classList.contains('card-copy-low-ink'));
  for(const node of el('hand').children){assert(!node.classList.contains('disabled'));assert(!node.classList.contains('touch-drag-ready'));assert(!node.events.click);}
  el('hand').children[0].events.dblclick[0]({stopPropagation(){}});assert(el('card-detail-overlay').classList.contains('show'));A.closeCardDetails();
  for(const idx of [2,0,1,1]){observed.currentPlayerIdx=idx;A.renderHand();assert.deepEqual(el('hand').children.map(node=>node.dataset.cardId),observed.players[idx].hand);}
  observed.aiTestMode=false;observed.currentPlayerIdx=2;A.renderHand();assert.equal(el('hand').children[0].dataset.cardId,'sdm_remilia');
  assert.equal(el('hand-title').textContent,'Your Hand');
  observed.aiTestMode=true;observed.players[0].isAI=false;A.renderHand();assert.equal(el('hand').children[0].dataset.cardId,'sdm_remilia');
  A.setGame(match);A.renderHand();
});
test('Hand flight anchors track the visible AI while other players retain their seat anchors',()=>{
  const observed={...match,aiTestMode:true,currentPlayerIdx:1,players:[{idx:0,name:'AI 1',isAI:true,hand:['sdm_remilia']},{idx:1,name:'AI 2',isAI:true,hand:['mtn_sanae']}]};
  const saved=ctx.handOrSeatRect;ctx.handOrSeatRect=A.actualHandOrSeatRect;ctx.seatRect=p=>({left:500+p*90,top:20,width:40,height:60});
  A.setGame(observed);A.renderHand();el('hand-area').rect={left:20,top:500,width:300,height:150};el('hand').children[0].rect={left:40,top:510,width:70,height:100};
  assert.equal(A.actualHandOrSeatRect(1).left,20);assert.equal(A.actualHandOrSeatRect(0).left,500);
  assert.equal(A.actualHandCardRect(1,'mtn_sanae').left,40);assert.equal(A.actualHandCardRect(0,'sdm_remilia').left,488);
  observed.currentPlayerIdx=0;A.renderHand();assert.equal(A.actualHandOrSeatRect(0).left,20);assert.equal(A.actualHandOrSeatRect(1).left,590);
  ctx.handOrSeatRect=saved;delete ctx.seatRect;delete el('hand-area').rect;A.setGame(match);A.renderHand();
});
test('Mobile card sizing uses the acting AI hand count rather than the first seat count',()=>{
  const observed={...match,aiTestMode:true,currentPlayerIdx:1,players:[{idx:0,name:'AI 1',isAI:true,hand:['sdm_remilia']},{idx:1,name:'AI 2',isAI:true,hand:['mtn_sanae','mtn_aya','hourai_reisen','hell_komachi','hell_kutaka','temple_shou','palace_satori','sage_ran','yuuka']}]};
  const oldWidth=ctx.window.innerWidth,oldHeight=ctx.window.innerHeight,oldMatch=ctx.window.matchMedia,oldBody=documentFixture.body;
  documentFixture.body=new Element();ctx.window.innerWidth=900;ctx.window.innerHeight=400;ctx.window.matchMedia=()=>({matches:true});
  ctx.mobileFullscreenWanted=()=>true;ctx.dockTutorialCoach=()=>{};ctx.closeMobileJournal=()=>{};ctx.getComputedStyle=()=>({paddingLeft:'0',paddingRight:'0'});
  ctx.positionRinnosukeBubble=()=>{};ctx.repositionYuukaBlooms=()=>{};
  el('game').classList.add('active');el('hand').rect={left:0,top:0,width:130,height:300};A.setGame(observed);
  A.actualSyncMobileViewport();assert.equal(documentFixture.body.values.get('--mobile-card-height'),A.mobileHandMetrics(130,300,9).cardHeight+'px');
  observed.currentPlayerIdx=0;A.actualSyncMobileViewport();assert.equal(documentFixture.body.values.get('--mobile-card-height'),A.mobileHandMetrics(130,300,1).cardHeight+'px');
  ctx.window.innerWidth=oldWidth;ctx.window.innerHeight=oldHeight;ctx.window.matchMedia=oldMatch;documentFixture.body=oldBody;
  el('game').classList.remove('active');delete el('hand').rect;A.setGame(match);A.renderHand();
});
test('Board cards distinguish low-ink copies, worn retrieved cards and ordinary originals',()=>{
  const printed=A.cardBoardHtml(copy),worn=A.cardBoardHtml('haku_yuyuko'),plain=A.cardBoardHtml('mtn_sanae');
  assert.match(printed,/card-copy-low-ink/);assert.match(printed,/card-low-ink-lines/);assert(!printed.includes('instance-badge'));
  assert.match(worn,/card-rin-worn/);assert.match(worn,/card-wear-overlay/);assert.match(worn,/Ability: Overwrite/);
  assert(!plain.includes('card-copy-low-ink'));assert(!plain.includes('card-rin-worn'));assert(!worn.includes('card-copy-low-ink'));
});
test('An existing overwritten copy retains its worn appearance, draw effect and surcharge',()=>{
  const markup=A.cardBoardHtml(wornCopy);assert.match(markup,/card-copy-low-ink card-rin-worn/);assert.match(markup,/card-wear-overlay/);
  assert(!markup.includes('instance-badge'));assert(!markup.includes('Cost +'));assert(A.dynamicCardDescription(wornCopy).startsWith('Placed: Draw a card.'));
  assert.equal(A.CARD[wornCopy].faction,'hakugyokurou');assert.equal(A.CARD.haku_yuyuko.faction,'hakugyokurou');
  assert.match(markup,/Yuyuko Saigyouji\?/);assert(!markup.includes('Saigyouji??'));
});
test('The real hand renderer applies the same print and wear layers without copy labels',()=>{
  A.setLanguage('zh-CN');A.renderHand();const cards=el('hand').children;
  assert.equal(cards.length,4);assert(cards[0].classList.contains('card-rin-worn'));assert(cards[1].classList.contains('card-copy-low-ink'));
  assert(cards[2].classList.contains('card-rin-worn'));assert(cards[2].classList.contains('card-copy-low-ink'));
  assert.match(cards[0].innerHTML,/技能：覆盖/);assert.match(cards[1].innerHTML,/card-low-ink-lines/);assert.match(cards[2].innerHTML,/card-wear-overlay/);
  assert(!cards[1].innerHTML.includes('instance-badge'));assert(!cards[2].innerHTML.includes('instance-badge'));
  assert(!cards[3].classList.contains('card-rin-worn'));assert(!cards[3].classList.contains('card-copy-low-ink'));
});
test('The print filter and dropout lines cover the complete card, including detail header and claim squares',()=>{
  const surface=html.slice(html.indexOf(':is(.board-card,.hand-card,.custom-card-tile,#card-detail).card-copy-low-ink{')).split('}')[0];
  const lines=html.slice(html.indexOf('.card-copy-low-ink>.card-low-ink-lines{')).split('}')[0];
  assert.match(surface,/filter:var\(--card-copy-filter\)/);assert.match(surface,/url\(#card-copy-low-ink-filter\)/);
  assert.match(lines,/inset:0/);assert.match(lines,/z-index:20/);assert.match(lines,/pointer-events:none/);assert.match(lines,/repeating-linear-gradient\(to bottom/);
  assert(!surface.includes('background:'));assert(!html.includes('card-copy-invert'));assert(!html.includes('card-print-ink'));
  const detail=html.slice(html.indexOf('<div id="card-detail" tabindex="-1">'),html.indexOf('<div id="rule-term-popover"'));
  assert.match(detail,/<div id="card-detail"[^>]*>\s*<div class="card-low-ink-lines" aria-hidden="true"><\/div>\s*<div class="card-detail-header">/);
  assert.match(detail,/id="card-detail-icon"/);assert.match(detail,/id="card-detail-claim-size"/);assert.match(detail,/id="card-detail-crown"/);
  const markup=A.cardBoardHtml(copy);assert.match(markup,/card-art-mokou/);assert.equal((markup.match(/card-low-ink-lines/g)||[]).length,1);
});
test('Inspection shows 覆盖 / Overwrite with the draw effect and retains both material states',()=>{
  A.openCardDetails(wornCopy);assert(el('card-detail').classList.contains('card-rin-worn'));assert(el('card-detail').classList.contains('card-copy-low-ink'));
  assert.equal(el('card-detail-ability').textContent,'覆盖');assert.match(el('card-detail-description').innerHTML,/抽一张牌/);assert.match(el('card-detail-description').innerHTML,/代价/);
  A.setLanguage('en');A.openCardDetails('haku_yuyuko');assert.equal(el('card-detail-ability').textContent,'Overwrite');assert.match(el('card-detail-description').innerHTML,/Draw a card/);
  assert(el('card-detail').classList.contains('card-rin-worn'));assert(!el('card-detail').classList.contains('card-copy-low-ink'));
});
test('Inspecting and rendering ordinary cards clears material state from reused elements',()=>{
  A.openCardDetails('mtn_sanae');assert(!el('card-detail').classList.contains('card-rin-worn'));assert(!el('card-detail').classList.contains('card-copy-low-ink'));
  match.permanentAbilities={};A.renderHand();assert(!el('hand').children[0].classList.contains('card-rin-worn'));
});
test('Only Sage muting applies Eirin desaturation; unpaid copies and non-Sage crowns retain color',()=>{
  match.isCardAbilityDisabled=()=>true;
  match.isSageMuted=id=>A.CARD[id]?.faction==='sage';
  match.players[0].hand=['mtn_kanako','sdm_remilia','hourai_tewi',copy,'sage_kasen'];
  A.renderHand();
  const cards=el('hand').children;
  assert(cards.slice(0,4).every(card=>!card.classList.contains('eirin-muted')));
  assert(cards[4].classList.contains('eirin-muted'));
  A.openCardDetails(copy);assert(!el('card-detail').classList.contains('eirin-muted'));
  A.openCardDetails('sage_kasen');assert(el('card-detail').classList.contains('eirin-muted'));
  A.openCardDetails('mtn_kanako');assert(!el('card-detail').classList.contains('eirin-muted'));
  assert.match(html,/\.card-copy-low-ink\.eirin-muted\{--copy-mute-filter:saturate/);
});
test('Copy inspection preserves the portrait crop and returns to an unfiltered ordinary card',()=>{
  A.openCardDetails(copy);assert(el('card-detail').classList.contains('detail-card-hourai_mokou'));
  const children=el('card-detail-portrait').children;
  assert(children.some(node=>node.className==='detail-art-hourai_mokou'));
  assert(!children.some(node=>node.className==='card-low-ink-lines')); // printing belongs to the whole card, never the portrait
  assert.match(el('card-detail-description').innerHTML,/cost|代价/);
  A.openCardDetails('mtn_sanae');assert(!el('card-detail').classList.contains('card-copy-low-ink'));
  assert(!el('card-detail-portrait').children.some(node=>node.className==='card-low-ink-lines'));
});
test('Creation preview inspection retains printing through reference navigation and clears it afterward',()=>{
  const before=JSON.stringify(A.CARD.hourai_mokou);
  A.closeCardDetails();A.openCardDetails('hourai_mokou',{createdPreview:true});
  assert.match(el('card-detail-name').textContent,/\?$/);
  assert(el('card-detail').classList.contains('card-copy-low-ink'));
  assert(el('card-detail-portrait').children.some(node=>node.className==='detail-art-hourai_mokou'));
  A.openCardDetails('mtn_sanae',{followReference:true});assert(!el('card-detail').classList.contains('card-copy-low-ink'));
  A.backCardDetails();assert(el('card-detail').classList.contains('card-copy-low-ink'));
  A.closeCardDetails();A.openCardDetails('hourai_mokou');assert(!el('card-detail').classList.contains('card-copy-low-ink'));
  assert.equal(JSON.stringify(A.CARD.hourai_mokou),before);
});
test('Original creation previews ignore borrowed skills, live fields, illusions and board muting',()=>{
  A.setLanguage('en');const original={...A.CARD.temple_nue},priorBorrow=match.borrowedAbilities,priorOnBoard=match.isOnBoard,priorMute=match.isSageMuted,priorIllusion=ctx.illusionCardStyle;
  match.borrowedAbilities={temple_nue:'sage_ran'};match.isOnBoard=()=>true;match.isSageMuted=()=>true;ctx.illusionCardStyle=()=> 'filter:invert(1)';
  try{
    A.openCardDetails('temple_nue');assert.match(el('card-detail-description').innerHTML,/Using/);
    Object.assign(A.CARD.temple_nue,{name:'Altered source',faction:'sage',desc:'Placed: Draw a card.'});
    const markup=A.cardBoardHtml('temple_nue',{createdPreview:true});assert(markup.includes(original.name+'?'));assert(!markup.includes('Altered source'));
    assert(!markup.includes('eirin-muted'));assert(!markup.includes('card-art-illusion'));assert(!markup.includes('filter:invert'));
    assert.equal(A.dynamicCardDescription('temple_nue',false,{createdPreview:true}),original.desc);
    A.openCardDetails('temple_nue',{createdPreview:true});assert(!el('card-detail').classList.contains('eirin-muted'));
    assert(el('card-detail').classList.contains('temple'));assert(!el('card-detail-description').innerHTML.includes('Using'));
    assert.equal(el('card-detail-name').textContent,original.name+'?');assert(!el('card-detail-description').innerHTML.includes('Placed: Draw a card.'));
  }finally{Object.assign(A.CARD.temple_nue,original);match.borrowedAbilities=priorBorrow;match.isOnBoard=priorOnBoard;match.isSageMuted=priorMute;ctx.illusionCardStyle=priorIllusion;A.closeCardDetails();A.setLanguage('zh-CN');}
});
test('Create has a concise two-sentence original-version explanation in both languages',()=>{
  const en='Choose one of three random cards of the specified type and add a copy of its original version to your hand. Its ability costs one extra card.';
  A.setLanguage('zh-CN');const zh=A.translateGameText(en);assert.match(zh,/原版/);assert.match(zh,/代价加 I/);assert.equal((zh.match(/。/g)||[]).length,2);
  A.setLanguage('en');assert.equal(A.translateGameText(en),en);
});
test('Story chapters leave locked card descriptions and skill titles empty without changing printed definitions',()=>{
  const definition=A.CARD.sdm_remilia.desc;match.cardAbilityEnabled=A.Game.prototype.cardAbilityEnabled;
  try{
    match.storyMatch={skillFactions:[]};
    for(const language of ['en','zh-CN'])for(const id of ['sdm_remilia','sdm_sakuya','hourai_mokou','sage_kasen']){
      A.setLanguage(language);A.openCardDetails(id);assert.equal(el('card-detail-description').innerHTML,'');assert.equal(el('card-detail-ability').textContent,'');assert(el('card-detail-ability').hidden);
      assert.equal(A.dynamicCardDescription(id,true),'');
    }
    match.storyMatch.skillFactions=['sdm'];A.openCardDetails('sdm_remilia');assert(!el('card-detail-ability').hidden);assert(el('card-detail-description').innerHTML);
    A.openCardDetails('hourai_mokou');assert.equal(el('card-detail-description').innerHTML,'');assert(el('card-detail-ability').hidden);
  }finally{delete match.storyMatch;delete match.cardAbilityEnabled;A.closeCardDetails();}
  assert.equal(A.CARD.sdm_remilia.desc,definition);A.openCardDetails('hourai_mokou');assert(!el('card-detail-ability').hidden);assert(el('card-detail-description').innerHTML);A.closeCardDetails();
});
test('Story chapter titles, objectives and result controls translate together',()=>{
  A.setLanguage('zh-CN');
  for(const text of ['Story Mode','Chapter 1 · The first table','Chapter 2 · Scarlet Devil Mansion','Start chapter','Chapters','Next chapter','Claim Scarlet Devil Mansion','Remilia: hold three Mansion cards after her ability','Flandre: discard an opponent hand card','All objectives complete. Chapter cleared.']){
    const translated=A.translateGameText(text);assert.notEqual(translated,text);assert.match(translated,/[\u4e00-\u9fff]/);
  }
  A.setLanguage('en');assert.equal(A.translateGameText('Story Mode'),'Story Mode');
});
test('Copied names translate and copied-card guesses accept Chinese question-mark names',()=>{
  A.setLanguage('zh-CN');assert.equal(A.translateGameText(A.CARD.mtn_sanae.name+'?'),'东风谷早苗?');
  assert.equal(A.canonicalCardName('东风谷早苗？'),A.CARD.mtn_sanae.name+'?');assert.equal(A.canonicalCardName(A.CARD.mtn_sanae.name+'?'),A.CARD.mtn_sanae.name+'?');
  A.setLanguage('en');assert.equal(A.translateGameText(A.CARD.mtn_sanae.name+'?'),A.CARD.mtn_sanae.name+'?');
});
test('Nue borrowed-ability details translate in Chinese and preserve the English source when switching back',()=>{
  match.borrowedAbilities={temple_nue:'sdm_sakuya'};match.isOnBoard=id=>id==='temple_nue';
  A.setLanguage('zh-CN');A.openCardDetails('temple_nue');
  assert.match(el('card-detail-description').innerHTML,/正在使用/);assert.match(el('card-detail-description').innerHTML,/十六夜咲夜/);assert(!el('card-detail-description').innerHTML.includes('Using'));
  A.setLanguage('en');A.openCardDetails('temple_nue');assert.match(el('card-detail-description').innerHTML.replace(/<[^>]*>/g,''),/Using Izayoi Sakuya’s ability\./);
  A.closeCardDetails();match.borrowedAbilities={};match.isOnBoard=()=>false;
});
async function choiceTest(name,fn){await fn();tests.push(name);console.log('PASS '+name);}
(async()=>{
  await choiceTest('The real creation chooser prints every candidate and its inspected image without creating extra cards',async()=>{
    const before=JSON.stringify(A.CARD),handBefore=JSON.stringify(match.players[0].hand);
    const selected=A.pickAbilityCards('Create: choose one of three cards',['hourai_mokou','mtn_sanae',wornCopy],{createdPreview:true});
    const options=el('creation-cards').children;
    assert.equal(options.length,3);
    assert.equal(A.creationSession().phase,'printing');options[0].children[0].events.click[0]();assert.equal(A.creationSession().phase,'printing');
    advance(620);assert.equal(A.creationSession().phase,'ready');
    for(const option of options){
      const face=option.children[0],inspect=option.children[1];
      assert.match(face.innerHTML,/card-copy-low-ink/);assert.equal((face.innerHTML.match(/card-low-ink-lines/g)||[]).length,1);
      assert(!face.innerHTML.includes('instance-badge'));
      face.events.keydown[0]({key:'i',preventDefault(){}});assert(el('card-detail').classList.contains('card-copy-low-ink'));
      A.closeCardDetails();inspect.events.click[0]();assert(el('card-detail').classList.contains('card-copy-low-ink'));
      A.closeCardDetails();
    }
    assert(!options[2].children[0].innerHTML.includes('card-rin-worn'));
    A.openCardDetails(wornCopy,{createdPreview:true});assert(!el('card-detail').classList.contains('card-rin-worn'));
    assert(!el('card-detail-description').innerHTML.includes('抽一张牌'));assert.notEqual(el('card-detail-ability').textContent,'覆盖');A.closeCardDetails();
    const faces=A.creationSession().cards.map(card=>card.face);
    options[0].children[0].events.click[0]();assert.equal(A.creationSession().phase,'departing');
    assert(faces.every(face=>face.classList.contains('creation-flying')));
    assert.equal(faces[1].values.get('--creation-flight-angle'),'-55deg');assert.equal(faces[2].values.get('--creation-flight-angle'),'55deg');
    advance(240);assert.equal(await selected,'hourai_mokou');
    assert(!el('creation-overlay').classList.contains('show'));assert.equal(A.creationSession(),null);advance(240);assert.equal(timers.size,0);
    assert.equal(JSON.stringify(A.CARD),before);assert.equal(JSON.stringify(match.players[0].hand),handBefore);
    assert(!A.cardBoardHtml('hourai_mokou').includes('card-copy-low-ink'));
  });
  await choiceTest('Nue ability choices keep original art, while existing copies retain their own material',async()=>{
    const selected=A.pickAbilityCards('Nue — choose an ability',['hourai_mokou',copy]);
    const options=el('modal-options').children;
    assert(!options[0].children[0].innerHTML.includes('card-copy-low-ink'));
    assert.match(options[1].children[0].innerHTML,/card-copy-low-ink/);
    options[0].children[0].events.click[0]();assert(!el('card-detail').classList.contains('card-copy-low-ink'));
    A.closeCardDetails();options[1].children[0].events.click[0]();assert(el('card-detail').classList.contains('card-copy-low-ink'));
    A.closeCardDetails();options[0].children[3].children[1].events.click[0]();assert.equal(await selected,'hourai_mokou');
  });
  await choiceTest('The actual creation engine waits for the flight and then puts exactly one independent copy into the hand',async()=>{
    const g={...match,cancelled:false,players:[{idx:0,name:'You',isAI:false,hand:['hourai_mokou']}],startingCardIds:new Set(['hourai_mokou']),testMetrics:null,
      pickUI:(_p,_method,args)=>A.pickAbilityCards(...args),addToHand(p,id){this.players[p].hand.push(id);},recordTestDecision(){},log(){},render:()=>A.renderHand()};
    A.setGame(g);const before=Object.keys(A.CARD).length;
    const creation=A.Game.prototype.createCard.call(g,0,['hourai_mokou','mtn_sanae','sage_ran'],{double:true});
    assert.equal(Object.keys(A.CARD).length,before);assert.deepEqual(g.players[0].hand,['hourai_mokou']);
    advance(620);const face=A.creationSession().cards.find(card=>card.id==='mtn_sanae').face;
    face.events.click[0]();assert.equal(face.style.left,'132px');assert.equal(face.style.top,'673px');
    assert(face.classList.contains('creation-chosen-flight'));assert.equal(face.style.width,'104px');assert.equal(face.style.height,'126px');
    const placeholder=A.creationSession().placeholder;
    assert.match(placeholder.innerHTML,/Sanae Kochiya\?/);assert.match(placeholder.innerHTML,/icon-row/);assert(placeholder.classList.contains('card-copy-low-ink'));
    A.renderHand();assert.equal(el('hand').children.at(-1),placeholder);
    const incoming=html.slice(html.indexOf('.creation-face.creation-flying.creation-chosen-flight{')).split('}')[0];
    assert.match(incoming,/left \.22s linear,top \.22s linear/);assert.match(incoming,/width \.22s linear,height \.22s linear/);
    assert(!incoming.includes('ease-in'));assert(!incoming.includes('cubic-bezier'));

    assert.equal(Object.keys(A.CARD).length,before);assert.equal(g.players[0].hand.length,1);
    const chosen=A.creationSession().chosen;A.creationSession().cards.find(card=>card.id!==chosen).face.events.click[0]();assert.equal(A.creationSession().chosen,chosen);
    advance(240);const id=await creation;
    assert.equal(Object.keys(A.CARD).length,before+1);assert.deepEqual(g.players[0].hand,['hourai_mokou',id]);
    assert.equal(A.CARD[id].baseId,'mtn_sanae');assert.equal(A.CARD[id].costBonus,1);assert.equal(A.CARD[id].abilityMultiplier,2);
    assert.equal(A.CARD[id].name,A.CARD.mtn_sanae.name+'?');assert.match(el('hand').children.at(-1).innerHTML,/Sanae Kochiya\?/);
    assert.equal(el('hand').children.at(-1).dataset.cardId,id);assert(el('hand').children.at(-1).classList.contains('card-copy-low-ink'));
    assert(!el('hand').children.some(node=>node.classList.contains('creation-hand-placeholder')));
    A.setGame(match);A.renderHand();
  });
  await choiceTest('Closing at printing, ready or flying resolves the choice and releases every timer, listener and hand placeholder',async()=>{
    const keys=(documentListeners.get('keydown')||[]).length,resizes=(windowListeners.get('resize')||[]).length;
    for(const phase of ['printing','ready','departing']){
      for(let repeat=0;repeat<20;repeat++){
        const pending=A.openCreationChoice('Create: choose one of three cards',['hourai_mokou','mtn_sanae','sage_ran']);
        if(phase!=='printing')advance(620);
        if(phase==='departing')A.creationSession().cards[0].face.events.click[0]();
        else if(phase==='ready')A.creationSession().cards[0].inspect.events.click[0]();
        const stale=[...timers.values()].map(timer=>timer.fn);A.closeCreationChoice();assert.equal(await pending,null);
        stale.forEach(fn=>fn());assert.equal(A.creationSession(),null);assert.equal(timers.size,0);
        assert(!el('creation-overlay').classList.contains('show'));assert.equal(el('creation-cards').children.length,0);
        assert(!el('card-detail-overlay').classList.contains('show'));assert(!el('hand').children.some(node=>node.classList.contains('creation-hand-placeholder')));
        assert.equal((documentListeners.get('keydown')||[]).length,keys);assert.equal((windowListeners.get('resize')||[]).length,resizes);
      }
    }
    assert.match(html,/if\(typeof closeCreationChoice==='function'\)closeCreationChoice\(\);/);
  });
  await choiceTest('Outgoing sheets keep flying after the faster handoff and clean up independently',async()=>{
    const pending=A.openCreationChoice('Create: choose one of three cards',['hourai_mokou','mtn_sanae','sage_ran']);advance(620);
    A.creationSession().cards[1].face.events.click[0]();
    const outgoing=A.departures();assert.equal(outgoing.length,2);assert(outgoing.every(flight=>flight.node.parentElement===documentFixture.body));
    const css=html.slice(html.indexOf('.creation-face.creation-flying{')).split('}')[0];assert.match(css,/left \.46s/);assert.match(css,/top \.46s/);
    advance(239);assert(A.creationSession());assert.equal(A.departures().length,2);
    advance(1);assert.equal(await pending,'mtn_sanae');assert.equal(A.creationSession(),null);assert.equal(A.departures().length,2);
    assert(!el('creation-overlay').classList.contains('show'));assert(outgoing.every(flight=>flight.node.isConnected));
    advance(239);assert.equal(A.departures().length,2);advance(1);assert.equal(A.departures().length,0);assert.equal(timers.size,0);
  });
  await choiceTest('Closing the completed handoff also cancels any leftover departure sheets',async()=>{
    const pending=A.openCreationChoice('Create: choose one of three cards',['hourai_mokou','mtn_sanae','sage_ran']);advance(620);
    A.creationSession().cards[0].face.events.click[0]();advance(240);assert.equal(await pending,'hourai_mokou');
    const outgoing=A.departures();assert.equal(outgoing.length,2);A.closeCreationChoice();
    assert.equal(A.departures().length,0);assert(outgoing.every(flight=>!flight.node.isConnected));assert.equal(timers.size,0);
  });
  await choiceTest('Keyboard focus stays inside the choice, inspection blocks accidental selection, and Enter selects only once',async()=>{
    const pending=A.openCreationChoice('Create: choose one of three cards',['hourai_mokou','mtn_sanae']);advance(520);
    const cards=A.creationSession().cards,press=extra=>{for(const fn of documentListeners.get('keydown')||[])fn({key:'Tab',preventDefault(){},...extra});};
    documentFixture.activeElement=null;press({shiftKey:true});assert.equal(documentFixture.activeElement,cards[1].inspect);
    press({});assert.equal(documentFixture.activeElement,cards[0].face);
    cards[0].face.events.keydown[0]({key:'i',preventDefault(){}});cards[1].face.events.click[0]();assert.equal(A.creationSession().phase,'ready');
    A.closeCardDetails();cards[1].face.events.keydown[0]({key:'Enter',preventDefault(){}});cards[0].face.events.click[0]();
    assert.equal(A.creationSession().chosen,'mtn_sanae');advance(240);assert.equal(await pending,'mtn_sanae');
  });
  await choiceTest('Reduced motion and a one-card source complete safely without inventing extra choices',async()=>{
    reducedMotion=true;
    const pending=A.openCreationChoice('Create: choose one of three cards',['hourai_mokou']);advance(0);
    assert.equal(A.creationSession().cards.length,1);assert.equal(A.creationSession().phase,'ready');
    A.creationSession().cards[0].face.events.keydown[0]({key:' ',preventDefault(){}});advance(0);
    assert.equal(await pending,'hourai_mokou');assert.equal(timers.size,0);reducedMotion=false;
  });
  await choiceTest('Watched AI prints the same options, keeps its original choice and finishes without user input',async()=>{
    const pending=A.onCreationChoices({playerIdx:1,ids:['hourai_mokou','mtn_sanae','sage_ran'],chosen:'sage_ran',title:'Create: choose one of three cards'});
    await new Promise(setImmediate);advance(620);
    const cards=A.creationSession().cards;assert(cards.every(card=>card.inspect.disabled));
    cards[0].face.events.click[0]();assert.equal(A.creationSession().phase,'ready');
    advance(100);assert.equal(A.creationSession().phase,'departing');assert.equal(A.creationSession().chosen,'sage_ran');
    advance(240);assert.equal(await pending,'sage_ran');assert.equal(A.departures().length,2);advance(240);assert.equal(timers.size,0);
    match.fastAITest=true;assert.equal(await A.onCreationChoices({playerIdx:1,ids:['hourai_mokou'],chosen:'hourai_mokou'}),undefined);
    assert.equal(A.creationSession(),null);match.fastAITest=false;
  });
  await choiceTest('The AI creation engine awaits the watched animation and fast tests bypass it without changing the chosen card',async()=>{
    let presentations=0;ctx.aiCreatedValue=(_p,id)=>id==='mtn_sanae'?10:0;
    const g={...match,cancelled:false,fastAITest:false,players:[{idx:0,name:'AI',isAI:true,hand:[]}],startingCardIds:new Set(),testMetrics:null,
      ui:{onCreationChoices:details=>{presentations++;return A.onCreationChoices(details);}},addToHand(p,id){this.players[p].hand.push(id);},recordTestDecision(){},log(){},render:()=>A.renderHand()};
    A.setGame(g);const watched=A.Game.prototype.createCard.call(g,0,['hourai_mokou','mtn_sanae','sage_ran']);await new Promise(setImmediate);
    assert.equal(presentations,1);assert.equal(g.players[0].hand.length,0);advance(620);advance(100);advance(240);
    const id=await watched;assert.equal(A.CARD[id].baseId,'mtn_sanae');assert.equal(g.players[0].hand.length,1);advance(240);
    g.fastAITest=true;const fast=await A.Game.prototype.createCard.call(g,0,['hourai_mokou','mtn_sanae','sage_ran']);
    assert.equal(presentations,1);assert.equal(A.CARD[fast].baseId,'mtn_sanae');assert.equal(A.creationSession(),null);assert.equal(timers.size,0);
    delete ctx.aiCreatedValue;A.setGame(match);A.renderHand();
  });
  await choiceTest('A watched non-first AI creation lands in its visible hand slot and leaves the other AI hand intact',async()=>{
    ctx.aiCreatedValue=(_p,id)=>id==='mtn_sanae'?10:0;
    const g={...match,cancelled:false,aiTestMode:true,fastAITest:false,currentPlayerIdx:1,permanentAbilities:{},players:[
      {idx:0,name:'AI 1',isAI:true,hand:['sdm_remilia']},{idx:1,name:'AI 2',isAI:true,hand:['hourai_mokou']}],startingCardIds:new Set(),testMetrics:null,
      ui:{onCreationChoices:details=>A.onCreationChoices(details)},addToHand(p,id){this.players[p].hand.push(id);},recordTestDecision(){},log(){},render:()=>A.renderHand()};
    A.setGame(g);A.renderHand();const pending=A.Game.prototype.createCard.call(g,1,['hourai_mokou','mtn_sanae','sage_ran']);await new Promise(setImmediate);
    advance(620);advance(100);const session=A.creationSession(),face=session.cards.find(card=>card.id==='mtn_sanae').face;
    assert(session.placeholder);assert.equal(face.style.left,'132px');assert.equal(face.style.top,'673px');
    assert.equal(face.style.width,'104px');assert.equal(face.style.height,'126px');advance(240);const id=await pending;
    assert.deepEqual(g.players[0].hand,['sdm_remilia']);assert.deepEqual(g.players[1].hand,['hourai_mokou',id]);
    assert.deepEqual(el('hand').children.map(node=>node.dataset.cardId),g.players[1].hand);assert.equal(el('hand-title').textContent,"AI 2's hand");
    assert.equal(A.creationSession(),null);advance(240);assert.equal(timers.size,0);delete ctx.aiCreatedValue;A.setGame(match);A.renderHand();
  });
  await choiceTest('Replacing the match during printing prevents a stale result, and resizing during flight finishes the selected choice',async()=>{
    const cancelled=A.openCreationChoice('Create: choose one of three cards',['hourai_mokou']);A.setGame({...match});advance(420);
    assert.equal(await cancelled,null);assert.equal(A.creationSession(),null);A.setGame(match);
    const resized=A.openCreationChoice('Create: choose one of three cards',['hourai_mokou','mtn_sanae']);advance(520);
    A.creationSession().cards[1].face.events.click[0]();for(const fn of [...windowListeners.get('resize')||[]])fn();
    assert.equal(await resized,'mtn_sanae');assert.equal(timers.size,0);assert.equal(A.creationSession(),null);
  });
  test('Online choices preserve the actor and presentation flags while validating only the offered source IDs',()=>{
    const args=A.serializablePickArgs('pickAbilityCards',['Create: choose one of three cards',['hourai_mokou','mtn_sanae'],{createdPreview:true,playerIdx:2}]);
    assert.equal(args[2].playerIdx,2);assert.equal(args[2].createdPreview,true);assert(A.validOnlineChoice('pickAbilityCards',args,'mtn_sanae'));
    assert(!A.validOnlineChoice('pickAbilityCards',args,'sage_matara'));A.setLanguage('zh-CN');
    assert.equal(A.translateGameText('Printing your card choices…'),'正在打印候选卡牌……');assert.match(A.translateGameText('Choose one printed card to put into your hand. Press I or use Inspect to read its ability.'),/手牌/);A.setLanguage('en');
  });
  fs.writeFileSync(path.join(root,'tests/card-materials-2026-10-13-results.json'),JSON.stringify({status:'pass',count:tests.length,checks:tests,scope:'Actual renderers, creation engine and fake-clock DOM fixtures; browser pixels not verified'},null,2)+'\n');
  console.log(`${tests.length}/${tests.length} card material checks passed`);
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
