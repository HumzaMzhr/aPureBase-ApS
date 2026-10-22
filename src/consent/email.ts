/** Extraction is not spelling repair. Do not lowercase or invent any characters. */
export function emailCandidate(text: string): { normalizedCandidate: string; normalizationChanged: boolean } | undefined {
  const match = /^(?:(?:min )?(?:e-mail(?:adresse)?|mail(?:adresse)?) er )?([^\s@]+@[^\s@]+)$/iu.exec(text.trim());
  if (!match) return;
  const captured = match[1];
  // Removing a final transcript punctuation mark is a character change and must
  // be explicitly reviewed. No other normalization is attempted.
  const candidate = captured.endsWith('.') ? captured.slice(0, -1) : captured;
  if (!/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/iu.test(candidate)) return;
  return { normalizedCandidate: candidate, normalizationChanged: candidate !== captured };
}
