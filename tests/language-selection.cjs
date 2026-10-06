// Canonical rules, translated choices and in-place language switching use real source.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2]||(fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(file,'utf8'),js=html.split('<script>')[1].split('</script>')[0];new vm.Script(js);
const slice=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a)));
class Node{
 constructor(tag='div'){this.nodeType=1;this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.events={};this.dataset={};this.isConnected=true;this.offsetWidth=300;this.offsetHeight=100;this.style={setProperty(){}};}
 appendChild(child){this.children.push(child);child.parentElement=this;return child;}
 replaceChildren(...children){for(const child of this.children)child.isConnected=false;this.children=[];children.forEach(child=>this.appendChild(child));}
 setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}
 removeAttribute(k){delete this.attributes[k];}focus(){document.activeElement=this;}
 getBoundingClientRect(){return {left:20,top:200,bottom:220};}
 addEventListener(k,fn){this.events[k]=fn;}matches(selector){return selector.split(',').some(s=>s.startsWith('#')?s.slice(1)===this.id:s.toUpperCase()===this.tagName);}
 closest(selector){let n=this;while(n){if(n.matches(selector))return n;n=n.parentElement;}return null;}
}
const body=new Node('body'),root=new Node('html'),elements=new Map(),el=id=>{if(!elements.has(id)){const node=new Node(id.includes('language')?'select':'div');node.id=id;body.appendChild(node);elements.set(id,node);}return elements.get(id);};
const text=(value,parent=body)=>{const node={nodeType:3,nodeValue:value,parentElement:parent,isConnected:true};parent.children.push(node);return node;};
const document={body,documentElement:root,title:'',createElement:tag=>new Node(tag),addEventListener(){},createTreeWalker(node){const walk=n=>(n.children||[]).flatMap(c=>[c,...walk(c)]),children=walk(node);let i=-1;return {nextNode(){return ++i<children.length;},get currentNode(){return children[i];}};}};
const storage=new Map();let observer,frames=[];
const ctx={console,Math:Object.create(Math),window:{localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},addEventListener(){}},document,el,NodeFilter:{SHOW_ELEMENT:1,SHOW_TEXT:4},MutationObserver:class{constructor(callback){observer=callback;}observe(){}},requestAnimationFrame:fn=>frames.push(fn),fitCardDetailHeadings(){},positionRuleTerm(){},positionRinnosukeBubble(){},queueMobileViewport(){},renderLog(){ctx.logsRendered=(ctx.logsRendered||0)+1;},CARD_DETAIL_FACTION_ICONS:{},setTimeout,clearTimeout};
vm.createContext(ctx);
vm.runInContext(slice('const DIRS4','/* ===================== UI layer')+'\nlet game=null;\n'+slice('const CARD_ABILITY_NAMES =','/* Only trusted rule text')+
slice('/* Only trusted rule text becomes references','let detailReturnFocus')+slice('function escapeLogHtml(','function renderLog(')+
'this.api={CARD,CARDS,FACTIONS,CARD_ABILITY_NAMES,ZH_CARDS,ZH_TEXT,canonicalCardName,translateGameText,setCardAbilityTitle,setGameLanguage,initializeGameLanguage,localizeTextNode,ruleTextHtml,setRuleText,openRuleTerm,closeRuleTerm,language:()=>gameLanguage,setGame:g=>game=g};',ctx);
const A=ctx.api,tests=[],test=(name,fn)=>tests.push([name,fn]);
test('Both selectors offer English and Chinese, and preference is saved without restarting',()=>{
 for(const id of ['menu-language','game-language'])assert(html.includes(`id="${id}"`));
 const card=text('Marisa Kirisame'),game={cancelled:false,players:[{hand:['marisa']}],currentPlayerIdx:0};A.setGame(game);A.initializeGameLanguage();A.setGameLanguage('zh-CN');assert.equal(A.language(),'zh-CN');assert.equal(root.lang,'zh-CN');assert.equal(storage.get('boundary-language'),'zh-CN');assert.equal(el('menu-language').value,'zh-CN');assert.equal(el('game-language').value,'zh-CN');assert.equal(card.nodeValue,'雾雨魔理沙');assert.deepEqual(game.players[0].hand,['marisa']);
 A.setGameLanguage('en');assert.equal(card.nodeValue,'Marisa Kirisame');assert.equal(game.currentPlayerIdx,0);
});
test('Every real card has a Chinese name, ability title and complete rules without changing engine data',()=>{
 A.setGameLanguage('zh-CN');assert.equal(Object.keys(A.ZH_CARDS).length,A.CARDS.length);
 for(const card of A.CARDS){const [name,ability,description]=A.ZH_CARDS[card.id];assert.equal(A.translateGameText(card.name),name);assert.equal(A.translateGameText(card.desc),description);assert.equal(A.translateGameText(A.CARD_ABILITY_NAMES[card.id]),ability);assert(ability);assert(!/[A-Za-z]{3,}/.test(description.replace(/\b[IVXLCDMN]+\b/g,'')),card.id);assert.notEqual(card.name,name);}
});
test('Kutaka uses 异界的护卫 in card details and direct ability text without changing the English title',()=>{
 A.setGameLanguage('zh-CN');assert.equal(A.ZH_CARDS.hell_kutaka[1],'异界的护卫');assert.equal(A.translateGameText('Overseeing Gateway'),'异界的护卫');
 const title=el('kutaka-title');A.setCardAbilityTitle(title,'hell_kutaka');assert.equal(title.textContent,'异界的护卫');A.setGameLanguage('en');assert.equal(title.textContent,'Overseeing Gateway');A.setGameLanguage('zh-CN');assert.equal(title.textContent,'异界的护卫');
});
test('Placed and Skip Ability use the requested Chinese wording while English remains intact',()=>{
 A.setGameLanguage('zh-CN');for(const label of ['Skip ability','Skip Ability','Cancel (skip ability)'])assert.equal(A.translateGameText(label),'跳过技能');
 for(const card of A.CARDS){const description=A.translateGameText(card.desc);assert(!description.includes('放置时：'),card.id);if(card.desc.includes('Placed:'))assert(description.includes('放置：'),card.id);}
 A.setGameLanguage('en');assert.equal(A.translateGameText('Skip Ability'),'Skip Ability');assert(A.translateGameText(A.CARD.mtn_sanae.desc).startsWith('Placed:'));
});
test('Tenshi has exactly a 20 percent alternate-title threshold and keeps the normal English title',()=>{
 const random=ctx.Math.random;try{
  A.setGameLanguage('zh-CN');let alternate=0;
  for(let i=0;i<100;i++){ctx.Math.random=()=>i/100;const heading=new Node('h3');A.setCardAbilityTitle(heading,'heaven_tenshi');assert.equal(heading.textContent,i<20?'全卡牌都飞上天！':'全卡牌的绯想天！');if(heading.textContent==='全卡牌都飞上天！')alternate++;}
  assert.equal(alternate,20);ctx.Math.random=()=>0.199999;const heading=el('tenshi-english-title');A.setGameLanguage('en');A.setCardAbilityTitle(heading,'heaven_tenshi');assert.equal(heading.textContent,'All Pieces Vermilion High!');A.setGameLanguage('zh-CN');assert.equal(heading.textContent,'全卡牌都飞上天！');
 }finally{ctx.Math.random=random;}
});
test('An open ability title stays stable through observer updates and language switches',()=>{
 const random=ctx.Math.random;let rolls=0;try{
  ctx.Math.random=()=>{rolls++;return 0.1;};A.setGameLanguage('zh-CN');const heading=el('stable-tenshi-title');A.setCardAbilityTitle(heading,'heaven_tenshi');assert.equal(rolls,1);
  const child=text(heading.textContent,heading);for(let i=0;i<5;i++)observer([{type:'characterData',target:child}]);assert.equal(heading.textContent,'全卡牌都飞上天！');
  A.setGameLanguage('en');assert.equal(heading.textContent,'All Pieces Vermilion High!');A.setGameLanguage('zh-CN');assert.equal(heading.textContent,'全卡牌都飞上天！');assert.equal(rolls,1);
  A.setCardAbilityTitle(heading,'sage_matara');assert.equal(heading.textContent,'/op');A.setGameLanguage('en');assert.equal(heading.textContent,'/op');assert.equal(rolls,1);
  ctx.Math.random=()=>0.8;A.setCardAbilityTitle(heading,'heaven_tenshi');A.setGameLanguage('zh-CN');assert.equal(heading.textContent,'全卡牌的绯想天！');
  assert.equal(A.translateGameText(A.CARD_ABILITY_NAMES.heaven_tenshi),'全卡牌的绯想天！');
 }finally{ctx.Math.random=random;}
});
test('Chinese faction icons, clickable card references and Cost/Wasteland help survive localization',()=>{
 const rule=A.ruleTextHtml(A.CARD.mtn_sanae.desc);assert(rule.includes('data-inspect-card="mtn_kanako"'));assert(rule.includes('八坂神奈子'));
 const byakuren=A.ruleTextHtml(A.CARD.temple_byakuren.desc);assert(byakuren.includes('data-rule-term="cost"'));assert(byakuren.includes('data-rule-term="wasteland"'));assert(byakuren.includes('faction-reference'));assert(!byakuren.includes('Myouren Temple'));
 A.setGameLanguage('en');assert(A.ruleTextHtml(A.CARD.mtn_sanae.desc).includes('Kanako Yasaka'));
});
test('Chinese card guesses normalize to the same canonical names accepted by the engine',()=>{
 for(const card of A.CARDS){assert.equal(A.canonicalCardName(A.ZH_CARDS[card.id][0]),card.name);assert.equal(A.canonicalCardName(' '+card.name.toLowerCase()+' '),card.name);}assert.equal(A.canonicalCardName('unknown card'),'unknown card');
});
test('Counts, players, cost prompts, extra effects and tutorial choices are translated',()=>{
 A.setGameLanguage('zh-CN');for(const value of ['Cost III: select 3 cards to return to the draw pile','Patchouli: name a card you believe AI 2 holds','[Cost II] Look at three cards, take one and order the rest.','Makai Fantastica — use effects in any order','Your move — place, trade, or draw for everyone.','Hand: 5 · Discard: 3/7','Learn to Play · 4 / 6','AI 2 is thinking...','AI 1 takes three extra turns with Makai Fantastica (Cost III).']){const out=A.translateGameText(value);assert(!/[A-Za-z]{3,}/.test(out.replace(/\b[IVXLCDMN]+\b/g,'')),out);}
});
test('Mobile fullscreen notices and draggable ability destinations have Chinese instructions',()=>{
 A.setGameLanguage('zh-CN');for(const text of ['Tap anywhere to enter fullscreen.','Fullscreen is unavailable in this browser. Rotate your phone to play sideways.','Fullscreen was blocked. Tap Fullscreen to retry, or rotate your phone.','Drag a card into the highlighted area, or select it and confirm. Double-tap to inspect.','Must play next turn','AI 1 · Discard pile'])assert(!/[A-Za-z]{3,}/.test(A.translateGameText(text)),text);
 assert.equal(A.translateGameText('Your Hand'),'你的手牌');A.setGameLanguage('en');assert.equal(A.translateGameText('Must play next turn'),'Must play next turn');
});
test('AI testing controls, statistics and rate definitions have Chinese labels without changing exported IDs',()=>{
 A.setGameLanguage('zh-CN');
 const values=['AI test','Start AI test','Fast test (skip effects)','AI test data','Pause test','Resume test','Completed games','Faction claims','Card usage','Games in hand','Use rate','Claim rate','Placement share','Seat results','Average turns','Runtime errors','Only completed games count toward rates. Aborted games are excluded.','Use rate = games where the card was placed ÷ games where it entered a hand.'];
 for(const value of values){const out=A.translateGameText(value);assert.notEqual(out,value);assert(!/[A-Za-z]{3,}/.test(out),out);}
 assert.equal(A.CARD.medicine.id,'medicine');A.setGameLanguage('en');for(const value of values)assert.equal(A.translateGameText(value),value);
});
test('Hidden debug controls, payment diagnostics, copied abilities and ending snapshots are bilingual',()=>{
 const values=['Debug tools','Close','Ability results','Resolutions','Effective','Effective rate','Cost paid','Own points','Opponent points','Points denied','Copied ability details','Caster','Used ability','Card destinations','Paid as cost','Traded away','Returned from hand','Held at end','Held games','Claim member count','Score sources','Source','Entries','Points gained','Points lost','Claims with substitutes','Substitution rate','Stalemate and error snapshots','No stalemates or errors recorded.','Restrictions','Can draw','Cannot draw','Can place','Placement blocked','Legal placements','Forced card',
 'Effective means a rule change or information reveal. Cost payment alone does not count. Passive cards have no active resolution rate.',
 'The latest 30 snapshots retain the board, hands, draw pile, restrictions and recent log. Full details are in JSON.'];
 A.setGameLanguage('zh-CN');for(const value of values){const out=A.translateGameText(value);assert.notEqual(out,value);assert(!/[A-Za-z]{3,}/.test(out.replace('JSON','')),out);}
 A.setGameLanguage('en');for(const value of values)assert.equal(A.translateGameText(value),value);
});
test('Physical card table instructions, discard regions and changing card counts are localized',()=>{
 A.setGameLanguage('zh-CN');
 for(const text of ['Move and stack cards freely. Drag one into the target area, then confirm. Double-tap to inspect.',"Each area is one player's discard pile. Move cards freely, then drag one into Your Hand and confirm.",'Confirm card choice','Place selected card here','Empty discard pile','Discard pile'])assert(!/[A-Za-z]{3,}/.test(A.translateGameText(text)),text);
 assert.equal(A.translateGameText('1 card'),'1 张牌');assert.equal(A.translateGameText('10 cards'),'10 张牌');
 A.setGameLanguage('en');assert.equal(A.translateGameText('10 cards'),'10 cards');assert.equal(A.translateGameText('Empty discard pile'),'Empty discard pile');
});
test('Dynamic text updates retain an English source and the observer settles after one rewrite',()=>{
 A.setGameLanguage('zh-CN');
 const node=text('Draw pile: 6 cards remaining');A.localizeTextNode(node);assert.equal(node.nodeValue,'抽牌堆剩余 6 张牌');observer([{type:'characterData',target:node}]);assert.equal(node.nodeValue,'抽牌堆剩余 6 张牌');node.nodeValue='Draw pile: 2 cards remaining';observer([{type:'characterData',target:node}]);assert.equal(node.nodeValue,'抽牌堆剩余 2 张牌');A.setGameLanguage('en');assert.equal(node.nodeValue,'Draw pile: 2 cards remaining');
});
test('Switching language during an ability preserves listeners and entered guess text',()=>{
 const button=el('choice-button');let clicks=0;button.addEventListener('click',()=>clicks++);const input=new Node('input');input.value='雾雨魔理沙';body.appendChild(input);const node=text('Choose card',button);A.setGameLanguage('zh-CN');assert.equal(node.nodeValue,'选择卡牌');button.events.click();A.setGameLanguage('en');button.events.click();assert.equal(clicks,2);assert.equal(input.value,'雾雨魔理沙');
});
test('Wasteland and Cost use 荒地 and 代价 in every case and keep Roman or variable costs',()=>{
 A.setGameLanguage('zh-CN');
 for(const word of ['wasteland','Wasteland','WASTELAND','wastelands'])assert.equal(A.translateGameText(word),'荒地');
 for(const word of ['cost','Cost','COST'])assert.equal(A.translateGameText(word),'代价');
 for(const value of ['I','II','III','IV','VII','N'])assert.equal(A.translateGameText(`cost ${value}`),`代价 ${value}`);
 assert.equal(A.translateGameText('wasteland_cost'),'wasteland_cost');
 const rules=A.ruleTextHtml('wasteland and cost II');assert(rules.includes('data-rule-term="wasteland"'));assert(rules.includes('data-rule-term="cost"'));assert(rules.includes('>荒地</button>'));assert(rules.includes('>代价</button> II'));
 A.setGameLanguage('en');assert.equal(A.translateGameText('wasteland and cost II'),'wasteland and cost II');
});
test('Clicked term popups are Chinese immediately and switch languages without losing the anchor',()=>{
 A.setGameLanguage('zh-CN');
 for(const [term,title] of [['wasteland','荒地'],['cost','代价']]){
  const anchor=el('term-'+term);A.openRuleTerm(term,anchor);assert.equal(el('rule-term-title').textContent,title);assert(!/[A-Za-z]{3,}/.test(el('rule-term-copy').textContent));assert.equal(el('rule-term-popover').hidden,false);assert.equal(anchor.attributes['aria-expanded'],'true');
  A.setGameLanguage('en');assert.equal(el('rule-term-title').textContent,term==='cost'?'Cost':'Wasteland');assert.equal(anchor.attributes['aria-expanded'],'true');A.setGameLanguage('zh-CN');assert.equal(el('rule-term-title').textContent,title);A.closeRuleTerm();assert.equal(el('rule-term-popover').hidden,true);
 }
});
test('Crown references become images with a language-aware label and preserve non-Crown wording',()=>{
 A.setGameLanguage('zh-CN');
 for(const id of ['hourai_eirin','reimu','marisa']){const rule=A.ruleTextHtml(A.CARD[id].desc);assert(rule.includes('class="crown-reference"'));assert(rule.includes('aria-label="领主"'));assert(rule.includes('<svg'));assert(!rule.includes('王冠'));}
 assert(A.ruleTextHtml(A.CARD.marisa.desc).includes('非<span class="crown-reference"'));assert.equal(A.translateGameText('Crown card'),'领主卡牌');assert.equal(A.translateGameText('crown'),'领主');
 assert(A.ruleTextHtml('Crown cards',{cards:false}).includes('class="crown-reference"'));
 assert(!A.ruleTextHtml('crowned').includes('crown-reference'));
 A.setGameLanguage('en');assert(A.ruleTextHtml(A.CARD.marisa.desc).includes('non-<span class="crown-reference"'));assert(A.ruleTextHtml('Crown').includes('aria-label="Crown"'));assert.equal(A.translateGameText('Crown card'),'Crown card');
});
test('Faction-preserving AI skips and the new Komachi condition have translated logs',()=>{
 A.setGameLanguage('zh-CN');
 const skipped=A.translateGameText("AI skips Eiki Shiki's ability to preserve cards and faction progress.");
 assert.match(skipped,/跳过了/);assert.match(skipped,/四季映姬/);assert.ok(!skipped.includes('preserve cards'));
 const free=A.translateGameText("AI Komachi's placement costs no turn while another Hell card is on the board.");
 assert.match(free,/小町的放置不消耗回合/);assert.match(free,/另一张地狱卡牌/);
});
(async()=>{for(const [name,fn] of tests){await fn();console.log('PASS '+name);}console.log(`${tests.length}/${tests.length} language selection checks passed`);})().catch(error=>{console.error(error);process.exitCode=1;});
