import {expect,it} from 'vitest';
import {SemanticCommitter,precisionTrigger} from '../src/streaming/semantic';
it('requires stable meaning across distinct ASR updates, not punctuation alone',()=>{const c=new SemanticCommitter('en');expect(c.update('Hello, my name is Humza,',0).segments).toEqual([]);expect(c.update("Hello, my name is Humza, and I'm calling",200).segments).toEqual([{start:0,end:5,text:'Hello, my name is Humza,'}]);expect(c.update("Hello, my name is Humza, and I'm calling on behalf of aPureBase.",400).segments).toEqual([]);expect(c.cursor).toBe(5);});
it.each(["because we'd like...","I don't...",'the doctor said...','Jeg vil ikke...','fordi vi gerne vil...'])('holds unsafe fragment %s',text=>{const c=new SemanticCommitter(text.startsWith('Jeg')||text.startsWith('fordi')?'da':'en');c.update(text,0);expect(c.update(text+' hello',400).segments).toEqual([]);});
it('keeps corrected partials unspoken and detects revision of a committed range',()=>{const c=new SemanticCommitter('en');c.update('My name is Humza,',0);expect(c.update('My name is Hannah, and I am calling.',200).segments).toEqual([]);expect(c.update('My name is Hannah, and I am calling. More words',400).segments.length).toBeGreaterThan(0);expect(c.update('My name is Humza,',600,true).revision).toBe(true);});
it.each(['anna@example.dk','kontakt snabel-a example punktum dk','My phone number is four seven two nine.','tomorrow after ten','I need to ask the doctor first.','No thank you, not interested.','I give permission.','Change the dose?'])('escalates precision for %s',text=>{expect(precisionTrigger(text)).toBeTruthy();});
it('ordinary email/medical material and representation are not falsely classified as consent',()=>{expect(precisionTrigger("I'm calling on behalf of aPureBase. We send professional information by email and medical material.")).toBe('');});
it('finalizes all held words once and never emits duplicate ranges',()=>{const c=new SemanticCommitter('da');c.update('Hej, jeg hedder Pernille.',0);const first=c.update('Hej, jeg hedder Pernille. Hvad kan jeg hjælpe med?',200).segments;const end=c.update('Hej, jeg hedder Pernille. Hvad kan jeg hjælpe med?',500,true).segments;const all=[...first,...end];expect(all[0].start).toBe(0);expect(all.at(-1)?.end).toBe(c.received);for(let i=1;i<all.length;i++)expect(all[i].start).toBe(all[i-1].end);expect(c.update(c.source,600,true).segments).toHaveLength(0);});
it('unsafe long buffering escalates instead of cutting fixed word/time fragments',()=>{const c=new SemanticCommitter('en',10);c.update('because '+Array(20).fill('information').join(' '),0);expect(c.precision).toContain('Long clause');expect(c.cursor).toBe(0);});
it('recognizes a stable independent clause at a conjunction even when ASR punctuation has not arrived',()=>{const c=new SemanticCommitter('en');c.update("Hello my name is Humza and I'm calling",0);const result=c.update("Hello my name is Humza and I'm calling on behalf of aPureBase",200);expect(result.segments[0]).toMatchObject({start:0,end:5,text:'Hello my name is Humza'});});
it('allows known campaign speech aliases without spelling-only precision',async()=>{const {uncertainProtectedTerm}=await import('../src/streaming/semantic');expect(uncertainProtectedTerm('Hello, my name is Hamza.',['Humza'])).toBe('');expect(uncertainProtectedTerm('Hello, my name is Humza.',['Humza'])).toBe('');expect(uncertainProtectedTerm('Jeg taler med Pernille.',['Pernille'])).toBe('');});

it('can opt into a stable short greeting without committing incomplete or negated fragments',()=>{
 const fast=new SemanticCommitter('en',100,120,true);
 expect(fast.update('Hello, my name',0).segments).toEqual([]);
 expect(fast.update('Hello, my name is Humza,',200).segments).toMatchObject([{start:0,end:1,text:'Hello,'}]);
 const standard=new SemanticCommitter('en');standard.update('Hello, my name',0);
 expect(standard.update('Hello, my name is Humza,',200).segments).toEqual([]);
 const negative=new SemanticCommitter('en',100,120,true);negative.update("I don't, but",0);
 expect(negative.update("I don't, but I",200).segments).toEqual([]);
});
it.each(['Could you help me,','Can you send,','I don’t...','Jeg vil ikke...'])('holds an incomplete question/negation %s until meaningful completion',text=>{
 const c=new SemanticCommitter(text.startsWith('Jeg')?'da':'en');c.update(text,0);expect(c.update(text+' more context',300).segments).toEqual([]);
});
it('accepts known split brand spellings without precision',async()=>{const {uncertainProtectedTerm}=await import('../src/streaming/semantic');expect(uncertainProtectedTerm('calling on behalf of a pure base.',['aPureBase'])).toBe('');expect(uncertainProtectedTerm('calling on behalf of aPureBase.',['aPureBase'])).toBe('');});
it('scopes precision to the affected tail while allowing a stable earlier greeting',()=>{
 const c=new SemanticCommitter('en',100,120,true,text=>precisionTrigger(text));c.update('Hello, my name is Humza, and I give permission.',0);
 const next=c.update('Hello, my name is Humza, and I give permission. More context',300);
 expect(next.segments.map(s=>s.text)).toEqual(['Hello,','my name is Humza,']);expect(next.precision).toContain('Consent');
 expect(c.partialText).toContain('permission');const tail=c.update(c.source,500,true);expect(tail.segments).toHaveLength(1);expect(tail.segments[0].text).toContain('permission');
});
it('buffers an initial greeting with the immediately continuing introduction in the primary semantic path',()=>{
 const c=new SemanticCommitter('en',100,120,true,()=>'',true);
 expect(c.update('Hi, my name is',0).segments).toHaveLength(0);
 expect(c.update('Hi, my name is Humza,',200).segments).toHaveLength(0);
 expect(c.update("Hi, my name is Humza, and I'm calling",400).segments.map(s=>s.text)).toEqual(['Hi, my name is Humza,']);
});
it('retains a standalone greeting on finalization and does not hide incomplete questions behind a greeting',()=>{
 const c=new SemanticCommitter('en',100,120,true,()=>'',true);c.update('Hi,',0);expect(c.update('Hi,',500,true).segments.map(s=>s.text)).toEqual(['Hi,']);
 const q=new SemanticCommitter('en',100,120,true,()=>'',true);q.update('Hi, can you,',0);expect(q.update('Hi, can you, help',400).segments).toHaveLength(0);
});
