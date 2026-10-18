/** Offline review artifact generator; no provider/audio/transport imports. */
import { writeFileSync } from 'node:fs';
import { consentDefinition, plannedAssetManifest, validateDefinition } from '../src/consent/definition';
import { canonicalConsent, consentScope } from '../src/consent/wording';
validateDefinition(consentDefinition);
// Literal back-translations are review aids, not native/legal approval.
const review: Record<string, [string, string, 'NATIVE_DANISH_REVIEW_REQUIRED' | 'SOURCE_CLARIFICATION_REQUIRED']> = {
  identify: ['I call on behalf of aPureBase.', 'Caller identity must match the actual operator and business.', 'NATIVE_DANISH_REVIEW_REQUIRED'],
  greeting: ['Hello. Good day.', 'Low scope risk; native reviewer should confirm the two-part greeting is natural.', 'NATIVE_DANISH_REVIEW_REQUIRED'],
  'ask-target': ['May I speak with the relevant healthcare person?', 'The target must be identified by evidence; this generic phrase does not name or verify them.', 'NATIVE_DANISH_REVIEW_REQUIRED'],
  purpose: ['We call to ask whether we may send professional information via email.', 'Does not name aPureBase in this unit; identification must precede it. Does not itself grant consent.', 'NATIVE_DANISH_REVIEW_REQUIRED'],
  'about-apurebase': ['aPureBase contacts healthcare persons about professional information.', 'Business description is narrow and incomplete; confirm it against the approved business source.', 'SOURCE_CLARIFICATION_REQUIRED'],
  explanation: ['The information can encompass professional and medical material.', 'Confirm the permitted information scope and distinction from medical advice.', 'SOURCE_CLARIFICATION_REQUIRED'],
  'products-events': ['It can also encompass product updates and invitations to professional activities.', 'May expand the perceived permission scope; business must confirm products/events are within professional information.', 'SOURCE_CLARIFICATION_REQUIRED'],
  'transfer-request': ['Will you transfer me to the healthcare person?', 'A transfer is a request, not completed routing or verified identity.', 'NATIVE_DANISH_REVIEW_REQUIRED'],
  'target-unavailable': ['When would it suit the healthcare person that we call again?', 'Does not create or confirm a scheduled callback.', 'NATIVE_DANISH_REVIEW_REQUIRED'],
  'authority-ask': ['Do you have the necessary authorization to handle this inquiry and provide the healthcare person’s email address?', 'Authority to provide an address may differ from authority to grant this permission. Required authority and evidence standard need business/source clarification; no legal conclusion.', 'SOURCE_CLARIFICATION_REQUIRED'],
  'authority-denied': ['Then I would like to speak with the healthcare person themself.', 'Does not infer that a transfer has occurred.', 'NATIVE_DANISH_REVIEW_REQUIRED'],
  'wrong-person-close': ['Thank you for the clarification. We end the conversation.', 'Closing a rehearsal does not terminate an external phone call.', 'NATIVE_DANISH_REVIEW_REQUIRED'],
  'consent-question': ['May aPureBase send professional information via email to the relevant healthcare person?', 'Replaces differing direct/intermediary addressees with one atomic proposition. The relevant HCP must be established separately; business must approve this indirect form for direct HCPs and confirm intermediary scope. No channels or purposes are added.', 'SOURCE_CLARIFICATION_REQUIRED'],
  clarify: ['Sorry, will you repeat your answer?', 'Repeating an answer does not repeat the consent proposition or arm consent. A fresh full question remains required.', 'NATIVE_DANISH_REVIEW_REQUIRED'],
  'email-request': ['Which email address may we use?', 'Only after separately reviewed eligible YES; the address is not consent.', 'NATIVE_DANISH_REVIEW_REQUIRED'],
  'email-correction': ['Will you provide the correct email address?', 'Must retain previous candidate lineage and require fresh readback/confirmation; never infer spelling.', 'NATIVE_DANISH_REVIEW_REQUIRED'],
  'email-unavailable': ['That is in order. We end without registering an email address.', 'Ensure the future downstream process really avoids registering an unconfirmed address; local raw evidence may still be retained.', 'SOURCE_CLARIFICATION_REQUIRED'],
  callback: ['When would it suit you that we call again?', 'Asks availability; no scheduling system or callback commitment is implemented.', 'NATIVE_DANISH_REVIEW_REQUIRED'],
  'callback-close': ['Thank you for your time. We call again another time.', 'Promises a future callback; scheduling/ownership must be approved and implemented before use.', 'SOURCE_CLARIFICATION_REQUIRED'],
  unsubscribe: ['The confirmation email explains how you can decline future information.', 'Requires an approved actual confirmation template and opt-out mechanism. Nothing is sent in this stage.', 'SOURCE_CLARIFICATION_REQUIRED'],
  'confirmation-process': ['The confirmation email describes the possibility of declining information within eight days.', 'Eight-day anchor and effect of consent are unresolved. Do not imply immediate activation, conditional activation, double opt-in or automatic activation after eight days.', 'SOURCE_CLARIFICATION_REQUIRED'],
  'refusal-close': ['We respect that. Thank you for your time. Have a good day.', 'No permission or email handoff; downstream withdrawal/suppression remains unresolved.', 'NATIVE_DANISH_REVIEW_REQUIRED'],
  'success-close': ['Thank you for your time and your permission. Have a good day.', 'Only after reviewed eligible YES and confirmed email; does not imply downstream activation/email sent. Business must approve permission terminology.', 'SOURCE_CLARIFICATION_REQUIRED'],
  'stop-contact-close': ['I have understood that you do not wish more contact. We end the conversation.', 'Retain request, but do not claim downstream suppression has been applied.', 'SOURCE_CLARIFICATION_REQUIRED'],
  'receptionist-close': ['Thank you for the help. We contact the relevant person another time.', 'Promises future contact; callback ownership is not implemented.', 'SOURCE_CLARIFICATION_REQUIRED'],
};
const esc = (s: string) => s.replaceAll('|', '\\|').replaceAll('\n', ' ');
const spoken = consentDefinition.responses.filter(r => r.deliveryType === 'SPOKEN_CLIP');
if (spoken.length !== Object.keys(review).length || spoken.some(r => !review[r.id])) throw new Error('Every spoken unit requires a wording review.');
const out = ['# Stage 2.0B-2 wording freeze candidate', '',
  'Generated by `node --import tsx scripts/stage20b2-specification.ts`. Candidate wording only. Zero native, business or legal approvals; zero generated audio. Status records the next blocking review, not all required approvals. Every spoken entry still requires BOTH native-Danish and business approval. Literal back-translations are deliberately separate from intended English business meanings.', '',
  '## All 30 logical units', '', '| Phrase ID | deliveryType | Recording required later | Handling |', '|---|---|---|---|'];
