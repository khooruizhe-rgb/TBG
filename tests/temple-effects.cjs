// Exercise effect timing, reset cleanup and chooser/shop interactions against
// the real source. Geometry and CSS animation frames use a DOM/clock fixture;
// these checks do not replace a browser rendering test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2]||(fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(file,'utf8'),js=html.split('<script>')[1].split('</script>')[0];new vm.Script(js);
const slice=(a,b)=>{const start=js.indexOf(a),end=js.indexOf(b,start);assert(start>=0&&end>start,`source boundaries ${a}`);return js.slice(start,end);};
let now=1000,nextTimer=1,reduced=false;const timers=new Map(),controls=new Map();
class Element{
 constructor(tag='div',rect={left:100,top:100,width:70,height:92}){
  this.tagName=tag.toUpperCase();this.rect={...rect};this.dataset={};this.attributes={};this.children=[];this.events={};this.values=new Map();this.hidden=false;
  this.style={setProperty:(k,v)=>this.values.set(k,String(v)),removeProperty:k=>this.values.delete(k)};
  this.names=new Set();this.classList={add:(...n)=>n.forEach(x=>this.names.add(x)),remove:(...n)=>n.forEach(x=>this.names.delete(x)),contains:n=>this.names.has(n),toggle:(n,on)=>{if(on===undefined)on=!this.names.has(n);on?this.names.add(n):this.names.delete(n);return on;}};
 }
 set className(v){this.names=new Set(v.split(/\s+/).filter(Boolean));}get className(){return [...this.names].join(' ');}
 appendChild(n){n.remove();n.parentElement=this;this.children.push(n);return n;}append(...n){n.forEach(x=>this.appendChild(x));}
 replaceChildren(...n){this.children.forEach(x=>x.parentElement=null);this.children=[];this.append(...n);}
 remove(){if(this.parentElement){const a=this.parentElement.children;a.splice(a.indexOf(this),1);this.parentElement=null;}}
 set innerHTML(s){this.markup=s;this.replaceChildren();
  // Only parsed nodes used by these interactions; other markup remains text.
  for(const m of s.matchAll(/<(div|span)[^>]*class="([^"]+)"[^>]*>/g)){
   if(!/(board-card|avatar|lanterns)/.test(m[2]))continue;
   const n=new Element(m[1],this.getBoundingClientRect());n.className=m[2];this.appendChild(n);
  }
 }
 get innerHTML(){return this.markup||'';}
 matches(s){return s.startsWith('.')&&s.slice(1).split('.').every(n=>this.names.has(n));}
 querySelectorAll(s){return this.children.flatMap(n=>[...(s.split(',').some(x=>n.matches(x.trim()))?[n]:[]),...n.querySelectorAll(s)]);}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 getBoundingClientRect(){const r={...this.rect};for(const k of ['left','top','width','height'])if(this.style[k])r[k]=parseFloat(this.style[k]);return {...r,right:r.left+r.width,bottom:r.top+r.height};}
 setAttribute(k,v){this.attributes[k]=String(v);}addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 click(){(this.events.click||[]).forEach(fn=>fn({target:this}));}
 cloneNode(deep){const n=new Element(this.tagName,this.getBoundingClientRect());n.className=this.className;n.dataset={...this.dataset};n.style={...this.style,setProperty:(k,v)=>n.values.set(k,String(v)),removeProperty:k=>n.values.delete(k)};n.values=new Map(this.values);if(deep)n.append(...this.children.map(c=>c.cloneNode(true)));return n;}
}
const el=id=>{if(!controls.has(id))controls.set(id,new Element());return controls.get(id);};
const document={body:new Element('body'),createElement:tag=>new Element(tag),querySelectorAll:s=>document.body.querySelectorAll(s)};
for(const id of ['board','seats','kourindou','shop-panel','shop-status','modal-box','modal-options','modal-overlay','modal-title','look-into-overlay','look-into-emblem'])document.body.appendChild(el(id));
const context={console,Math,document,el,window:{innerWidth:1200,innerHeight:800,matchMedia:()=>({matches:reduced})},Date:{now:()=>now},
 setTimeout:(fn,delay=0)=>{const id=nextTimer++;timers.set(id,{fn,due:now+delay});return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>fn(),
 getComputedStyle:()=>({backgroundImage:'url(original-portrait)'}),setRuleText:(node,text)=>node.textContent=text,fitSingleLineText(){},
 cardBgClass:(c,id)=>'card-art-'+id,crownLightFor:()=>({main:'#fff',rgb:'255,255,255'}),applyCrownLight(){},discardLightFor:()=>({}),handExitAnimationDelay:()=>0,
 handOrSeatRect:p=>el('seats').querySelector(`.seat-${p}`)?.getBoundingClientRect(),syncTerrainAnimations(){},onRectCellPointerDown(){},
 playGameCue(){},openCardDetails:id=>context.inspected=id,AI_AVATARS:['A','B','C'],triggerPlacementPresentation(){},speakRinnosuke(){},
 CARD_DETAIL_PORTRAITS:{temple_nue:'nue.webp',sdm_patchouli:'patchouli.webp',temple_ichirin:'ichirin.webp'},KOURINDOU_PORTRAITS:{sage_mai:'mai.webp',sage_satono:'satono.webp'},TEMPLE_UNZAN_PORTRAIT:'unzan.webp'};
vm.createContext(context);
vm.runInContext(slice('const DIRS4','/* ===================== UI layer')+`
 SIZE=5;
 let game=null,pendingCellChoice=null,pendingRectChoice=null,pendingPlayerChoice=null,lastPlacedCell=null;
 const koishiArrivalUntil=new Map(),mindEffectTimers=new Set(),mindArrivals=new Map();let mindEffectsUntil=0,playtestMode=false;
`+slice('const CARD_ABILITY_NAMES =','/* Only trusted rule text')+
 slice('function escapeLogHtml(','function renderLog(')+
 slice('function finishMindEffect(','function mindSeal(')+
 slice('function cardBoardHtml(','const yuukaSunflowerUntil')+
 slice('function tileElement(','function seatRect(')+
 slice('function syncProtectionIndicator(','function renderBoard(')+
 slice('function renderShop(','function commitShopChoice(')+
 slice('function renderPlayers(','function escapeLogHtml(')+
 slice('function showCardExit(','function showDiscardVanish(')+`
 const choiceUI={
`+slice('  pickAbilityCards(title,ids){','  pickFromList(title, options){')+`};
 this.api={Game,CARD,renderShop,renderPlayers,showNueBodyIllusion,showShouGoldLasers,showMurasaPlayerVortex,showByakurenStrikes,showTempleEffect,
 clearMindEffects,syncIllusionFace,illusionCardStyle,cardBoardHtml,showCardExit,choiceUI,
 setGame:g=>game=g,setPending:c=>pendingCellChoice=c,deadline:()=>mindEffectsUntil,activeEffects:()=>templeAnimationCancels.size};`,context);
const A=context.api,flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
async function advance(ms){const end=now+ms;while(true){const next=[...timers].filter(([,t])=>t.due<=end).sort((a,b)=>a[1].due-b[1].due||a[0]-b[0])[0];if(!next)break;timers.delete(next[0]);now=next[1].due;next[1].fn();await flush();}now=end;await flush();}
function setup(){A.clearMindEffects();timers.clear();now=1000;reduced=false;A.setPending(null);const g=new A.Game(3,{});g.players.forEach(p=>{p.hand=[];p.discard=[];});g.board=Array.from({length:5},()=>Array(5).fill(null));g.wasteland=Array.from({length:5},()=>Array(5).fill(false));A.setGame(g);
 el('board').replaceChildren();el('kourindou').replaceChildren();
 for(let r=0;r<5;r++)for(let c=0;c<5;c++){const tile=new Element('div',{left:300+c*78,top:80+r*99,width:70,height:92});tile.className='cell';tile.dataset={r:String(r),c:String(c)};el('board').appendChild(tile);}
 A.renderPlayers();for(const [i,s]of el('seats').children.entries()){s.rect={left:i===1?930:50,top:i===2?650:45,width:190,height:110};s.children.forEach(n=>n.rect={...s.rect});}return g;}
function place(g,r,c,id){g.setCardAt(r,c,id);const tile=el('board').children[r*5+c];tile.innerHTML=A.cardBoardHtml(id);return tile.querySelector('.board-card');}
const tests=[],test=(n,f)=>tests.push([n,f]);
test('Hand placement selection keeps every shop card visible while highlighting Rinnosuke',()=>{
 const g=setup();g.shopCards=['shop_rinnosuke','sdm_meiling','hourai_tewi','hell_kutaka'];A.renderShop();const tiles=el('kourindou').children;
 tiles.forEach(t=>t.classList.add('dimmed'));A.setPending({cells:[g.shopTiles[0]],shopTrade:false});A.renderShop();
 assert.equal(tiles.length,4);assert(tiles.every(t=>!t.classList.contains('dimmed')));assert(tiles[0].classList.contains('pick-target'));assert(!tiles[1].classList.contains('pick-target'));assert(tiles.every(t=>t.classList.contains('shop-protected')));
 A.setPending({cells:[],shopSlots:[1,2,3],shopTrade:true});A.renderShop();assert(tiles.slice(1).every(t=>t.classList.contains('pick-target')));assert(!tiles[0].classList.contains('pick-target'));
});
test('The bigger Nue chooser displays three descriptions, supports inspection and selects the requested ability',async()=>{
 setup();const ids=['sdm_patchouli','temple_ichirin','temple_murasa'];const chosen=A.choiceUI.pickAbilityCards('Choose an illusion',ids),options=el('modal-options').children;
 assert.equal(options.length,3);assert(el('modal-box').classList.contains('chimera-mode'));assert(el('modal-options').classList.contains('chimera-options'));
 for(let i=0;i<3;i++)assert.equal(options[i].querySelector('.chimera-description').textContent,A.CARD[ids[i]].desc);
 options[0].querySelector('.chimera-card').click();assert.equal(context.inspected,ids[0]);assert(el('modal-overlay').classList.contains('show'));
 let prevented=false;options[1].querySelector('.chimera-card').events.keydown[0]({key:'Enter',preventDefault(){prevented=true;}});assert(prevented);assert.equal(context.inspected,ids[1]);
 options[2].querySelector('.chimera-use').click();assert.equal(await chosen,ids[2]);assert(!el('modal-box').classList.contains('chimera-mode'));assert(!el('modal-overlay').classList.contains('show'));
 assert(html.includes('#modal-options.chimera-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))'));assert(html.includes('max-width:940px'));
});
test('Nue changes her visible body while preserving card identity and finishes before the next interface',async()=>{
 const g=setup(),face=place(g,1,1,'temple_nue');g.borrowedAbilities.temple_nue='sdm_patchouli';const animation=A.showNueBodyIllusion({r:1,c:1,fromId:'temple_nue',toId:'sdm_patchouli'});
 A.syncIllusionFace(face,'temple_nue');assert(face.classList.contains('nue-morph-hidden'));assert(face.classList.contains('card-art-illusion'));assert(face.values.get('--illusion-images').includes('patchouli.webp'));assert.equal(g.cardAt(1,1),'temple_nue');
 const ghost=document.querySelectorAll('.nue-body-illusion')[0];assert.equal(ghost.querySelector('.illusion-form').children[0].src,'patchouli.webp');assert.equal(ghost.querySelector('.illusion-original').style.backgroundImage,'url(original-portrait)');
 let finished=false;animation.finished.then(()=>finished=true);await advance(1149);assert(!finished);await advance(1);assert(finished);assert(!face.classList.contains('nue-morph-hidden'));assert(face.classList.contains('card-art-illusion'));assert.equal(document.querySelectorAll('.nue-body-illusion').length,0);
});
test('Nue reset restores the real body and cannot keep the next match hidden',async()=>{
 const g=setup(),face=place(g,1,1,'temple_nue');g.borrowedAbilities.temple_nue='temple_ichirin';const animation=A.showNueBodyIllusion({r:1,c:1,fromId:'temple_nue',toId:'temple_ichirin'});
 assert.equal(document.querySelectorAll('.illusion-form')[0].children.length,2);A.clearMindEffects();assert.equal(await animation.finished,false);assert(!face.classList.contains('nue-morph-hidden'));assert.equal(A.activeEffects(),0);
 const next=setup(),newFace=place(next,1,1,'temple_nue');await advance(1500);assert(!newFace.classList.contains('nue-morph-hidden'));assert(!newFace.classList.contains('card-art-illusion'));
});
test('Shou fires blue beams to every wasteland and renders cleared shop spaces as gold',async()=>{
 const g=setup();place(g,1,1,'temple_shou');const waste=[{r:0,c:0},{r:3,c:2},g.shopTiles[1]];for(const t of waste)g.setWastelandAt(t.r,t.c,true);A.renderShop();
 A.showShouGoldLasers({r:1,c:1,tiles:waste});assert.equal(document.querySelectorAll('.shou-blue-laser').length,3);assert.equal(document.querySelectorAll('.shou-gold-wash').length,3);
 for(const t of waste)g.clearWasteland(t.r,t.c,{gold:true});A.renderShop();assert(el('kourindou').children[1].classList.contains('shou-gold'));assert(!el('kourindou').children[1].classList.contains('wasteland'));
 await advance(1100);assert.equal(document.querySelectorAll('.shou-blue-laser').length,0);assert(g.isGoldTile(waste[2].r,waste[2].c));
});
test('Murasa sinks the selected player rather than her card, survives a render and restores that seat',async()=>{
 const g=setup();A.showMurasaPlayerVortex({playerIdx:1});assert(el('seats').querySelector('.seat-1').classList.contains('murasa-submerged'));assert(!el('seats').querySelector('.seat-0').classList.contains('murasa-submerged'));
 const snapshot=document.querySelectorAll('.murasa-sinking-player')[0];assert(snapshot.querySelector('.seat-1'));assert.equal(document.querySelectorAll('.murasa-vortex').length,1);
 A.renderPlayers();const replacement=el('seats').querySelector('.seat-1');assert(replacement.classList.contains('murasa-submerged'));await advance(1900);assert(!replacement.classList.contains('murasa-submerged'));assert.equal(document.querySelectorAll('.murasa-vortex').length,0);assert.equal(g.uiEffects.murasaSinkUntil[1],undefined);
});
test('Cancelling Murasa restores player interaction and removes the sinking snapshot',()=>{
 setup();A.showMurasaPlayerVortex({playerIdx:0});A.renderPlayers();A.clearMindEffects();assert(!el('seats').querySelector('.seat-0').classList.contains('murasa-submerged'));assert.equal(document.querySelectorAll('.murasa-sinking-player').length,0);assert.equal(A.deadline(),0);
});
test('Byakuren fists strike before card removal, and the intact card flies toward the discard owner',async()=>{
 const g=setup();place(g,1,1,'temple_byakuren');place(g,0,0,'sdm_patchouli');place(g,2,1,'hourai_mokou');const targets=[{r:0,c:0},{r:2,c:1}],animation=A.showByakurenStrikes({r:1,c:1,targets,playerIdx:1});
 assert.equal(document.querySelectorAll('.byakuren-fist-flight').length,2);let struck=false;animation.ready.then(v=>struck=v);await advance(359);assert(!struck);assert.equal(document.querySelectorAll('.byakuren-impact').length,0);await advance(1);assert(struck);assert.equal(document.querySelectorAll('.byakuren-impact').length,2);
 A.showCardExit({cardId:'sdm_patchouli',playerIdx:1,source:{r:0,c:0,effect:'byakuren'}},'discard');const flight=document.querySelectorAll('.ability-byakuren')[0];assert(flight.querySelector('.board-card'));assert(Number.parseFloat(flight.values.get('--hit-fly-x'))>0);assert.equal(flight.style.animationDelay,'0ms');await advance(1040);assert.equal(await animation.finished,true);assert.equal(document.querySelectorAll('.byakuren-fist-flight').length,0);
});
test('Cancelled Byakuren cannot fire delayed impact callbacks',async()=>{
 const owner=setup();place(owner,1,1,'temple_byakuren');place(owner,0,0,'sdm_patchouli');const animation=A.showByakurenStrikes({r:1,c:1,targets:[{r:0,c:0}],playerIdx:1});A.clearMindEffects();assert.equal(await animation.ready,false);await advance(1500);assert.equal(document.querySelectorAll('.byakuren-impact').length,0);assert.equal(A.activeEffects(),0);
});
test('Reduced motion leaves all real player and card controls visible with no animation wait',()=>{
 const g=setup();place(g,1,1,'temple_nue');place(g,0,0,'sdm_patchouli');reduced=true;
 assert.equal(A.showNueBodyIllusion({r:1,c:1,fromId:'temple_nue',toId:'sdm_patchouli'}),null);A.showMurasaPlayerVortex({playerIdx:0});A.showShouGoldLasers({r:1,c:1,tiles:[{r:0,c:0}]});assert.equal(A.showByakurenStrikes({r:1,c:1,targets:[{r:0,c:0}],playerIdx:1}),null);
 assert.equal(A.activeEffects(),0);assert.equal(A.deadline(),0);assert(!el('seats').querySelector('.seat-0').classList.contains('murasa-submerged'));assert(!el('board').children[6].querySelector('.board-card').classList.contains('nue-morph-hidden'));
});
(async()=>{for(const [name,fn]of tests){await fn();console.log('PASS '+name);}console.log(`${tests.length}/${tests.length} Temple effect and chooser checks passed`);})().catch(e=>{console.error(e);process.exitCode=1;});
