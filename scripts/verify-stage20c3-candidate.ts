/** Read-only candidate audit: no network, audio generation, microphone or provider. */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { listeningCatalog } from '../src/consent/acceptance/catalog';
import { verifyAsset } from '../src/consent/approved/assets';
import { verifyDynamicAsset } from '../src/consent/dynamic/render';

const audit = JSON.parse(await readFile('docs/stage-2.0c-3-finalization-preservation.json', 'utf8')) as {
  records: { path: string; before: string; after: string; unchanged: boolean }[];
};
for (const record of audit.records) {
  const hash = createHash('sha256').update(await readFile(record.path)).digest('hex');
  if (hash !== record.after) throw new Error('Candidate file changed or missing: ' + record.path);
}
let staticCount = 0, dynamicCount = 0;
for (const asset of listeningCatalog) {
  if ('binding' in asset) {
    const key = asset.binding.cacheKey;
    const bytes = new Uint8Array(await readFile('benchmarks/stage20c2-dynamic-cache/' + key + '.wav'));
    const cached = JSON.parse(await readFile('benchmarks/stage20c2-dynamic-cache/' + key + '.json', 'utf8'));
    await verifyDynamicAsset(asset, bytes);
    await verifyDynamicAsset(cached, bytes);
    if (cached.assetHash !== asset.assetHash || cached.textHash !== asset.textHash) throw new Error('Cache metadata mismatch: ' + key);
    dynamicCount++;
  } else {
    await verifyAsset(asset, new Uint8Array(await readFile('public' + asset.path)));
    staticCount++;
  }
}
if (staticCount !== 25 || dynamicCount !== 12) throw new Error('Expected exactly 25 static and 12 dynamic recordings.');
console.log(JSON.stringify({ status: 'PASS', filesChecked: audit.records.length, staticRecordings: staticCount, dynamicRecordings: dynamicCount, providerRequests: 0, physicalAcceptance: 'NOT_TESTED', candidate: 'NOT_ACCEPTED' }, null, 2));
