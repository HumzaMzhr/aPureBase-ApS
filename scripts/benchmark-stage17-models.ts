import 'dotenv/config';
import {writeFile} from 'node:fs/promises';
import {incrementalTranslation,type UnitRequest} from '../server/incrementalTranslation';
import {summarize} from '../src/latency';
const cases=[
 {language:'en',text:'Hello, my name is Humza,',sourceHistory:'',targetHistory:''},
 {language:'en',text:"I'm calling on behalf of aPureBase.",sourceHistory:'Hello, my name is Humza,',targetHistory:'Hej, mit navn er Humza,'},
 {language:'en',text:'We do not provide treatment advice. Can you help me?',sourceHistory:'We contact healthcare professionals.',targetHistory:'Vi kontakter sundhedspersoner.'},
 {language:'en',text:'Dr. Larsen asked about Xarelto and Example Pharma.',sourceHistory:'We use the professional terminology supplied.',targetHistory:'Vi bruger den angivne faglige terminologi.'},
 {language:'da',text:'Hej, du taler med Pernille.',sourceHistory:'',targetHistory:''},
 {language:'da',text:'Hvilken information ønsker I at sende?',sourceHistory:'Hej, du taler med Pernille.',targetHistory:"Hello, you are speaking with Pernille."},
 {language:'da',text:'Lægen er ikke tilgængelig. Du kan ringe igen senere.',sourceHistory:'Du taler med klinikken.',targetHistory:'You are speaking with the clinic.'},
 {language:'da',text:'Dr. Larsen vil høre mere om Xarelto og Example Pharma.',sourceHistory:'Vi bruger de faglige navne.',targetHistory:'We use the professional names.'}
] as const;
const results=[];for(const model of ['gpt-5.5','gpt-4.1-mini','gpt-6-luna']){const rows=[];for(const [i,item]of cases.entries()){const input:UnitRequest={...item,conversationContext:'Fictional aPureBase healthcare contact call. Interpret only, never answer.',speakerRole:item.language==='en'?'agent':'clinic',protectedTerms:['Dr. Larsen','Xarelto'],precision:false};const start=performance.now();let first:number|undefined;let result;for await(const event of incrementalTranslation(input,undefined,model)){if(event.type==='partial')first??=performance.now();else result=event.result;}rows.push({id:i,source:item.text,language:item.language,result,firstText:(first??performance.now())-start,complete:performance.now()-start});console.info(model,i,Math.round(performance.now()-start));}results.push({model,rows,summary:summarize(rows.map(r=>({firstText:r.firstText,complete:r.complete})))});await writeFile('benchmarks/stage17-models.json',JSON.stringify(results,null,2));}
console.info(JSON.stringify(results.map(r=>({model:r.model,summary:r.summary})),null,2));
