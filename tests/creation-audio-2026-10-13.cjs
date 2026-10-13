// Test the actual print-audio owner with a controlled HTMLAudioElement fixture.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'touhou_board_game_github_textures.html'),'utf8'),clips=[];
let nextPlayback=()=>Promise.resolve(),toggle;const screenClasses=new Set();
class Clip{
  constructor(src){this.src=src;this.events={};this.pauses=0;this.currentTime=0;clips.push(this);}
  addEventListener(type,fn){this.events[type]=fn;}
  play(){this.plays=(this.plays||0)+1;return nextPlayback();}
  pause(){this.pauses++;}
}
const ctx=vm.createContext({Audio:Clip,document:{documentElement:{classList:{toggle:(name,on)=>on?screenClasses.add(name):screenClasses.delete(name)}},getElementById:()=>({addEventListener:(_type,fn)=>toggle=fn})},getGameAudio(){},updateSoundToggle(){}});
const part=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
vm.runInContext('var sfxEnabled=true,game={fastAITest:false},gameAudioBus=null;'+part('const CREATION_PRINT_SOUND=','const DRAW_SOUND_INTERVAL_MS')+
  part("document.getElementById('sound-toggle').addEventListener",'const DEFAULT_CROWN_LIGHT')+
  part('function playGameCue(','function updateSoundToggle(')+part('let timeStopDepth=0;','const yukariArrivalUntil=')+
  'this.api={cue:playGameCue,time:showTimeStop,characters:()=>characterAbilitySounds.size,cancel:v=>game.cancelled=v,play:playCreationPrintSound,stop:stopCreationPrintSound,active:()=>cancelCreationPrintSound,setFast:v=>game.fastAITest=v,setEnabled:v=>sfxEnabled=v};',ctx);
