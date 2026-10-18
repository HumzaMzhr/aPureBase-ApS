import { createHash } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsentWorkspace } from '../src/consent/ConsentWorkspace';
import { ConsentSession } from '../src/consent/session';
import { consentDefinition, plannedAssetManifest, validateDefinition } from '../src/consent/definition';
import { canonicalConsent, consentScope, textHash, validateAssetBinding } from '../src/consent/wording';
import { authorityPolicyVersion, eligibleRecipient } from '../src/consent/authority';
import { MockPlaybackAdapter } from '../src/consent/mockPlayback';
import { handoffCandidate } from '../src/consent/handoff';
import { playbackStates, states, type Transcript } from '../src/consent/types';

function fixture() {
  let now = 100, n = 0;
  const playback = { play: vi.fn(), cancel: vi.fn() };
  const session = new ConsentSession('b2-call', { now: () => now, wallClock: () => '2026-10-18T11:00:00.000Z', operatorId: 'operator-7', playback });
  function tick() { now += 10; return now; }
  function receive(text = 'Ja.', extra: Partial<Transcript> = {}) {
    const at = tick(); const id = `t-${++n}`;
    session.receive({ id, text, source: 'manual-rehearsal', final: true, observedAt: at, speechStartedAt: at, answerPlaybackId: session.snapshot().answerWindow?.playbackId, ...extra }); return id;
  }
  function setup() { session.setRecipient('TARGET_HCP', 'Verified target HCP in rehearsal', true); session.rehearseResponse('purpose'); }
  function queue() { return session.queueResponse('consent-question'); }
  function complete(id: string) { tick(); session.mockPlayback('start', id); tick(); session.mockPlayback('complete', id); }
  function yes() { const id = queue(); complete(id); const answer = receive(); session.reviewConsent(answer, 'YES', 'Explicit answer to completed canonical question'); return answer; }
  function success() { setup(); yes(); receive('anna@example.dk'); session.performAction('email-confirm'); session.recordEmailReadback('anna@example.dk'); session.confirmEmail('anna@example.dk', true); session.rehearseResponse('success-close'); }
  return { session, tick, receive, setup, queue, complete, yes, success, playback };
}
it('keeps 30 logical units / 25 spoken / 2 system / 2 operator / 1 no-audio and 22 states', () => {
  expect(states).toHaveLength(22); expect(consentDefinition.responses).toHaveLength(30);
  for (const [type, count] of [['SPOKEN_CLIP', 25], ['SYSTEM_ACTION', 2], ['OPERATOR_ACTION', 2], ['NO_AUDIO', 1]]) expect(consentDefinition.responses.filter(r => r.deliveryType === type)).toHaveLength(count as number);
  expect(plannedAssetManifest.assets).toHaveLength(25);
  expect(consentDefinition.responses.filter(r => r.canArmConsent).map(r => r.id)).toEqual([canonicalConsent.phraseId]);
  expect(consentDefinition.consentQuestions).toEqual({ TARGET_HCP: 'consent-question', INTERMEDIARY: 'consent-question' });
  expect(consentScope).toMatchObject({ purpose: 'professional information', action: 'send', channel: 'email', organization: 'aPureBase', version: 1 });
});
it('hashes exact UTF-8 TEXT, and rejects changed text/version/audio bytes without renewed binding', async () => {
  expect(await textHash(canonicalConsent.text)).toBe(canonicalConsent.textHash);
  expect(createHash('sha256').update(canonicalConsent.text).digest('hex')).toBe(canonicalConsent.textHash);
  const bytes = new Uint8Array([1, 2, 3]), phrase = consentDefinition.responses.find(r => r.canArmConsent)!;
  const asset = { phraseId: phrase.id, phraseVersion: phrase.version, textHash: canonicalConsent.textHash, assetHash: createHash('sha256').update(bytes).digest('hex') };
  await expect(validateAssetBinding(phrase, asset, bytes)).resolves.toBeUndefined();
  for (const changed of [{ ...phrase, text: phrase.text + ' ' }, { ...phrase, version: 'changed' }]) await expect(validateAssetBinding(changed, asset, bytes)).rejects.toThrow('binding');
  await expect(validateAssetBinding(phrase, asset, new Uint8Array([3, 2, 1]))).rejects.toThrow('binding');
  const changed = structuredClone(consentDefinition); changed.responses.find(r => r.canArmConsent)!.text += ' ';
  expect(() => validateDefinition(changed)).toThrow();
});
it.each(consentDefinition.responses.filter(r => r.deliveryType !== 'SPOKEN_CLIP'))('$id has no required asset and cannot create playback/consent', unit => {
  expect(unit.audio).toBeNull(); expect(unit.canArmConsent).toBe(false);
  expect(() => new MockPlaybackAdapter().create('c', 'p', unit, 0)).toThrow('spoken');
});
it('models all six lifecycle states without timers or audio, retaining completion metadata', () => {
  const adapter = new MockPlaybackAdapter(), phrase = consentDefinition.responses[0];
  const record = adapter.create('c', 'p', phrase, 2); expect(record.state).toBe('NOT_STARTED');
  adapter.queue(record, 1); expect(record.state).toBe('QUEUED'); adapter.start(record, 2); expect(record.state).toBe('PLAYING'); adapter.complete(record, 3);
  expect(record).toMatchObject({ state: 'COMPLETED', playbackId: 'p', callId: 'c', phraseId: phrase.id, phraseVersion: phrase.version, assetId: phrase.audio!.assetId, assetHash: null, queuedAt: 1, startedAt: 2, completedAt: 3, interruptedAt: null, failedAt: null, completionSource: 'MOCK_ADAPTER' });
  expect(playbackStates).toEqual(['NOT_STARTED', 'QUEUED', 'PLAYING', 'COMPLETED', 'INTERRUPTED', 'FAILED']);
  expect(() => adapter.complete(record, 4)).toThrow();
});
it.each(['QUEUED', 'PLAYING', 'INTERRUPTED', 'FAILED'] as const)('%s cannot arm consent and final YES remains ineligible', state => {
  const f = fixture(); f.setup(); const id = f.queue();
  if (state !== 'QUEUED') f.session.mockPlayback('start', id);
  if (state === 'INTERRUPTED') f.session.mockPlayback('interrupt', id);
  if (state === 'FAILED') f.session.mockPlayback('fail', id);
  expect(f.session.snapshot().answerWindow?.status).not.toBe('OPEN');
  const answer = f.receive(); expect(f.session.snapshot().turns.at(-1)?.consent.eligibleYes).toBe(false);
  expect(() => f.session.reviewConsent(answer, 'YES', 'override')).toThrow(); expect(f.playback.play).not.toHaveBeenCalled();
});
it('only explicit completed canonical playback and a new owned final YES creates a reviewed candidate', () => {
  const f = fixture(); f.setup(); const id = f.queue(); f.complete(id);
  expect(f.session.snapshot().answerWindow).toMatchObject({ playbackId: id, status: 'OPEN' });
  const answer = f.receive(); expect(f.session.snapshot().decision).toBeUndefined();
  f.session.reviewConsent(answer, 'YES', 'Human review'); expect(f.session.snapshot().decision?.questionInstanceId).toBe(id);
  expect(f.session.snapshot().answerWindow?.status).toBe('CONSUMED');
});
it.each(['before', 'equal', 'unknown', 'wrong-owner'] as const)('speech onset %s is UNCLEAR despite a late final after completion', mode => {
  const f = fixture(); f.setup(); const id = f.queue(); f.complete(id);
  const at = f.session.snapshot().answerWindow!.openedAt;
  f.receive('Ja.', { speechStartedAt: mode === 'unknown' ? undefined : mode === 'equal' ? at : at - 1, answerPlaybackId: mode === 'wrong-owner' ? 'wrong' : id });
  expect(f.session.snapshot().turns.at(-1)?.consent.eligibleYes).toBe(false);
});
it('barge-in preserves raw partial/final history ownership, interrupts playback, and requires a fresh question', () => {
  const f = fixture(); f.setup(); const id = f.queue(); f.session.mockPlayback('start', id);
  const onset = f.tick(); f.receive('Ja', { id: 'speech', final: false, speechStartedAt: onset, answerPlaybackId: id });
  expect(f.session.snapshot().playbacks.at(-1)?.state).toBe('INTERRUPTED');
  expect(() => f.session.mockPlayback('complete', id)).toThrow();
  const repeated = f.session.repeat(); f.complete(repeated);
  f.receive('Ja.', { id: 'speech', speechStartedAt: f.tick(), answerPlaybackId: repeated });
  const turn = f.session.snapshot().turns.at(-1)!;
  expect(turn.transcript.text).toBe('Ja.'); expect(turn.transcript.speechStartedAt).toBe(onset); expect(turn.transcript.answerPlaybackId).toBe(id); expect(turn.consent.eligibleYes).toBe(false);
  expect(f.session.snapshot().recommendedResponseId).toBe('clarify');
  expect(f.session.exportReview().events.find(e => e.event === 'recognition.partial_observed')?.data.text).toBe('Ja');
});
it('repeat/replacement creates a new ID; stale, wrong, duplicate completion and old YES cannot attach', () => {
  const f = fixture(); f.setup(); const old = f.queue(); f.complete(old); const next = f.session.repeat();
  expect(next).not.toBe(old); expect(f.session.snapshot().answerWindow?.status).toBe('INVALIDATED');
  for (const id of [old, 'unknown']) expect(() => f.session.mockPlayback('complete', id)).toThrow();
  f.complete(next); expect(() => f.session.mockPlayback('complete', next)).toThrow();
  f.receive('Ja.', { answerPlaybackId: old }); expect(f.session.snapshot().turns.at(-1)?.consent.eligibleYes).toBe(false);
  expect(() => f.session.mockPlayback('complete', next)).toThrow();
  const fresh = f.queue(); f.complete(fresh); const answer = f.receive(); f.session.reviewConsent(answer, 'YES', 'Fresh owned answer');
});
it('skip / identity change / terminal close cannot leave a queued question capable of arming', () => {
  for (const action of ['skip', 'identity', 'end']) {
    const f = fixture(); f.setup(); const id = f.queue(); f.session.mockPlayback('start', id);
    if (action === 'skip') f.session.skip(); else if (action === 'identity') f.session.setRecipient('UNKNOWN', 'Cannot identify respondent'); else f.session.end();
    expect(() => f.session.mockPlayback('complete', id)).toThrow(); expect(f.session.snapshot().answerWindow?.status).not.toBe('OPEN');
  }
});
it('intermediary requires genuine current evidence and named separate attestation under frozen policy', () => {
  const f = fixture(); f.session.setRecipient('INTERMEDIARY', 'Receptionist');
  const id = f.receive('Jeg har fuldmagt til at oplyse lægens e-mailadresse.');
  expect(eligibleRecipient(f.session.snapshot())).toBe(false);
  expect(() => f.session.confirmAuthority(id, 'Review', '')).toThrow();
  f.session.confirmAuthority(id, 'Review existing claim');
  expect(f.session.snapshot()).toMatchObject({ authorityPolicyVersion, authorityEvidenceTurnId: id, authorityEvidenceText: 'Jeg har fuldmagt til at oplyse lægens e-mailadresse.', authorityAttestedBy: 'operator-7', authorityAttestedAt: '2026-10-18T11:00:00.000Z' });
  expect(eligibleRecipient(f.session.snapshot())).toBe(true); f.session.rehearseResponse('purpose'); f.yes();
  f.session.setRecipient('UNKNOWN', 'Changed respondent'); expect(f.session.snapshot()).toMatchObject({ decision: undefined, email: undefined, authorityAttestation: undefined });
});
it('handoff failure preserves exact underlying successful evidence; acknowledgement is mock only', () => {
  const f = fixture(); f.success(); const before = f.session.snapshot(); f.session.prepareHandoff();
  const candidate = f.session.snapshot().handoff!.candidate;
  expect(candidate).toMatchObject({ callId: 'b2-call', auditVersion: '2.0b2-1', evaluationOnly: true, consentQuestionTextHash: canonicalConsent.textHash, completionSource: 'MOCK_ADAPTER', answerClassification: 'YES', email: { rawTranscript: 'anna@example.dk', normalizedCandidate: 'anna@example.dk', confirmed: true } });
  expect(candidate.recipientEvidence.identityAttestation?.reason).toBeTruthy();
  f.session.mockHandoff('HANDOFF_FAILED', 'Offline failure'); const failed = f.session.snapshot();
  expect(failed.handoff?.candidate).toEqual(candidate); const { handoff: omitted, ...evidence } = failed; expect(omitted?.status).toBe('HANDOFF_FAILED'); expect(evidence).toEqual(before);
  f.session.mockHandoff('HANDED_OFF', 'Offline acknowledgement'); expect(f.session.snapshot().handoff?.attempts).toHaveLength(2);
  expect(f.session.exportReview()).toMatchObject({ phoneTransport: false, downstreamConfirmationEmailSent: false });
  expect(() => f.session.mockHandoff('HANDOFF_FAILED', 'Late failure')).toThrow();
});
it('handoff cannot project incomplete/unreviewed/unconfirmed, changed, refused or unknown evidence', () => {
  const f = fixture(); expect(() => f.session.prepareHandoff()).toThrow(); f.setup(); f.yes(); expect(() => f.session.prepareHandoff()).toThrow();
  const good = fixture(); good.success(); const snapshot = good.session.snapshot();
  for (const mutate of [(s: typeof snapshot) => { s.email!.confirmed = false; }, (s: typeof snapshot) => { s.recipientRevision++; }, (s: typeof snapshot) => { s.recipientType = 'UNKNOWN'; }, (s: typeof snapshot) => { s.decision!.classification = 'NO'; }, (s: typeof snapshot) => { s.playbacks.find(p => p.phraseId === 'consent-question')!.state = 'FAILED'; }]) { const changed = structuredClone(snapshot); mutate(changed); expect(() => handoffCandidate(changed)).toThrow(); }
});
it('workspace exposes mock boundaries and handoff without calls on mount', () => {
  const forbidden = vi.fn(() => { throw new Error('Forbidden live request'); });
  vi.stubGlobal('fetch', forbidden); vi.stubGlobal('WebSocket', forbidden); vi.stubGlobal('AudioContext', forbidden);
  try { const html = renderToStaticMarkup(<ConsentWorkspace/>); for (const label of ['MOCK PLAYBACK', 'NO PHONE CONNECTION', 'NO PRODUCTION AUDIO', 'Mock start', 'Mock complete', 'Mock interrupt', 'Mock fail', 'Answer window', 'Handoff status', 'Mark mock speech onset']) expect(html).toContain(label); expect(forbidden).not.toHaveBeenCalled(); } finally { vi.unstubAllGlobals(); }
});
