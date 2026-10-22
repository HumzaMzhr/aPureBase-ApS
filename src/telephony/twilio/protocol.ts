import {fromBase64} from '../media';
const sid=(v:unknown,prefix:string):v is string=>typeof v==='string'&&new RegExp('^'+prefix+'[a-fA-F0-9]{32}$','u').test(v);
const uint=(v:unknown)=>typeof v==='string'&&/^(0|[1-9][0-9]{0,9})$/u.test(v)&&Number.isSafeInteger(Number(v));
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export type Message={event:'connected';protocol:'Call';version:'1.0.0'}|{event:'start';sequence:number;streamId:string;callSid:string;accountSid:string;parameters:Record<string,unknown>}|{event:'media';sequence:number;streamId:string;chunk:number;timestamp:number;bytes:Uint8Array}|{event:'mark';sequence:number;streamId:string;name:string}|{event:'stop';sequence:number;streamId:string;callSid:string}|{event:'dtmf';sequence:number;streamId:string;digit:string};
export function parseMessage(raw:string):Message {
 if(raw.length>16000)throw new Error('Oversized media message');const m:unknown=JSON.parse(raw);if(!object(m))throw new Error('Object required');
 if(m.event==='connected'){if(m.protocol!=='Call'||m.version!=='1.0.0')throw new Error('Unsupported stream protocol');return {event:'connected',protocol:'Call',version:'1.0.0'};}
 if(!uint(m.sequenceNumber)||Number(m.sequenceNumber)<1||!sid(m.streamSid,'MZ'))throw new Error('Invalid sequence/stream');const sequence=Number(m.sequenceNumber),streamId=m.streamSid;
 if(m.event==='start'){const s=m.start;if(!object(s)||s.streamSid!==streamId||!sid(s.callSid,'CA')||!sid(s.accountSid,'AC')||!Array.isArray(s.tracks)||s.tracks.length!==1||s.tracks[0]!=='inbound'||!object(s.customParameters)||!object(s.mediaFormat)||s.mediaFormat.encoding!=='audio/x-mulaw'||s.mediaFormat.sampleRate!==8000||s.mediaFormat.channels!==1)throw new Error('Invalid stream start/format');return {event:'start',sequence,streamId,callSid:s.callSid,accountSid:s.accountSid,parameters:s.customParameters};}
 if(m.event==='media'){if(!object(m.media)||m.media.track!=='inbound'||!uint(m.media.chunk)||Number(m.media.chunk)<1||!uint(m.media.timestamp)||typeof m.media.payload!=='string')throw new Error('Invalid media');return {event:'media',sequence,streamId,chunk:Number(m.media.chunk),timestamp:Number(m.media.timestamp),bytes:fromBase64(m.media.payload)};}
 if(m.event==='mark'){if(!object(m.mark)||typeof m.mark.name!=='string'||!m.mark.name||m.mark.name.length>200)throw new Error('Invalid mark');return {event:'mark',sequence,streamId,name:m.mark.name};}
 if(m.event==='stop'){if(!object(m.stop)||!sid(m.stop.callSid,'CA'))throw new Error('Invalid stop');return {event:'stop',sequence,streamId,callSid:m.stop.callSid};}
 if(m.event==='dtmf'){if(!object(m.dtmf)||m.dtmf.track!=='inbound_track'||typeof m.dtmf.digit!=='string'||!/^\d$|^[*#]$/u.test(m.dtmf.digit))throw new Error('Invalid DTMF');return {event:'dtmf',sequence,streamId,digit:m.dtmf.digit};}
 throw new Error('Unknown media event');
}
