import { AcceptanceWorkspace } from './acceptance/Workspace';
import { DynamicWorkspace } from './dynamic/Workspace';
import { operationalDefinition } from './approved/definition';
import { wordingVersion } from './approved/assets';
import { ApprovedAssetPanel } from './approved/AssetPanel';
import { LocalPrerecordedPlayback } from './approved/localPlayback';
import { OperationalClassifier, selectOperationalResponse } from './approved/selector';
import { useEffect, useState } from 'react';
import { ConsentSession, type TakeoverContext } from './session';
import { isTerminal } from './stateMachine';
import { TakeoverPanel } from './TakeoverPanel';
import type { ConsentClass } from './types';
import './consent.css';

export function ConsentWorkspace({ initialSession }: { initialSession?: ConsentSession }) {
  if (!initialSession && typeof window !== 'undefined' && new URLSearchParams(location.search).get('stage') === '2.0c3') return <AcceptanceWorkspace/>;
  if (!initialSession && typeof window !== 'undefined' && new URLSearchParams(location.search).get('stage') === '2.0c2') return <DynamicWorkspace/>;
  return <LegacyConsentWorkspace initialSession={initialSession}/>;
}
function LegacyConsentWorkspace({ initialSession }: { initialSession?: ConsentSession }) {
  const [localPlayer] = useState(() => new LocalPrerecordedPlayback());
  const [session] = useState(() => initialSession ?? (typeof window !== 'undefined' && location.pathname === '/consent-call' && new URLSearchParams(location.search).get('stage') !== '2.0b2' ? new ConsentSession(crypto.randomUUID(), { localPlayback: localPlayer, classifier: new OperationalClassifier() }, operationalDefinition) : new ConsentSession(crypto.randomUUID())));
  const operational = session.exportReview().definitionVersion === wordingVersion;
  const [autoRespond, setAutoRespond] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [snapshot, setSnapshot] = useState(() => session.snapshot());
  const [text, setText] = useState('');
  const [english, setEnglish] = useState('');
  const [error, setError] = useState('');
  const [review, setReview] = useState<ConsentClass>('UNCLEAR');
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState('');
  const [readback, setReadback] = useState(false);
  const [takeover, setTakeover] = useState<TakeoverContext>();
  const [identityReason, setIdentityReason] = useState('');
  const [authorityReason, setAuthorityReason] = useState('');
  const [authorityAttested, setAuthorityAttested] = useState(false);
  const [operatorId, setOperatorId] = useState('offline-rehearsal-operator');
  const [speech, setSpeech] = useState<{ at: number; playbackId?: string; id: string }>();
  const [normalizationReason, setNormalizationReason] = useState('');
  useEffect(() => () => { session.dispose(); void localPlayer.dispose(); }, [session, localPlayer]);
  useEffect(() => operational ? session.subscribe(() => setSnapshot(session.snapshot())) : undefined, [session, operational]);
  const current = snapshot.turns.at(-1);
  const recommended = session.response(snapshot.recommendedResponseId);
  const playback = snapshot.playbacks.find(p => p.playbackId === snapshot.activePlaybackId);
  const available = session.responses();
  const active = !isTerminal(snapshot.state) && snapshot.state !== 'HUMAN_TAKEOVER';
  function act(action: () => void) {
    setError('');
    try { action(); } catch (error) { setError(error instanceof Error ? error.message : 'Action failed.'); }
    setSnapshot(session.snapshot());
  }
  async function playLocal(id: string) {
    setError(''); setAudioBusy(true);
    try { await session.approvePlayback(id); } catch (error) { setError(error instanceof Error ? error.message : 'Local playback failed'); }
    finally { setAudioBusy(false); setSnapshot(session.snapshot()); }
  }
  function respondLocal() { const result = selectOperationalResponse(session); if (result.kind === 'APPROVED_PRERECORDED') void playLocal(result.phraseId); else if (result.kind === 'HUMAN_TAKEOVER') act(() => session.takeover(result.reason)); }
  function ingest(final: boolean) {
    act(() => {
      const at = performance.now();
      session.receive({ id: speech?.id ?? crypto.randomUUID(), text, english: english.trim() || undefined, final, source: 'manual-rehearsal', observedAt: at, speechStartedAt: speech?.at, answerPlaybackId: speech?.playbackId });
      if (final && operational && autoRespond) respondLocal();
      if (final) { setSpeech(undefined); setText(''); setEnglish(''); setReason(''); setReview('UNCLEAR'); setSelected(''); setReadback(false); }
    });
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(session.exportReview(), null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${operational ? 'stage20c1' : 'stage20b2'}-rehearsal-${snapshot.callId}.json`; anchor.click();
    URL.revokeObjectURL(url);
  }
  return <div className="consent-workspace">
    <header className="consent-header"><a href="/" className="consent-brand">aPureBase</a><span>{operational ? 'STAGE 2.0C-1 · APPROVED LOCAL ASSETS' : 'STAGE 2.0B-2 · WORDING & PLAYBACK CONTRACTS'}</span><a href="/">Existing interpreter</a></header>
    <main>
      <div className="consent-title"><div><p className="consent-eyebrow">Hybrid consent call</p><h1>Review. Choose. Respond.</h1><p>Danish conversation guidance with an explicit human decision at every step.</p></div><span className="consent-mode">OFFLINE REHEARSAL</span></div>
      <p className="consent-notice">{operational ? 'Business-authorized wording and verified cached Isabella assets. No microphone, provider or phone session starts here. Manual transcript inputs and mock delivery are evaluation evidence only.' : 'Draft wording and placeholder audio. No call is connected, no microphone is captured and no provider runs here. Simulated delivery and review records are evaluation only.'}</p>
      <p className="consent-source">OFFLINE REHEARSAL · MOCK PLAYBACK · NO PHONE CONNECTION · NO PHONE TRANSPORT · NO PRODUCTION AUDIO</p>
      {operational && <ApprovedAssetPanel session={session} refresh={() => setSnapshot(session.snapshot())}/>}
      <div className="consent-session-line"><span>Call <code>{snapshot.callId}</code></span><span>Recipient: <strong>{snapshot.recipientType}</strong></span><span>Authority: <strong>{snapshot.authorityStatus}</strong></span><button onClick={download}>Export local review</button></div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="consent-columns">
        <section className="consent-card" aria-label="Danish transcript">
          <p className="consent-eyebrow">01 · Listen</p><h2>Danish transcript</h2><span className="consent-source">MANUAL REHEARSAL INPUT · ASR PORT NOT CONNECTED</span>
          <div className="consent-transcript" aria-live="polite">
            {snapshot.turns.length === 0 && <p className="consent-muted">Finalized Danish turns will appear here. Partial text is never consent evidence.</p>}
            {snapshot.turns.map(turn => <article key={turn.id}><small>{new Date(turn.timestamp).toLocaleTimeString()} · {turn.transcript.source}</small><p lang="da">{turn.transcript.text || '(No recognized text)'}</p>{turn.transcript.english && <p lang="en" className="consent-muted">{turn.transcript.english}</p>}<small>{turn.classification.intent} · {turn.review ? `Agent reviewed ${turn.review.classification}` : 'Unreviewed'}</small></article>)}
            {snapshot.partial && <p lang="da" className="consent-partial">Partial: {snapshot.partial}</p>}
          </div>
          <button disabled={!active || !!speech} onClick={() => { const onset = { id: crypto.randomUUID(), at: performance.now(), playbackId: snapshot.answerWindow?.status === 'OPEN' ? snapshot.answerWindow.playbackId : undefined }; setSpeech(onset); act(() => session.receive({ id: onset.id, text: '', final: false, source: 'manual-rehearsal', observedAt: onset.at, speechStartedAt: onset.at, answerPlaybackId: onset.playbackId })); }}>Mark mock speech onset</button>
          <p>Mock speech onset: {speech ? 'Known; ownership captured at onset' : 'Unknown — YES blocked'}</p>
          <label>Danish recognized text<textarea lang="da" value={text} disabled={!active} onChange={event => setText(event.target.value)} maxLength={4000}/></label>
          <label>English meaning (optional, operator supplied)<textarea lang="en" value={english} disabled={!active} onChange={event => setEnglish(event.target.value)} maxLength={4000}/></label>
          <div className="consent-button-row"><button disabled={!active || !text.trim()} onClick={() => ingest(false)}>Preview partial</button><button disabled={!active} onClick={() => ingest(true)}>Review final turn</button></div>
        </section>
        <section className="consent-card" aria-label="Recommendation">
          <p className="consent-eyebrow">02 · Understand</p><h2>Conversation guidance</h2>
          <dl className="consent-facts"><div><dt>State</dt><dd>{snapshot.state}</dd></div><div><dt>Detected intent</dt><dd>{current?.classification.intent ?? '—'}</dd></div><div><dt>Confidence · rule score</dt><dd>{current ? current.classification.confidence.toFixed(2) : '—'}</dd></div></dl>
          <p className="consent-muted">Rule scores are not calibrated probabilities. Unsupported text requires human review.</p>
          <h3>Last final transcript</h3><p lang="da">{current?.transcript.text ?? '—'}</p>
          <h3>Current turn · consent evidence</h3>
          <div className="consent-badges" aria-label="Consent classification">{(['YES', 'NO', 'UNCLEAR'] as const).map(value => <span key={value} className={(current?.consent.classification ?? 'UNCLEAR') === value ? `selected ${value.toLowerCase()}` : ''}>{value}</span>)}</div>
          <p>{current?.consent.reason ?? 'No finalized answer to a delivered consent question.'}</p>
          <p role="status">Agent-reviewed permission: <strong>{snapshot.decision?.classification ?? 'No decision'}</strong></p>
          <p role="status">Email status: <strong>{snapshot.emailStatus}</strong></p>
          {snapshot.fallbackReason && <p className="consent-notice">{snapshot.fallbackReason}</p>}
          {snapshot.doNotContactRequested && <p>Stop-contact request recorded locally. Downstream suppression has not been performed.</p>}
          <div className="consent-response"><span className="consent-source">{operational ? 'RECOMMENDED ISABELLA RESPONSE · BUSINESS AUTHORIZED' : 'RECOMMENDED ISABELLA RESPONSE · DRAFT'}</span><h3>{recommended?.id ?? 'Human review / takeover'}</h3><p lang="da">{recommended?.text ?? 'No supported prerecorded response is recommended.'}</p><p lang="en" className="consent-muted">{recommended?.english ?? current?.fallbackReason ?? 'Review the current turn before continuing.'}</p></div>
          <p>Delivery type: {recommended?.deliveryType ?? '—'}</p>
          <h3>{operational ? 'Playback lifecycle · local / mock' : 'MOCK PLAYBACK lifecycle'}</h3><p role="status">{playback?.state ?? 'NOT_STARTED'} · {playback?.playbackId ?? 'No playback'}</p>
          <p>Answer window: {snapshot.answerWindow?.status ?? 'Not armed'} · {snapshot.answerWindow?.playbackId ?? '—'}</p>
          <p>Handoff status: {snapshot.handoff?.status ?? 'No candidate'}</p>
          <small>Isabella · eleven_flash_v2_5 · {operational ? 'Verified static assets available · business wording authorized · production deployment NOT AUTHORIZED' : 'no audio asset generated · ' + (recommended?.wordingStatus ?? 'No wording selected') + ' · NOT APPROVED'}</small>
          {current && <details><summary>Turn evidence and timing</summary><pre>{JSON.stringify({ consent: current.consent, review: current.review, latency: current.latency, stateBefore: current.stateBefore, stateAfter: current.stateAfter }, null, 2)}</pre></details>}
        </section>
        <section className="consent-card" aria-label="Agent controls">
          <p className="consent-eyebrow">03 · Decide</p><h2>Agent controls</h2>
          <fieldset disabled={!active}><legend>Recipient / identity</legend>
            <p>Target HCP · Intermediary · Unknown</p>
            <label>Identity verification reason<input value={identityReason} maxLength={1000} onChange={event => setIdentityReason(event.target.value)}/></label>
            <button disabled={!identityReason.trim()} onClick={() => act(() => { session.setRecipient('TARGET_HCP', identityReason, true); setAuthorityAttested(false); })}>Verify target HCP</button>
            <button onClick={() => act(() => { session.setRecipient('INTERMEDIARY', 'Operator selected intermediary in rehearsal.'); setAuthorityAttested(false); })}>Intermediary / receptionist</button>
            <button onClick={() => act(() => { session.setRecipient('UNKNOWN', 'Operator cannot establish recipient identity.'); setAuthorityAttested(false); })}>Unknown recipient</button>
          </fieldset>
          <fieldset disabled={!active}><legend>Authority evidence and agent attestation</legend>
            <p>Authority status: <strong>{snapshot.authorityStatus}</strong></p>
            {snapshot.authorityEvidence ? <><p lang="da">{snapshot.authorityEvidence.transcriptText}</p><small>Evidence turn: {snapshot.authorityEvidence.transcriptTurnId} · {snapshot.authorityEvidence.recordedAt}</small></> : <p>No explicit authority evidence.</p>}
            <label>Operator identifier<input value={operatorId} onChange={event => setOperatorId(event.target.value)} maxLength={160}/></label>
            <label>Authority verification reason<textarea value={authorityReason} maxLength={1000} onChange={event => setAuthorityReason(event.target.value)}/></label>
            <label className="consent-check"><input type="checkbox" checked={authorityAttested} onChange={event => setAuthorityAttested(event.target.checked)}/> I have verified the required authority for this request and email address; record my operator attestation.</label>
            <button disabled={!operatorId.trim() || !authorityAttested || !authorityReason.trim() || snapshot.recipientType !== 'INTERMEDIARY' || snapshot.authorityStatus !== 'CLAIMED' || !snapshot.authorityEvidence} onClick={() => act(() => session.confirmAuthority(snapshot.authorityEvidence!.transcriptTurnId, authorityReason, operatorId))}>Confirm intermediary authority</button>
            <p className="consent-muted">A claim is evidence to review. Neither the classifier nor this rehearsal determines legal authority.</p>
          </fieldset>
          {operational && <><label className="consent-check"><input type="checkbox" checked={autoRespond} onChange={event => setAutoRespond(event.target.checked)}/> Auto-select approved local response after final transcript (operator consent review remains mandatory)</label><button disabled={!active || audioBusy} onClick={respondLocal}>Run guarded local recommendation</button><p>Exact email/name speech is unresolved: local automation uses HUMAN_TAKEOVER. Mock readback controls below simulate only the evidence workflow.</p></>}
          <button className="primary consent-wide" disabled title="Production clips await wording approval and verified assets.">PLAY RECOMMENDED RESPONSE</button>
          <p className="consent-muted">{operational ? 'The controls below use MOCK PLAYBACK only. They do not prove actual local or telephone delivery.' : 'No approved audio responses yet. The following controls simulate delivery without sound.'}</p>
          <button className="consent-wide" disabled={!active || !available.some(response => response.id === recommended?.id)} onClick={() => act(() => { if (recommended!.deliveryType === 'SPOKEN_CLIP') session.queueResponse(recommended!.id); else session.performAction(recommended!.id); })}>{recommended?.deliveryType === 'SPOKEN_CLIP' ? 'Queue recommended · mock playback' : 'Perform recommended nonspoken action'}</button>
          <label>Alternative responses · drafts<select value={selected} disabled={!active} onChange={event => setSelected(event.target.value)}><option value="">Choose a response</option>{available.map(response => <option key={response.id} value={response.id}>{response.id}</option>)}</select></label>
          {selected && <p lang="da">{available.find(response => response.id === selected)?.text}</p>}
          <button disabled={!active || !available.some(response => response.id === selected)} onClick={() => act(() => { if (session.response(selected)?.deliveryType === 'SPOKEN_CLIP') session.queueResponse(selected); else session.performAction(selected); })}>Queue / perform selected alternative</button>
          <div className="consent-button-row">{(['start', 'complete', 'interrupt', 'fail'] as const).map(action => <button key={action} disabled={!active || !playback || (action === 'start' ? playback.state !== 'QUEUED' : action === 'complete' ? playback.state !== 'PLAYING' : !['QUEUED', 'PLAYING'].includes(playback.state))} onClick={() => act(() => session.mockPlayback(action, playback!.playbackId))}>Mock {action}</button>)}</div>
          <div className="consent-button-row"><button disabled={!active} onClick={() => act(() => session.repeat())}>REPEAT · rehearsal</button><button disabled={!active} onClick={() => act(() => session.skip())}>SKIP</button></div>
          <fieldset disabled={!active || !current || !!current.review || !!current.skipped}><legend>Agent consent review / override</legend><label>Classification<select value={review} onChange={event => setReview(event.target.value as ConsentClass)}><option value="UNCLEAR">UNCLEAR</option><option value="NO">NO</option><option value="YES" disabled={!current?.consent.eligibleYes || snapshot.state !== 'CONSENT_YES'}>YES · requires affirmative evidence</option></select></label><label>Review reason<textarea value={reason} maxLength={1000} onChange={event => setReason(event.target.value)}/></label><button disabled={!reason.trim()} onClick={() => act(() => session.reviewConsent(current!.id, review, reason))}>Finalize local rehearsal review</button></fieldset>
          {snapshot.email && <fieldset disabled={!active}><legend>Email evidence / readback</legend>
            <p>Raw transcript: {snapshot.email.rawTranscript}</p><p>Candidate: {snapshot.email.normalizedCandidate}</p><p>Readback: {snapshot.email.readbackValue ?? 'Not read back'}</p>
            {snapshot.email.normalizationChanged && !snapshot.email.normalizationReviewedAt && <><p>A character was removed from the transcript candidate. Explicit review is required.</p><label>Normalization review reason<input value={normalizationReason} onChange={event => setNormalizationReason(event.target.value)}/></label><button disabled={!normalizationReason.trim()} onClick={() => act(() => session.reviewEmailNormalization(snapshot.email!.normalizedCandidate, normalizationReason))}>Review exact normalization</button></>}
            <button disabled={snapshot.state !== 'EMAIL_CONFIRM' || !!snapshot.email.readbackValue || snapshot.email.normalizationChanged && !snapshot.email.normalizationReviewedAt} onClick={() => act(() => session.recordEmailReadback(snapshot.email!.normalizedCandidate))}>Record exact readback · rehearsal</button>
            <label className="consent-check"><input type="checkbox" checked={readback} onChange={event => setReadback(event.target.checked)}/> Recipient confirmed the exact readback in rehearsal</label>
            <button disabled={!readback || !snapshot.email.readbackValue || snapshot.email.confirmed || snapshot.state !== 'EMAIL_CONFIRM'} onClick={() => act(() => session.confirmEmail(snapshot.email!.normalizedCandidate, readback))}>{snapshot.email.confirmed ? 'Email confirmed' : 'Confirm exact captured email'}</button>
          </fieldset>}
          <fieldset><legend>Mock downstream handoff · no external write</legend>
            <button disabled={snapshot.state !== 'END_SUCCESS' || !!snapshot.handoff} onClick={() => act(() => session.prepareHandoff())}>Prepare handoff candidate</button>
            <button disabled={!snapshot.handoff || snapshot.handoff.status === 'HANDED_OFF'} onClick={() => act(() => session.mockHandoff('HANDOFF_FAILED', 'Offline simulated failure'))}>Mock handoff failure</button>
            <button disabled={!snapshot.handoff || snapshot.handoff.status === 'HANDED_OFF'} onClick={() => act(() => session.mockHandoff('HANDED_OFF', 'Offline simulated acknowledgement'))}>Mock handoff acknowledgement</button>
          </fieldset>
          <button className="consent-takeover consent-wide" disabled={!active} onClick={() => act(() => { const context = { callId: snapshot.callId, reason: current?.fallbackReason ?? 'Agent requested live interpretation.', lastTurnId: current?.id }; session.takeover(context.reason); setTakeover(context); })}>HUMAN TAKEOVER</button>
          <button className="end-call consent-wide" disabled={isTerminal(snapshot.state)} onClick={() => act(() => { session.end(); setTakeover(undefined); })}>END CALL</button>
          <p className="consent-muted">Hybrid END CALL ends this workspace, not an external telephone connection. Transcript and email stay in memory until you leave; export is optional.</p>
        </section>
      </div>
      {snapshot.state === 'HUMAN_TAKEOVER' && <TakeoverPanel context={takeover ?? { callId: snapshot.callId, reason: snapshot.fallbackReason ?? 'Agent requested human assistance.', lastTurnId: current?.id }}/>}
    </main>
    <footer>{operational ? 'Stage 2.0C-1 · Local asset integration only · Physical telephone behavior NOT VERIFIED · Production deployment NOT AUTHORIZED' : 'Stage 2.0B-2 specification · Human approval required · Not production-ready'}</footer>
  </div>;
}
