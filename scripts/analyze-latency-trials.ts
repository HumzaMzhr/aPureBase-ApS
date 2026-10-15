import {readFile,writeFile} from 'node:fs/promises';
/** Approximate signal onset only; this does not rate pronunciation or human perception. */
const rows=[];
for(const variant of ['final','isabella-fast','realtime-direct'])for(const language of ['en','da']){
 try{
  const r=JSON.parse(await readFile(`benchmarks/stage17-${variant}-${language}.json`,'utf8'));
  if(r.error)continue;
  const wav=await readFile(`benchmarks/stage17-audio/${language==='en'?'danish':'english'}-${variant}-rendered.wav`);
  const deliveryComplete=variant==='realtime-direct'?null:(r.deliveryComplete??(r.sourceWords===r.translatedSourceWords&&r.sourceWords===r.spokenSourceWords));
  const wholeSourceStart=r.sourceStart??r.sourceOnset??Math.min(...r.snapshot.lanes[language].units.map((u:{timing:{source_start:number}})=>u.timing.source_start));const rendererInitialLag=r.firstTargetAudio-wholeSourceStart;
  const pcm=wav.subarray(44);let first:number|undefined,last:number|undefined,voicedMs=0;
  for(let at=0;at+960<=pcm.length;at+=960){let energy=0;for(let i=at;i<at+960;i+=2)energy+=(pcm.readInt16LE(i)/32768)**2;if(Math.sqrt(energy/480)>=.005){first??=at/48;last=(at+960)/48;voicedMs+=20;}}
  rows.push({variant,language,deliveryComplete,rendererInitialLagMs:rendererInitialLag,reportedInitialLagMs:r.initialLagMs,estimatedFirstSpeechLagMs:first===undefined?null:rendererInitialLag+first,firstNonSilentWithinTargetMs:first,lastNonSilentWithinTargetMs:last,renderedTargetDurationMs:pcm.length/48,voicedWindowMs:voicedMs,estimatedSpeechEndAfterSourceMs:last===undefined?null:r.firstTargetAudio+last-r.sourceFinish,transportUnderruns:r.transportUnderruns,schedulingOverlaps:r.schedulingOverlaps,continuousLag:r.continuousLag??null});
 }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
}
const result={method:'Offline mono PCM24k signal analysis of actual rendered WAV including scheduled gaps; first/last complete 20ms window with RMS>=0.005. Approximate onset/ending, not acoustic headphone timing or native quality. Earlier initialLagMs reports renderer start, which can include provider leading silence.',rows};
await writeFile('benchmarks/stage17-latency-comparison.json',JSON.stringify(result,null,2));console.info(JSON.stringify(result,null,2));
