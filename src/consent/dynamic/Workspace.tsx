import { useEffect, useState } from 'react';
import { ConsentSession } from '../session';
import { OperationalClassifier } from '../approved/selector';
import { DynamicLocalPlayback } from './playback';
import { dynamicDefinition, nextAction } from './controller';
import '../consent.css';
export function DynamicWorkspace(){
  const [player]=useState(()=>new DynamicLocalPlayback());
  const [session]=useState(()=>new ConsentSession(crypto.randomUUID(),{localPlayback:player,dynamicSpeech:player,classifier:new OperationalClassifier(),operatorId:'local-operator'},dynamicDefinition));
  const [s,setS]=useState(()=>session.snapshot()),[text,setText]=useState(''),[name,setName]=useState(''),[source,setSource]=useState(''),[pronunciation,setPronunciation]=useState(false),[reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [onset,setOnset]=useState<{id:string;at:number;playbackId?:string}>();
  useEffect(()=>session.subscribe(()=>setS(session.snapshot())),[session]);
  useEffect(()=>()=>{session.dispose();void player.dispose();},[session,player]);
  const action=nextAction(session),last=s.turns.at(-1),playback=s.playbacks.at(-1),active=!s.state.startsWith('END_')&&s.state!=='HUMAN_TAKEOVER';
  function act(fn:()=>void){setError('');try{fn();}catch(e){setError(e instanceof Error?e.message:'Failed');}setS(session.snapshot());}
  async function play(){setBusy(true);setError('');try{if(action.kind==='PLAY')await session.approvePlayback(action.phraseId);else if(action.kind==='READBACK')await session.readbackEmail();else if(action.kind==='TAKEOVER')session.takeover(action.label);}catch(e){setError(e instanceof Error?e.message:'Failed');}finally{setBusy(false);setS(session.snapshot());}}
  function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(session.exportReview(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`stage20c2-${s.callId}.json`;a.click();URL.revokeObjectURL(url);}
  return <div className="consent-workspace"><header className="consent-header"><a href="/">aPureBase</a><span>STAGE 2.0C-2 · DETERMINISTIC DYNAMIC SPEECH</span><a href="/consent-call">C-1 baseline</a></header><main>
    <div className="consent-title"><div><p className="consent-eyebrow">Local audio rehearsal · no phone connection</p><h1>Listen. Review. Approve.</h1><p>Static approved Danish clips, sourced names and exact character-by-character email confirmation.</p></div><span className="consent-mode">LOCAL EVALUATION</span></div>
    <p className="consent-notice">Isabella · eleven_flash_v2_5 · speed 0.95 · gain 3.5573605757216837. Play/Approve may generate a declared dynamic slot through ElevenLabs if it is not cached. No microphone or recognition provider starts here. Manual onset markers are rehearsal evidence.</p>
    <div className="consent-session-line"><span>State <strong>{s.state}</strong></span><span>{s.recipientType} · {s.authorityStatus} · revision {s.recipientRevision}</span><button onClick={download}>Export local review</button></div>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="consent-columns"><section className="consent-card"><p className="consent-eyebrow">01 · Recipient & source</p><h2>Verified evidence</h2>
      <label>Operator evidence / review reason<input value={reason} onChange={e=>setReason(e.target.value)}/></label>
      <div className="consent-button-row"><button disabled={!active||!reason} onClick={()=>act(()=>session.setRecipient('TARGET_HCP',reason,true))}>Verify target HCP</button><button disabled={!active||!reason} onClick={()=>act(()=>session.setRecipient('INTERMEDIARY',reason))}>Identify intermediary</button></div>
      <label>Exact supplied target name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Contact record ID and source text containing exact name<textarea value={source} onChange={e=>setSource(e.target.value)}/></label>
      <label><input type="checkbox" checked={pronunciation} onChange={e=>setPronunciation(e.target.checked)}/> I reviewed the supplied name and can confirm its pronunciation</label>
      <button disabled={!active||!name||!source||!pronunciation} onClick={()=>act(()=>session.bindName({original:name,source:'contact-data',evidenceId:source.split('\n')[0],evidenceText:source,reviewedBy:'local-operator',reviewedAt:new Date().toISOString(),pronunciationConfirmed:pronunciation,recipientRevision:s.recipientRevision}))}>Bind exact name to current revision</button>
      <button disabled={!active||!reason||s.authorityStatus!=='CLAIMED'} onClick={()=>act(()=>session.confirmAuthority(s.authorityEvidence!.transcriptTurnId,reason,'local-operator'))}>Attest retained authority claim</button>
      <h3>Manual Danish recipient transcript</h3><button disabled={!active||!!onset} onClick={()=>act(()=>{const o={id:crypto.randomUUID(),at:performance.now(),playbackId:session.confirmationPlaybackId()??(s.answerWindow?.status==='OPEN'?s.answerWindow.playbackId:undefined)};setOnset(o);session.receive({id:o.id,text:'',final:false,source:'manual-rehearsal',observedAt:o.at,speechStartedAt:o.at,answerPlaybackId:o.playbackId});})}>Mark recipient speech onset / interrupt</button>
      <p>{onset?'Known onset and owner retained':'No onset: affirmative consent/confirmation blocked'}</p>
      <label>Exact recipient words<textarea value={text} onChange={e=>setText(e.target.value)} maxLength={4000}/></label>
      <button disabled={!active||!text} onClick={()=>act(()=>{session.receive({id:onset?.id??crypto.randomUUID(),text,final:true,source:'manual-rehearsal',observedAt:performance.now(),speechStartedAt:onset?.at,answerPlaybackId:onset?.playbackId});setOnset(undefined);setText('');})}>Submit final transcript</button>
    </section><section className="consent-card"><p className="consent-eyebrow">02 · Recommended next action</p><h2>{action.label}</h2>
      {action.kind==='PLAY'&&<p lang="da">{session.response(action.phraseId)?.text}</p>}
      <button disabled={!active||busy||!['PLAY','READBACK','TAKEOVER'].includes(action.kind)} onClick={()=>void play()}>{busy?'Output in progress':'Play / Approve next action'}</button>
      <p role="status">Playback {playback?.phraseId??'—'} · {playback?.state??'Not started'}</p><p>Consent: {s.decision?.classification??'No reviewed decision'} · Email: {s.emailStatus}</p>
      <p>{last?.classification.intent??'No recipient turn'} · {last?.consent.reason}</p>
      <div className="consent-button-row">{(['YES','NO','UNCLEAR']as const).map(c=><button key={c} disabled={!active||!last||!!last.review||!reason||(c==='YES'&&!last.consent.eligibleYes)} onClick={()=>act(()=>session.reviewConsent(last!.id,c,reason))}>Review {c}</button>)}</div>
      {s.email&&<><h3>Exact captured email</h3><p>{s.email.rawTranscript}</p><code>{s.email.normalizedCandidate}</code>{s.email.normalizationChanged&&!s.email.normalizationReviewedAt&&<button disabled={!reason} onClick={()=>act(()=>session.reviewEmailNormalization(s.email!.normalizedCandidate,reason))}>Approve exact normalization change</button>}<p>Readback {s.email.readbackValue??'Awaiting actual output'} · Confirmed {String(s.email.confirmed)}</p><button disabled={busy||s.email.confirmed||action.kind!=='CONFIRM'} onClick={()=>act(()=>session.confirmEmail(s.email!.normalizedCandidate,true))}>Approve owned recipient confirmation</button></>}
      <button disabled={!active} onClick={()=>act(()=>session.takeover(reason||'Explicit operator takeover'))}>Human takeover</button><button disabled={!active} onClick={()=>act(()=>session.end())}>End rehearsal</button>
    </section></div>
    <section className="consent-card"><h2>Retained transcript & output audit</h2>{s.turns.map(t=><p key={t.id}><strong>{t.classification.intent}</strong> · {t.transcript.text}</p>)}<p>{s.playbacks.filter(p=>p.state==='COMPLETED').length} completed outputs · {s.playbacks.filter(p=>p.state==='INTERRUPTED').length} interruptions</p><p>Completion is local WebAudio source-ended proof. Telephone delivery and Danish pronunciation still need human verification.</p></section>
  </main></div>;
}
