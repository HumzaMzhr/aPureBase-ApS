import type {TelephonyCall} from '../../src/telephony/callSession';
import {terminal} from '../../src/telephony/types';
import {callEndpoints} from '../../src/telephony/twilio/outbound';
import {configurationIssues,type TwilioConfig} from '../../src/telephony/twilio/config';
import {verifyMediaHandshake,verifyVoiceWebhook} from './security';
export interface EvaluationSocket {send(message:string):void;close():void;readonly bufferedAmount:number;on(event:'message',listener:(data:string)=>void):void;on(event:'close'|'error',listener:()=>void):void}
/** Host port only: never starts a listener or dials. Host selects an independently registered call.
 * No bypass; URL is configured externally, never reconstructed from forwarded headers. */
export class VerifiedTwilioBoundary {
 private calls=new Map<string,TelephonyCall>();
 constructor(private config:TwilioConfig){}
 register(call:TelephonyCall){if(this.calls.has(call.identity.callId))throw new Error('Duplicate call registration');if(this.calls.size>=100)throw new Error('Bounded local registry');this.calls.set(call.identity.callId,call);}
 private current(callId:string){if(configurationIssues(this.config).length)throw new Error('TWILIO_NOT_CONFIGURED');const call=this.calls.get(callId);if(!call||terminal(call.lifecycle.state))throw new Error('UNKNOWN_OR_TERMINAL_CALL');return call;}
 status(callId:string,request:{method:string;url:string;contentType:string;body:string;signature?:string}){const call=this.current(callId);const r=verifyVoiceWebhook({...request,expectedURL:callEndpoints(this.config,callId).callback,authToken:this.config.authToken,callId,expectedCallReference:call.identity.providerCallReference,active:true});const sequence=r.params.SequenceNumber;if(!/^(0|[1-9][0-9]{0,9})$/u.test(sequence??''))throw new Error('INVALID_CALLBACK_SEQUENCE');return call.status(r.providerCallReference,Number(sequence),r.params.CallStatus);}
 authorizeSocket(callId:string,request:{method:string;url:string;signature?:string}){const call=this.current(callId),endpoint=callEndpoints(this.config,callId).media;const url=new URL(endpoint);url.protocol='https:';verifyMediaHandshake({...request,expectedURL:url.href,authToken:this.config.authToken,active:true});return call;}
 bindAuthorizedSocket(callId:string,request:{method:string;url:string;signature?:string},socket:EvaluationSocket){const call=this.authorizeSocket(callId,request);let open=true;const deadline=setInterval(()=>{if(!terminal(call.lifecycle.state))call.player.expire();else clearInterval(deadline);},1000);deadline.unref();socket.on('message',raw=>{if(open)void call.accept(raw).catch(()=>call.fail('SOCKET_PROTOCOL_FAILURE'));});const end=()=>{if(!open)return;open=false;clearInterval(deadline);call.fail('SOCKET_DISCONNECTED');};socket.on('close',end);socket.on('error',end);return {send:(message:unknown)=>{if(!open||terminal(call.lifecycle.state)||socket.bufferedAmount>1024*1024)throw new Error('SOCKET_NOT_WRITABLE');socket.send(JSON.stringify(message));},close:()=>{open=false;clearInterval(deadline);socket.close();}};}
}
