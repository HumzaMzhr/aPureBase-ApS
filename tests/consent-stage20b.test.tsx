import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsentWorkspace } from '../src/consent/ConsentWorkspace';
import { ConservativeDanishClassifier } from '../src/consent/classifier';
import { eligibleRecipient } from '../src/consent/authority';
import { evaluateConsent } from '../src/consent/consentGuard';
import { commonTransitions, consentDefinition, plannedAssetManifest, validateDefinition } from '../src/consent/definition';
import { ConsentSession } from '../src/consent/session';
import { transition } from '../src/consent/stateMachine';
import { states, type Transcript } from '../src/consent/types';
import { masterScenarios } from './fixtures/stage20b-scenarios';

afterEach(() => vi.unstubAllGlobals());
const authorityClaim = 'Jeg har fuldmagt til at oplyse lægens e-mailadresse.';
function fixture() {
  let now = 10, n = 0;
  const playback = { play: vi.fn(), cancel: vi.fn() }, stop = vi.fn(), takeover = vi.fn();
  const session = new ConsentSession('call-b1', { now: () => now, wallClock: () => '2026-10-18T01:00:00.000Z', playback, stopTranscription: stop, takeover });
  function receive(text: string, extra: Partial<Transcript> = {}) {
    now += 100;
    const turn: Transcript = { id: `b-${++n}`, text, final: true, source: 'manual-rehearsal', observedAt: now, speechStartedAt: now, answerPlaybackId: session.snapshot().answerWindow?.playbackId, ...extra };
    session.receive(turn); return turn.id;
  }
  function hcp() { session.setRecipient('TARGET_HCP', 'Operator verified the intended HCP.', true); }
  function intermediary() { session.setRecipient('INTERMEDIARY', 'Operator identified an intermediary.'); }
  function authorize() { intermediary(); const id = receive(authorityClaim); session.confirmAuthority(id, 'Operator checked the required authority and scope against this evidence.'); }
  function question() { session.rehearseResponse('purpose'); session.rehearseResponse('consent-question'); }
  function yes() { question(); const id = receive('Ja, det må I gerne.'); session.reviewConsent(id, 'YES', 'Operator confirms explicit scoped answer.'); return id; }
  function email(value = 'anna@example.dk') { receive(value); session.rehearseResponse('email-confirm'); }
  return { session, receive, hcp, intermediary, authorize, question, yes, email, playback, stop, takeover };
}

