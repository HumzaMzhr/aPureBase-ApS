/** Existing Stage 1 providers remain manual-start fallback, never a C-3.1 path. */
import type {Server,IncomingMessage,ServerResponse} from 'node:http';
import {handleApi,json} from './api';
import {attachLiveTranscription} from './liveTranscription';
import {attachContinuousVoice} from './continuousVoice';
import {attachTranslationTrial} from './realtimeTranslation';
import {publicVoiceConfig} from './voice';
import {modelConfig} from './models';
import {fixedPhrases} from './audioAssets';
export function attachRetestFallback(server:Server){const stops=[attachLiveTranscription(server),attachContinuousVoice(server),attachTranslationTrial(server)];return()=>stops.forEach(stop=>stop());}
export async function handleRetestFallback(req:IncomingMessage,res:ServerResponse,path:string){
 if(path==='/api/health'){let voice:ReturnType<typeof publicVoiceConfig>|undefined;try{voice=publicVoiceConfig();}catch{/* C-3.1 listening/ASR does not require ElevenLabs credentials. */}json(res,200,{ready:!!process.env.OPENAI_API_KEY&&!!voice,directTranslationAvailable:true,missingAudio:[],cachedPhrases:fixedPhrases.map(p=>'/audio/'+p.id+'.wav'),models:modelConfig(),danishVoice:voice,fallbackRequiresNormalInterpreterCredentials:!voice});return true;}
 if(['/api/interpret/unit','/api/plan','/api/transcribe','/api/translate','/api/translate/stream','/api/speech','/api/speech/stream'].includes(path)){await handleApi(req,res,path);return true;}return false;
}
