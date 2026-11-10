// Shared domain constants used by both the client and the server.
// Names are given in English (en), Urdu script (ur) and Roman Urdu (roman).

export const LANGUAGES = ['en', 'ur', 'roman'];

export const ROLES = { CUSTOMER: 'customer', WORKER: 'worker' };

export const JOB_STATUS = {
  PENDING: 'pending',
  IN_DISCUSSION: 'in_discussion',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Status of one worker's involvement with one job (a "proposal").
export const PROPOSAL_STATUS = {
  INQUIRY: 'inquiry', // customer chatting with a worker from the profile, no job yet
  REQUESTED: 'requested', // customer asked this worker
  ACCEPTED: 'accepted', // worker is interested and can quote a price
  DECLINED: 'declined', // worker said no
  SELECTED: 'selected', // customer booked this worker
  CLOSED: 'closed', // another worker was booked or job cancelled
  CANCELLED: 'cancelled', // booking was cancelled after selection
};

export const CATEGORIES = [
  {
    key: 'electrician',
    icon: 'Zap',
    names: { en: 'Electrician', ur: 'الیکٹریشن', roman: 'Electrician' },
    subSkills: ['Wiring', 'Switchboard', 'Fan fitting', 'UPS / Inverter', 'Lights', 'Breaker / DB'],
    priceRange: [800, 2500],
    keywords: [
      'electric', 'electrician', 'wiring', 'wire', 'switch', 'switchboard', 'socket', 'light', 'bulb', 'tube light',
      'fan', 'short circuit', 'spark', 'sparking', 'breaker', 'ups', 'inverter', 'meter', 'bijli', 'bijli wala',
      'taar', 'current', 'pankha', 'pankhay', 'board', 'button',
      'بجلی', 'سوئچ', 'تار', 'الیکٹریشن', 'بٹن', 'لائٹ', 'شارٹ', 'کرنٹ', 'بورڈ', 'پنکھا', 'پنکھے', 'یو پی ایس', 'بلب', 'اسپارک',
    ],
  },
  {
    key: 'plumber',
    icon: 'Droplets',
    names: { en: 'Plumber', ur: 'پلمبر', roman: 'Plumber' },
    subSkills: ['Leak repair', 'Tap / Mixer', 'Geyser', 'Water tank', 'Drain cleaning', 'Bathroom fitting'],
    priceRange: [600, 2000],
    keywords: [
      'plumber', 'pipe', 'leak', 'leaking', 'leakage', 'tap', 'faucet', 'water', 'drain', 'blocked', 'toilet', 'flush',
      'geyser', 'tank', 'pump', 'nalka', 'nal', 'pani', 'tanki', 'tonti', 'gutter', 'washbasin', 'shower',
      'پلمبر', 'نلکا', 'پانی', 'پائپ', 'لیک', 'ٹینکی', 'گیزر', 'فلش', 'نالی', 'ٹونٹی', 'ٹپک', 'شاور', 'گٹر',
    ],
  },
  {
    key: 'ac_repair',
    icon: 'Snowflake',
    names: { en: 'AC Technician', ur: 'اے سی ٹیکنیشن', roman: 'AC Technician' },
    subSkills: ['AC service', 'Gas refill', 'AC installation', 'Fridge repair', 'Compressor', 'Drain pipe'],
    priceRange: [1500, 4500],
    keywords: [
      'ac', 'a.c', 'a/c', 'air conditioner', 'aircon', 'cooling', 'not cooling', 'gas refill', 'split', 'inverter ac',
      'compressor', 'fridge', 'refrigerator', 'freezer', 'thanda', 'thandak', 'cool',
      'اے سی', 'ٹھنڈا', 'ٹھنڈک', 'کولنگ', 'فریج', 'گیس', 'کمپریسر', 'فریزر',
    ],
  },
  {
    key: 'carpenter',
    icon: 'Hammer',
    names: { en: 'Carpenter', ur: 'بڑھئی', roman: 'Tarkhaan' },
    subSkills: ['Door repair', 'Cabinets', 'Furniture repair', 'Locks & hinges', 'Wardrobe', 'Polish'],
    priceRange: [800, 3000],
    keywords: [
      'carpenter', 'wood', 'wooden', 'door', 'cabinet', 'furniture', 'cupboard', 'almari', 'wardrobe', 'bed', 'table',
      'chair', 'lock', 'hinge', 'darwaza', 'lakri', 'tarkhan', 'drawer', 'kitchen cabinet',
      'بڑھئی', 'دروازہ', 'دروازے', 'لکڑی', 'الماری', 'فرنیچر', 'کرسی', 'میز', 'تالا', 'ترکھان', 'دراز',
    ],
  },
  {
    key: 'painter',
    icon: 'PaintRoller',
    names: { en: 'Painter', ur: 'پینٹر', roman: 'Painter' },
    subSkills: ['Wall paint', 'Distemper', 'Whitewash', 'Wood polish', 'Waterproofing', 'Touch-up'],
    priceRange: [1500, 6000],
    keywords: [
      'paint', 'painter', 'painting', 'wall', 'colour', 'color', 'whitewash', 'distemper', 'rang', 'deewar', 'seepage',
      'damp', 'safedi',
      'رنگ', 'پینٹ', 'دیوار', 'پینٹر', 'سفیدی', 'سیلن',
    ],
  },
  {
    key: 'mechanic',
    icon: 'Wrench',
    names: { en: 'Mechanic', ur: 'مکینک', roman: 'Mechanic' },
    subSkills: ['Car repair', 'Bike repair', 'Oil change', 'Battery', 'Brakes', 'Tyre / Puncture'],
    priceRange: [700, 3500],
    keywords: [
      'mechanic', 'car', 'bike', 'motorcycle', 'motorbike', 'engine', 'gaari', 'gari', 'gaadi', 'tyre', 'tire', 'puncture',
      'oil change', 'brake', 'battery', 'start nahi', 'self',
      'مکینک', 'گاڑی', 'موٹر سائیکل', 'انجن', 'بائیک', 'ٹائر', 'پنکچر', 'بریک', 'بیٹری',
    ],
  },
  {
    key: 'cleaner',
    icon: 'Sparkles',
    names: { en: 'Cleaner', ur: 'صفائی والا', roman: 'Safai wala' },
    subSkills: ['Home cleaning', 'Sofa cleaning', 'Carpet wash', 'Kitchen deep clean', 'Water tank cleaning', 'Washroom'],
    priceRange: [1000, 4000],
    keywords: [
      'clean', 'cleaning', 'cleaner', 'safai', 'sofa', 'carpet', 'wash', 'maid', 'jharu', 'dust', 'pocha', 'deep clean',
      'صفائی', 'کلینر', 'دھلائی', 'قالین', 'صوفہ', 'جھاڑو', 'پوچا',
    ],
  },
  {
    key: 'other',
    icon: 'LayoutGrid',
    names: { en: 'Handyman / Other', ur: 'دیگر کاریگر', roman: 'Doosray kaam' },
    subSkills: ['Tiles', 'Masonry', 'Welding', 'Glass work', 'Plaster', 'General repair'],
    priceRange: [800, 3000],
    keywords: [
      'handyman', 'mason', 'tile', 'tiles', 'plaster', 'cement', 'glass', 'mistri', 'welding', 'welder', 'grill', 'gate',
      'مستری', 'ٹائل', 'شیشہ', 'ویلڈنگ', 'گرل', 'سیمنٹ', 'پلستر',
    ],
  },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export function getCategory(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}

// Seeded service areas. Coordinates are approximate area centres, used only to
// estimate distance between a customer's saved area and a worker's service area.
export const AREAS = [
  { key: 'F-6', city: 'islamabad', lat: 33.729, lng: 73.075, names: { en: 'F-6', ur: 'ایف سکس', roman: 'F-6' } },
  { key: 'F-7', city: 'islamabad', lat: 33.72, lng: 73.056, names: { en: 'F-7', ur: 'ایف سیون', roman: 'F-7' } },
  { key: 'F-8', city: 'islamabad', lat: 33.709, lng: 73.037, names: { en: 'F-8', ur: 'ایف ایٹ', roman: 'F-8' } },
  { key: 'F-10', city: 'islamabad', lat: 33.695, lng: 73.013, names: { en: 'F-10', ur: 'ایف ٹین', roman: 'F-10' } },
  { key: 'F-11', city: 'islamabad', lat: 33.685, lng: 72.988, names: { en: 'F-11', ur: 'ایف الیون', roman: 'F-11' } },
  { key: 'E-11', city: 'islamabad', lat: 33.699, lng: 72.972, names: { en: 'E-11', ur: 'ای الیون', roman: 'E-11' } },
  { key: 'G-6', city: 'islamabad', lat: 33.715, lng: 73.088, names: { en: 'G-6', ur: 'جی سکس', roman: 'G-6' } },
  { key: 'G-8', city: 'islamabad', lat: 33.695, lng: 73.05, names: { en: 'G-8', ur: 'جی ایٹ', roman: 'G-8' } },
  { key: 'G-9', city: 'islamabad', lat: 33.688, lng: 73.03, names: { en: 'G-9', ur: 'جی نائن', roman: 'G-9' } },
  { key: 'G-10', city: 'islamabad', lat: 33.678, lng: 73.011, names: { en: 'G-10', ur: 'جی ٹین', roman: 'G-10' } },
  { key: 'G-11', city: 'islamabad', lat: 33.668, lng: 72.991, names: { en: 'G-11', ur: 'جی الیون', roman: 'G-11' } },
  { key: 'G-13', city: 'islamabad', lat: 33.648, lng: 72.967, names: { en: 'G-13', ur: 'جی تھرٹین', roman: 'G-13' } },
  { key: 'I-8', city: 'islamabad', lat: 33.667, lng: 73.075, names: { en: 'I-8', ur: 'آئی ایٹ', roman: 'I-8' } },
  { key: 'I-10', city: 'islamabad', lat: 33.648, lng: 73.04, names: { en: 'I-10', ur: 'آئی ٹین', roman: 'I-10' } },
  { key: 'Bani Gala', city: 'islamabad', lat: 33.708, lng: 73.15, names: { en: 'Bani Gala', ur: 'بنی گالا', roman: 'Bani Gala' } },
  { key: 'Satellite Town', city: 'rawalpindi', lat: 33.638, lng: 73.067, names: { en: 'Satellite Town', ur: 'سیٹلائٹ ٹاؤن', roman: 'Satellite Town' } },
  { key: 'Westridge', city: 'rawalpindi', lat: 33.605, lng: 73.02, names: { en: 'Westridge', ur: 'ویسٹ رج', roman: 'Westridge' } },
  { key: 'Saddar', city: 'rawalpindi', lat: 33.597, lng: 73.048, names: { en: 'Saddar', ur: 'صدر', roman: 'Saddar' } },
  { key: 'Chaklala', city: 'rawalpindi', lat: 33.59, lng: 73.082, names: { en: 'Chaklala Scheme III', ur: 'چکلالہ', roman: 'Chaklala' } },
  { key: 'PWD', city: 'rawalpindi', lat: 33.569, lng: 73.14, names: { en: 'PWD', ur: 'پی ڈبلیو ڈی', roman: 'PWD' } },
  { key: 'Bahria Town', city: 'rawalpindi', lat: 33.525, lng: 73.096, names: { en: 'Bahria Town', ur: 'بحریہ ٹاؤن', roman: 'Bahria Town' } },
  { key: 'DHA', city: 'rawalpindi', lat: 33.53, lng: 73.15, names: { en: 'DHA Phase II', ur: 'ڈی ایچ اے', roman: 'DHA' } },
];

export const CITIES = {
  islamabad: { en: 'Islamabad', ur: 'اسلام آباد', roman: 'Islamabad' },
  rawalpindi: { en: 'Rawalpindi', ur: 'راولپنڈی', roman: 'Rawalpindi' },
};

export function getArea(key) {
  return AREAS.find((a) => a.key === key) || null;
}

export function distanceKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export function nearestArea(lat, lng) {
  let best = null;
  let bestD = Infinity;
  for (const a of AREAS) {
    const d = distanceKm({ lat, lng }, a);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

export const DEFAULT_WORKING_HOURS = { days: [1, 2, 3, 4, 5, 6], start: '09:00', end: '19:00' };
export const DEFAULT_JOB_HOURS = 2;
