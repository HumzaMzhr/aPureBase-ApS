export interface PossibleEmail { value?: string; needsManual: boolean; confirmed: boolean }
export const literalEmails = (text: string) => text.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+/gi) ?? [];
export function extractEmail(original: string): PossibleEmail | undefined {
  const literal = literalEmails(original);
  if (literal.length) return { value: literal[0], needsManual: literal.length > 1, confirmed: false };
  if (/e-?mail(?:adresse)?|email address/i.test(original) && /\b[\w.-]+\.(?:dk|com)\b/i.test(original)) return { needsManual: true, confirmed: false };
  if (!/snabel\s*-?\s*a|\bat\b|@|(?:e-mailadresse|email address)\s+(?:er|is|:)/i.test(original)) return undefined;
  // Spoken punctuation conversion is a suggestion only; original text is never modified.
  const normalized = original.replace(/snabel\s*-?\s*a|\bat\b/gi, '@').replace(/punktum|\bdot\b/gi, '.').replace(/bindestreg|\bhyphen\b/gi, '-');
  const at = normalized.indexOf('@');
  if (at >= 0) {
    const left = normalized.slice(0, at).match(/([\w.-]+(?:\s*[.-]\s*[\w-]+)*)\s*$/)?.[1];
    const right = normalized.slice(at + 1).match(/^\s*([\w-]+(?:\s*\.\s*[\w-]+)*?\s*\.\s*(?:dk|com|net|org|edu|uk))\b/i)?.[1];
    const value = left && right ? `${left}@${right}`.replace(/\s+/g, '') : undefined;
    return { value, needsManual: true, confirmed: false };
  }
  return { needsManual: true, confirmed: false };
}
export function protectTokens(original: string, extraTerms:string[] = []) {
  const tokens = [...new Set([...literalEmails(original), ...[...extraTerms,'aPureBase', 'Example Pharma', 'Humza', 'Pernille', 'Isabella'].filter(t => original.includes(t))])].sort((a, b) => b.length - a.length);
  let text = original;
  const replacements: { token: string; marker: string; count: number }[] = [];
  tokens.forEach(token => {
    // A name inside a protected email has already been replaced as part of that address.
    if (!text.includes(token)) return;
    const marker = `__KEEP_${replacements.length}__`;
    const count = text.split(token).length - 1;
    replacements.push({ token, marker, count }); text = text.split(token).join(marker);
  });
  return { text, preview(translated:string){for(const {token,marker}of replacements)translated=translated.split(marker).join(token);return translated.replace(/__[A-Z_\d]*$/,'');}, restore(translated: string) {
    replacements.forEach(({ token, marker, count }) => {
      if (translated.split(marker).length - 1 !== count) throw new Error('Protected token omitted or duplicated by translation. Human verification required.');
      translated = translated.split(marker).join(token);
    });
    return translated;
  } };
}
