import type {CaptureTiming} from './acousticTiming';
import type {Language} from '../types';
import type {Output} from './engine';
import type {VoiceIdentity} from './voiceIdentity';
/** All inputs supply PCM16 little-endian, mono, 24 kHz. Input has no listening-output method. */
export interface AudioInputSource {
 prepare(device:string,consume:(pcm:Uint8Array,timing?:CaptureTiming)=>void,failed:(e:Error)=>void):Promise<void>;
 enable(enabled:boolean):void;checkpoint():Promise<void>;cancel():void;
}
export interface TranslatedPcmOutput {
 push(pcm:Uint8Array,voice?:VoiceIdentity):void;mark(id:string,start:number,end:number,complete:boolean):void;
 finish():Promise<void>;cancel():void;readonly queuedMs:number;
}
/** Interpretation depends on validated text/output streams, rather than a physical speaker. */
export interface TranslatedAudioOutput {
 prepare(device:string,signal:AbortSignal):Promise<void>;
 open(source:Language,turn:number,signal:AbortSignal):Promise<Output>;
 controlled(source:Language,turn:number,signal:AbortSignal):Promise<Output>;
 opening(signal:AbortSignal):Promise<void>;
 renderer():TranslatedPcmOutput;release(renderer:TranslatedPcmOutput):void;cancel():void;
 readonly positions?:{ttsCharacters:number;targetSamples:number;playbackSamples:number;bufferMs?:number;nextScheduledInMs?:number;underruns?:number;underrunMs?:number;voiceConnections?:number;lastAudibleAt?:number;firstScheduledAt?:number;carryMs?:number};
}
