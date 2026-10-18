import {readFile,writeFile} from 'node:fs/promises';
import reference from '../tests/fixtures/stage195-reference.json';
/** Offline scoring only: normalized punctuation/case/apostrophes, never corrects ASR. */
export const tokens=(s:string)=>s.normalize('NFKC').replace(/[‘’]/g,"'").toLowerCase().match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu)??[];
export function align(reference:string,hypothesis:{unitId:string;text:string}[]){
 const a=tokens(reference),b=hypothesis.flatMap(u=>tokens(u.text).map(text=>({text,unitId:u.unitId}))),dp=Array.from({length:a.length+1},()=>new Array<number>(b.length+1).fill(0));
 for(let i=0;i<=a.length;i++)dp[i][0]=i;for(let j=0;j<=b.length;j++)dp[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1].text?0:1));
 let i=a.length,j=b.length;const edits:{operation:string;reference:string|null;observed:string|null;unitId:string|null}[]=[];
 while(i||j){if(i&&j&&dp[i][j]===dp[i-1][j-1]+(a[i-1]===b[j-1].text?0:1)){edits.push({operation:a[i-1]===b[j-1].text?'correct':'substitution',reference:a[--i],observed:b[--j].text,unitId:b[j].unitId});}else if(i&&dp[i][j]===dp[i-1][j]+1){edits.push({operation:'deletion',reference:a[--i],observed:null,unitId:b[j]?.unitId??b[j-1]?.unitId??null});}else{edits.push({operation:'insertion',reference:null,observed:b[--j].text,unitId:b[j].unitId});}}
 edits.reverse();const counts={substitutions:edits.filter(e=>e.operation==='substitution').length,deletions:edits.filter(e=>e.operation==='deletion').length,insertions:edits.filter(e=>e.operation==='insertion').length};return{referenceWords:a.length,observedWords:b.length,...counts,WER:(counts.substitutions+counts.deletions+counts.insertions)/a.length,edits,perUnit:hypothesis.map(u=>({unitId:u.unitId,observed:u.text,alignedReference:edits.filter(e=>e.unitId===u.unitId&&e.reference!==null).map(e=>e.reference).join(' '),edits:edits.filter(e=>e.unitId===u.unitId&&e.operation!=='correct')}))};
}
if(process.argv[1]?.endsWith('score-stage195-asr.ts')){
 const path=process.argv[2]??'benchmarks/stage195-physical-audit.json',audit=JSON.parse(await readFile(path,'utf8'));
 const intended=audit.units.filter((u:{unitId:string})=>u.unitId!=='en-43-0-10');
 const result={sessionId:reference.sessionId,method:'Global Levenshtein word alignment of user-supplied intended passage. Case, punctuation, curly apostrophe normalization only; no semantic/campaign/name correction. Deletion assignment at an ASR item boundary can be ambiguous.',rawProvider:align(reference.text,intended.map((u:{unitId:string;providerFinalASR:string})=>({unitId:u.unitId,text:u.providerFinalASR}))),committed:align(reference.text,intended.map((u:{unitId:string;source:string})=>({unitId:u.unitId,text:u.source}))),falseRecognition:audit.falseFinal,excludedFromWER:'en-43-0-10',warning:'These are recorded transcript scores. Replaying the same transcript through timing fixes cannot improve ASR WER. No source waveform is available to re-recognize offline.'};
 audit.ASR.wordErrorRate={raw:result.rawProvider.WER,committed:result.committed.WER,referenceWords:result.rawProvider.referenceWords,scope:result.method};audit.ASR.reference='Exact user-supplied reference in tests/fixtures/stage195-reference.json; offline only.';
 for(const u of audit.units){u.offlineReferenceComparison=result.rawProvider.perUnit.find(p=>p.unitId===u.unitId)??{excluded:'Spurious post-passage recognition, analyzed separately'};}
 await writeFile(path,JSON.stringify(audit,null,2)+'\n');await writeFile('benchmarks/stage195-asr-score.json',JSON.stringify(result,null,2)+'\n');console.info(JSON.stringify({referenceWords:result.rawProvider.referenceWords,raw:{...result.rawProvider,edits:undefined,perUnit:undefined},committed:{...result.committed,edits:undefined,perUnit:undefined},unitsWithRawEdits:result.rawProvider.perUnit.filter(u=>u.edits.length).length},null,2));
}
