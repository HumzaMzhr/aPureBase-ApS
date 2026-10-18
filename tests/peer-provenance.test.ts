import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ParticipantPeer} from '../src/streaming/peer';
import {encodePcm} from '../src/streaming/routing';
import {inspectPcm,VerifiedPcmSource} from '../src/streaming/pcmProvenance';
import {fixtureVoice} from './fixtures/voice';
class Channel {
 ordered=true;readyState='open';bufferedAmount=0;binaryType='';onmessage?:((e:{data:string|ArrayBuffer})=>void);onopen?:()=>void;send=vi.fn();close=vi.fn();
 event(data:unknown){this.onmessage?.({data:data instanceof ArrayBuffer?data:JSON.stringify(data)});}
}
class Connection {
 static last:Connection;ondatachannel?:((e:{channel:RTCDataChannel})=>void);onconnectionstatechange?:()=>void;iceGatheringState='complete';localDescription={type:'offer',sdp:'v=0'};channel=new Channel();
 createDataChannel=()=>this.channel;createOffer=async()=>this.localDescription;setLocalDescription=async()=>{};close=vi.fn();constructor(){Connection.last=this;}
}
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('RTCPeerConnection',Connection);});afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('relays the verified source request through ordered metadata and binary PCM, without accepting unverified sender audio',async()=>{
 const failed=vi.fn(),peer=new ParticipantPeer('agent',()=>{},()=>{},()=>{},failed);await peer.invitation();const channel=Connection.last.channel;channel.onopen?.();const source=new VerifiedPcmSource(fixtureVoice,'elevenlabs-ws');
 expect(()=>peer.sendPcm('HCP_OUTPUT_DA',7,new Uint8Array(4800),fixtureVoice)).toThrow('Unverified');expect(channel.send.mock.calls.filter(([data])=>data instanceof ArrayBuffer)).toHaveLength(0);
 peer.sendPcm('HCP_OUTPUT_DA',7,source.accept(new Uint8Array(14000)),fixtureVoice);const frames=channel.send.mock.calls.map(([data])=>data).slice(1);expect(frames).toHaveLength(4);expect(JSON.parse(frames[0])).toMatchObject({type:'audio_pcm',turn:7,provenance:{requestId:fixtureVoice.requestId,sequence:0,sampleStart:0,sampleEnd:6000}});expect(JSON.parse(frames[2])).toMatchObject({provenance:{sequence:1,sampleStart:6000,sampleEnd:7000}});expect(frames[1]).toBeInstanceOf(ArrayBuffer);expect(frames[3]).toBeInstanceOf(ArrayBuffer);peer.close();expect(vi.getTimerCount()).toBe(0);
});
it('rejects missing or stale tail envelopes and preserves the verified request on clinic PCM',()=>{
 const received:{turn:number;bytes:Uint8Array}[]=[],failed=vi.fn(),peer=new ParticipantPeer('clinic',()=>{},(turn,bytes)=>received.push({turn,bytes}),()=>{},failed);const channel=Connection.last.channel;Connection.last.ondatachannel?.({channel:channel as unknown as RTCDataChannel});
 channel.event({type:'audio_open',turn:1,jitterMs:100,voice:fixtureVoice});channel.event(encodePcm('HCP_OUTPUT_DA',1,new Uint8Array(4),fixtureVoice));expect(received).toEqual([]);expect(failed).toHaveBeenCalledOnce();
 channel.event({type:'audio_pcm',turn:1,provenance:{requestId:fixtureVoice.requestId,sequence:0,sampleStart:0,sampleEnd:2}});channel.event(encodePcm('HCP_OUTPUT_DA',1,new Uint8Array(4),fixtureVoice));expect(received).toHaveLength(1);expect(inspectPcm(received[0].bytes,fixtureVoice)).toMatchObject({origin:'ordered-peer',requestId:fixtureVoice.requestId,sequence:0});
 channel.event({type:'audio_end',turn:1});const tail={...fixtureVoice,requestId:'tail-request'};channel.event({type:'audio_open',turn:2,jitterMs:100,voice:tail});channel.event({type:'audio_pcm',turn:2,provenance:{requestId:fixtureVoice.requestId,sequence:0,sampleStart:0,sampleEnd:2}});channel.event(encodePcm('HCP_OUTPUT_DA',2,new Uint8Array(4),tail));expect(received).toHaveLength(1);expect(failed).toHaveBeenCalledTimes(2);peer.close();
});
