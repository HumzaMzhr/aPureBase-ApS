# Stage 1.7 latency trials — 14 October 2026

Both proposed approaches were implemented as opt-in developer experiments and tested with the same fictional English/Danish source recordings against actual providers. **The direct translator starts speech sooner, but reliable 1–2 second interpretation has not been achieved.** The controlled and standard streaming defaults remain unchanged; direct translation is not enabled for participant calls. No Twilio integration or external call was made.

## Results

| Pipeline | Direction | First renderer start | Approximate first speech | Delivery finding |
|---|---|---:|---:|---|
| Existing Isabella baseline | EN → DA | 8.0s | 8.0s | 61/61 source ranges accounted |
| Existing Isabella baseline | DA → EN | 7.2s | 7.2s | 53/53 source ranges accounted |
| Earlier-recognition Isabella trial | EN → DA | 8.5s | 8.6s | 61/61 source ranges accounted; no improvement |
| Earlier-recognition Isabella trial, follow-up | DA → EN | 21.9s | 21.9s | Voice setup failure; incomplete delivery, not a successful comparison |
| Direct gpt-realtime-translate, final trial | EN → DA | 1.1s | **2.9s** | Target captions cover the script, but names differ; spoken ranges unverified |
| Direct gpt-realtime-translate | DA → EN | 1.3s | **3.7s** | Availability negation and questions present; source captions incomplete |

The direct initial English exploratory run started its renderer at 1.1s, with first speech estimated at 2.2s. It had no source-caption configuration and is retained separately as diagnostic evidence. Final English adds source captions and uses the documented 200ms input cadence; Danish used 100ms input packets. These are small, different test cohorts, not a controlled statistical proof of a particular setting.

First renderer start includes provider leading silence. Approximate first speech is derived from the first complete 20ms window with normalized PCM RMS ≥0.005 in the actual rendered WAV. It is a signal estimate, not native listening or acoustic headphone onset. The original complete baseline first-speech adjustment is only about 40ms. In direct trials, leading silence was 1.76s English and 2.40s Danish; calling the first packet “speech starts in 1.1 seconds” would overstate the improvement.

The failed follow-up Danish Isabella run originally reported 13.7s from the first delivered late source unit. The comparison analysis corrects this to 21.9s from the original source onset. The harness now uses the original onset, and explicitly marks incomplete delivery. Do not compare its one delivered tail's median lag against successful whole-script results.

