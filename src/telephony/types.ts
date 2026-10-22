import type {PlaybackRecord} from '../consent/types';
export const lifecycles=['NOT_STARTED','CREATING','RINGING','ANSWERED','MEDIA_CONNECTING','ACTIVE','TAKEOVER','ENDING','ENDED','FAILED'] as const;
export type CallLifecycle=typeof lifecycles[number];
export interface Clock {now():number;wall():string}
export interface PlaybackIdentity {callId:string;streamId:string;playbackId:string;phraseId:string;phraseVersion:string;canonicalTextHash:string;synthesisTextHash:string;assetHash:string;recipientRevision:number}
export interface PlaybackCompletionEvidence extends PlaybackIdentity {kind:'TWILIO_MARK_BOUNDARY';markName:string;markSequence:number;submittedFrames:number;firstOutboundSequence:number;lastOutboundSequence:number;startedAt:number;completedAt:number;physicalHearingProven:false;proof:string}
export interface InboundMedia {callId:string;streamId:string;sequence:number;chunk:number;providerTimestampMs:number;pcm24k:Uint8Array}
export interface OutboundMediaStream {send(message:unknown):void;close():void}
export interface InboundMediaStream {accept(raw:string):void}
export interface AsrPort {start(signal:AbortSignal):Promise<void>;append(pcm24k:Uint8Array,media:Omit<InboundMedia,'pcm24k'>):void;stop():void}
export interface TelephonyProvider {readonly provider:'TWILIO';createSupervisedCall(request:SupervisedCallRequest):Promise<{providerCallReference:string}>}
export interface PhysicalCallAuthorization {destination:string;purpose:string;maxCalls:1;automaticRetries:0;expiresAt:number;nonce:string;explicitlyAuthorized:true}
export interface SupervisedCallRequest {callId:string;destination:string;approvedCallbackURL:string;approvedMediaURL:string;authorization?:PhysicalCallAuthorization}
export const terminal=(state:CallLifecycle)=>state==='ENDED'||state==='FAILED';
export interface TelephonyDiagnostics {provider:'TWILIO';mode:'LOCAL_MOCK';callId:string;providerCallReference:string;streamId:string|null;lifecycle:CallLifecycle;mediaSequenceHealth:'OK'|'REJECTED_EVENT';inboundPackets:number;outboundPackets:number;outboundPlaybackId:string|null;markStatus:string;interruptions:number;asrLifecycle:string;errors:string[];rejectedEvents:number;automaticRedials:0;audioStored:false}
export type EvidenceRecord=Pick<PlaybackRecord,'callId'|'playbackId'|'phraseId'|'phraseVersion'|'assetHash'|'textHash'|'recipientRevision'|'outputProof'>;
/** Explicit future interpreter adapter; no telephone bridge implementation or automatic resume. */
export interface InterpreterTakeoverPort {begin(context:ReturnType<import('./callSession').TelephonyCall['takeoverContext']>):Promise<{callId:string;accepted:boolean;physicalTransferVerified:false}>}
