import type {Alignment} from '../../server/continuousVoice';
import type {SemanticUnit} from './types';
export interface AudioMark {id:string;start:number;end:number;complete:boolean}
/** Per-turn original-text alignment ledger, separate from PCM network frame boundaries. */
export class AlignmentLedger {
 private units:SemanticUnit[]=[];private charAt=0;private sampleAt=0;private initial=true;private alignmentOffset=0;private lastAlignmentMs=0;sentText='';alignedText='';
 register(unit:SemanticUnit){unit.targetStart=this.sentText.length;unit.targetEnd=this.sentText.length+unit.target!.length;this.sentText+=unit.target+' ';this.units.push(unit);}
 consume(bytes:Uint8Array,alignment?:Alignment){const before=this.sampleAt;this.sampleAt+=bytes.length/2;const marks:AudioMark[]=[];
  if(alignment){if(alignment.charStartTimesMs[0]<this.lastAlignmentMs-20)this.alignmentOffset=before;for(let i=0;i<alignment.chars.length;i++){const char=alignment.chars[i];this.alignedText+=char;if(this.initial&&/^\s*$/.test(char))continue;this.initial=false;if(/^\s+$/.test(char)&&!/^\s$/.test(this.sentText[this.charAt]??''))continue;const start=this.alignmentOffset+Math.round(alignment.charStartTimesMs[i]*24),end=start+Math.round(alignment.charDurationsMs[i]*24);for(const unit of this.units)if(this.charAt<unit.targetEnd!&&this.charAt+char.length>unit.targetStart!)marks.push({id:unit.id,start,end,complete:this.charAt+char.length>=unit.targetEnd!});this.charAt+=char.length;this.lastAlignmentMs=alignment.charStartTimesMs[i]+alignment.charDurationsMs[i];}}
  return marks;
 }
 get coverage(){return this.alignedText.replace(/\s+/g,' ').trim()===this.sentText.replace(/\s+/g,' ').trim();}
}
