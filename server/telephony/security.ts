import {validateRequest} from 'twilio';
export interface VerifiedRequest {callId:string;providerCallReference:string;params:Readonly<Record<string,string>>}
/** Exact configured external URL, never a caller-controlled Host/forwarded header. No bypass. */
export function verifyVoiceWebhook(input:{method:string;url:string;expectedURL:string;contentType:string;body:string;signature?:string;authToken:string;callId:string;expectedCallReference:string;active:boolean}):VerifiedRequest{
 if(!input.active||input.method!=='POST'||input.url!==input.expectedURL||input.contentType.split(';')[0].trim().toLowerCase()!=='application/x-www-form-urlencoded'||!input.signature||!input.authToken||input.body.length>65536)throw new Error('WEBHOOK_REJECTED');
 if(/%(?![a-fA-F0-9]{2})/u.test(input.body))throw new Error('MALFORMED_FORM');const params:Record<string,string>=Object.create(null);const form=new URLSearchParams(input.body);if([...form].length>100)throw new Error('EXCESSIVE_FORM');for(const [key,value] of form){if(!key||key in params||key.length>100||value.length>8000)throw new Error('AMBIGUOUS_FORM');params[key]=value;}
 if(params.CallSid!==input.expectedCallReference||!validateRequest(input.authToken,input.signature,input.expectedURL,params))throw new Error('WEBHOOK_REJECTED');return {callId:input.callId,providerCallReference:params.CallSid,params:Object.freeze(params)};
}
export function verifyMediaHandshake(input:{method:string;url:string;expectedURL:string;signature?:string;authToken:string;active:boolean}){if(!input.active||input.method!=='GET'||!input.signature||!input.authToken||input.url!==input.expectedURL||!validateRequest(input.authToken,input.signature,input.expectedURL,{}))throw new Error('MEDIA_HANDSHAKE_REJECTED');return true;}
