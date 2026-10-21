import {containsSecret} from './review';
export interface RequestReceipt {provider:'ElevenLabs'|'OpenAI';endpoint:string;at:string;model:string;voice:string|null;payloadHash:string;characters:number|null;result:'PLANNED'|'SUCCEEDED'|'FAILED'|'CANCELLED';retryCount:number;cost:{amount:number;currency:string;source:'PROVIDER_RETURNED'}|null}
/** In-memory receipt contract only. No transport, credentials, raw payload or automatic request. */
export class RequestJournal {
 private rows:RequestReceipt[]=[];
 append(r:RequestReceipt){const keys=['provider','endpoint','at','model','voice','payloadHash','characters','result','retryCount','cost'];if(!r||Array.isArray(r)||Object.keys(r).length!==keys.length||Object.keys(r).some(k=>!keys.includes(k))||!['ElevenLabs','OpenAI'].includes(r.provider)||!['/v1/text-to-speech','/v1/realtime','/v1/responses'].includes(r.endpoint)||typeof r.at!=='string'||r.at.length>40||!Number.isFinite(Date.parse(r.at))||typeof r.model!=='string'||!r.model||r.model.length>128||r.voice!==null&&(typeof r.voice!=='string'||r.voice.length>128)||typeof r.payloadHash!=='string'||!/^[a-f0-9]{64}$/u.test(r.payloadHash)||r.characters!==null&&(!Number.isSafeInteger(r.characters)||r.characters<0)||!Number.isSafeInteger(r.retryCount)||r.retryCount<0||r.retryCount>2||!['PLANNED','SUCCEEDED','FAILED','CANCELLED'].includes(r.result)||containsSecret(JSON.stringify(r))||this.rows.length>=200)throw new Error('Invalid minimal request receipt');if(r.cost!==null&&(Object.keys(r.cost).sort().join(',')!=='amount,currency,source'||!Number.isFinite(r.cost.amount)||r.cost.amount<0||!/^[A-Z]{3}$/u.test(r.cost.currency)||r.cost.source!=='PROVIDER_RETURNED'))throw new Error('No invented cost');this.rows.push(structuredClone(r));}
 export(){return {scope:'FUTURE_ACTIVITY_CONTRACT_ONLY',historicalTotals:'EXTERNAL_LEDGER_UNKNOWN',records:structuredClone(this.rows),requestsInitiatedByJournal:0};}
}
/** Future adapters must call explicitly; this helper itself installs no provider transport. */
export async function journalRequest<T>(journal:RequestJournal,receipt:RequestReceipt,work:()=>Promise<{value:T;cost:RequestReceipt['cost']}>){
 journal.append({...receipt,result:'PLANNED',cost:null});
 try{const response=await work();journal.append({...receipt,result:'SUCCEEDED',cost:response.cost});return response.value;}
 catch(error){journal.append({...receipt,result:'FAILED',cost:null});throw error;}
}
