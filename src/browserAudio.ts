import type { CallIO, CallOptions, Capture, Language, StreamingEvents, VoiceInfo, TextEvents } from './types';
import { validateDecision } from './decision';
import { LiveTranscription } from './liveTranscription';
import { readSse } from './sse';
import { playPcmStream } from './pcmPlayback';
import {assertDanishVoice,responseVoice,type VoiceIdentity} from './streaming/voiceIdentity';
export function isChrome(userAgent = navigator.userAgent) { return /Chrome\//.test(userAgent) && !/Edg\//.test(userAgent); }
export class EndOfTurn {
  started = false; lastVoice = 0; private voicedSince?: number;
  constructor(private silenceMs: number, private manual: boolean) {}
  sample(now: number, rms: number) {
    if (rms >= 0.018) {
      this.voicedSince ??= now; this.lastVoice = now;
      if (now - this.voicedSince >= 90) this.started = true;
    } else this.voicedSince = undefined;
    return this.started && !this.manual && now - this.lastVoice >= this.silenceMs;
  }
}
export class BrowserCallIO implements CallIO {
  private context?: AudioContext;
  private streams: Partial<Record<Language, MediaStream>> = {};
  private options?: CallOptions;
  private audio = new Audio();
  private finishTurn?: () => void;
  private stopCapture?: () => void;
  private stopPlayback?: () => void;
  private cached = new Map<string, Blob>();private blobVoices=new WeakMap<Blob,VoiceIdentity>();private danishVoice?:VoiceIdentity;private cachedVoices:Record<string,VoiceIdentity>={};
  private owner?: object;
  private audioVersion?: string;
  private mode: 'file' | 'realtime' = 'file';
  private textStreaming = false;
  private stopRecognition?: () => void;
  private clinicSilence = 650;
  async recommend(text: string, signal: AbortSignal) {
    const response=await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,language:'da'}),signal});
    if(!response.ok)throw new Error('Recommendation unavailable. Human review required.');
    return validateDecision(await response.json(),text);
  }
  now = () => performance.now();
  async prepare(options: CallOptions, signal: AbortSignal) {
    this.options = options;
    if (!isChrome()) throw new Error('For this technical demo, please use Google Chrome.');
    // This method is invoked synchronously from the Start user gesture.
    this.context = new AudioContext({sampleRate:24000}); await this.context.resume(); signal.throwIfAborted();
    const response = await fetch('/api/health', { signal });
    if (!response.ok) throw new Error('Local interpreter service is unavailable.');
    const health = await response.json() as { ready: boolean; missingAudio: string[]; danishVoice?: VoiceInfo; audioVersion?: string; cachedPhrases?: string[];cachedVoices?:Record<string,VoiceIdentity>; models?: { transcriptionMode?: 'file'|'realtime'; textStreaming?: boolean; clinicSilenceMs?: number } };
    signal.throwIfAborted();
    this.mode=options.transcriptionMode ?? health.models?.transcriptionMode ?? 'file'; this.textStreaming=health.models?.textStreaming ?? false; this.clinicSilence=options.clinicSilenceMs ?? health.models?.clinicSilenceMs ?? 650;
    if(this.mode==='realtime' && this.context.sampleRate!==24000)throw new Error('24 kHz audio input is required for live transcription.');
    if(this.mode==='realtime') await this.context.audioWorklet.addModule('/pcm-capture.js'); signal.throwIfAborted();
    if (!health.ready) throw new Error('Set OPENAI_API_KEY in .env and restart the server.');
    if (health.missingAudio?.length) throw new Error('Demo recordings are missing. Run npm run generate:audio once, then start again.');
    if (health.audioVersion !== this.audioVersion) { this.cached.clear(); this.audioVersion = health.audioVersion; }
    assertDanishVoice(health.danishVoice);this.danishVoice=health.danishVoice;this.cachedVoices=health.cachedVoices??{};
    // Warm all fixed phrases once so phrase clicks need neither AI nor an asset request.
    await Promise.all((health.cachedPhrases ?? []).map(url => this.load(url, signal))); signal.throwIfAborted();
    if (!options.demo) {
      await this.acquire('da', options.clinicMic, signal);
      // A single physical mic is sufficient for strict alternating turns.
      if (options.agentMic === options.clinicMic) this.streams.en = this.streams.da;
      else await this.acquire('en', options.agentMic, signal);
    }
    this.disableInputs();
    return health.danishVoice;
  }
  private async acquire(language: Language, device: string, signal: AbortSignal) {
    signal.throwIfAborted();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { ...(device ? { deviceId: { exact: device } } : {}), echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    if (signal.aborted) { stream.getTracks().forEach(t => t.stop()); signal.throwIfAborted(); }
    stream.getAudioTracks().forEach(t => { t.enabled = false; }); this.streams[language] = stream;
    return stream;
  }
  private disableInputs() { Object.values(this.streams).forEach(s => s?.getAudioTracks().forEach(t => { t.enabled = false; })); }
  async load(url: string, signal: AbortSignal) {
    if (this.cached.has(url)) return this.cached.get(url)!;
    const response = await fetch(this.audioVersion ? `${url}?v=${this.audioVersion}` : url, { signal });
    if (!response.ok) throw new Error('Pre-generated demo audio is unavailable. Run npm run generate:audio.');
    const audio = await response.blob(); signal.throwIfAborted(); if (audio.size < 1000) throw new Error('Invalid demo audio asset.');
    const voice=this.cachedVoices[url];if(voice){assertDanishVoice(voice,this.danishVoice);this.blobVoices.set(audio,voice);}this.cached.set(url, audio); return audio;
  }
  async play(blob: Blob, language: Language, signal: AbortSignal, started: () => void) {
    if(language==='da')assertDanishVoice(this.blobVoices.get(blob),this.danishVoice);
    if (this.owner) throw new Error('Audio is already owned by another operation.');
    const lease = {}; this.owner = lease;
    try {
    this.disableInputs(); signal.throwIfAborted();
    if (this.stopPlayback) throw new Error('Another audio output owns playback.');
    const output = language === 'da' ? this.options?.clinicOutput : this.options?.agentOutput;
    if (output && this.audio.setSinkId) await this.audio.setSinkId(output);
    else if (this.audio.setSinkId) await this.audio.setSinkId('');
    signal.throwIfAborted();
    const url = URL.createObjectURL(blob); this.audio.src = url;
    await new Promise<void>((resolve, reject) => {
      let announced = false;
      const cleanup = () => {
        signal.removeEventListener('abort', aborted); this.audio.onended = null; this.audio.onplaying = null; this.audio.onerror = null;
        this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); URL.revokeObjectURL(url); this.stopPlayback = undefined;
      };
      const fail = (error: Error) => { cleanup(); reject(error); };
      const aborted = () => fail(new DOMException('Call ended', 'AbortError'));
      this.stopPlayback = aborted; signal.addEventListener('abort', aborted, { once: true });
      this.audio.onplaying = () => { if (!announced) { announced = true; started(); } };
      this.audio.onended = () => { cleanup(); resolve(); };
      this.audio.onerror = () => fail(new Error('Audio playback failed. Check Chrome audio permissions.'));
      void this.audio.play().catch(() => fail(new Error('Playback blocked. Allow sound in Chrome and start again.')));
    });
    } finally { if (this.owner === lease) this.owner = undefined; }
  }
  async capture(language: Language, signal: AbortSignal, speaking: () => void): Promise<Capture> {
    if (this.owner) throw new Error('Audio is already owned by another operation.');
    const lease = {}; this.owner = lease;
    try {
    if(this.mode==='realtime') return await this.captureRealtime(language,signal,speaking);
    this.disableInputs(); signal.throwIfAborted();
    const stream = this.streams[language] ?? await this.acquire(language, language === 'en' ? this.options?.agentMic ?? '' : this.options?.clinicMic ?? '', signal);
    signal.throwIfAborted();
    const track = stream.getAudioTracks()[0];
    if (track.readyState !== 'live') throw new Error('Microphone disconnected. Start a new call.');
    track.enabled = true;
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t));
    if (!mimeType || !this.context) throw new Error('For this technical demo, please use Google Chrome.');
    const recorder = new MediaRecorder(stream, { mimeType });
    const node = this.context.createMediaStreamSource(stream); const analyser = this.context.createAnalyser(); analyser.fftSize = 1024; node.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize); const vad = new EndOfTurn(language==='da'?this.clinicSilence:this.options?.silenceMs ?? 450, this.options?.manual ?? false);
    return await new Promise<Capture>((resolve, reject) => {
      const chunks: Blob[] = []; let finished = false; let bytes = 0; let endAt = this.now(); let confirmedAt = this.now(); let kind: Capture['finalization'] = 'silence'; const begin = this.now();
      const cleanup = () => {
        clearInterval(timer); node.disconnect(); analyser.disconnect(); track.enabled = false; track.onended = null;
        signal.removeEventListener('abort', aborted); this.finishTurn = undefined; this.stopCapture = undefined;
      };
      const fail = (error: Error) => {
        if (finished) return; finished = true; recorder.ondataavailable = null; recorder.onstop = null;
        if (recorder.state !== 'inactive') recorder.stop(); cleanup(); reject(error);
      };
      const aborted = () => fail(new DOMException('Call ended', 'AbortError'));
      const finalize = (manual: boolean) => {
        if (finished) return;
        if (!vad.started) { if (manual) fail(new Error('No speech detected. Start a new call and check the microphone.')); return; }
        finished = true; kind = manual ? 'manual' : 'silence'; endAt = vad.lastVoice; confirmedAt = this.now();
        track.enabled = false; clearInterval(timer); recorder.stop();
      };
      const timer = setInterval(() => {
        if (this.context?.state !== 'running') return;
        analyser.getFloatTimeDomainData(buffer); const energy = Math.sqrt(buffer.reduce((s, v) => s + v * v, 0) / buffer.length);
        const previously = vad.started; const done = vad.sample(this.now(), energy);
        if (vad.started && !previously) speaking();
        if (done) finalize(false);
        // Never silently split/truncate long utterances to reduce latency.
        if (this.now() - begin > 180000) fail(new Error('Recording exceeded three minutes. Use a shorter complete turn.'));
      }, 30);
      this.finishTurn = () => finalize(true); this.stopCapture = aborted; signal.addEventListener('abort', aborted, { once: true });
      track.onended = () => fail(new Error('Microphone disconnected. Start a new call.'));
      recorder.ondataavailable = e => {
        if (e.data.size) { chunks.push(e.data); bytes += e.data.size; }
        if (bytes > 20 * 1024 * 1024 && !finished) fail(new Error('Recording exceeds the demo size limit.'));
      };
      recorder.onerror = () => fail(new Error('Microphone recording failed.'));
      recorder.onstop = () => { cleanup(); resolve({ audio: new Blob(chunks, { type: mimeType }), endedAt: endAt, confirmedAt, finalization: kind }); };
      recorder.start(250);
    });
    } finally { if (this.owner === lease) this.owner = undefined; }
  }
  private async captureRealtime(language: Language, signal: AbortSignal, speaking: () => void): Promise<Capture> {
    this.disableInputs(); signal.throwIfAborted();
    const context=this.context; if(!context)throw new Error('Audio context unavailable.');
    const stream=this.streams[language]??await this.acquire(language,language==='en'?this.options?.agentMic??'':this.options?.clinicMic??'',signal);
    const track=stream.getAudioTracks()[0];if(track.readyState!=='live')throw new Error('Microphone disconnected.');
    const recognition=new LiveTranscription();const stop=()=>recognition.close();this.stopRecognition=stop;
    try {
      await recognition.open(language,signal); signal.throwIfAborted();
      const source=context.createMediaStreamSource(stream);const analyser=context.createAnalyser();analyser.fftSize=1024;source.connect(analyser);
      const processor=new AudioWorkletNode(context,'pcm-capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],channelCount:1});
      const mute=context.createGain();mute.gain.value=0;source.connect(processor);processor.connect(mute);mute.connect(context.destination);
      const recorder=new MediaRecorder(stream,{mimeType:'audio/webm;codecs=opus'});const chunks:Blob[]=[];
      const samples=new Float32Array(analyser.fftSize);const vad=new EndOfTurn(language==='da'?this.clinicSilence:this.options?.silenceMs??650,this.options?.manual??false);
      return await new Promise<Capture>((resolve,reject)=>{
        let settled=false;let finalizing=false;let committed=false;let flushResolve:(()=>void)|undefined;let flushTimer:ReturnType<typeof setTimeout>|undefined;let bytes=0;
        let recordingStopped!:()=>void;const stopped=new Promise<void>(r=>{recordingStopped=r;});const begin=this.now();
        const cleanup=()=>{clearInterval(timer);clearTimeout(flushTimer);signal.removeEventListener('abort',aborted);track.enabled=false;track.onended=null;this.finishTurn=undefined;this.stopCapture=undefined;source.disconnect();analyser.disconnect();processor.disconnect();mute.disconnect();processor.port.onmessage=null;processor.port.close();recorder.ondataavailable=null;recorder.onstop=null;recorder.onerror=null;recognition.close();if(recorder.state!=='inactive')recorder.stop();};
        const fail=(error:Error)=>{if(settled)return;settled=true;cleanup();reject(error);};const aborted=()=>fail(new DOMException('Call ended','AbortError'));
        const finalize=async(manual:boolean)=>{
          if(settled||finalizing)return;if(!vad.started){if(manual)fail(new Error('No speech detected.'));return;}
          finalizing=true;const endedAt=vad.lastVoice;const confirmedAt=this.now();track.enabled=false;clearInterval(timer);recorder.stop();
          try {
            const flushed=new Promise<void>((r,j)=>{flushResolve=r;flushTimer=setTimeout(()=>j(new Error('Microphone audio flush failed.')),2000);});
            processor.port.postMessage({type:'flush'});await flushed;clearTimeout(flushTimer);signal.throwIfAborted();
            committed=true;const transcript=await recognition.finish();signal.throwIfAborted();await stopped;
            if(settled)return;settled=true;const audio=new Blob(chunks,{type:'audio/webm;codecs=opus'});cleanup();
            resolve({audio,endedAt,confirmedAt,transcriptionStarted:recognition.commitAt,transcriptReady:recognition.readyAt,transcript,finalization:manual?'manual':'silence'});
          }catch(error){fail(error instanceof Error?error:new Error('Live transcription unavailable.'));}
        };
        processor.port.onmessage=event=>{if(settled||signal.aborted)return;try{if(event.data.type==='pcm'&&!committed){const pcm=new Uint8Array(event.data.audio);bytes+=pcm.length;if(bytes>20*1024*1024)throw new Error('Recording exceeds limit.');recognition.append(pcm);}if(event.data.type==='flushed')flushResolve?.();}catch(error){fail(error instanceof Error?error:new Error('Live transcription unavailable.'));}};
        recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};recorder.onstop=()=>recordingStopped();recorder.onerror=()=>fail(new Error('Microphone recording failed.'));
        const timer=setInterval(()=>{if(context.state!=='running')return;analyser.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((s,v)=>s+v*v,0)/samples.length);const previously=vad.started;const done=vad.sample(this.now(),rms);if(vad.started&&!previously)speaking();if(done)void finalize(false);if(this.now()-begin>180000)fail(new Error('Recording exceeded three minutes.'));},30);
        this.finishTurn=()=>void finalize(true);this.stopCapture=aborted;signal.addEventListener('abort',aborted,{once:true});track.onended=()=>fail(new Error('Microphone disconnected.'));track.enabled=true;recorder.start(250);if(signal.aborted)aborted();
      });
    } finally { recognition.close(); if(this.stopRecognition===stop)this.stopRecognition=undefined; }
  }
  async simulate(blob: Blob, language: Language, signal: AbortSignal, speaking: () => void): Promise<Capture> {
    if (!this.context) throw new Error('Audio context is unavailable.');
    const buffer = await this.context.decodeAudioData(await blob.arrayBuffer()); signal.throwIfAborted();
    const samples = buffer.getChannelData(0); const vad = new EndOfTurn(language==='da'?this.clinicSilence:this.options?.silenceMs ?? 650, false);
    const recognition=this.mode==='realtime'?new LiveTranscription():undefined;const stop=()=>recognition?.close();if(recognition)this.stopRecognition=stop;
    let timer: ReturnType<typeof setInterval> | undefined; let endAt = this.now();let sent=0;let fault:Error|undefined;
    const sendThrough=(at:number)=>{if(!recognition)return;const end=Math.min(samples.length,Math.max(sent,at));for(let offset=sent;offset<end;offset+=2400){const count=Math.min(2400,end-offset);const bytes=new Uint8Array(count*2);const view=new DataView(bytes.buffer);for(let i=0;i<count;i++)view.setInt16(i*2,Math.round(Math.max(-1,Math.min(1,samples[offset+i]))*32767),true);recognition.append(bytes);}sent=end;};
    try {
      await recognition?.open(language,signal);signal.throwIfAborted();
      await this.play(blob, language, signal, () => {
        speaking();
        timer = setInterval(() => {
          try{const at=Math.floor(this.audio.currentTime*buffer.sampleRate);const frame=samples.subarray(Math.max(0,at-Math.round(buffer.sampleRate*.03)),at);const rms=frame.length?Math.sqrt(frame.reduce((s,v)=>s+v*v,0)/frame.length):0;vad.sample(this.now(),rms);if(rms>=.018)endAt=this.now();sendThrough(at);}catch(error){fault=error instanceof Error?error:new Error('Live transcription unavailable.');}
        },30);
      });
      clearInterval(timer);if(fault)throw fault;sendThrough(samples.length);
      signal.throwIfAborted();await this.pause(Math.max(0,(language==='da'?this.clinicSilence:this.options?.silenceMs??650)-(this.now()-endAt)),signal);
      const confirmedAt=this.now();const transcript=await recognition?.finish();signal.throwIfAborted();
      return {audio:blob,endedAt:endAt,confirmedAt,transcriptionStarted:recognition?.commitAt,transcriptReady:recognition?.readyAt,transcript,finalization:'simulation'};
    } finally { clearInterval(timer); recognition?.close();if(this.stopRecognition===stop)this.stopRecognition=undefined; }
  }
  finish() { this.finishTurn?.(); }
  cancel() {
    this.owner = undefined;
    this.stopCapture?.(); this.stopPlayback?.(); this.stopRecognition?.(); this.stopRecognition=undefined; this.disableInputs();
    Object.values(this.streams).forEach(s => s?.getTracks().forEach(t => t.stop())); this.streams = {};
    void this.context?.close().catch(() => {}); this.context = undefined;
  }
  async transcribe(audio: Blob, source: Language, signal: AbortSignal) {
    const response = await fetch('/api/transcribe', { method: 'POST', headers: { 'Content-Type': audio.type, 'X-Source-Language': source }, body: audio, signal });
    const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Transcription failed.'); return body.text as string;
  }
  async translate(text: string, language: Language, signal: AbortSignal, events?: TextEvents) {
    events?.requestStarted();
    const response = await fetch(this.textStreaming ? '/api/translate/stream' : '/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, language }), signal });
    if (!response.ok) throw new Error('Translation unavailable.');
    if (this.textStreaming) {
      if(!response.body)throw new Error('Translation stream unavailable.');
      for await(const event of readSse(response.body)) { signal.throwIfAborted();if(event.type==='first_text')events?.firstText();if(event.type==='done'&&typeof event.text==='string'&&event.text.trim())return event.text; }
      throw new Error('Translation stream interrupted. No audio will play.');
    }
    const body = await response.json(); events?.firstText(); return body.text as string;
  }
  async speech(text: string, language: Language, signal: AbortSignal) {
    const response = await fetch('/api/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, language }), signal });
    if (!response.ok) { const body = await response.json(); throw new Error(body.error ?? 'Voice generation failed.'); }
    const audio=await response.blob();if(language==='da'){const voice=responseVoice(response);assertDanishVoice(voice,this.danishVoice);this.blobVoices.set(audio,voice);}return audio;
  }
  async streamDanish(text: string, signal: AbortSignal, events: StreamingEvents) {
    if (this.owner) throw new Error('Audio is already owned by another operation.');
    const lease = {}; this.owner = lease; const abort = new AbortController();
    const combined = AbortSignal.any([signal, abort.signal]); const stop = () => abort.abort(); this.stopPlayback = stop;
    try {
      this.disableInputs(); combined.throwIfAborted();
      const context = this.context;
      if (!context || context.state !== 'running') throw new Error('Voice generation unavailable.');
      const output = this.options?.clinicOutput ?? '';
      const sinkContext = context as AudioContext & { setSinkId?: (id: string) => Promise<void> };
      if (sinkContext.setSinkId) await sinkContext.setSinkId(output);
      else if (output) throw new Error('Voice generation unavailable.');
      combined.throwIfAborted(); events.requestStarted();
      const response = await fetch('/api/speech/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, language: 'da' }), signal: combined });
      if (!response.ok || !response.body || response.headers.get('X-Audio-Sample-Rate') !== '24000' || !response.headers.get('Content-Type')?.startsWith('audio/pcm')) throw new Error('Voice generation unavailable.');
      assertDanishVoice(responseVoice(response),this.danishVoice);
      await playPcmStream(context, response.body, combined, events);
    } catch (error) { throw combined.aborted ? new DOMException('Call ended', 'AbortError') : error instanceof Error && error.message === 'Voice generation unavailable.' ? error : new Error('Voice generation unavailable.'); }
    finally { abort.abort(); if (this.stopPlayback === stop) this.stopPlayback = undefined; if (this.owner === lease) this.owner = undefined; }
  }
  pause(ms: number, signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      signal.throwIfAborted();
      const aborted = () => { clearTimeout(timer); signal.removeEventListener('abort', aborted); reject(new DOMException('Call ended', 'AbortError')); };
      const timer = setTimeout(() => { signal.removeEventListener('abort', aborted); resolve(); }, ms);
      signal.addEventListener('abort', aborted, { once: true });
    });
  }
}
