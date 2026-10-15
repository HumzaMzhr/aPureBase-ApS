/* Microphone PCM only. No recognition, translation or speech generation here. */
class PcmCapture extends AudioWorkletProcessor {
  buffer = new Int16Array(2400);
  used = 0;
  frameStart = 0;
  finished = false;
  constructor() {
    super();
    this.port.onmessage = event => { if(event.data.type==='checkpoint'){this.emit();this.port.postMessage({type:'checkpointed'});} if (event.data.type === 'flush') { this.finished = true; this.emit(); this.port.postMessage({type:'flushed'}); } };
  }
  emit() {
    if (!this.used) return;
    const bytes = new Uint8Array(this.used * 2); const view = new DataView(bytes.buffer);
    for (let i=0;i<this.used;i++) view.setInt16(i*2,this.buffer[i],true);
    this.port.postMessage({type:'pcm',audio:bytes.buffer,frameStart:this.frameStart,frameEnd:this.frameStart+this.used,sampleRate},[bytes.buffer]); this.used=0;
  }
  process(inputs) {
    if (this.finished) return false;
    const input=inputs[0]?.[0];
    if (input) for (let i=0;i<input.length;i++) { if(!this.used)this.frameStart=currentFrame+i;this.buffer[this.used++]=Math.round(Math.max(-1,Math.min(1,input[i]))*32767); if(this.used===2400)this.emit(); }
    return true;
  }
}
registerProcessor('pcm-capture',PcmCapture);
