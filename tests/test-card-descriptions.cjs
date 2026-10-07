// Rule-reference and inspection events run against the actual game source with
// a small DOM fixture. Browser layout / physical-device rendering is not simulated.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2] || (fs.existsSync('touhou_board_game_github_textures.html')
  ? 'touhou_board_game_github_textures.html' : path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(file,'utf8'),js=html.split('<script>')[1].split('</script>')[0];
new vm.Script(js);
const listeners=[],controls=new Map();
let activeElement=null;
class Element{
  constructor(id='',tag='DIV'){
    this.id=id;this.tagName=tag;this.nodeType=1;this.dataset={};this.style={};this.children=[];
    this.events=[];this.isConnected=true;this.scrollTop=0;this.clientWidth=500;this.scrollWidth=0;this.attributes={};
    this.offsetWidth=300;this.offsetHeight=120;this.rect={left:25,top:200,bottom:220};
    const classes=new Set();this.classList={add:(...n)=>n.forEach(x=>classes.add(x)),remove:(...n)=>n.forEach(x=>classes.delete(x)),contains:n=>classes.has(n)};
  }
  set innerHTML(value){
    this.markup=value;this.children=[];
    for(const m of value.matchAll(/<button([^>]*)>([^<]*)<\/button>/g)){
      const b=new Element('','BUTTON');
      const card=m[1].match(/data-inspect-card="([^"]+)"/),term=m[1].match(/data-rule-term="([^"]+)"/);
      if(card)b.dataset.inspectCard=card[1];if(term)b.dataset.ruleTerm=term[1];
      b.textContent=m[2];b.parentElement=this;this.children.push(b);
    }
  }
  get innerHTML(){return this.markup||'';}
  replaceChildren(...children){this.children=children;children.forEach(c=>c.parentElement=this);this.markup='';this.textContent='';}
  appendChild(child){this.children.push(child);child.parentElement=this;}
  addEventListener(type,fn,options){this.events.push({type,fn,capture:options===true});}
  focus(){activeElement=this;}
  closest(selector){
    for(const part of selector.split(',').map(x=>x.trim())){
      if(part==='[data-inspect-card]' && this.dataset.inspectCard)return this;
      if(part==='[data-rule-term]' && this.dataset.ruleTerm)return this;
      if(part===`#${this.id}`)return this;
    }
    return this.parentElement?.closest(selector)||null;
  }
  setAttribute(name,value){this.attributes[name]=value;}removeAttribute(name){delete this.attributes[name];}
  getBoundingClientRect(){return this.rect;}
  contains(node){return node===this || this.children.some(c=>c.contains(node));}
  querySelectorAll(){return this.children.flatMap(c=>[...(c.tagName==='BUTTON'&&!c.disabled?[c]:[]),...c.querySelectorAll()]);}
}
const el=id=>{if(!controls.has(id))controls.set(id,new Element(id));return controls.get(id);};
const overlay=el('card-detail-overlay'),detail=el('card-detail'),effect=new Element();
overlay.appendChild(detail);
detail.appendChild(effect);effect.appendChild(el('card-detail-description'));
el('rule-term-popover').hidden=true;
const document={get activeElement(){return activeElement;},createElement:tag=>new Element('',tag.toUpperCase()),
  addEventListener:(type,fn,options)=>listeners.push({type,fn,capture:options===true})};
const windowListeners=[];
const context={console,document,el,requestAnimationFrame:fn=>fn(),getComputedStyle:node=>({fontSize:`${node.baseFontSize||22}px`}),
  window:{innerWidth:360,innerHeight:640,addEventListener:(type,fn)=>windowListeners.push({type,fn})},KOURINDOU_PORTRAITS:{},CARD_DETAIL_PORTRAITS:{},TEMPLE_UNZAN_PORTRAIT:"https://raw.githubusercontent.com/khooruizhe-rgb/TBG/main/touhou_uploaded_images/images/portraits/myouren_temple/unzan.webp",
  game:{players:[{hand:['shop_rinnosuke']}],isActiveOnBoard:()=>false,eirinActive:()=>false},
  pendingCellChoice:{cancellable:true},cancelHandSelection(){context.cancelledSelection=true;context.pendingCellChoice=null;}};
