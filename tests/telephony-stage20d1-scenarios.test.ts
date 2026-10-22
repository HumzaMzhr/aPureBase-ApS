import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {currentC32Catalog} from '../src/consent/stage32/speech/current';
import expected from './fixtures/stage20d1-sequences.json';
import {scenarioIds,runTelephonyScenario} from '../src/telephony/scenarios';
const load=async(path:string)=>{const a=currentC32Catalog().find(a=>a.path===path);return new Uint8Array(await readFile(path.startsWith('/audio/')?'public'+path:a&&'binding'in a?'benchmarks/stage20c2-dynamic-cache/'+a.binding.cacheKey+'.wav':path));};
it.each(scenarioIds)('D1 mocked complete bridge scenario %s',async id=>{const r=await runTelephonyScenario(id,load);expect(r.checks.filter(c=>!c.pass)).toEqual([]);expect(r.passed).toBe(true);expect(r.report.orderedTranscriptLedger.entries.map(e=>({speaker:e.speaker,eventType:e.eventType,text:e.sourceText??null,phrase:e.metadata?.phraseId??null,message:e.metadata?.message??null}))).toEqual(expected[id as keyof typeof expected]);});
