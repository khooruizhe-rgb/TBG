import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL((await readFile(new URL('./multiplayer-server.mjs',import.meta.url)).then(()=>true,()=>false))?'./':'../',import.meta.url);
let base=process.env.TEST_SERVER,server;
if(!base){
 server=spawn(process.execPath,[fileURLToPath(new URL('multiplayer-server.mjs',root))],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
 base=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{server.kill();reject(Error('Server did not start'));},4000);
  server.on('error',reject);server.stdout.on('data',chunk=>{const match=chunk.toString().match(/localhost:(\d+)/);if(match){clearTimeout(timer);resolve('http://127.0.0.1:'+match[1]);}});
 });
}
const streams=[];let checks=0;
function passed(name){checks++;console.log('PASS '+name);}
async function post(path,body){const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return [r.status,await r.json()];}
function subscribe(code,token){
 const events=[],controller=new AbortController();let buffer='';const decoder=new TextDecoder();
 const stream={events,close:()=>controller.abort(),async next(match){const deadline=Date.now()+4000;
  while(Date.now()<deadline){const i=events.findIndex(match);if(i>=0)return events.splice(i,1)[0];await new Promise(r=>setTimeout(r,20));}throw Error('Timed out waiting for room event');}};
 streams.push(stream);void fetch(`${base}/api/events?code=${code}&token=${token}`,{signal:controller.signal}).then(async response=>{
  assert.equal(response.status,200);const reader=response.body.getReader();for(;;){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});
   let end;while((end=buffer.indexOf('\n\n'))>=0){const chunk=buffer.slice(0,end);buffer=buffer.slice(end+2);if(chunk.startsWith('data: '))events.push(JSON.parse(chunk.slice(6)));}}
 }).catch(error=>{if(!controller.signal.aborted)events.push({type:'stream-error',message:error.message});});return stream;
}
const credentials=p=>({code:p.code,token:p.token});const send=(p,message,to=null)=>post('/api/send',{...credentials(p),message,to});
try{
 const html=await (await fetch(base+'/game')).text();assert.equal(html,await readFile(new URL('touhou_board_game_github_textures.html',root),'utf8'));
 assert(html.includes('id="online-open"'));assert.equal((await(await fetch(base+'/api/info')).json()).protocol,2);passed('Server serves the current textured game and protocol');
 assert.equal((await post('/api/create',{capacity:1}))[0],400);assert.equal((await post('/api/create',{capacity:3,protocol:1}))[0],409);assert.equal((await post('/api/join',{code:'000000'}))[0],404);passed('Invalid capacity, old client protocol and unknown room are rejected');
 const [status,host]=await post('/api/create',{capacity:4,name:'<主人>',protocol:2});assert.equal(status,200);assert.match(host.code,/^\d{6}$/);assert.equal(host.players[0].name,'主人');assert(!JSON.stringify(host.players).includes(host.token));
 const hs=subscribe(host.code,host.token);await hs.next(e=>e.type==='room');assert.equal((await post('/api/start',credentials(host)))[0],409);
 const [,a]=await post('/api/join',{code:host.code,name:'甲',protocol:2});const [,b]=await post('/api/join',{code:host.code,name:'乙',protocol:2});
 const as=subscribe(a.code,a.token),bs=subscribe(b.code,b.token);await as.next(e=>e.type==='room');await bs.next(e=>e.type==='room');assert.equal(a.seat,1);assert.equal(b.seat,2);
 assert.equal((await post('/api/add-ai',credentials(a)))[0],403);assert.equal((await post('/api/add-ai',{code:host.code,token:null}))[0],403);
 const [added,room]=await post('/api/add-ai',credentials(host));assert.equal(added,200);assert(room.players[3].isAI);assert(room.players[3].connected);
 assert.equal((await post('/api/start',credentials(a)))[0],403);await hs.next(e=>e.type==='room'&&e.room.players.length===4&&e.room.players.every(p=>p.connected));assert.equal((await post('/api/start',credentials(host)))[0],200);await as.next(e=>e.type==='room'&&e.room.started);assert.equal((await post('/api/join',{code:host.code,name:'late'}))[0],409);passed('Six-digit room supports three humans and one AI with creator-only start');
 const state={protocol:2,matchId:'match-1',size:4,players:room.players.map(p=>({idx:p.seat,name:p.name,hand:p.seat===1?['sage_yukari']:['__hidden_card'],discard:[]})),board:Array.from({length:4},()=>Array(4).fill(null))};
 assert.equal((await send(host,{kind:'state',state}))[0],400);assert.equal((await send(host,{kind:'state',state},a.seat))[0],200);const own=await as.next(e=>e.type==='message'&&e.message.kind==='state');assert.equal(own.message.state.players[1].hand[0],'sage_yukari');
 const stateB={...state,players:state.players.map(p=>({...p,hand:p.idx===2?['marisa']:['__hidden_card']}))};await send(host,{kind:'state',state:stateB},b.seat);const second=await bs.next(e=>e.type==='message'&&e.message.kind==='state');assert(!JSON.stringify(second.message).includes('sage_yukari'));assert.equal((await send(a,{kind:'state',state},b.seat))[0],403);passed('States require an explicit recipient; guests receive separate private hands');
 const choice={kind:'choice',matchId:'match-1',id:1,method:'pickOwnHandCards',args:['Cost II',['sage_yukari','marisa'],{minCount:2,maxCount:2}]};await send(host,choice,a.seat);await as.next(e=>e.type==='message'&&e.message.kind==='choice');assert(!bs.events.some(e=>e.message?.kind==='choice'));
 as.close();const rejoined=subscribe(a.code,a.token);const cached=await rejoined.next(e=>e.message?.kind==='state');assert.equal(cached.message.state.players[1].hand[0],'sage_yukari');await rejoined.next(e=>e.message?.kind==='choice'&&e.message.id===1);
 await send(a,{kind:'choice-response',matchId:'match-1',id:1,value:['sage_yukari','marisa']});const reply=await hs.next(e=>e.message?.kind==='choice-response');assert.equal(reply.from,1);await send(host,{kind:'choice-clear',id:1,matchId:'match-1'},a.seat);await rejoined.next(e=>e.message?.kind==='choice-clear');passed('Private multi-card choices and reconnect replay reach only the intended seat');
 await send(a,{kind:'action',matchId:'match-1',turnId:6,type:'trade',cardId:'marisa',target:{r:7,c:1}},b.seat);const routed=await hs.next(e=>e.message?.kind==='action');assert.equal(routed.from,1);assert.equal(routed.message.type,'trade');assert(!bs.events.some(e=>e.message?.kind==='action'));await send(a,{kind:'ready'});assert.equal((await hs.next(e=>e.message?.kind==='ready')).from,1);passed('Guest actions and reconnect requests route to the creator with authenticated seat identity');
 assert.equal((await post('/api/leave',credentials(a)))[0],200);const left=await hs.next(e=>e.type==='room'&&e.room.players[1]?.isAI);assert(left.room.players[1].connected);assert.equal((await send(a,{kind:'ready'}))[0],403);passed('Leaving guest becomes an AI without changing other seat identities');
 assert.equal((await post('/api/leave',credentials(host)))[0],200);await bs.next(e=>e.type==='closed');assert.equal((await post('/api/join',{code:host.code,name:'late'}))[0],404);passed('Creator leaving closes the room for all remaining players');
 const [,solo]=await post('/api/create',{capacity:2,name:'Solo'});const ss=subscribe(solo.code,solo.token);await ss.next(e=>e.type==='room');await post('/api/add-ai',credentials(solo));const [,replace]=await post('/api/join',{code:solo.code,name:'New human'});assert.equal(replace.seat,1);assert(!replace.players[1].isAI);assert.equal((await post('/api/start',credentials(solo)))[0],409);const rs=subscribe(replace.code,replace.token);await rs.next(e=>e.type==='room');await ss.next(e=>e.type==='room'&&e.room.players.every(p=>p.connected));assert.equal((await post('/api/start',credentials(solo)))[0],200);await post('/api/leave',credentials(solo));passed('Human can replace an AI before start and must connect before the creator starts');
 console.log(`${checks}/${checks} multiplayer HTTP/SSE checks passed`);
}finally{for(const stream of streams)stream.close();server?.kill();}
