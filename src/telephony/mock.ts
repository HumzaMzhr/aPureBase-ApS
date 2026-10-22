import {TelephonyCall,type CallIdentity} from './callSession';
import type {AssetLoader} from './twilio/playback';
import type {RecognitionEvent} from '../streaming/continuousTranscriptionClient';
import type {ContactEmailResolver} from '../consent/stage32/email/types';
import {FixtureContactEmailResolver} from '../consent/stage32/email/databaseResolver';
import {base64,encodeMuLaw} from './media';
import type {Clock} from './types';
export class MockClock implements Clock {time=100;now(){return this.time;}wall(){return new Date(Date.UTC(2026,0,1)+this.time).toISOString();}advance(ms:number){if(ms<0)throw new Error('Clock regression');this.time+=ms;}}
const fakeSid=(prefix:string,index:number)=>prefix+index.toString(16).padStart(32,'0');
export class MockTelephone {
 readonly clock=new MockClock();readonly call:TelephonyCall;readonly identity:CallIdentity;readonly outbound:{event:string;streamSid:string;media?:{payload:string};mark?:{name:string}}[]=[];closed=false;failSend=false;
 private sequence=0;private chunk=0;private streamAt=0;private generation=0;private event?:(e:RecognitionEvent)=>void;private error?:(e:Error)=>void;private mark?:string;private bufferedSamples=0;
 constructor(load:AssetLoader,index=1,resolver:ContactEmailResolver=new FixtureContactEmailResolver([{contactId:'synthetic:clinic-a',email:'anna@clinic.example',recordVersion:'1',sourceRecordId:'synthetic:record-a'},{contactId:'synthetic:clinic-a',email:'anne@clinic.example',recordVersion:'1',sourceRecordId:'synthetic:record-b'}])){
  this.identity={callId:'d1-mock-'+index,providerCallReference:fakeSid('CA',index),accountSid:fakeSid('AC',index),streamId:fakeSid('MZ',index),streamNonce:'local-mock-stream-'+index};
  this.call=new TelephonyCall(this.identity,this.clock,{send:raw=>{if(this.failSend)throw new Error('Injected send failure');const m=raw as typeof this.outbound[number];this.outbound.push(structuredClone(m));if(m.event==='media')this.bufferedSamples+=atob(m.media!.payload).length;if(m.event==='mark')this.mark=m.mark!.name;if(m.event==='clear'){this.bufferedSamples=0;/* Echoing cleared marks is separately exercised by tests. */}},close:()=>{this.closed=true;}},load,(event,error)=>{this.event=event;this.error=error;return {open:async language=>{if(language!=='da')throw new Error('Danish only');},append:()=>{},commit:g=>{this.generation=g+1;},close:()=>{}};},resolver);
 }
 async connect(){this.call.create();this.call.status(this.identity.providerCallReference,0,'ringing');this.clock.advance(300);this.call.status(this.identity.providerCallReference,1,'in-progress');await this.call.accept(JSON.stringify({event:'connected',protocol:'Call',version:'1.0.0'}));this.streamAt=this.clock.now();await this.send({event:'start',start:{callSid:this.identity.providerCallReference,accountSid:this.identity.accountSid,streamSid:this.identity.streamId,tracks:['inbound'],customParameters:{sessionId:this.identity.callId,streamNonce:this.identity.streamNonce},mediaFormat:{encoding:'audio/x-mulaw',sampleRate:8000,channels:1}}});}
 send(event:Record<string,unknown>){return this.call.accept(JSON.stringify({...event,sequenceNumber:String(++this.sequence),streamSid:this.identity.streamId}));}
 /** Explicit simulated provider drain; sending bytes itself NEVER emits a completion. */
 async drain(){if(!this.mark)throw new Error('No submitted mark');const mark=this.mark;this.mark=undefined;this.clock.advance(this.bufferedSamples/8);this.bufferedSamples=0;await this.send({event:'mark',mark:{name:mark}});}
 async play(id:string){const pending=this.call.controller.approvePlayback(id);await this.waitMark(pending);await this.drain();await pending;}
 async waitMark(pending:Promise<unknown>){let failure:unknown;void pending.catch(e=>{failure=e;});for(let i=0;i<1000&&!this.call.player.activeMark&&!failure;i++)await new Promise<void>(resolve=>setTimeout(resolve,0));if(failure)throw failure;if(!this.call.player.activeMark)throw new Error('Mock output did not queue mark');}
 async media(voiced:boolean,ms=20){const samples=Math.floor(ms*8),payload=base64(Uint8Array.from({length:samples},(_,n)=>encodeMuLaw(voiced?.1*Math.sin(n*.2):0)));const timestamp=Math.round(this.clock.now()-this.streamAt);this.clock.advance(ms);const r=await this.send({event:'media',media:{track:'inbound',chunk:String(++this.chunk),timestamp:String(timestamp),payload}});return r;}
 partial(text:string,g=this.generation){this.event?.({type:'partial',generation:g,itemId:'item-'+g,text});}
 final(text:string,g=this.generation){this.event?.({type:'final',generation:g,itemId:'item-'+g,text});}
 async say(text:string){this.clock.advance(1);const g=this.generation;await this.media(true);this.partial(text);this.clock.advance(20);this.final(text,g);await this.call.controller.settled();for(let i=0;i<40;i++)await this.media(false);}
 asrFailure(){this.error?.(new Error('Injected ASR failure'));}
 async readyForConsent(){await this.play('opening');this.call.controller.setRecipient('TARGET_HCP','Independent synthetic identity',true);await this.play('purpose');await this.play('consent-question');}
 async reviewedYes(){await this.say('Ja');const s=this.call.controller;s.reviewConsent(s.snapshot().turns.at(-1)!.id,'YES','Owned synthetic final after actual mock provider mark');s.bindContactScope({callId:this.identity.callId,recipientRevision:s.snapshot().recipientRevision,contactId:'synthetic:clinic-a',mappingEvidenceId:'synthetic:identity-attestation',source:'SYNTHETIC_FIXTURE'});await this.play('email-request');}
 async confirm(){const pending=this.call.controller.structuredEmail.confirmPrompt();await this.waitMark(pending);await this.drain();await pending;await this.say('Ja');}
 async closeSuccess(){const p=this.call.controller.structuredEmail.completeLocalCall({reviewer:'synthetic:operator',reason:'Owned synthetic recipient confirmation'});await this.waitMark(p);await this.drain();await p;this.call.end();}
}
