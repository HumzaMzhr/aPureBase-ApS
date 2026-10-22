import {useEffect,useState} from 'react';
import {pronunciationRegistry,proposedGenerations} from './speech';
import {candidates} from '../speech/candidates';
import {currentAssetTable,proposedClosureGenerations} from '../feedback/closure';
export default function SpeechPanel(){
 const [rows,setRows]=useState<Awaited<ReturnType<typeof pronunciationRegistry>>>([]),[selected,setSelected]=useState(0),[plan,setPlan]=useState<unknown>(null);
 const [current,setCurrent]=useState<Awaited<ReturnType<typeof currentAssetTable>>|null>(null);
 useEffect(()=>{let active=true;void pronunciationRegistry().then(r=>{if(active)setRows(r);});return()=>{active=false;};},[]);
 useEffect(()=>{let active=true;void currentAssetTable().then(r=>{if(active)setCurrent(r);});return()=>{active=false;};},[]);
 const r=rows[selected];
 return <section><h2>Speech ownership · HUMAN REVIEW REQUIRED</h2><p>Canonical Danish stays authoritative. The three new C-3.2 recordings are unapproved listening candidates; native pronunciation is UNVERIFIED. Other audio remains historical.</p>
 <ul>{candidates.map(a=><li key={a.phraseId}>{a.phraseId}: {a.wordingVersion} · new audio SHA-256 {a.assetHash} · replaces historical {a.replacesAudioHash} · HUMAN_REVIEW_PENDING</li>)}</ul>
 <details><summary>Current complete asset selection, exact human ratings and pronunciation expectations</summary><pre>{current?JSON.stringify(current,null,2):'Loading current bindings…'}</pre></details>
 <button type="button" onClick={()=>void proposedClosureGenerations().then(setPlan)}>Inspect completed Clarify generation — no further requests authorized</button>
 <label>Spoken unit <select value={selected} onChange={e=>setSelected(Number(e.target.value))}>{rows.map((r,i)=><option key={i} value={i}>{r.phraseId} · {r.canonicalHash.slice(0,8)}</option>)}</select></label>
 {r&&<><p><strong>Historical canonical:</strong> {r.canonicalText}</p><p><strong>English meaning:</strong> {r.english}</p><p>Historical phrase/version: {r.phraseId} / {r.phraseVersion} · Consent-critical: {String(r.consentCritical)}</p><p><strong>Historical reference speech render:</strong> {r.plans[0].spokenRenderText}</p>{candidates.filter(a=>a.phraseId===r.phraseId).map(a=><p key={a.assetHash}><strong>New C-3.2 canonical:</strong> {a.text}<br/><strong>New C-3.2 spoken render:</strong> {a.spokenText}<br/>Canonical text SHA-256: {a.textHash} · spoken text SHA-256: {a.spokenTextHash}</p>)}<details><summary>Historical hashes, provider blueprint, pronunciation rules and feedback</summary><pre>{JSON.stringify(r,null,2)}</pre></details></>}
 <button type="button" onClick={()=>void proposedGenerations().then(setPlan)}>Inspect historical pre-generation A/B proposal</button>{plan!==null&&<pre>{JSON.stringify(plan,null,2)}</pre>}
 </section>;
}
