import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {expect,it} from 'vitest';
it('flushes final PCM exactly once and stops processing before the recognizer commits',()=>{
 const messages:{type:string;audio?:ArrayBuffer}[]=[];let Processor!:new()=>{process:(input:Float32Array[][])=>boolean;port:{onmessage:(event:{data:{type:string}})=>void}};
 class Base{port={onmessage:null,postMessage:(message:{type:string;audio?:ArrayBuffer})=>messages.push(message)};}
 runInNewContext(readFileSync('public/pcm-capture.js','utf8'),{AudioWorkletProcessor:Base,currentFrame:0,sampleRate:24000,registerProcessor:(_name:string,value:typeof Processor)=>{Processor=value;}});
 const processor=new Processor();expect(processor.process([[new Float32Array([1,-1,.5])]])).toBe(true);expect(messages).toHaveLength(0);processor.port.onmessage({data:{type:'flush'}});expect(messages.map(m=>m.type)).toEqual(['pcm','flushed']);const view=new DataView(messages[0].audio!);expect([view.getInt16(0,true),view.getInt16(2,true),view.getInt16(4,true)]).toEqual([32767,-32767,16384]);expect(processor.process([[new Float32Array(4800)]] )).toBe(false);expect(messages).toHaveLength(2);
});
