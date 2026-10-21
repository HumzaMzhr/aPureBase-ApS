import {evaluateConsent,guardReview} from '../../consentGuard';
import {retestDefinition} from '../../corrections/retest';
import {syntheticCall} from './simulator';
export const consentCases=['valid-owned-final','partial','maybe','okay','thanks','question','silence','stale-YES','during-playback','interrupted','wrong-owner','receptionist','wrong-person','unknown-recipient','intermediary-no-authority','unsupported-question','model-recommendation','database-match','email-capture','operator-phrase-selection','wrong-scope','wrong-version','recipient-revision','consumed-window','missing-completion','NO'] as const;
export async function consentMatrix(){
 const f=await syntheticCall('guard');await f.identity();await f.session.approvePlayback('purpose');await f.question();await f.speak('Ja');
 const s=f.session.snapshot(),t=s.turns.at(-1)!,r=f.session.response('consent-question')!;
 const expected={phraseId:r.id,text:r.text,version:r.version,textHash:r.audio!.textHash!,recipientTypes:r.recipientTypes};
 const rows=consentCases.map(id=>{
  const turn=structuredClone(t.transcript),q=structuredClone(t.consent.question!),recipient=structuredClone(s);
  const words:Partial<Record<typeof id,string>>={maybe:'Måske',okay:'Okay',thanks:'Tak',question:'Hvem er aPureBase?',silence:'','unsupported-question':'Hvilken behandling skal jeg vælge?','model-recommendation':'Model recommends YES','database-match':'anna@clinic.example','email-capture':'anna snabel-a clinic punktum example','operator-phrase-selection':'Selected consent question',NO:'Nej'};
  if(words[id]!==undefined)turn.text=words[id]!;
  if(id==='partial')turn.final=false;
  if(id==='stale-YES'||id==='wrong-owner')turn.answerPlaybackId='old-playback';
  if(id==='during-playback')turn.speechStartedAt=q.completedAt;
  if(id==='interrupted')q.playback!.state='INTERRUPTED';
  if(id==='receptionist'||id==='intermediary-no-authority'){recipient.recipientType='INTERMEDIARY';recipient.authorityStatus='UNVERIFIED';recipient.targetVerified=false;}
  if(id==='wrong-person'||id==='unknown-recipient'){recipient.recipientType='UNKNOWN';recipient.targetVerified=false;}
  if(id==='wrong-scope')q.scope='wrong';
  if(id==='wrong-version')q.responseVersion='wrong';
  if(id==='recipient-revision')recipient.recipientRevision++;
  if(id==='consumed-window')q.playback!.answerConsumed=true;
  if(id==='missing-completion')q.playback!.completionSource=null;
  const e=evaluateConsent(turn,recipient.respondent,retestDefinition.consentScope,q,recipient,expected);
  let override=false;try{guardReview(e,'YES','Synthetic operator attempt');override=true;}catch{/* Correctly cannot invent evidence. */}
  return {id,expectedEligible:id==='valid-owned-final',eligible:e.eligibleYes,classification:e.classification,operatorCanReviewYes:override,passed:e.eligibleYes===(id==='valid-owned-final')&&override===e.eligibleYes};
 });
 return {kind:'ACTUAL_GUARD_SYNTHETIC_INPUTS_NOT_HUMAN_CONSENT',denominator:consentCases.length,rows,falsePositives:rows.filter(r=>!r.expectedEligible&&r.eligible).length,failed:rows.filter(r=>!r.passed).map(r=>r.id)};
}
