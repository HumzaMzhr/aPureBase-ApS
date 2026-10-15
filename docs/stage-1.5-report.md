# Stage 1.5 latency optimization report

13 October 2026. Existing project modified; optimization stops at this stage. Isabella, Eleven Flash v2.5 and all seven fixed WAV assets are unchanged. No Twilio or autonomous calling.

## 1. Original latency breakdown

Ten fixed synthetic English sources were measured before optimization using the previous complete-file gpt-transcribe → gpt-5.5/low reasoning → ElevenLabs → browser playback architecture. All timings use one browser performance clock per turn.

| Stage | Original median | Original p95 | Optimized median | Optimized p95 |
| --- | ---: | ---: | ---: | ---: |
| End-of-turn detection | 651 ms | 1663 ms | 451 ms | 1668 ms |
| Transcription finalization | 2232 ms | 22056 ms | 775 ms | 2754 ms |
| OpenAI first useful text | 2400 ms | 9062 ms | 1706 ms | 3453 ms |
| OpenAI complete text | 2400 ms | 9062 ms | 2243 ms | 3455 ms |
| Text → ElevenLabs handoff | 0 ms | 10 ms | 1 ms | 10 ms |
| ElevenLabs first audio | 648 ms | 1087 ms | 1025 ms | 5464 ms |
| Browser playback overhead | 30 ms | 42 ms | 86 ms | 2021 ms |
| Total end-of-speech → playback | 6424 ms | 29788 ms | 4829 ms | 9860 ms |

Raw evidence: [baseline](../benchmarks/baseline.json), [optimized](../benchmarks/optimized.json). Median is the mean of the middle pair; p95 uses nearest rank. With ten observations, p95 is the maximum. Stage medians do not sum to the median total.

## 2. Identified bottleneck

Original median transcription was 2232ms and complete OpenAI translation 2400ms, exceeding the 648ms median voice-first-audio component. File recognition had a 22057ms outlier. Handoff was already sub-millisecond at median. Provider/network and renderer variability remain significant: optimized voice-first-audio peaked at 5464ms and renderer overhead at 2021ms.

## 3. Changes made

Added continuous PCM recognition behind a server WebSocket relay, local complete-turn commit, concise translation instructions, no reasoning, measured model routing, OpenAI SSE text timing, ten stage timestamps and eight displayed differences. Full translations remain validated before synthesis. Introduced strict structured recommendations and an exact-match cached fast path with explicit human approval. English speech remains fully buffered; audio ownership and End Call abort controls remain.

T0 is the last voiced RMS sample; T1 is local finalization; T2 is file request dispatch or Realtime buffer commit; T3 is the final transcript; T4 is translation request dispatch; T5 is the first useful SSE text notification; T6 is the complete validated text; T7 is speech request dispatch; T8 is the first PCM bytes at the browser; T9 is renderer playback start. The UI subtracts the requested pairs directly and shows — for unobserved/inapplicable stages. It does not fabricate an English first-byte time from a fully buffered MP3. For cached playback T7/T8 and provider/playback-byte differences are unused. Normal mode retains only total timing.

Baseline T5 was first observable complete JSON text; it had no incremental text transport. Optimized first-text timing observes SSE arrival, not provider-only inference. Audio timestamps measure the browser renderer, not acoustic headphone/DAC onset. All network times include the local relay.

## 4. VAD selected

[Offline RMS audit](../benchmarks/vad-audit.json) examined ten English and eight Danish synthetic recordings at 350/450/550/650ms. False-cut counts across 18 recordings were 6/4/3/3. English 350ms cut a greeting pause; 450ms passed all ten English fixtures. Danish 650ms still cut three fixtures. The longest Danish interior pause was 1260ms.

Defaults: English 450ms; Danish 1350ms. The latter adds two 30ms timer samples of margin and rounds upward in 50ms increments. Both pass the recorded-pause audit. The Developer UI allows 350–3000ms per language. Manual Finish speaking remains available, with optional required manual completion for both inputs. Native/human pauses remain unvalidated; spelling and hesitation should use manual completion. A silence detector cannot guarantee that every human has finished thinking.

## 5. Transcription architecture/model

Current official documentation supports gpt-live-transcribe recognition during speech. Browser AudioWorklet emits mono signed PCM16 at 24kHz; the server appends it continuously. Provider VAD is disabled. After local VAD/manual completion, the worklet flushes and the client commits. Only a matching committed item's final transcription is released. Neither partial transcripts nor early translated audio are emitted. Browser code receives no provider key.

