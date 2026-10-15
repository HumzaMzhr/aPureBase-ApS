import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { streamTranslation } from '../server/translation';
import { summarize } from '../src/latency';
const baseline=JSON.parse(await readFile('benchmarks/baseline.json','utf8')) as {rows:{id:string;original:string;source:string}[]};
const results=[];
for(const config of [{model:'gpt-5.5',reasoning:'none',compact:true},{model:'gpt-4.1-mini',reasoning:'none',compact:true}]){
  const rows=[];
  for(const item of baseline.rows){const start=performance.now();let first:number|undefined;let text='';for await(const event of streamTranslation(item.original,'en',undefined,config)){if(event.type==='first_text')first=performance.now();else text=event.text;}
    const complete=performance.now();rows.push({id:item.id,original:item.original,text,firstText:(first??complete)-start,completeText:complete-start});console.info(config.model,item.id,Math.round(complete-start),'ms');
    await writeFile('benchmarks/model-comparison.json',JSON.stringify([...results,{config,rows,summary:summarize(rows.map(r=>({firstText:r.firstText,completeText:r.completeText})))}],null,2));
  }
  results.push({config,rows,summary:summarize(rows.map(r=>({firstText:r.firstText,completeText:r.completeText})))});
}
await writeFile('benchmarks/model-comparison.json',JSON.stringify(results,null,2));console.info(JSON.stringify(results.map(r=>({config:r.config,summary:r.summary})),null,2));
