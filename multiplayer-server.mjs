import http from 'node:http';
import {randomBytes, randomInt} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const gameFile = join(dirname(fileURLToPath(import.meta.url)), 'touhou_board_game_github_textures.html');
const port = Number(process.env.PORT || 8787);
const rooms = new Map();
const MAX_BODY = 256 * 1024;
const PROTOCOL = 2;

function json(res, status, value){
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'});
  res.end(JSON.stringify(value));
}
function publicRoom(room){
  return {protocol:PROTOCOL,code:room.code, capacity:room.capacity, started:room.started,
    players:room.players.map(p=>({seat:p.seat,name:p.name,isAI:!!p.isAI,connected:p.isAI||!!p.stream}))};
}
function emit(player, message){
  if(player.stream && !player.stream.destroyed && !player.stream.writableEnded) player.stream.write(`data: ${JSON.stringify(message)}\n\n`);
}
function broadcast(room, message){ for(const p of room.players) emit(p,message); }
function status(room){ broadcast(room,{type:'room',room:publicRoom(room)}); }
function auth(body){
  const room=rooms.get(String(body.code||''));
  const player=room?.players.find(p=>p.token && p.token===body.token);
  return {room,player};
}
function nameOf(value){ return String(value||'Player').replace(/[<>&"'`]/g,'').trim().slice(0,24) || 'Player'; }
async function readBody(req){
  let raw='';
  for await(const chunk of req){
    raw+=chunk;
    if(raw.length>MAX_BODY) throw Error('Message too large');
  }
  return JSON.parse(raw||'{}');
}
function cleanup(){
  const cutoff=Date.now()-12*60*60*1000;
  for(const [code,room] of rooms) if(room.touched<cutoff) {
    for(const p of room.players) p.stream?.end();
    rooms.delete(code);
  }
}
setInterval(cleanup, 15*60*1000).unref();

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    if(req.method==='GET' && url.pathname==='/api/info')return json(res,200,{protocol:PROTOCOL,game:'TBG'});
    if(req.method==='GET' && (url.pathname==='/' || url.pathname==='/game')){
      const html=await readFile(gameFile);
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
      res.end(html); return;
    }
    if(req.method==='GET' && url.pathname==='/api/events'){
      const {room,player}=auth(Object.fromEntries(url.searchParams));
      if(!player) return json(res,403,{error:'Room or session expired'});
      room.touched=Date.now();
      res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8',
        'Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
      if(player.stream && player.stream!==res) player.stream.end();
      player.stream=res;
      emit(player,{type:'room',room:publicRoom(room)});
      const state=room.states.get(player.seat),choice=room.choices.get(player.seat);
      if(state)emit(player,{type:'message',from:0,message:{kind:'state',state}});
      if(choice)emit(player,{type:'message',from:0,message:choice});
      status(room);
      const heartbeat=setInterval(()=>{if(!res.destroyed) res.write(': heartbeat\n\n');},20000);
      req.on('close',()=>{
        clearInterval(heartbeat);
        if(player.stream===res){player.stream=null;status(room);}
      });
      return;
    }
    if(req.method!=='POST' || !url.pathname.startsWith('/api/')) return json(res,404,{error:'Not found'});
    const body=await readBody(req);
    if(body.protocol!=null && body.protocol!==PROTOCOL)return json(res,409,{error:'Please reload the game from this server.'});
    if(url.pathname==='/api/create'){
      if(rooms.size>=1000) return json(res,503,{error:'Room limit reached'});
      const capacity=Number(body.capacity);
      if(!Number.isInteger(capacity) || capacity<2 || capacity>4) return json(res,400,{error:'Choose 2–4 players'});
      let code;
      do{code=String(randomInt(100000,1000000));}while(rooms.has(code));
      const token=randomBytes(24).toString('hex');
      const room={code,capacity,started:false,players:[{seat:0,name:nameOf(body.name),token,stream:null,isAI:false}],states:new Map(),choices:new Map(),touched:Date.now()};
      rooms.set(code,room);
      return json(res,200,{...publicRoom(room),token,seat:0});
    }
    if(url.pathname==='/api/join'){
      const room=rooms.get(String(body.code||''));
      if(!room) return json(res,404,{error:'Room not found'});
      if(room.started) return json(res,409,{error:'Room has already started'});
      const replacement=room.players.findIndex(p=>p.isAI);
      if(room.players.length>=room.capacity && replacement<0) return json(res,409,{error:'Room is full'});
      const token=randomBytes(24).toString('hex');
      const seat=room.players.length<room.capacity ? room.players.length : replacement;
      const newcomer={seat,name:nameOf(body.name),token,stream:null,isAI:false};
      if(seat===room.players.length) room.players.push(newcomer);
      else room.players[seat]=newcomer;
      room.touched=Date.now();
      status(room);
      return json(res,200,{...publicRoom(room),token,seat});
    }
    const {room,player}=auth(body);
    if(!player) return json(res,403,{error:'Room or session expired'});
    room.touched=Date.now();
    if(url.pathname==='/api/leave'){
      if(player.seat===0){
        broadcast(room,{type:'closed'});for(const p of room.players)p.stream?.end();rooms.delete(room.code);
      }else{
        player.stream?.end();player.stream=null;player.token=null;player.isAI=true;player.name=`AI ${player.seat}`;
        room.states.delete(player.seat);room.choices.delete(player.seat);status(room);
      }
      return json(res,200,{ok:true});
    }
    if(url.pathname==='/api/add-ai'){
      if(player.seat!==0 || room.started) return json(res,403,{error:'Only the creator can add AI before the game starts'});
      if(room.players.length>=room.capacity) return json(res,409,{error:'All seats are filled; a joining human can replace an AI seat'});
      const seat=room.players.length;
      room.players.push({seat,name:`AI ${seat}`,isAI:true,token:null,stream:null});
      status(room);
      return json(res,200,publicRoom(room));
    }
    if(url.pathname==='/api/start'){
      if(player.seat!==0 || room.started) return json(res,403,{error:'Only the creator can start'});
      if(room.players.length!==room.capacity || room.players.some(p=>!p.isAI && !p.stream)) return json(res,409,{error:'Wait until every seat is filled and every human is connected'});
      room.started=true; status(room);
      return json(res,200,{ok:true});
    }
    if(url.pathname==='/api/send'){
      if(!room.started || !body.message || typeof body.message!=='object') return json(res,409,{error:'Game has not started'});
      const msg=body.message;
      if(player.seat===0){
        if(!['state','choice','choice-clear','effect','error'].includes(msg.kind)) return json(res,403,{error:'Unknown creator message'});
        const to=Number(body.to),other=room.players.find(p=>p.seat===to && !p.isAI && p.seat!==0);
        if(!Number.isInteger(body.to)||!other)return json(res,400,{error:'Choose a connected human recipient'});
        if(msg.kind==='state'){
          if(msg.state?.protocol!==PROTOCOL || ![4,5].includes(msg.state.size) || msg.state.players?.length!==room.capacity)return json(res,400,{error:'Invalid game state'});
          if(room.states.get(to)?.matchId!==msg.state.matchId)room.choices.delete(to);
          room.states.set(to,msg.state);
        }
        if(msg.kind==='choice')room.choices.set(to,msg);
        if(msg.kind==='choice-clear' && room.choices.get(to)?.id===msg.id)room.choices.delete(to);
        emit(other,{type:'message',from:0,message:msg});
      } else {
        if(!['action','choice-response','ready'].includes(msg.kind)) return json(res,403,{error:'Unknown player message'});
        if(!room.players[0].stream)return json(res,503,{error:'The creator is reconnecting. Try again shortly.'});
        emit(room.players[0],{type:'message',from:player.seat,message:msg});
      }
      return json(res,200,{ok:true});
    }
    return json(res,404,{error:'Not found'});
  }catch(error){ json(res,400,{error:error.message||'Invalid request'}); }
});

server.listen(port,'0.0.0.0',()=>{
  console.log(`Touhou multiplayer ready on http://localhost:${server.address().port}`);
  console.log('Other computers on your network can use this computer\'s LAN IP and the same port.');
});
