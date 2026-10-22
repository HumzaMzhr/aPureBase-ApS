import { verifiedAssets } from './approved/assetPack';
import { approvedInventory, wordingVersion } from './approved/assets';
import { canonicalConsent, consentScope } from './wording';
import { assertDanishVoice } from '../streaming/voiceIdentity';
import { states, type ConversationDefinition, type ResponseClip, type State } from './types';

const voice: ResponseClip['voice'] = { provider: 'ElevenLabs', name: 'Isabella', voiceId: 'gIfqD5jrnhkFu8ENVbXC', modelId: 'eleven_flash_v2_5' };
const scope = consentScope.id;
const actions: Record<string, ResponseClip['deliveryType']> = { 'authority-claimed': 'OPERATOR_ACTION', 'authority-unclear': 'SYSTEM_ACTION', 'email-confirm': 'OPERATOR_ACTION', 'human-takeover': 'SYSTEM_ACTION', 'intermediary-consent-question': 'NO_AUDIO' };
type Options = Partial<Pick<ResponseClip, 'wordingStatus' | 'authorityCritical' | 'consentCritical' | 'recipientTypes' | 'canRequestEmail' | 'canCloseCall' | 'consentScope' | 'priorStage20aId'>>;
function unit(id: string, category: string, scenario: string, english: string, text: string, deliveryEvent: string, next: State, from: State[], options: Options = {}): ResponseClip {
  const deliveryType = actions[id] ?? 'SPOKEN_CLIP';
  return {
    deliveryType, id, state: from[0], intent: 'PROMPT', category, scenario, language: 'da', english, text,
    audioAsset: null, voice, version: '2.0b2-draft-1', approval: 'draft', productionApproval: 'NOT_APPROVED',
    wordingStatus: 'DRAFT_NATIVE_REVIEW_REQUIRED', reviewRequirements: ['NATIVE_DANISH', 'BUSINESS'],
    requiresAgentApproval: true, consentCritical: false, authorityCritical: false,
    canArmConsent: !!options.consentScope, canRequestEmail: false, canCloseCall: false,
    allowedSourceStates: from, nextAllowedStates: [next], deliveryEvent,
    fallbackBehavior: 'Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient.',
    audio: deliveryType !== 'SPOKEN_CLIP' ? null : { boundText: text, phraseVersion: '2.0b2-draft-1', textHash: id === canonicalConsent.phraseId ? canonicalConsent.textHash : null, assetId: `${id.replaceAll('-', '_').toUpperCase()}_V1`, status: 'NOT_GENERATED', provider: 'ElevenLabs', voice: 'Isabella', model: 'eleven_flash_v2_5', version: 1, sha256: null },
    ...options,
  };
}
const asking: State[] = ['CONSENT_ASK', 'CONSENT_UNCLEAR'];
const explain: State[] = ['RIGHT_PERSON', 'PURPOSE_REQUEST', 'EXPLANATION_REQUEST', 'QUESTION_KNOWN'];
const authority: State[] = ['RECEPTIONIST', 'AUTHORITY_CHECK'];
const responses: ResponseClip[] = [
  unit('identify', 'OPENING', 'Identify the caller', 'I am calling on behalf of aPureBase.', 'Jeg ringer på vegne af aPureBase.', 'identified', 'ANSWERED', ['ANSWERED'], { priorStage20aId: 'identify' }),
  unit('greeting', 'OPENING', 'Call answered', 'Hello. Good day.', 'Hej. Goddag.', 'greeted', 'ANSWERED', ['ANSWERED']),
  unit('ask-target', 'OPENING', 'Ask for the intended HCP', 'May I speak with the healthcare professional concerned?', 'Må jeg tale med den relevante sundhedsperson?', 'target_asked', 'RIGHT_PERSON', ['ANSWERED', 'RIGHT_PERSON', 'RECEPTIONIST']),
  unit('purpose', 'PURPOSE', 'Explain the short purpose', 'We are calling to ask whether we may send professional information by email.', 'Vi ringer for at spørge, om vi må sende faglig information via e-mail.', 'explained', 'CONSENT_ASK', explain, { priorStage20aId: 'purpose' }),
  unit('about-apurebase', 'PURPOSE', 'What is aPureBase?', 'aPureBase contacts healthcare professionals about professional information.', 'aPureBase kontakter sundhedspersoner om faglig information.', 'explained', 'CONSENT_ASK', ['PURPOSE_REQUEST', 'QUESTION_KNOWN'], { wordingStatus: 'BUSINESS_APPROVAL_REQUIRED' }),
  unit('explanation', 'INFORMATION', 'Professional and medical information', 'The information may include professional and medical material.', 'Informationen kan omfatte fagligt og medicinsk materiale.', 'explained', 'CONSENT_ASK', explain, { priorStage20aId: 'explanation' }),
  unit('products-events', 'INFORMATION', 'Products, updates and professional events', 'It may also include product updates and invitations to professional activities.', 'Det kan også omfatte produktopdateringer og invitationer til faglige aktiviteter.', 'explained', 'CONSENT_ASK', ['EXPLANATION_REQUEST', 'QUESTION_KNOWN'], { wordingStatus: 'BUSINESS_APPROVAL_REQUIRED' }),
  unit('transfer-request', 'INTERMEDIARY', 'Target available / transfer requested', 'Would you transfer me to the healthcare professional?', 'Vil du stille mig om til sundhedspersonen?', 'transfer_requested', 'RIGHT_PERSON', ['RECEPTIONIST', 'RIGHT_PERSON', 'AUTHORITY_CHECK']),
  unit('target-unavailable', 'INTERMEDIARY', 'Target unavailable', 'When would it suit the healthcare professional for us to call again?', 'Hvornår vil det passe sundhedspersonen, at vi ringer igen?', 'callback_asked', 'CALLBACK', ['RECEPTIONIST', 'CALLBACK']),
  unit('authority-ask', 'AUTHORITY', 'Intermediary offers to handle the request', 'Do you have the required authority to handle this request and provide the healthcare professional’s email address?', 'Har du den nødvendige bemyndigelse til at håndtere denne forespørgsel og oplyse sundhedspersonens e-mailadresse?', 'authority_asked', 'AUTHORITY_CHECK', authority, { authorityCritical: true, wordingStatus: 'BUSINESS_APPROVAL_REQUIRED' }),
  unit('authority-claimed', 'AUTHORITY', 'Explicit authority claim awaits operator verification', 'Thank you. Your authority must be confirmed before we continue.', 'Tak. Din bemyndigelse skal bekræftes, før vi fortsætter.', 'authority_pending', 'AUTHORITY_CHECK', ['AUTHORITY_CHECK'], { authorityCritical: true, wordingStatus: 'BUSINESS_APPROVAL_REQUIRED' }),
  unit('authority-denied', 'AUTHORITY', 'No authority', 'Then I would like to speak with the healthcare professional directly.', 'Så vil jeg gerne tale med sundhedspersonen selv.', 'authority_declined', 'RECEPTIONIST', ['AUTHORITY_CHECK'], { authorityCritical: true }),
  unit('authority-unclear', 'AUTHORITY', 'Authority remains unclear', 'A colleague will need to help clarify this.', 'En kollega skal hjælpe med at afklare dette.', 'takeover', 'HUMAN_TAKEOVER', ['AUTHORITY_CHECK'], { authorityCritical: true }),
  unit('wrong-person-close', 'CLOSING', 'Wrong clinic or person', 'Thank you for clarifying. We will end the conversation.', 'Tak for afklaringen. Vi afslutter samtalen.', 'other_closed', 'END_OTHER', ['WRONG_PERSON'], { canCloseCall: true }),
  unit('consent-question', 'CONSENT', 'One atomic question for the identified target HCP, directly or through a verified intermediary', canonicalConsent.english, canonicalConsent.text, 'consent_question', 'CONSENT_ASK', asking, { consentCritical: true, authorityCritical: true, consentScope: scope, recipientTypes: ['TARGET_HCP', 'INTERMEDIARY'], priorStage20aId: 'consent-question', wordingStatus: 'BUSINESS_APPROVAL_REQUIRED' }),
  unit('intermediary-consent-question', 'CONSENT', 'Retired addressee variant; select the canonical consent-question instead', 'Use the canonical consent question after authority verification.', 'Brug det fælles samtykkespørgsmål efter kontrol af bemyndigelsen.', 'canonical_question_required', 'CONSENT_ASK', asking, { consentCritical: true, authorityCritical: true, recipientTypes: ['INTERMEDIARY'], wordingStatus: 'BUSINESS_APPROVAL_REQUIRED' }),
  unit('clarify', 'CLARIFICATION', 'Ambiguous answer / ASR uncertainty', 'Sorry, would you repeat your answer?', 'Undskyld, vil du gentage dit svar?', 'clarified', 'CONSENT_ASK', ['CONSENT_ASK', 'CONSENT_UNCLEAR'], { consentCritical: true, priorStage20aId: 'clarify' }),
  unit('email-request', 'EMAIL', 'Request email after reviewed YES', 'Which email address may we use?', 'Hvilken e-mailadresse må vi bruge?', 'email_requested', 'EMAIL_REQUEST', ['EMAIL_REQUEST'], { consentCritical: true, canRequestEmail: true, priorStage20aId: 'email-request' }),
  unit('email-confirm', 'EMAIL', 'Prompt exact human readback', 'Will you confirm the email address that I read back?', 'Vil du bekræfte den e-mailadresse, jeg læser op?', 'email_confirmation', 'EMAIL_CONFIRM', ['EMAIL_GIVEN'], { consentCritical: true, priorStage20aId: 'email-confirm' }),
  unit('email-correction', 'EMAIL', 'Incorrect address; request correction', 'Would you provide the correct email address?', 'Vil du oplyse den korrekte e-mailadresse?', 'email_correction', 'EMAIL_REQUEST', ['EMAIL_GIVEN', 'EMAIL_CONFIRM', 'EMAIL_REQUEST'], { consentCritical: true, canRequestEmail: true }),
  unit('email-unavailable', 'EMAIL', 'Refuses or cannot provide email', 'That is fine. We will end without registering an email address.', 'Det er i orden. Vi afslutter uden at registrere en e-mailadresse.', 'other_closed', 'END_OTHER', ['EMAIL_REQUEST'], { canCloseCall: true }),
  unit('callback', 'CALLBACK', 'Busy now / agree a callback', 'When would it suit you for us to call again?', 'Hvornår vil det passe dig, at vi ringer igen?', 'callback_asked', 'CALLBACK', ['BUSY', 'CALLBACK'], { priorStage20aId: 'callback' }),
  unit('callback-close', 'CLOSING', 'Callback close', 'Thank you for your time. We will call again another time.', 'Tak for din tid. Vi ringer igen en anden gang.', 'other_closed', 'END_OTHER', ['CALLBACK'], { canCloseCall: true, priorStage20aId: 'callback-close' }),
  unit('unsubscribe', 'INFORMATION', 'Future opt-out question', 'The confirmation email explains how to decline future information.', 'Bekræftelsesmailen forklarer, hvordan du kan frabede dig fremtidig information.', 'explained', 'CONSENT_ASK', ['QUESTION_KNOWN'], { wordingStatus: 'BUSINESS_APPROVAL_REQUIRED', priorStage20aId: 'unsubscribe' }),
  unit('confirmation-process', 'INFORMATION', 'Downstream single-opt-in / eight-day mechanism', 'The confirmation email describes the opportunity to decline information within eight days.', 'Bekræftelsesmailen beskriver muligheden for at frabede sig information inden for otte dage.', 'explained', 'CONSENT_ASK', ['QUESTION_KNOWN'], { wordingStatus: 'BUSINESS_APPROVAL_REQUIRED' }),
  unit('refusal-close', 'CLOSING', 'Explicit refusal or withdrawal', 'We respect that. Thank you for your time. Have a good day.', 'Det respekterer vi. Tak for din tid. Hav en god dag.', 'refusal_closed', 'END_REFUSED', ['CONSENT_NO'], { consentCritical: true, canCloseCall: true, priorStage20aId: 'refusal-close' }),
  unit('success-close', 'CLOSING', 'Reviewed consent and confirmed address', 'Thank you for your time and your permission. Have a good day.', 'Tak for din tid og din tilladelse. Hav en god dag.', 'success_closed', 'END_SUCCESS', ['EMAIL_CONFIRM'], { consentCritical: true, canCloseCall: true, priorStage20aId: 'success-close' }),
  unit('human-takeover', 'EXCEPTION', 'Unknown, medical, privacy, complaint or requested human', 'I will ask a colleague to help with your question.', 'Jeg vil bede en kollega hjælpe med dit spørgsmål.', 'takeover', 'HUMAN_TAKEOVER', ['QUESTION_UNKNOWN', 'AUTHORITY_CHECK', 'CONSENT_UNCLEAR']),
  unit('stop-contact-close', 'CLOSING', 'Asks to stop contact', 'I understand that you do not want further contact. We will end the conversation.', 'Jeg har forstået, at du ikke ønsker mere kontakt. Vi afslutter samtalen.', 'stop_closed', 'END_REFUSED', ['CONSENT_NO'], { consentCritical: true, canCloseCall: true, wordingStatus: 'BUSINESS_APPROVAL_REQUIRED' }),
  unit('receptionist-close', 'CLOSING', 'Unverified intermediary cannot continue', 'Thank you for your help. We will contact the relevant person another time.', 'Tak for hjælpen. Vi kontakter den relevante person en anden gang.', 'other_closed', 'END_OTHER', authority, { canCloseCall: true, priorStage20aId: 'receptionist-close' }),
];
export const commonTransitions: Readonly<Record<string, State>> = {
  GREETING: 'ANSWERED', RIGHT_PERSON: 'RIGHT_PERSON', RECEPTIONIST: 'RECEPTIONIST',
  TARGET_AVAILABLE: 'RECEPTIONIST', TARGET_UNAVAILABLE: 'CALLBACK', INTERMEDIARY_OFFER: 'AUTHORITY_CHECK',
  AUTHORITY_CLAIMED: 'AUTHORITY_CHECK', AUTHORITY_DENIED: 'AUTHORITY_CHECK', AUTHORITY_UNCLEAR: 'AUTHORITY_CHECK',
  WRONG_PERSON: 'WRONG_PERSON', BUSY: 'BUSY', CALLBACK: 'CALLBACK',
  PURPOSE_REQUEST: 'PURPOSE_REQUEST', ABOUT_APUREBASE: 'PURPOSE_REQUEST', EXPLANATION_REQUEST: 'EXPLANATION_REQUEST', PRODUCTS_EVENTS: 'EXPLANATION_REQUEST', MORE_INFORMATION: 'EXPLANATION_REQUEST',
  REFUSAL: 'CONSENT_NO', WITHDRAWAL: 'CONSENT_NO', STOP_CONTACT: 'CONSENT_NO',
  AMBIGUOUS: 'CONSENT_UNCLEAR', AFFIRMATIVE: 'CONSENT_UNCLEAR', ASR_UNCERTAIN: 'CONSENT_UNCLEAR',
  QUESTION_KNOWN: 'QUESTION_KNOWN', CONFIRMATION_PROCESS: 'QUESTION_KNOWN',
  QUESTION_UNKNOWN: 'QUESTION_UNKNOWN', UNKNOWN: 'QUESTION_UNKNOWN', MEDICAL_QUESTION: 'QUESTION_UNKNOWN',
  LEGAL_PRIVACY_QUESTION: 'QUESTION_UNKNOWN', COMPLAINT: 'QUESTION_UNKNOWN', REQUEST_HUMAN: 'QUESTION_UNKNOWN',
  EMAIL_GIVEN: 'CONSENT_UNCLEAR', EMAIL_INCORRECT: 'QUESTION_UNKNOWN', EMAIL_CONFIRMED: 'CONSENT_UNCLEAR', EMAIL_REFUSED: 'QUESTION_UNKNOWN', EMAIL_UNAVAILABLE: 'QUESTION_UNKNOWN',
  takeover: 'HUMAN_TAKEOVER', end: 'END_OTHER',
};
const transitions = Object.fromEntries(states.map(state => [state, state.startsWith('END_') ? {} : state === 'HUMAN_TAKEOVER' ? { end: 'END_OTHER' } : { ...commonTransitions }])) as ConversationDefinition['transitions'];
for (const response of responses) for (const state of response.allowedSourceStates) Object.assign(transitions[state], { [response.deliveryEvent]: response.nextAllowedStates[0] });
for (const state of asking) Object.assign(transitions[state], { candidate_yes: 'CONSENT_YES' });
Object.assign(transitions.CONSENT_YES, { reviewed_yes: 'EMAIL_REQUEST' });
for (const state of ['EMAIL_REQUEST', 'EMAIL_GIVEN', 'EMAIL_CONFIRM'] as const) Object.assign(transitions[state], { EMAIL_GIVEN: 'EMAIL_GIVEN', EMAIL_INCORRECT: 'EMAIL_REQUEST', EMAIL_CONFIRMED: state, EMAIL_REFUSED: 'EMAIL_REQUEST', EMAIL_UNAVAILABLE: 'EMAIL_REQUEST' });
Object.assign(transitions.AUTHORITY_CHECK, { authority_confirmed: 'RIGHT_PERSON' });
export const consentDefinition: ConversationDefinition = {
  id: 'apurebase-consent', version: '2.0b2-1', initial: 'ANSWERED', consentScope: scope, transitions, responses,
  recommendations: { ANSWERED: 'identify', RIGHT_PERSON: 'purpose', RECEPTIONIST: 'authority-ask', AUTHORITY_CHECK: 'authority-ask', WRONG_PERSON: 'wrong-person-close', BUSY: 'callback', PURPOSE_REQUEST: 'purpose', EXPLANATION_REQUEST: 'explanation', CONSENT_ASK: 'consent-question', CONSENT_UNCLEAR: 'clarify', CONSENT_NO: 'refusal-close', EMAIL_REQUEST: 'email-request', EMAIL_GIVEN: 'email-confirm', EMAIL_CONFIRM: 'success-close', QUESTION_KNOWN: 'unsubscribe', QUESTION_UNKNOWN: 'human-takeover', CALLBACK: 'callback-close' },
  intentRecommendations: { ABOUT_APUREBASE: 'about-apurebase', PRODUCTS_EVENTS: 'products-events', AUTHORITY_CLAIMED: 'authority-claimed', AUTHORITY_DENIED: 'authority-denied', AUTHORITY_UNCLEAR: 'authority-unclear', TARGET_AVAILABLE: 'transfer-request', TARGET_UNAVAILABLE: 'target-unavailable', EMAIL_INCORRECT: 'email-correction', EMAIL_REFUSED: 'email-unavailable', EMAIL_UNAVAILABLE: 'email-unavailable', STOP_CONTACT: 'stop-contact-close', CONFIRMATION_PROCESS: 'confirmation-process' },
  consentQuestions: { TARGET_HCP: 'consent-question', INTERMEDIARY: 'consent-question' },
};
export const plannedAssetManifest = { version: 2, productionApproved: false, assets: responses.filter(r => r.deliveryType === 'SPOKEN_CLIP').map(response => ({ phraseId: response.id, wordingVersion: response.version, text: response.text, productionApproval: response.productionApproval, audio: response.audio! })) };
export function validateDefinition(definition: ConversationDefinition) {
  if (!states.includes(definition.initial) || !definition.id || !definition.version || !definition.consentScope) throw new Error('Invalid conversation definition.');
  const operational = definition.version === wordingVersion;
  const ids = new Set<string>(), assets = new Set<string>();
  for (const response of definition.responses) {
    assertDanishVoice(response.voice);
    if (ids.has(response.id) || !response.text || !response.english || !response.requiresAgentApproval || response.language !== 'da') throw new Error('Invalid response registry.');
    ids.add(response.id);
    if (operational && response.deliveryType === 'SPOKEN_CLIP') {
      const frozen = approvedInventory.find(p => p.id === response.id);
      if (!frozen || response.text !== frozen.text || response.version !== wordingVersion || response.audio?.textHash !== frozen.textHash || response.canArmConsent !== frozen.consentCritical || JSON.stringify(response.recipientTypes ?? []) !== JSON.stringify(frozen.recipientTypes) || response.approval !== 'business-authorized') throw new Error('Operational wording/role binding rejected.');
    }
    if (response.audioAsset !== null || response.productionApproval !== 'NOT_APPROVED') throw new Error('Audio must remain unapproved.');
    if (response.deliveryType === 'SPOKEN_CLIP') {
      const audio = response.audio;
      const actual = operational ? verifiedAssets.find(a => a.phraseId === response.id) : undefined;
      if (!audio || assets.has(audio.assetId) || (!operational && (audio.status !== 'NOT_GENERATED' || audio.sha256 !== null)) || operational && (actual ? audio.status !== 'GENERATED_VERIFIED_LOCAL_ONLY' || audio.sha256 !== actual.assetHash : audio.status !== 'DYNAMIC_UNRESOLVED' || audio.sha256 !== null) || audio.boundText !== response.text || audio.phraseVersion !== response.version) throw new Error('Planned asset text/version binding invalid.');
      assets.add(audio.assetId);
    } else if (response.audio !== null || response.canArmConsent) throw new Error('Nonspoken actions cannot require audio or arm consent.');
    if (response.canArmConsent !== !!response.consentScope || response.consentScope && (!response.consentCritical || response.consentScope !== definition.consentScope || !response.recipientTypes?.length)) throw new Error('Invalid consent response scope.');
    if (!response.nextAllowedStates.length || response.nextAllowedStates.some(s => !states.includes(s)) || !response.allowedSourceStates.length) throw new Error('Invalid response transition.');
    for (const from of response.allowedSourceStates) if (!response.nextAllowedStates.includes(definition.transitions[from]?.[response.deliveryEvent])) throw new Error('Response metadata disagrees with transition graph.');
  }
  const questions = definition.responses.filter(r => r.canArmConsent);
  if (operational) {
    const required = approvedInventory.filter(p => p.consentCritical);
    if (questions.length !== required.length || required.some(p => !questions.some(q => q.id === p.id))) throw new Error('Approved consent question inventory differs.');
  } else if (questions.length !== 1 || questions[0].id !== canonicalConsent.phraseId || questions[0].text !== canonicalConsent.text || questions[0].version !== canonicalConsent.version || questions[0].audio?.textHash !== canonicalConsent.textHash) throw new Error('Exactly one canonical bound consent question is required.');
  for (const state of states) {
    if (!definition.transitions[state] || Object.values(definition.transitions[state]).some(next => !states.includes(next))) throw new Error('Invalid state graph.');
    if ((state.startsWith('END_') && Object.keys(definition.transitions[state]).length) || state === 'HUMAN_TAKEOVER' && Object.keys(definition.transitions[state]).some(e => e !== 'end')) throw new Error('Terminal/takeover state cannot restart.');
    const id = definition.recommendations[state];
    if (id && !ids.has(id)) throw new Error('Unknown recommended response.');
  }
}
