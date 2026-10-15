import type {Language} from '../types';
export interface RecognitionEvent {type:'partial'|'final'|'committed';generation:number;text?:string;itemId?:string}
export class ContinuousTranscription {
 private socket?:WebSocket;private signal?:AbortSignal;private timer?:ReturnType<typeof setTimeout>;private failed?:Error;private rejectReady?:(e:Error)=>void;
 model='gpt-live-transcribe';delay='low';
 constructor(private event:(event:RecognitionEvent)=>void,private error:(e:Error)=>void){}
 private aborted=()=>this.close();
 private fail(error:Error){if(this.failed)return;this.failed=error;this.rejectReady?.(error);this.close();this.error(error);}
 async open(language:Language,signal:AbortSignal){
  signal.throwIfAborted();this.signal=signal;
  const socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/transcription/continuous?language=${language}`);this.socket=socket;socket.binaryType='arraybuffer';
  await new Promise<void>((resolve,reject)=>{
   this.rejectReady=reject;this.timer=setTimeout(()=>this.fail(new Error('Realtime recognition setup timed out. Restart the test.')),15000);signal.addEventListener('abort',this.aborted,{once:true});
   socket.onmessage=e=>{if(signal.aborted||this.failed)return;try{
    const event=JSON.parse(e.data);
    if(event.type==='ready'){if(event.sampleRate!==24000)throw new Error('Recognition requires PCM16 mono at 24 kHz.');clearTimeout(this.timer);this.model=event.model;this.delay=event.delay;this.rejectReady=undefined;resolve();}
    else if(event.type==='error')throw new Error(`Realtime recognition stopped (${event.code??'provider_error'}). Retained text is available; restart the test.`);
    else if(['partial','final','committed'].includes(event.type)){if(!Number.isInteger(event.generation)||event.generation<0||event.type!=='committed'&&(typeof event.text!=='string'||event.text.length>12000))throw new Error('Invalid recognition event.');this.event(event);}
   }catch(error){this.fail(error instanceof Error?error:new Error('Recognition failed.'));}};
   socket.onerror=()=>this.fail(new Error('Realtime recognition connection failed. Restart the test.'));
   socket.onclose=()=>this.fail(new Error('Realtime recognition disconnected. No audio is replayed automatically; restart the test.'));
  });
 }
 append(bytes:Uint8Array){this.send(bytes);}
 commit(generation:number){this.send(JSON.stringify({type:'commit',generation}));}
 private send(data:Uint8Array|string){this.signal?.throwIfAborted();if(this.failed)throw this.failed;if(this.socket?.readyState!==WebSocket.OPEN||this.socket.bufferedAmount>1024*1024)throw new Error('Realtime recognition audio backpressure. Stop speaking and restart; audio was not discarded silently.');this.socket.send(data);}
 close(){clearTimeout(this.timer);this.signal?.removeEventListener('abort',this.aborted);if(!this.failed)this.failed=new DOMException('Recognition ended','AbortError');this.rejectReady?.(this.failed);this.rejectReady=undefined;if(this.socket){this.socket.onmessage=null;this.socket.onclose=null;this.socket.onerror=null;this.socket.close();this.socket=undefined;}}
}
