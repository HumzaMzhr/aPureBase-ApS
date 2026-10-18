import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ContinuousTranscription} from '../src/streaming/continuousTranscriptionClient';
class Socket {
 static OPEN=1;static last:Socket;readyState=1;bufferedAmount=0;binaryType='';onmessage:((e:{data:string})=>void)|null=null;onclose:(()=>void)|null=null;onerror:(()=>void)|null=null;send=vi.fn();close=vi.fn();
 constructor(public url:string){Socket.last=this;}message(data:unknown){this.onmessage?.({data:JSON.stringify(data)});}
}
beforeEach(()=>{vi.stubGlobal('WebSocket',Socket);vi.stubGlobal('location',{protocol:'http:',host:'localhost:5173'});});afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
async function ready(){const abort=new AbortController(),event=vi.fn(),error=vi.fn(),client=new ContinuousTranscription(event,error);const opening=client.open('en',abort.signal);Socket.last.message({type:'ready',model:'gpt-live-transcribe',delay:'low',sampleRate:24000});await opening;return{client,event,error,abort,socket:Socket.last};}
it('continues source append after commit, and delivers item-scoped events without source playback or API keys',async()=>{
 const s=await ready();s.client.append(new Uint8Array(4800));s.client.commit(0);s.client.append(new Uint8Array(4800));
 expect(s.socket.send).toHaveBeenCalledTimes(3);expect(s.socket.url).toBe('ws://localhost:5173/api/transcription/continuous?language=en');
 s.socket.message({type:'partial',generation:1,text:'Next.'});s.socket.message({type:'final',generation:0,text:'First.'});expect(s.event.mock.calls.map(([e])=>e.generation)).toEqual([1,0]);expect(s.client.model).toBe('gpt-live-transcribe');s.client.close();
});
it('stops on pressure before silently discarding a source frame',async()=>{const s=await ready();s.socket.bufferedAmount=1024*1024+1;expect(()=>s.client.append(new Uint8Array(4800))).toThrow('backpressure');expect(s.socket.send).not.toHaveBeenCalled();s.client.close();});
it('rejects setup and closes the socket on STOP, with no late events',async()=>{const abort=new AbortController(),event=vi.fn(),client=new ContinuousTranscription(event,vi.fn());const opening=client.open('en',abort.signal);const stopped=expect(opening).rejects.toMatchObject({name:'AbortError'});abort.abort();await stopped;Socket.last.message({type:'ready',sampleRate:24000});expect(event).not.toHaveBeenCalled();expect(Socket.last.close).toHaveBeenCalledOnce();});
it('times out setup without a leaked timer or socket',async()=>{vi.useFakeTimers();const client=new ContinuousTranscription(vi.fn(),vi.fn()),opening=client.open('da',new AbortController().signal);const failed=expect(opening).rejects.toThrow('timed out');await vi.advanceTimersByTimeAsync(15001);await failed;expect(vi.getTimerCount()).toBe(0);expect(Socket.last.close).toHaveBeenCalledOnce();});
it('reports a sanitized provider code, retains earlier captions and never replays after disconnect',async()=>{const s=await ready();s.socket.message({type:'partial',generation:0,text:'Existing words.'});s.socket.message({type:'error',code:'rate_limit_exceeded'});expect(s.error).toHaveBeenCalledWith(expect.objectContaining({message:expect.stringContaining('rate_limit_exceeded')}));s.socket.message({type:'partial',generation:0,text:'Late'});expect(s.event).toHaveBeenCalledOnce();expect(()=>s.client.append(new Uint8Array(4800))).toThrow('rate_limit_exceeded');});
it('accepts opt-in metadata without delivering it as recognition or changing error handling',async()=>{
 const trace=vi.fn(),event=vi.fn(),error=vi.fn(),client=new ContinuousTranscription(event,error,trace),opening=client.open('en',new AbortController().signal);
 expect(Socket.last.url).toContain('&diagnostics=1');Socket.last.message({type:'ready',model:'gpt-live-transcribe',sampleRate:24000});await opening;
 Socket.last.message({type:'diagnostic',event:'recognition.invalid_final',data:{itemId:'item-one',generation:2,empty:true,authorization:'hidden',audio:'raw-audio',transcript:'private'}});
 expect(trace).toHaveBeenCalledWith('recognition.invalid_final',{itemId:'item-one',generation:2,empty:true});expect(event).not.toHaveBeenCalled();Socket.last.message({type:'error',code:'invalid_final'});expect(error).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({message:expect.stringContaining('invalid_final')}));
});
