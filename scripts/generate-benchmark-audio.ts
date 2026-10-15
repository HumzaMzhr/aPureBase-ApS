import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { benchmarkCases } from './benchmark-cases';
await mkdir('benchmarks/audio', { recursive: true });
const manifest: Record<string, { text: string; file: string; source: string }> = {};
for (const item of benchmarkCases) {
  let existing = false;
  try { existing = (await readFile(`benchmarks/audio/${item.id}.mp3`)).length > 1000; } catch { /* new */ }
  if (existing) { manifest[item.id] = { text:item.text,file:`${item.id}.mp3`,source:'Previously generated OpenAI marin' }; console.info('Reusing benchmark',item.id); continue; }
  const file=`benchmarks/audio/${item.id}.wav`;
  const result=spawnSync('/usr/bin/say',['-v','Samantha','--file-format=WAVE','--data-format=LEI16@24000','-o',file,item.text],{stdio:'ignore'});
  if(result.status!==0||(await readFile(file)).length<10000)throw new Error(`Offline fixture generation failed: ${item.id}`);
  manifest[item.id]={text:item.text,file:`${item.id}.wav`,source:'macOS Samantha, offline synthetic English'};console.info('Generated offline benchmark',item.id);
}
await writeFile('benchmarks/audio/fixtures.json',JSON.stringify(manifest,null,2));
