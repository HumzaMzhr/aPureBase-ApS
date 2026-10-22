import {createRoot} from 'react-dom/client';
import {TelephonyOperations} from './App';
import {HumanAcceptanceApp} from '../../consent/stage32/handoff/App';
import type {ReviewData} from '../../consent/stage32/handoff/contract';
import '../../consent/stage32/handoff/style.css';
document.title=location.pathname==='/qa'?'aPureBase · Human Acceptance / QA':'aPureBase · D-1 LOCAL MOCK';
void (async()=>{const root=createRoot(document.getElementById('root')!);if(location.pathname==='/qa'){const data=await fetch('/review-data.json').then(r=>r.json()) as ReviewData;root.render(<><div className="qa-area-nav"><a href="/">← Operations</a><strong>HUMAN ACCEPTANCE / QA · D-1 HOST · LIVE ASR DISABLED</strong></div><HumanAcceptanceApp data={data}/></>);}else{const config=await fetch('/api/d1/health').then(r=>r.json()) as Record<string,unknown>;root.render(<TelephonyOperations configuration={config}/>);}})().catch(()=>{document.getElementById('root')!.textContent='Local package failed to start. No provider session was started.';});
