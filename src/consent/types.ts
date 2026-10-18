export const states = [
  'ANSWERED', 'RIGHT_PERSON', 'RECEPTIONIST', 'BUSY', 'PURPOSE_REQUEST',
  'EXPLANATION_REQUEST', 'CONSENT_ASK', 'CONSENT_YES', 'CONSENT_NO',
  'CONSENT_UNCLEAR', 'EMAIL_REQUEST', 'EMAIL_GIVEN', 'EMAIL_CONFIRM',
  'QUESTION_KNOWN', 'QUESTION_UNKNOWN', 'CALLBACK', 'HUMAN_TAKEOVER',
  'END_SUCCESS', 'END_REFUSED', 'END_OTHER', 'AUTHORITY_CHECK', 'WRONG_PERSON',
] as const;
export type State = typeof states[number];
export const intents = [
  'GREETING', 'RIGHT_PERSON', 'RECEPTIONIST', 'BUSY', 'PURPOSE_REQUEST',
  'EXPLANATION_REQUEST', 'AFFIRMATIVE', 'REFUSAL', 'AMBIGUOUS',
  'EMAIL_GIVEN', 'QUESTION_KNOWN', 'QUESTION_UNKNOWN', 'CALLBACK', 'UNKNOWN',
  'TARGET_AVAILABLE', 'TARGET_UNAVAILABLE', 'INTERMEDIARY_OFFER', 'AUTHORITY_CLAIMED',
  'AUTHORITY_DENIED', 'AUTHORITY_UNCLEAR', 'WRONG_PERSON', 'ABOUT_APUREBASE',
  'PRODUCTS_EVENTS', 'MORE_INFORMATION', 'CONFIRMATION_PROCESS', 'EMAIL_INCORRECT',
  'EMAIL_CONFIRMED', 'EMAIL_REFUSED', 'EMAIL_UNAVAILABLE', 'WITHDRAWAL', 'STOP_CONTACT',
  'MEDICAL_QUESTION', 'LEGAL_PRIVACY_QUESTION', 'COMPLAINT', 'REQUEST_HUMAN', 'ASR_UNCERTAIN',
] as const;
export type Intent = typeof intents[number];
export type ConsentClass = 'YES' | 'NO' | 'UNCLEAR';
export type Respondent = 'unverified' | 'recipient' | 'receptionist';
export type RecipientType = 'TARGET_HCP' | 'INTERMEDIARY' | 'UNKNOWN';
export type AuthorityStatus = 'NOT_APPLICABLE' | 'UNVERIFIED' | 'CLAIMED' | 'AGENT_CONFIRMED' | 'DENIED';
export interface AuthorityEvidence {
  transcriptTurnId: string; transcriptText: string; classifiedIntent: Intent;
  recordedAt: string; recipientRevision: number;
}
export interface RecipientEvidence {
  recipientType: RecipientType; targetVerified: boolean; recipientRevision: number;
  authorityPolicyVersion?: string; authorityEvidenceTurnId?: string; authorityEvidenceText?: string;
  authorityAttestedBy?: string; authorityAttestedAt?: string;
  identityAttestation?: { reason: string; recordedAt: string };
  authorityStatus: AuthorityStatus; authorityEvidence?: AuthorityEvidence;
  authorityAttestation?: { evidenceTurnId: string; reason: string; recordedAt: string; recipientRevision: number; attestedBy: string };
}
export type DeliveryType = 'SPOKEN_CLIP' | 'SYSTEM_ACTION' | 'OPERATOR_ACTION' | 'NO_AUDIO';
export type WordingStatus = 'SOURCE_SUPPORTED' | 'DRAFT_NATIVE_REVIEW_REQUIRED' | 'BUSINESS_APPROVAL_REQUIRED' | 'BUSINESS_AUTHORIZED';
export interface PlannedAudio {
  assetId: string; status: 'NOT_GENERATED' | 'GENERATED_VERIFIED_LOCAL_ONLY' | 'DYNAMIC_UNRESOLVED'; provider: 'ElevenLabs'; voice: 'Isabella';
  model: 'eleven_flash_v2_5'; version: number; sha256: string | null;
  boundText: string; phraseVersion: string; textHash: string | null;
}
export interface Transcript {
  id: string;
  text: string;
  final: boolean;
  source: 'manual-rehearsal' | 'provider';
  observedAt: number;
  speechStartedAt?: number;
  english?: string;
  providerItemId?: string;
  /** Captured at speech onset; never reassign a delayed final to a new window. */
  answerPlaybackId?: string;
}
export interface Classification {
  intent: Intent;
  confidence: number;
  basis: string;
  classifierVersion: string;
}
export interface ResponseClip {
  id: string;
  state: State;
  intent: Intent | 'PROMPT';
  language: 'da';
  text: string;
  english: string;
  audioAsset: null;
  voice: { provider: 'ElevenLabs'; name: 'Isabella'; voiceId: string; modelId: 'eleven_flash_v2_5' };
  version: string;
  approval: 'draft' | 'business-authorized';
  requiresAgentApproval: true;
  consentCritical: boolean;
  consentScope?: string;
  nextAllowedStates: readonly State[];
  deliveryEvent: string;
  category: string;
  scenario: string;
  wordingStatus: WordingStatus;
  reviewRequirements: readonly ('NATIVE_DANISH' | 'BUSINESS')[];
  allowedSourceStates: readonly State[];
  recipientTypes?: readonly RecipientType[];
  authorityCritical: boolean;
  canArmConsent: boolean;
  canRequestEmail: boolean;
  canCloseCall: boolean;
  fallbackBehavior: string;
  productionApproval: 'NOT_APPROVED';
  deliveryType: DeliveryType;
  audio: PlannedAudio | null;
  priorStage20aId?: string;
  dynamicValues?: readonly string[];
}
export interface ConversationDefinition {
  id: string;
  version: string;
  initial: State;
  consentScope: string;
  transitions: Record<State, Readonly<Record<string, State>>>;
  responses: readonly ResponseClip[];
  recommendations: Partial<Record<State, string>>;
  intentRecommendations?: Partial<Record<Intent, string>>;
  consentQuestions?: Partial<Record<RecipientType, string>>;
}
export interface QuestionEvidence {
  responseId: string;
  scope: string;
  completedAt: number;
  delivery: 'rehearsed' | 'audible';
  instanceId?: string; responseVersion?: string; exactText?: string;
  playback?: PlaybackRecord; textHash?: string;
  recipientRevision?: number; recipientType?: RecipientType;
}
export interface ConsentEvidence {
  classification: ConsentClass;
  eligibleYes: boolean;
  reason: string;
  question?: QuestionEvidence;
  respondent: Respondent;
  recipient: RecipientEvidence;
}
export interface AgentReview {
  classification: ConsentClass;
  reason: string;
  reviewedAt: number;
  overridden: boolean;
}
export interface TurnRecord {
  id: string;
  callId: string;
  timestamp: string;
  transcript: Transcript;
  classification: Classification;
  stateBefore: State;
  stateAfter: State;
  recommendedResponseId?: string;
  selections: { responseId: string; at: number; acceptedRecommendation: boolean; action: 'rehearse' | 'play' | 'repeat' }[];
  skipped?: boolean;
  review?: AgentReview;
  fallbackReason?: string;
  consent: ConsentEvidence;
  latency: { classificationMs: number; observationToRecommendationMs: number; agentDecisionMs?: number; playbackMs?: number };
}
export interface DiagnosticEvent { sequence: number; at: number; timestamp: string; callId: string; event: string; data: Record<string, unknown> }
export interface ConsentDecision { turnId: string; classification: ConsentClass; at: number; recordedAt: string; recipientRevision: number; questionInstanceId?: string }
export interface EmailEvidence {
  value: string; turnId: string; // Compatibility aliases; never a silent repair.
  rawTranscript: string; normalizedCandidate: string; readbackValue?: string;
  normalizationChanged: boolean; normalizationReviewedAt?: string;
  confirmed: boolean; confirmedAt?: string; sourceTurnId: string;
  recipientRevision: number; consentTurnId: string; correctionOfTurnId?: string;
}
export interface ConsentSnapshot extends RecipientEvidence {
  callId: string;
  state: State;
  respondent: Respondent;
  partial: string;
  turns: TurnRecord[];
  recommendedResponseId?: string;
  decision?: ConsentDecision;
  email?: EmailEvidence;
  emailStatus: 'NOT_REQUESTED' | 'AWAITING_EMAIL' | 'GIVEN' | 'CORRECTION_REQUIRED' | 'READBACK_REQUIRED' | 'CONFIRMED' | 'UNAVAILABLE';
  playing: boolean;
  mode: 'offline-rehearsal';
  playbacks: PlaybackRecord[]; activePlaybackId?: string; answerWindow?: AnswerWindow; handoff?: HandoffRecord;
  fallbackReason?: string;
  doNotContactRequested?: { sourceTurnId: string; recordedAt: string; downstreamActionCompleted: false };
}

