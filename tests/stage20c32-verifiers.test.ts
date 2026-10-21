import {it,expect,vi} from 'vitest';
import {assertC32BaselineAncestor,c32Baseline,validateVerifierCompatibility} from '../scripts/stage20c32-verifier-baseline';

it('accepts a descendant HEAD without replacing the immutable baseline with the latest commit',()=>{
 const git=vi.fn();assertC32BaselineAncestor(c32Baseline,git);
 expect(git).toHaveBeenCalledExactlyOnceWith(['merge-base','--is-ancestor',c32Baseline,'HEAD']);
});
it('rejects a changed baseline before invoking git',()=>{
 const git=vi.fn();expect(()=>assertC32BaselineAncestor('93bb4e86ab6e0b681c5eeec023b6afcfbc97c513',git)).toThrow('Unexpected preservation baseline');expect(git).not.toHaveBeenCalled();
});
it('rejects unrelated history or failed ancestry checks',()=>{
 expect(()=>assertC32BaselineAncestor(c32Baseline,()=>{throw new Error('not an ancestor');})).toThrow('not an ancestor');
});
const paths=['scripts/verify-stage20c32.ts','scripts/verify-stage20c32-hardening2.ts'];
const original=new Map(paths.map(p=>[p,'a'.repeat(64)])),current=new Map(paths.map(p=>[p,'b'.repeat(64)]));
const proof=()=>({version:1,candidateCommit:'93bb4e86ab6e0b681c5eeec023b6afcfbc97c513',files:paths.map(path=>({path,before:'a'.repeat(64),after:'b'.repeat(64)}))});
it('permits only the exact reviewed verifier before/after hash pairs',()=>expect(validateVerifierCompatibility(proof(),original,current)).toHaveLength(2));
it('rejects changed verifier bytes, false historical hashes and unknown exemptions',()=>{
 const tampered=new Map(current);tampered.set(paths[0],'c'.repeat(64));expect(()=>validateVerifierCompatibility(proof(),original,tampered)).toThrow('Unreviewed verifier change');
 const historical=proof();historical.files[0].before='c'.repeat(64);expect(()=>validateVerifierCompatibility(historical,original,current)).toThrow();
 const other=proof();other.files[0].path='server/continuousTranscription.ts';expect(()=>validateVerifierCompatibility(other,original,current)).toThrow();
});
it('rejects missing, duplicate and different-candidate compatibility proofs',()=>{
 const missing=proof();missing.files.pop();expect(()=>validateVerifierCompatibility(missing,original,current)).toThrow();
 const duplicate=proof();duplicate.files[1]=duplicate.files[0];expect(()=>validateVerifierCompatibility(duplicate,original,current)).toThrow();
 expect(()=>validateVerifierCompatibility({...proof(),candidateCommit:c32Baseline},original,current)).toThrow();
});
