import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {incrementalTranslation,unitRequest} from '../server/incrementalTranslation';
const input={text:'Hello from aPureBase and Humza.',language:'en' as const,sourceHistory:'Earlier source.',targetHistory:'Tidligere kilde.',conversationContext:'Interpret only.',speakerRole:'agent' as const,protectedTerms:[],precision:false};
beforeEach(()=>vi.stubEnv('OPENAI_API_KEY','private-key'));afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
function response(json:string,status='completed'){return new Response(`data: ${JSON.stringify({type:'response.output_text.delta',delta:json,sequence_number:1})}\n\ndata: ${JSON.stringify({type:'response.completed',response:{status,output:[{type:'message',content:[{type:'output_text',text:json}]}]}})}\n\n`);}
it('uses bounded rolling context and returns only new validated target text with names restored',async()=>{const fetcher=vi.fn(async(_url,init)=>{const body=JSON.parse(init.body);const source=JSON.parse(body.input).NEW_SOURCE;return response(JSON.stringify({translation:source,confidence:.99,needs_precision:false}));});vi.stubGlobal('fetch',fetcher);const events=[];for await(const event of incrementalTranslation(input,undefined,'gpt-6-luna'))events.push(event);expect(events.at(-1)).toMatchObject({type:'done',result:{translation:input.text}});const body=JSON.parse(fetcher.mock.calls[0][1].body);expect(JSON.parse(body.input)).toMatchObject({sourceHistory:'Earlier source.',targetHistory:'Tidligere kilde.',NEW_SOURCE:expect.stringContaining('__KEEP_')});expect(body.reasoning.effort).toBe('none');expect(body.instructions).toContain('Never answer');expect(body.store).toBe(false);});
it('rejects incomplete or protected-name-omitting outputs before TTS',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>response(JSON.stringify({translation:'missing names',confidence:.99,needs_precision:false}))));const consume=async()=>{for await(const event of incrementalTranslation(input))if(event.type==='done')throw new Error('Should not release');};await expect(consume()).rejects.toThrow('validation');});
it('marks missing negation/question wording as precision rather than speaking it',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>response(JSON.stringify({translation:'Lægen er tilgængelig.',confidence:.99,needs_precision:false}))));const results=[];for await(const e of incrementalTranslation({...input,text:"The doctor is not available. Can you call later?"}))results.push(e);expect(results.at(-1)).toMatchObject({type:'done',result:{needs_precision:true}});});
it('validates caller context boundaries and required source language',()=>{expect(()=>unitRequest({...input,sourceHistory:'x'.repeat(1801)})).toThrow('bounded');expect(()=>unitRequest({...input,language:'fr'})).toThrow();expect(()=>unitRequest({...input,protectedTerms:['x'.repeat(81)]})).toThrow();});

it('keeps validation, context, names and non-reasoning in the compact trial profile',async()=>{
 const fetcher=vi.fn(async(_url,init)=>{const body=JSON.parse(init.body);return response(JSON.stringify({translation:JSON.parse(body.input).NEW_SOURCE,confidence:.99,needs_precision:false}));});vi.stubGlobal('fetch',fetcher);
 const events=[];for await(const e of incrementalTranslation({...input,latencyProfile:'fast'},undefined,'gpt-6-luna'))events.push(e);
 expect(events.at(-1)).toMatchObject({type:'done',result:{translation:input.text}});
 const body=JSON.parse(fetcher.mock.calls[0][1].body);expect(body.instructions).toContain('Never answer');expect(body.instructions).toContain('negation');expect(JSON.parse(body.input).sourceHistory).toBe(input.sourceHistory);expect(body.text.format.strict).toBe(true);
 expect(()=>unitRequest({...input,latencyProfile:'unsafe'})).toThrow('profile');
});

