export function modelConfig() {
  return {
    textStreaming: true,
    streamingTranslation: process.env.STREAMING_TRANSLATION_MODEL || 'gpt-6-luna',
    agentSilenceMs: Number(process.env.AGENT_SILENCE_MS || 450),
    clinicSilenceMs: Number(process.env.CLINIC_SILENCE_MS || 1350),
    transcriptionMode: process.env.OPENAI_TRANSCRIPTION_MODE || 'file',
    liveTranscription: process.env.OPENAI_LIVE_TRANSCRIBE_MODEL || 'gpt-live-transcribe',
    transcription: process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-transcribe',
    translation: process.env.OPENAI_TRANSLATION_MODEL || 'gpt-4.1-mini',
    speech: process.env.OPENAI_SPEECH_MODEL || 'gpt-4o-mini-tts',
    voice: process.env.OPENAI_VOICE || 'marin',
    clinicVoice: process.env.OPENAI_CLINIC_VOICE || 'cedar',
    carefulTranslation: process.env.OPENAI_CAREFUL_TRANSLATION_MODEL || 'gpt-5.5',
    reasoning: process.env.OPENAI_TRANSLATION_REASONING || 'none'
  };
}
export const speechInstructions = (language: 'da' | 'en') => `Speak only the provided text in ${language === 'da' ? 'Danish, with clear standard Danish pronunciation' : 'English, with clear natural pronunciation'}. Professional, calm and conversational telephone delivery. Natural pacing, unhurried and articulate, with gentle sentence pauses. Preserve names and pronounce numbers carefully. No extra words or commentary.`;
