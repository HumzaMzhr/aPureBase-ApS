import {useEffect,useState} from 'react';
import {pronunciationRegistry,proposedGenerations} from './speech';
export default function SpeechPanel(){
 const [rows,setRows]=useState<Awaited<ReturnType<typeof pronunciationRegistry>>>([]),[selected,setSelected]=useState(0),[plan,setPlan]=useState<unknown>(null);
 useEffect(()=>{let active=true;void pronunciationRegistry().then(r=>{if(active)setRows(r);});return()=>{active=false;};},[]);
 const r=rows[selected];
 return <section><h2>Speech ownership · HUMAN REVIEW REQUIRED</h2><p>Canonical Danish stays authoritative. Existing audio and future rendering plans are separate. Native naturalness is UNVERIFIED.</p>
 <label>Spoken unit <select value={selected} onChange={e=>setSelected(Number(e.target.value))}>{rows.map((r,i)=><option key={i} value={i}>{r.phraseId} · {r.canonicalHash.slice(0,8)}</option>)}</select></label>
 {r&&<><p><strong>Canonical:</strong> {r.canonicalText}</p><p><strong>English meaning:</strong> {r.english}</p><p>Phrase/version: {r.phraseId} / {r.phraseVersion} · Consent-critical: {String(r.consentCritical)}</p><p><strong>Current speech render:</strong> {r.plans[0].spokenRenderText}</p><details><summary>Hashes, exact provider blueprint, pronunciation rules and historical feedback</summary><pre>{JSON.stringify(r,null,2)}</pre></details></>}
 <button type="button" onClick={()=>void proposedGenerations().then(setPlan)}>Inspect proposed A/B payload — no generation</button>{plan!==null&&<pre>{JSON.stringify(plan,null,2)}</pre>}
 </section>;
}
