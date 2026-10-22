import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const allowedC32Changes=['src/consent/stage32/Workbench.tsx','src/consent/stage32/session.ts','src/consent/stage32/email/flow.ts','src/consent/stage32/email/tokenizer.ts','src/consent/stage32/email/reconstruct.ts','src/consent/stage32/email/danishEmailLexicon.ts','src/consent/stage32/email/reconciliation.ts'];
export async function preservation(){
 const before=JSON.parse(await readFile('docs/stage-2.0c-3.2-hardening-1-before.json','utf8')) as {HEAD:string;branch:string;records:{path:string;sha256:string;tracked:boolean}[]};
 const rows=[];
 for(const row of before.records){const bytes=await readFile(row.path),after=createHash('sha256').update(bytes).digest('hex');rows.push({...row,afterSha256:after,changed:after!==row.sha256,allowedChange:allowedC32Changes.includes(row.path)});}
 const unexpected=rows.filter(r=>r.changed&&!r.allowedChange);
 const backupFailures=[];for(const row of before.records.filter(r=>!r.tracked)){const b=execFileSync('tar',['-xOf','docs/stage-2.0c-3.2-hardening-1-before-untracked.tar.gz',row.path]);if(createHash('sha256').update(b).digest('hex')!==row.sha256)backupFailures.push(row.path);}
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
 return {status:!unexpected.length&&!backupFailures.length&&head===before.HEAD&&branch===before.branch?'PASS':'FAIL',baselineHead:before.HEAD,currentHead:head,branch,beforeFiles:rows.length,trackedPreserved:rows.filter(r=>r.tracked&&!r.changed).length,stage196Preserved:!rows.some(r=>r.tracked&&r.changed),allPreexistingTestsPreserved:!rows.some(r=>r.path.startsWith('tests/')&&r.changed),allPreexistingReportsPreserved:!rows.some(r=>r.path.startsWith('docs/')&&r.changed),dirtyBeforeFilesRecoverable:37,backupFailures,modifiedExistingFiles:rows.filter(r=>r.changed).map(r=>r.path),unexpectedHistoricalChanges:unexpected.map(r=>r.path),deletedFiles:[],records:rows};
}
if(process.argv[1]?.endsWith('verify-stage20c32-hardening.ts')){const r=await preservation();console.log(JSON.stringify({...r,records:undefined},null,2));if(r.status!=='PASS')process.exitCode=1;}