vm.createContext(context);
const data=js.slice(js.indexOf('const FACTIONS ='),js.indexOf('const NORMAL_HAND_LIMIT'));
const icons=js.slice(js.indexOf('const CARD_DETAIL_FACTION_ICONS ='),js.indexOf('const CARD_DETAIL_PORTRAITS ='));
const abilities=js.slice(js.indexOf('const CARD_ABILITY_NAMES ='),js.indexOf('/* Only trusted rule text'));
const escape=js.slice(js.indexOf('function escapeLogHtml('),js.indexOf('function renderLog('));
const inspection=js.slice(js.indexOf('/* Only trusted rule text'),js.indexOf('function cardBoardHtml('));
const outside=js.slice(js.indexOf('/* Clicking anywhere outside the board/hand/cancel-button'),js.indexOf("el('draw-btn').addEventListener"));
vm.runInContext(data+icons+abilities+escape+inspection+outside+`
  this.api={CARDS,CARD,FACTIONS,ruleTextHtml,ruleTooltip,ruleReferencePattern,openCardDetails,closeCardDetails,backCardDetails,
    state:()=>({id:detailCardId,history:detailHistory.map(x=>({...x})),returnFocus:detailReturnFocus})};`,context);
const A=context.api;
const event=(target,extra={})=>({target,currentTarget:target,...extra,preventDefault(){this.prevented=true;},
  stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.stopped=this.immediate=true;},
  composedPath(){const result=[];for(let node=target;node;node=node.parentElement)result.push(node);return result;}});
