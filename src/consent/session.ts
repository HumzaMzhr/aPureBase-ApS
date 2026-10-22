import { renderSlot, validateName, verifyDynamicAsset, type NameEvidence, type SpeechSlot, type SpeechBinding } from './dynamic/render';
import { currentSlot, type DynamicSpeechPort } from './dynamic/port';
import { verifiedAssets } from './approved/assetPack';
import type { LocalPlaybackEvent, LocalPlaybackPort } from './approved/localPlayback';
import { wordingVersion } from './approved/assets';
import { MockPlaybackAdapter } from './mockPlayback';
import { handoffCandidate } from './handoff';
import { canonicalConsent } from './wording';
import { ConservativeDanishClassifier, literalEmail, validateClassification, type IntentClassifier } from './classifier';
import { evaluateConsent, guardReview } from './consentGuard';
import { consentDefinition, validateDefinition } from './definition';
import { assertPlayable, PlaceholderPlayback, type ResponsePlayback } from './playback';
import { isTerminal, transition } from './stateMachine';
import { authorityPolicyVersion, eligibleRecipient, explicitAuthorityClaim } from './authority';
import { emailCandidate } from './email';
import type { ConsentClass, ConsentSnapshot, ConversationDefinition, DiagnosticEvent, Intent, QuestionEvidence, RecipientType, Respondent, ResponseClip, Transcript, TurnRecord } from './types';