for (const r of consentDefinition.responses) out.push(`| ${r.id} | ${r.deliveryType} | ${r.deliveryType === 'SPOKEN_CLIP' ? 'Yes, after approvals' : 'No'} | ${esc(r.scenario)} |`);
out.push('', '30 logical units: 25 SPOKEN_CLIP, 2 SYSTEM_ACTION, 2 OPERATOR_ACTION, 1 NO_AUDIO. `authority-claimed` is the evidence-review action; `email-confirm` is exact dynamic operator readback and recipient confirmation, not a static recording of an address. `authority-unclear` and `human-takeover` switch ownership without claiming a colleague/transport has already joined. The retired intermediary question is a NO_AUDIO registry reference to the canonical question, cannot be delivered, and cannot arm consent.', '',
  'The only spoken wording change is the canonical question: the previous “you” versus “the HCP you are authorized to represent” variants asked materially different addressees. A single neutral addressee preserves the identified target HCP scope. This is a concrete scope correction, pending approval, not a style rewrite. Other spoken Danish is unchanged. Nonspoken registry text remains guidance and is not promised spoken delivery.', '',
  '## Canonical atomic consent question', '', '```json', JSON.stringify({ ...canonicalConsent, consentScope }, null, 2), '```', '',
  'Text hash is SHA-256 of the exact UTF-8 Danish text (no whitespace/case normalization), not audio bytes. A future asset must carry phrase ID, phrase version, text hash and separate SHA-256 of the actual audio bytes. `validateAssetBinding` rejects any mismatch. Changing text/version invalidates the old binding; no asset is approved here.', '',
  '## Spoken wording review', '', '| Phrase ID | English business meaning | Current Danish wording | Literal English back-translation | Scenario | consentCritical | authorityCritical | businessRisk | approvalStatus |', '|---|---|---|---|---|---|---|---|---|');
for (const r of spoken) {
  const [literal, risk, approval] = review[r.id];
  out.push(`| ${[r.id, r.english, r.text, literal, r.scenario, String(r.consentCritical), String(r.authorityCritical), risk, approval].map(esc).join(' | ')} |`);
}
out.push('', 'No entry is described as legally/native approved. READY_FOR_BUSINESS_REVIEW remains available but is not used to bypass native or source review. No source-approved exact Danish text was supplied.', '');
writeFileSync('docs/stage-2.0b-wording-review.md', out.join('\n'));
writeFileSync('docs/stage-2.0b-2-planned-audio-manifest.json', JSON.stringify(plannedAssetManifest, null, 2) + '\n');
console.log('Wrote wording review for 25 spoken / 30 logical units; no audio or provider calls.');
