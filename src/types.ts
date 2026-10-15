import type { CallDecision } from './decision';
import type { PossibleEmail } from './email';
export type Language = 'da' | 'en';
export type CallState = 'IDLE' | 'OPENING_READY' | 'PLAYING_OPENING_DANISH' | 'LISTENING_DANISH' | 'DANISH_SPEAKING' | 'PROCESSING_DANISH' | 'PLAYING_ENGLISH' | 'WAITING_FOR_AGENT' | 'ENGLISH_SPEAKING' | 'PROCESSING_ENGLISH' | 'PLAYING_DANISH' | 'CALL_COMPLETE' | 'ERROR';
export interface StageTiming { speechEnd: number; turnConfirmed: number; transcriptionStarted?: number; transcriptReady?: number; translationStarted?: number; firstText?: number; completeText?: number; voiceRequested?: number; firstAudio?: number; playback?: number }
export interface TextEvents { requestStarted(): void; firstText(): void }
export interface Timing { stages?: StageTiming; t0: number; t1: number; t2: number; t3: number; t4?: number; t5?: number; t6?: number; provider?: 'ElevenLabs' | 'OpenAI' | 'Cached' }
export interface VoiceInfo { provider: string; voiceId: string; voiceName: string; modelId: string; modelName: string; format: string }
export interface StreamingEvents { requestStarted(): void; firstAudio(): void; started(): void; complete(): void }
export interface Turn {
  id: string; speaker: 'SYSTEM' | 'CLINIC' | 'AGENT'; sourceLanguage: Language;
  original: string; translated: string; timestamp: string; method: 'PRERECORDED' | 'LIVE AI';
  simulated?: boolean; timing?: Timing; email?: PossibleEmail;
}
export interface Snapshot { state: CallState; turns: Turn[]; error: string; timing?: Timing; retryable?: boolean; voice?: VoiceInfo; decision?: CallDecision; recommendationMs?: number; cachePlaybackMs?: number }
export interface Capture { audio: Blob; endedAt: number; finalization: 'silence' | 'manual' | 'simulation'; confirmedAt?: number; transcriptionStarted?: number; transcriptReady?: number; transcript?: string }
export interface CallOptions { transcriptionMode?: 'file' | 'realtime'; clinicSilenceMs?: number; demo: boolean; scenario: string; silenceMs: number; manual: boolean; agentMic: string; clinicMic: string; agentOutput: string; clinicOutput: string }
export interface CallIO {
  prepare(options: CallOptions, signal: AbortSignal): Promise<VoiceInfo | void>;
  load(url: string, signal: AbortSignal): Promise<Blob>;
  play(audio: Blob, language: Language, signal: AbortSignal, started: () => void): Promise<void>;
  capture(language: Language, signal: AbortSignal, speaking: () => void): Promise<Capture>;
  simulate?(audio: Blob, language: Language, signal: AbortSignal, speaking: () => void): Promise<Capture>;
  finish(): void; cancel(): void;
  transcribe(audio: Blob, language: Language, signal: AbortSignal): Promise<string>;
  translate(text: string, language: Language, signal: AbortSignal, events?: TextEvents): Promise<string>;
  recommend?(text: string, signal: AbortSignal): Promise<CallDecision>;
  speech(text: string, language: Language, signal: AbortSignal): Promise<Blob>;
  streamDanish(text: string, signal: AbortSignal, events: StreamingEvents): Promise<void>;
  now(): number; pause(ms: number, signal: AbortSignal): Promise<void>;
}
export const statusLabel: Record<CallState, string> = {
  IDLE: 'READY', OPENING_READY: 'PREPARING CALL', PLAYING_OPENING_DANISH: 'PLAYING DANISH', LISTENING_DANISH: 'LISTENING TO CLINIC', DANISH_SPEAKING: 'LISTENING TO CLINIC', PROCESSING_DANISH: 'TRANSLATING', PLAYING_ENGLISH: 'PLAYING ENGLISH', WAITING_FOR_AGENT: 'WAITING FOR AGENT', ENGLISH_SPEAKING: 'LISTENING TO AGENT', PROCESSING_ENGLISH: 'TRANSLATING', PLAYING_DANISH: 'PLAYING DANISH', CALL_COMPLETE: 'CALL COMPLETE', ERROR: 'ERROR'
};
export const inputOwner = (state: CallState) => state === 'LISTENING_DANISH' || state === 'DANISH_SPEAKING' ? 'da' : state === 'ENGLISH_SPEAKING' ? 'en' : undefined;
