export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const language = (value: unknown): 'da' | 'en' => {
  if (value !== 'da' && value !== 'en') throw new ApiError(400, 'Language must be da or en.');
  return value;
};
export const textField = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 4000) throw new ApiError(400, 'A complete turn of 1–4000 characters is required.');
  return value;
};
export async function openAI(path: string, body: string | FormData, signal?: AbortSignal) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new ApiError(503, 'Set OPENAI_API_KEY in .env and restart the server.');
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  if (typeof body === 'string') headers['Content-Type'] = 'application/json';
  const response = await fetch(`https://api.openai.com/v1/${path}`, { method: 'POST', headers, body,
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(90000)]) : AbortSignal.timeout(90000) });
  if (!response.ok) throw new ApiError(502, `OpenAI ${path.split('/')[0]} request failed (${response.status}). Check model access, configuration and billing.`);
  return response;
}
