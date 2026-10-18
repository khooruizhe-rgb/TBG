// Follow the real claim and story presentation paths for character-colored Sage stars.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/touhou_board_game_github_textures.html','utf8'),css=html.split('<style>')[1].split('</style>')[0],fixture=fs.readFileSync(__dirname+'/story-opening-chapters-2026-10-15.cjs','utf8'),marker='vm.runInContext(`(async()=>{',box={module:{exports:{}},require,__dirname,console,setTimeout,clearTimeout};
vm.runInNewContext(fixture.slice(0,fixture.indexOf(marker))+'\nmodule.exports={ctx,storage};',box);const {ctx,storage}=box.module.exports;ctx.testStorage=storage;ctx.css=css;
const result=vm.runInContext(`(()=>{
 const checks=[],ok=(value,name)=>{assert(value,name);checks.push(name);};
 function make(chapter=8){evalResetTokens();evalSetSeed(88);SIZE=4;game=new Game(2,{},null,{aiOnly:true,fastTest:true});configureStoryMatch(game,chapter);return game;}
 function arrange(board,discards=[[],[]]){
  game.players.forEach((p,i)=>{p.hand=[];p.discard=discards[i].slice();});game.board=Array.from({length:4},()=>Array(4).fill(null));game.wasteland=game.board.map(row=>row.map(()=>false));
  for(const[r,c,id]of board)game.setCardAt(r,c,id);
  const used=[...board.map(at=>at[2]),...discards.flat(),...game.shopCards.filter(Boolean)];assert.equal(used.length,new Set(used).size);
  game.drawPile=CARDS.filter(card=>!card.token&&!card.shopkeeper&&!card.shopExpansion&&!used.includes(card.id)).map(card=>card.id);game.startingCardIds=new Set([...used,...game.drawPile]);game.winner=null;evalConservation(game);
 }
 function copy(source){const id='created_card_'+(++nextCreatedCard);CARD[id]=blueprintCopy(source,id);return id;}
 for(const source of ['reimu','medicine','heaven_iku','sage_ran','sdm_patchouli','palace_rin']){
  make();const size=FACTIONS[CARD[source].faction].size,ids=[source,...Array.from({length:size-1},()=>copy(source))];arrange(ids.map((id,i)=>[Math.floor(i/2),i%2,id]));game.checkClaims(0);evalConservation(game);
  assert(game.storyMatch.progress.sameCardFaction);assert.equal(game.players[0].discard.length,size);
  ok(true,'An actual '+size+'-card single-prototype '+CARD[source].faction+' faction claim satisfies the objective');
 }
 make();const copies=Array.from({length:4},()=>copy('sage_ran'));arrange(copies.map((id,i)=>[Math.floor(i/2),i%2,id]));game.checkClaims(1);evalConservation(game);
 ok(!game.storyMatch.progress.sameCardFaction,'Four matching copies claimed by the opponent do not satisfy the player objective');
 make();const clone=copy('sdm_patchouli');arrange([[0,0,'sdm_patchouli'],[0,1,clone]]);game.checkClaims(0);
 ok(!game.storyMatch.progress.sameCardFaction&&game.players[0].discard.length===0,'An incomplete four-card group never counts just because its two visible cards match');
 make();const spread=['sage_ran',copy('sage_ran'),copy('sage_ran'),copy('sage_ran')];arrange([[0,0,spread[0]],[0,3,spread[1]],[3,0,spread[2]],[3,3,spread[3]]]);game.checkClaims(0);
 ok(!game.storyMatch.progress.sameCardFaction&&game.players[0].discard.length===0,'Disconnected matching cards never count as a completed faction');
 make();arrange([[0,0,'sage_yukari'],[0,1,'sage_kasen'],[1,0,'sage_matara'],[1,1,'sage_ran']]);game.checkClaims(0);
 ok(game.storyMatch.progress.sage&&!game.storyMatch.progress.sameCardFaction,'A normal mixed-prototype Sage claim still only earns the Sage objective');
 make();game.storyMatch.skillFactions.push('hell');const same=[copy('hell_hecatia'),copy('hell_hecatia'),copy('hell_hecatia'),copy('hell_hecatia')];same.forEach(id=>game.createdActivations[id]=true);arrange(same.map((id,i)=>[Math.floor(i/2),i%2,id]));game.checkClaims(0);evalConservation(game);
 ok(!game.storyMatch.progress.sameCardFaction&&game.players[0].discard.length===0,'Hecatia’s real discard admission rule is honored before awarding a matching-four claim');
 make();const pair=copy('medicine');arrange([[0,0,'medicine'],[0,1,pair]]);game.checkClaims(0);assert(game.storyMatch.progress.sameCardFaction);game.winner=game.players[0];
 ok(storyStarGoals(game).find(goal=>goal.key==='sameCardFaction').done&&storyMatchStars(game)===1,'The unchanged objective key still awards one independent star after a matching pair and a victory');
 const palette=['#f39ac7',crownLightFor('sage_matara').main,crownLightFor('sage_yukari').main];
 ok(palette.join(',')==='#f39ac7,#e7b83f,#8f70ff'&&[0,1,2].map(i=>storyStarColor(8,i)).join(',')===palette.join(','),'Sage star positions use pink Kasen and the actual Matara and Yukari effect colors in order');
 for(let earned=0;earned<=3;earned++){
  const markup=storyStarMarkup(8,earned),colors=[...markup.matchAll(/--story-star-color:([^\"]+)/g)].map(match=>match[1]);assert.equal(colors.join(','),palette.join(','));assert.equal((markup.match(/★/g)||[]).length,earned);assert.equal((markup.match(/☆/g)||[]).length,3-earned);assert.equal((markup.match(/aria-hidden=\"true\"/g)||[]).length,3);
 }
 ok(true,'All four live star counts retain the three independent color slots, correct glyph count and hidden decorative glyphs');
 returnToMainMenu();testStorage.clear();openStoryChapter(8);game.storyMatch.progress={sage:true,sameCardFaction:true,placeTwice:true};game.winner=game.players[0];updateStoryProgress();
 let feedback=el('tutorial-feedback').innerHTML;assert(el('tutorial-feedback').classList.contains('story-perfect'));assert(palette.every(color=>feedback.includes('--story-star-color:'+color)));
 ok((feedback.match(/class=\"story-star\"/g)||[]).length===3,'A real chapter-eight perfect victory renders all three separately colored star elements');
 returnToMainMenu();openStoryMenu();let rating=el('story-levels').children[7].children[2].children[1];
 ok(rating.className.includes('story-stars-perfect')&&palette.every(color=>rating.innerHTML.includes('--story-star-color:'+color))&&rating.attributes['aria-label']==='3 / 3','The saved perfect rating preserves all three colors and an accessible count in chapter selection');
 closeStoryMenu();testStorage.clear();saveStoryStars(8,['sage']);saveStoryStars(8,['sameCardFaction']);saveStoryStars(8,['placeTwice']);openStoryMenu();rating=el('story-levels').children[7].children[2].children[1];
 ok(storyBestStars(8)===3&&!storyChapterPerfect(8)&&!rating.className.includes('story-stars-perfect'),'Collecting stars across different wins still does not turn on the single-match perfect colors');
 closeStoryMenu();openStoryChapter(8);assert(!el('tutorial-feedback').classList.contains('story-perfect'));assert.equal((el('tutorial-feedback').innerHTML.match(/★/g)||[]).length,0);
 ok(true,'A new match shows its own zero completed goals without inheriting saved perfect color');returnToMainMenu();
 for(const chapter of [2,3,4,5,6,7])assert.equal(storyStarMarkup(chapter,2),'★★☆');
 ok(storyStarColor(6)==='#d4af37'&&storyStarColor(7)===FACTIONS.palace.color,'Other chapters retain their faction colors, gold Kourindou and original compact star glyphs');
 const create=document.createElement;document.createElement=()=>{const node=create();node.values=new Map();node.style.setProperty=(key,value)=>node.values.set(key,value);return node;};
 showStoryChapterIntro(8);const cards=el('story-card-grid').children,byId=new Map(cards.map(node=>[node.dataset.cardId,node]));
 ok(cards.length===4&&['sage_kasen','sage_matara','sage_yukari'].every(id=>byId.get(id).values.get('--story-glow-color')===crownLightFor(id).main)&&byId.get('sage_ran').values.get('--story-glow-color')==='#428dff','The actual Sage introduction supplies each card’s character color to its glow and renewal scan');
 closeStoryMenu();showStoryChapterIntro(7);ok(el('story-card-grid').children.every(node=>node.values.get('--story-glow-color')===FACTIONS.palace.color),'Other introduction factions retain their own faction-colored glow and scan');closeStoryMenu();document.createElement=create;
 function declarations(selector){for(const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g))if(match[1].trim()===selector)return match[2];throw Error('Missing CSS '+selector);}
 const old=declarations('.story-ability-card>.story-old-face'),scan=declarations('.story-ability-card>.story-refresh-scan');
 ok(old.includes('storyCardRenew 1800ms')&&scan.includes('storyCardScan 1800ms')&&scan.includes('var(--story-glow-color)'),'The renewal wipe and character-colored scan stay synchronized at 1.8 seconds');
 ok(css.includes('.story-perfect .story-star,.story-stars-perfect .story-star')&&css.includes('@media(prefers-reduced-motion:reduce){.story-ability-card>.story-old-face,.story-ability-card>.story-refresh-scan{display:none;animation:none}'),'Per-star perfect colors cascade on the real glyphs and reduced-motion presentation remains available');
 return {status:'pass',count:checks.length,checks,rulesVersion:REWORK_RULES_VERSION,starColors:palette,renewalMs:1800,scope:'Real two- and four-card claims with collector, completeness, connectivity and discard-admission negatives; actual perfect/cumulative saved ratings and live coach markup; real introduction card color properties, synchronized CSS and reduced motion. Controlled DOM; no browser pixel verification.'};
})()`,ctx);
fs.writeFileSync(__dirname+'/sage-colors-claims-2026-10-18-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.count+' Sage color and matching-faction checks passed');
