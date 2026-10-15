import type {VoiceIdentity} from '../../src/streaming/voiceIdentity';
export const fixtureVoice:VoiceIdentity={provider:'ElevenLabs',voiceId:'gIfqD5jrnhkFu8ENVbXC',modelId:'eleven_flash_v2_5'};
export const fixtureHeaders={'X-Voice-Provider':fixtureVoice.provider,'X-Voice-Id':fixtureVoice.voiceId,'X-Voice-Model':fixtureVoice.modelId};
export const fixtureCachedVoices=Object.fromEntries(['opening','purpose','request-email','information','unsubscribe','callback','thank-you'].map(id=>[`/audio/${id}.wav`,fixtureVoice]));
