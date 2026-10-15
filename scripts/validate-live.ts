import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { transcribe, translate, speech } from '../server/api';
import { modelConfig } from '../server/models';
const inputs = [
  {id:'clinic-ask-doctor',language:'da' as const},
  {id:'agent-purpose',language:'en' as const}
];
console.info('Validating models',modelConfig());
for(const input of inputs){
  const audio=new Blob([await readFile(`public/audio/${input.id}.wav`)],{type:'audio/wav'});const t0=performance.now();
  const original=await transcribe(audio,input.language);const t1=performance.now();
  const translated=await translate(original,input.language);const t2=performance.now();
  const output=await speech(translated,input.language==='da'?'en':'da');const t3=performance.now();
  console.info({fixture:input.id,original,translated,audioBytes:output.byteLength,transcriptionMs:Math.round(t1-t0),translationMs:Math.round(t2-t1),speechMs:Math.round(t3-t2)});
}
// Text checks exercise meaning constraints beyond prerecorded source recognition.
for(const [source,text] of [['da','Nej tak. Jeg ønsker ikke at modtage e-mails.'],['da','Du kan ringe igen i morgen efter klokken ti.'],['en','Humza from aPureBase is calling on behalf of Example Pharma. Please use anna-2.jensen@example.dk.']] as const){
  console.info({source,original:text,translation:await translate(text,source)});
}
