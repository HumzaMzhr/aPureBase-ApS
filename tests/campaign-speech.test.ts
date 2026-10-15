import {it,expect} from 'vitest';
import {campaignSpeechText,exactIdentityRequired} from '../src/config/campaignSpeech';
import {precisionTrigger} from '../src/streaming/semantic';
it.each(['Humza','Hamza','hamza'])('maps spoken campaign name %s to stable voice text without precision',name=>{
 const source=`Hi, my name is ${name}, and I'm calling.`;expect(campaignSpeechText(source)).toBe("Hi, my name is Humza, and I'm calling.");expect(precisionTrigger(source)).toBe('');
});
it.each(['aPureBase','PureBase','a PureBase','a pure base','pure base'])('recognizes campaign brand %s without changing meaning or entering precision',brand=>{
 const source=`I'm calling on behalf of ${brand}.`;expect(campaignSpeechText(source)).toBe("I'm calling on behalf of aPureBase.");expect(precisionTrigger(source)).toBe('');
});
it.each(['hamza@purebase.dk','My email address is hamza at PureBase dot dk.','Hamza snabel-a PureBase punktum dk.'])('preserves exact literal/spoken email %s',source=>{expect(campaignSpeechText(source)).toBe(source);expect(precisionTrigger(source)).toBeTruthy();});
it.each(['The legal name is Hamza.','The patient’s name is Dr. Hamza Ali.','Please spell your full name.','Patientens navn er Hamza.'])('holds consequential exact identity %s with literal name spelling',source=>{expect(exactIdentityRequired(source)).toBe(true);expect(campaignSpeechText(source)).toBe(source);expect(precisionTrigger(source)).toContain('identity');});
it('does not invent or rewrite an unknown name in ordinary conversation',()=>{expect(campaignSpeechText('My name is Hannah.')).toBe('My name is Hannah.');expect(precisionTrigger('My name is Hannah.')).toBe('');});
it('keeps a committed introduction stable when a later critical field arrives without sentence punctuation',()=>{
 const intro='Hi, my name is Hamza, and I work for a PureBase,';const tail=' my email address is hamza at PureBase dot dk.';
 expect(campaignSpeechText(intro+tail)).toBe('Hi, my name is Humza, and I work for aPureBase,'+tail);
});
it.each([['Humsa','Humza'],['Pernile','Pernille'],['Isabela','Isabella'],['aPureBaze','aPureBase'],['PurBase','aPureBase']])('tolerates a minor known campaign spelling %s as %s only in ordinary speech',(spoken,known)=>{
 expect(campaignSpeechText(`My name is ${spoken}.`)).toBe(`My name is ${known}.`);expect(campaignSpeechText(`The full name is ${spoken}.`)).toBe(`The full name is ${spoken}.`);
});
it('leaves an unknown near-match literal when exact identity matters',()=>{expect(campaignSpeechText('The patient’s name is Isabelle.')).toBe('The patient’s name is Isabelle.');expect(precisionTrigger('The patient’s name is Isabelle.')).toContain('identity');});
