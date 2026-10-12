// Use the real hand, board and detail renderers with a DOM fixture.
// This verifies markup/state; it does not simulate browser painting.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'touhou_board_game_github_textures.html'),'utf8');
const js=html.split('<script>')[1].split('</script>')[0];
class Element{
  constructor(){this.names=new Set();this.dataset={};this.children=[];this.attributes={};this.events={};this.style={setProperty(){}};this.nodeType=1;this.isConnected=true;this.clientWidth=400;
    this.classList={add:(...names)=>names.forEach(n=>this.names.add(n)),remove:(...names)=>names.forEach(n=>this.names.delete(n)),contains:n=>this.names.has(n),toggle:(n,on)=>on?this.names.add(n):this.names.delete(n)};}
  set className(v){this.names=new Set(v.split(/\s+/).filter(Boolean));}get className(){return [...this.names].join(' ');}
  set innerHTML(v){this.markup=v;this.replaceChildren();}get innerHTML(){return this.markup||'';}
  appendChild(node){this.children.push(node);node.parentElement=this;return node;}
  replaceChildren(){this.children.forEach(n=>n.parentElement=null);this.children=[];}
  querySelectorAll(){return [];}querySelector(){return null;}
  addEventListener(k,fn){(this.events[k]||=[]).push(fn);}setAttribute(k,v){this.attributes[k]=v;}removeAttribute(k){delete this.attributes[k];}
  focus(){}getBoundingClientRect(){return {left:0,top:0,width:400,height:100,bottom:100,right:400};}
}
const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
el('card-detail').appendChild(el('card-detail-description'));
const ctx=vm.createContext({console,el,document:{activeElement:null,documentElement:new Element(),createElement:()=>new Element(),addEventListener(){},querySelectorAll:()=>[]},window:{innerWidth:1200,innerHeight:800,addEventListener(){}},
  requestAnimationFrame:()=>1,localSeat:()=>0,localTurnReady:()=>true,syncRemiliaArrival(){},updateTutorialProgress(){},queueMobileViewport(){},onHandCardDragEnd(){},
  illusionCardStyle:()=>'',crownLightFor:()=>({main:'#aaa',rgb:'1,2,3'})});
const slice=(start,end)=>js.slice(js.indexOf(start),js.indexOf(end,js.indexOf(start)));
vm.runInContext(slice('const DIRS4 =','/* ===================== UI layer')+'\nlet game=null;\n'+
  slice('const FACTION_BG_CLASS =','const CARD_ABILITY_NAMES =')+
  slice('const CARD_ABILITY_NAMES =','/* Only trusted rule text')+
  slice('/* Only trusted rule text','const yuukaSunflowerUntil=')+
  slice('function escapeLogHtml(','function newspaperHtml(')+
  slice('function renderHand()','function cardNameListHtml(')+`
  var pendingHandChoice=null,selectedHandCard=null,pendingCellChoice=null;
  var mindArrivals=new Map(),sanaeArrivalUntil=new Map(),mokouArrivalUntil=new Map(),yukariArrivalUntil=new Map();
  this.api={CARD,cardBoardHtml,renderHand,openCardDetails,dynamicCardDescription,cardHasOverwrite,cardBgClass,
    setGame:g=>game=g,setLanguage:l=>gameLanguage=l};`,ctx);
const A=ctx.api,tests=[];
function test(name,fn){fn();tests.push(name);console.log('PASS '+name);}
const copy='created_card_910',wornCopy='created_card_911';
A.CARD[copy]={...A.CARD.hourai_mokou,id:copy,baseId:'hourai_mokou',createdCopy:true,copiedAbility:'hourai_mokou',costBonus:1,abilityMultiplier:1};
A.CARD[wornCopy]={...A.CARD.haku_yuyuko,id:wornCopy,baseId:'haku_yuyuko',createdCopy:true,copiedAbility:'__draw_one',costBonus:1,abilityMultiplier:2};
const match={players:[{idx:0,name:'You',isAI:false,hand:['haku_yuyuko',copy,wornCopy,'mtn_sanae']}],currentPlayerIdx:0,forcedPlay:{},permanentAbilities:{haku_yuyuko:'__draw_one'},
  isPlacementBlocked:()=>false,isCardAbilityDisabled:()=>false,isSageMuted:()=>false,isOnBoard:()=>false,abilityId(id){return this.permanentAbilities[id]||A.CARD[id].copiedAbility||id;}};
A.setGame(match);
test('Board cards distinguish low-ink copies, worn retrieved cards and ordinary originals',()=>{
  const printed=A.cardBoardHtml(copy),worn=A.cardBoardHtml('haku_yuyuko'),plain=A.cardBoardHtml('mtn_sanae');
  assert.match(printed,/card-copy-low-ink/);assert.match(printed,/card-low-ink-lines/);assert(!printed.includes('instance-badge'));
  assert.match(worn,/card-rin-worn/);assert.match(worn,/card-wear-overlay/);assert.match(worn,/Ability: Overwrite/);
  assert(!plain.includes('card-copy-low-ink'));assert(!plain.includes('card-rin-worn'));assert(!worn.includes('card-copy-low-ink'));
});
test('Copying an overwritten card retains its worn appearance, draw effect and surcharge',()=>{
  const markup=A.cardBoardHtml(wornCopy);assert.match(markup,/card-copy-low-ink card-rin-worn/);assert.match(markup,/card-wear-overlay/);
  assert(!markup.includes('instance-badge'));assert(!markup.includes('Cost +'));assert(A.dynamicCardDescription(wornCopy).startsWith('Placed: Draw a card.'));
  assert.equal(A.CARD[wornCopy].faction,'hakugyokurou');assert.equal(A.CARD.haku_yuyuko.faction,'hakugyokurou');
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
console.log(`${tests.length}/${tests.length} card material checks passed`);