const A=ctx.api,checks=[],test=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
(async()=>{
  await test('The audio asset is the provided MP3 and the game references its GitHub URL',()=>{
    const bytes=fs.readFileSync(path.join(root,'audio/creation_print.mp3'));
    const upload=path.resolve(root,'../../upload/freesound_community-082499_thermal-receipt-print-amp-cut-48054.mp3');
    if(fs.existsSync(upload))assert.deepEqual(bytes,fs.readFileSync(upload));
    assert.equal(bytes.length,50991);assert.match(html,/https:\/\/raw\.githubusercontent\.com\/khooruizhe-rgb\/TBG\/main\/audio\/creation_print\.mp3/);
    assert(!part('const CREATION_PRINT_SOUND=','const DRAW_SOUND_INTERVAL_MS').includes('data:audio'));
  });
  await test('Printing starts one sound with the configured volume',()=>{A.play();assert.equal(clips.length,1);assert.equal(clips[0].plays,1);assert.equal(clips[0].volume,.65);assert.match(clips[0].src,/creation_print\.mp3$/);});
  await test('A new creation stops the old sound without overlapping it',()=>{A.play();assert.equal(clips[0].pauses,1);assert.equal(clips[1].plays,1);});
  await test('Natural completion releases the audio owner',()=>{clips[1].events.ended();assert.equal(A.active(),null);});
  await test('Muting stops playback and muted creation does not start a new clip',()=>{A.play();toggle();const n=clips.length;assert.equal(A.active(),null);A.play();assert.equal(clips.length,n);toggle();});
  await test('Fast AI tests create no print audio',()=>{A.setFast(true);const n=clips.length;A.play();assert.equal(clips.length,n);A.setFast(false);});
  await test('Stopping after a cancelled choice rewinds and releases the clip',()=>{const stop=A.play(),clip=clips.at(-1);clip.currentTime=.8;stop();assert.equal(clip.currentTime,0);assert.equal(A.active(),null);});
  await test('An older cancellation cannot stop the next creation sound',()=>{const oldStop=A.play();A.play();const clip=clips.at(-1);oldStop();assert.equal(clip.pauses,0);assert(A.active());A.stop();});
  await test('A rejected play request cannot interrupt creation',async()=>{nextPlayback=()=>Promise.reject(new Error('Autoplay blocked'));A.play();await new Promise(setImmediate);assert.equal(A.active(),null);nextPlayback=()=>Promise.resolve();});
  await test('A late playback promise is stopped after a reset',async()=>{let start;nextPlayback=()=>new Promise(resolve=>start=resolve);A.play();const clip=clips.at(-1);A.stop();start();await new Promise(setImmediate);assert(clip.pauses>=2);assert.equal(A.active(),null);nextPlayback=()=>Promise.resolve();});
  await test('Network failure releases the clip and resets stop audio even when the choice has finished',()=>{A.play();clips.at(-1).events.error();assert.equal(A.active(),null);assert.match(html,/if\(typeof stopCreationPrintSound==='function'\)stopCreationPrintSound\(\);/);});
  await test('Sound 1 and Sound 2 preserve both user-uploaded files byte for byte',()=>{
    for(const [name,upload,size]of [['yukari_static.mp3','u_xg7ssi08yr-static-noise-437703.mp3',101982],['sakuya_zawarudo.wav','zaowlrd.wav',245592]]){
      const bytes=fs.readFileSync(path.join(root,'audio',name));assert.equal(bytes.length,size);
      const provided=path.resolve(root,'../../upload',upload);if(fs.existsSync(provided))assert.deepEqual(bytes,fs.readFileSync(provided));
    }
  });
  await test('The actual Yukari cue uses Sound 1 and the Sakuya start cue uses Sound 2',()=>{
    A.cue('yukari');assert.match(clips.at(-1).src,/yukari_static\.mp3$/);
    A.cue('sakuya-start');assert.match(clips.at(-1).src,/sakuya_zawarudo\.wav$/);assert.equal(A.characters(),2);
  });
  await test('Repeated character effects stop their own older sound and natural completion releases it',()=>{
    const old=clips.at(-1);A.cue('sakuya-start');assert.equal(old.pauses,1);clips.at(-1).events.ended();assert.equal(A.characters(),1);
  });
  await test('Muting stops character sounds as well as printing and prevents new sounds',()=>{
    toggle();assert.equal(A.characters(),0);const n=clips.length;A.cue('yukari');A.cue('sakuya-start');assert.equal(clips.length,n);toggle();
  });
  await test('Fast tests and cancelled games suppress both character sounds',()=>{
    A.setFast(true);let n=clips.length;A.cue('yukari');A.cue('sakuya-start');assert.equal(clips.length,n);A.setFast(false);
    A.cancel(true);A.cue('yukari');assert.equal(clips.length,n);A.cancel(false);
  });
  await test('A rejected or failed character clip cannot block the ability or leave a retained owner',async()=>{
    nextPlayback=()=>Promise.reject(Error('blocked'));A.cue('yukari');await new Promise(setImmediate);assert.equal(A.characters(),0);nextPlayback=()=>Promise.resolve();
    A.cue('sakuya-start');clips.at(-1).events.error();assert.equal(A.characters(),0);
  });
  await test('Nested Sakuya time stops start Sound 2 once and resume only after the final stop ends',()=>{
    const n=clips.length;A.time(true);A.time(true);assert.equal(clips.length,n+1);assert(screenClasses.has('time-stopped'));
    A.time(false);assert(screenClasses.has('time-stopped'));A.time(false);assert(!screenClasses.has('time-stopped'));
  });
  await test('The grayscale enters and exits through a persistent 140ms transition, with reduced-motion support',()=>{
    const base=part('  html::after{','  html.time-stopped::after{'),stopped=part('  html.time-stopped::after{','  .board-card.eirin-muted');
    assert.match(base,/grayscale\(0\)/);assert.match(base,/transition:backdrop-filter \.14s linear/);assert.match(stopped,/grayscale\(1\)/);
    assert.match(stopped,/prefers-reduced-motion:reduce/);assert.match(html,/if\(typeof stopCharacterAbilitySounds==='function'\)stopCharacterAbilitySounds\(\);/);
  });
  const asset=fs.readFileSync(path.join(root,'audio/creation_print.mp3'));
  fs.writeFileSync(path.join(root,'tests/creation-audio-2026-10-13-results.json'),JSON.stringify({status:'pass',count:checks.length,checks,assetBytes:asset.length,assetSha256:crypto.createHash('sha256').update(asset).digest('hex'),scope:'Printing/character audio lifecycle, original asset bytes and time-stop transition fixtures; browser audibility not verified'},null,2)+'\n');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
