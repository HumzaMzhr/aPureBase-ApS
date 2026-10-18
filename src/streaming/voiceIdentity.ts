/** Public provenance supplied by the server voice gateway, never inferred from text or PCM. */
export interface VoiceIdentity {provider:string;voiceId:string;modelId:string;requestId?:string;providerRequestId?:string;audioSha256?:string}
export function assertDanishVoice(value:unknown,expected?:VoiceIdentity):asserts value is VoiceIdentity {
 const voice=value as Partial<VoiceIdentity>|undefined;
 if(!voice||voice.provider!=='ElevenLabs'||voice.voiceId!=='gIfqD5jrnhkFu8ENVbXC'||voice.modelId!=='eleven_flash_v2_5'||expected&&(voice.voiceId!==expected.voiceId||voice.modelId!==expected.modelId||voice.provider!==expected.provider))throw new Error('Danish output requires the configured ElevenLabs Isabella voice. No fallback audio is allowed.');
}
/** Locks the entire listening session to its configured voice, including cached speech. */
export class DanishVoiceLock {
 private identity?:VoiceIdentity;
 constructor(expected?:VoiceIdentity){if(expected){assertDanishVoice(expected);this.identity={...expected};}}
 accept(voice:unknown){assertDanishVoice(voice,this.identity);this.identity??={...voice};return Object.freeze({...voice});}
}
export function responseVoice(response:Response):VoiceIdentity {
 return{provider:response.headers.get('X-Voice-Provider')??'',voiceId:response.headers.get('X-Voice-Id')??'',modelId:response.headers.get('X-Voice-Model')??'',requestId:response.headers.get('X-Voice-Request-Id')??undefined};
}
