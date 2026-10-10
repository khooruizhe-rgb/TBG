// Real HTTP/SSE transport and separate creator/guest VMs execute the current Game and room client.
// UI chooser gestures and pixel rendering are simulated, not browser-tested.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=[process.cwd(),__dirname,path.join(__dirname,'..')].find(dir=>fs.existsSync(path.join(dir,'touhou_board_game_github_textures.html')));
const html=fs.readFileSync(path.join(root,'touhou_board_game_github_textures.html'),'utf8'),js=html.split('<script>')[1].split('</script>')[0];new vm.Script(js);
const slice=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a)));
let base,server;const clients=[],tests=[],test=(n,f)=>tests.push([n,f]),plain=v=>JSON.parse(JSON.stringify(v));
const until=async condition=>{const deadline=Date.now()+5000;while(Date.now()<deadline){if(condition())return;await new Promise(r=>setTimeout(r,5));}throw Error('Timed out waiting for room client');};
async function post(route,body){const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const value=await r.json();assert.equal(r.status,200,JSON.stringify(value));return value;}
class Element{
 constructor(id=''){this.id=id;this.style={setProperty(){},removeProperty(){}};this.dataset={};this.children=[];this.attrs={};this.events={};this.names=new Set();this.hidden=false;this.isConnected=true;this.classList={add:(...n)=>n.forEach(x=>this.names.add(x)),remove:(...n)=>n.forEach(x=>this.names.delete(x)),contains:n=>this.names.has(n),toggle:(n,v)=>v?this.names.add(n):this.names.delete(n)};}
 set className(n){this.names=new Set(n.split(' '));}get className(){return [...this.names].join(' ');}appendChild(n){this.children.push(n);return n;}replaceChildren(...n){this.children=n;}
 setAttribute(n,v){this.attrs[n]=v;}addEventListener(n,fn){(this.events[n]||=[]).push(fn);}removeEventListener(){}querySelector(){return null;}getBoundingClientRect(){return {left:0,top:0,width:60,height:80};}focus(){}remove(){this.isConnected=false;}
}
function makeClient(){
 const nodes=new Map(),events=[],prompts=[],handlers={};const el=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};
 const doc={body:new Element(),documentElement:new Element(),createElement:()=>new Element(),querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}};
 let A;const window={scrollTo(){},matchMedia:()=>({matches:true}),location:{assign(){}}};
 class SSE{
  constructor(url){this.url=url;this.controller=new AbortController();this.read();}close(){this.controller.abort();}
  async read(){try{const res=await fetch(base+this.url,{signal:this.controller.signal});assert.equal(res.status,200);this.onopen?.();const reader=res.body.getReader(),decoder=new TextDecoder();let buffer='';
   for(;;){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let end;
    while((end=buffer.indexOf('\n\n'))>=0){const chunk=buffer.slice(0,end);buffer=buffer.slice(end+2);if(chunk.startsWith('data: '))this.onmessage?.({data:chunk.slice(6)});}}
  }catch(error){if(!this.controller.signal.aborted){events.push(['transport-error',error.message]);this.onerror?.();}}}
 }
 const ui={};for(const method of ['pickPlayer','pickFromList','pickAbilityCards','pickOwnHandCard','pickOwnHandCards','pickHandCard','pickCardPool','arrangeDrawPileCards','pickRectByDrag','pickCell','promptText'])ui[method]=async(...args)=>{
  prompts.push({method,args:plain(args)});if(handlers[method])return handlers[method](...args);
  if(method==='pickFromList')return args[1].find(o=>!o.disabled)?.value??null;
  if(method==='pickPlayer')return args[1][0];if(method==='pickCell')return args[1][0];
  if(method==='pickOwnHandCards')return args[1].slice(0,args[2].minCount);
  if(method==='arrangeDrawPileCards')return {taken:args[0].at(-1),order:args[0].slice(0,-1).reverse()};
  if(method==='pickCardPool')return args[1][0].id;
  if(method==='pickHandCard'||method==='pickOwnHandCard'||method==='pickAbilityCards')return args[1][0];return null;
 };
 for(const hook of ['onDrawCard','onDrawPileReturn','onDiscard','onCostPaid','onBoardToHand','onTimeStop','onTempleEffect','onSwap','onShopTrade'])ui[hook]=(...args)=>events.push([hook,plain(args)]);
 ui.onLog=()=>{};ui.render=()=>A.publishSnapshot();
 const context={console,Math,JSON,Set,Map,Promise,setTimeout,clearTimeout,queueMicrotask,el,ui,window,document:doc,EventSource:SSE,
  fetch:(route,opts)=>fetch(base+route,opts),requestAnimationFrame:fn=>fn(),location:{protocol:'http:',origin:base},
  setRuleText:(n,t)=>n.textContent=t,translateGameText:t=>t,queueMobileViewport(){},playGameCue(){},syncHandSelection(){},updateTutorialProgress(){},tutorialAllowsTrade:()=>true,
  renderHand(){},renderPlayers(){},renderBoard(){},renderLog(){},clearHandPlacementArrivals(){},handPlacementArrivals:new Set(),
  playHandPlacementArrival(){},showTimeStop(){},showCrownBackdrop(){},
  resetGameView(){A?.retire();},startNewGame(){A.newHostMatch();},returnToMainMenu(){A.closeOnlineSession(false);A.retire();},
  triggerPlacementPresentation:(...args)=>A.broadcastOnlineEffect('placement',args),speakRinnosuke(){},logOverride(){},
  waitAITestReady:async()=>true,renderAll(){A.publishSnapshot();A.renderStatus();},
  captureHandPlacementArrival(){},cancelHandSelection(){},handDragSettling:false,
  CARD_DETAIL_PORTRAITS:{},cardBgClass:()=>'',cardNameListHtml:ids=>ids.join(','),mindEyeSvg:()=>'',syncMurasaVortices(){},syncRemiliaArrival(){},mindArrivals:new Map(),
  onHandCardClick(){},onHandDragStart(){},onHandDragEnd(){},onHandCardPointerDown(){},onHandCardPointerMove(){},onHandCardPointerUp(){},onHandCardPointerCancel(){},suppressTouchDropClick:null,openCardDetails(){},fitSingleLineText(){}};
 vm.createContext(context);
 vm.runInContext(slice('const DIRS4','/* ===================== UI layer')+`
 let game=null,lastPlacedCell=null,humanActionResolving=false,pendingCellChoice=null,pendingHandChoice=null;
 let lastCrownBackdropId=null,timeStopDepth=0,chosenPlayerCount=3,chosenBoardSize=4,chosenAIDifficulty='hard',chosenAITestMode=false,playtestMode=false;
 const sanaeArrivalUntil=new Map(),mokouArrivalUntil=new Map(),yukariArrivalUntil=new Map(),remiliaArrivals=new Map();
 `+slice('CARD.__hidden_card=','const el = id =>')+slice('function renderStatus(){','let announcedGameResult')+
 slice('const NO_PLACED_ABILITY','async function doPlayerAction')+slice('function canTakeTurnAction','/* Cards with no "Placed:')+
 slice('async function doPlayerAction','/* Keep a hand card visible')+`
 sleep=async()=>{};
 this.api={Game,CARD,CARDS,FACTIONS,beginOnlineSession,onlineSnapshot,applyOnlineSnapshot,humanPick,validOnlineChoice,handleRemoteAction,handleOnlineMessage,sendGuestAction,sendOnline,localSeat,localTurnReady,displaySeatIndex,publishOnlineNow,publishSnapshot,doPlayerAction,closeOnlineSession,broadcastOnlineEffect,renderStatus,
 game:()=>game,session:()=>online,waiting:()=>pendingRemoteTurn,choice:()=>pendingRemoteChoice,
 retire(){if(game)game.cancelled=true;pendingRemoteTurn?.resolve({});pendingRemoteTurn=null;pendingRemoteChoice?.resolve(null);pendingRemoteChoice=null;game=null;},
 newHostMatch(){SIZE=4;game=new Game(online.room.capacity,ui,null,{aiDifficulty:'hard'});game.players.forEach((p,i)=>{p.name=online.room.players[i].name;p.isAI=online.room.players[i].isAI;});publishSnapshot();},
 setGame:g=>game=g,setTurn:(p,id=42)=>{game.currentPlayerIdx=p;pendingRemoteTurn={seat:p,id,resolve:flags=>events.push(['resolved',flags]),busy:false,match:game};},
 setPending:id=>{onlineInputPending=true;online.pendingActionId=id;},pending:()=>onlineInputPending,choices:()=>remoteChoiceActive};`,Object.assign(context,{events}));
 A=context.api;
 // Use the production hook-forwarding wrapper with simulated presentation functions.
 vm.runInContext(slice("for(const name of Object.keys(ui).filter",'// Every choice waits'),context);
 const client={A,context,el,events,prompts,handlers,close(){A.closeOnlineSession(false);}};clients.push(client);return client;
}
let H,G,B,g,room,host,guest,other;
function fixture({hand=['mtn_aya','medicine'],board=[],discard=[[],[],[]],stock=['sdm_meiling','hourai_tewi','hell_kutaka'],deck=['sage_ran','hourai_mokou']}={}){
 H.A.retire();g=new H.A.Game(3,H.context.ui,null,{aiDifficulty:'hard'});g.players.forEach((p,i)=>{p.name=room.players[i].name;p.isAI=false;p.hand=i===1?hand.slice():i===2?['marisa']:['sage_yukari'];p.discard=discard[i].slice();});
 g.board=Array.from({length:4},()=>Array(4).fill(null));g.wasteland=Array.from({length:4},()=>Array(4).fill(false));g.drawPile=deck.slice();g.shopCards=['shop_rinnosuke',...stock];
 for(const [r,c,id]of board)g.setCardAt(r,c,id);g.currentPlayerIdx=1;H.A.setGame(g);H.A.setTurn(1);return g;
}
const counts=match=>[...match.board.flat(),...match.shopCards,...match.drawPile,...match.players.flatMap(p=>[...p.hand,...p.discard])].filter(Boolean).sort();
async function sync(){await H.A.publishOnlineNow();await until(()=>G.A.game()&&G.A.game().currentPlayerIdx===g.currentPlayerIdx&&G.A.game().players[1].hand.join()===g.players[1].hand.join()&&JSON.stringify(G.A.game().board)===JSON.stringify(g.board)&&JSON.stringify(G.A.game().shopCards)===JSON.stringify(g.shopCards)&&JSON.stringify(G.A.game().tradedThisTurn)===JSON.stringify(g.tradedThisTurn));}
test('Creator starts current rules automatically and each guest receives only their own hand',async()=>{
 await until(()=>H.A.game()&&G.A.game()&&B.A.game());g=H.A.game();assert.equal(g.players.length,3);assert(g.players.every(p=>!p.isAI));
 assert.equal(G.A.localSeat(),1);assert.equal(G.A.displaySeatIndex(1),0);assert.equal(B.A.displaySeatIndex(2),0);
 assert.deepEqual(plain(G.A.game().players[1].hand),plain(g.players[1].hand));assert(G.A.game().players[0].hand.every(id=>id==='__hidden_card'));
 assert(B.A.game().players[1].hand.every(id=>id==='__hidden_card'));assert.equal(G.A.game().drawPile.length,g.drawPile.length);
});
test('Host rejects stale turns, wrong seats, missing action IDs and illegal coordinates',async()=>{
 fixture();await sync();const before=counts(g);
 for(const [seat,action] of [[2,{type:'draw'}],[1,{type:'place',cardId:'mtn_aya',r:99,c:0}],[1,{type:'draw',turnId:41}],[1,{type:'draw',actionId:null}]]){
  assert.equal(await H.A.handleRemoteAction(seat,{matchId:H.A.session().matchId,turnId:42,actionId:1,...action}),false);
 }assert.deepEqual(counts(g),before);assert(H.A.waiting());
});
test('Guest trading changes actual cards once while retaining the same pending turn',async()=>{
 fixture();await sync();const before=counts(g),target={r:g.shopTiles[1].r,c:g.shopTiles[1].c};
 assert(await G.A.sendGuestAction({type:'trade',cardId:'mtn_aya',target}));await until(()=>g.tradedThisTurn[1]);await sync();await until(()=>G.A.localTurnReady());
 assert(g.players[1].hand.includes('sdm_meiling'));assert.equal(g.shopCards[1],'mtn_aya');assert.equal(H.A.waiting().id,42);assert.deepEqual(counts(g),before);
 assert.equal(await H.A.handleRemoteAction(1,{matchId:H.A.session().matchId,turnId:42,actionId:2,type:'trade',cardId:'medicine',target}),false);assert(H.A.waiting());
});
test('An unrelated snapshot cannot unlock a submitted action before its acknowledgement',async()=>{
 fixture();await sync();G.A.setPending(200);const snapshot=plain(H.A.onlineSnapshot(1));snapshot.actionAck=199;G.A.applyOnlineSnapshot(snapshot);assert(G.A.pending());assert(!G.A.localTurnReady());
 snapshot.actionAck=200;G.A.applyOnlineSnapshot(snapshot);assert(!G.A.pending());assert(G.A.localTurnReady());
});
test('Guest placement runs the current engine and cannot consume the turn twice',async()=>{
 fixture({hand:['hourai_eirin','mtn_aya']});await sync();const before=counts(g);
 await G.A.sendGuestAction({type:'place',cardId:'hourai_eirin',r:1,c:1});await until(()=>g.cardAt(1,1)==='hourai_eirin');await sync();await until(()=>!H.A.waiting());
 assert.equal(g.players[1].hand.length,1);assert.deepEqual(counts(g),before);
 assert.equal(await H.A.handleRemoteAction(1,{matchId:H.A.session().matchId,turnId:42,actionId:50,type:'place',cardId:'mtn_aya',r:1,c:2}),false);assert.equal(g.cardAt(1,2),null);
});
test('Guest draws for everyone, with card identities anonymized for other recipients',async()=>{
 fixture();await sync();const before=counts(g);await G.A.sendGuestAction({type:'draw'});await until(()=>g.drawPile.length===0);await sync();assert.deepEqual(counts(g),before);
 // Forward the exact draw callback parameters and inspect what another guest receives.
 H.A.broadcastOnlineEffect('onDrawCard',[{playerIdx:1,cardId:'palace_satori'}]);await until(()=>B.events.some(e=>e[0]==='onDrawCard'));
 assert(B.events.filter(e=>e[0]==='onDrawCard').every(e=>e[1][0].cardId==null));
});
test('Multi-card cost choice opens on the acting guest and changes the real hand immediately',async()=>{
 fixture({hand:['mtn_aya','medicine','hourai_mokou','palace_satori']});await sync();const before=counts(g),start=G.prompts.length,otherStart=B.events.length,ownStart=G.events.length;
 assert(await g.payCost(1,3));await sync();assert.equal(g.players[1].hand.length,1);assert.deepEqual(counts(g),before);
 assert(G.prompts.slice(start).some(p=>p.method==='pickOwnHandCards'&&p.args[2].minCount===3));
 assert(!H.prompts.some(p=>p.method==='pickOwnHandCards'));assert.equal(G.A.game().players[1].hand.length,1);
 await until(()=>B.events.slice(otherStart).filter(e=>e[0]==='onDrawPileReturn').length===3);
 assert(B.events.slice(otherStart).filter(e=>e[0]==='onDrawPileReturn').every(e=>e[1][0].cardId==='__hidden_card'));
 assert(G.events.slice(ownStart).filter(e=>e[0]==='onDrawPileReturn').every(e=>e[1][0].cardId!=='__hidden_card'));
});
test('Player targeting and revealed-hand selection occur on the acting guest only',async()=>{
 fixture({hand:['palace_satori','mtn_aya'],board:[[1,1,'palace_satori']]});g.players[1].hand=['mtn_aya','medicine'];await sync();
 const begin=B.prompts.length;G.handlers.pickPlayer=(_title,ids)=>ids.find(i=>i===2);G.handlers.pickHandCard=(_title,ids)=>ids[0];
 await g.resolveAbility('palace_satori',1,1,1,0);await sync();assert(g.players[1].hand.includes('marisa'));assert.equal(g.players[2].hand.length,0);assert.equal(B.prompts.length,begin);
 delete G.handlers.pickPlayer;delete G.handlers.pickHandCard;
});
test('Byakuren look ability pays on the guest and returns the chosen top-card order',async()=>{
 fixture({hand:['mtn_aya','medicine','hourai_mokou'],board:[[1,1,'temple_byakuren']],deck:['palace_rin','sage_ran','mtn_sanae','hourai_reisen']});await sync();
 let selected=false,arranged;G.handlers.pickFromList=(_title,opts)=>{if(!selected){selected=true;return opts.find(o=>o.value==='look'&&!o.disabled).value;}return null;};
 G.handlers.arrangeDrawPileCards=ids=>arranged={taken:ids.at(-1),order:ids.slice(0,-1).reverse()};
 const before=counts(g);await g.resolveAbility('temple_byakuren',1,1,1,0);await sync();
 assert(g.players[1].hand.includes(arranged.taken));assert.equal(g.drawPile.at(-1),arranged.order[0]);assert.deepEqual(counts(g),before);
 assert(!H.prompts.some(p=>p.method==='arrangeDrawPileCards'));delete G.handlers.pickFromList;delete G.handlers.arrangeDrawPileCards;
});
test('Reisen-forced Yuyuko places and pays her variable cost on the correct guest',async()=>{
 fixture({hand:['haku_yuyuko','mtn_aya','medicine'],board:[[0,1,'hourai_mokou'],[1,0,'sdm_patchouli']]});g.forcedPlay[1]='haku_yuyuko';await sync();
 G.handlers.pickCell=(_title,cells)=>cells.find(c=>c.r===1&&c.c===1);G.handlers.pickOwnHandCards=(_title,ids,opts)=>ids.slice(0,opts.maxCount);
 const before=counts(g);await H.A.doPlayerAction(1);await sync();assert.equal(g.cardAt(1,1),'haku_yuyuko');assert.equal(g.forcedPlay[1],null);assert.equal(g.players[1].discard.length,2);assert.deepEqual(counts(g),before);
 delete G.handlers.pickCell;delete G.handlers.pickOwnHandCards;
});
test('All chooser payloads validate permitted selections and reject malformed or duplicate results',()=>{
 const ok=H.A.validOnlineChoice;
 assert(ok('pickPlayer',['p',[0,2]],2));assert(!ok('pickPlayer',['p',[0,2]],1));assert(!ok('pickFromList',['p',[{value:'used',disabled:true}]],'used'));
 assert(ok('pickOwnHandCards',['p',['a','b'],{minCount:2,maxCount:2}],['a','b']));assert(!ok('pickOwnHandCards',['p',['a','b'],{minCount:2,maxCount:2}],['a','a']));
 assert(ok('arrangeDrawPileCards',[['a','b','c']],{taken:'b',order:['c','a']}));assert(!ok('arrangeDrawPileCards',[['a','b','c']],{taken:'b',order:['a','a']}));
 assert(!ok('pickCell',['p',[{r:0,c:0}]],{r:0,c:1}));assert(!ok('promptText',['p'],'x'.repeat(101)));
});
test('A restarted match reuses the room, creates fresh current rules and resets guest state',async()=>{
 const prior=H.A.session().matchId;H.A.session().matchId='restart-match';H.context.startNewGame();g=H.A.game();await sync();await until(()=>G.A.session().matchId==='restart-match');
 assert.notEqual(prior,H.A.session().matchId);assert.equal(g.shopCards.length,4);assert(g.players.every(p=>p.hand.length===6));assert(!G.A.game().tradedThisTurn[1]);
});
(async()=>{
 server=spawn(process.execPath,[path.join(root,'multiplayer-server.mjs')],{cwd:root,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
 base=await new Promise((resolve,reject)=>{server.on('error',reject);server.stdout.on('data',d=>{const m=d.toString().match(/localhost:(\d+)/);if(m)resolve('http://127.0.0.1:'+m[1]);});});
 host=await post('/api/create',{capacity:3,name:'Creator',protocol:2});guest=await post('/api/join',{code:host.code,name:'Guest',protocol:2});other=await post('/api/join',{code:host.code,name:'Other',protocol:2});room=other;
 H=makeClient();G=makeClient();B=makeClient();H.A.beginOnlineSession(host);G.A.beginOnlineSession(guest);B.A.beginOnlineSession(other);
 await until(()=>H.A.session().room.players.length===3&&H.A.session().room.players.every(p=>p.connected));await post('/api/start',{code:host.code,token:host.token});
 for(const [name,run]of tests){await run();console.log('PASS '+name);}console.log(`${tests.length}/${tests.length} multiplayer client/engine checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{for(const c of clients)c.close();server?.kill();});
