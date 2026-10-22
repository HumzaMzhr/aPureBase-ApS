import {createRoot} from 'react-dom/client';
import {OperationsApp} from '../operations/App';
import {HumanAcceptanceApp} from './App';
import type {ReviewData} from './contract';
import './style.css';
document.title=location.pathname==='/qa'?'aPureBase · Human Acceptance / QA':'aPureBase · Operations';
void fetch('/review-data.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Package review data missing');return r.json() as Promise<ReviewData>;}).then(data=>{if(data.items.length!==16)throw new Error('Expected authoritative 16-item inventory');createRoot(document.getElementById('root')!).render(location.pathname==='/qa'?<><div className="qa-area-nav"><a href="/">← Operations</a><strong>HUMAN ACCEPTANCE / QA · LOCAL RETEST</strong></div><HumanAcceptanceApp data={data}/></>:<OperationsApp/>);}).catch(error=>{document.getElementById('root')!.textContent='Package cannot start: '+String(error)+'. Do not test; return diagnostics to Humza.';});
