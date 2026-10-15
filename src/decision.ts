import { phrases } from './config/phrases';
export const actions=['ANSWER','USE_CACHED_PHRASE','ASK_CLARIFICATION','CALLBACK','EMAIL_CAPTURE','CONSENT_REQUEST','REFUSAL','TRANSFER_REQUEST','HUMAN_REVIEW'] as const;
export interface CallDecision { intent:string; confidence:number; english_interpretation:string; recommended_response_en:string; response_da:string; action:typeof actions[number]; requires_human_approval:boolean; cached_phrase_id:string }
export function validateDecision(input: unknown, original: string): CallDecision {
  if(!input||typeof input!=='object')throw new Error('Invalid response recommendation.');const p=input as CallDecision;
  if(!actions.includes(p.action)||!Number.isFinite(p.confidence)||p.confidence<0||p.confidence>1||typeof p.requires_human_approval!=='boolean'||['intent','english_interpretation','recommended_response_en','response_da','cached_phrase_id'].some(key=>typeof p[key as keyof CallDecision]!=='string'||String(p[key as keyof CallDecision]).length>4000))throw new Error('Invalid response recommendation.');
  const phrase=phrases.find(item=>item.id===p.cached_phrase_id);
  const uncertain=p.confidence<.9||/dosis|dose|dosering|diagnos|behandling|treatment|garanter|guarantee|permission|samtykke|tillad|lægen først|doctor first|på vegne af lægen|behalf of the doctor/i.test(original);
  const exact=phrase&&p.response_da===phrase.da&&p.recommended_response_en===phrase.en;
  // Stage 1.5 always requires a human click. No autonomous answering or consent writes.
  if(uncertain)return {...p,action:'HUMAN_REVIEW',requires_human_approval:true,cached_phrase_id:'',recommended_response_en:'',response_da:''};
  if(!exact||p.action!=='USE_CACHED_PHRASE')return {...p,requires_human_approval:true,cached_phrase_id:'',recommended_response_en:'',response_da:''};
  return {...p,requires_human_approval:true};
}
