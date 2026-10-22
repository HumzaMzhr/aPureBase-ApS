import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)));
const state=process.env.APUREBASE_STATE_DIR??resolve(process.env.HOME??'','Library/Application Support/aPureBase-C32-Retest');
try{
 const record=JSON.parse(await readFile(resolve(state,'server-'+createHash('sha256').update(root).digest('hex').slice(0,16)+'.json'),'utf8'));
 const health=await fetch('http://127.0.0.1:5173/api/c31/health',{signal:AbortSignal.timeout(1500)}).then(r=>r.json());
 if(health.bootId!==record.bootId||health.processId!==record.pid||health.candidateSourceHash!==record.candidateSourceHash)throw new Error('Different local process; refusing to stop it');
 process.kill(record.pid,'SIGTERM');console.log('This package server stopped. Browser progress remains saved; restart with Start.command.');
}catch(error){console.error('No matching package server stopped:',error instanceof Error?error.message:'unknown');process.exitCode=1;}
