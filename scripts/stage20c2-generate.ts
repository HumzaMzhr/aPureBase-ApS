/** Bounded local rehearsal fixtures only. Existing C-1 assets are never touched.
 * One request per uncached declared slot, no automatic retry. */
import { DynamicSpeechStore } from '../server/consentDynamic';
import type { SpeechSlot } from '../src/consent/dynamic/render';
const store=new DynamicSpeechStore();
const slots:SpeechSlot[]=[];
for(const name of ['Anna Jensen','Jens Hansen'])for(const phraseId of ['receptionist-target-request','authority-ask','intermediary-consent-question','wrong-person-close'])slots.push({kind:'NAME',phraseId,name:{original:name,source:'contact-data',evidenceId:'synthetic-contact-fixture',evidenceText:'SYNTHETIC rehearsal target: '+name,reviewedBy:'local-rehearsal-fixture',reviewedAt:'2026-10-18T00:00:00.000Z',pronunciationConfirmed:true,recipientRevision:1}});
for(const candidate of ['anna@clinic.dk','anna2.test-7@clinic.dk','anna3.test-7@clinic.dk','a_b+2@x.dk'])slots.push({kind:'EMAIL',phraseId:'email-readback-intro',candidate,sourceTurnId:'synthetic-email-fixture',recipientRevision:1,normalizationReviewed:true});
for(const slot of slots){const a=await store.prepare(slot,new AbortController().signal);console.log(JSON.stringify({kind:slot.kind,phraseId:slot.phraseId,cacheKey:a.binding.cacheKey,duration:a.duration,characters:a.text.length,clipping:a.verification.clippingEvents,peakProtection:a.verification.peakProtectionEvents}));}
