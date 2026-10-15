import 'dotenv/config';
import {writeFile} from 'node:fs/promises';
import {openAI} from '../server/openai';
import {selectTranslationConfig} from '../server/translation';
import {compactInterpreterInstructions} from '../src/config/campaignGlossary';
import {readSse} from '../src/sse';
import {ElevenLabsVoiceProvider} from '../server/voice';
import {protectTokens} from '../src/email';
import {benchmarkCases} from './benchmark-cases';
const rows=[];
async function firstAudio(text:string,start:number){const provider=new ElevenLabsVoiceProvider();try{const stream=await provider.streamSpeech(text);const reader=stream.getReader();const first=await reader.read();if(first.done)throw new Error('No audio');const ready=performance.now()-start;await reader.cancel();return ready;}finally{provider.cancel();}}
for(const id of ['greeting','long-question']){
 const item=benchmarkCases.find(c=>c.id===id)!;const protectedText=protectTokens(item.text);const selected=selectTranslationConfig(item.text);const start=performance.now();
 const response=await openAI('responses',JSON.stringify({model:selected.model,stream:true,store:false,instructions:compactInterpreterInstructions('en'),input:protectedText.text,max_output_tokens:3000,...(selected.model.startsWith('gpt-5')?{reasoning:{effort:'none'}}:{})}));
 let text='';let unit='';let early:Promise<number>|undefined;let unitAt:number|undefined;let complete=false;
 for await(const raw of readSse(response.body!)){const event=raw;if(event.type==='response.output_text.delta'){text+=event.delta;const match=text.match(/^.+?[.!?](?:\s|$)/s);if(!early&&match){try{unit=protectedText.restore(match[0].trim());unitAt=performance.now()-start;early=firstAudio(unit,start);early.catch(()=>{});}catch{/* Protected markers must remain complete. */}}}if(event.type==='response.completed'&&(event.response as {status?:string})?.status==='completed')complete=true;}
 if(!complete)throw new Error('Incomplete text');text=protectedText.restore(text);const completeAt=performance.now()-start;const full=await firstAudio(text,start);const prefix=early?await early:undefined;
 rows.push({id,model:selected.model,text,unit,unitTextMs:unitAt,fullTextMs:completeAt,unitFirstAudioMs:prefix,fullFirstAudioMs:full,note:'Synthesis-only experiment: no playback. Prefix audio cancelled after first bytes. Production waits for full validated text.'});await writeFile('benchmarks/semantic-units.json',JSON.stringify(rows,null,2));console.info(id,JSON.stringify(rows.at(-1)));
}
