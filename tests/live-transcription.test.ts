import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { LiveTranscription } from '../src/liveTranscription';
class Socket {
  static OPEN=1;static last:Socket;readyState=1;bufferedAmount=0;binaryType='';url:string;
  onmessage:((e:{data:string})=>void)|null=null;onerror:(()=>void)|null=null;onclose:(()=>void)|null=null;
  send=vi.fn();close=vi.fn(()=>{this.readyState=3;});
  constructor(url:string){this.url=url;Socket.last=this;}
  message(data:unknown){this.onmessage?.({data:JSON.stringify(data)});}
}
beforeEach(()=>{vi.stubGlobal('WebSocket',Socket);vi.stubGlobal('location',{protocol:'http:',host:'localhost:5173'});});afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
async function open(){const signal=new AbortController();const client=new LiveTranscription();const pending=client.open('da',signal.signal);Socket.last.message({type:'ready'});await pending;return {client,signal,socket:Socket.last};}
it('streams recognition audio to the local server with no browser API key and releases text only after commit',async()=>{
  const {client,socket}=await open();expect(socket.url).toBe('ws://localhost:5173/api/transcription/live?language=da');
  client.append(new Uint8Array([1,2]));expect(socket.send).toHaveBeenCalledWith(new Uint8Array([1,2]));
  const pending=client.finish();expect(JSON.parse(socket.send.mock.calls.at(-1)![0])).toEqual({type:'commit'});
  let resolved=false;void pending.then(()=>{resolved=true;});await Promise.resolve();expect(resolved).toBe(false);
  socket.message({type:'final',text:'Jeg skal spørge lægen først.'});expect(await pending).toBe('Jeg skal spørge lægen først.');expect(client.readyAt).toBeGreaterThanOrEqual(client.commitAt!);expect(socket.close).toHaveBeenCalledOnce();
});
it('rejects premature completion and never exposes it as a final turn',async()=>{
  const {client,socket}=await open();socket.message({type:'final',text:'Premature'});await expect(client.finish()).rejects.toThrow('Live transcription unavailable.');expect(socket.close).toHaveBeenCalledOnce();
});
it('End Call aborts finalization and ignores late text',async()=>{
  const {client,signal,socket}=await open();const pending=client.finish();const rejected=expect(pending).rejects.toMatchObject({name:'AbortError'});signal.abort();await rejected;
  socket.message({type:'final',text:'Stale words'});expect(client.readyAt).toBeUndefined();expect(socket.close).toHaveBeenCalledOnce();
});
it('does not accept more source audio after utterance commit',async()=>{
  const {client,socket}=await open();const pending=client.finish();expect(()=>client.append(new Uint8Array([1,2]))).toThrow();socket.message({type:'final',text:'Complete'});await pending;
});
it('times out setup cleanly with no pending timer or leaked socket',async()=>{
  vi.useFakeTimers();const client=new LiveTranscription();const pending=client.open('en',new AbortController().signal);const rejected=expect(pending).rejects.toThrow('Live transcription unavailable.');await vi.advanceTimersByTimeAsync(10001);await rejected;expect(vi.getTimerCount()).toBe(0);expect(Socket.last.close).toHaveBeenCalledOnce();
});
it('enables display-only partials explicitly while preserving the controlled final-only URL',async()=>{const client=new LiveTranscription();const partial=vi.fn();const pending=client.open('en',new AbortController().signal,partial);Socket.last.message({type:'ready'});await pending;expect(Socket.last.url).toContain('&partials=1');Socket.last.message({type:'partial',text:'Hello, my name'});expect(partial).toHaveBeenCalledWith('Hello, my name');const final=client.finish();Socket.last.message({type:'partial',text:'late partial'});expect(partial).toHaveBeenCalledOnce();Socket.last.message({type:'final',text:'Hello, my name is Humza.'});expect(await final).toBe('Hello, my name is Humza.');});

it('opts into earlier recognition only for an explicit partial-transcript trial',async()=>{
 const controlled=new LiveTranscription();const first=controlled.open('en',new AbortController().signal,undefined,'fast');Socket.last.message({type:'ready'});await first;expect(Socket.last.url).not.toContain('profile=fast');controlled.close();
 const streaming=new LiveTranscription();const second=streaming.open('da',new AbortController().signal,vi.fn(),'fast');Socket.last.message({type:'ready'});await second;expect(Socket.last.url).toContain('partials=1&profile=fast');streaming.close();
});
