import {expect,it} from 'vitest';
import {SemanticCommitter,precisionTrigger} from '../src/streaming/semantic';
import {SemanticCommitter as Before} from './fixtures/stage195-semantic';
import physical from './fixtures/stage196-physical-session.json';
it.each([true,false])('recognizes ordinary finite share/provide clauses at explicit stable punctuation (baseline=%s)',before=>{
 const C=before?Before:SemanticCommitter;
 for(const text of ['We share independent research,','Our team provides technical assistance,']){
  const c=new C('en',100,120,true,precisionTrigger,true,true,true);expect(c.update(text,0).segments).toEqual([]);
  expect(c.update(text+' and our colleagues can explain further.',300).segments.map(x=>x.text)).toEqual(before?[]:[text]);
 }
});
it('uses only the actual recorded comma clause and lookahead, never words from the reference',()=>{
 const item=physical.diagnostics.recognitionAudit.items.find(i=>i.generation===6)!,c=new SemanticCommitter('en',100,120,true,precisionTrigger,true,true,true),committed:{text:string;at:number}[]=[];
 for(const p of item.partials)for(const u of c.update(p.text,p.at).segments)committed.push({text:u.text,at:p.at});
 expect(committed).toEqual([{text:'We also share medical information,',at:36639.89999997616}]);
 const tail=c.update(item.final!,item.finalAt!,true).segments;expect([...committed,...tail].map(u=>u.text).join(' ')).toBe(item.final);
});
it('does not treat a missing predicate, negation or protected detail as a new ordinary closure',()=>{
 for(const text of ['We do not share results,','We provide 5 mg,','We share the patient diagnosis,','We share information with,']){
  const c=new SemanticCommitter('en',100,120,true,precisionTrigger,true,true,true);c.update(text,0);expect(c.update(text,300).segments).toEqual([]);
 }
});
