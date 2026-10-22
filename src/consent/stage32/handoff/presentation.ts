/** Human-facing views only; exact assets and policy decisions remain in the validated core. */
import {currentC32Catalog} from '../speech/current';
import {gates,liveFinals,verifyLive,type Archive,type CallReview,type ListeningItem,type ReviewData,type ReviewedObservation} from './contract';
export const steps=['VOICE REVIEW','MICROPHONE','EMAIL','CALL TESTS','RESULTS'] as const;
export const microphoneTests=[
 {id:'ordinary',name:'A natural Danish sentence',instruction:'Say an ordinary Danish sentence in your own words.'},
 {id:'yes',name:'A clear yes',instruction:'Give a clear, natural yes response in Danish.'},
 {id:'no',name:'A clear no',instruction:'Give a clear, natural no response in Danish.'},
 {id:'email',name:'A spoken email address',instruction:'Say info@klinik.dk naturally, as you would on a call.'},
 {id:'correction',name:'Correct the previous email',instruction:'Correct the previous address to kontakt@klinik.dk in your own words.'},
] as const;
export const calls=[{id:'A',name:'A direct conversation',instruction:'Act as the healthcare professional. Agree to receive information, then give your email.'},{id:'B',name:'A polite refusal',instruction:'Act as the healthcare professional and decline. A short call is fine.'},{id:'C',name:'Ask for clarification',instruction:'Ask what the call is about before agreeing and giving your email.'},{id:'D',name:'Receptionist and transfer',instruction:'Start as the receptionist, then transfer to the intended healthcare professional.'},{id:'E',name:'Correct an email · optional',instruction:'Agree, give an email, then correct it. Finish with the correct address.'}] as const;
export const freshCallReview=():CallReview=>({consentCorrect:null,emailCorrect:null,takeoverCorrect:null,naturalness:0,flow:0,pronunciation:0,pace:0,automatedVoice:''});
export function badge(item:ListeningItem){const alreadyHeard=item.history.some(h=>h&&typeof h==='object'&&'audioHashHeard'in h&&h.audioHashHeard===item.currentAssetHash);return item.replacement&&!alreadyHeard&&!['consent-question','email-request'].includes(item.phraseId)?'NEW RECORDING':'RECHECK REQUESTED';}
export function issue(item:ListeningItem){const known:Record<string,string>={'why-calling':'Previously: an unnatural pause and the flow of “sende dig”. Please review this new recording.','success-close':'Previously: “framelde” was unclear. The current wording uses “sige fra”.','clarify':'Previously rated 2/5 for pronunciation. Please check the new pronunciation of aPureBase.','consent-question':'Previously rated 2/5 for pronunciation. This recording has not changed; a fresh native verdict is requested.','email-request':'Previously rated 2/5 for pronunciation. This recording has not changed; a fresh native verdict is requested.'};return known[item.phraseId]??(item.replacement?'Please check this replacement against the earlier concern.':'Please give this phrase a fresh native listening review.');}
export interface Cursor {step:number;voice:number;microphone:number;email:number;call:number}
export function restoreCursor(a:Archive,d:ReviewData):Cursor{const v=a.drafts.navigation as Partial<Cursor>|undefined;const valid=(n:unknown,max:number)=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<max?n:0;return {step:valid(v?.step,5),voice:valid(v?.voice,d.items.length),microphone:valid(v?.microphone,5),email:valid(v?.email,d.emailCases.length),call:valid(v?.call,5)};}
export function latest(list:ReviewedObservation[],id:string){return list.filter(r=>r.testId===id).at(-1);}
export function passed(row:ReviewedObservation|undefined){if(row?.verdict!=='PASS')return false;try{verifyLive(row);return true;}catch{return false;}}
export function resultSummary(a:Archive,d:ReviewData){
 const gate=gates(a,d),voice=d.items.map(i=>({item:i,row:a.listening.filter(r=>r.key===i.reviewKey).at(-1)}));
 const concerns:{name:string;score:string;comment:string;diagnostic:boolean}[]=[];
 for(const {item,row} of voice)if(row&&(row.verdict==='FAIL'||Math.min(row.pronunciation,row.naturalness,row.pace)<=3))concerns.push({name:item.name,score:`Pronunciation ${row.pronunciation}/5 · Naturalness ${row.naturalness}/5 · Pace ${row.pace}/5`,comment:row.comment,diagnostic:item.diagnosticOnly&&!row.sharedDefect});
 const lists=[['Microphone',a.microphones],['Email',a.emails],['Call',a.calls]] as const;
 for(const [label,list] of lists)for(const id of new Set(list.map(r=>r.testId))){const r=latest(list,id)!;if(r.verdict==='FAIL'||r.error||r.assessment&&r.assessment!=='CORRECT'||r.callReview&&[r.callReview.naturalness,r.callReview.flow,r.callReview.pronunciation,r.callReview.pace].some(v=>v>0&&v<=3))concerns.push({name:`${label} ${id}`,score:r.callReview?`Naturalness ${r.callReview.naturalness}/5 · Flow ${r.callReview.flow}/5 · Pronunciation ${r.callReview.pronunciation}/5 · Pace ${r.callReview.pace}/5`:r.assessment==='MINOR_ERROR'?'Minor error':'Needs improvement',comment:r.comment||r.error||'Review not completed',diagnostic:false});}
 for(const id of gate.durationConcerns)concerns.push({name:'Call '+a.calls.find(r=>r.id===id)!.testId,score:'Outside the ordinary 30–90 second target',comment:a.calls.find(r=>r.id===id)!.comment,diagnostic:false});
 if(gate.safetyBlocking)concerns.push({name:'Safety review',score:'A safety problem was reported',comment:a.safetyComment,diagnostic:false});
 return {counts:[voice.filter(v=>!v.item.diagnosticOnly&&v.row).length,microphoneTests.filter(t=>passed(latest(a.microphones,t.id))).length,d.emailCases.filter(t=>passed(latest(a.emails,t.id))).length,calls.slice(0,4).filter(t=>passed(latest(a.calls,t.id))).length],totals:[d.items.filter(i=>!i.diagnosticOnly).length,5,d.emailCases.length,4],concerns,gate,result:gate.eligibleForHumanRetestPass?'HUMAN_RETEST_PASS' as const:concerns.some(c=>!c.diagnostic)?'HUMAN_RETEST_FAIL' as const:'HUMAN_RETEST_INCOMPLETE' as const};
}
export function transcript(row:ReviewedObservation|undefined){const out:{speaker:string;text:string;final:boolean;at:number}[]=[];if(!row)return out;
 for(const e of row.events)if((e.event==='transcriptFinal'||e.event==='transcriptPartial')&&typeof e.data.text==='string')out.push({speaker:'You',text:e.data.text,final:e.event==='transcriptFinal',at:e.at});
 const s=row.sessionEvidence as {playbacks?:{state:string;startedAt:number|null;assetHash?:string;phraseId:string}[]}|null;
 for(const p of s?.playbacks??[])if(p.startedAt!==null)out.push({speaker:'Isabella',text:currentC32Catalog().find(a=>a.phraseId===p.phraseId&&a.assetHash===p.assetHash)?.text??'Recorded phrase',final:true,at:p.startedAt});return out.sort((a,b)=>a.at-b.at);
}
export function voiceState(row:ReviewedObservation|undefined,running:boolean){if(!running)return row&&!row.endedAt?'Previous call interrupted — duration unavailable':'Call ended';const s=row?.sessionEvidence as {playbacks?:{state:string}[]}|null;return s?.playbacks?.some(p=>p.state==='PLAYING'||p.state==='QUEUED')?'Isabella is speaking':'Isabella is listening';}
export function friendlyOutcome(row:ReviewedObservation){const map:Record<string,string>={END_SUCCESS:'Completed with confirmed email',END_REFUSED:'Information declined',HUMAN_TAKEOVER:'Handed to a person',END_OTHER:'Call ended'};return row.error?'Connection or recognition problem':map[row.finalState??'']??'Stopped before completion';}
export function friendlyConsent(row:ReviewedObservation){return row.consentOutcome==='YES'?'Agreed':row.consentOutcome==='NO'?'Declined':'No confirmed decision';}
export function permission(row:ReviewedObservation|undefined){if(!row)return 'Not connected';if(row.error)return 'Connection needs attention';return row.events.some(e=>e.event==='microphone.capture_ready')?'Microphone connected':row.endedAt?'Not connected':'Requesting microphone permission';}
export function readiness(row:ReviewedObservation|undefined){return row?.error?'Unavailable — see the message below':row?.events.some(e=>e.event==='recognition.started')?'Ready':row&&!row.endedAt?'Connecting…':'Not started';}
export function providerText(row:ReviewedObservation|undefined){return row?liveFinals(row).map(e=>String(e.data.text)).join(' '):'';}
export function emailPipeline(row:ReviewedObservation|undefined){const r=row?.resolution as {rawASR?:string;reconstructed?:string[];databaseFixtureCandidates?:(string|{email:string})[];finalResolution?:{selected?:string|null;reason?:string;policyLabel?:string;suggestion?:{status?:string;reason?:string}};modelRecommendation?:{status?:string;reason?:string}}|null;
 return {raw:r?.rawASR??providerText(row),reconstructed:r?.reconstructed??[],database:(r?.databaseFixtureCandidates??[]).map(x=>typeof x==='string'?x:x.email),selected:r?.finalResolution?.selected??null,reason:r?.finalResolution?.reason??'',modelAdvice:r?.modelRecommendation?.status??r?.finalResolution?.suggestion?.status??'NOT_REQUESTED',resolutionLabel:r?.finalResolution?.policyLabel??'NOT_RESOLVED',confirmed:row?.confirmationStatus==='HUMAN_DIAGNOSTIC_CONFIRMED'};}
