// Runs the exact HTML evaluation worker without a browser or third-party packages.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{Worker}=require('node:worker_threads');
const args=process.argv.slice(2),get=(name,fallback)=>{const index=args.indexOf('--'+name);return index>=0?args[index+1]:fallback;};
if(args.includes('--help')){console.log('node tools/evaluate-ai.cjs --blocks 40 --players 3 --size both --opponent baseline --seed TBG-2026-10-06 --out reports/comparison.json\nOptional: --phase holdout --difficulty normal; --request exported-report.json reruns its configuration and position.');process.exit(0);}
const file=get('html',fs.existsSync('touhou_board_game_github_textures.html')?'touhou_board_game_github_textures.html':path.join(__dirname,'..','touhou_board_game_github_textures.html'));
const html=fs.readFileSync(file,'utf8'),js=html.split('<script>')[1].split('</script>')[0],start=js.indexOf('/* AI evaluation engine start */'),end=js.indexOf('\n/* AI evaluation engine end */',start);
const builder={};vm.createContext(builder);vm.runInContext(js.slice(start,end),builder);
const source=builder.buildAIEvaluationWorkerSource(js),bootstrap="const {parentPort}=require('node:worker_threads');const self={postMessage:message=>parentPort.postMessage(message)};parentPort.on('message',data=>self.onmessage({data}));\n";
const requestFile=get('request',null),request=requestFile?JSON.parse(fs.readFileSync(requestFile,'utf8')):{type:'comparison',config:{blocks:Number(get('blocks',40)),players:Number(get('players',3)),size:get('size','both'),opponent:get('opponent','baseline'),seed:get('seed','TBG-2026-10-06'),phase:get('phase','development'),difficulty:get('difficulty','hard')}};
const worker=new Worker(bootstrap+source,{eval:true});let lastProgress=0;
worker.on('message',message=>{
 if(message.type==='progress' && Date.now()-lastProgress>5000){lastProgress=Date.now();console.error(`Progress ${message.completed}/${message.total}`);}
 if(message.type==='complete'){
  const output=get('out','tbg-ai-evaluation.json');fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(message.report,null,2));
  console.log(JSON.stringify({output,summary:message.report.summary},null,2));worker.terminate();
 }else if(message.type==='error'){console.error(message.message);process.exitCode=1;worker.terminate();}
});
worker.on('error',error=>{console.error(error);process.exitCode=1;});
process.on('SIGINT',()=>{worker.terminate();process.exitCode=130;});worker.postMessage(request);
