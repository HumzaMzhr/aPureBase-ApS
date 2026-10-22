import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { ConsentSession } from '../src/consent/session';
import { OperationalClassifier } from '../src/consent/approved/selector';
import { dynamicDefinition, nextAction } from '../src/consent/dynamic/controller';
import { renderSlot, type DynamicAsset, type SpeechSlot } from '../src/consent/dynamic/render';
import { verifiedAssets } from '../src/consent/approved/assetPack';
import type { LocalPlaybackPort, LocalPlaybackEvent } from '../src/consent/approved/localPlayback';
import type { ResponseClip } from '../src/consent/types';
export function fixture(strictRecommendations=false){
  let now=100,n=0,pending:Parameters<LocalPlaybackPort['play']>[2]|undefined,playing:LocalPlaybackEvent|undefined;
  let failure=false,hold=false;
  const cache=existsSync('benchmarks/stage20c2-dynamic-cache')?readdirSync('benchmarks/stage20c2-dynamic-cache').filter(p=>p.endsWith('.json')).map(p=>JSON.parse(readFileSync('benchmarks/stage20c2-dynamic-cache/'+p,'utf8'))as DynamicAsset):[];
  const registered=new Map<string,DynamicAsset>();
  const port={
    async prepare(slot:SpeechSlot,signal:AbortSignal){if(failure)throw new Error('Synthetic provider failure');signal.throwIfAborted();const b=await renderSlot(slot);const actual=cache.find(a=>a.binding.cacheKey===b.cacheKey);return actual?{...actual,binding:b}:{...structuredClone(verifiedAssets[0]),phraseId:slot.phraseId,text:b.renderedText,textHash:b.textHash,binding:b};},
    register(a:DynamicAsset){registered.set(a.textHash,a);},
    async play(r:ResponseClip,p:Parameters<LocalPlaybackPort['play']>[1],emit:Parameters<LocalPlaybackPort['play']>[2]){
      const asset=registered.get(r.audio?.textHash??'')??verifiedAssets.find(a=>a.phraseId===r.id)!;
      const base={playbackId:p.playbackId,callId:p.callId,phraseId:r.id,phraseVersion:r.version,textHash:r.audio!.textHash!,assetHash:asset.assetHash,recipientRevision:p.recipientRevision};
      emit({...base,action:'start'});pending=emit;playing={...base,action:'interrupt'};
      if(hold)return;
      now+=asset.duration*1000;emit({...base,action:'complete',outputProof:`web-audio-source-ended:${p.playbackId}:SYNTHETIC-CORPUS-NOT-ACTUAL-OUTPUT`,gain:{gainApplied:3.5573605757216837,clippingEvents:0,peakProtectionEvents:0,postGainPeak:.2}});pending=undefined;
    },
    cancel(){if(pending&&playing){pending(playing);pending=undefined;}}
  };
  const session=new ConsentSession('corpus-'+crypto.randomUUID(),{now:()=>now,wallClock:()=>new Date(1800000000000+now).toISOString(),classifier:new OperationalClassifier(),localPlayback:port,dynamicSpeech:port,operatorId:'synthetic-corpus-operator'},dynamicDefinition);
  function receive(text:string,owner?:string,onset?:number){now+=400;const id='turn-'+(++n);const p=owner??session.confirmationPlaybackId()??(session.snapshot().answerWindow?.status==='OPEN'?session.snapshot().answerWindow!.playbackId:undefined);session.receive({id,text,final:true,source:'manual-rehearsal',observedAt:now,speechStartedAt:onset??now,answerPlaybackId:p});now+=600;return id;}
  function name(value='Anna Jensen'){session.bindName({original:value,source:'contact-data',evidenceId:'synthetic-contact-fixture',evidenceText:'SYNTHETIC contact: '+value,reviewedBy:'synthetic-operator',reviewedAt:new Date().toISOString(),pronunciationConfirmed:true,recipientRevision:session.snapshot().recipientRevision});}
  const play=(id:string)=>{if(strictRecommendations){const action=nextAction(session);if(action.kind!=='PLAY'||action.phraseId!==id)throw new Error('Recommended action mismatch: '+id+' vs '+JSON.stringify(action));}return session.approvePlayback(id);};
  async function consent(question='consent-question',yes='Ja.'){await play('purpose');await play(question);const id=receive(yes);session.reviewConsent(id,'YES','Synthetic separate evidence review');await play('email-request');}
  async function email(value='anna@clinic.dk',correct=false){receive(value);await session.readbackEmail();if(correct){receive('Adressen er forkert.');receive('anna3.test-7@clinic.dk');await session.readbackEmail();}receive('Ja, adressen er korrekt.');session.confirmEmail(session.snapshot().email!.normalizedCandidate,true);await play('success-close');}
  return {session,port,receive,name,play,consent,email,clock:()=>now,fail:()=>{failure=true;},hold:()=>{hold=true;}};
}
export interface ScenarioResult {id:string;category:string;eligibleOrdinary:boolean;expected:string;actual:string;passed:boolean;takeover:boolean;modeledSeconds:number;dynamicSlots:number;dynamicDurationsAvailable:boolean;reason?:string}
export async function runCorpus(){
 const results:ScenarioResult[]=[];
 async function run(id:string,category:string,eligibleOrdinary:boolean,expected:string,fn:(f:ReturnType<typeof fixture>)=>Promise<void>){const f=fixture(true);let error:string|undefined;try{await f.play('opening');await fn(f);}catch(e){error=e instanceof Error?e.message:String(e);}const review=f.session.exportReview();results.push({id,category,eligibleOrdinary,expected,actual:review.state,passed:!error&&review.state===expected,takeover:review.state==='HUMAN_TAKEOVER',modeledSeconds:(f.clock()-100)/1000,dynamicSlots:Object.keys(review.dynamicBindings).length,dynamicDurationsAvailable:existsSync('benchmarks/stage20c2-dynamic-cache'),reason:error??review.fallbackReason});}
 const yes=['Ja.','Ja tak.','Ja, det må I gerne.','Ja, jeg giver tilladelse.'];
 const emails=['anna@clinic.dk','anna2.test-7@clinic.dk','a_b+2@x.dk'];
 for(let i=0;i<12;i++)await run('direct-'+i,'direct-HCP',true,'END_SUCCESS',async f=>{f.session.setRecipient('TARGET_HCP','Synthetic verified target',true);await f.consent('consent-question',yes[i%4]);await f.email(emails[i%3]);});
 for(let i=0;i<8;i++)await run('clarify-'+i,'clarification',true,'END_SUCCESS',async f=>{f.session.setRecipient('TARGET_HCP','Synthetic target',true);await f.play('purpose');await f.play('consent-question');f.receive(i%2?'Måske.':'Send mig informationen først.');await f.play(i%2?'clarify':'send-first');if(!(f.session.snapshot().answerWindow?.status==='OPEN'))await f.play('consent-question');const id=f.receive(yes[i%4]);f.session.reviewConsent(id,'YES','Synthetic review');await f.play('email-request');await f.email(emails[i%3]);});
 for(let i=0;i<6;i++)await run('correct-'+i,'email-correction',true,'END_SUCCESS',async f=>{f.session.setRecipient('TARGET_HCP','Synthetic target',true);await f.consent('consent-question',yes[i%4]);await f.email('anna2.test-7@clinic.dk',true);});
 for(let i=0;i<6;i++)await run('reception-'+i,'receptionist-transfer',true,'END_SUCCESS',async f=>{f.receive(i%2?'Det er receptionen.':'Jeg er receptionist.');f.name(i%2?'Jens Hansen':'Anna Jensen');await f.play('receptionist-target-request');f.receive('Det er mig.');f.session.setRecipient('TARGET_HCP','Synthetic transferred target separately verified',true);await f.consent('consent-question',yes[i%4]);await f.email(emails[i%3]);});
 for(let i=0;i<4;i++)await run('wrong-'+i,'wrong-then-correct-person',true,'END_SUCCESS',async f=>{f.receive(i%2?'Forkert nummer.':'Det er den forkerte person.');f.name(i%2?'Jens Hansen':'Anna Jensen');await f.play('wrong-person-close');f.receive('Det er mig.');f.session.setRecipient('TARGET_HCP','Separate new target verification',true);await f.consent();await f.email(emails[i%3]);});
 for(let i=0;i<6;i++)await run('authority-'+i,'authorized-intermediary',true,'END_SUCCESS',async f=>{f.session.setRecipient('INTERMEDIARY','Synthetic receptionist');f.name(i%2?'Jens Hansen':'Anna Jensen');f.receive('Jeg kan hjælpe med det.');await f.play('authority-ask');const claim=f.receive(i%2?'Jeg har bemyndigelse til at oplyse lægens e-mailadresse.':'Jeg har fuldmagt til at oplyse lægens e-mailadresse.');f.session.confirmAuthority(claim,'Separate reviewed exact claim','synthetic-operator');f.name(i%2?'Jens Hansen':'Anna Jensen');await f.consent('intermediary-consent-question',yes[i%4]);await f.email(emails[i%3]);});
 for(let i=0;i<4;i++)await run('refusal-'+i,'refusal',false,'END_REFUSED',async f=>{f.session.setRecipient('TARGET_HCP','Synthetic target',true);await f.play('purpose');await f.play('consent-question');const id=f.receive(i%2?'Nej tak.':'Jeg ønsker ikke information.');f.session.reviewConsent(id,'NO','Explicit refusal');await f.play('refusal-close');});
 for(let i=0;i<4;i++)await run('busy-'+i,'busy-callback',false,'END_OTHER',async f=>{f.receive(i%2?'Jeg har travlt.':'Jeg har ikke tid.');await f.play('callback');f.receive(i%2?'Ring senere.':'Ring i morgen.');await f.play('callback-close');});
 for(const [i,text]of ['Hvordan behandler I mine persondata?','Kan du give medicinsk rådgivning?','Jeg vil tale med et menneske.','Hvad koster det?'].entries())await run('safety-'+i,'safety-trigger',false,'HUMAN_TAKEOVER',async f=>{f.receive(text);const next=nextAction(f.session);if(next.kind!=='TAKEOVER')throw new Error('Expected takeover recommendation');f.session.takeover(next.label);});
 await run('unsupported-email','unsupported-value',false,'HUMAN_TAKEOVER',async f=>{f.session.setRecipient('TARGET_HCP','Synthetic',true);await f.consent();f.receive('a%z@clinic.dk');try{await f.session.readbackEmail();}catch{/* Expected fail closed. */}});
 await run('unsupported-name','unsupported-value',false,'HUMAN_TAKEOVER',async f=>{f.session.setRecipient('INTERMEDIARY','Synthetic',false);try{f.name('李醫師');}catch{/* Expected fail closed. */}});
 await run('provider-failure','provider-failure',false,'HUMAN_TAKEOVER',async f=>{f.session.setRecipient('TARGET_HCP','Synthetic',true);await f.consent();f.receive('anna@clinic.dk');f.fail();try{await f.session.readbackEmail();}catch{/* Expected failure. */}if(!f.session.snapshot().email||!f.session.snapshot().decision)throw new Error('Evidence lost');});

 await run('authority-denied','authority-integrity',false,'HUMAN_TAKEOVER',async f=>{f.session.setRecipient('INTERMEDIARY','Synthetic receptionist');f.name();f.receive('Jeg kan hjælpe med det.');await f.play('authority-ask');f.receive('Jeg har ikke fuldmagt.');const action=nextAction(f.session);if(action.kind!=='TAKEOVER')throw new Error('Authority denial must stop');f.session.takeover(action.label);});
 await run('dynamic-interruption','playback-integrity',false,'CONSENT_UNCLEAR',async f=>{f.session.setRecipient('INTERMEDIARY','Synthetic');const claim=f.receive('Jeg har fuldmagt til at oplyse lægens e-mailadresse.');f.session.confirmAuthority(claim,'Reviewed','synthetic');f.name();await f.play('purpose');f.hold();await f.play('intermediary-consent-question');f.receive('Ja.');if(f.session.snapshot().turns.at(-1)?.consent.eligibleYes)throw new Error('Interrupted YES escaped guard');});
 await run('stale-yes','playback-integrity',false,'CONSENT_UNCLEAR',async f=>{f.session.setRecipient('TARGET_HCP','Synthetic',true);await f.play('purpose');await f.play('consent-question');const old=f.session.snapshot().answerWindow!.playbackId;await f.play('consent-question');f.receive('Ja.',old);if(f.session.snapshot().turns.at(-1)?.consent.eligibleYes)throw new Error('Stale YES escaped guard');});
 return {evidence:'DETERMINISTIC SYNTHETIC CORPUS; NOT ACTUAL AUDIO OR PHYSICAL ACCEPTANCE',results};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const result=await runCorpus();writeFileSync('docs/stage-2.0c-2-corpus.json',JSON.stringify(result,null,2));process.stdout.write(JSON.stringify({total:result.results.length,failed:result.results.filter(r=>!r.passed),eligible:result.results.filter(r=>r.eligibleOrdinary).length})+'\n');}