export interface TakeoverContext { callId: string; reason: string; lastTurnId?: string }
export interface SessionPorts {
  assetPolicy?: { definitionId:string; validateDefinition:(definition:ConversationDefinition)=>void; assets:readonly import('./approved/assets').VerifiedAsset[]; render:typeof renderSlot; verifyDynamic:typeof verifyDynamicAsset };
  now?: () => number;
  wallClock?: () => string;
  classifier?: IntentClassifier;
  playback?: ResponsePlayback;
  operatorId?: string;
  localPlayback?: LocalPlaybackPort;
  dynamicSpeech?: DynamicSpeechPort;
  stopTranscription?: () => void;
  takeover?: (context: TakeoverContext) => void;
}
/** Local evaluation only. No audio, network, browser persistence or consent API. */
export class ConsentSession {
  private data: ConsentSnapshot;
  private events: DiagnosticEvent[] = [];
  private listeners = new Set<() => void>();
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private question?: QuestionEvidence;
  private name?: NameEvidence;
  private dynamicAbort?: AbortController;
  private effective = new Map<string, ResponseClip>();
  private dynamicBindings = new Map<string, SpeechBinding>();
  private emailQuestion?: { playbackId: string; completedAt: number; sourceTurnId: string; recipientRevision: number; consumed: boolean };
  private emailAnswer?: { turnId: string; sourceTurnId: string; playbackId: string };
  private definition: ConversationDefinition;
  private seen = new Set<string>();
  private lastResponseId?: string;
  private questionSequence = 0;
  private mock = new MockPlaybackAdapter();
  private onsetOwners = new Map<string, { speechStartedAt?: number; answerPlaybackId?: string }>();
  private emailCorrectionFrom?: string;
  private misunderstandings = 0;
  private now: () => number;
  private wallClock: () => string;
  private classifier: IntentClassifier;
  private playback: ResponsePlayback;
  constructor(callId: string, private ports: SessionPorts = {}, definition = consentDefinition) {
    if(ports.assetPolicy && ports.assetPolicy.definitionId!==definition.id)throw new Error('Asset policy definition mismatch.');
    (ports.assetPolicy?.validateDefinition??validateDefinition)(definition);
    if (!callId || callId.length > 160) throw new Error('A bounded call ID is required.');
    this.definition = structuredClone(definition);
    this.now = ports.now ?? (() => performance.now());
    this.wallClock = ports.wallClock ?? (() => new Date().toISOString());
    this.classifier = ports.classifier ?? new ConservativeDanishClassifier();
    this.playback = ports.playback ?? new PlaceholderPlayback();
    this.data = { callId, state: definition.initial, respondent: 'unverified', recipientType: 'UNKNOWN', targetVerified: false, authorityStatus: 'UNVERIFIED', authorityPolicyVersion, recipientRevision: 0, playbacks: [], emailStatus: 'NOT_REQUESTED', partial: '', turns: [], playing: false, mode: 'offline-rehearsal' };
    this.recommend();
    this.log('session.started', { definitionId: definition.id, definitionVersion: definition.version, mode: this.data.mode });
  }
  snapshot(): ConsentSnapshot { return structuredClone(this.data); }
  response(id?: string): ResponseClip | undefined {
    const response = this.definition.responses.find(response => response.id === id);
    return response ? structuredClone(response) : undefined;
  }
  exportReview() {
    return structuredClone({ version: 2, definitionId: this.definition.id, definitionVersion: this.definition.version, ...this.data, dynamicName: this.name, dynamicBindings: Object.fromEntries(this.dynamicBindings), events: this.events, sourceAudioStored: false, phoneTransport: false, productionAudio: false, downstreamConfirmationEmailSent: false, downstreamBounceMonitoring: false, note: 'Offline rehearsal only. No physical timing, legal authority determination or production consent evidence. Exported text may contain personal data.' });
  }
  private log(event: string, data: Record<string, unknown>) {
    if (this.events.length >= 4000) throw new Error('Evaluation log is full; export and start a new session.');
    this.events.push({ sequence: this.events.length + 1, at: this.now(), timestamp: this.wallClock(), callId: this.data.callId, event, data });
    for (const listener of this.listeners) listener();
  }
  private active() {
    if (isTerminal(this.data.state) || this.data.state === 'HUMAN_TAKEOVER') throw new Error('Hybrid session is no longer active.');
    if (this.events.length > 3900) throw new Error('Evaluation log nearly full; export and end this session.');
  }
  private expectedQuestion(responseId?: string, playbackId?: string) {
    const questionPlayback = playbackId ?? (this.question && this.question.responseId === responseId ? this.question.instanceId : this.data.turns.find(t => t.id === this.data.decision?.turnId)?.consent.question?.instanceId);
    const effective = questionPlayback ? this.effective.get(questionPlayback) : undefined;
    const r = effective?.canArmConsent ? effective : this.definition.responses.find(r => r.id === responseId && r.canArmConsent);
    return r && r.audio?.textHash ? { phraseId: r.id, text: r.text, version: r.version, textHash: r.audio.textHash, recipientTypes: r.recipientTypes } : undefined;
  }
  private recommend(intent?: Intent) {
    this.data.recommendedResponseId = this.definition.recommendations[this.data.state];
    if (this.data.state === 'CONSENT_ASK') this.data.recommendedResponseId = this.definition.consentQuestions?.[this.data.recipientType] ?? this.data.recommendedResponseId;
    const specific = intent && this.definition.intentRecommendations?.[intent];
    if (specific && this.response(specific)?.allowedSourceStates.includes(this.data.state)) this.data.recommendedResponseId = specific;
    if (this.data.fallbackReason && this.data.state === 'CONSENT_UNCLEAR') this.data.recommendedResponseId = 'human-takeover';
  }
  private move(event: string) {
    const before = this.data.state;
    this.data.state = transition(this.definition, before, event);
    this.recommend();
    this.log('state.changed', { before, after: this.data.state, trigger: event });
  }
  setRespondent(value: Respondent, reason: string) {
    if (!['unverified', 'recipient', 'receptionist'].includes(value) || !reason.trim()) throw new Error('Recipient verification requires an agent reason.');
    // Compatibility entry point for Stage 2.0A callers; no intermediary authority.
    this.setRecipient(value === 'recipient' ? 'TARGET_HCP' : value === 'receptionist' ? 'INTERMEDIARY' : 'UNKNOWN', reason, value === 'recipient');
  }
  private invalidateDependents(reason: string) {
    this.closeWindow();
    this.cancelPendingPlayback();
    if (this.data.decision || this.data.email) this.log('dependent_evidence.invalidated', { reason, decision: this.data.decision, email: this.data.email });
    this.data.decision = undefined;
    this.data.email = undefined;
    this.data.emailStatus = 'NOT_REQUESTED';
    this.emailCorrectionFrom = undefined;
  }
  setRecipient(value: RecipientType, reason: string, verifyTarget = false) {
    this.active();
    if (!['TARGET_HCP', 'INTERMEDIARY', 'UNKNOWN'].includes(value) || !reason.trim()) throw new Error('Recipient selection requires an explicit operator reason.');
    this.invalidateDependents('Recipient changed or reverified.');
    this.data.recipientRevision++;
    this.data.recipientType = value;
    this.data.targetVerified = value === 'TARGET_HCP' && verifyTarget;
    this.data.identityAttestation = this.data.targetVerified ? { reason, recordedAt: this.wallClock() } : undefined;
    this.data.authorityStatus = value === 'TARGET_HCP' ? 'NOT_APPLICABLE' : 'UNVERIFIED';
    this.data.authorityEvidence = undefined;
    this.data.authorityEvidenceTurnId = undefined; this.data.authorityEvidenceText = undefined;
    this.data.authorityAttestedBy = undefined; this.data.authorityAttestedAt = undefined;
    this.data.authorityAttestation = undefined;
    this.data.fallbackReason = undefined;
    this.data.respondent = value === 'TARGET_HCP' && verifyTarget ? 'recipient' : value === 'INTERMEDIARY' ? 'receptionist' : 'unverified';
    this.move(value === 'INTERMEDIARY' ? 'RECEPTIONIST' : value === 'TARGET_HCP' ? 'RIGHT_PERSON' : 'GREETING');
    this.log('recipient.agent_selected', { value, targetVerified: this.data.targetVerified, reason, recipientRevision: this.data.recipientRevision });
  }
  confirmAuthority(evidenceTurnId: string, reason: string, attestedBy = this.ports.operatorId ?? 'offline-rehearsal-operator') {
    this.active();
    const evidence = this.data.authorityEvidence;
    const turn = this.data.turns.find(turn => turn.id === evidenceTurnId);
    if (this.data.state !== 'AUTHORITY_CHECK' || this.data.recipientType !== 'INTERMEDIARY' || this.data.authorityStatus !== 'CLAIMED' || !reason.trim() || !attestedBy.trim() || !evidence || evidence.transcriptTurnId !== evidenceTurnId || evidence.recipientRevision !== this.data.recipientRevision || evidence.classifiedIntent !== 'AUTHORITY_CLAIMED' || !explicitAuthorityClaim(evidence.transcriptText) || !turn?.transcript.final || turn.transcript.text !== evidence.transcriptText || turn.skipped) throw new Error('Explicit current authority evidence and a separate operator attestation are required. Override cannot manufacture evidence.');
    this.invalidateDependents('Authority operator confirmation.');
    this.data.authorityStatus = 'AGENT_CONFIRMED';
    this.data.authorityAttestation = { evidenceTurnId, reason, recordedAt: this.wallClock(), recipientRevision: this.data.recipientRevision, attestedBy };
    this.data.authorityAttestedBy = attestedBy; this.data.authorityAttestedAt = this.data.authorityAttestation.recordedAt;
    this.data.fallbackReason = undefined;
    this.move('authority_confirmed');
    this.log('authority.agent_attested', { evidence: this.data.authorityEvidence, attestation: this.data.authorityAttestation, legalAuthorityDetermined: false });
  }
  private reviewedYes() {
    return eligibleRecipient(this.data) && this.data.decision?.classification === 'YES' && this.data.decision.recipientRevision === this.data.recipientRevision && !this.data.doNotContactRequested;
  }
  receive(input: Transcript): void {
    const emailQuestion = this.emailQuestion && structuredClone(this.emailQuestion);
    let turn = { ...input };
    this.active();
    if (!turn.id || turn.id.length > 160 || typeof turn.final !== 'boolean' || typeof turn.text !== 'string' || turn.text.length > 4000 || turn.english !== undefined && (typeof turn.english !== 'string' || turn.english.length > 4000) || !['manual-rehearsal', 'provider'].includes(turn.source) || !Number.isFinite(turn.observedAt) || turn.observedAt < 0 || turn.observedAt > this.now() || turn.speechStartedAt !== undefined && (!Number.isFinite(turn.speechStartedAt) || turn.speechStartedAt < 0 || turn.speechStartedAt > turn.observedAt)) throw new Error('Invalid transcript evidence.');
    if (this.seen.has(turn.id)) throw new Error('Duplicate final transcript ID; no replay is accepted.');
    const owner = this.onsetOwners.get(turn.id);
    if (owner) turn = { ...turn, ...owner };
    if (!turn.final) {
      if (!owner && this.onsetOwners.size >= 200) throw new Error('Pending speech retention limit reached; export before continuing.');
      if (!owner) this.onsetOwners.set(turn.id, { speechStartedAt: turn.speechStartedAt, answerPlaybackId: turn.answerPlaybackId });
      this.data.partial = turn.text;
      this.log('recognition.partial_observed', { ...turn });
      this.observeBargeIn(turn); return;
    }
    this.onsetOwners.delete(turn.id);
    this.observeBargeIn(turn);
    if (this.data.turns.length >= 200) throw new Error('Turn retention limit reached; export before continuing.');
    const started = this.now();
    const classification = validateClassification(this.classifier.classify({ ...turn }));
    const stateBefore = this.data.state;
    const question = this.question;
    // A question is consumed by exactly the next finalized utterance, including
    // silence/uncertainty/questions. Later unrelated YES cannot reuse it.
    this.closeWindow('CONSUMED');
    this.cancelPendingPlayback();
    this.data.fallbackReason = undefined;
    if (classification.intent === 'RECEPTIONIST' || classification.intent === 'WRONG_PERSON') {
      this.invalidateDependents('Transcript identifies an intermediary or wrong party.');
      this.data.recipientRevision++;
      this.data.recipientType = classification.intent === 'RECEPTIONIST' ? 'INTERMEDIARY' : 'UNKNOWN';
      this.data.targetVerified = false;
      this.data.identityAttestation = undefined;
      this.data.authorityStatus = 'UNVERIFIED';
      this.data.authorityEvidence = undefined;
      this.data.authorityEvidenceTurnId = undefined; this.data.authorityEvidenceText = undefined;
      this.data.authorityAttestedBy = undefined; this.data.authorityAttestedAt = undefined;
      this.data.authorityAttestation = undefined;
      this.data.respondent = classification.intent === 'RECEPTIONIST' ? 'receptionist' : 'unverified';
    }
    if (['AUTHORITY_CLAIMED', 'AUTHORITY_DENIED', 'AUTHORITY_UNCLEAR'].includes(classification.intent)) {
      this.invalidateDependents('Authority evidence changed.');
      this.data.recipientRevision++;
      this.data.authorityAttestation = undefined;
      this.data.authorityEvidence = undefined;
      this.data.authorityEvidenceTurnId = undefined; this.data.authorityEvidenceText = undefined;
      this.data.authorityAttestedBy = undefined; this.data.authorityAttestedAt = undefined;
      this.data.targetVerified = false;
      this.data.identityAttestation = undefined;
      if (this.data.recipientType !== 'INTERMEDIARY') {
        this.data.recipientType = 'UNKNOWN'; this.data.respondent = 'unverified'; this.data.authorityStatus = 'UNVERIFIED';
        this.data.fallbackReason = 'Recipient type must be established before intermediary authority review.';
      } else {
        this.data.authorityStatus = classification.intent === 'AUTHORITY_CLAIMED' && explicitAuthorityClaim(turn.text) ? 'CLAIMED' : classification.intent === 'AUTHORITY_DENIED' ? 'DENIED' : 'UNVERIFIED';
        this.data.authorityEvidence = { transcriptTurnId: turn.id, transcriptText: turn.text, classifiedIntent: classification.intent, recordedAt: this.wallClock(), recipientRevision: this.data.recipientRevision };
      }
      this.data.authorityEvidenceTurnId = this.data.authorityEvidence?.transcriptTurnId;
      this.data.authorityEvidenceText = this.data.authorityEvidence?.transcriptText;
      this.log('authority.evidence_recorded', { status: this.data.authorityStatus, evidence: this.data.authorityEvidence });
    }
    const consent = evaluateConsent(turn, this.data.respondent, this.definition.consentScope, question, this.data, this.expectedQuestion(question?.responseId, question?.instanceId));
    this.seen.add(turn.id);
    this.data.partial = '';
    if (consent.classification === 'NO' || ['REFUSAL', 'WITHDRAWAL', 'STOP_CONTACT'].includes(classification.intent)) this.invalidateDependents('Explicit refusal or withdrawal.');
    if (classification.intent === 'STOP_CONTACT') this.data.doNotContactRequested = { sourceTurnId: turn.id, recordedAt: this.wallClock(), downstreamActionCompleted: false };
    let event: string = classification.intent;
    if (consent.classification === 'NO' && !['WITHDRAWAL', 'STOP_CONTACT'].includes(event)) event = 'REFUSAL';
    else if (consent.eligibleYes && ['CONSENT_ASK', 'CONSENT_UNCLEAR'].includes(stateBefore)) event = 'candidate_yes';
    else if (event === 'EMAIL_GIVEN' && !(literalEmail(turn.text) && this.reviewedYes() && ['EMAIL_REQUEST', 'EMAIL_GIVEN', 'EMAIL_CONFIRM'].includes(stateBefore))) event = 'AMBIGUOUS';
    if (['EMAIL_INCORRECT', 'EMAIL_REFUSED', 'EMAIL_UNAVAILABLE'].includes(event) && this.reviewedYes() && ['EMAIL_REQUEST', 'EMAIL_GIVEN', 'EMAIL_CONFIRM'].includes(stateBefore)) {
      this.emailCorrectionFrom = this.data.email?.sourceTurnId ?? this.emailCorrectionFrom;
      if (this.data.email) this.log('email.invalidated', { reason: event, previous: this.data.email });
      this.data.email = undefined;
      this.data.emailStatus = event === 'EMAIL_INCORRECT' ? 'CORRECTION_REQUIRED' : 'UNAVAILABLE';
    }
    if (!this.definition.transitions[stateBefore][event]) event = 'UNKNOWN';
    this.move(event);
    this.recommend(classification.intent);
    const record: TurnRecord = {
      id: turn.id, callId: this.data.callId, timestamp: this.wallClock(), transcript: { ...turn }, classification,
      stateBefore, stateAfter: this.data.state, recommendedResponseId: this.data.recommendedResponseId,
      selections: [], consent,
      latency: { classificationMs: this.now() - started, observationToRecommendationMs: this.now() - turn.observedAt },
    };
    if (event === 'EMAIL_GIVEN') {
      const candidate = emailCandidate(turn.text)!;
      if (this.data.email) this.log('email.invalidated', { reason: 'Replacement candidate', previous: this.data.email });
      this.data.email = { value: candidate.normalizedCandidate, turnId: turn.id, rawTranscript: turn.text, ...candidate, confirmed: false, sourceTurnId: turn.id, recipientRevision: this.data.recipientRevision, consentTurnId: this.data.decision!.turnId, correctionOfTurnId: this.emailCorrectionFrom ?? this.data.email?.sourceTurnId };
      this.data.emailStatus = 'GIVEN';
      this.emailCorrectionFrom = undefined;
    }
    if(this.ports.dynamicSpeech && emailQuestion && !emailQuestion.consumed && stateBefore==='EMAIL_CONFIRM' && this.data.email?.sourceTurnId===emailQuestion.sourceTurnId && this.data.recipientRevision===emailQuestion.recipientRevision && turn.answerPlaybackId===emailQuestion.playbackId && turn.speechStartedAt!==undefined && turn.speechStartedAt>emailQuestion.completedAt && classification.intent==='EMAIL_CONFIRMED') { this.emailAnswer={turnId:turn.id,sourceTurnId:emailQuestion.sourceTurnId,playbackId:emailQuestion.playbackId}; this.log('email.confirmation_owned',{...this.emailAnswer}); }
    this.misunderstandings = ['AMBIGUOUS', 'ASR_UNCERTAIN'].includes(event) ? this.misunderstandings + 1 : 0;
    if (['UNKNOWN', 'QUESTION_UNKNOWN', 'MEDICAL_QUESTION', 'LEGAL_PRIVACY_QUESTION', 'COMPLAINT', 'REQUEST_HUMAN', 'AUTHORITY_UNCLEAR'].includes(event)) this.data.fallbackReason = 'Unsupported, sensitive, uncertain-authority or complex response; HUMAN_TAKEOVER recommended.';
    if (this.misunderstandings >= 2) this.data.fallbackReason = 'Repeated misunderstanding; HUMAN_TAKEOVER recommended.';
    if (this.data.fallbackReason) record.fallbackReason = this.data.fallbackReason;
    this.recommend(classification.intent);
    record.recommendedResponseId = this.data.recommendedResponseId;
    this.data.turns.push(record);
    this.log('turn.recommended', { turnId: turn.id, intent: classification.intent, consent: consent.classification, responseId: record.recommendedResponseId, fallbackReason: record.fallbackReason });
  }
  reviewConsent(turnId: string, selected: ConsentClass, reason: string) {
    this.active();
    const turn = this.data.turns.at(-1);
    if (!turn || turn.id !== turnId || turn.review || turn.skipped) throw new Error('Only the current unreviewed, unskipped final turn may be reviewed.');
    // State guard is independent of classification scores and agent override.
    const evidence = { ...turn.consent, eligibleYes: turn.consent.eligibleYes && this.data.state === 'CONSENT_YES' && eligibleRecipient(this.data) && turn.consent.recipient.recipientRevision === this.data.recipientRevision && !this.data.doNotContactRequested };
    guardReview(evidence, selected, reason);
    turn.review = { classification: selected, reason: reason.trim(), reviewedAt: this.now(), overridden: selected !== turn.consent.classification };
    turn.latency.agentDecisionMs = this.now() - turn.transcript.observedAt;
    this.data.decision = { turnId, classification: selected, at: this.now(), recordedAt: this.wallClock(), recipientRevision: this.data.recipientRevision, questionInstanceId: turn.consent.question?.instanceId };
    if (selected !== 'YES') {
      if (this.data.email) this.log('email.invalidated', { reason: 'Consent review is not YES.', previous: this.data.email });
      this.data.email = undefined; this.data.emailStatus = 'NOT_REQUESTED';
    }
    if (selected === 'YES') { this.move('reviewed_yes'); this.data.emailStatus = 'AWAITING_EMAIL'; }
    else this.move(selected === 'NO' ? 'REFUSAL' : 'AMBIGUOUS');
    this.log('consent.agent_reviewed', { turnId, ...turn.review });
  }
  responses(): ResponseClip[] {
    return structuredClone(this.definition.responses.filter(response => response.allowedSourceStates.includes(this.data.state) && response.nextAllowedStates.includes(this.definition.transitions[this.data.state][response.deliveryEvent]) && this.canDeliver(response)));
  }
  private canDeliver(response: ResponseClip) {
    if (response.deliveryType === 'NO_AUDIO') return false;
    if (response.recipientTypes && !response.recipientTypes.includes(this.data.recipientType)) return false;
    if ((this.definition.version === wordingVersion || this.ports.assetPolicy?.definitionId === this.definition.id) && this.data.decision?.classification === 'NO' && response.canArmConsent) return false;
    if (response.canArmConsent && (!eligibleRecipient(this.data) || response.consentScope !== this.definition.consentScope || this.data.doNotContactRequested)) return false;
    if (response.canRequestEmail || response.deliveryEvent === 'email_confirmation') return this.reviewedYes();
    if (response.deliveryEvent === 'success_closed') return this.reviewedYes() && this.data.email?.confirmed === true && this.data.email.recipientRevision === this.data.recipientRevision;
    if (response.id === 'authority-claimed') return this.data.authorityStatus === 'CLAIMED';
    if (response.id === 'authority-denied') return this.data.authorityStatus === 'DENIED';
    if (response.id === 'email-unavailable') return this.data.emailStatus === 'UNAVAILABLE';
    if (response.id === 'stop-contact-close') return !!this.data.doNotContactRequested;
    if (response.deliveryEvent === 'refusal_closed') return this.data.decision?.classification === 'NO';
    return true;
  }
  private select(responseId: string): ResponseClip {
    this.active();
    const response = this.responses().find(response => response.id === responseId);
    if (!response) throw new Error('Response is not allowed with the current state/evidence.');
    return response;
  }
  bindName(evidence: NameEvidence) {
    this.active();
    if (!this.ports.dynamicSpeech || evidence.recipientRevision !== this.data.recipientRevision) throw new Error('Current recipient revision is required.');
    try { validateName(evidence); } catch(error) { this.takeover('Unsupported or uncertain name pronunciation; source preserved.'); throw error; }
    if (evidence.source === 'verified-call' && !this.data.turns.some(t => t.transcript.id === evidence.evidenceId && t.transcript.final && t.transcript.text === evidence.evidenceText && !t.skipped)) throw new Error('Verified name source must be a retained exact final turn.');
    this.name = structuredClone(evidence); this.log('dynamic.name_bound', { ...evidence });
  }
  /** Only an actually completed email question may own the next confirmation onset. */
  confirmationPlaybackId() { return this.emailQuestion && !this.emailQuestion.consumed ? this.emailQuestion.playbackId : undefined; }
  async readbackEmail() {
    const email = this.data.email;
    if (!this.ports.dynamicSpeech || this.data.state !== 'EMAIL_GIVEN' || !email || !this.reviewedYes()) throw new Error('Current guarded email/YES required.');
    const slot: SpeechSlot = { kind: 'EMAIL', phraseId: 'email-readback-intro', candidate: email.normalizedCandidate, sourceTurnId: email.sourceTurnId, recipientRevision: this.data.recipientRevision, normalizationReviewed: !email.normalizationChanged || !!email.normalizationReviewedAt };
    try { await (this.ports.assetPolicy?.render ?? renderSlot)(slot); } catch(error) { this.takeover('Unsupported email readback; literal evidence preserved.'); throw error; }
    const playAndCompleted = async(id: string, dynamic?: SpeechSlot) => {
      await this.approvePlayback(id, dynamic);
      return this.data.playbacks.at(-1)?.state === 'COMPLETED' && currentSlot(slot, this.data);
    };
    if (!await playAndCompleted(email.correctionOfTurnId ? 'email-correction-prefix' : 'email-readback-intro')) return;
    if (!await playAndCompleted('email-readback-intro',slot)) return;
    email.readbackValue = slot.candidate;
    this.log('email.dynamic_readback_completed', { sourceTurnId: email.sourceTurnId, value:slot.candidate, playbackId:this.data.activePlaybackId, audible:true });
    this.performAction('email-confirm');
    await this.approvePlayback(email.correctionOfTurnId ? 'email-correction-confirm' : 'email-confirmation-question');
  }
  async approvePlayback(responseId: string, emailSlot?: SpeechSlot) {
    let response = this.select(responseId);
    if ((this.definition.version === wordingVersion || this.ports.assetPolicy?.definitionId === this.definition.id) && this.ports.localPlayback) {
      const dynamic = this.ports.dynamicSpeech;
      if (!dynamic && ['success-close','thank-you','email-confirmation-question','email-correction-confirm'].includes(responseId)) throw new Error('Actual dynamic email readback is unavailable; HUMAN_TAKEOVER is required. Mock confirmation remains evaluation only.');
      if (dynamic && ['email-confirmation-question','email-correction-confirm'].includes(responseId) && !this.data.email?.readbackValue) throw new Error('Actual exact readback must complete first.');
      let slot: SpeechSlot | undefined = emailSlot;
      if (emailSlot && (emailSlot.kind !== 'EMAIL' || responseId !== 'email-readback-intro' || !this.reviewedYes() || this.data.state !== 'EMAIL_GIVEN')) throw new Error('Only the guarded EMAIL readback slot is allowed.');
      if (response.dynamicValues?.length) {
        if (!dynamic || !this.name) { this.takeover('No reviewed name source/pronunciation.'); return; }
        slot = { kind:'NAME',phraseId:responseId,name:structuredClone(this.name) };
      }
      let binding: SpeechBinding | undefined;
      let asset: import('./dynamic/render').DynamicAsset | undefined;
      if (slot) {
        if (!dynamic || !currentSlot(slot,this.data)) throw new Error('Stale dynamic slot rejected.');
        this.cancelPendingPlayback();
        const abort = new AbortController(); this.dynamicAbort = abort;
        this.log('dynamic.prepare_requested', { slot });
        try {
          const expected = await (this.ports.assetPolicy?.render ?? renderSlot)(slot);
          asset = await dynamic.prepare(slot,abort.signal); abort.signal.throwIfAborted();
          binding = await (this.ports.assetPolicy?.verifyDynamic ?? verifyDynamicAsset)(asset); abort.signal.throwIfAborted();
          if (JSON.stringify(binding.slot) !== JSON.stringify(slot) || expected.cacheKey !== binding.cacheKey || !currentSlot(slot,this.data) || !this.responses().some(r => r.id === responseId)) throw new Error('Dynamic slot binding/revision mismatch.');
          response = { ...response, text:binding.renderedText, dynamicValues:[], audio:{ ...response.audio!,boundText:binding.renderedText,textHash:binding.textHash,sha256:asset.assetHash,status:'GENERATED_VERIFIED_LOCAL_ONLY' } };
          dynamic.register(asset,response);
        } catch(error) {
          if (abort.signal.aborted) { this.log('dynamic.cancelled',{slot}); return; }
          this.log('dynamic.failed',{slot,reason:error instanceof Error?error.message:'Failed'});
          this.takeover('Dynamic speech failed; evidence preserved.'); throw error;
        } finally { if(this.dynamicAbort===abort)this.dynamicAbort=undefined; }
      }
      const id = this.queueResponse(responseId), record = this.data.playbacks.find(p => p.playbackId === id)!;
      this.effective.set(id,response); if(binding)this.dynamicBindings.set(id,binding);
      record.mode = 'local-prerecorded'; record.textHash=response.audio?.textHash??undefined;
      this.log('local.playback_requested', { playbackId:id,responseId,binding,assetHash:asset?.assetHash });
      try { await this.ports.localPlayback.play(response,structuredClone(record),event=>this.localPlaybackEvent(event)); }
      catch(error) { if(['QUEUED','PLAYING'].includes(record.state)){this.mock.fail(record,this.now());this.closeWindow();this.data.playing=false;} this.log('local.playback_error',{playbackId:id,message:error instanceof Error?error.message:'Playback failed'});if(dynamic&&this.data.state!=='HUMAN_TAKEOVER')this.takeover('Output verification failed; evidence preserved.');throw error; }
      return;
    }
    this.log('playback.blocked_placeholder', { responseId });
    assertPlayable(this.definition.responses.find(response => response.id === responseId)!);
  }
  private closeWindow(status: 'CONSUMED' | 'INVALIDATED' = 'INVALIDATED') {
    this.question = undefined;
    if (this.data.answerWindow?.status === 'OPEN') {
      this.data.answerWindow.status = status;
      const record = this.data.playbacks.find(p => p.playbackId === this.data.answerWindow?.playbackId);
      if (record) record.answerConsumed = true;
    }
  }
  private cancelPendingPlayback() {
    this.dynamicAbort?.abort(); this.dynamicAbort=undefined;
    this.emailQuestion=undefined; this.emailAnswer=undefined;
    const record = this.data.playbacks.find(p => p.playbackId === this.data.activePlaybackId);
    if (record && ['NOT_STARTED', 'QUEUED', 'PLAYING'].includes(record.state)) {
      this.mock.interrupt(record, this.now()); this.log('mock.playback_interrupted', { ...record });
    }
    if (record?.mode === 'local-prerecorded') this.ports.localPlayback?.cancel();
    this.data.playing = false;
  }
  private observeBargeIn(turn: Transcript) {
    if(this.dynamicAbort){ this.cancelPendingPlayback(); this.log("dynamic.barge_in",{turnId:turn.id}); }
    const record = this.data.playbacks.find(p => p.playbackId === this.data.activePlaybackId);
    if (record && ['QUEUED', 'PLAYING'].includes(record.state)) {
      record.answerConsumed = true;
      this.closeWindow(); this.cancelPendingPlayback();
      this.log('answer.barge_in', { turnId: turn.id, playbackId: record.playbackId, speechStartedAt: turn.speechStartedAt ?? null, eligible: false, recommendation: 'clarify/repeat' });
    }
  }
  /** Queueing a mock clip never delivers it or opens an answer window. */
  queueResponse(responseId: string, repeat = false): string {
    const response = this.select(responseId);
    if (response.deliveryType !== 'SPOKEN_CLIP') throw new Error('Use the explicit nonspoken action control.');
    if (this.data.playbacks.length >= 300) throw new Error('Playback retention limit reached; export before continuing.');
    this.closeWindow(); this.cancelPendingPlayback();
    if (response.canArmConsent) this.invalidateDependents('Fresh scoped consent question queued.');
    const record = this.mock.create(this.data.callId, `${this.data.callId}:playback-${++this.questionSequence}`, response, this.data.recipientRevision);
    this.mock.queue(record, this.now());
    record.mode = 'mock'; record.textHash = response.audio?.textHash ?? undefined;
    this.data.playbacks.push(record); this.data.activePlaybackId = record.playbackId;
    this.lastResponseId = response.id;
    const turn = this.data.turns.at(-1);
    turn?.selections.push({ responseId, at: this.now(), acceptedRecommendation: responseId === this.data.recommendedResponseId, action: repeat ? 'repeat' : 'rehearse' });
    if (turn) turn.latency.agentDecisionMs = this.now() - turn.transcript.observedAt;
    this.log('mock.playback_queued', { ...record, repeat });
    return record.playbackId;
  }
  mockPlayback(action: 'start' | 'complete' | 'interrupt' | 'fail', playbackId: string) {
    this.active();
    const record = this.data.playbacks.find(p => p.playbackId === playbackId);
    if (!record || playbackId !== this.data.activePlaybackId || record.recipientRevision !== this.data.recipientRevision) throw new Error('Stale or unknown playback ID.');
    if (record.mode === 'local-prerecorded') throw new Error('Mock controls cannot complete or change real local playback.');
    const response = this.response(record.phraseId)!;
    if (action === 'complete' && !this.responses().some(r => r.id === response.id)) throw new Error('Playback no longer matches current state/evidence.');
    this.mock[action](record, this.now());
    this.data.playing = record.state === 'PLAYING';
    this.log(`mock.playback_${action}`, { ...record });
    this.afterPlaybackAction(response, record, action);
  }
  private afterPlaybackAction(response: ResponseClip, record: import('./types').PlaybackRecord, action: 'start' | 'complete' | 'interrupt' | 'fail') {
    if (action === 'complete') {
      this.applyDelivery(response);
      if (response.canArmConsent && !record.answerConsumed) {
        this.data.answerWindow = { playbackId: record.playbackId, openedAt: record.completedAt!, recipientRevision: record.recipientRevision, status: 'OPEN' };
        this.question = { responseId: response.id, scope: response.consentScope!, completedAt: record.completedAt!, delivery: record.mode === 'local-prerecorded' ? 'audible' : 'rehearsed', instanceId: record.playbackId, responseVersion: response.version, exactText: response.text, textHash: response.audio?.textHash ?? canonicalConsent.textHash, recipientRevision: this.data.recipientRevision, recipientType: this.data.recipientType, playback: structuredClone(record) };
        this.log('answer.window_opened', { ...this.data.answerWindow, completionSource: record.completionSource });
      }
    } else if (action === 'interrupt' || action === 'fail') this.closeWindow();
  }
  private localPlaybackEvent(event: LocalPlaybackEvent) {
    const record = this.data.playbacks.find(p => p.playbackId === event.playbackId);
    if (!record || record.playbackId !== this.data.activePlaybackId || record.mode !== 'local-prerecorded' || ['COMPLETED','INTERRUPTED','FAILED'].includes(record.state)) return;
    const response = this.effective.get(record.playbackId) ?? this.response(record.phraseId)!;
    const binding = this.dynamicBindings.get(record.playbackId);
    const boundAsset = binding ? { assetHash:response.audio?.sha256 } : (this.ports.assetPolicy?.assets ?? verifiedAssets).find(a => a.phraseId === record.phraseId && a.textHash === response.audio?.textHash && a.assetHash === response.audio?.sha256);
    if (binding && !currentSlot(binding.slot,this.data)) throw new Error('Stale dynamic completion rejected.');
    if (!boundAsset || event.assetHash !== boundAsset.assetHash || event.callId !== this.data.callId || event.recipientRevision !== this.data.recipientRevision || event.phraseId !== record.phraseId || event.phraseVersion !== response.version || event.textHash !== response.audio?.textHash || !/^[a-f0-9]{64}$/u.test(event.assetHash)) throw new Error('Local completion identity binding rejected.');
    if (event.action === 'complete' && (!event.outputProof?.startsWith(`web-audio-source-ended:${record.playbackId}:`) || !this.responses().some(r => r.id === response.id))) throw new Error('Missing actual output completion proof or stale response.');
    record.assetHash = event.assetHash; record.outputProof = event.outputProof; record.gain = event.gain;
    this.mock[event.action](record, this.now());
    if (event.action === 'complete') record.completionSource = 'VERIFIED_OUTPUT_ADAPTER';
    this.data.playing = record.state === 'PLAYING';
    this.log('local.playback_' + event.action, { ...record, error: event.error });
    this.afterPlaybackAction(response, record, event.action);
    if(this.ports.dynamicSpeech && event.action==='complete' && ['email-confirmation-question','email-correction-confirm'].includes(response.id) && this.data.email) this.emailQuestion={playbackId:record.playbackId,completedAt:record.completedAt!,sourceTurnId:this.data.email.sourceTurnId,recipientRevision:this.data.recipientRevision,consumed:false};
  }
  performAction(responseId: string) {
    const response = this.select(responseId);
    if (response.deliveryType === 'SPOKEN_CLIP' || response.deliveryType === 'NO_AUDIO') throw new Error('This unit requires playback or selection of the canonical question.');
    this.closeWindow(); this.cancelPendingPlayback(); this.lastResponseId = response.id;
    this.applyDelivery(response);
    this.log('response.action', { responseId, deliveryType: response.deliveryType, audible: false });
  }
  private applyDelivery(response: ResponseClip) {
    this.move(response.deliveryEvent);
    if (response.deliveryEvent === 'email_confirmation') this.data.emailStatus = 'READBACK_REQUIRED';
    if (response.deliveryEvent === 'email_correction') {
      this.emailCorrectionFrom = this.data.email?.sourceTurnId ?? this.emailCorrectionFrom;
      if (this.data.email) this.log('email.invalidated', { reason: 'Correction prompt selected.', previous: this.data.email });
      this.data.email = undefined; this.data.emailStatus = 'CORRECTION_REQUIRED';
    }
    if (isTerminal(this.data.state)) this.stopPorts();
    if (this.data.state === 'HUMAN_TAKEOVER') this.completeTakeover('Response unit requested human assistance.');
  }
  /** Test helper: explicit mock lifecycle, never production completion evidence. UI uses separate controls. */
  rehearseResponse(responseId: string, repeat = false) {
    const response = this.response(responseId);
    if (response?.deliveryType !== 'SPOKEN_CLIP') { this.performAction(responseId); return; }
    const id = this.queueResponse(responseId, repeat); this.mockPlayback('start', id); this.mockPlayback('complete', id);
    this.log('response.rehearsed', { responseId, repeat, audible: false });
  }
  repeat() {
    if (!this.lastResponseId) throw new Error('There is no previous response.');
    return this.queueResponse(this.lastResponseId, true);
  }
  prepareHandoff() {
    if (this.data.handoff) throw new Error('Handoff candidate already retained.');
    this.data.handoff = { candidate: handoffCandidate(this.data, this.expectedQuestion(this.data.turns.find(t => t.id === this.data.decision?.turnId)?.consent.question?.responseId)), status: 'PENDING_HANDOFF', attempts: [] };
    this.log('handoff.prepared', { status: 'PENDING_HANDOFF', externalWrite: false });
  }
  mockHandoff(status: 'HANDED_OFF' | 'HANDOFF_FAILED', reason: string) {
    if (!this.data.handoff || !['HANDED_OFF', 'HANDOFF_FAILED'].includes(status) || !reason.trim() || this.data.handoff.status === 'HANDED_OFF') throw new Error('An eligible pending/failed candidate and mock result reason are required.');
    this.data.handoff.status = status;
    this.data.handoff.attempts.push({ at: this.wallClock(), status, reason, mock: true });
    this.log('handoff.mock_result', { status, reason, externalWrite: false });
  }
  skip() {
    this.active();
    const turn = this.data.turns.at(-1);
    if (turn) turn.skipped = true;
    this.closeWindow(); this.cancelPendingPlayback();
    if (!turn?.review) this.invalidateDependents('Unreviewed recommendation skipped.');
    this.move('AMBIGUOUS');
    this.data.recommendedResponseId = undefined;
    this.log('recommendation.skipped', { turnId: turn?.id });
  }
  reviewEmailNormalization(value: string, reason: string) {
    this.active();
    if (!this.reviewedYes() || !this.data.email || !this.data.email.normalizationChanged || value !== this.data.email.normalizedCandidate || !reason.trim()) throw new Error('Review the exact character change against the raw transcript; no inferred address is allowed.');
    this.data.email.normalizationReviewedAt = this.wallClock();
    this.log('email.normalization_reviewed', { sourceTurnId: this.data.email.sourceTurnId, rawTranscript: this.data.email.rawTranscript, value, reason });
  }
  recordEmailReadback(value: string) {
    this.active();
    const email = this.data.email;
    if (this.data.state !== 'EMAIL_CONFIRM' || !this.reviewedYes() || !email || value !== email.normalizedCandidate || email.normalizationChanged && !email.normalizationReviewedAt) throw new Error('Read back the exact reviewed captured address; silent normalization is blocked.');
    if(this.ports.dynamicSpeech) throw new Error('Dynamic mode requires actual readback output completion.');
    email.readbackValue = value;
    this.log('email.readback_attested', { value, sourceTurnId: email.sourceTurnId, audible: false });
  }
  confirmEmail(value: string, readbackConfirmed: boolean) {
    this.active();
    if (this.data.state !== 'EMAIL_CONFIRM' || !this.reviewedYes() || !this.data.email || value !== this.data.email.normalizedCandidate || !literalEmail(value) || !readbackConfirmed) throw new Error('Confirm the exact captured address with the recipient after readback.');
    if(this.ports.dynamicSpeech && (!this.emailAnswer || this.emailAnswer.sourceTurnId !== this.data.email.sourceTurnId || this.data.turns.at(-1)?.transcript.id !== this.emailAnswer.turnId)) throw new Error('Fresh owned recipient confirmation after actual output required.');
    // Legacy atomic attestation remains valid: the boolean explicitly attests
    // both exact readback and recipient confirmation; the UI exposes both steps.
    if (!this.data.email.readbackValue) this.recordEmailReadback(value);
    if (this.data.email.readbackValue !== value) throw new Error('Readback does not match the candidate.');
    this.data.email.confirmed = true;
    this.data.email.confirmedAt = this.wallClock();
    this.data.emailStatus = 'CONFIRMED';
    this.log('email.agent_confirmed', { turnId: this.data.email.turnId, exactReadbackConfirmed: true });
  }
  takeover(reason: string) {
    this.active();
    if (!reason.trim()) throw new Error('A takeover reason is required.');
    const turn = this.data.turns.at(-1);
    if (turn) turn.fallbackReason = reason;
    this.closeWindow(); this.cancelPendingPlayback();
    this.move('takeover');
    this.completeTakeover(reason);
  }
  private completeTakeover(reason: string) {
    this.stopPorts();
    this.data.fallbackReason = reason;
    this.log('fallback.requested', { reason, transportPreserved: false });
    const turn = this.data.turns.at(-1);
    this.ports.takeover?.({ callId: this.data.callId, reason, lastTurnId: turn?.id });
  }
  private stopPorts() {
    this.playback.cancel();
    this.ports.localPlayback?.cancel();
    this.ports.stopTranscription?.();
    this.data.partial = '';
  }
  end() {
    if (isTerminal(this.data.state)) { this.stopPorts(); return; }
    this.closeWindow(); this.cancelPendingPlayback();
    this.move('end');
    this.stopPorts();
    this.log('session.ended', { outcome: this.data.state, transportEnded: false });
  }
  dispose() { this.closeWindow(); this.cancelPendingPlayback(); this.stopPorts(); }
}