export function elapsedDisplay(row:ReviewedObservation|undefined,startMs:number|null,now:number){const seconds=row?.elapsedSeconds??(row&&!row.endedAt&&startMs!==null?Math.max(0,(now-startMs)/1000):null);if(seconds===null)return '00:00';return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;}

/** Validate before mutating the retained row, so incomplete forms cannot corrupt saved evidence. */
export function reviewedObservation(row:ReviewedObservation):ReviewedObservation{
 if(!row.endedAt)throw new Error('End this test before saving your review.');
 const next=structuredClone(row);
 if(next.kind==='NATURAL_CALL'){
  const q=next.callReview;
  if(!q||![q.naturalness,q.flow,q.pronunciation,q.pace].every(n=>Number.isInteger(n)&&n>=1&&n<=5)||!q.automatedVoice||q.consentCorrect===null||q.emailCorrect===null||q.takeoverCorrect===null)throw new Error('Answer each call-review question and rate all four qualities before saving.');
  next.verdict=q.consentCorrect===true&&[true,'NA'].includes(q.emailCorrect as boolean|'NA')&&[true,'NA'].includes(q.takeoverCorrect as boolean|'NA')&&[q.naturalness,q.flow,q.pronunciation,q.pace].every(n=>n>=4)&&!next.error?'PASS':'FAIL';
  next.meaningPreserved=q.consentCorrect===true&&q.emailCorrect!==false;
 }else{
  if(!next.assessment&&!next.error)throw new Error('Choose Correct, Minor Error or Incorrect.');
  next.verdict=next.assessment==='CORRECT'&&!next.error?'PASS':'FAIL';
 }
 verifyLive(next);return next;
}