it.each(["The doctor isn't available.",'The doctor can’t come to the phone.','The doctor is unavailable.'])('accepts faithful negative wording %s without a false precision rejection',async target=>{
 vi.stubGlobal('fetch',vi.fn(async()=>response(JSON.stringify({translation:target,confidence:.99,needs_precision:false}))));
 const events=[];for await(const e of incrementalTranslation({...input,text:'Lægen kan ikke komme til telefonen.',language:'da'}))events.push(e);
 expect(events.at(-1)).toMatchObject({type:'done',result:{translation:target,needs_precision:false}});
});
it.each(['Hamza and PureBase','Hamza and a PureBase','Hamza and a pure base'])('sends canonical voice text and pronunciation guidance for %s without choosing precision',async names=>{
 const fetcher=vi.fn(async(_url,init)=>{const body=JSON.parse(init.body);return response(JSON.stringify({translation:JSON.parse(body.input).NEW_SOURCE,confidence:.99,needs_precision:false}));});vi.stubGlobal('fetch',fetcher);
 const events=[];for await(const e of incrementalTranslation({...input,text:'Hello from '+names+'.'}))events.push(e);
 expect(events.at(-1)).toMatchObject({type:'done',result:{translation:'Hello from Humza and aPureBase.',needs_precision:false}});const body=JSON.parse(fetcher.mock.calls[0][1].body);expect(body.model).toBe('gpt-6-luna');expect(body.instructions).toContain('Never require precision solely');expect(body.instructions).toContain('pronunciation');
});
it.each(['Hej. Må jeg få din emailadresse?','Hej. Du har givet samtykke.','Hello. May I have your email address?'])('blocks additional translated speech not supported by a greeting: %s',translation=>{
 vi.stubGlobal('fetch',vi.fn(async()=>response(JSON.stringify({translation,confidence:.99,needs_precision:false}))));const collect=async()=>{const results=[];for await(const event of incrementalTranslation({...input,text:'Hello.'}))results.push(event);return results;};return expect(collect()).resolves.toContainEqual(expect.objectContaining({type:'done',result:expect.objectContaining({needs_precision:true,guardReason:expect.stringContaining('Added')})}));
});

it('requires explicit meaning routing only in simultaneous requests, preserving models and fidelity rules',async()=>{
 const source='We would like to like your permission to send information by email about our disease.';
 const target='Vi vil gerne gerne have din tilladelse til at sende information via e-mail om vores sygdom.';
 const fetcher=vi.fn(async(_url,init)=>{expect(JSON.parse(init.body).store).toBe(false);return response(JSON.stringify({translation:target,confidence:.6,needs_precision:true,meaning_status:'recoverable',consequential_uncertainty:false}));});vi.stubGlobal('fetch',fetcher);
 const events=[];for await(const e of incrementalTranslation({...input,text:source,uncertaintyRouting:true,followingSourceContext:'Yeah, as product and events.'},undefined,'gpt-6-luna'))events.push(e);
 expect(events.at(-1)).toMatchObject({type:'done',result:{translation:target,needs_precision:true,meaning_status:'recoverable',consequential_uncertainty:false}});
 const body=JSON.parse(fetcher.mock.calls[0][1].body);expect(body.model).toBe('gpt-6-luna');expect(body.text.format.schema.required).toContain('meaning_status');expect(body.text.format.schema.required).toContain('consequential_uncertainty');expect(body.instructions).toContain('never invent');expect(body.instructions).toContain('Never answer');expect(JSON.parse(body.input)).toMatchObject({followingSourceContext:'Yeah, as product and events.'});
});
it.each([{meaning_status:'bad',consequential_uncertainty:false},{meaning_status:'recoverable'},{consequential_uncertainty:false}])('rejects missing or invalid uncertainty routing metadata: %j',metadata=>{
 vi.stubGlobal('fetch',vi.fn(async()=>response(JSON.stringify({translation:'Hej.',confidence:.5,needs_precision:true,...metadata}))));const collect=async()=>{for await(const e of incrementalTranslation({...input,text:'Hello.',uncertaintyRouting:true}))if(e.type==='done')throw new Error('Invalid result was released');};return expect(collect()).rejects.toThrow('validation');
});
it('allows an explicitly undecidable empty translation to be held without inventing protected wording',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>response(JSON.stringify({translation:'',confidence:0,needs_precision:true,meaning_status:'needs_context',consequential_uncertainty:false}))));const events=[];for await(const e of incrementalTranslation({...input,uncertaintyRouting:true}))events.push(e);expect(events.at(-1)).toMatchObject({type:'done',result:{translation:'',meaning_status:'needs_context'}});
});
it('keeps negation safeguards despite a model claiming recoverable ordinary uncertainty',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>response(JSON.stringify({translation:'Jeg giver tilladelse.',confidence:.6,needs_precision:true,meaning_status:'recoverable',consequential_uncertainty:false}))));const events=[];for await(const e of incrementalTranslation({...input,text:'I do not give permission.',uncertaintyRouting:true}))events.push(e);expect(events.at(-1)).toMatchObject({type:'done',result:{needs_precision:true,guardReason:'Negation marker missing'}});
});
it('bounds following context and validates the uncertainty-routing flag',()=>{
 expect(()=>unitRequest({...input,uncertaintyRouting:'yes'})).toThrow('routing');expect(()=>unitRequest({...input,followingSourceContext:'x'.repeat(1601)})).toThrow('bounded');
});
