import type {AuditEvent} from './types';

/** Append-only private storage. No caller retains a mutable reference to stored evidence. */
export class EmailAudit {
 private rows:AuditEvent[]=[];
 constructor(private now:()=>number=()=>performance.now()){}
 append(event:string,data:unknown){this.rows.push({sequence:this.rows.length+1,event,at:this.now(),data:structuredClone(data)});}
 export(){return {sourceAudioStored:false as const,wholeCallRecordingEnabled:false as const,events:structuredClone(this.rows)};}
}
