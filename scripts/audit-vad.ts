import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const fixtures=JSON.parse(await readFile('benchmarks/audio/fixtures.json','utf8')) as Record<string,{file:string;text:string}>;
for(const id of ['clinic-greeting','clinic-information','clinic-request','clinic-ask-doctor','clinic-callback','clinic-connect','hcp-information','hcp-agreement'])fixtures[`danish-${id}`]={file:`../../public/audio/${id}.wav`,text:'Existing controlled Danish clinic source'};
const rows: {id:string;longestInteriorSilenceMs:number;speechEndMs:number;durationMs:number}[]=[];
for(const [id,item] of Object.entries(fixtures)){
  const input=`benchmarks/audio/${item.file}`;const output=`benchmarks/audio/${id}-analysis.wav`;
  const result=spawnSync('/usr/bin/afconvert',['-f','WAVE','-d','LEI16@24000',input,output],{stdio:'ignore'});if(result.status!==0)throw new Error(`Audio decode failed: ${id}`);
  const wav=await readFile(output);let at=12;let pcm:Buffer|undefined;let channels=1;let rate=24000;
  while(at+8<=wav.length){const tag=wav.toString('ascii',at,at+4),size=wav.readUInt32LE(at+4);if(tag==='fmt '){channels=wav.readUInt16LE(at+10);rate=wav.readUInt32LE(at+12);}if(tag==='data')pcm=wav.subarray(at+8,at+8+size);at+=8+size+(size%2);}
  if(!pcm)throw new Error('Missing PCM');const frame=Math.round(rate*.03)*channels;const active:number[]=[];
  for(let offset=0;offset+frame*2<=pcm.length;offset+=frame*2){let energy=0;for(let n=0;n<frame;n++)energy+=(pcm.readInt16LE(offset+n*2)/32768)**2;if(Math.sqrt(energy/frame)>=.018)active.push(offset/(2*channels*rate)*1000);}
  const gaps=active.slice(1).map((time,n)=>time-active[n]-30);rows.push({id,longestInteriorSilenceMs:Math.round(Math.max(0,...gaps)),speechEndMs:Math.round(active.at(-1)??0),durationMs:Math.round(pcm.length/(2*channels*rate)*1000)});
}
const thresholds=[350,450,550,650].map(threshold=>({threshold,falseCutCases:rows.filter(row=>row.longestInteriorSilenceMs>=threshold).map(row=>row.id)}));
const selected={englishMs:450,danishMs:1350,englishFalseCutCases:rows.filter(r=>!r.id.startsWith('danish-')&&r.longestInteriorSilenceMs>=450).map(r=>r.id),danishFalseCutCases:rows.filter(r=>r.id.startsWith('danish-')&&r.longestInteriorSilenceMs>=1350).map(r=>r.id),margin:'Danish longest pause 1260ms plus a two-sample (60ms) timer margin; rounded up in 50ms increments gives 1350ms.'};
const report={selected,source:'Synthetic controlled fixtures, offline RMS audit. Not human/native VAD acceptance.',rows,thresholds};await writeFile('benchmarks/vad-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
