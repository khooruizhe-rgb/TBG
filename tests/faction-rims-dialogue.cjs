// Test real card classes and dialogue timing; this DOM/clock fixture does not render a browser.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2]||(fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(file,'utf8'),js=html.split('<script>')[1].split('</script>')[0];
const slice=(a,b)=>{const start=js.indexOf(a),end=js.indexOf(b,start);assert(start>=0&&end>start);return js.slice(start,end);};
let now=1000,nextTimer=1,positions=0;const timers=new Map(),nodes=new Map();
const el=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,textContent:''});return nodes.get(id);};
const ctx={console,Math,el,Date:{now:()=>now},positionRinnosukeBubble(){positions++;},dockRinnosukeBubble(){},
 setTimeout:(fn,delay)=>{const id=nextTimer++;timers.set(id,{fn,due:now+delay});return id;},clearTimeout:id=>timers.delete(id)};
vm.createContext(ctx);
vm.runInContext(slice('const FACTIONS =','const NORMAL_HAND_LIMIT')+
 slice('const FACTION_BG_CLASS','const CARD_DETAIL_FACTION_ICONS')+
 'let game=null,selectedHandCard=null,pendingCellChoice=null;\n'+
 slice('const RINNOSUKE_LINES=','function dockRinnosukeBubble')+
 slice('function clearRinnosukeBubble(){','function positionRinnosukeBubble(){')+
 slice('function rinnosukeTradeSelection(){','for(const area of [el(\'board\'),el(\'kourindou\')])')+
 '\nthis.api={FACTIONS,CARDS,cardBgClass,speakRinnosuke,clearRinnosukeBubble,onRinnosukeApproach,setSelection:id=>selectedHandCard=id,setPending:choice=>pendingCellChoice=choice,setGame:g=>game=g};',ctx);
const A=ctx.api,tests=[],test=(name,fn)=>tests.push([name,fn]);
function setup(){A.clearRinnosukeBubble();A.setSelection(null);A.setPending(null);timers.clear();now=1000;positions=0;A.setGame({cancelled:false,shopkeeperAvailable:()=>true,cardAt:()=> 'shop_rinnosuke'});}
function advance(ms){const end=now+ms;while(true){const next=[...timers].filter(([,timer])=>timer.due<=end).sort((a,b)=>a[1].due-b[1].due)[0];if(!next)break;timers.delete(next[0]);now=next[1].due;next[1].fn();}now=end;}
test('Every faction has a distinct rim matching its established faction color',()=>{
 const colors=[];for(const [id,faction]of Object.entries(A.FACTIONS)){const match=html.match(new RegExp('\\.card-faction-'+id+'\\{--faction-edge:([^}]+)\\}'));assert(match,`missing rim for ${id}`);assert.equal(match[1],faction.color);colors.push(match[1]);}assert.equal(new Set(colors).size,colors.length);
});
test('Every portrait, fifth card and token receives its own faction rim class',()=>{
 for(const card of A.CARDS)assert(A.cardBgClass(card,card.id).split(' ').includes(`card-faction-${card.faction}`),card.id);
 assert(html.includes('border:3px solid var(--faction-edge,#e7d6b8)'));assert(html.includes('border:2px solid var(--faction-edge,#e7d6b8)'));assert(html.includes('.look-into-card.hand-card.selected{border-color:var(--faction-edge,var(--gold))}'));
});
test('Marisa has a yellow rim on small cards and inspection, while Reimu keeps the faction rim',()=>{
 assert.match(html,/\.card-art-marisa,#card-detail\.detail-card-marisa\{--faction-edge:#ffeb3b\}/);
 const card=A.CARDS.find(c=>c.id==='marisa');assert(A.cardBgClass(card,card.id).split(' ').includes('card-art-marisa'));
 assert.equal(A.FACTIONS.hakurei.color,'#e0483f');
});
test('Selecting a hand card preserves Rinnosuke’s current line and keeps its bubble visible',()=>{
 setup();assert(A.speakRinnosuke('welcome',{force:true}));const line=el('rinnosuke-bubble-text').textContent,positionCount=positions;A.setSelection('medicine');
 for(const kind of ['welcome','observe','offer'])assert.equal(A.speakRinnosuke(kind,{force:true}),false);
 advance(6000);assert.equal(el('rinnosuke-bubble-text').textContent,line);assert.equal(el('rinnosuke-bubble').hidden,false);assert.equal(positions,positionCount);
 A.setSelection(null);advance(400);assert.equal(el('rinnosuke-bubble').hidden,true);
});
test('Selecting or dragging a card never starts a new bubble when Rinnosuke is quiet',()=>{
 setup();A.setSelection('medicine');assert.equal(A.speakRinnosuke('offer',{force:true}),false);assert(el('rinnosuke-bubble').hidden);
 A.setSelection(null);A.setPending({dragOnly:true});assert.equal(A.speakRinnosuke('observe',{force:true}),false);assert(el('rinnosuke-bubble').hidden);
});
test('Approaching Rinnosuke during selection does not interrupt trading, and a completed exchange may speak',()=>{
 setup();A.speakRinnosuke('welcome',{force:true});const line=el('rinnosuke-bubble-text').textContent;A.setSelection('medicine');advance(10000);
 const tile={dataset:{r:'7',c:'1'},contains:()=>false};A.onRinnosukeApproach({target:{closest:()=>tile},currentTarget:{contains:()=>true},relatedTarget:null});assert.equal(el('rinnosuke-bubble-text').textContent,line);
 assert(A.speakRinnosuke('exchange',{force:true}));assert.notEqual(el('rinnosuke-bubble-text').textContent,line);A.setSelection(null);advance(3400);assert(el('rinnosuke-bubble').hidden);
});
test('Reset cancels a held bubble and an obsolete expiry cannot hide the next game’s dialogue',()=>{
 setup();A.speakRinnosuke('welcome',{force:true});const oldExpiry=[...timers.values()][0].fn;A.setSelection('medicine');advance(5000);A.clearRinnosukeBubble();assert(el('rinnosuke-bubble').hidden);assert.equal(timers.size,0);
 A.setSelection(null);A.speakRinnosuke('welcome',{force:true});oldExpiry();assert.equal(el('rinnosuke-bubble').hidden,false);advance(4200);assert.equal(el('rinnosuke-bubble').hidden,true);
});
for(const [name,fn]of tests){fn();console.log('PASS '+name);}console.log(`${tests.length}/${tests.length} faction rim and dialogue checks passed`);
