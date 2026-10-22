import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {translateUnit} from '../src/streaming/translationClient';
import type {UnitRequest} from '../server/incrementalTranslation';
const request:UnitRequest={text:'An ordinary validated statement.',language:'en',sourceHistory:'',targetHistory:'',conversationContext:'',speakerRole:'agent',protectedTerms:[],precision:false,uncertaintyRouting:true};
const result={translation:'Et almindeligt udsagn.',confidence:1,needs_precision:false,meaning_status:'recoverable',consequential_uncertainty:false};
const response=()=>new Response(`data: ${JSON.stringify({type:'done',result})}\n\n`,{headers:{'Content-Type':'text/event-stream'}});
beforeEach(()=>vi.useFakeTimers());afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('cancels a stalled pre-first-token request before one identical bounded retry; only the validated final is returned',async()=>{
 let firstSignal:AbortSignal|undefined;const fetch=vi.fn((_url:string,init:RequestInit)=>{if(fetch.mock.calls.length===1){firstSignal=init.signal as AbortSignal;return new Promise<Response>((_resolve,reject)=>firstSignal!.addEventListener('abort',()=>reject(firstSignal!.reason),{once:true}));}expect(firstSignal?.aborted).toBe(true);return Promise.resolve(response());});vi.stubGlobal('fetch',fetch);const partial=vi.fn();const work=translateUnit(request,new AbortController().signal,partial);
 await vi.advanceTimersByTimeAsync(2999);expect(fetch).toHaveBeenCalledOnce();await vi.advanceTimersByTimeAsync(1);await expect(work).resolves.toEqual(result);expect(fetch).toHaveBeenCalledTimes(2);expect(fetch.mock.calls[0][1].body).toBe(fetch.mock.calls[1][1].body);expect(partial).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
it('never retries validation/provider errors or STOP',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:502})));await expect(translateUnit(request,new AbortController().signal,()=>{})).rejects.toThrow('unavailable');expect(fetch).toHaveBeenCalledOnce();
 const abort=new AbortController();vi.stubGlobal('fetch',vi.fn((_url:string,init:RequestInit)=>new Promise<Response>((_resolve,reject)=>init.signal?.addEventListener('abort',()=>reject(init.signal?.reason),{once:true}))));const work=translateUnit(request,abort.signal,()=>{});const rejection=expect(work).rejects.toMatchObject({name:'AbortError'});abort.abort();await rejection;await vi.advanceTimersByTimeAsync(10000);expect(fetch).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
it('preserves precision requests without a latency retry',async()=>{
 const abort=new AbortController();vi.stubGlobal('fetch',vi.fn((_url:string,init:RequestInit)=>new Promise<Response>((_resolve,reject)=>init.signal?.addEventListener('abort',()=>reject(init.signal?.reason),{once:true}))));const work=translateUnit({...request,precision:true},abort.signal,()=>{});const rejection=expect(work).rejects.toThrow();await vi.advanceTimersByTimeAsync(14000);expect(fetch).toHaveBeenCalledOnce();abort.abort();await rejection;expect(vi.getTimerCount()).toBe(0);
});
