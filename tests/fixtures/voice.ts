import {createHash} from 'node:crypto';
import {VerifiedPcmSource} from '../../src/streaming/pcmProvenance';
import type {VoiceIdentity} from '../../src/streaming/voiceIdentity';
export const fixtureVoice:VoiceIdentity={provider:'ElevenLabs',voiceId:'gIfqD5jrnhkFu8ENVbXC',modelId:'eleven_flash_v2_5',requestId:'fixture-request'};
export const fixtureHeaders={'X-Voice-Provider':fixtureVoice.provider,'X-Voice-Id':fixtureVoice.voiceId,'X-Voice-Model':fixtureVoice.modelId,'X-Voice-Request-Id':fixtureVoice.requestId!};
export const fixtureCachedVoices=Object.fromEntries(['opening','purpose','request-email','information','unsubscribe','callback','thank-you'].map(id=>[`/audio/${id}.wav`,{...fixtureVoice,audioSha256:createHash('sha256').update(new Uint8Array(4800)).digest('hex')}]));

const sources=new WeakMap<VoiceIdentity,VerifiedPcmSource>();
export function fixturePcm(bytes:Uint8Array,voice=fixtureVoice){let source=sources.get(voice);if(!source){source=new VerifiedPcmSource(voice,'elevenlabs-ws');sources.set(voice,source);}return source.accept(bytes.slice());}
