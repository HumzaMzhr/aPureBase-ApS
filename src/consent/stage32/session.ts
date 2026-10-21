import {ConsentSession,type SessionPorts} from '../session';
import {retestDefinition,retestPlaybackCatalog,validateRetestDefinition} from '../corrections/retest';
import {correctionSlot,renderEmail} from '../corrections/render';
import {verifyCorrectionDynamic} from '../corrections/assets';
import {EmailAcquisition,emailTurn} from './email/flow';
import type {ContactEmailResolver,ContactScope,EmailReconciliationPort} from './email/types';
import type {Transcript} from '../types';

/** Opt-in C-3.2 candidate. Existing C-3.1 routes and controller remain byte-identical.
 * Pass the existing RetestPlayback port (and human listening registry) from the host.
 * No provider, credential, CRM, recording or downstream-save implementation lives here.
 */
export class StructuredEmailSession extends ConsentSession {
 readonly structuredEmail:EmailAcquisition;
 private scope?:ContactScope;
 private pending:Promise<unknown>=Promise.resolve();
 constructor(callId:string,ports:SessionPorts,resolver:ContactEmailResolver,options:{model?:EmailReconciliationPort}={}){
  if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>k!=='model')||options.model!==undefined&&(!options.model||typeof options.model.suggest!=='function'))throw new Error('Only optional bounded model port is accepted; email policy cannot be overridden');
  if(!ports.localPlayback)throw new Error('Verified local output port required');
  super(callId,{...ports,assetPolicy:{definitionId:retestDefinition.id,validateDefinition:validateRetestDefinition,assets:retestPlaybackCatalog(),render:correctionSlot,verifyDynamic:verifyCorrectionDynamic}},retestDefinition);
  this.structuredEmail=new EmailAcquisition(this,resolver,ports.localPlayback,options.model,ports.now,turn=>super.receive(turn));
 }
 bindContactScope(scope:ContactScope){const s=this.snapshot();if(scope.callId!==s.callId||scope.recipientRevision!==s.recipientRevision)throw new Error('Current independently mapped identity required');this.scope=structuredClone(scope);}
 override async approvePlayback(...args:Parameters<ConsentSession['approvePlayback']>){if(args[0]==='email-request'){this.structuredEmail.assertCanRequest();if(!this.scope)throw new Error('Independent contact mapping required before email request');}await super.approvePlayback(...args);if(args[0]==='email-request'){
  if(!this.scope){this.structuredEmail.audit.append('email.mapping_missing',{action:'OPERATOR_REVIEW'});return;}
  this.structuredEmail.open(this.scope);
 }}
 override receive(turn:Transcript){
  if(['EMAIL_REQUEST','EMAIL_GIVEN','EMAIL_CONFIRM'].includes(this.snapshot().state)){
   // Start immediately so first partial onset is frozen before a later endpoint final.
   this.pending=this.structuredEmail.receive(emailTurn(turn,this.snapshot().recipientRevision)).catch(error=>{this.structuredEmail.invalidate(error instanceof Error?error.message:'Email processing failed');});return;
  }
  super.receive(turn);
 }
 override confirmationPlaybackId(){return this.structuredEmail?.owner()??super.confirmationPlaybackId();}
 async settled(){await this.pending;}
 override async readbackEmail():Promise<void>{throw new Error('C-3.2 normal path is clinic-spoken email; character readback is diagnostic comparison only');}
 diagnosticCharacterReadback(value:string){return {...renderEmail(value),diagnosticOnly:true,playbackAuthorized:false};}
 override confirmEmail():void{throw new Error('Use owned structured confirmation; saving/handoff remains disabled in C-3.2');}
 override exportReview(){return {...super.exportReview(),structuredEmail:this.structuredEmail.export()};}
}
