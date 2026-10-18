import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {StreamingInterpreter,type InterpreterIO} from '../src/streaming/engine';
import {SemanticCommitter,precisionTrigger} from '../src/streaming/semantic';
import {SemanticCommitter as BeforeCommitter} from './fixtures/stage191-semantic';
import type {SemanticUnit} from '../src/streaming/types';
const options={bargeIn:false,forceControlled:false,protectedTerms:[],warningLagMs:5000,maxLagMs:15000,conversationContext:'Interpret faithfully.',scopedPrecision:true,simultaneous:true};
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
function setup(){
 const sent:SemanticUnit[]=[],streams:number[]=[],characters:number[]=[];let owners=0,maxOwners=0;
 const io:InterpreterIO={now:()=>performance.now(),stage:vi.fn(),translate:vi.fn(async input=>({translation:input.text,confidence:1,needs_precision:false})),output:vi.fn(async(_language,id)=>{
  streams.push(id);characters.push(0);const index=characters.length-1;let closed=false;owners++;maxOwners=Math.max(owners,maxOwners);
  return{send:(unit:SemanticUnit)=>{if(closed)throw new Error('EOS already sent.');characters[index]+=unit.target!.length+1;sent.push(unit);engine.playback(unit.id,'firstAudio',performance.now());engine.playback(unit.id,'started',performance.now());engine.playback(unit.id,'finished',performance.now());},finish:vi.fn(async()=>{closed=true;owners--;}),cancel:()=>{if(!closed){closed=true;owners--;}}};
 }),pauseInput:vi.fn(),failed:vi.fn()};
 const engine=new StreamingInterpreter(io,()=>{},options);engine.start();return{engine,io,sent,streams,characters,get maxOwners(){return maxOwners;}};
}
it('begins translating a stable ordinary closed phrase while later source speech continues, with no extra word or final required',async()=>{
 const s=setup(),first='We are calling the clinic.',tail='We can explain the service.';
 try{
  s.engine.sourceStarted('en',0);s.engine.partial('en',first);await vi.advanceTimersByTimeAsync(130);s.engine.partial('en',first+' ');await vi.advanceTimersByTimeAsync(1);
  expect(s.io.translate).toHaveBeenCalledOnce();expect(s.engine.hasActiveSource).toBe(true);expect(s.sent.map(u=>u.source)).toEqual([first]);
  s.engine.partial('en',first+' '+tail);await vi.advanceTimersByTimeAsync(130);s.engine.partial('en',first+' '+tail);s.engine.finalized('en',first+' '+tail);await vi.advanceTimersByTimeAsync(1);
  expect(s.sent.map(u=>u.source)).toEqual([first,tail]);expect(s.io.translate).toHaveBeenCalledTimes(2);expect(s.engine.idle).toBe(true);expect(s.engine.snapshot.lanes.en).toMatchObject({committedWords:10,translatedWords:10,spokenWords:10});
 }finally{s.engine.end();}
});
it('requires a genuine later stable ASR update; elapsed time alone cannot commit a partial',async()=>{
 const s=setup();try{s.engine.sourceStarted('en',0);s.engine.partial('en','We are calling the clinic.');await vi.advanceTimersByTimeAsync(5000);expect(s.io.translate).not.toHaveBeenCalled();s.engine.partial('en','We are calling the clinic.');await vi.advanceTimersByTimeAsync(1);expect(s.io.translate).toHaveBeenCalledOnce();}finally{s.engine.end();}
});
it('demonstrates the removed terminal lookahead wait against the frozen committer and still holds revised source',()=>{
 const before=new BeforeCommitter('en',100,120,true,precisionTrigger,true,true),after=new SemanticCommitter('en',100,120,true,precisionTrigger,true,true,true),text='We are calling the clinic.';
 before.update(text,0);after.update(text,0);expect(before.update(text+' ',130).segments).toEqual([]);expect(after.update(text+' ',130).segments.map(s=>s.text)).toEqual([text]);
 const revised=new SemanticCommitter('en',100,120,true,precisionTrigger,true,true,true);revised.update('We are calling the clinic.',0);expect(revised.update('We are contacting the office.',200).segments).toEqual([]);
});
it.each(['Hi,','Hi, my name is','I do not give permission.','We don’t want further information.','Yes, that is fine.','I give permission to send emails.','My email address is anna@example.dk.','My telephone number is four seven two nine.','The appointment is October fourteen.','The legal name is Hannah.','The patient treatment has side effects.','Could you send more information?','Because we would like to discuss the information.','If the office accepts the request we can proceed.'])('keeps protected, conditional or incomplete terminal ASR held: %s',text=>{
 const c=new SemanticCommitter('en',100,120,true,precisionTrigger,true,true,true);c.update(text,0);expect(c.update(text,500).segments).toEqual([]);expect(c.cursor).toBe(0);
});
it('sends the next validated unit immediately on the same active output, without waiting for preceding playback/finish',async()=>{
 const s=setup();try{
  // Two source items are committed together while the first request is pending.
  let release!:(value:{translation:string;confidence:number;needs_precision:boolean})=>void;
  vi.mocked(s.io.translate).mockImplementationOnce(()=>new Promise(r=>release=r));
  for(let n=0;n<3;n++){s.engine.sourceStarted('en',performance.now());s.engine.finalized('en','We are calling the clinic.');}
  release({translation:'Vi ringer til klinikken.',confidence:1,needs_precision:false});await vi.advanceTimersByTimeAsync(1);
  expect(s.streams).toHaveLength(1);expect(s.sent).toHaveLength(3);expect(s.maxOwners).toBe(1);
  for(const unit of s.sent){expect(unit.timing.tts_text_sent).toBe(unit.timing.translation_consumed);expect(unit.timing.tts_queued).toBe(unit.timing.translation_consumed);}
  expect(s.engine.idle).toBe(true);expect(s.io.failed).not.toHaveBeenCalled();expect(s.io.stage).toHaveBeenCalledWith(expect.any(String),'translation.queued',expect.any(Number));expect(s.io.stage).toHaveBeenCalledWith(expect.any(String),'translation.consumed',expect.any(Number));expect(s.io.stage).toHaveBeenCalledWith(expect.any(String),'tts.enqueued',expect.any(Number));
 }finally{s.engine.end();}
});
it('rolls over with a fresh transport identity before the unchanged character limit, without overlap or duplicate source',async()=>{
 const s=setup();vi.mocked(s.io.translate).mockResolvedValue({translation:'x'.repeat(3000),confidence:1,needs_precision:false});
 try{s.engine.sourceStarted('en',0);const text=Array(8).fill('We are calling the clinic.').join(' ');s.engine.partial('en',text);await vi.advanceTimersByTimeAsync(130);s.engine.partial('en',text);s.engine.finalized('en',text);await vi.advanceTimersByTimeAsync(1);expect(s.streams.length).toBeGreaterThan(1);expect(new Set(s.streams).size).toBe(s.streams.length);expect(Math.max(...s.characters)).toBeLessThanOrEqual(10000);expect(s.maxOwners).toBe(1);expect(new Set(s.sent.map(u=>u.id)).size).toBe(s.sent.length);expect(s.sent.map(u=>u.source).join(' ')).toBe(text);expect(s.engine.idle).toBe(true);}finally{s.engine.end();}
});
it('rolls over an aged context within the same long source item using a fresh transport identity',async()=>{
 const s=setup();try{
  s.engine.sourceStarted('en',0);s.engine.partial('en','We are calling the clinic.');await vi.advanceTimersByTimeAsync(130);s.engine.partial('en','We are calling the clinic.');await vi.advanceTimersByTimeAsync(1);
  await vi.advanceTimersByTimeAsync(150001);s.engine.partial('en','We are calling the clinic. We can explain the service.');await vi.advanceTimersByTimeAsync(130);s.engine.partial('en','We are calling the clinic. We can explain the service.');s.engine.finalized('en','We are calling the clinic. We can explain the service.');await vi.advanceTimersByTimeAsync(1);
  expect(s.streams).toHaveLength(2);expect(s.streams[0]).not.toBe(s.streams[1]);expect(s.maxOwners).toBe(1);expect(s.sent).toHaveLength(2);expect(s.io.failed).not.toHaveBeenCalled();expect(s.engine.idle).toBe(true);
 }finally{s.engine.end();}
});
it('STOP closes a retained speaking context and ignores late source with no new output',async()=>{
 const s=setup();s.engine.sourceStarted('en',0);s.engine.partial('en','We are calling the clinic.');await vi.advanceTimersByTimeAsync(130);s.engine.partial('en','We are calling the clinic.');await vi.advanceTimersByTimeAsync(1);expect(s.engine.hasActiveSource).toBe(true);const sent=s.sent.length;s.engine.end();s.engine.partial('en','Late source must never speak.');s.engine.finalized('en','Late source must never speak.');await vi.advanceTimersByTimeAsync(1000);expect(s.sent).toHaveLength(sent);expect(s.engine.idle).toBe(true);expect(s.io.failed).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
