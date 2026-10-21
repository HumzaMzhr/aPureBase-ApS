import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

export const c32Baseline='34285a8d6f4f94c6e8036c375b8a3244c316c176';
const publishedCandidate='93bb4e86ab6e0b681c5eeec023b6afcfbc97c513';
const verifierPaths=['scripts/verify-stage20c32.ts','scripts/verify-stage20c32-hardening2.ts'];
export function assertC32BaselineAncestor(baseline:string,runGit:(args:string[])=>unknown=args=>execFileSync('git',args,{stdio:'pipe'})){
 if(baseline!==c32Baseline)throw new Error('Unexpected preservation baseline');
 try{runGit(['merge-base','--is-ancestor',baseline,'HEAD']);}catch{throw new Error('Preserved C-3.1 baseline is not an ancestor of HEAD');}
}
interface Compatibility {version:number;candidateCommit:string;files:{path:string;before:string;after:string}[]}
export function validateVerifierCompatibility(proof:Compatibility,original:Map<string,string>,current:Map<string,string>){
 if(proof.version!==1||proof.candidateCommit!==publishedCandidate||!Array.isArray(proof.files)||proof.files.length!==2||new Set(proof.files.map(r=>r.path)).size!==2)throw new Error('Invalid verifier compatibility proof');
 for(const r of proof.files)if(!verifierPaths.includes(r.path)||!/^[a-f0-9]{64}$/u.test(r.before)||!/^[a-f0-9]{64}$/u.test(r.after)||r.before!==original.get(r.path)||r.after!==current.get(r.path))throw new Error('Unreviewed verifier change: '+r.path);
 return proof.files;
}
export async function verifierCompatibility(){
 const proof=JSON.parse(await readFile('docs/stage-2.0c-3.2-verifier-compatibility.json','utf8')) as Compatibility;
 const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
 const original=new Map(verifierPaths.map(path=>[path,digest(execFileSync('git',['show',publishedCandidate+':'+path]))]));
 const current=new Map(await Promise.all(verifierPaths.map(async path=>[path,digest(await readFile(path))] as const)));
 return validateVerifierCompatibility(proof,original,current);
}
