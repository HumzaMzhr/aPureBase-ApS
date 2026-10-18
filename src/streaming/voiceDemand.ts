/** Generation lead observed in session abc866d2: explicit-flush -> next PCM
 * maximum 807.2 ms; add 150 ms transport/timer margin, bounded to 750–1800 ms.
 * This is a dispatch deadline, not a target playback buffer or an audio delay. */
export class VoiceDemand {
 private observations:number[]=[];
 get leadMs(){const sorted=[...this.observations].sort((a,b)=>a-b);const p95=sorted.length?sorted[Math.ceil(sorted.length*.95)-1]:807.2;return Math.max(750,Math.min(1800,p95+150));}
 observe(ms:number){if(Number.isFinite(ms)&&ms>=0){this.observations.push(ms);if(this.observations.length>20)this.observations.shift();}}
 shouldFlush(bufferMs:number,pending:number,newText:boolean){return pending>0&&newText&&bufferMs<=this.leadMs;}
}
