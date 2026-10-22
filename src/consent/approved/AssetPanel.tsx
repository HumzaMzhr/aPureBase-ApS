import { useEffect, useState } from 'react';
import type { ConsentSession } from '../session';
import { LocalPrerecordedPlayback } from './localPlayback';
import { verifiedAssets } from './assetPack';
import { approvedInventory, verifyAsset } from './assets';
import { operationalDefinition } from './definition';
import { selectOperationalResponse } from './selector';

export function ApprovedAssetPanel({ session, refresh }: { session: ConsentSession; refresh: () => void }) {
  const [running, setRunning] = useState(false), [qa, setQA] = useState<{ id: string; state: string; proof?: string; assetHash?: string; gain?: unknown }[]>([]), [error, setError] = useState('');
  const [qaPlayer] = useState(() => new LocalPrerecordedPlayback());
  useEffect(() => () => { void qaPlayer.dispose(); }, [qaPlayer]);
  const [binding, setBinding] = useState('Not tested');
  async function playGolden() {
    setError(''); setRunning(true);
    try { for (const id of ['opening','purpose','consent-question']) { await session.approvePlayback(id); refresh(); if (session.snapshot().playbacks.at(-1)?.state !== 'COMPLETED') break; } }
    catch (error) { setError(error instanceof Error ? error.message : 'Local playback failed'); }
    finally { setRunning(false); refresh(); }
  }
  async function runQA() {
    setRunning(true); setError(''); setQA([]);
    try {
      for (const asset of verifiedAssets.filter((a,i,list) => list.findIndex(x => x.assetHash === a.assetHash) === i)) {
        const phrase = operationalDefinition.responses.find(r => r.id === asset.phraseId)!;
        let completed = false;
        await qaPlayer.play(phrase, { callId: 'asset-qa-no-consent', playbackId: 'qa-' + phrase.id, phraseId: phrase.id, phraseVersion: phrase.version, assetId: phrase.id, assetHash: asset.assetHash, state: 'QUEUED', queuedAt: performance.now(), startedAt: null, completedAt: null, interruptedAt: null, failedAt: null, completionSource: null, recipientRevision: 0, answerConsumed: true }, event => {
          completed = event.action === 'complete';
          setQA(old => [...old.filter(x => x.id !== phrase.id), { id: phrase.id, state: event.action, proof: event.outputProof, assetHash: event.assetHash, gain: event.gain }]);
        });
        if (!completed) throw new Error('QA was interrupted; incomplete assets are not verified.');
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'QA failed'); }
    finally { setRunning(false); }
  }
  async function checkBinding() {
    const asset = verifiedAssets[0]; if (!asset) return;
    try {
      const bytes = new Uint8Array(await (await fetch(asset.path, { cache: 'no-store' })).arrayBuffer());
      const altered = bytes.slice(); altered[altered.length - 5] ^= 1;
      const cases = [[{...asset,text:asset.text+' '},bytes], [{...asset,wordingVersion:'wrong-version'},bytes], [asset,altered]] as const;
      let rejected = 0;
      for (const [item,data] of cases) { try { await verifyAsset(item,data); } catch { rejected++; } }
      setBinding(rejected === 3 ? 'PASS — wrong text, wrong version and altered bytes rejected; original assets unchanged' : 'FAIL');
    } catch { setBinding('FAIL — local asset unavailable'); }
  }
  const snapshot = session.snapshot(), selection = selectOperationalResponse(session);
  return <section className="consent-card" aria-label="Approved local asset pack">
    <h2>Stage 2.0C-1 · Local prerecorded Isabella</h2>
    <p>BUSINESS WORDING FROZEN · LOCAL CACHED AUDIO · NO PHONE CONNECTION · NO DEPLOYMENT</p>
    <p>26 static phrase IDs / 25 unique verified recordings. Four named templates and exact email readback remain dynamic and route to human takeover. Local media completion is not physical telephone proof.</p>
    <p>Selector: <strong>{selection.kind}</strong> · {selection.kind === 'APPROVED_PRERECORDED' ? selection.phraseId : selection.reason}</p>
    <button disabled={running || snapshot.recipientType !== 'TARGET_HCP' || !snapshot.targetVerified || !['ANSWERED','RIGHT_PERSON'].includes(snapshot.state)} onClick={() => void playGolden()}>Play approved opening → purpose → consent question</button>
    <p>Stops after the completed consent question and waits for the recipient. No microphone/provider starts here. Verify identity first. Use headphones.</p>
    <details><summary>Cached asset verification · never arms consent</summary>
      <button disabled={running} onClick={() => void runQA()}>Verify all 25 cached recordings locally</button>
      <button onClick={() => qaPlayer.cancel()}>Stop asset verification</button>
      <button disabled={running} onClick={() => void checkBinding()}>Check text / version / asset rejection</button>
      <p>Binding checks: {binding}</p>
      <pre aria-label="Asset playback QA results">{JSON.stringify(qa,null,2)}</pre>
    </details>
    {error && <p role="alert">{error}</p>}
    <details><summary>Frozen phrase inventory</summary>{approvedInventory.map(p => <p key={p.id}><code>{p.id}</code> · {p.dynamicValues.length ? 'DYNAMIC — NO STATIC AUDIO' : 'STATIC'} · {p.text}</p>)}</details>
  </section>;
}
