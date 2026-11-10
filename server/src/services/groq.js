// Groq API (OpenAI-compatible REST): Whisper speech-to-text and a chat model
// for JSON tasks. Used when GROQ_API_KEY is set.
import * as z from 'zod/v4';
import { config } from '../config.js';

const BASE = 'https://api.groq.com/openai/v1';
export const groqEnabled = () => !!config.groqKey;

const EXT = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' };

// language: 'ur' | 'en' | undefined. Forcing 'ur' keeps Urdu speech in Urdu
// script (auto-detect often returns Hindi Devanagari for Urdu speakers).
export async function transcribe(buffer, mime, language) {
  const form = new FormData();
  const type = mime.split(';')[0];
  form.append('file', new Blob([buffer], { type }), `audio.${EXT[type] || 'webm'}`);
  form.append('model', config.groqSttModel);
  form.append('response_format', 'json');
  form.append('temperature', '0');
  if (language) form.append('language', language);
  if (language === 'ur') form.append('prompt', 'یہ اردو میں گفتگو ہے۔ بجلی، پلمبر، اے سی، جی نائن، ایف ٹین، روپے، سال۔');
  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.groqKey}` },
    body: form,
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`groq_stt_${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return String(data.text || '').trim();
}

// Asks the chat model for a JSON object and validates it with a zod schema.
export async function chatJson(system, user, schema, { maxTokens = 800 } = {}) {
  // The JSON schema (types, allowed values, descriptions) goes in the prompt.
  const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.groqLlmModel,
      temperature: 0.1,
      // Reasoning models spend tokens thinking before answering; keep effort low and leave room.
      ...(config.groqLlmModel.includes('gpt-oss') ? { reasoning_effort: 'low' } : {}),
      max_completion_tokens: Math.max(maxTokens, 1500),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${system}\nRespond with a single JSON object that matches this JSON schema exactly (use the exact enum values, numbers as numbers):
${jsonSchema}` },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`groq_llm_${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const parsed = schema.safeParse(JSON.parse(data.choices?.[0]?.message?.content || '{}'));
  if (!parsed.success) throw new Error(`groq_llm_bad_json: ${JSON.stringify(parsed.error.issues.map((i) => [i.path.join('.'), i.message])).slice(0, 300)}`);
  return parsed.data;
}
