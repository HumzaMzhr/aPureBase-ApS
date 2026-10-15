import type { Language } from './types';
export class LiveTranscription {
  private socket?: WebSocket; private failed?: Error; private committed=false; private completed=false;
  private readyReject?: (error:Error)=>void;private finalResolve?: (text:string)=>void;private finalReject?: (error:Error)=>void;
  private timer?: ReturnType<typeof setTimeout>;private signal?:AbortSignal;
  private aborted=()=>this.fail(new DOMException('Call ended','AbortError'));
  commitAt?:number; readyAt?:number;
  private fail(error:Error){if(this.completed)return;this.failed=error;this.readyReject?.(error);this.finalReject?.(error);this.close();}
  async open(language:Language,signal:AbortSignal,onPartial?:(text:string)=>void,profile:'standard'|'fast'='standard'){
    signal.throwIfAborted();this.signal=signal;
    const socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/transcription/live?language=${language}${onPartial?'&partials=1':''}${onPartial&&profile==='fast'?'&profile=fast':''}`);this.socket=socket;socket.binaryType='arraybuffer';
    await new Promise<void>((resolve,reject)=>{
      this.readyReject=reject;this.timer=setTimeout(()=>this.fail(new Error('Live transcription unavailable.')),10000);
      signal.addEventListener('abort',this.aborted,{once:true});
      socket.onmessage=event=>{
        if(signal.aborted)return;
        try{const message=JSON.parse(event.data);
          if(message.type==='ready'){clearTimeout(this.timer);this.readyReject=undefined;resolve();}
          if(message.type==='partial'&&onPartial&&!this.committed&&typeof message.text==='string'&&message.text.length<=12000)onPartial(message.text);
          if(message.type==='error')this.fail(new Error('Live transcription unavailable.'));
          if(message.type==='final'){
            if(!this.committed||typeof message.text!=='string'||!message.text.trim()||message.text.length>4000)return this.fail(new Error('Live transcription unavailable.'));
            this.completed=true;this.readyAt=performance.now();this.finalResolve?.(message.text);this.close();
          }
        }catch{this.fail(new Error('Live transcription unavailable.'));}
      };
      socket.onerror=()=>this.fail(new Error('Live transcription unavailable.'));
      socket.onclose=()=>{if(!this.completed&&!this.failed)this.fail(new Error('Live transcription unavailable.'));};
      if(signal.aborted)this.aborted();
    });
  }
  append(bytes:Uint8Array){this.signal?.throwIfAborted();if(this.failed)throw this.failed;if(this.committed||this.socket?.readyState!==WebSocket.OPEN||this.socket.bufferedAmount>1024*1024)throw new Error('Live transcription unavailable.');this.socket.send(bytes);}
  finish(){
    this.signal?.throwIfAborted();if(this.failed)return Promise.reject(this.failed);if(this.committed)return Promise.reject(new Error('Turn already committed.'));
    this.committed=true;this.commitAt=performance.now();
    return new Promise<string>((resolve,reject)=>{this.finalResolve=resolve;this.finalReject=reject;this.socket?.send(JSON.stringify({type:'commit'}));});
  }
  close(){if(!this.completed&&!this.failed){this.failed=new DOMException('Call ended','AbortError');this.readyReject?.(this.failed);this.finalReject?.(this.failed);}clearTimeout(this.timer);this.signal?.removeEventListener('abort',this.aborted);const socket=this.socket;if(socket){socket.onmessage=null;socket.onerror=null;socket.onclose=null;socket.close();}this.socket=undefined;}
}
