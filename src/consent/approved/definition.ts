import { verifiedAssets } from './assetPack';
import { consentDefinition, commonTransitions, validateDefinition } from '../definition';
import { states, type ConversationDefinition, type ResponseClip, type State } from '../types';
import { approvedInventory, wordingVersion } from './assets';
const active = states.filter(s => !s.startsWith('END_') && s !== 'HUMAN_TAKEOVER');
const asking: State[] = ['CONSENT_ASK', 'CONSENT_UNCLEAR'];
const info: State[] = ['RIGHT_PERSON', 'PURPOSE_REQUEST', 'EXPLANATION_REQUEST', 'QUESTION_KNOWN'];
const config: Record<string, [State[], string, State]> = {
  opening: [['ANSWERED','RIGHT_PERSON'], 'opened', 'RIGHT_PERSON'],
  purpose: [info, 'explained', 'CONSENT_ASK'],
  'consent-question': [asking, 'consent_question', 'CONSENT_ASK'],
  'intermediary-consent-question': [asking, 'consent_question', 'CONSENT_ASK'],
  clarify: [asking, 'consent_question', 'CONSENT_ASK'],
  'uncertain-consent': [asking, 'consent_question', 'CONSENT_ASK'],
  'already-receiving': [asking, 'consent_question', 'CONSENT_ASK'],
  'email-request': [['EMAIL_REQUEST'], 'email_requested', 'EMAIL_REQUEST'],
  'email-readback-intro': [['EMAIL_GIVEN'], 'readback_intro', 'EMAIL_GIVEN'],
  'email-confirmation-question': [['EMAIL_CONFIRM'], 'confirmation_asked', 'EMAIL_CONFIRM'],
  'email-correction-confirm': [['EMAIL_CONFIRM'], 'confirmation_asked', 'EMAIL_CONFIRM'],
  'email-correction-prefix': [['EMAIL_GIVEN'], 'readback_intro', 'EMAIL_GIVEN'],
  'success-close': [['EMAIL_CONFIRM'], 'success_closed', 'END_SUCCESS'],
  'refusal-close': [['CONSENT_NO'], 'refusal_closed', 'END_REFUSED'],
  'receptionist-target-request': [['RECEPTIONIST'], 'target_asked', 'RIGHT_PERSON'],
  'authority-ask': [['RECEPTIONIST','AUTHORITY_CHECK'], 'authority_asked', 'AUTHORITY_CHECK'],
  identity: [info.concat('ANSWERED'), 'identified', 'RIGHT_PERSON'],
  'about-apurebase': [info, 'explained', 'CONSENT_ASK'],
  explanation: [info, 'explained', 'CONSENT_ASK'],
  'why-calling': [info, 'explained', 'CONSENT_ASK'],
  unsubscribe: [['QUESTION_KNOWN'], 'explained', 'CONSENT_ASK'],
  'repeat-prefix': [asking, 'repeat_prefixed', 'CONSENT_ASK'],
  callback: [['BUSY','CALLBACK'], 'callback_asked', 'CALLBACK'],
  'callback-close': [['CALLBACK'], 'other_closed', 'END_OTHER'],
  'wrong-person-close': [['WRONG_PERSON'], 'other_closed', 'END_OTHER'],
  'target-unavailable': [['CALLBACK','RECEPTIONIST'], 'callback_asked', 'CALLBACK'],
  'send-first': [asking, 'explained', 'CONSENT_ASK'],
  'more-explanation': [info, 'explained', 'CONSENT_ASK'],
  'stop-contact-close': [['CONSENT_NO'], 'refusal_closed', 'END_REFUSED'],
  'thank-you': [['EMAIL_CONFIRM'], 'thanked', 'EMAIL_CONFIRM'],
};
const template = consentDefinition.responses[0];
const responses: ResponseClip[] = approvedInventory.map(p => {
  const [from, event, next] = config[p.id];
  const asset = verifiedAssets.find(a => a.phraseId === p.id);
  return { ...structuredClone(template), id: p.id, text: p.text, english: p.english, version: wordingVersion, approval: 'business-authorized', wordingStatus: 'BUSINESS_AUTHORIZED', reviewRequirements: ['BUSINESS'], state: from[0], allowedSourceStates: from, deliveryEvent: event, nextAllowedStates: [next], category: 'APPROVED_OPERATIONAL', scenario: p.id, deliveryType: 'SPOKEN_CLIP', dynamicValues: p.dynamicValues, consentCritical: p.consentCritical, canArmConsent: p.consentCritical, consentScope: p.consentCritical ? consentDefinition.consentScope : undefined, recipientTypes: p.recipientTypes.length ? p.recipientTypes as ResponseClip['recipientTypes'] : undefined, authorityCritical: p.id === 'intermediary-consent-question' || p.id === 'authority-ask', canRequestEmail: p.id === 'email-request', canCloseCall: next.startsWith('END_'), priorStage20aId: undefined,
    audio: { assetId: p.id, status: asset ? 'GENERATED_VERIFIED_LOCAL_ONLY' : 'DYNAMIC_UNRESOLVED', provider: 'ElevenLabs', voice: 'Isabella', model: 'eleven_flash_v2_5', version: 1, sha256: asset?.assetHash ?? null, boundText: p.text, phraseVersion: wordingVersion, textHash: p.textHash } };
});
// Evidence/action units never become speculative recordings.
for (const id of ['authority-claimed','authority-unclear','human-takeover','email-confirm','email-correction']) {
  const action = structuredClone(consentDefinition.responses.find(r => r.id === id)!);
  action.deliveryType = id === 'human-takeover' || id === 'authority-unclear' ? 'SYSTEM_ACTION' : 'OPERATOR_ACTION'; action.audio = null;
  if (id === 'human-takeover') action.allowedSourceStates = active;
  responses.push(action);
}
const transitions = Object.fromEntries(states.map(state => [state, state.startsWith('END_') ? {} : state === 'HUMAN_TAKEOVER' ? { end: 'END_OTHER' } : { ...commonTransitions }])) as ConversationDefinition['transitions'];
for (const r of responses) for (const from of r.allowedSourceStates) Object.assign(transitions[from], { [r.deliveryEvent]: r.nextAllowedStates[0] });
for (const state of asking) Object.assign(transitions[state], { candidate_yes: 'CONSENT_YES' });
Object.assign(transitions.CONSENT_YES, { reviewed_yes: 'EMAIL_REQUEST' });
Object.assign(transitions.AUTHORITY_CHECK, { authority_confirmed: 'RIGHT_PERSON' });
for (const state of ['EMAIL_REQUEST','EMAIL_GIVEN','EMAIL_CONFIRM'] as const) Object.assign(transitions[state], { EMAIL_GIVEN: 'EMAIL_GIVEN', EMAIL_INCORRECT: 'EMAIL_REQUEST', EMAIL_CONFIRMED: state, EMAIL_REFUSED: 'EMAIL_REQUEST', EMAIL_UNAVAILABLE: 'EMAIL_REQUEST' });
export const operationalDefinition: ConversationDefinition = { id: 'apurebase-consent', version: wordingVersion, initial: 'ANSWERED', consentScope: consentDefinition.consentScope, transitions, responses,
  recommendations: { ANSWERED: 'opening', RIGHT_PERSON: 'purpose', PURPOSE_REQUEST: 'why-calling', EXPLANATION_REQUEST: 'explanation', CONSENT_ASK: 'consent-question', CONSENT_UNCLEAR: 'clarify', CONSENT_NO: 'refusal-close', RECEPTIONIST: 'receptionist-target-request', AUTHORITY_CHECK: 'authority-ask', WRONG_PERSON: 'wrong-person-close', BUSY: 'callback', CALLBACK: 'callback-close', EMAIL_REQUEST: 'email-request', EMAIL_GIVEN: 'email-readback-intro', EMAIL_CONFIRM: 'success-close', QUESTION_KNOWN: 'unsubscribe', QUESTION_UNKNOWN: 'human-takeover' },
  consentQuestions: { TARGET_HCP: 'consent-question', INTERMEDIARY: 'intermediary-consent-question' },
  intentRecommendations: { ...consentDefinition.intentRecommendations, ABOUT_APUREBASE: 'about-apurebase', PRODUCTS_EVENTS: 'explanation', MORE_INFORMATION: 'more-explanation', CONFIRMATION_PROCESS: 'human-takeover', EMAIL_INCORRECT: 'email-correction', EMAIL_REFUSED: 'human-takeover', EMAIL_UNAVAILABLE: 'human-takeover' },
};
validateDefinition(operationalDefinition);
