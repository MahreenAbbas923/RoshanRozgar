// AI features. Every function returns a `source` field so the UI can say
// honestly which provider (Claude, Groq) or the built-in keyword matcher
// produced the result. Without an API key nothing pretends to be AI.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import * as z from 'zod/v4';
import { config } from '../config.js';
import { groqEnabled, chatJson, transcribe } from './groq.js';
import {
  CATEGORIES,
  CATEGORY_KEYS,
  getCategory,
  classifyJobText,
  detectLanguage,
  extractName,
  parseArea,
  parseExperienceYears,
  parseRate,
  hasUrduScript,
} from '../../../shared/index.js';

const client = config.anthropicKey ? new Anthropic({ apiKey: config.anthropicKey, timeout: 30_000, maxRetries: 1 }) : null;

// Language model used for text tasks: Claude first, then Groq.
const llmProvider = () => (client ? 'claude' : groqEnabled() ? 'groq' : null);

export const aiStatus = () => {
  const provider = llmProvider();
  return {
    provider: provider || 'keywords',
    model: provider === 'claude' ? config.aiModel : provider === 'groq' ? config.groqLlmModel : null,
    stt: groqEnabled() ? 'groq' : 'browser',
    sttModel: groqEnabled() ? config.groqSttModel : null,
  };
};

async function askClaude(system, user, schema, maxTokens) {
  const response = await client.messages.parse({
    model: config.aiModel,
    max_tokens: maxTokens,
    output_config: { effort: 'low', format: zodOutputFormat(schema) },
    system,
    messages: [{ role: 'user', content: user }],
  });
  if (response.stop_reason === 'refusal' || !response.parsed_output) throw new Error(`claude_${response.stop_reason}`);
  return response.parsed_output;
}

async function askLLM(system, user, schema, maxTokens = 1024) {
  const provider = llmProvider();
  if (provider === 'claude') return { out: await askClaude(system, user, schema, maxTokens), source: 'claude', model: config.aiModel };
  if (provider === 'groq') return { out: await chatJson(system, user, schema, { maxTokens }), source: 'groq', model: config.groqLlmModel };
  throw new Error('no_llm');
}

// ---------- Speech to text ----------

const RomanOut = z.object({ roman: z.string() });

// Transcribes a voice clip. `lang` is the speaker's language choice:
// ur -> Urdu script, roman -> Urdu transcribed then written in Latin letters, en -> English.
export async function transcribeAudio(buffer, mime, lang = 'ur') {
  if (!groqEnabled()) return { text: '', source: 'unavailable' };
  let text = await transcribe(buffer, mime, lang === 'en' ? 'en' : 'ur');
  if (lang === 'roman' && hasUrduScript(text)) text = (await toRoman(text)) || text;
  return { text, source: 'groq', model: config.groqSttModel };
}

async function toRoman(urdu) {
  try {
    const { out } = await askLLM(
      'Transliterate the Urdu text into Roman Urdu (Urdu written with English letters, the way Pakistanis text, e.g. "Mera naam Ali hai"). Keep numbers as digits. Do not translate.',
      urdu,
      RomanOut,
      400,
    );
    return out.roman;
  } catch (err) {
    console.warn('[ai] roman transliteration failed:', err.message);
    return null;
  }
}

// ---------- Job understanding ----------

const JobAnalysis = z.object({
  category: z.enum(CATEGORY_KEYS),
  title: z.string().describe('Short English title, max 6 words, e.g. "Switchboard sparking"'),
  summary_en: z.string().describe('One clear English sentence describing the problem'),
  urgency: z.enum(['high', 'normal', 'low']),
  when: z.enum(['now', 'tomorrow', 'unspecified']),
  budget_pkr: z.number().nullable().describe('Budget in rupees if the customer mentioned one, else null'),
  likely_issue: z.string().describe('Most likely cause in plain English, max 8 words'),
  confidence: z.number().describe('0 to 1'),
});

