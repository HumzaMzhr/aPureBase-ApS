import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const proof=JSON.parse(await readFile('docs/stage-2.0c-3.2-preservation.json','utf8')) as {baseline:{head:string;remoteHead:string};records:{path:string;sha256:string}[];originalRecordings:{path:string;sha256:string}[];correctedC31Recordings:{path:string;sha256:string}[]};
if(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==proof.baseline.head||proof.baseline.head!=='34285a8d6f4f94c6e8036c375b8a3244c316c176')throw new Error('Unexpected baseline HEAD');
for(const r of [...proof.records,...proof.originalRecordings,...proof.correctedC31Recordings])if(createHash('sha256').update(await readFile(r.path)).digest('hex')!==r.sha256)throw new Error('Preservation failed: '+r.path);
if(proof.originalRecordings.length!==37||proof.correctedC31Recordings.length!==12)throw new Error('Incomplete recording proof');
const delta=execFileSync('git',['diff','--name-only','HEAD'],{encoding:'utf8'}).trim();if(delta)throw new Error('Historical tracked files changed: '+delta);
console.log(`PASS: ${proof.records.length} historical files; Stage 1.9.6 and all prior stages; original 37 + C-3.1 12 recordings byte-identical; no exceptions.`);