it.each(masterScenarios)('matrix scenario $id preserves raw words and routes conservatively', scenario => {
  const original: Transcript = { id: scenario.id, text: scenario.text, final: true, source: 'manual-rehearsal', observedAt: 0 };
  expect(new ConservativeDanishClassifier().classify(original).intent).toBe(scenario.intent);
  expect(original.text).toBe(scenario.text);
  for (const id of scenario.responses) expect(consentDefinition.responses.find(r => r.id === id)).toBeDefined();
});
it.each(consentDefinition.responses)('response unit $id has reviewable matrix and graph metadata, never production audio', unit => {
  expect(unit.audioAsset).toBeNull(); expect(unit.audio?.sha256 ?? null).toBeNull(); if (unit.deliveryType === 'SPOKEN_CLIP') expect(unit.audio?.status).toBe('NOT_GENERATED'); else expect(unit.audio).toBeNull();
  expect(unit.productionApproval).toBe('NOT_APPROVED'); expect(unit.requiresAgentApproval).toBe(true);
  expect(unit.reviewRequirements).toEqual(['NATIVE_DANISH', 'BUSINESS']);
  expect(unit.wordingStatus).not.toBe('SOURCE_SUPPORTED'); // No approved Danish source was supplied.
  expect(unit.text).toBeTruthy(); expect(unit.english).toBeTruthy(); expect(unit.scenario).toBeTruthy();
  for (const state of unit.allowedSourceStates) expect(unit.nextAllowedStates).toContain(transition(consentDefinition, state, unit.deliveryEvent));
  expect(masterScenarios.some(s => s.responses.includes(unit.id))).toBe(true);
});
it('has exactly two additional materially guarded states, 30 atomic units and 13 explicit migration links', () => {
  validateDefinition(consentDefinition);
  expect(states).toHaveLength(22); expect(states).toContain('AUTHORITY_CHECK'); expect(states).toContain('WRONG_PERSON');
  expect(consentDefinition.responses).toHaveLength(30);
  expect(consentDefinition.responses.filter(r => r.priorStage20aId)).toHaveLength(13);
  expect(consentDefinition.responses.filter(r => r.canArmConsent).map(r => r.id)).toEqual(['consent-question']);
  expect(plannedAssetManifest.assets).toHaveLength(25);
  expect(new Set(plannedAssetManifest.assets.map(a => a.audio.assetId)).size).toBe(25);
});
it.each(states.filter(s => !s.startsWith('END_') && s !== 'HUMAN_TAKEOVER'))('defines every interruption in active state %s', state => {
  for (const event of ['REFUSAL', 'BUSY', 'CALLBACK', 'QUESTION_KNOWN', 'QUESTION_UNKNOWN', 'takeover', 'end']) expect(transition(consentDefinition, state, event)).toBe(commonTransitions[event]);
});
it('keeps all terminal states terminal and leaves takeover input to the existing interpreter only', () => {
  for (const state of states.filter(s => s.startsWith('END_'))) for (const event of [...Object.keys(commonTransitions), 'reviewed_yes']) expect(() => transition(consentDefinition, state, event)).toThrow();
  for (const event of Object.keys(commonTransitions).filter(e => e !== 'end')) expect(() => transition(consentDefinition, 'HUMAN_TAKEOVER', event)).toThrow();
});
it('accepts HCP YES only as a candidate, then requires explicit separate review', () => {
  const f = fixture(); f.hcp(); f.question(); const id = f.receive('Ja.');
  expect(f.session.snapshot()).toMatchObject({ state: 'CONSENT_YES', decision: undefined });
  expect(() => f.session.rehearseResponse('email-request')).toThrow();
  f.session.reviewConsent(id, 'YES', 'Explicit answer.');
  expect(f.session.snapshot()).toMatchObject({ state: 'EMAIL_REQUEST', decision: { turnId: id, classification: 'YES', recordedAt: '2026-10-18T01:00:00.000Z' } });
});
it('a classifier identity match cannot verify the HCP', () => {
  const f = fixture(); f.receive('Det er mig.');
  expect(f.session.snapshot().targetVerified).toBe(false);
  f.session.rehearseResponse('purpose'); expect(() => f.session.rehearseResponse('consent-question')).toThrow();
});
it('HCP YES before completed question, with unknown completion or overlapping speech is not consent', () => {
  const f = fixture(); f.hcp(); f.session.rehearseResponse('purpose'); f.receive('Ja.');
  expect(f.session.snapshot().turns.at(-1)?.consent.eligibleYes).toBe(false);
  f.session.rehearseResponse('consent-question'); f.receive('Ja.', { speechStartedAt: 0 });
  const turn = f.session.snapshot().turns.at(-1)!;
  expect(turn.consent.eligibleYes).toBe(false);
  for (const completedAt of [NaN, turn.transcript.observedAt + 1]) expect(evaluateConsent(turn.transcript, 'recipient', consentDefinition.consentScope, { ...turn.consent.question!, completedAt }, turn.consent.recipient).eligibleYes).toBe(false);
});
it('receptionist simple YES and email with no authority never create consent or capture an address', () => {
  const f = fixture(); f.receive('Det er receptionen.');
  const id = f.receive('Ja.'); expect(() => f.session.reviewConsent(id, 'YES', 'Override')).toThrow();
  f.receive('anna@example.dk'); expect(f.session.snapshot().email).toBeUndefined();
  expect(f.session.snapshot()).toMatchObject({ recipientType: 'INTERMEDIARY', authorityStatus: 'UNVERIFIED', decision: undefined });
});
it('a genuine claim without agent confirmation remains blocked; operator phrase selection cannot confirm it', () => {
  const f = fixture(); f.intermediary(); f.receive(authorityClaim); f.session.rehearseResponse('authority-claimed');
  expect(f.session.snapshot().authorityStatus).toBe('CLAIMED');
  expect(eligibleRecipient(f.session.snapshot())).toBe(false);
  expect(() => f.session.rehearseResponse('purpose')).toThrow();
  expect(() => f.session.rehearseResponse('intermediary-consent-question')).toThrow();
  const id = f.receive('Ja.'); expect(() => f.session.reviewConsent(id, 'YES', 'Override')).toThrow();
});
it('confirmed intermediary evidence enables the same canonical question and still requires candidate review', () => {
  const f = fixture(); f.authorize();
  expect(f.session.snapshot()).toMatchObject({ recipientType: 'INTERMEDIARY', authorityStatus: 'AGENT_CONFIRMED', authorityEvidence: { transcriptText: authorityClaim }, authorityAttestation: { evidenceTurnId: 'b-1' } });
  f.session.rehearseResponse('purpose');
  expect(f.session.snapshot().recommendedResponseId).toBe('consent-question');
  expect(() => f.session.rehearseResponse('intermediary-consent-question')).toThrow();
  f.session.rehearseResponse('consent-question'); const id = f.receive('Ja tak.');
  expect(f.session.snapshot().decision).toBeUndefined();
  f.session.reviewConsent(id, 'YES', 'Confirmed intermediary explicit answer.');
  f.email(); f.session.recordEmailReadback('anna@example.dk'); f.session.confirmEmail('anna@example.dk', true); f.session.rehearseResponse('success-close');
  expect(f.session.snapshot().state).toBe('END_SUCCESS');
});
it.each(['Ja.', 'Jeg er receptionist.', 'Jeg kan hjælpe med det.', 'Jeg håndterer hans e-mail.', 'Jeg har måske fuldmagt.', 'Jeg har fuldmagt til at oplyse lægens e-mailadresse?'])('no override can manufacture authority evidence from %s', text => {
  const f = fixture(); f.intermediary(); const id = f.receive(text);
  expect(() => f.session.confirmAuthority(id, 'Operator override')).toThrow();
  expect(eligibleRecipient(f.session.snapshot())).toBe(false);
});
it('a fabricated classifier authority label cannot pass the independent lexical evidence guard', () => {
  const session = new ConsentSession('forged', { now: () => 1, classifier: { classify: () => ({ intent: 'AUTHORITY_CLAIMED', confidence: 1, basis: 'override', classifierVersion: 'fake' }) } });
  session.setRecipient('INTERMEDIARY', 'Selected');
  session.receive({ id: 'x', text: 'Ja.', final: true, source: 'provider', observedAt: 1 });
  expect(() => session.confirmAuthority('x', 'Agent agrees with classifier')).toThrow('manufacture');
});
it('partial authority text is not final evidence', () => {
  const f = fixture(); f.intermediary(); const id = f.receive(authorityClaim, { final: false });
  expect(() => f.session.confirmAuthority(id, 'partial')).toThrow(); expect(f.session.snapshot().authorityEvidence).toBeUndefined();
});
it('authority denial/change invalidates prior consent, email, question and attestation', () => {
  const f = fixture(); f.authorize(); f.yes(); f.email(); f.receive('Jeg har ikke fuldmagt.');
  expect(f.session.snapshot()).toMatchObject({ authorityStatus: 'DENIED', decision: undefined, email: undefined, authorityAttestation: undefined });
  expect(() => f.session.confirmAuthority('b-1', 'Reuse old claim')).toThrow();
  expect(() => f.session.rehearseResponse('email-request')).toThrow();
});
it('recipient changes invalidate authority and copied snapshots cannot restore it', () => {
  const f = fixture(); f.authorize(); const old = f.session.snapshot(); f.intermediary();
  old.authorityStatus = 'AGENT_CONFIRMED';
  expect(f.session.snapshot().authorityStatus).toBe('UNVERIFIED');
  expect(() => f.session.confirmAuthority(old.authorityEvidence!.transcriptTurnId, 'Reuse')).toThrow();
});
it.each(['Nej tak.', 'Jeg har ombestemt mig.', 'Jeg trækker min tilladelse tilbage.', 'Kontakt mig ikke igen.'])('later refusal/withdrawal %s invalidates YES and dependent email', text => {
  const f = fixture(); f.hcp(); f.yes(); f.email(); f.receive(text);
  expect(f.session.snapshot()).toMatchObject({ state: 'CONSENT_NO', decision: undefined, email: undefined, emailStatus: 'NOT_REQUESTED' });
  expect(() => f.session.rehearseResponse('success-close')).toThrow();
});
it('stop-contact is an auditable local request, never a claimed downstream suppression', () => {
  const f = fixture(); f.hcp(); f.receive('Kontakt mig ikke igen.');
  expect(f.session.snapshot().doNotContactRequested?.downstreamActionCompleted).toBe(false);
  f.hcp(); f.session.rehearseResponse('purpose'); expect(() => f.session.rehearseResponse('consent-question')).toThrow();
});
it.each(['Okay.', 'Måske.', 'Tak.', 'Ja?', 'Ja, men ikke e-mails.', 'Ja tak. Hvad koster det?', 'Ja, på vegne af lægen.'])('conflicting/ambiguous answer %s cannot manufacture consent', text => {
  const f = fixture(); f.hcp(); f.question(); const id = f.receive(text);
  expect(() => f.session.reviewConsent(id, 'YES', 'Override')).toThrow();
});
it('a question consumes the relevant question; clarification and later YES cannot reuse it', () => {
  const f = fixture(); f.hcp(); f.question(); f.receive('Hvilken information?'); f.session.rehearseResponse('explanation');
  const id = f.receive('Ja.'); expect(() => f.session.reviewConsent(id, 'YES', 'Reuse')).toThrow();
  f.session.rehearseResponse('clarify'); const second = f.receive('Ja.');
  expect(() => f.session.reviewConsent(second, 'YES', 'Clarification is not the consent proposition')).toThrow();
  f.session.rehearseResponse('consent-question'); const fresh = f.receive('Ja.');
  f.session.reviewConsent(fresh, 'YES', 'Fresh completed question.'); expect(f.session.snapshot().decision?.classification).toBe('YES');
});
it('email provision before review is rejected and cannot serve as consent itself', () => {
  const f = fixture(); f.hcp(); f.question(); f.receive('anna@example.dk');
  expect(f.session.snapshot()).toMatchObject({ decision: undefined, email: undefined });
  expect(f.session.snapshot().turns.at(-1)?.consent.eligibleYes).toBe(false);
});
it('corrected addresses lose prior confirmation and require fresh readback and recipient confirmation', () => {
  const f = fixture(); f.hcp(); f.yes(); f.email(); f.session.confirmEmail('anna@example.dk', true);
  f.receive('Adressen er forkert.'); expect(f.session.snapshot()).toMatchObject({ email: undefined, emailStatus: 'CORRECTION_REQUIRED' });
  f.session.rehearseResponse('email-correction'); f.receive('anna.corrected@example.dk');
  expect(f.session.snapshot().email).toMatchObject({ rawTranscript: 'anna.corrected@example.dk', normalizedCandidate: 'anna.corrected@example.dk', confirmed: false, correctionOfTurnId: 'b-2' });
  expect(f.session.snapshot().email?.readbackValue).toBeUndefined();
  expect(() => f.session.rehearseResponse('success-close')).toThrow();
  f.session.rehearseResponse('email-confirm'); f.session.recordEmailReadback('anna.corrected@example.dk'); f.session.confirmEmail('anna.corrected@example.dk', true);
  expect(f.session.snapshot().email?.confirmedAt).toBeTruthy();
});
it('character-changing normalization is explicit and never silently confirms an address', () => {
  const f = fixture(); f.hcp(); f.yes(); f.email('anna@example.dk.');
  expect(f.session.snapshot().email).toMatchObject({ rawTranscript: 'anna@example.dk.', normalizedCandidate: 'anna@example.dk', normalizationChanged: true, confirmed: false });
  expect(() => f.session.confirmEmail('anna@example.dk', true)).toThrow('normalization');
  expect(() => f.session.reviewEmailNormalization('invented@example.dk', 'Fix')).toThrow();
  f.session.reviewEmailNormalization('anna@example.dk', 'Operator reviewed removal of the final punctuation mark.');
  f.session.recordEmailReadback('anna@example.dk'); f.session.confirmEmail('anna@example.dk', true);
  expect(f.session.snapshot().email?.normalizationReviewedAt).toBeTruthy();
});
it.each(['anna snabel-a example punktum dk', 'anna@', 'anna@example', 'anna..test@example.dk', 'anna@-example.dk'])('unsupported address %s is never repaired or given a missing domain', value => {
  const f = fixture(); f.hcp(); f.yes(); f.receive(value);
  expect(f.session.snapshot().email).toBeUndefined(); expect(f.session.snapshot().recommendedResponseId).toBe('human-takeover');
});
it('email confirmation classification alone cannot confirm correctness or consent', () => {
  const f = fixture(); f.hcp(); f.yes(); f.email(); f.receive('Ja, adressen er korrekt.');
  expect(f.session.snapshot().email?.confirmed).toBe(false); expect(f.session.snapshot().email?.readbackValue).toBeUndefined();
});
it('wrong-party branch cannot reach email, including fake YES and stale authority', () => {
  const f = fixture(); f.authorize(); f.yes(); f.receive('Forkert nummer.');
  const id = f.receive('Ja.'); expect(() => f.session.reviewConsent(id, 'YES', 'Wrong party')).toThrow();
  f.receive('anna@example.dk'); expect(f.session.snapshot()).toMatchObject({ recipientType: 'UNKNOWN', targetVerified: false, authorityStatus: 'UNVERIFIED', decision: undefined, email: undefined });
});
it.each(['Hvad koster det?', 'Kan du give medicinsk rådgivning?', 'Hvordan behandler I mine persondata?', 'Jeg vil klage.', 'Jeg vil tale med et menneske.'])('unsupported/sensitive response %s recommends takeover, not an invented answer', text => {
  const f = fixture(); f.receive(text);
  expect(f.session.snapshot()).toMatchObject({ state: 'QUESTION_UNKNOWN', recommendedResponseId: 'human-takeover' });
  expect(f.session.snapshot().fallbackReason).toContain('HUMAN_TAKEOVER');
});
it('repeated misunderstanding recommends takeover and no authority uncertainty can proceed', () => {
  const f = fixture(); f.receive('Jeg kunne ikke høre dig.'); f.receive('Jeg kunne ikke høre dig.');
  expect(f.session.snapshot().recommendedResponseId).toBe('human-takeover');
  const g = fixture(); g.intermediary(); g.receive('Jeg ved ikke om jeg har fuldmagt.');
  expect(g.session.snapshot()).toMatchObject({ authorityStatus: 'UNVERIFIED', recommendedResponseId: 'authority-unclear' });
  expect(g.session.snapshot().fallbackReason).toContain('HUMAN_TAKEOVER');
});
it('skip and repeat never create a consent record without a fresh final answer and review', () => {
  const f = fixture(); f.hcp(); f.question(); const repeated = f.session.repeat(); f.session.mockPlayback('start', repeated); f.session.mockPlayback('complete', repeated);
  expect(f.session.snapshot().decision).toBeUndefined(); const id = f.receive('Ja.'); f.session.skip();
  expect(() => f.session.reviewConsent(id, 'YES', 'Skipped')).toThrow();
});
it('human takeover preserves call/audit identity and explicitly disclaims phone-media transfer', () => {
  const f = fixture(); f.receive('Hvad koster det?'); f.session.rehearseResponse('human-takeover');
  expect(f.session.snapshot()).toMatchObject({ callId: 'call-b1', state: 'HUMAN_TAKEOVER' });
  expect(f.takeover).toHaveBeenCalledWith(expect.objectContaining({ callId: 'call-b1' }));
  expect(f.session.exportReview().events.find(e => e.event === 'fallback.requested')?.data.transportPreserved).toBe(false);
  expect(f.session.exportReview()).toMatchObject({ phoneTransport: false, productionAudio: false, downstreamConfirmationEmailSent: false });
  expect(f.stop).toHaveBeenCalled(); expect(f.playback.play).not.toHaveBeenCalled();
});
it('operator workspace exposes recipient, authority evidence, attestation and email subflow without acquiring any provider', () => {
  const forbidden = vi.fn(() => { throw new Error('Forbidden provider/audio call'); });
  vi.stubGlobal('fetch', forbidden); vi.stubGlobal('WebSocket', forbidden); vi.stubGlobal('AudioContext', forbidden);
  const html = renderToStaticMarkup(<ConsentWorkspace/>);
  for (const label of ['NO PHONE TRANSPORT', 'NO PRODUCTION AUDIO', 'Authority evidence', 'Confirm intermediary authority', 'Last final transcript', 'Email status', 'Target HCP', 'Intermediary', 'Unknown']) expect(html).toContain(label);
  expect(forbidden).not.toHaveBeenCalled();
});
