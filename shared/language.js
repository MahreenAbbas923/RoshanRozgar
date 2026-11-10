// Rule-based language helpers for English, Urdu script and Roman Urdu.
// Used to read spoken answers (names, numbers, areas) and as the offline
// fallback job classifier when no AI provider is configured.
import { CATEGORIES, AREAS } from './constants.js';

const URDU_DIGITS = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };
const ARABIC_DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };

export function normalizeDigits(text = '') {
  return String(text).replace(/[۰-۹٠-٩]/g, (d) => URDU_DIGITS[d] || ARABIC_DIGITS[d] || d);
}

export function hasUrduScript(text = '') {
  return /[؀-ۿ]/.test(text);
}

const NUMBER_WORDS = {
  // English
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000,
  // Roman Urdu
  ek: 1, aik: 1, do: 2, teen: 3, char: 4, chaar: 4, panch: 5, paanch: 5, chay: 6, chhe: 6, che: 6, saat: 7, sat: 7,
  aath: 8, ath: 8, nau: 9, no: 9, das: 10, dus: 10, gyarah: 11, gyara: 11, barah: 12, bara: 12, terah: 13, chodah: 14,
  pandrah: 15, pandra: 15, solah: 16, satrah: 17, atharah: 18, unees: 19, bees: 20, pachees: 25, tees: 30,
  chalees: 40, pachas: 50, pachaas: 50, saath: 60, sattar: 70, assi: 80, nabbe: 90,
  sau: 100, so: 100, hazar: 1000, hazaar: 1000,
  // Urdu script
  'ایک': 1, 'دو': 2, 'تین': 3, 'چار': 4, 'پانچ': 5, 'چھ': 6, 'سات': 7, 'آٹھ': 8, 'نو': 9, 'دس': 10,
  'گیارہ': 11, 'بارہ': 12, 'تیرہ': 13, 'چودہ': 14, 'پندرہ': 15, 'سولہ': 16, 'سترہ': 17, 'اٹھارہ': 18, 'انیس': 19,
  'بیس': 20, 'پچیس': 25, 'تیس': 30, 'چالیس': 40, 'پچاس': 50, 'ساٹھ': 60, 'ستر': 70, 'اسی': 80, 'نوے': 90,
  'سو': 100, 'ہزار': 1000,
};

// Ambiguous short Roman words that are usually not numbers in a sentence.
const AMBIGUOUS = new Set(['do', 'no', 'so', 'sat', 'che']);

function tokenize(text) {
  return normalizeDigits(text)
    .toLowerCase()
    .replace(/rs\.?|rupees?|rupay|روپے|روپیہ/g, ' ')
    .replace(/(\d),(\d)/g, '$1$2')
    .split(/[\s,.!?،۔\-/]+/)
    .filter(Boolean);
}

// Returns every number found in the text, combining spoken words like
// "pandrah sau" (1500) or "ek hazar paanch sau" (1500).
export function parseNumbers(text = '') {
  const tokens = tokenize(text);
  const out = [];
  let total = 0;
  let current = 0;
  let active = false;
  const flush = () => {
    if (active) out.push(total + current);
    total = 0;
    current = 0;
    active = false;
  };
  tokens.forEach((tok, i) => {
    if (/^\d+(k)?$/.test(tok)) {
      const n = tok.endsWith('k') ? parseInt(tok, 10) * 1000 : parseInt(tok, 10);
      if (active && (n === 100 || n === 1000)) {
        // e.g. "15 hundred"
        current = (current || 1) * n;
      } else {
        flush();
        current = n;
        active = true;
      }
      return;
    }
    const v = NUMBER_WORDS[tok];
    if (v === undefined) {
      flush();
      return;
    }
    if (AMBIGUOUS.has(tok)) {
      // Treat "do"/"no"/"so" as numbers only next to another number word.
      const prev = tokens[i - 1];
      const next = tokens[i + 1];
      const nearNumber = [prev, next].some((t) => t && (NUMBER_WORDS[t] !== undefined || /^\d+$/.test(t)) && !AMBIGUOUS.has(t));
      if (!nearNumber && !active) return;
    }
    if (v === 100) {
      current = (current || 1) * 100;
    } else if (v === 1000) {
      total += (current || 1) * 1000;
      current = 0;
    } else {
      current += v;
    }
    active = true;
  });
  flush();
  return out;
}

export function parseFirstNumber(text) {
  const nums = parseNumbers(text);
  return nums.length ? nums[0] : null;
}

// Experience: prefer a number next to "year/saal/سال"; otherwise first small number.
export function parseExperienceYears(text = '') {
  const t = normalizeDigits(text).toLowerCase();
  const nums = parseNumbers(t);
  if (!nums.length) return null;
  const small = nums.find((n) => n > 0 && n <= 60);
  return small ?? null;
}

// Rate: prefer the largest plausible rupee amount.
export function parseRate(text = '') {
  const nums = parseNumbers(text).filter((n) => n >= 100 && n <= 100000);
  if (!nums.length) return null;
  return Math.max(...nums);
}

const NAME_FILLERS = [
  'my name is', 'my name', 'name is', 'i am', "i'm", 'this is', 'mera naam', 'mera nam', 'mera name', 'naam', 'hai', 'hain',
  'he', 'hy', 'ji', 'main', 'mein', 'hoon', 'hun',
  'میرا نام', 'نام', 'ہے', 'ہیں', 'میں', 'ہوں', 'جی',
];

