import { verifiedAssets } from '../approved/assetPack';
import type { VerifiedAsset } from '../approved/assets';
import type { DynamicAsset } from '../dynamic/render';
export const cachedDynamicAssets: readonly DynamicAsset[] = [
  {
    "phraseId": "email-readback-intro",
    "wordingVersion": "stage-2.0c1-approved-1",
    "text": "a, en, en, a, tre, punktum, te, e, es, te, bindestreg, syv, snabel-a, se, el, i, en, i, se, punktum, de, kå",
    "textHash": "390cf31229a800c0a839e0d9c6ca42b18b50834d3d0126abdf1741fa25f52a16",
    "assetHash": "b556f09dddd1d9309f8dff3fc1df049c0e1bb3efbf80d961ef4e3df341301e86",
    "path": "http://127.0.0.1:5180/cache/094bbd3b24c4536bb36460a12a11cd6283912e82b297ec141ea83c1389ee2c76.wav",
    "voice": {
      "provider": "ElevenLabs",
      "name": "Isabella",
      "voiceId": "gIfqD5jrnhkFu8ENVbXC",
      "modelId": "eleven_flash_v2_5",
      "speed": 0.95
    },
    "requestedSpeed": 0.95,
    "generatedAt": "2026-10-18T12:32:12.015Z",
    "duration": 18.715291666666666,
    "samples": 449167,
    "sampleRate": 24000,
    "mediaFormat": "wav-pcm-s16le-mono",
    "provenance": {
      "verified": true,
      "method": "authenticated-provider-response-and-content-hash",
      "providerRequestId": "4pRfmaNfVIP8cU9VXH49",
      "endpoint": "https://api.elevenlabs.io/v1/text-to-speech/gIfqD5jrnhkFu8ENVbXC",
      "settingsHash": "a960c68f2bda1018b759544deec3e238190c7b171ebcd23d92826424863cea86"
    },
    "verification": {
      "mediaValid": true,
      "nonSilent": true,
      "clippingEvents": 0,
      "rawPeak": 0.2896728515625,
      "gainApplied": 3.3831268436578172,
      "peakProtectionEvents": 1,
      "outputPeak": 0.9800000190734863
    },
    "status": "GENERATED_VERIFIED_LOCAL_ONLY",
    "businessWordingApproved": true,
    "productionApproved": false,
    "binding": {
      "slot": {
        "kind": "EMAIL",
        "phraseId": "email-readback-intro",
        "candidate": "anna3.test-7@clinic.dk",
        "sourceTurnId": "synthetic-email-fixture",
        "recipientRevision": 1,
        "normalizationReviewed": true
      },
      "renderedValue": "a, en, en, a, tre, punktum, te, e, es, te, bindestreg, syv, snabel-a, se, el, i, en, i, se, punktum, de, kå",
      "renderedText": "a, en, en, a, tre, punktum, te, e, es, te, bindestreg, syv, snabel-a, se, el, i, en, i, se, punktum, de, kå",
      "textHash": "390cf31229a800c0a839e0d9c6ca42b18b50834d3d0126abdf1741fa25f52a16",
      "phraseVersion": "stage-2.0c1-approved-1",
      "rendererVersion": "stage-2.0c2-deterministic-1",
      "cacheKey": "094bbd3b24c4536bb36460a12a11cd6283912e82b297ec141ea83c1389ee2c76"
    }
  },
  {
    "phraseId": "intermediary-consent-question",
    "wordingVersion": "stage-2.0c1-approved-1",
    "text": "Tak. Må aPureBase sende relevant faglig information via e-mail til Jens Hansen?",
    "textHash": "89023a0e1a676f4b03915c6865b3d772ddc00fa59149dc02db7e23b31a1eb67e",
    "assetHash": "2d43ca1559a5a7183c41ee45fa85b18e05c6bf916f39d7465d71528c4a420da5",
    "path": "http://127.0.0.1:5180/cache/32ab04c8badee6a326b72f5ec619ec94c6d7a886b21949ae575a940c86bd7cf7.wav",
    "voice": {
      "provider": "ElevenLabs",
      "name": "Isabella",
      "voiceId": "gIfqD5jrnhkFu8ENVbXC",
      "modelId": "eleven_flash_v2_5",
      "speed": 0.95
    },
    "requestedSpeed": 0.95,
    "generatedAt": "2026-10-18T12:32:09.021Z",
    "duration": 5.108375,
    "samples": 122601,
    "sampleRate": 24000,
    "mediaFormat": "wav-pcm-s16le-mono",
    "provenance": {
      "verified": true,
      "method": "authenticated-provider-response-and-content-hash",
      "providerRequestId": "ygQUsGtdGous3G3FJ1l3",
      "endpoint": "https://api.elevenlabs.io/v1/text-to-speech/gIfqD5jrnhkFu8ENVbXC",
      "settingsHash": "a960c68f2bda1018b759544deec3e238190c7b171ebcd23d92826424863cea86"
    },
    "verification": {
      "mediaValid": true,
      "nonSilent": true,
      "clippingEvents": 0,
      "rawPeak": 0.182525634765625,
      "gainApplied": 3.5573605757216837,
      "peakProtectionEvents": 0,
      "outputPeak": 0.649309515953064
    },
    "status": "GENERATED_VERIFIED_LOCAL_ONLY",
    "businessWordingApproved": true,
    "productionApproved": false,
    "binding": {
      "slot": {
        "kind": "NAME",
        "phraseId": "intermediary-consent-question",
        "name": {
          "original": "Jens Hansen",
          "source": "contact-data",
          "evidenceId": "synthetic-contact-fixture",
          "evidenceText": "SYNTHETIC rehearsal target: Jens Hansen",
          "reviewedBy": "local-rehearsal-fixture",
          "reviewedAt": "2026-10-18T00:00:00.000Z",
          "pronunciationConfirmed": true,
          "recipientRevision": 1
        }
      },
      "renderedValue": "Jens Hansen",
      "renderedText": "Tak. Må aPureBase sende relevant faglig information via e-mail til Jens Hansen?",
      "textHash": "89023a0e1a676f4b03915c6865b3d772ddc00fa59149dc02db7e23b31a1eb67e",
      "phraseVersion": "stage-2.0c1-approved-1",
      "rendererVersion": "stage-2.0c2-deterministic-1",
      "cacheKey": "32ab04c8badee6a326b72f5ec619ec94c6d7a886b21949ae575a940c86bd7cf7"
    }
  },
  {
    "phraseId": "email-readback-intro",
    "wordingVersion": "stage-2.0c1-approved-1",
    "text": "a, en, en, a, snabel-a, se, el, i, en, i, se, punktum, de, kå",
    "textHash": "5b56476b0b1b1102554d705206545a005959b59180afe6e624fa71b79061793f",
    "assetHash": "dcaacb22b34ff576464a49bff4f08dc0e12557b2b4bd98f90f437f65eceed3d8",
    "path": "http://127.0.0.1:5180/cache/3c1097bebb48f9d3d335b0e317f82bef0127fad623ccec19b7c38130099a6b9b.wav",
    "voice": {
      "provider": "ElevenLabs",
      "name": "Isabella",
      "voiceId": "gIfqD5jrnhkFu8ENVbXC",
      "modelId": "eleven_flash_v2_5",
      "speed": 0.95
    },
    "requestedSpeed": 0.95,
    "generatedAt": "2026-10-18T12:32:10.470Z",
    "duration": 8.777125,
    "samples": 210651,
    "sampleRate": 24000,
    "mediaFormat": "wav-pcm-s16le-mono",
    "provenance": {
      "verified": true,
      "method": "authenticated-provider-response-and-content-hash",
      "providerRequestId": "yWC1VIlMeYQW00WqP0tj",
      "endpoint": "https://api.elevenlabs.io/v1/text-to-speech/gIfqD5jrnhkFu8ENVbXC",
      "settingsHash": "a960c68f2bda1018b759544deec3e238190c7b171ebcd23d92826424863cea86"
    },
    "verification": {
      "mediaValid": true,
      "nonSilent": true,
      "clippingEvents": 0,
      "rawPeak": 0.328277587890625,
      "gainApplied": 2.9852784233522356,
      "peakProtectionEvents": 1,
      "outputPeak": 0.9800000190734863
    },
    "status": "GENERATED_VERIFIED_LOCAL_ONLY",
    "businessWordingApproved": true,
    "productionApproved": false,
    "binding": {
      "slot": {
        "kind": "EMAIL",
        "phraseId": "email-readback-intro",
        "candidate": "anna@clinic.dk",
        "sourceTurnId": "synthetic-email-fixture",
        "recipientRevision": 1,
        "normalizationReviewed": true
      },
      "renderedValue": "a, en, en, a, snabel-a, se, el, i, en, i, se, punktum, de, kå",
      "renderedText": "a, en, en, a, snabel-a, se, el, i, en, i, se, punktum, de, kå",
      "textHash": "5b56476b0b1b1102554d705206545a005959b59180afe6e624fa71b79061793f",
      "phraseVersion": "stage-2.0c1-approved-1",
      "rendererVersion": "stage-2.0c2-deterministic-1",
      "cacheKey": "3c1097bebb48f9d3d335b0e317f82bef0127fad623ccec19b7c38130099a6b9b"
    }
  },
  {
    "phraseId": "receptionist-target-request",
    "wordingVersion": "stage-2.0c1-approved-1",
    "text": "Jeg ringer vedrørende faglig information til Jens Hansen. Kan jeg tale med vedkommende?",
    "textHash": "1a6ca327138d6703af73d7b47ded31b0d27d15adac42d63e5bfd939ce614c2ec",
    "assetHash": "9d89447cd63c577a25a5442b0d954c171c82bdd7f980cfbed0891ca73cb8caf8",
    "path": "http://127.0.0.1:5180/cache/3fcca16ff11c3c331600ac9c5fd7d6dbd9b3c332e3fbcbf41eade5f7e05ba323.wav",
    "voice": {
      "provider": "ElevenLabs",
      "name": "Isabella",
      "voiceId": "gIfqD5jrnhkFu8ENVbXC",
      "modelId": "eleven_flash_v2_5",
      "speed": 0.95
    },
    "requestedSpeed": 0.95,
    "generatedAt": "2026-10-18T12:32:08.074Z",
    "duration": 5.2941666666666665,
    "samples": 127060,
    "sampleRate": 24000,
    "mediaFormat": "wav-pcm-s16le-mono",
    "provenance": {
      "verified": true,
      "method": "authenticated-provider-response-and-content-hash",
      "providerRequestId": "6UQm54j8wpNNJkSnuCBQ",
      "endpoint": "https://api.elevenlabs.io/v1/text-to-speech/gIfqD5jrnhkFu8ENVbXC",
      "settingsHash": "a960c68f2bda1018b759544deec3e238190c7b171ebcd23d92826424863cea86"
    },
    "verification": {
      "mediaValid": true,
      "nonSilent": true,
      "clippingEvents": 0,
      "rawPeak": 0.158721923828125,
      "gainApplied": 3.5573605757216837,
      "peakProtectionEvents": 0,
      "outputPeak": 0.5646311044692993
    },
    "status": "GENERATED_VERIFIED_LOCAL_ONLY",
    "businessWordingApproved": true,
    "productionApproved": false,
    "binding": {
      "slot": {
        "kind": "NAME",
        "phraseId": "receptionist-target-request",
        "name": {
          "original": "Jens Hansen",
          "source": "contact-data",
          "evidenceId": "synthetic-contact-fixture",
          "evidenceText": "SYNTHETIC rehearsal target: Jens Hansen",
          "reviewedBy": "local-rehearsal-fixture",
          "reviewedAt": "2026-10-18T00:00:00.000Z",
          "pronunciationConfirmed": true,
          "recipientRevision": 1
        }
      },
      "renderedValue": "Jens Hansen",
      "renderedText": "Jeg ringer vedrørende faglig information til Jens Hansen. Kan jeg tale med vedkommende?",
      "textHash": "1a6ca327138d6703af73d7b47ded31b0d27d15adac42d63e5bfd939ce614c2ec",
      "phraseVersion": "stage-2.0c1-approved-1",
      "rendererVersion": "stage-2.0c2-deterministic-1",
      "cacheKey": "3fcca16ff11c3c331600ac9c5fd7d6dbd9b3c332e3fbcbf41eade5f7e05ba323"
    }
  },
  {
    "phraseId": "email-readback-intro",
    "wordingVersion": "stage-2.0c1-approved-1",
    "text": "a, en, en, a, to, punktum, te, e, es, te, bindestreg, syv, snabel-a, se, el, i, en, i, se, punktum, de, kå",
    "textHash": "980bc70513f1df076e0d3f0c0b60ea8583af52ceb38b170acb668995f25a7c48",
    "assetHash": "74176d4a77da33b1096da5c62453663fc60a89a4596526ad401e56f1bf4cde11",
    "path": "http://127.0.0.1:5180/cache/9104fa03fc1ad8ef10a5d21bf0a33e88dbdf64ed389b0701dd59c47b4e3288cb.wav",
    "voice": {
      "provider": "ElevenLabs",
      "name": "Isabella",
      "voiceId": "gIfqD5jrnhkFu8ENVbXC",
      "modelId": "eleven_flash_v2_5",
      "speed": 0.95
    },
    "requestedSpeed": 0.95,
    "generatedAt": "2026-10-18T12:32:11.139Z",
    "duration": 8.962916666666667,
    "samples": 215110,
    "sampleRate": 24000,
    "mediaFormat": "wav-pcm-s16le-mono",
    "provenance": {
      "verified": true,
      "method": "authenticated-provider-response-and-content-hash",
      "providerRequestId": "IEjDhwj4YO79bxvOOVB6",
      "endpoint": "https://api.elevenlabs.io/v1/text-to-speech/gIfqD5jrnhkFu8ENVbXC",
      "settingsHash": "a960c68f2bda1018b759544deec3e238190c7b171ebcd23d92826424863cea86"
    },
    "verification": {
      "mediaValid": true,
      "nonSilent": true,
      "clippingEvents": 0,
      "rawPeak": 0.21453857421875,
      "gainApplied": 3.5573605757216837,
      "peakProtectionEvents": 0,
      "outputPeak": 0.7631910443305969
    },
    "status": "GENERATED_VERIFIED_LOCAL_ONLY",
    "businessWordingApproved": true,
    "productionApproved": false,
    "binding": {
      "slot": {
        "kind": "EMAIL",
        "phraseId": "email-readback-intro",
        "candidate": "anna2.test-7@clinic.dk",
        "sourceTurnId": "synthetic-email-fixture",
        "recipientRevision": 1,
        "normalizationReviewed": true
      },
      "renderedValue": "a, en, en, a, to, punktum, te, e, es, te, bindestreg, syv, snabel-a, se, el, i, en, i, se, punktum, de, kå",
      "renderedText": "a, en, en, a, to, punktum, te, e, es, te, bindestreg, syv, snabel-a, se, el, i, en, i, se, punktum, de, kå",
      "textHash": "980bc70513f1df076e0d3f0c0b60ea8583af52ceb38b170acb668995f25a7c48",
      "phraseVersion": "stage-2.0c1-approved-1",
      "rendererVersion": "stage-2.0c2-deterministic-1",
      "cacheKey": "9104fa03fc1ad8ef10a5d21bf0a33e88dbdf64ed389b0701dd59c47b4e3288cb"
    }
  },
  {
    "phraseId": "receptionist-target-request",
    "wordingVersion": "stage-2.0c1-approved-1",
    "text": "Jeg ringer vedrørende faglig information til Anna Jensen. Kan jeg tale med vedkommende?",
    "textHash": "e9b2f10fbad1663bc27f64706e555b6c36fdae9ef9349fbe864c90d7290ebd6b",
    "assetHash": "4b2606b42d616b9bb23845a2e0eb452a12c2759c0bcb30abafe2c4f39ef7e706",
    "path": "http://127.0.0.1:5180/cache/a7c8e1e9879194c7fec9ac8c3073a330cb23fde60fdf93d62db37c8abc77d226.wav",
    "voice": {
      "provider": "ElevenLabs",
      "name": "Isabella",
      "voiceId": "gIfqD5jrnhkFu8ENVbXC",
      "modelId": "eleven_flash_v2_5",
      "speed": 0.95
    },
    "requestedSpeed": 0.95,
    "generatedAt": "2026-10-18T12:32:06.029Z",
    "duration": 5.20125,
    "samples": 124830,
    "sampleRate": 24000,
    "mediaFormat": "wav-pcm-s16le-mono",
    "provenance": {
      "verified": true,
      "method": "authenticated-provider-response-and-content-hash",
      "providerRequestId": "en59GnJmbrDbTjMUmh2D",
      "endpoint": "https://api.elevenlabs.io/v1/text-to-speech/gIfqD5jrnhkFu8ENVbXC",
      "settingsHash": "a960c68f2bda1018b759544deec3e238190c7b171ebcd23d92826424863cea86"
    },
    "verification": {
      "mediaValid": true,
      "nonSilent": true,
      "clippingEvents": 0,
      "rawPeak": 0.159881591796875,
      "gainApplied": 3.5573605757216837,
      "peakProtectionEvents": 0,
      "outputPeak": 0.5687564611434937
    },
    "status": "GENERATED_VERIFIED_LOCAL_ONLY",
    "businessWordingApproved": true,
    "productionApproved": false,
    "binding": {
      "slot": {
        "kind": "NAME",
        "phraseId": "receptionist-target-request",
        "name": {
          "original": "Anna Jensen",
          "source": "contact-data",
          "evidenceId": "synthetic-contact-fixture",
          "evidenceText": "SYNTHETIC rehearsal target: Anna Jensen",
          "reviewedBy": "local-rehearsal-fixture",
          "reviewedAt": "2026-10-18T00:00:00.000Z",
          "pronunciationConfirmed": true,
          "recipientRevision": 1
        }
      },
      "renderedValue": "Anna Jensen",
      "renderedText": "Jeg ringer vedrørende faglig information til Anna Jensen. Kan jeg tale med vedkommende?",
      "textHash": "e9b2f10fbad1663bc27f64706e555b6c36fdae9ef9349fbe864c90d7290ebd6b",
      "phraseVersion": "stage-2.0c1-approved-1",
      "rendererVersion": "stage-2.0c2-deterministic-1",
      "cacheKey": "a7c8e1e9879194c7fec9ac8c3073a330cb23fde60fdf93d62db37c8abc77d226"
    }
  },
  {
    "phraseId": "wrong-person-close",
    "wordingVersion": "stage-2.0c1-approved-1",
    "text": "Beklager. Kan du hjælpe mig med at komme i kontakt med Jens Hansen?",
    "textHash": "6fee826152271352a991de6a98c55f80d45007c312181ba1be38c3c12b97f536",
    "assetHash": "8059a8e716422e153f67cd5fa6b33d8a5e028416624c6faeff084b4f8b4c5667",
    "path": "http://127.0.0.1:5180/cache/a817e97e963f5083cd4e9803c210b4430ae300de611ad38918b843908e33a29c.wav",
    "voice": {
      "provider": "ElevenLabs",
      "name": "Isabella",
      "voiceId": "gIfqD5jrnhkFu8ENVbXC",
      "modelId": "eleven_flash_v2_5",
      "speed": 0.95
    },
    "requestedSpeed": 0.95,
    "generatedAt": "2026-10-18T12:32:09.876Z",
    "duration": 3.761625,
    "samples": 90279,
    "sampleRate": 24000,
    "mediaFormat": "wav-pcm-s16le-mono",
    "provenance": {
      "verified": true,
      "method": "authenticated-provider-response-and-content-hash",
      "providerRequestId": "BsTqfMWwsxSNSQxiseS7",
      "endpoint": "https://api.elevenlabs.io/v1/text-to-speech/gIfqD5jrnhkFu8ENVbXC",
      "settingsHash": "a960c68f2bda1018b759544deec3e238190c7b171ebcd23d92826424863cea86"
    },
    "verification": {
      "mediaValid": true,
      "nonSilent": true,
      "clippingEvents": 0,
      "rawPeak": 0.209381103515625,
      "gainApplied": 3.5573605757216837,
      "peakProtectionEvents": 0,
      "outputPeak": 0.7448440790176392
    },
    "status": "GENERATED_VERIFIED_LOCAL_ONLY",
    "businessWordingApproved": true,
    "productionApproved": false,
    "binding": {
      "slot": {
        "kind": "NAME",
        "phraseId": "wrong-person-close",
        "name": {
          "original": "Jens Hansen",
          "source": "contact-data",
          "evidenceId": "synthetic-contact-fixture",
          "evidenceText": "SYNTHETIC rehearsal target: Jens Hansen",
          "reviewedBy": "local-rehearsal-fixture",
          "reviewedAt": "2026-10-18T00:00:00.000Z",
          "pronunciationConfirmed": true,
          "recipientRevision": 1
        }
      },
      "renderedValue": "Jens Hansen",
      "renderedText": "Beklager. Kan du hjælpe mig med at komme i kontakt med Jens Hansen?",
      "textHash": "6fee826152271352a991de6a98c55f80d45007c312181ba1be38c3c12b97f536",
      "phraseVersion": "stage-2.0c1-approved-1",
      "rendererVersion": "stage-2.0c2-deterministic-1",
      "cacheKey": "a817e97e963f5083cd4e9803c210b4430ae300de611ad38918b843908e33a29c"
    }
  },
  {
    "phraseId": "email-readback-intro",
    "wordingVersion": "stage-2.0c1-approved-1",
    "text": "a, understregning, be, plus, to, snabel-a, eks, punktum, de, kå",
    "textHash": "2d85e82437e51f2c89fa83fa19c4cb93467f3f231a64ff1436ed6153e61359c3",
    "assetHash": "a2d4787ddba138fcfeff474ebc02d83001b5683291ed986c75a494bab4f02c31",
    "path": "http://127.0.0.1:5180/cache/ae99e612055486a9fd30f8d02b912fbc1fac796b272538e3523036e0854b2611.wav",
    "voice": {
      "provider": "ElevenLabs",
      "name": "Isabella",
      "voiceId": "gIfqD5jrnhkFu8ENVbXC",
      "modelId": "eleven_flash_v2_5",
      "speed": 0.95
    },
    "requestedSpeed": 0.95,
    "generatedAt": "2026-10-18T12:32:12.524Z",
    "duration": 5.479916666666667,
    "samples": 131518,
    "sampleRate": 24000,
    "mediaFormat": "wav-pcm-s16le-mono",
    "provenance": {
      "verified": true,
      "method": "authenticated-provider-response-and-content-hash",
      "providerRequestId": "UpsrkUfmwWgWaFdC0SmR",
      "endpoint": "https://api.elevenlabs.io/v1/text-to-speech/gIfqD5jrnhkFu8ENVbXC",
      "settingsHash": "a960c68f2bda1018b759544deec3e238190c7b171ebcd23d92826424863cea86"
    },
    "verification": {
      "mediaValid": true,
      "nonSilent": true,
      "clippingEvents": 0,
      "rawPeak": 0.155242919921875,
      "gainApplied": 3.5573605757216837,
      "peakProtectionEvents": 0,
      "outputPeak": 0.5522550344467163
    },
    "status": "GENERATED_VERIFIED_LOCAL_ONLY",
    "businessWordingApproved": true,
    "productionApproved": false,
    "binding": {
      "slot": {
        "kind": "EMAIL",
        "phraseId": "email-readback-intro",
        "candidate": "a_b+2@x.dk",
        "sourceTurnId": "synthetic-email-fixture",
        "recipientRevision": 1,
        "normalizationReviewed": true
      },
      "renderedValue": "a, understregning, be, plus, to, snabel-a, eks, punktum, de, kå",
      "renderedText": "a, understregning, be, plus, to, snabel-a, eks, punktum, de, kå",
      "textHash": "2d85e82437e51f2c89fa83fa19c4cb93467f3f231a64ff1436ed6153e61359c3",
      "phraseVersion": "stage-2.0c1-approved-1",
      "rendererVersion": "stage-2.0c2-deterministic-1",
      "cacheKey": "ae99e612055486a9fd30f8d02b912fbc1fac796b272538e3523036e0854b2611"
    }
  },
  {
    "phraseId": "authority-ask",
    "wordingVersion": "stage-2.0c1-approved-1",
    "text": "Må jeg lige bekræfte, at du er bemyndiget til at håndtere dette på vegne af Anna Jensen?",
    "textHash": "13bc1d0df0ae77bb18fec12f431262f6056fa2bdc6c9967dbcd10a89a66968bd",
    "assetHash": "8001fa92ce955d8aa28c602c88ab396ef1fa189e9fd52767a48f5b5b47287deb",
    "path": "http://127.0.0.1:5180/cache/bd626ebff422aff8dffe6a83682f69a9bddc0f8d05cc93039cd0197090ea3e96.wav",
    "voice": {
      "provider": "ElevenLabs",
      "name": "Isabella",
      "voiceId": "gIfqD5jrnhkFu8ENVbXC",
      "modelId": "eleven_flash_v2_5",
      "speed": 0.95
    },
    "requestedSpeed": 0.95,
    "generatedAt": "2026-10-18T12:32:06.622Z",
    "duration": 4.922625,
    "samples": 118143,
    "sampleRate": 24000,
    "mediaFormat": "wav-pcm-s16le-mono",
    "provenance": {
      "verified": true,
      "method": "authenticated-provider-response-and-content-hash",
      "providerRequestId": "UjuqvKHgSOxe4lMdUcHb",
      "endpoint": "https://api.elevenlabs.io/v1/text-to-speech/gIfqD5jrnhkFu8ENVbXC",
      "settingsHash": "a960c68f2bda1018b759544deec3e238190c7b171ebcd23d92826424863cea86"
    },
    "verification": {
      "mediaValid": true,
      "nonSilent": true,
      "clippingEvents": 0,
      "rawPeak": 0.1839599609375,
      "gainApplied": 3.5573605757216837,
      "peakProtectionEvents": 0,
      "outputPeak": 0.6544119119644165
    },
    "status": "GENERATED_VERIFIED_LOCAL_ONLY",
    "businessWordingApproved": true,
    "productionApproved": false,
    "binding": {
      "slot": {
        "kind": "NAME",
        "phraseId": "authority-ask",
        "name": {
          "original": "Anna Jensen",
          "source": "contact-data",
          "evidenceId": "synthetic-contact-fixture",
          "evidenceText": "SYNTHETIC rehearsal target: Anna Jensen",
          "reviewedBy": "local-rehearsal-fixture",
          "reviewedAt": "2026-10-18T00:00:00.000Z",
          "pronunciationConfirmed": true,
          "recipientRevision": 1
        }
      },
      "renderedValue": "Anna Jensen",
      "renderedText": "Må jeg lige bekræfte, at du er bemyndiget til at håndtere dette på vegne af Anna Jensen?",
      "textHash": "13bc1d0df0ae77bb18fec12f431262f6056fa2bdc6c9967dbcd10a89a66968bd",
      "phraseVersion": "stage-2.0c1-approved-1",
      "rendererVersion": "stage-2.0c2-deterministic-1",
      "cacheKey": "bd626ebff422aff8dffe6a83682f69a9bddc0f8d05cc93039cd0197090ea3e96"
    }
  },
  {
    "phraseId": "wrong-person-close",
    "wordingVersion": "stage-2.0c1-approved-1",
    "text": "Beklager. Kan du hjælpe mig med at komme i kontakt med Anna Jensen?",
    "textHash": "7a9308e5a723cbc5b74d138c5c0bb83984b6ee17924017a9b813d2f75555dc5d",
    "assetHash": "71c8572bfe9aa2f008ddc93605906e664a6279fc4361356210fe0d1c1c0de46a",
    "path": "http://127.0.0.1:5180/cache/dd5620b5bf17f06eb00a64c250cb1a3eee0f2874ab9e60dcbeae686667d4ef45.wav",
    "voice": {
      "provider": "ElevenLabs",
      "name": "Isabella",
      "voiceId": "gIfqD5jrnhkFu8ENVbXC",
      "modelId": "eleven_flash_v2_5",
      "speed": 0.95
    },
    "requestedSpeed": 0.95,
    "generatedAt": "2026-10-18T12:32:07.583Z",
    "duration": 3.9938333333333333,
    "samples": 95852,
    "sampleRate": 24000,
    "mediaFormat": "wav-pcm-s16le-mono",
    "provenance": {
      "verified": true,
      "method": "authenticated-provider-response-and-content-hash",
      "providerRequestId": "lxkdLiaLSSsIaN7kDOZQ",
      "endpoint": "https://api.elevenlabs.io/v1/text-to-speech/gIfqD5jrnhkFu8ENVbXC",
      "settingsHash": "a960c68f2bda1018b759544deec3e238190c7b171ebcd23d92826424863cea86"
    },
    "verification": {
      "mediaValid": true,
      "nonSilent": true,
      "clippingEvents": 0,
      "rawPeak": 0.193756103515625,
      "gainApplied": 3.5573605757216837,
      "peakProtectionEvents": 0,
      "outputPeak": 0.6892603039741516
    },
    "status": "GENERATED_VERIFIED_LOCAL_ONLY",
    "businessWordingApproved": true,
    "productionApproved": false,
    "binding": {
      "slot": {
        "kind": "NAME",
        "phraseId": "wrong-person-close",
        "name": {
          "original": "Anna Jensen",
          "source": "contact-data",
          "evidenceId": "synthetic-contact-fixture",
          "evidenceText": "SYNTHETIC rehearsal target: Anna Jensen",
          "reviewedBy": "local-rehearsal-fixture",
          "reviewedAt": "2026-10-18T00:00:00.000Z",
          "pronunciationConfirmed": true,
          "recipientRevision": 1
        }
      },
      "renderedValue": "Anna Jensen",
      "renderedText": "Beklager. Kan du hjælpe mig med at komme i kontakt med Anna Jensen?",
      "textHash": "7a9308e5a723cbc5b74d138c5c0bb83984b6ee17924017a9b813d2f75555dc5d",
      "phraseVersion": "stage-2.0c1-approved-1",
      "rendererVersion": "stage-2.0c2-deterministic-1",
      "cacheKey": "dd5620b5bf17f06eb00a64c250cb1a3eee0f2874ab9e60dcbeae686667d4ef45"
    }
  },
  {
    "phraseId": "intermediary-consent-question",
    "wordingVersion": "stage-2.0c1-approved-1",
    "text": "Tak. Må aPureBase sende relevant faglig information via e-mail til Anna Jensen?",
    "textHash": "447793ab03fee6e30707b35fc402d591a22300f499b12d281fad456f5c5d0e35",
    "assetHash": "80d93ed36b0ca3ebaa17cc69b49f11184a3e2a0e707ee763eac14a8d9e4028c4",
    "path": "http://127.0.0.1:5180/cache/eac711239c016d763cf4fb27f3ca80f2bdb8e6248fe6aac79944f5aeb52d632b.wav",
    "voice": {
      "provider": "ElevenLabs",
      "name": "Isabella",
      "voiceId": "gIfqD5jrnhkFu8ENVbXC",
      "modelId": "eleven_flash_v2_5",
      "speed": 0.95
    },
    "requestedSpeed": 0.95,
    "generatedAt": "2026-10-18T12:32:07.117Z",
    "duration": 5.0155,
    "samples": 120372,
    "sampleRate": 24000,
    "mediaFormat": "wav-pcm-s16le-mono",
    "provenance": {
      "verified": true,
      "method": "authenticated-provider-response-and-content-hash",
      "providerRequestId": "RJr2RuYrDluEaNFV3kpk",
      "endpoint": "https://api.elevenlabs.io/v1/text-to-speech/gIfqD5jrnhkFu8ENVbXC",
      "settingsHash": "a960c68f2bda1018b759544deec3e238190c7b171ebcd23d92826424863cea86"
    },
    "verification": {
      "mediaValid": true,
      "nonSilent": true,
      "clippingEvents": 0,
      "rawPeak": 0.158599853515625,
      "gainApplied": 3.5573605757216837,
      "peakProtectionEvents": 0,
      "outputPeak": 0.5641968846321106
    },
    "status": "GENERATED_VERIFIED_LOCAL_ONLY",
    "businessWordingApproved": true,
    "productionApproved": false,
    "binding": {
      "slot": {
        "kind": "NAME",
        "phraseId": "intermediary-consent-question",
        "name": {
          "original": "Anna Jensen",
          "source": "contact-data",
          "evidenceId": "synthetic-contact-fixture",
          "evidenceText": "SYNTHETIC rehearsal target: Anna Jensen",
          "reviewedBy": "local-rehearsal-fixture",
          "reviewedAt": "2026-10-18T00:00:00.000Z",
          "pronunciationConfirmed": true,
          "recipientRevision": 1
        }
      },
      "renderedValue": "Anna Jensen",
      "renderedText": "Tak. Må aPureBase sende relevant faglig information via e-mail til Anna Jensen?",
      "textHash": "447793ab03fee6e30707b35fc402d591a22300f499b12d281fad456f5c5d0e35",
      "phraseVersion": "stage-2.0c1-approved-1",
      "rendererVersion": "stage-2.0c2-deterministic-1",
      "cacheKey": "eac711239c016d763cf4fb27f3ca80f2bdb8e6248fe6aac79944f5aeb52d632b"
    }
  },
  {
    "phraseId": "authority-ask",
    "wordingVersion": "stage-2.0c1-approved-1",
    "text": "Må jeg lige bekræfte, at du er bemyndiget til at håndtere dette på vegne af Jens Hansen?",
    "textHash": "bfea9fcc9b142382bbea10364d3dbfd6061e6fcee7cd66c78b9966d82114ad9b",
    "assetHash": "6f1d62ef73a355a81211be1ddbd439fddd238f4720cf28a9226561fbd490c01b",
    "path": "http://127.0.0.1:5180/cache/ec9607700680e1898f24a6f56c779d549ace09cf64aa5652cadf1a8b33afcc54.wav",
    "voice": {
      "provider": "ElevenLabs",
      "name": "Isabella",
      "voiceId": "gIfqD5jrnhkFu8ENVbXC",
      "modelId": "eleven_flash_v2_5",
      "speed": 0.95
    },
    "requestedSpeed": 0.95,
    "generatedAt": "2026-10-18T12:32:08.541Z",
    "duration": 4.551125,
    "samples": 109227,
    "sampleRate": 24000,
    "mediaFormat": "wav-pcm-s16le-mono",
    "provenance": {
      "verified": true,
      "method": "authenticated-provider-response-and-content-hash",
      "providerRequestId": "gCptWtrGIePSlbkArsMI",
      "endpoint": "https://api.elevenlabs.io/v1/text-to-speech/gIfqD5jrnhkFu8ENVbXC",
      "settingsHash": "a960c68f2bda1018b759544deec3e238190c7b171ebcd23d92826424863cea86"
    },
    "verification": {
      "mediaValid": true,
      "nonSilent": true,
      "clippingEvents": 0,
      "rawPeak": 0.244476318359375,
      "gainApplied": 3.5573605757216837,
      "peakProtectionEvents": 0,
      "outputPeak": 0.8696904182434082
    },
    "status": "GENERATED_VERIFIED_LOCAL_ONLY",
    "businessWordingApproved": true,
    "productionApproved": false,
    "binding": {
      "slot": {
        "kind": "NAME",
        "phraseId": "authority-ask",
        "name": {
          "original": "Jens Hansen",
          "source": "contact-data",
          "evidenceId": "synthetic-contact-fixture",
          "evidenceText": "SYNTHETIC rehearsal target: Jens Hansen",
          "reviewedBy": "local-rehearsal-fixture",
          "reviewedAt": "2026-10-18T00:00:00.000Z",
          "pronunciationConfirmed": true,
          "recipientRevision": 1
        }
      },
      "renderedValue": "Jens Hansen",
      "renderedText": "Må jeg lige bekræfte, at du er bemyndiget til at håndtere dette på vegne af Jens Hansen?",
      "textHash": "bfea9fcc9b142382bbea10364d3dbfd6061e6fcee7cd66c78b9966d82114ad9b",
      "phraseVersion": "stage-2.0c1-approved-1",
      "rendererVersion": "stage-2.0c2-deterministic-1",
      "cacheKey": "ec9607700680e1898f24a6f56c779d549ace09cf64aa5652cadf1a8b33afcc54"
    }
  }
];
export type ReviewAsset = VerifiedAsset | DynamicAsset;
export const reviewKey = (a: ReviewAsset) => [a.textHash,a.assetHash,a.voice.voiceId,a.voice.modelId,a.voice.speed,'isabella-calibrated-headroom-v2'].join(':');
export const listeningCatalog: readonly ReviewAsset[] = [...verifiedAssets.filter((a,i,all)=>all.findIndex(b=>b.assetHash===a.assetHash)===i),...cachedDynamicAssets];

export const playbackCatalog: readonly ReviewAsset[] = [...verifiedAssets,...cachedDynamicAssets];