function click(target){
  const e=event(target);
  for(const l of listeners.filter(l=>l.type==='click'&&l.capture)){l.fn(e);if(e.immediate)return e;}
  for(let node=target;node;node=node.parentElement){
    e.currentTarget=node;for(const l of node.events.filter(l=>l.type==='click'))l.fn(e);
    if(e.stopped)return e;
  }
  for(const l of listeners.filter(l=>l.type==='click'&&!l.capture)){l.fn(e);if(e.immediate)break;}
  return e;
}
let passed=0;
function test(name,fn){fn();console.log('PASS '+name);passed++;}
test('Faction references use the uploaded icon and retain accessible names',()=>{
  for(const [id,f] of Object.entries(A.FACTIONS).filter(([,f])=>f.size)){
    const output=A.ruleTextHtml(f.name,{cards:false});
    assert.match(output,/class="faction-reference/);assert.match(output,/<img src="https:\/\/raw.githubusercontent.com\//);
    assert.ok(output.includes(`aria-label="${f.name}"`));assert.ok(!output.includes(`>${f.name}<`));
  }
});
test('Full card names beat overlapping faction names and short aliases',()=>{
  assert.match(A.ruleTextHtml('Hakurei Reimu and Kanako Yasaka'),/data-inspect-card="reimu"[^>]*>Hakurei Reimu<\/button>/);
  assert.match(A.ruleTextHtml('Hakurei Reimu and Kanako Yasaka'),/data-inspect-card="mtn_kanako"[^>]*>Kanako Yasaka<\/button>/);
  assert.equal((A.ruleTextHtml('Hakurei Reimu').match(/data-inspect-card/g)||[]).length,1);
});
test('Consecutive references, punctuation, possessives, and non-faction prefixes work',()=>{
  assert.equal((A.ruleTextHtml('Kasen, Eirin and Yukari’s Trap.').match(/data-inspect-card/g)||[]).length,4);
  assert.match(A.ruleTextHtml('non-Heaven'),/^non-<span/);
  assert.equal(A.ruleTextHtml('Heavenly traps Ringtone'),'Heavenly traps Ringtone');
});
test('HTML text cannot inject markup and regex metacharacters are literal',()=>{
  assert.match(A.ruleTextHtml('<img src=x onerror=bad()>'),/^&lt;img/);
  const pattern=A.ruleReferencePattern(['a+b','a.b','a(b)','a[b]']);
  assert.equal([...('a+b a.b a(b) a[b]').matchAll(pattern)].length,4);
  assert.equal([...('axb aaab').matchAll(pattern)].length,0);
});
test('Descriptions keep Roman costs and leave Yuyuko exclusions to discovery',()=>{
  assert.equal(A.CARD.haku_yuyuko.desc,'[Cost N] Placed: Send N random orthogonally adjacent cards to your discard pile.');
  assert.match(A.CARD.heaven_tenshi.desc,/\[Cost II\]/);assert.match(A.CARD.heaven_iku.desc,/\[Cost III\]/);
  assert.ok(A.CARDS.every(c=>!c.desc.includes('excluding')&&!c.desc.includes('checked after')));
});
test('Every remaining named-card mention resolves to the correct inspect link',()=>{
  const expected={mtn_sanae:'mtn_kanako',sage_ran:'sage_yukari',hourai_tewi:'trap_token',shop_rinnosuke:'shop_rinnosuke'};
  for(const [card,target] of Object.entries(expected))assert.ok(A.ruleTextHtml(A.CARD[card].desc).includes(`data-inspect-card="${target}"`));
  assert.match(A.ruleTextHtml(A.CARD.hell_komachi.desc),/faction-reference/);
  assert.ok(!A.ruleTextHtml(A.CARD.hell_komachi.desc).includes('data-inspect-card="hell_eiki"'));
});
test('Selection options can show faction icons without nested inspect buttons',()=>{
  assert.match(A.ruleTextHtml('Heaven',{cards:false}),/faction-reference/);
  assert.ok(!A.ruleTextHtml('Kasen',{cards:false}).includes('<button'));
  assert.equal(A.ruleTooltip('non-Heaven cards; Youkai Mountain cards'),'non-⛩️ cards; ⛰️ cards');
});
const origin=new Element('original-hand-card','BUTTON');origin.focus();
test('Opening inspection focuses the card without adding a button bar',()=>{
  A.openCardDetails('sage_ran');assert.equal(A.state().id,'sage_ran');assert.equal(A.state().returnFocus,origin);
  assert.equal(document.activeElement,detail);
  assert.ok(!html.includes('card-detail-tools')&&!html.includes('card-detail-close')&&!html.includes('card-detail-back'));
});
test('Inspection marks four-card factions as a square and two-card factions along a backslash',()=>{
  for(const card of A.CARDS){
    A.openCardDetails(card.id);const marker=el('card-detail-claim-size'),size=A.FACTIONS[card.faction].size;
    if(!size){assert.equal(marker.hidden,true,card.id);assert.equal(marker.innerHTML,'');continue;}
    assert.equal(marker.hidden,false,card.id);assert.equal((marker.innerHTML.match(/<rect /g)||[]).length,size,card.id);
    assert.match(marker.innerHTML,/<rect x="1" y="1"/);assert.match(marker.innerHTML,/<rect x="10" y="10"/);
    if(size===2){assert(!marker.innerHTML.includes('x="10" y="1"'));assert(!marker.innerHTML.includes('x="1" y="10"'));}
    assert.equal(el('card-detail-crown').hidden,!card.crown,card.id);
    assert.equal(marker.attributes['aria-label'],`Collect ${size} cards to claim this faction.`);
  }
  A.openCardDetails('sage_ran');
});
test('Claim markers remain four for shop faction substitutes and localize with inspection',()=>{
  for(const card of A.CARDS.filter(card=>card.shopExpansion)){
    A.openCardDetails(card.id);assert.equal((el('card-detail-claim-size').innerHTML.match(/<rect /g)||[]).length,4,card.id);
  }
  vm.runInContext('gameLanguage="zh-CN"',context);A.openCardDetails('sage_kasen');
  assert.equal(el('card-detail-claim-size').attributes['title'],'此阵营需要收取 4 张卡牌。');
  vm.runInContext('gameLanguage="en"',context);A.openCardDetails('sage_ran');
});
test('A real linked-card click navigates without cancelling the pending placement',()=>{
  effect.scrollTop=37;
  const link=el('card-detail-description').children.find(c=>c.dataset.inspectCard==='sage_yukari');
  const e=click(link);assert.ok(e.prevented&&e.immediate);assert.ok(!context.cancelledSelection);
  assert.equal(A.state().id,'sage_yukari');assert.equal(A.state().history[0].scrollTop,37);
  assert.equal(A.state().returnFocus,origin);
});
test('Double-click returns to the prior card and restores scroll without using any game action',()=>{
  detail.events.find(e=>e.type==='dblclick').fn(event(detail));
  assert.equal(A.state().id,'sage_ran');assert.equal(effect.scrollTop,37);
  assert.equal(A.state().history.length,0);assert.ok(!context.cancelledSelection);
});
test('Cycles are navigable; same-card references do not add duplicate history',()=>{
  A.openCardDetails('mtn_kanako',{followReference:true});A.openCardDetails('sage_ran',{followReference:true});
  assert.equal(A.state().history.length,2);A.openCardDetails('sage_ran',{followReference:true});
  assert.equal(A.state().history.length,2);A.backCardDetails();assert.equal(A.state().id,'mtn_kanako');
});
test('Backdrop closing restores original focus and preserves placement selection',()=>{
  click(overlay);assert.equal(document.activeElement,origin);assert.equal(A.state().history.length,0);
  assert.equal(A.state().id,null);assert.ok(!context.cancelledSelection);
});
test('Keyboard focus stays in inspection and Escape closes only the inspector',()=>{
  A.openCardDetails('sage_ran');const links=el('card-detail-description').children;links.at(-1).focus();
  const handler=listeners.find(l=>l.type==='keydown'&&!l.capture).fn;
  handler(event(links.at(-1),{key:'Tab'}));assert.equal(document.activeElement,links[0]);
  handler(event(document.activeElement,{key:'Tab',shiftKey:true}));assert.equal(document.activeElement,links.at(-1));
  const escapeEvent=event(document.activeElement,{key:'Escape'});handler(escapeEvent);
  assert.ok(escapeEvent.prevented&&escapeEvent.immediate);assert.equal(document.activeElement,origin);
});
test('Escape returns from a referenced card before closing the original',()=>{
  A.openCardDetails('sage_ran');A.openCardDetails('sage_yukari',{followReference:true});
  const handler=listeners.find(l=>l.type==='keydown'&&!l.capture).fn;
  handler(event(detail,{key:'Escape'}));assert.equal(A.state().id,'sage_ran');assert.ok(overlay.classList.contains('show'));
  handler(event(detail,{key:'Escape'}));assert.equal(A.state().id,null);assert.equal(document.activeElement,origin);
});
test('Double-click closes the original card and an inspection with no links retains keyboard focus',()=>{
  A.openCardDetails('haku_youmu');
  listeners.find(l=>l.type==='keydown'&&!l.capture).fn(event(detail,{key:'Tab'}));assert.equal(document.activeElement,detail);
  detail.events.find(e=>e.type==='dblclick').fn(event(detail));assert.equal(A.state().id,null);
});
test('Hand-only description and invalid reference handling remain intact',()=>{
  A.openCardDetails('shop_rinnosuke');assert.equal(el('card-detail-description').innerHTML,A.CARD.shop_rinnosuke.handDesc);
  A.openCardDetails('missing');assert.equal(A.state().id,'shop_rinnosuke');A.closeCardDetails();
});
test('Backdrop dismisses inspection without cancelling the placement',()=>{
  A.openCardDetails('mtn_sanae');click(overlay);assert.ok(!overlay.classList.contains('show'));
  assert.ok(!context.cancelledSelection);assert.equal(document.activeElement,origin);
});
test('Failed faction artwork has an explicit visible fallback',()=>{
  const icon=new Element();const image=new Element('','IMG');image.closest=()=>icon;
  listeners.find(l=>l.type==='error').fn(event(image));
  assert.ok(image.hidden&&icon.classList.contains('icon-missing'));
  assert.ok(html.includes('.faction-reference img[hidden]{display:none;}'));
});
test('Placed is the only colon label and Mountain descriptions do not repeat Kanako',()=>{
  for(const c of A.CARDS)assert.ok(!c.desc.replaceAll('Placed:','').includes(':'),c.id);
  for(const id of ['mtn_suwako','mtn_aya']){
    assert.ok(!A.CARD[id].desc.includes('Kanako'));assert.ok(!A.CARD[id].desc.includes('('));
  }
  assert.equal(A.CARD.haku_youmu.desc,'Placed: Placing this card does not use your turn.');
  assert.equal(A.CARD.mtn_sanae.desc,'Placed: Draw a card. If Kanako Yasaka is on the board, draw another card.');
  assert.equal(A.CARD.hourai_mokou.desc,'Placed: Draw a card for each card in your discard pile.');
  assert.equal(A.CARD.hourai_eirin.desc,'While this card is on the board, all Crown abilities are disabled.');
});
test('Ability headings in both languages fit on open and resize rather than wrapping or truncating',()=>{
  const heading=el('card-detail-ability');heading.baseFontSize=36;
  Object.defineProperty(heading,'scrollWidth',{configurable:true,get(){
    return this.textContent.length*.6*(parseFloat(this.style.fontSize)||this.baseFontSize);
  }});
  for(const language of ['en','zh-CN']){
    vm.runInContext(`gameLanguage=${JSON.stringify(language)}`,context);
    for(const width of [466,306,180]){
      heading.clientWidth=width;
      for(const card of A.CARDS){
        A.openCardDetails(card.id);assert.ok(heading.scrollWidth<=heading.clientWidth,`${card.id} in ${language} at ${width}px`);
      }
    }
  }
  heading.clientWidth=170;windowListeners.filter(l=>l.type==='resize').forEach(l=>l.fn());
  assert.ok(heading.scrollWidth<=heading.clientWidth);
  assert.ok(/\.card-detail-ability\{[^}]*white-space:nowrap/s.test(html));vm.runInContext('gameLanguage="en"',context);A.closeCardDetails();
});
test('Cost and wasteland are clickable without turning partial words into links',()=>{
  assert.match(A.ruleTextHtml('[Cost III] Placed: Clear wasteland.'),/data-rule-term="cost"/);
  assert.match(A.ruleTextHtml('Wasteland and wasteland'),/data-rule-term="wasteland"/);
  assert.equal(A.ruleTextHtml('Costly wastelander'),'Costly wastelander');
  assert.ok(!A.ruleTextHtml('Cost',{cards:false}).includes('<button'));
});
test('Clicking a term opens a short positioned note without disturbing inspection or placement',()=>{
  A.openCardDetails('mtn_kanako');
  const term=el('card-detail-description').children.find(c=>c.dataset.ruleTerm==='wasteland');
  const e=click(term);assert.ok(e.immediate&&e.prevented);assert.ok(!context.cancelledSelection);
  assert.equal(A.state().id,'mtn_kanako');assert.equal(el('rule-term-title').textContent,'Wasteland');
  assert.ok(!el('rule-term-popover').hidden);assert.equal(term.attributes['aria-expanded'],'true');
  assert.ok(parseFloat(el('rule-term-popover').style.left)>=12);
  detail.events.find(e=>e.type==='dblclick').fn(event(term));assert.equal(A.state().id,'mtn_kanako');
  click(term);assert.ok(el('rule-term-popover').hidden);assert.equal(term.attributes['aria-expanded'],'false');
});
test('Escape closes only the glossary and returns focus to its word',()=>{
  A.openCardDetails('haku_yuyuko');
  const term=el('card-detail-description').children.find(c=>c.dataset.ruleTerm==='cost');click(term);
  assert.equal(el('rule-term-title').textContent,'Cost');assert.match(el('rule-term-copy').textContent,/draw pile/);
  const e=event(term,{key:'Escape'});listeners.find(l=>l.type==='keydown'&&l.capture).fn(e);
  assert.ok(e.immediate&&e.prevented);assert.ok(el('rule-term-popover').hidden);
  assert.equal(document.activeElement,term);assert.equal(A.state().id,'haku_yuyuko');
});
test('Reading a note and clicking elsewhere in the card preserve the pending placement',()=>{
  A.openCardDetails('haku_yuyuko');
  const term=el('card-detail-description').children.find(c=>c.dataset.ruleTerm==='cost');click(term);
  click(el('rule-term-popover'));assert.ok(!el('rule-term-popover').hidden);assert.ok(!context.cancelledSelection);
  click(effect);assert.ok(el('rule-term-popover').hidden);assert.ok(!context.cancelledSelection);
});
test('Changing cards dismisses a glossary note and narrow viewports clamp it to the screen',()=>{
  A.openCardDetails('haku_yuyuko');
  const term=el('card-detail-description').children.find(c=>c.dataset.ruleTerm==='cost');
  context.window.innerWidth=210;context.window.innerHeight=200;
  el('rule-term-popover').offsetWidth=186;term.rect={left:199,top:160,bottom:180};click(term);
  assert.equal(parseFloat(el('rule-term-popover').style.left),12);
  assert.ok(parseFloat(el('rule-term-popover').style.top)<=68);
  A.openCardDetails('mtn_sanae');assert.ok(el('rule-term-popover').hidden);assert.equal(term.attributes['aria-expanded'],'false');
  A.closeCardDetails();context.window.innerWidth=360;context.window.innerHeight=640;
});
console.log(`${passed}/${passed} description and inspection checks passed`);