The Realtime session uses type transcription, gpt-live-transcribe, delay low, source-language hints and keywords for aPureBase, Example Pharma, Humza, Isabella and Pernille. Previous file mode remains configurable with gpt-transcribe; failures require a new/manual action rather than silently duplicating paid recognition.

English finalization median improved from 2232ms to 775ms. Eight additional Danish fixtures had median finalization 704ms (range 658–826ms). These are controlled playback-fed PCM trials, not physical microphones. Recognition starts before speech ends; translation still starts after finalized speech.

Sources checked: [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription), [speech to text](https://developers.openai.com/api/docs/guides/speech-to-text), [transcription](https://developers.openai.com/api/docs/guides/transcription), [Responses streaming](https://developers.openai.com/api/docs/guides/streaming-responses), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

## 6. OpenAI model/configuration

[Controlled text-only model comparison](../benchmarks/model-comparison.json) used the same ten finalized baseline transcripts and compact instructions. gpt-5.5/none had first-text median 1375ms and full-text median 1867ms (p95 2032/2448ms). gpt-4.1-mini had first-text median 902ms and full-text median 1259ms (p95 1286/1517ms).

Production routing: routine short turns → gpt-4.1-mini; spelled email, digits/dates/time, permission/authority, medical/dose wording and >160-character turns → gpt-5.5 with reasoning none. Prompts preserve the full meaning, questions, refusals, qualifications, exact protected names and literal emails. Translation is not a short-answer summarizer. Structured recommendations can suggest only supplied campaign knowledge and exact existing bank texts.

The faster model failed a spelled-email comparison, producing mixed punctuation/translated address components. Therefore it is not used unconditionally. The stronger model preserved spelling; optimized recognition preserved anna-2 dot jensen at example dot dk and reference digits four seven two nine. Keyword routing is a conservative heuristic, not a complete risk classifier.

## 7. Cached-response fast path

[Three actual structured recommendations](../benchmarks/danish-quality-cache.json) selected exact purpose/information/unsubscribe bank texts. The validated schema contains intent, confidence, english_interpretation, recommended_response_en, response_da, action, requires_human_approval and cached_phrase_id. All nine requested actions are represented; only exact known cached recommendations are playable from this layer. Unknown/custom, uncertain, consent/authority and medical cases stay with the human. Model confidence is uncalibrated and never evidence of consent.

| Exact cached answer | Intent recognition | Approved playback startup |
| --- | ---: | ---: |
| purpose | 2128 ms | 43.5 ms |
| information | 2827 ms | 7.7 ms |
| unsubscribe | 2915 ms | 7.3 ms |

Cached startup median 7.7ms; p95 43.5ms (n=3). Intent recognition median 2827ms; p95 2915ms. These begin with finalized Danish text, so exclude speech recognition/VAD. Human approval time is excluded and must be added in real use. No claim of <2s end-to-cached-audio is made.

UI: Suggest approved response → review English wording → Approve & play cached suggestion. Playback immediately uses the preloaded existing WAV; no second translation or ElevenLabs request. All recommendations require human approval in Stage 1.5. Exact finalized custom Danish translations matching a bank phrase also bypass ElevenLabs, since the agent has already spoken that complete response. No cache identity, wording, asset or generation policy changed. Consent is never automatically written.

## 8. Custom-response result

| Scenario | Original total | Optimized total |
| --- | ---: | ---: |
| greeting | 5963 ms | 5043 ms |
| information | 5888 ms | 3625 ms |
| unavailable | 13167 ms | 7897 ms |
| callback | 4315 ms | 9629 ms |
| refusal | 4816 ms | 7068 ms |
| uncertainty | 4151 ms | 9860 ms |
| long-question | 7999 ms | 4615 ms |
| email | 29788 ms | 4183 ms |
| numbers | 16766 ms | 4021 ms |
| unexpected | 6886 ms | 3923 ms |

All ten custom translations completed without answering the unexpected medical question or converting uncertainty/refusal into agreement. Translation/audio did not start midway through the source. The controlled harness always played the entire source before translation; the separate pause audit checks premature VAD risk.

The first optimized run completed six turns, then hit a sanitized voice-generation failure on the long turn. Those six results were retained; the remaining four were completed in a resumed run. Developer reloads also interrupted attempts; their unfinished results are excluded. No failed turn has an invented timing. Thus this is a small completed-ten-turn comparison across resumed runs, not a uninterrupted production reliability study. The raw incomplete file preserves the original six results.

## 9. Median latency

Custom total: original 6424ms → optimized 4829ms, approximately 25% lower. Transcription median improved about 65%. The <2s target is not met, and no custom trial achieved <2s.

## 10. p95 latency

Custom total: original 29788ms → optimized 9860ms, approximately 67% lower. These ten synthetic observations do not establish a production SLA or a statistically stable percentile. No provider/network outlier was removed from completed results.

## 11. Quality and text-to-speech streaming findings

The ten English cases retain questions, refusal, ask-the-doctor-first, no permission on behalf of the doctor, dates/time, reference digits, spelled email and aPureBase. The long question retains its final authority qualification. The unexpected dose/safety question remains a question, with no invented medical advice. One incremental English transcript rendered unavailable as inavailable; its Danish translation preserved negation. This lexical ASR error remains documented rather than silently corrected.

All eight synthetic Danish source transcripts match expected substantive wording, including Pernille, callback timing, contact snabel-a example punktum dk and the entire permission/email/unsubscribe utterance. Differences are punctuation only. No automatic consent state was created. This does not certify live native Danish recognition, names, email spelling or voice pronunciation.

[Semantic-unit synthesis experiment](../benchmarks/semantic-units.json) compared full text with the first complete sentence for two finalized sources:

| Source | Full text ready | First whole unit ready | Full-text first audio | Unit first audio |
| --- | ---: | ---: | ---: | ---: |
| greeting | 1469 ms | 1460 ms | 2110 ms | 2118 ms |
| long-question | 1962 ms | 1814 ms | 2585 ms | 2424 ms |

Times above are from translation-request dispatch, excluding recognition/VAD and playback. No experimental audio was played; provider readers were cancelled after first bytes. For the short utterance the complete unit and full response were identical; unit playback preparation saved nothing (about 8ms slower). The long first sentence saved about 161ms, but omitted the subsequent authority qualification until a later segment. This is only two samples; independent request/network variation contributes. Production retains full-text validation and a single natural response. Unstable token fragments never reach speech generation.

## 12. Remaining bottlenecks

OpenAI complete text, provider/network variability and occasional renderer delays remain. Cached intent generation still takes about 2–3s before human review. Conservative Danish finalization adds 1.35s. More native/hardware trials are needed before reducing it. Real calls, Twilio/Teams/Zoom routing, autonomous response generation, CRM writes and production consent handling are deferred.

## 13. Tests and verification

101 mocked tests across 14 files pass. npm run lint, npm run typecheck and npm run build pass. Coverage includes incremental microphone append/flush/commit, matched final item release, premature-final rejection, disconnect/End Call cleanup, full text gating, streamed SSE boundaries/deduplication/protected tokens, model routing, strict response decisions, cached bypass, audio exclusivity and provider failures. Automated tests make no paid calls. The microphone worklet stops producing PCM at its flush boundary; post-commit PCM is ignored, preventing disabled-input silence from invalidating a pending final transcript. A dedicated worklet regression test verifies this boundary.

Live checks are explicitly separate: ten original and ten completed optimized custom turns, two ten-case text model comparisons, eight Danish recognition fixtures, three cached recommendations and a two-source semantic-unit experiment. Source fixtures include six generated synthetic English clips and four macOS Samantha clips; original eight Danish simulation assets were reused. No fixed phrase was regenerated. Developer harnesses are not in the production bundle. The real application UI also completed an English-to-Danish Example Pharma turn in 3962ms: end detection 452ms, recognition finalization 853ms, first text 1465ms, complete text 1996ms, handoff 8ms, ElevenLabs first audio 613ms and playback overhead 42ms. It showed an exact information-bank suggestion requiring approval and returned to READY on End Call. [UI proof](../stage15-verification.png) and [visible transcript](../benchmarks/application-proof.txt). This additional example is excluded from the ten-turn cohort. The final production bundle contains the capture worklet and no configured OpenAI/ElevenLabs key values.

## 14. Exact launch command

From this project folder, stop the old server with Ctrl+C if needed:

```bash
npm run dev
```

Open http://localhost:5173 in Google Chrome. Existing .env and installed dependencies are ready. Do not regenerate fixed audio for this stage. Production: npm run build, then npm start. Native-speaker and physical-microphone acceptance remain pending.
