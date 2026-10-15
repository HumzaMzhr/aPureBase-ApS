import { opening, phrases, phraseAudio, type Phrase } from './config/phrases';
import { scenarios, type ScriptLine } from './config/scenarios';
import { validateDecision } from './decision';
import { extractEmail } from './email';
import type { CallIO, CallOptions, CallState, Capture, Language, Snapshot, Timing, Turn } from './types';

export const transitions: Record<CallState, CallState[]> = {
  IDLE: ['OPENING_READY'], OPENING_READY: ['PLAYING_OPENING_DANISH'], PLAYING_OPENING_DANISH: ['LISTENING_DANISH'],
  LISTENING_DANISH: ['DANISH_SPEAKING', 'PROCESSING_DANISH'], DANISH_SPEAKING: ['PROCESSING_DANISH'],
  PROCESSING_DANISH: ['PLAYING_ENGLISH'], PLAYING_ENGLISH: ['WAITING_FOR_AGENT'],
  WAITING_FOR_AGENT: ['ENGLISH_SPEAKING', 'PLAYING_DANISH'], ENGLISH_SPEAKING: ['PROCESSING_ENGLISH'],
  PROCESSING_ENGLISH: ['PLAYING_DANISH'], PLAYING_DANISH: ['LISTENING_DANISH'],
  CALL_COMPLETE: ['OPENING_READY'], ERROR: ['OPENING_READY', 'PROCESSING_ENGLISH']
};
export class CallController {
  snapshot: Snapshot = { state: 'IDLE', turns: [], error: '' };
  private abort = new AbortController();
  private options?: CallOptions;
  private turnNumber = 0;
  private clinicIndex = 0;
  private actionPending = false;
  private microphoneTurn = false;
  private retryTurn?: { captured: Capture; original: string; translated: string; timing: Timing; id: string };
  constructor(private io: CallIO, private notify: (snapshot: Snapshot) => void) {}
  get active() { return !['IDLE', 'CALL_COMPLETE', 'ERROR'].includes(this.snapshot.state); }
  get canFinish() { return this.microphoneTurn && ['DANISH_SPEAKING', 'ENGLISH_SPEAKING'].includes(this.snapshot.state); }
  private emit() { this.notify({ ...this.snapshot, turns: [...this.snapshot.turns] }); }
  private set(state: CallState) {
    if (!transitions[this.snapshot.state].includes(state)) throw new Error(`Invalid call transition ${this.snapshot.state} → ${state}`);
    this.snapshot = { ...this.snapshot, state }; this.emit();
  }
  private live(signal: AbortSignal) { signal.throwIfAborted(); }
  private async guarded(action: (signal: AbortSignal) => Promise<void>) {
    if (this.actionPending) return;
    this.actionPending = true; const signal = this.abort.signal;
    try { await action(signal); } catch (error) {
      if (!signal.aborted) {
        this.abort.abort(); this.io.cancel();
        this.snapshot = { ...this.snapshot, state: 'ERROR', error: error instanceof Error ? error.message : 'Call failed.', retryable: Boolean(this.retryTurn && error instanceof Error && error.message === 'Voice generation unavailable.') }; this.emit();
      }
    } finally { if (signal === this.abort.signal) this.actionPending = false; }
  }
  async start(options: CallOptions) {
    if (this.active || this.actionPending) return;
    this.retryTurn = undefined; this.abort = new AbortController(); this.options = options; this.clinicIndex = 0; this.turnNumber = 0;
    this.snapshot = { ...this.snapshot, turns: [], timing: undefined, decision: undefined, recommendationMs: undefined, cachePlaybackMs: undefined, error: '', retryable: false }; this.set('OPENING_READY');
    await this.guarded(async signal => {
      const voice = await this.io.prepare(options, signal); this.live(signal);
      this.snapshot = { ...this.snapshot, voice: voice || undefined };
      await this.recorded(opening, true, signal);
      await this.listenClinic(signal);
    });
  }
  private append(turn: Turn) {
    // Turn IDs are local and stable; no streaming fragments enter the transcript.
    if (this.snapshot.turns.some(t => t.id === turn.id)) return;
    this.snapshot = { ...this.snapshot, turns: [...this.snapshot.turns, turn] }; this.emit();
  }
  private async recorded(phrase: Phrase, isOpening: boolean, signal: AbortSignal) {
    const audio = await this.io.load(phraseAudio(phrase.id), signal); this.live(signal);
    this.snapshot = { ...this.snapshot, timing: undefined };
    const requested=this.io.now();
    this.set(isOpening ? 'PLAYING_OPENING_DANISH' : 'PLAYING_DANISH');
    await this.io.play(audio, 'da', signal, () => {
      this.live(signal);
      if(!isOpening){this.snapshot={...this.snapshot,cachePlaybackMs:this.io.now()-requested};}
      this.append({ id: `${++this.turnNumber}-${phrase.id}`, speaker: isOpening ? 'SYSTEM' : 'AGENT', sourceLanguage: 'da', original: phrase.da, translated: phrase.en, timestamp: new Date().toISOString(), method: 'PRERECORDED' });
    });
    this.live(signal);
    if (phrase.id === 'thank-you') { this.end(true); return; }
    await this.io.pause(180, signal); this.live(signal);
  }
  private get scenario() { return scenarios.find(s => s.id === this.options?.scenario) ?? scenarios[0]; }
  get nextScriptedAgent(): ScriptLine | undefined { return this.scenario.agent[this.clinicIndex - 1]; }
  private async listenClinic(signal: AbortSignal) {
    this.live(signal); this.microphoneTurn = !this.options?.demo;
    this.snapshot = { ...this.snapshot, timing: undefined, decision: undefined, recommendationMs: undefined }; this.set('LISTENING_DANISH');
    let captured: Capture;
    if (this.options?.demo) {
      const line = this.scenario.clinic[this.clinicIndex++];
      if (!line) { this.end(); return; }
      const audio = await this.io.load(phraseAudio(line.id), signal); this.live(signal);
      await this.io.pause(300, signal); this.live(signal); this.set('DANISH_SPEAKING');
      if(this.io.simulate)captured=await this.io.simulate(audio,'da',signal,()=>{});
      else {captured = { audio, endedAt: this.io.now(), finalization: 'simulation' };}this.live(signal);
    } else {
      captured = await this.io.capture('da', signal, () => { this.live(signal); if (this.snapshot.state === 'LISTENING_DANISH') this.set('DANISH_SPEAKING'); });
    }
    this.live(signal); await this.process(captured, 'da', signal);
  }
  private async process(captured: Capture, source: Language, signal: AbortSignal) {
    this.microphoneTurn = false;
    this.snapshot = { ...this.snapshot, timing: undefined };
    this.set(source === 'da' ? 'PROCESSING_DANISH' : 'PROCESSING_ENGLISH');
    const stages={speechEnd:captured.endedAt,turnConfirmed:captured.confirmedAt??this.io.now(),transcriptionStarted:captured.transcriptionStarted??this.io.now(),transcriptReady:captured.transcriptReady} as NonNullable<Timing['stages']>;
    const original = captured.transcript ?? await this.io.transcribe(captured.audio, source, signal); this.live(signal); stages.transcriptReady??=this.io.now();
    const timing: Timing = { stages, t0: captured.endedAt, t1: this.io.now(), t2: 0, t3: 0 };
    const translated = await this.io.translate(original, source, signal,{requestStarted:()=>{this.live(signal);stages.translationStarted=this.io.now();},firstText:()=>{this.live(signal);stages.firstText=this.io.now();}}); this.live(signal); timing.t2 = this.io.now(); stages.completeText=this.io.now();
    const id = `${++this.turnNumber}-live`;
    this.append({ id, speaker: source === 'da' ? 'CLINIC' : 'AGENT', sourceLanguage: source, original, translated, timestamp: new Date().toISOString(), method: 'LIVE AI', simulated: captured.finalization === 'simulation', timing, email: source === 'da' ? extractEmail(original) : undefined });
    if (source === 'en') {
      this.retryTurn = { captured, original, translated, timing, id };
      await this.danish(translated, timing, id, signal); this.retryTurn = undefined;
    } else {
      timing.provider = 'OpenAI';
      stages.voiceRequested=this.io.now();
      const audio = await this.io.speech(translated, 'en', signal); this.live(signal); timing.t3 = this.io.now();
      this.set('PLAYING_ENGLISH');
      await this.io.play(audio, 'en', signal, () => { this.live(signal); timing.t4 = this.io.now(); stages.playback=this.io.now(); this.updateTiming(id, timing); });
    }
    this.live(signal); await this.io.pause(180, signal); this.live(signal);
    if (source === 'da') this.set('WAITING_FOR_AGENT');
    else await this.listenClinic(signal);
  }
  private updateTiming(id: string, timing: Timing) {
    const complete = { ...timing, stages:timing.stages?{...timing.stages}:undefined };
    this.snapshot = { ...this.snapshot, timing: complete, turns: this.snapshot.turns.map(t => t.id === id ? { ...t, timing: complete } : t) }; this.emit();
  }
  private async danish(text: string, timing: Timing, id: string, signal: AbortSignal) {
    const cached=phrases.find(p=>p.da===text);
    if(cached){
      timing.provider='Cached';const audio=await this.io.load(phraseAudio(cached.id),signal);this.live(signal);const requested=this.io.now();this.set('PLAYING_DANISH');
      await this.io.play(audio,'da',signal,()=>{this.live(signal);timing.t4=this.io.now();if(timing.stages)timing.stages.playback=this.io.now();this.snapshot={...this.snapshot,cachePlaybackMs:this.io.now()-requested};this.updateTiming(id,timing);});return;
    }
    timing.provider = 'ElevenLabs';
    await this.io.streamDanish(text, signal, {
      requestStarted: () => { this.live(signal); timing.t3 = this.io.now(); if(timing.stages)timing.stages.voiceRequested=this.io.now(); this.updateTiming(id, timing); },
      firstAudio: () => { this.live(signal); timing.t4 = this.io.now(); if(timing.stages)timing.stages.firstAudio=this.io.now(); this.updateTiming(id, timing); },
      started: () => { this.live(signal); timing.t5 = this.io.now(); if(timing.stages)timing.stages.playback=this.io.now(); this.set('PLAYING_DANISH'); this.updateTiming(id, timing); },
      complete: () => { this.live(signal); timing.t6 = this.io.now(); this.updateTiming(id, timing); }
    });
  }
  async retryVoice() {
    const pending = this.retryTurn;
    if (this.snapshot.state !== 'ERROR' || !this.snapshot.retryable || !pending || !this.options || this.actionPending) return;
    this.abort = new AbortController();
    this.snapshot = { ...this.snapshot, error: '', retryable: false, timing: undefined }; this.set('PROCESSING_ENGLISH');
    await this.guarded(async signal => {
      const voice = await this.io.prepare(this.options!, signal); this.live(signal);
      this.snapshot = { ...this.snapshot, voice: voice || undefined };
      const timing = { ...pending.timing, stages:pending.timing.stages?{...pending.timing.stages,voiceRequested:undefined,firstAudio:undefined,playback:undefined}:undefined, t3: 0, t4: undefined, t5: undefined, t6: undefined };
      await this.danish(pending.translated, timing, pending.id, signal); this.live(signal); this.retryTurn = undefined;
      await this.io.pause(180, signal); this.live(signal); await this.listenClinic(signal);
    });
  }
  async custom() {
    if (this.snapshot.state !== 'WAITING_FOR_AGENT') return;
    await this.guarded(async signal => {
      this.microphoneTurn = true;
      this.snapshot = { ...this.snapshot, timing: undefined };
      this.set('ENGLISH_SPEAKING');
      const captured = await this.io.capture('en', signal, () => {}); this.live(signal);
      await this.process(captured, 'en', signal);
    });
  }
  async scriptedResponse() {
    if (this.snapshot.state !== 'WAITING_FOR_AGENT' || !this.options?.demo) return;
    const line = this.nextScriptedAgent;
    if (!line) { await this.phrase('thank-you'); return; }
    await this.guarded(async signal => {
      const audio = await this.io.load(phraseAudio(line.id), signal); this.live(signal);
      this.snapshot = { ...this.snapshot, timing: undefined };
      this.set('ENGLISH_SPEAKING');
      let captured:Capture;
      if(this.io.simulate)captured=await this.io.simulate(audio,'en',signal,()=>{});
      else {await this.io.play(audio,'en',signal,()=>{});captured={audio,endedAt:this.io.now(),finalization:'simulation'};}this.live(signal);
      await this.process(captured, 'en', signal);
    });
  }
  async suggest() {
    if(this.snapshot.state!=='WAITING_FOR_AGENT'||!this.io.recommend)return;
    const turn=[...this.snapshot.turns].reverse().find(t=>t.speaker==='CLINIC');if(!turn)return;
    await this.guarded(async signal=>{const start=this.io.now();const decision=validateDecision(await this.io.recommend!(turn.original,signal),turn.original);this.live(signal);this.snapshot={...this.snapshot,decision,recommendationMs:this.io.now()-start};this.emit();});
  }
  async approveSuggestion(){const d=this.snapshot.decision;if(this.snapshot.state!=='WAITING_FOR_AGENT'||d?.action!=='USE_CACHED_PHRASE'||!d.cached_phrase_id)return;await this.phrase(d.cached_phrase_id);}
  async phrase(id: string) {
    if (this.snapshot.state !== 'WAITING_FOR_AGENT') return;
    const phrase = phrases.find(p => p.id === id); if (!phrase) return;
    await this.guarded(async signal => { await this.recorded(phrase, false, signal); if (!signal.aborted) await this.listenClinic(signal); });
  }
  finish() { if (['DANISH_SPEAKING', 'ENGLISH_SPEAKING'].includes(this.snapshot.state)) this.io.finish(); }
  confirmEmail(id: string, value: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
    this.snapshot = { ...this.snapshot, turns: this.snapshot.turns.map(t => t.id === id && t.email ? { ...t, email: { value, confirmed: true, needsManual: false } } : t) }; this.emit();
  }
  end(completed = false) {
    this.retryTurn = undefined; this.microphoneTurn = false;
    this.abort.abort(); this.io.cancel(); this.actionPending = false;
    this.snapshot = { ...this.snapshot, state: completed ? 'CALL_COMPLETE' : 'IDLE', error: '', retryable: false, timing: undefined }; this.emit();
  }
}
export function latencyParts(timing: Timing) {
  if (timing.provider === 'ElevenLabs') {
    return { finalization: Math.round(timing.t1 - timing.t0), translation: Math.round(timing.t2 - timing.t1),
      voice: timing.t4 === undefined ? undefined : Math.round(timing.t4 - timing.t3),
      playback: timing.t5 === undefined || timing.t4 === undefined ? undefined : Math.round(timing.t5 - timing.t4),
      total: timing.t5 === undefined ? undefined : Math.round(timing.t5 - timing.t0),
      complete: timing.t6 === undefined ? undefined : Math.round(timing.t6 - timing.t3) };
  }
  if (timing.provider==='Cached')return {finalization:timing.t1-timing.t0,translation:timing.t2-timing.t1,voice:undefined,playback:undefined,total:timing.t4===undefined?undefined:timing.t4-timing.t0,complete:undefined};
  if (timing.t4 === undefined) return undefined;
  return { finalization: Math.round(timing.t1 - timing.t0), translation: Math.round(timing.t2 - timing.t1), voice: Math.round(timing.t3 - timing.t2), playback: Math.round(timing.t4 - timing.t3), total: Math.round(timing.t4 - timing.t0), complete: undefined };
}
