import { operationalDefinition } from '../approved/definition';
import { selectOperationalResponse } from '../approved/selector';
import type { ConsentSession } from '../session';
export const dynamicDefinition = structuredClone(operationalDefinition);
dynamicDefinition.id = 'apurebase-consent-stage20c2';
// The approved wrong-person wording asks for a transfer; it does not close a call
// or verify the newly reached person's identity.
const wrong = dynamicDefinition.responses.find(r=>r.id==='wrong-person-close')!;
wrong.deliveryEvent='target_asked';wrong.nextAllowedStates=['RIGHT_PERSON'];wrong.canCloseCall=false;
dynamicDefinition.transitions.WRONG_PERSON={...dynamicDefinition.transitions.WRONG_PERSON,target_asked:'RIGHT_PERSON'};
export type NextAction = { kind:'PLAY'; phraseId:string; label:string } | { kind:'READBACK'; label:string } | {kind:'REVIEW'|'VERIFY'|'CONFIRM'|'WAIT';label:string} | {kind:'TAKEOVER';label:string};
/** Recommendations never invoke playback. Every speaking action needs Play/Approve. */
export function nextAction(session:ConsentSession):NextAction {
  const s=session.snapshot(),last=s.turns.at(-1);
  if(s.state.startsWith('END_')||s.state==='HUMAN_TAKEOVER')return {kind:'WAIT',label:'Call finished'};
  if(s.state==='CONSENT_YES'||s.state==='CONSENT_NO'&&!s.decision)return {kind:'REVIEW',label:'Review the current consent evidence'};
  if(s.fallbackReason)return {kind:'TAKEOVER',label:s.fallbackReason};
  if(s.state==='RIGHT_PERSON'&&!s.targetVerified&&s.recipientType!=='INTERMEDIARY')return {kind:'VERIFY',label:'Verify the target HCP before continuing'};
  if(s.state==='EMAIL_GIVEN')return {kind:'READBACK',label:'Play exact email readback + confirmation question'};
  if(s.state==='EMAIL_CONFIRM'&&!s.email?.confirmed)return {kind:session.confirmationPlaybackId()?'WAIT':'CONFIRM',label:session.confirmationPlaybackId()?'Await fresh recipient confirmation':'Review fresh recipient email confirmation'};
  if(s.state==='EMAIL_CONFIRM')return {kind:'PLAY',phraseId:'success-close',label:'Play approved success close'};
  // Reuse C-1 classification/state guards, then replace only its explicit
  // unavailable-dynamic-audio result for a declared, currently allowed slot.
  if(last?.classification.intent==='AUTHORITY_DENIED')return {kind:'TAKEOVER',label:'Intermediary lacks authority; no consent solicitation'};
  const selected=selectOperationalResponse(session,'mock');
  if(selected.kind==='HUMAN_TAKEOVER' && selected.reason==='Named dynamic value has no approved speaking mechanism; preserve literal evidence.') {
    const r=session.response(s.recommendedResponseId);
    if(r?.dynamicValues?.length && session.responses().some(allowed=>allowed.id===r.id)) return {kind:'PLAY',phraseId:r.id,label:'Play/Approve sourced name · '+r.id};
  }
  if(selected.kind==='HUMAN_TAKEOVER')return {kind:'TAKEOVER',label:selected.reason};
  if(selected.kind==='NO_RESPONSE')return {kind:'WAIT',label:selected.reason};
  return {kind:'PLAY',phraseId:selected.phraseId,label:'Play/Approve '+selected.phraseId};
}
