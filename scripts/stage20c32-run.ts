/** Repository-only launcher. Builds cached assets; never generates audio or starts ASR. */
import {execFileSync,spawn} from 'node:child_process';
import {resolve} from 'node:path';
const out=resolve('dist/c32-human-retest');
execFileSync(process.execPath,['--import','tsx','scripts/stage20c32-package.ts',out,'--repository'],{stdio:'inherit'});
const server=spawn(process.execPath,[resolve(out,'server.mjs')],{stdio:'inherit',env:process.env});
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>server.kill(signal));
server.on('error',error=>{console.error('Local retest server failed:',error.message);process.exitCode=1;});
server.on('exit',code=>{process.exitCode=code??1;});
