import { expect, it } from 'vitest';
import { extractEmail, protectTokens } from '../src/email';
import { EndOfTurn, isChrome } from '../src/browserAudio';
import { campaignGlossary } from '../src/config/campaignGlossary';
import { latencyParts } from '../src/controller';
it('retains literal email punctuation, hyphens, digits and suffix', () => {
  expect(extractEmail('Min e-mail er anna-2.jensen@example.dk.')?.value).toBe('anna-2.jensen@example.dk');
  expect(extractEmail('Mail person4@example.com')?.value).toBe('person4@example.com');
});
it('suggests spoken punctuation only with manual verification', () => {
  const email=extractEmail('anna punktum jensen snabel-a example punktum dk');
  expect(email?.value).toBe('anna.jensen@example.dk'); expect(email?.needsManual).toBe(true); expect(email?.confirmed).toBe(false);
  expect(extractEmail('e-mailadresse er uklar')?.needsManual).toBe(true);
});
it('has no consent or authorization inference for uncertainty or refusal', () => {
  expect(extractEmail('Jeg skal lige spørge lægen først.')).toBeUndefined(); expect(extractEmail('Nej tak.')).toBeUndefined();
});
it('maintains campaign glossary and protected literal brands', () => {
  expect(campaignGlossary).toContainEqual(['aPureBase','aPureBase']);
  const protectedText=protectTokens('Humza fra aPureBase'); expect(protectedText.restore(protectedText.text)).toBe('Humza fra aPureBase');
  expect(() => protectedText.restore('some omitted company')).toThrow();
});
it('waits for configured silence, retaining brief pauses within a sentence', () => {
  const vad=new EndOfTurn(650,false);
  vad.sample(0,.04); vad.sample(100,.04); expect(vad.started).toBe(true);
  expect(vad.sample(500,0)).toBe(false); vad.sample(600,.04);
  expect(vad.sample(1200,0)).toBe(false); expect(vad.sample(1250,0)).toBe(true);
});
it('manual mode never finalizes on silence and rejects incidental noise', () => {
  const manual=new EndOfTurn(650,true); manual.sample(0,.04); manual.sample(100,.04); expect(manual.sample(5000,0)).toBe(false);
  const noise=new EndOfTurn(650,false); noise.sample(0,.04); expect(noise.sample(50,0)).toBe(false); expect(noise.started).toBe(false);
});
it('detects Safari and prioritizes Chrome', () => {
  expect(isChrome('Version/18.0 Safari/605.1')).toBe(false); expect(isChrome('Chrome/140.0 Safari/537.36')).toBe(true);
});
it('measures distinct monotonic completed-turn boundaries in milliseconds', () => {
  expect(latencyParts({t0:10,t1:800,t2:1300,t3:2800,t4:2900})).toEqual({finalization:790,translation:500,voice:1500,playback:100,total:2890});
  expect(latencyParts({t0:10,t1:800,t2:1300,t3:2800})).toBeUndefined();
});
it('does not turn a request for an email into a claimed email candidate', () => {
  expect(extractEmail("Can you provide the doctor's professional email address?")).toBeUndefined();
  expect(extractEmail('Kan du oplyse lægens e-mailadresse?')).toBeUndefined();
});
it('handles protected names inside literal email addresses without inventing extra markers', () => {
  const source='Humza@example.dk and Pernille@aPureBase.dk'; const p=protectTokens(source);
  expect(p.restore(p.text)).toBe(source);
});
it('rejects missing repetitions or duplicated protected email tokens', () => {
  const p=protectTokens('aPureBase aPureBase');
  expect(()=>p.restore('__KEEP_0__')).toThrow(); expect(()=>p.restore('__KEEP_0__ __KEEP_0__ __KEEP_0__')).toThrow();
});
it('flags a likely email with a missing at-sign for manual review without guessing', () => {
  const email=extractEmail('Min professionelle e-mailadresse, anna.jensen.example.dk.');
  expect(email?.needsManual).toBe(true);expect(email?.value).toBeUndefined();
});
it('stops a spoken email at its suffix without swallowing the next sentence', () => {
  const email=extractEmail('Min e-mailadresse er anne.jensen snabel-a example punktum dk. Jeg kan afmelde mig.');
  expect(email?.value).toBe('anne.jensen@example.dk');expect(email?.needsManual).toBe(true);
});
