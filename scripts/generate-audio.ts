import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fixedPhrases, phraseHash } from '../server/audioAssets';
import { ElevenLabsVoiceProvider, elevenLabsConfig, pcmToWav, VoiceError } from '../server/voice';
import { allScriptLines } from '../src/config/scenarios';
import { modelConfig, speechInstructions } from '../server/models';
import { createHash } from 'node:crypto';
const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error('Set OPENAI_API_KEY locally before generating demo assets.');
const config = modelConfig();
const items: { id: string; text: string; language: 'da' | 'en'; voice: string }[] = [];
const danishConfig = elevenLabsConfig();
items.push(...allScriptLines.map(l => ({ id: l.id, text: l.text, language: l.language, voice: l.language === 'da' ? config.clinicVoice : config.voice })));
await mkdir('public/audio', { recursive: true });
let manifest: Record<string, { hash: string; model: string; voice: string; language: string; bytes: number; provider?: string }> = {};
try { manifest = JSON.parse(await readFile('public/audio/manifest.json', 'utf8')); } catch { /* first generation */ }
for (const phrase of fixedPhrases) {
  const hash = phraseHash(phrase.id, phrase.da, danishConfig);
  let exists = false;
  try { exists = (await readFile(`public/audio/${phrase.id}.wav`)).length > 1000; } catch { /* absent */ }
  if (manifest[phrase.id]?.hash === hash && exists) { console.info('Reusing ElevenLabs asset', phrase.id); continue; }
  const provider = new ElevenLabsVoiceProvider(danishConfig);
  try {
    const bytes = pcmToWav(await provider.generateSpeech(phrase.da));
    await writeFile(`public/audio/${phrase.id}.wav`, bytes);
    manifest[phrase.id] = { hash, provider: 'ElevenLabs', model: danishConfig.modelId, voice: danishConfig.voiceId, language: 'da', bytes: bytes.length };
    await writeFile('public/audio/manifest.json', JSON.stringify(manifest, null, 2));
    console.info('Generated ElevenLabs asset', phrase.id, bytes.length, 'bytes');
  } catch (error) {
    if (error instanceof VoiceError) {
      console.error(`ElevenLabs audio generation unavailable (${error.reason}).`);
      if (error.reason === 'payment') console.error('The configured library voice requires paid ElevenLabs API access. Enable access, then rerun npm run generate:audio.');
      process.exitCode = 1; break;
    }
    throw error;
  } finally { provider.cancel(); }
}
if (process.exitCode) process.exit(process.exitCode);
for (const item of items) {
  const hash = createHash('sha256').update(JSON.stringify({ ...item, model: config.speech })).digest('hex');
  let exists = false;
  try { exists = (await readFile(`public/audio/${item.id}.wav`)).length > 1000; } catch { /* absent */ }
  if (manifest[item.id]?.hash === hash && exists) { console.info('Reusing', item.id); continue; }
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.speech, voice: item.voice, input: item.text, response_format: 'wav', ...(config.speech.startsWith('gpt-') ? { instructions: speechInstructions(item.language) } : {}) }), signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) throw new Error(`Audio generation failed (${response.status}) for ${item.id}. Check selected speech model/voice access.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1000) throw new Error(`Empty audio for ${item.id}`);
  await writeFile(`public/audio/${item.id}.wav`, bytes);
  manifest[item.id] = { hash, model: config.speech, voice: item.voice, language: item.language, bytes: bytes.length };
  await writeFile('public/audio/manifest.json', JSON.stringify(manifest, null, 2));
  console.info('Generated', item.id, bytes.length, 'bytes');
}