export const playbackStates = ['NOT_STARTED', 'QUEUED', 'PLAYING', 'COMPLETED', 'INTERRUPTED', 'FAILED'] as const;
export type PlaybackState = typeof playbackStates[number];
export interface PlaybackRecord {
  playbackId: string; callId: string; phraseId: string; phraseVersion: string;
  assetId: string; assetHash: string | null; state: PlaybackState;
  textHash?: string; mode?: 'mock' | 'local-prerecorded'; outputProof?: string; gain?: { gainApplied: number; clippingEvents: number; peakProtectionEvents: number; postGainPeak: number };
  queuedAt: number | null; startedAt: number | null; completedAt: number | null;
  interruptedAt: number | null; failedAt: number | null;
  completionSource: 'MOCK_ADAPTER' | 'VERIFIED_OUTPUT_ADAPTER' | null;
  recipientRevision: number; answerConsumed: boolean;
}
export interface AnswerWindow { playbackId: string; openedAt: number; recipientRevision: number; status: 'OPEN' | 'CONSUMED' | 'INVALIDATED' }
export interface ConsentHandoffCandidate {
  auditVersion: '2.0b2-1'; evaluationOnly: true; callId: string; recipientType: RecipientType;
  recipientEvidence: RecipientEvidence; consentScopeId: string; consentQuestionPhraseId: string;
  consentQuestionVersion: string; consentQuestionTextHash: string; playbackId: string;
  playbackCompletedAt: number; completionSource: PlaybackRecord['completionSource'];
  answerTurnId: string; answerTranscript: string; answerClassification: 'YES';
  agentReviewedAt: number; consentDateTime: string; email: EmailEvidence;
}
export interface HandoffRecord {
  candidate: ConsentHandoffCandidate; status: 'PENDING_HANDOFF' | 'HANDED_OFF' | 'HANDOFF_FAILED';
  attempts: { at: string; status: 'HANDED_OFF' | 'HANDOFF_FAILED'; reason: string; mock: true }[];
}
