import type {Bus,Role} from './types';
import {assertDanishVoice,type VoiceIdentity} from './voiceIdentity';
const tags:Record<Bus,number>={AGENT_INPUT_EN:1,AGENT_OUTPUT_EN:2,HCP_INPUT_DA:3,HCP_OUTPUT_DA:4};
export const allowedRemoteBus=(role:Role):Bus=>role==='agent'?'HCP_INPUT_DA':'HCP_OUTPUT_DA';
export function encodePcm(bus:Bus,turn:number,bytes:Uint8Array,voice?:VoiceIdentity){if(bus==='HCP_OUTPUT_DA')assertDanishVoice(voice);if(bytes.length%2||bytes.length>24000||!Number.isInteger(turn)||turn<0)throw new Error('Invalid PCM frame.');const frame=new Uint8Array(bytes.length+5);frame[0]=tags[bus];new DataView(frame.buffer).setUint32(1,turn);frame.set(bytes,5);return frame.buffer;}
export function decodePcm(role:Role,frame:ArrayBuffer,voice?:VoiceIdentity){if(role==='clinic')assertDanishVoice(voice);if(frame.byteLength<7||frame.byteLength>24005||(frame.byteLength-5)%2)throw new Error('Invalid PCM frame.');const bytes=new Uint8Array(frame);const bus=allowedRemoteBus(role);if(bytes[0]!==tags[bus])throw new Error('Audio isolation violation.');return{bus,turn:new DataView(frame).getUint32(1),bytes:bytes.slice(5)};}
export function assertListeningBus(role:Role,bus:Bus){if(bus!==(role==='agent'?'AGENT_OUTPUT_EN':'HCP_OUTPUT_DA'))throw new Error('Audio isolation violation.');}
