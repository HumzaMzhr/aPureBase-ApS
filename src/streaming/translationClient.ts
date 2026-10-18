import type {UnitRequest,UnitResult} from '../../server/incrementalTranslation';
import {readSse} from '../sse';
type TranslationTrace=(event:string,data:Record<string,unknown>)=>void;
/** Retry only a pre-first-text stall, once, after cancelling the original HTTP
 * request. No parallel hedge, partial speech, model fallback or validation bypass. */
export async function translateUnit(input:UnitRequest,signal:AbortSignal,partial:(text:string)=>void,trace?:TranslationTrace):Promise<UnitResult>{
 for(let attempt=0;attempt<2;attempt++){
  signal.throwIfAborted();const controller=new AbortController(),combined=AbortSignal.any([signal,controller.signal]);let timedOut=false;
  const timer=attempt===0&&input.uncertaintyRouting&&!input.precision?setTimeout(()=>{timedOut=true;controller.abort(new DOMException('Translation produced no text','TimeoutError'));},3000):undefined;
  try{
   trace?.('translation.attempt_started',{attempt:attempt+1});
   const response=await fetch('/api/interpret/unit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:combined});
   if(!response.ok||!response.body)throw new Error('Unit translation unavailable.');
   for await(const event of readSse(response.body)){
    combined.throwIfAborted();
    if(event.type==='partial'&&typeof event.text==='string'){if(event.text.trim())clearTimeout(timer);partial(event.text);}
    if(event.type==='done'){trace?.('translation.attempt_completed',{attempt:attempt+1});return event.result as UnitResult;}
   }
   throw new Error('Unit translation interrupted.');
  }catch(error){
   signal.throwIfAborted();
   if(!timedOut||attempt!==0)throw error;
   trace?.('translation.first_text_timeout',{attempt:attempt+1,timeoutMs:3000});
  }finally{clearTimeout(timer);controller.abort();}
 }
 throw new Error('Unit translation unavailable.');
}

/** Whole-turn compatibility path; the original server owns model routing and validation. */
export async function translateControlledTurn(input:UnitRequest,signal:AbortSignal):Promise<UnitResult>{
 return controlledTurn(input,signal,false);
}
/** Local evaluation requests model telemetry; provider routing and validation stay identical. */
export async function translateLocalControlledTurn(input:UnitRequest,signal:AbortSignal):Promise<UnitResult>{
 return controlledTurn(input,signal,true);
}
async function controlledTurn(input:UnitRequest,signal:AbortSignal,metrics:boolean):Promise<UnitResult>{
 const response=await fetch('/api/translate/stream',{method:'POST',headers:{'Content-Type':'application/json',...(metrics?{'X-Interpreter-Metrics':'local'}:{})},body:JSON.stringify({text:input.text,language:input.language}),signal});
 if(!response.ok||!response.body)throw new Error('Controlled translation unavailable.');
 for await(const event of readSse(response.body)){signal.throwIfAborted();if(event.type==='done'&&typeof event.text==='string'&&event.text.trim())return{translation:event.text,confidence:1,needs_precision:false,...(metrics?{model:response.headers.get('X-Translation-Model')??undefined}:{})};}
 // Compatibility sentinel above means the original route completed its own validation;
 // it is not an ASR/model confidence estimate and must not be reported as one.
 throw new Error('Controlled translation interrupted. No audio will play.');
}
