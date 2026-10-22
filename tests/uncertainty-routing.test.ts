import {afterEach,expect,it,vi} from 'vitest';
import {StreamingInterpreter,type InterpreterIO,type Output} from '../src/streaming/engine';
import {consequentialUncertainty,uncertaintyRoute} from '../src/streaming/uncertainty';
import type {UnitResult} from '../server/incrementalTranslation';
import type {SemanticUnit} from '../src/streaming/types';
import {SemanticCommitter,precisionTrigger} from '../src/streaming/semantic';
const ordinary:UnitResult={translation:'Trofast kildeoversættelse.',confidence:.45,needs_precision:true,meaning_status:'recoverable',consequential_uncertainty:false};
afterEach(()=>vi.useRealTimers());
function setup(translate:InterpreterIO['translate']){
 let now=0;const sent:SemanticUnit[]=[];
 const output:Output={send:vi.fn(u=>sent.push(u)),finish:vi.fn(async()=>{}),cancel:vi.fn()};
 const io:InterpreterIO={now:()=>now,translate:vi.fn(translate),output:vi.fn(async()=>output),pauseInput:vi.fn(),failed:vi.fn()};
 const engine=new StreamingInterpreter(io,()=>{},{bargeIn:false,forceControlled:false,protectedTerms:[],warningLagMs:5000,maxLagMs:15000,conversationContext:'Interpret only.',scopedPrecision:true,simultaneous:true});engine.start();
 return{engine,io,output,sent,at:(value:number)=>now=value};
}
it.each(['We would like to like your permission to send you information by email about our disease.','Yeah, as product and events.','Um, we, we are calling the clinic.','We send product, I mean products and events.','Vi vil gerne gerne have tilladelse til at sende information via e-mail.'])('continues recoverable ordinary ASR wording: %s',async source=>{
 const s=setup(async()=>ordinary);try{s.engine.sourceStarted('en',0);s.engine.finalized('en',source);await vi.waitFor(()=>expect(s.engine.idle).toBe(true));expect(s.sent).toHaveLength(1);expect(s.sent[0].target).toBe(ordinary.translation);expect(s.io.translate).toHaveBeenCalledOnce();expect(s.io.pauseInput).not.toHaveBeenCalled();expect(s.io.failed).not.toHaveBeenCalled();}finally{s.engine.end();}
});
it('keeps the exact acceptance source and supplied faithful Danish; subsequent speech uses the same output',async()=>{
 const source='We are calling because we would like to like your permission to send you information by email about our disease.';
 const tail='Yeah, as product and events.';
 const full=source+' '+tail;const target='Vi ringer, fordi vi gerne vil vil have din tilladelse til at sende dig information via e-mail om vores sygdom. Ja, altså produkter og arrangementer.';
 const translations=new Map([[source,target.slice(0,target.indexOf(' Ja,'))],[tail,'Ja, altså produkter og arrangementer.'],['We can call later.','Vi kan ringe senere.']]);
 const s=setup(async input=>({...ordinary,translation:translations.get(input.text)!}));try{
  s.engine.sourceStarted('en',0);s.engine.partial('en',full);s.engine.finalized('en',full);await vi.waitFor(()=>expect(s.engine.idle).toBe(true));
  s.engine.sourceStarted('en',100);s.engine.finalized('en','We can call later.');await vi.waitFor(()=>expect(s.engine.idle).toBe(true));
  expect(s.sent.map(u=>u.source)).toEqual([source,tail,'We can call later.']);expect(s.sent.map(u=>u.target).join(' ')).toBe(target+' Vi kan ringe senere.');expect(s.io.failed).not.toHaveBeenCalled();expect(s.io.pauseInput).not.toHaveBeenCalled();expect(s.engine.snapshot.lanes.en.precision).toBe('');
 }finally{s.engine.end();}
});
it('streams an imperfect request before source ends and sends its filler tail through the same output',async()=>{
 const source='We would like to like your permission to send information by email about our disease.';const tail='Yeah, as product and events.';
 const s=setup(async input=>({...ordinary,translation:input.text}));try{s.engine.sourceStarted('en',0);s.engine.partial('en',source);s.at(300);s.engine.partial('en',source+' '+tail);await vi.waitFor(()=>expect(s.sent).toHaveLength(1));expect(s.engine.hasActiveSource).toBe(true);s.engine.finalized('en',source+' '+tail);await vi.waitFor(()=>expect(s.engine.idle).toBe(true));expect(s.sent.map(u=>u.source)).toEqual([source,tail]);expect(s.io.output).toHaveBeenCalledOnce();expect(s.io.pauseInput).not.toHaveBeenCalled();expect(s.io.failed).not.toHaveBeenCalled();}finally{s.engine.end();}
});
it('isolates a protected final sentence from ordinary preceding and subsequent speech',()=>{
 const c=new SemanticCommitter('en',100,120,true,precisionTrigger,true,true);const r=c.update('Um, we call the clinic. I give permission. We can call later.',0,true);expect(r.segments.map(s=>[s.text,s.precision])).toEqual([['Um, we call the clinic.',false],['I give permission.',true],['We can call later.',false]]);
});
it('reviews only the uncertain consent unit without retranslation of the imperfect preceding ordinary unit',async()=>{
 const first='Um, we, we are calling.';const consent='I give permission.';const s=setup(async input=>({...ordinary,translation:input.text}));try{s.engine.sourceStarted('en',0);s.engine.finalized('en',first+' '+consent+' We can call later.');await vi.waitFor(()=>expect(s.engine.idle).toBe(true));expect(s.sent.map(u=>u.source)).toEqual([first]);expect(vi.mocked(s.io.translate).mock.calls.map(c=>c[0].text).filter(text=>text!=='We can call later.')).toEqual([first,consent,consent]);expect(s.io.failed).toHaveBeenCalledOnce();}finally{s.engine.end();}
});
it.each(['Yes.','No.','Yeah.','I give permission to send emails.','We do not have permission.','I am not interested.','You may send emails.','My email address is anna@example.dk.','My telephone number is 12345678.','The appointment is October 14.','I am authorized to act on behalf of the doctor.','The patient’s name is Hannah.','The treatment has no side effects.','We would like permission to change the dose.'])('keeps human precision review for consequential uncertainty: %s',async source=>{
 expect(consequentialUncertainty(source)).toBeTruthy();const s=setup(async()=>ordinary);try{s.engine.sourceStarted('en',0);s.engine.finalized('en',source);await vi.waitFor(()=>expect(s.engine.idle).toBe(true));expect(s.sent).toHaveLength(0);expect(s.io.translate).toHaveBeenCalledTimes(2);expect(vi.mocked(s.io.translate).mock.calls[1][0]).toMatchObject({text:source,precision:true});expect(s.io.failed).toHaveBeenCalledOnce();expect(s.io.pauseInput).toHaveBeenCalledWith('en');}finally{s.engine.end();}
});
it.each(['Negation marker missing','Added consent assertion','Added email request'])('never bypasses a consequential fidelity guard: %s',guardReason=>{
 expect(uncertaintyRoute('Hello.',{...ordinary,guardReason})).toBe('precision');
});
it('keeps materially ambiguous medical meaning flagged by the model in precision even without a keyword',async()=>{
 const s=setup(async()=>({...ordinary,consequential_uncertainty:true}));try{s.engine.sourceStarted('en',0);s.engine.finalized('en','It affects the left one.');await vi.waitFor(()=>expect(s.engine.idle).toBe(true));expect(s.sent).toHaveLength(0);expect(s.io.failed).toHaveBeenCalledOnce();}finally{s.engine.end();}
});
it('holds only an undecidable range, uses later source context without merging it, then delivers FIFO',async()=>{
 const source='It concerns the thing.';const tail='We mean the information pack.';
 const s=setup(async input=>input.text===source&&!input.followingSourceContext?{...ordinary,translation:'',meaning_status:'needs_context'}:{...ordinary,translation:input.text});try{
  s.engine.sourceStarted('en',0);s.engine.finalized('en',source);await vi.waitFor(()=>expect(s.engine.snapshot.lanes.en.units[0].status).toBe('held'));
  expect(s.io.pauseInput).not.toHaveBeenCalled();expect(s.io.failed).not.toHaveBeenCalled();expect(s.sent).toHaveLength(0);
  s.engine.sourceStarted('en',100);s.engine.finalized('en',tail);await vi.waitFor(()=>expect(s.engine.idle).toBe(true));
  expect(s.sent.map(u=>u.source)).toEqual([source,tail]);expect(s.sent.map(u=>u.target)).toEqual([source,tail]);expect(s.io.translate).toHaveBeenCalledWith(expect.objectContaining({text:source,followingSourceContext:tail}),expect.any(AbortSignal),expect.any(Function),expect.any(Function));expect(s.io.failed).not.toHaveBeenCalled();
 }finally{s.engine.end();}
});
it('does not invent context or trigger global lag precision while an ordinary range waits; STOP releases it',async()=>{
 vi.useFakeTimers();const s=setup(async()=>({...ordinary,translation:'',meaning_status:'needs_context'}));s.engine.sourceStarted('en',0);s.engine.finalized('en','It concerns the thing.');await vi.waitFor(()=>expect(s.engine.snapshot.lanes.en.units[0].status).toBe('held'));s.at(20000);await vi.advanceTimersByTimeAsync(100);
 expect(s.io.translate).toHaveBeenCalledOnce();expect(s.sent).toHaveLength(0);expect(s.engine.snapshot.lanes.en.precision).toBe('');expect(s.engine.snapshot.warning).not.toContain('falling behind');expect(s.io.pauseInput).not.toHaveBeenCalled();s.engine.end();await vi.waitFor(()=>expect(s.engine.idle).toBe(true));expect(s.output.cancel).toHaveBeenCalled();expect(s.io.failed).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
it('continues preparing a following unit while the unresolved ordinary range is held, with no out-of-order audio',async()=>{
 let release!:(value:UnitResult)=>void;const source='It concerns the thing.';const tail='We mean the information pack.';
 const s=setup(async input=>{if(input.text===source){if(!input.followingSourceContext)return{...ordinary,translation:'',meaning_status:'needs_context'};return new Promise<UnitResult>(r=>release=r);}return{...ordinary,translation:input.text};});try{
  s.engine.sourceStarted('en',0);s.engine.finalized('en',source);await vi.waitFor(()=>expect(s.engine.snapshot.lanes.en.units[0].status).toBe('held'));s.engine.sourceStarted('en',100);s.engine.finalized('en',tail);await vi.waitFor(()=>expect(release).toBeDefined());expect(vi.mocked(s.io.translate).mock.calls.some(c=>c[0].text===tail)).toBe(true);expect(s.sent).toHaveLength(0);release({...ordinary,translation:source});await vi.waitFor(()=>expect(s.engine.idle).toBe(true));expect(s.sent.map(u=>u.source)).toEqual([source,tail]);
 }finally{s.engine.end();}
});