export function extractName(text = '') {
  let t = ` ${String(text).trim()} `;
  for (const f of NAME_FILLERS.sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`(^|\\s)${f.replace(/[.*+?^${}()|[\]\\']/g, '\\$&')}(?=\\s|$)`, 'gi');
    t = t.replace(re, ' ');
  }
  t = t.replace(/[.,!?،۔]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (hasUrduScript(t)) return t;
  return t
    .split(' ')
    .slice(0, 4)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

const LETTER_WORDS = {
  f: 'F', ef: 'F', eff: 'F', 'ایف': 'F',
  g: 'G', ji: 'G', gee: 'G', jee: 'G', 'جی': 'G',
  i: 'I', aai: 'I', eye: 'I', 'آئی': 'I',
  e: 'E', ee: 'E', 'ای': 'E',
};

// Finds a seeded area mentioned in free speech, e.g. "G nine", "ایف ٹین", "bahria town".
export function parseArea(text = '') {
  const raw = normalizeDigits(text).toLowerCase();
  // Named areas first (English / Roman / Urdu names).
  for (const a of AREAS) {
    const names = [a.key, a.names.en, a.names.ur, a.names.roman].map((n) => n.toLowerCase());
    if (names.some((n) => n.length > 3 && raw.includes(n))) return a.key;
  }
  // Compact form: f10, f-10, g 9
  const compact = raw.match(/\b([efgi])\s*-?\s*(\d{1,2})\b/);
  if (compact) {
    const key = `${compact[1].toUpperCase()}-${parseInt(compact[2], 10)}`;
    if (AREAS.some((a) => a.key === key)) return key;
  }
  // Spoken letter + number words: "jee nine", "ایف ٹین", "ef das"
  const tokens = raw.split(/[\s,.\-]+/).filter(Boolean);
  const EN_NUM = { six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, thirteen: 13, sikh: 6, sex: 6, 'سکس': 6, 'سیون': 7, 'ایٹ': 8, 'نائن': 9, 'ٹین': 10, 'الیون': 11, 'تھرٹین': 13 };
  for (let i = 0; i < tokens.length - 1; i++) {
    const letter = LETTER_WORDS[tokens[i]];
    if (!letter) continue;
    const nTok = tokens[i + 1];
    let n = EN_NUM[nTok];
    if (n === undefined) n = NUMBER_WORDS[nTok];
    if (n === undefined && /^\d+$/.test(nTok)) n = parseInt(nTok, 10);
    if (n === undefined) continue;
    const key = `${letter}-${n}`;
    if (AREAS.some((a) => a.key === key)) return key;
  }
  return null;
}

export function detectLanguage(text = '') {
  if (hasUrduScript(text)) return 'ur';
  const romanMarkers = /\b(hai|hain|mujhe|mera|meri|kharab|chahiye|nahi|kar|raha|rahi|ghar|kya|aap|abhi|jaldi|wala|bhai|theek|kal|mein|hoon|hun|jaunga|jaungi|karta|karti|karna|pohanch|tha|thi|kitne|kitna|rupay|saal)\b/i;
  return romanMarkers.test(text) ? 'roman' : 'en';
}

const URGENT_WORDS = [
  'urgent', 'emergency', 'now', 'asap', 'immediately', 'today', 'sparking', 'spark', 'fire', 'smoke', 'flood', 'burst',
  'abhi', 'jaldi', 'foran', 'fori', 'aaj',
  'ابھی', 'جلدی', 'فوراً', 'فورا', 'آج', 'دھواں', 'آگ',
];

// Offline keyword classifier. Returns a score per category and the best match.
export function classifyJobText(text = '') {
  const t = ` ${normalizeDigits(text).toLowerCase()} `;
  const scores = {};
  const matched = {};
  for (const c of CATEGORIES) {
    let score = 0;
    const hits = [];
    for (const kw of c.keywords) {
      const k = kw.toLowerCase();
      const isLatin = /^[a-z0-9 ./]+$/.test(k);
      const found = isLatin ? new RegExp(`[^a-z]${k.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}[^a-z]`).test(t) : t.includes(k);
      if (found) {
        score += k.length > 4 ? 2 : 1;
        hits.push(kw);
      }
    }
    scores[c.key] = score;
    matched[c.key] = hits;
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestKey, bestScore] = ranked[0];
  const total = ranked.reduce((s, [, v]) => s + v, 0);
  const urgent = URGENT_WORDS.some((w) => (/^[a-z]+$/.test(w) ? new RegExp(`\\b${w}\\b`).test(t) : t.includes(w)));
  const tomorrow = /\b(tomorrow|kal)\b|کل/.test(t);
  return {
    category: bestScore > 0 ? bestKey : 'other',
    confidence: bestScore > 0 ? Math.min(0.95, 0.45 + (bestScore / Math.max(total, 1)) * 0.5) : 0.2,
    matchedKeywords: bestScore > 0 ? matched[bestKey] : [],
    urgency: urgent ? 'high' : tomorrow ? 'low' : 'normal',
    when: tomorrow ? 'tomorrow' : urgent ? 'now' : null,
    language: detectLanguage(text),
    budget: parseRate(text),
  };
}
