import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {validateExport,type ReviewData} from '../../src/consent/stage32/handoff/contract';
const data=JSON.parse(await readFile(fileURLToPath(new URL('./review-data.json',import.meta.url)),'utf8')) as ReviewData;
if(!process.argv[2])throw new Error('Usage: bundled-node verify-review.mjs path-to-export.json');
const value:unknown=JSON.parse(await readFile(process.argv[2],'utf8'));validateExport(value,data);console.log('PASS: exact candidate export contract; human judgments are not authenticated or automatically accepted.');