[Machine-readable comparison](../benchmarks/stage17-latency-comparison.json) includes the original and corrected timings, signal method, end-of-speech offsets and delivery status. The local [comparison page](http://localhost:5173/scripts/latency-comparison.html) presents results and all six output recordings without autoplay.

## What was tried

The opt-in Isabella profile requests minimal-delay live recognition, allows a stable complete greeting before a longer clause, uses shorter translation instructions with relevant glossary entries and retains strict full-output validation/rolling context/name protection. It can flush the first validated short clause into the same ElevenLabs connection. It does not force fixed-time chunks or send unstable text to TTS. Controlled recognition continues to use its original delay; normal streaming remains standard unless explicitly opting into the trial.

English recognition's first safe greeting arrived after 1.44s versus 2.51s for the earlier longer unit. However, translation took 3.07s, voice readiness added 0.65s, and first TTS audio took 3.33s. These waits erased the recognition improvement. Smaller chunks also add translation requests and can create gaps; the faster profile is not selected as the default.

Direct translation uses the dedicated `/v1/realtime/translations?model=gpt-realtime-translate` WebSocket endpoint. Source PCM streams continuously; translated PCM and append-only captions return without separate Responses/ElevenLabs steps. Graceful `session.close` drains through `session.closed`. The optional source-caption model is gpt-realtime-whisper. A separate two-second format probe confirmed mono PCM16 at 24kHz; packet metadata is validated and recorded. No output sample-rate or playback-speed manipulation is applied.

The new direct endpoint is development-only, localhost Origin/Host guarded, bounded, server-keyed and limited to two sessions. Source bytes are sent only to translation; only generated output reaches the target renderer. It uses the existing role/bus checks and FIFO scheduler. Cancellation closes the provider without reconnect/replay. The direct audio bypasses application semantic/precision review and uses provider-generated speech rather than fixed Isabella, so it stays a benchmark prototype.

## Quality and ongoing delay

Direct English captions spelled Humza as **Hamza** and aPureBase as **A Pure Base** in both runs. This demonstrates name/text fidelity problems; audible pronunciation remains unrated. Source captions ended before the final words in both directions and also split Pernille as “Per Nille.” Danish target wording “the doctor is on a call” is more specific than the source “optaget med en samtale” and needs bilingual review. One target caption joined “findthe.” No silent spelling repair or spoken correction was applied.

Final direct English measured two transport underruns totaling 1.89s; Danish measured four totaling 1.09s. Every trial had zero scheduled overlaps. Audible gaps, pronunciation, naturalness, voice identity and missed/repeated phonemes remain human-review fields; they were not filled automatically.

Direct first speech improved, but ongoing lag cannot be calculated reliably from append-only captions and frame elapsed metadata without a validated source-word/target-audio mapping. The approximate last speech signal ended 5.17s after the English source finished and 2.71s after the Danish source finished. Those are ending offsets, not continuous median/p95 or exact last-word alignment.

The direct output contained substantial trailing low-energy/silent PCM. Full renderer completion was 30.55s after English source finish and 25.91s after Danish source finish, although speech energy ended much earlier. Playback busy time and pending silence need attention before long calls. Recordings preserve all complete deltas, leading/trailing provider silence and transport gaps; no silence removal, time stretching, crossfade or phoneme trimming was used. A fast first packet alone does not prove a sustainable 1–2 second interpreting lag.

## Failures and fixes

The first faster Danish run started near 5.5s but stopped for precision review. Its delivered-range ledger was incomplete; it is preserved as an initial diagnostic, not a successful interpretation. Reviewing it found:

- The lexical negation guard could reject faithful English contractions such as “isn't” or curly-apostrophe “can’t.” It now recognizes these forms without altering returned speech text, while still rejecting absent negative meaning markers. This conservative lexical check is not proof of semantic accuracy.
- A later uncertain precision tail could cut a previously validated sentence. Precision failure now drains the validated output and holds the uncertain remainder for review. Unused preconnected voice contexts are released.
- A committed ASR revision arriving during a translation request could allow the stale response through. The worker now blocks that late result and retains review state.
- Benchmark completion could look successful despite missing delivered ranges. The harness now reports incomplete delivery explicitly and measures initial lag from the original source onset.

The follow-up Danish run encountered a voice setup failure and delivered only the later precision tail: 53 received, 35 translated, 34 spoken source words. It is retained and plainly marked incomplete. It did not establish that the faster profile is robust or that the original live precision failure was solely caused by the contraction check.

## Validation

**181 tests across 27 files**, all automated paid-provider calls mocked. Lint, typecheck and production build passed. Meaningful new cases cover explicit minimal-delay opt-in, stable short greetings with negation held, protected context/schema under compact prompts, valid English negation variants, precision draining, preconnection cleanup, the in-flight ASR revision race, direct source/target separation, frame deduplication, format validation, graceful final drain, End Call/late-output rejection, setup timeout and hostile-origin rejection. Original controlled routing and cached-path tests remain. The production build contains no actual provider keys or direct-trial client endpoint, and all seven cached configuration hashes/byte sizes still validate. [Release check](../benchmarks/stage17-latency-release-check.json).

Seven explicit source/protocol trials were run: three direct speech trials, one two-second format probe, English faster-Isabella and two Danish faster-Isabella attempts. No calls ran automatically on page load. Existing source fixtures and all seven cached Danish recordings were reused; nothing was regenerated or voice-cloned.

## Review and next step

Open http://localhost:5173/scripts/latency-comparison.html while the agent dev server is running. Listen to the current and direct Danish/English recordings with headphones and ask a bilingual listener to review names, negation, voice and continuity. WAVs begin at the first scheduled target PCM, so they do not include the pre-packet wait displayed in the table.

The direct architecture is the faster candidate for a **supervised Twilio test to an owned/volunteer test number**, after voice/name review and a decision about the missing precision controls. This is not readiness for ordinary external clinic calls. Twilio would exercise telephone routing/audio quality; it would not remove the remaining translation/provider delay. The current controlled interpreter remains available throughout.

Primary documentation used: [Realtime translation](https://developers.openai.com/api/docs/guides/realtime-translation), [translation client events](https://developers.openai.com/api/reference/resources/realtime/translation-client-events), [translation server events](https://developers.openai.com/api/reference/resources/realtime/translation-server-events), [live transcription](https://developers.openai.com/api/docs/guides/realtime-transcription).
