import { openAI, textField, ApiError } from './openai';
import { modelConfig } from './models';
import { protectTokens } from '../src/email';
import { interpreterInstructions, compactInterpreterInstructions } from '../src/config/campaignGlossary';
import { readSse } from '../src/sse';
export interface TranslationConfig { model: string; reasoning: string; compact: boolean }
export type TranslationEvent = { type: 'first_text' } | { type: 'done'; text: string };
export function selectTranslationConfig(original: string): TranslationConfig {
  const config=modelConfig();
  // Routing selects a quality tier only; it does not infer consent or modify the utterance.
  const careful=original.length>160||/mail|snabel|snabela|@|\d|number|date|time|tomorrow|after ten|klokken|i morgen|samtykke|consent|permission|tillad|authority|behalf|ask the doctor first|spørge lægen|medicine|medicin|dosis|dose|garanter|guarantee/i.test(original);
  return {model:careful?config.carefulTranslation:config.translation,reasoning:config.reasoning,compact:true};
}
export async function* streamTranslation(original: string, source: 'en' | 'da', signal?: AbortSignal, config?: TranslationConfig): AsyncGenerator<TranslationEvent> {
  textField(original);const selected=config??selectTranslationConfig(original);const protectedText=protectTokens(original);
  const body={model:selected.model,instructions:selected.compact?compactInterpreterInstructions(source):interpreterInstructions(source),input:[{role:'user',content:[{type:'input_text',text:protectedText.text}]}],store:false,stream:true,max_output_tokens:Math.min(3000,Math.max(256,Math.ceil(original.length*.8))),...(selected.model.startsWith('gpt-5')||selected.model.startsWith('gpt-6')?{reasoning:{effort:selected.reasoning}}:{})};
  const response=await openAI('responses',JSON.stringify(body),signal);if(!response.body)throw new ApiError(502,'Translation stream unavailable.');
  let text='';let first=false;let complete=false;const sequences=new Set<number>();
  for await(const event of readSse(response.body)){
    signal?.throwIfAborted();const sequence=event.sequence_number;if(typeof sequence==='number'){if(sequences.has(sequence))continue;sequences.add(sequence);}
    if(event.type==='response.output_text.delta'&&typeof event.delta==='string'){
      text+=event.delta;if(text.length>20000)throw new ApiError(502,'Translation exceeds limit.');
      if(!first&&text.replace(/__KEEP_\d+__/g,'').replace(/__[A-Z_\d]*$/g,'').match(/\p{L}/u)){first=true;yield {type:'first_text'};}
    }
    if(event.type==='response.completed'){
      const result=event.response as {status?:string;output?:{type:string;content?:{type:string;text?:string}[]}[]};
      if(result.status!=='completed')throw new ApiError(502,'Translation did not complete.');
      const authoritative=result.output?.filter(o=>o.type==='message').flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text??'').join('');
      if(authoritative&&text!==authoritative)throw new ApiError(502,'Translation stream was incomplete.');
      const final=(()=>{try{return textField(protectedText.restore(text));}catch{throw new ApiError(502,'Translation omitted protected content. Human verification required.');}})();
      if(!first)yield {type:'first_text'};complete=true;yield {type:'done',text:final};return;
    }
    if(event.type==='error'||event.type==='response.failed'||event.type==='response.incomplete')throw new ApiError(502,'Translation did not complete.');
  }
  if(!complete)throw new ApiError(502,'Translation stream interrupted. No audio will play.');
}
