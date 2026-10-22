/** Wording freeze candidate only: business/native review is still required. */
export const consentScope = Object.freeze({
  id: 'apurebase-professional-information-by-email-v1', purpose: 'professional information',
  action: 'send', channel: 'email', recipientScope: 'the identified target healthcare professional, directly or through an explicitly authorized intermediary',
  organization: 'aPureBase', version: 1,
});
export const canonicalConsent = Object.freeze({
  phraseId: 'consent-question', text: 'Må aPureBase sende faglig information via e-mail til den relevante sundhedsperson?',
  english: 'May aPureBase send professional information by email to the healthcare professional concerned?',
  scopeId: consentScope.id, version: '2.0b2-draft-1', textHash: '788f1d0e7056a9410955049268505d04c40631bf1892e8d961d6d1555b5c5ad0', critical: true,
});
export async function textHash(text: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('');
}
/** A future approved asset must bind bytes AND the exact UTF-8 text/version.
 * This validates metadata only; it does not enable a playback transport. */
export async function validateAssetBinding(phrase: { id: string; text: string; version: string }, asset: { phraseId: string; phraseVersion: string; textHash: string; assetHash: string }, bytes: Uint8Array<ArrayBuffer>) {
  const actual = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  if (asset.phraseId !== phrase.id || asset.phraseVersion !== phrase.version || asset.textHash !== await textHash(phrase.text) || asset.assetHash !== actual) throw new Error('Asset text/version/content binding is invalid; approval must be renewed.');
}
