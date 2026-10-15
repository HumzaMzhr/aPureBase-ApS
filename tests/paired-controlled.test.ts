import {fixtureHeaders} from './fixtures/voice';
import {it,expect,vi,afterEach} from 'vitest';
import {controlledOutput} from '../src/streaming/controlledOutput';
import type {SemanticUnit} from '../src/streaming/types';
const unit:SemanticUnit={id:'one',turn:1,language:'da',source:'Hej.',target:'Hello.',start:0,end:1,status:'queued',precision:true,timing:{source_start:0,source_stable_at:1}};
afterEach(()=>vi.unstubAllGlobals());
it('preserves fully buffered OpenAI English speech and never plays source audio',async()=>{let release!:()=>void;const first=vi.fn();const push=vi.fn();const decoder=vi.fn(async()=>({getChannelData:()=>new Float32Array([.2,.3])}));const fetcher=vi.fn<(url:string,init:RequestInit)=>Promise<Response>>(async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2]));release=()=>{c.enqueue(new Uint8Array([3,4]));c.close();};}})));vi.stubGlobal('fetch',fetcher);const output=controlledOutput('da',{decodeAudioData:decoder} as unknown as AudioContext,{push,mark:vi.fn(),finish:vi.fn(async()=>{}),cancel:vi.fn(),firstByte:first},new AbortController().signal);output.send(unit);await vi.waitFor(()=>expect(first).toHaveBeenCalledOnce());expect(push).not.toHaveBeenCalled();expect(fetcher.mock.calls[0][0]).toBe('/api/speech');release();await output.finish();expect(decoder).toHaveBeenCalledOnce();expect(push).toHaveBeenCalledOnce();});
it('preserves Danish HTTP streaming across odd byte boundaries with no per-unit WebSocket dependency',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array([0,128,255]));c.enqueue(new Uint8Array([127,0,0]));c.close();}}),{headers:fixtureHeaders})));const push=vi.fn();const mark=vi.fn();const output=controlledOutput('en',{} as AudioContext,{push,mark,finish:vi.fn(async()=>{}),cancel:vi.fn()},new AbortController().signal);output.send({...unit,language:'en',target:'Hej.'});await output.finish();expect(push.mock.calls.every(([bytes])=>bytes.length%2===0)).toBe(true);const joined=push.mock.calls.flatMap(([bytes])=>[...bytes]);expect(joined).toEqual([0,128,255,127,0,0]);expect(mark.mock.calls.at(-1)).toEqual(['one',0,3,true]);});

it('uses the original whole-turn translator and withholds streamed intermediate text',async()=>{
 const {translateControlledTurn}=await import('../src/streaming/translationClient');
 const request={text:'No, the doctor is unavailable.',language:'en' as const,sourceHistory:'',targetHistory:'',conversationContext:'',speakerRole:'agent' as const,protectedTerms:[],precision:true};
 const fetcher=vi.fn<(url:string,init:RequestInit)=>Promise<Response>>(async()=>new Response('data: {"type":"first_text"}\n\ndata: {"type":"done","text":"Nej, lægen er ikke tilgængelig."}\n\n'));
 vi.stubGlobal('fetch',fetcher);
 const result=await translateControlledTurn(request,new AbortController().signal);
 expect(fetcher.mock.calls[0][0]).toBe('/api/translate/stream');
 expect(JSON.parse(String(fetcher.mock.calls[0][1].body))).toEqual({text:request.text,language:'en'});
 expect(result.translation).toBe('Nej, lægen er ikke tilgængelig.');
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('data: {"type":"first_text"}\n\n')));
 await expect(translateControlledTurn(request,new AbortController().signal)).rejects.toThrow('interrupted');
});
