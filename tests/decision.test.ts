import { expect,it } from 'vitest';
import { validateDecision } from '../src/decision';
import { phrases } from '../src/config/phrases';
import { selectTranslationConfig } from '../server/translation';
const phrase=phrases.find(p=>p.id==='information')!;
const decision={intent:'information_question',confidence:.98,english_interpretation:'What information?',recommended_response_en:phrase.en,response_da:phrase.da,action:'USE_CACHED_PHRASE',requires_human_approval:false,cached_phrase_id:phrase.id};
it('allows only exact cached text while retaining an explicit human approval requirement',()=>{
  expect(validateDecision(decision,'Hvilken information?')).toMatchObject({cached_phrase_id:'information',requires_human_approval:true});
  expect(validateDecision({...decision,response_da:phrase.da+' Invented extra.'},'Hvilken information?').cached_phrase_id).toBe('');
});
it.each(['Jeg skal spørge lægen først.','Jeg kan give tilladelse på vegne af lægen.','Kan du garantere behandlingen?'])('prevents uncertain or high-risk utterances becoming an automatic cached answer: %s',original=>{
  expect(validateDecision(decision,original)).toMatchObject({action:'HUMAN_REVIEW',cached_phrase_id:'',response_da:'',requires_human_approval:true});
});
it('does not turn refusal, email or callback actions into unapproved generated speech',()=>{
  for(const action of ['REFUSAL','EMAIL_CAPTURE','CALLBACK'])expect(validateDecision({...decision,action,cached_phrase_id:'',response_da:'Invented consent.'},'Nej tak.')).toMatchObject({response_da:'',requires_human_approval:true});
});
it('rejects malformed confidence/actions rather than trusting model JSON',()=>{
  expect(()=>validateDecision({...decision,confidence:2},'test')).toThrow();expect(()=>validateDecision({...decision,action:'WRITE_CONSENT'},'test')).toThrow();
});
it('routes spelling, times, permission and medical content to the stronger measured model',()=>{
  for(const text of ['My email is anna hyphen two at example dot dk.','Please call tomorrow after ten.','I need to ask the doctor first.','Change the dose of this medicine?'])expect(selectTranslationConfig(text).model).toBe('gpt-5.5');
});