const JOB_SYSTEM = `You help Pakistani households describe home-repair problems to local tradespeople.
Input may be English, Urdu script, or Roman Urdu, often from speech-to-text with errors.
Pick the single best service category: ${CATEGORIES.map((c) => `${c.key} (${c.names.en})`).join(', ')}.
Fridges and freezers belong to ac_repair. Fans, lights and switchboards belong to electrician.
urgency is one of high/normal/low; when is one of now/tomorrow/unspecified.
Do not invent details that are not in the text.`;

// Title from the sentence that names the actual problem (most matched keywords),
// e.g. "Ek switch kharab hai" rather than "Mujhe electrician chahiye".
function keywordTitle(category, text, matched = []) {
  const sentences = String(text).replace(/\s+/g, ' ').trim().split(/[.!?۔،]/).map((s) => s.trim()).filter(Boolean);
  const catWords = Object.values(getCategory(category).names).map((n) => n.toLowerCase());
  const score = (s) => matched.filter((k) => !catWords.includes(k.toLowerCase()) && s.toLowerCase().includes(k.toLowerCase())).length;
  const first = sentences.sort((a, b) => score(b) - score(a))[0];
  if (!first) return getCategory(category).names.en;
  if (first.length <= 48) return first;
  const cut = first.slice(0, 48);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 20 ? cut.lastIndexOf(' ') : 48)}…`;
}

export async function analyzeJob(text) {
  const kw = classifyJobText(text);
  const base = {
    language: kw.language,
    priceRange: getCategory(kw.category).priceRange,
  };
  if (llmProvider() && text.trim().length > 2) {
    try {
      const { out, source, model } = await askLLM(JOB_SYSTEM, `Customer said:\n"""${text}"""`, JobAnalysis);
      return {
        ...base,
        source,
        model,
        category: out.category,
        title: out.title,
        summary: out.summary_en,
        likelyIssue: out.likely_issue,
        urgency: out.urgency,
        when: out.when === 'unspecified' ? null : out.when,
        budget: out.budget_pkr || kw.budget || null,
        confidence: Math.max(0, Math.min(1, out.confidence)),
        priceRange: getCategory(out.category).priceRange,
      };
    } catch (err) {
      console.warn('[ai] job analysis failed, using keyword matcher:', err.message);
      base.fallbackReason = 'ai_error';
    }
  }
  return {
    ...base,
    source: 'keywords',
    category: kw.category,
    title: keywordTitle(kw.category, text, kw.matchedKeywords),
    summary: null,
    likelyIssue: null,
    matchedKeywords: kw.matchedKeywords,
    urgency: kw.urgency,
    when: kw.when,
    budget: kw.budget,
    confidence: kw.confidence,
  };
}

// ---------- Spoken form answers ----------

const FieldOut = z.object({ value: z.union([z.string(), z.number()]).nullable() });

const FIELD_RULES = {
  name: (t) => extractName(t) || null,
  area: (t) => parseArea(t),
  experience: (t) => parseExperienceYears(t),
  rate: (t) => parseRate(t),
  trade: (t) => {
    const c = classifyJobText(t);
    return c.matchedKeywords.length ? c.category : null;
  },
  address: (t) => String(t).trim() || null,
};

const FIELD_PROMPTS = {
  name: "Return only the person's name, written in the same script they used. Null if no name.",
  area: `Return the area key from this list that the speaker means, or null: F-6, F-7, F-8, F-10, F-11, E-11, G-6, G-8, G-9, G-10, G-11, G-13, I-8, I-10, Bani Gala, Satellite Town, Westridge, Saddar, Chaklala, PWD, Bahria Town, DHA.`,
  experience: 'Return the number of years of work experience as a number, or null.',
  rate: 'Return the price per visit in Pakistani rupees as a number, or null.',
  trade: `Return the trade key from: ${CATEGORY_KEYS.join(', ')}, or null.`,
};

// Rules run first (fast, offline); the language model is used only when the
// rules cannot find an answer, e.g. unusual phrasing.
export async function extractField(field, text) {
  const rule = FIELD_RULES[field];
  if (!rule) return { value: null, source: 'none' };
  const ruled = rule(text);
  if (ruled !== null && ruled !== undefined && ruled !== '') return { value: ruled, source: 'rules' };
  if (!llmProvider() || !FIELD_PROMPTS[field]) return { value: null, source: 'rules' };
  try {
    const { out, source } = await askLLM(
      `A person in Pakistan is answering a sign-up question by voice (speech-to-text, may be Urdu, Roman Urdu or English). ${FIELD_PROMPTS[field]}`,
      text,
      FieldOut,
      200,
    );
    let value = out.value;
    if (value != null && (field === 'experience' || field === 'rate')) value = Number(String(value).replace(/[^\d]/g, '')) || null;
    if (field === 'trade' && !CATEGORY_KEYS.includes(value)) value = null;
    if (field === 'area' && !parseArea(String(value || ''))) value = null;
    else if (field === 'area') value = parseArea(String(value));
    return { value, source };
  } catch (err) {
    console.warn('[ai] field extraction failed:', err.message);
    return { value: null, source: 'rules' };
  }
}

// ---------- Translation of chat messages / transcripts ----------

const TranslationOut = z.object({
  translation: z.string(),
  detected_language: z.enum(['en', 'ur', 'roman']),
});

const LANG_NAMES = { en: 'English', ur: 'Urdu (Urdu script)', roman: 'Roman Urdu (Urdu written in Latin letters)' };

export async function translate(text, target) {
  const detected = detectLanguage(text);
  if (detected === target) return { translation: text, source: 'none', detected, same: true };
  if (!llmProvider()) return { translation: null, source: 'unavailable', detected };
  try {
    const { out, source } = await askLLM(
      `Translate short chat messages between a customer and a tradesperson in Pakistan. Keep prices, times and names exact. Translate into ${LANG_NAMES[target]}. detected_language is en, ur or roman.`,
      text,
      TranslationOut,
      600,
    );
    return { translation: out.translation, source, detected: out.detected_language };
  } catch (err) {
    console.warn('[ai] translation failed:', err.message);
    return { translation: null, source: 'error', detected };
  }
}

// ---------- Review summary for trust ----------

const ReviewSummaryOut = z.object({
  summary: z.string().describe('Max 8 words, e.g. "Punctual, fair prices, expert at wiring"'),
  strengths: z.array(z.string()).max(3),
  concerns: z.array(z.string()).max(2),
});

const summaryCache = new Map();

// Cached per worker until their review count changes.
export async function summarizeReviewsFor(workerId, reviews) {
  const hit = summaryCache.get(workerId);
  if (hit && hit.count === reviews.length) return hit.value;
  const value = await summarizeReviews(reviews);
  summaryCache.set(workerId, { count: reviews.length, value });
  return value;
}

export async function summarizeReviews(reviews) {
  const usable = reviews.filter((r) => r.text || r.transcript);
  const tagCounts = {};
  for (const r of reviews) for (const t of r.tags || []) tagCounts[t] = (tagCounts[t] || 0) + 1;
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, count }));
  if (!llmProvider() || usable.length < 2) return { source: 'stats', topTags, count: reviews.length };
  try {
    const body = usable
      .slice(0, 40)
      .map((r) => `- ${r.rating}/5: ${r.text || r.transcript}`)
      .join('\n');
    const { out, source, model } = await askLLM(
      'Summarise customer reviews of a tradesperson for the next customer deciding whether to hire them. Be factual and balanced; mention a concern only if several reviews raise it. summary is max 8 words in English; strengths max 3 items; concerns max 2 items.',
      body,
      ReviewSummaryOut,
      400,
    );
    return { source, model, ...out, topTags, count: reviews.length };
  } catch (err) {
    console.warn('[ai] review summary failed:', err.message);
    return { source: 'stats', topTags, count: reviews.length };
  }
}
