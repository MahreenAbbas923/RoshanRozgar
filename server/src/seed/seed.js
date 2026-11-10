// Seeded demo data (clearly marked isDemo: true). Names, areas and reviews
// are invented for the hackathon demo; no real people are represented.
import bcrypt from 'bcryptjs';
import { db, newId } from '../db/index.js';
import { getArea, JOB_STATUS, PROPOSAL_STATUS } from '../../../shared/index.js';
import { recomputeRating } from '../services/reviews.js';

const DAY = 24 * 3600 * 1000;
const HOUR = 3600 * 1000;
const iso = (ms) => new Date(ms).toISOString();

export const DEMO_PIN = '1234';
export const DEMO_ACCOUNTS = {
  customer: { phone: '03001234567', name: 'Sara Ahmed' },
  worker: { phone: '03111234567', name: 'Ali Khan' },
};

const loc = (key, address = '') => {
  const a = getArea(key);
  return { area: a.key, city: a.city, lat: a.lat, lng: a.lng, address, source: 'saved' };
};

const WEEK = [1, 2, 3, 4, 5, 6];
const ALL = [0, 1, 2, 3, 4, 5, 6];

const CUSTOMERS = [
  { key: 'sara', name: 'Sara Ahmed', phone: DEMO_ACCOUNTS.customer.phone, area: 'F-10', gender: 'female', address: 'Street 12, House 7' },
  { key: 'usman', name: 'Usman Tariq', phone: '03001111111', area: 'G-9', gender: 'male' },
  { key: 'nadia', name: 'Nadia Rehman', phone: '03002222222', area: 'G-9', gender: 'female' },
  { key: 'hamza', name: 'Hamza Malik', phone: '03003333333', area: 'G-10', gender: 'male' },
  { key: 'ayesha', name: 'Ayesha Siddiqui', phone: '03004444444', area: 'F-8', gender: 'female' },
  { key: 'bilalq', name: 'Bilal Qureshi', phone: '03005555555', area: 'Satellite Town', gender: 'male' },
  { key: 'mehwish', name: 'Mehwish Iqbal', phone: '03006666666', area: 'Bahria Town', gender: 'female' },
];

// [key, name, phone, skills, subSkills, area, serviceAreas, years, rate, available, hours, bio, gender]
const WORKERS = [
  ['ali', 'Ali Khan', DEMO_ACCOUNTS.worker.phone, ['electrician', 'ac_repair'], ['Wiring', 'Switchboard', 'Fan fitting', 'AC service'], 'G-9', ['G-9', 'G-8', 'F-10', 'G-10'], 10, 800, true, { days: WEEK, start: '09:00', end: '20:00' }, 'Bijli ka har kaam - wiring, switchboard, pankhay aur AC service. 10 saal ka tajurba.'],
  ['imran', 'Imran Shah', '03111111111', ['electrician'], ['UPS / Inverter', 'Wiring', 'Breaker / DB'], 'F-11', ['F-11', 'F-10', 'E-11'], 7, 900, true, { days: ALL, start: '08:00', end: '22:00' }, 'UPS, inverter and full house wiring. Available on Sundays too.'],
  ['zubair', 'Zubair Ahmed', '03111111112', ['electrician'], ['Lights', 'Switchboard', 'Fan fitting'], 'I-10', ['I-10', 'I-8'], 4, 600, false, { days: WEEK, start: '10:00', end: '18:00' }, 'Lights, fans and switch repair at fair rates.'],
  ['kashif', 'Kashif Mehmood', '03111111113', ['electrician'], ['Wiring', 'Breaker / DB', 'Meter'], 'Saddar', ['Saddar', 'Satellite Town', 'Westridge'], 12, 1000, true, { days: WEEK, start: '09:00', end: '19:00' }, 'Commercial and home wiring in Rawalpindi.'],
  ['naveed', 'Naveed Akhtar', '03111111114', ['electrician', 'other'], ['Wiring', 'Lights', 'General repair'], 'Bahria Town', ['Bahria Town', 'DHA'], 6, 1200, true, { days: ALL, start: '09:00', end: '21:00' }, 'Bahria and DHA - electrical and small repairs.'],
  ['bilal', 'Bilal Hussain', '03111111115', ['ac_repair'], ['AC service', 'Gas refill', 'AC installation'], 'F-11', ['F-11', 'F-10', 'G-11'], 6, 900, true, { days: WEEK, start: '09:00', end: '20:00' }, 'Split AC service, gas refill and installation.'],
  ['rashid', 'Rashid Mehmood', '03111111116', ['ac_repair'], ['Fridge repair', 'Compressor', 'AC service'], 'G-10', ['G-10', 'G-9', 'F-10', 'G-11'], 15, 1000, true, { days: WEEK, start: '08:00', end: '19:00' }, 'Fridge, freezer and AC specialist. 15 years experience.'],
  ['faisal', 'Faisal Iqbal', '03111111117', ['ac_repair'], ['AC installation', 'Gas refill', 'Drain pipe'], 'Westridge', ['Westridge', 'Saddar', 'Chaklala'], 9, 1100, true, { days: ALL, start: '09:00', end: '21:00' }, 'AC installation and repair across Rawalpindi.'],
  ['asif', 'Asif Javed', '03111111118', ['plumber'], ['Leak repair', 'Tap / Mixer', 'Geyser'], 'G-8', ['G-8', 'G-9', 'G-6', 'F-8'], 11, 700, true, { days: WEEK, start: '08:00', end: '19:00' }, 'Nalkay, pipe leakage, geyser - sab theek karta hoon.'],
  ['shahid', 'Shahid Latif', '03111111119', ['plumber'], ['Bathroom fitting', 'Water tank', 'Drain cleaning'], 'F-10', ['F-10', 'F-11', 'G-10'], 8, 800, true, { days: WEEK, start: '09:00', end: '20:00' }, 'Bathroom fittings, tanks and blocked drains.'],
  ['tariq', 'Tariq Nawaz', '03111111120', ['plumber'], ['Leak repair', 'Water tank', 'Geyser'], 'Chaklala', ['Chaklala', 'Saddar', 'PWD'], 14, 750, true, { days: ALL, start: '07:00', end: '20:00' }, 'Experienced plumber for Rawalpindi homes.'],
  ['waqas', 'Waqas Ali', '03111111121', ['plumber'], ['Tap / Mixer', 'Drain cleaning'], 'G-13', ['G-13', 'G-11'], 3, 600, true, { days: WEEK, start: '10:00', end: '19:00' }, 'Quick fixes for taps and drains.'],
  ['riaz', 'Muhammad Riaz', '03111111122', ['carpenter'], ['Door repair', 'Cabinets', 'Locks & hinges'], 'G-9', ['G-9', 'G-8', 'G-10', 'F-10'], 18, 900, true, { days: WEEK, start: '09:00', end: '18:00' }, 'Darwazay, almariyan aur kitchen cabinets. 18 saal ka kaam.'],
  ['ghaffar', 'Abdul Ghaffar', '03111111123', ['carpenter'], ['Furniture repair', 'Polish', 'Wardrobe'], 'I-8', ['I-8', 'I-10', 'G-8'], 20, 1000, true, { days: WEEK, start: '09:00', end: '18:00' }, 'Furniture repair and polish.'],
  ['sajid', 'Sajid Hameed', '03111111124', ['carpenter'], ['Door repair', 'Locks & hinges'], 'Satellite Town', ['Satellite Town', 'Saddar'], 5, 700, true, { days: ALL, start: '09:00', end: '20:00' }, 'Door and lock repair in Rawalpindi.'],
  ['javed', 'Javed Iqbal', '03111111125', ['painter'], ['Wall paint', 'Distemper', 'Waterproofing'], 'F-7', ['F-7', 'F-6', 'F-8', 'G-6'], 16, 2500, true, { days: WEEK, start: '08:00', end: '18:00' }, 'Room and full-house painting, seepage treatment.'],
  ['sohail', 'Sohail Anjum', '03111111126', ['painter'], ['Wall paint', 'Wood polish'], 'DHA', ['DHA', 'Bahria Town'], 7, 2000, true, { days: WEEK, start: '09:00', end: '18:00' }, 'Painting and polish for DHA and Bahria homes.'],
  ['akram', 'Akram Masih', '03111111127', ['painter'], ['Whitewash', 'Touch-up', 'Distemper'], 'G-11', ['G-11', 'G-10', 'G-13'], 10, 1500, true, { days: WEEK, start: '08:00', end: '17:00' }, 'Safedi, distemper and touch-ups.'],
  ['nadeem', 'Nadeem Abbas', '03111111128', ['mechanic'], ['Car repair', 'Battery', 'Oil change'], 'I-10', ['I-10', 'I-8', 'G-9'], 13, 1200, true, { days: WEEK, start: '09:00', end: '20:00' }, 'Car repair at your doorstep - battery, oil change, starting problems.'],
  ['khurram', 'Khurram Shehzad', '03111111129', ['mechanic'], ['Bike repair', 'Tyre / Puncture'], 'Saddar', ['Saddar', 'Satellite Town', 'Chaklala'], 6, 500, true, { days: ALL, start: '08:00', end: '22:00' }, 'Motorcycle repair and puncture service.'],
  ['arif', 'Arif Hussain', '03111111130', ['mechanic'], ['Car repair', 'Brakes'], 'G-6', ['G-6', 'F-6', 'G-8'], 9, 1000, true, { days: WEEK, start: '09:00', end: '19:00' }, 'Brakes, suspension and general car repair.'],
  ['shazia', 'Shazia Bibi', '03111111131', ['cleaner'], ['Home cleaning', 'Kitchen deep clean'], 'F-8', ['F-8', 'F-7', 'F-10', 'G-8'], 5, 1500, true, { days: WEEK, start: '08:00', end: '16:00' }, 'Ghar ki mukammal safai, kitchen deep clean.', 'female'],
  ['rubina', 'Rubina Kausar', '03111111132', ['cleaner'], ['Home cleaning', 'Washroom'], 'G-10', ['G-10', 'G-9', 'G-11'], 4, 1200, true, { days: WEEK, start: '09:00', end: '17:00' }, 'Home and washroom cleaning.', 'female'],
  ['asghar', 'Asghar Ali', '03111111133', ['cleaner'], ['Sofa cleaning', 'Carpet wash', 'Water tank cleaning'], 'E-11', ['E-11', 'F-11', 'F-10'], 8, 2500, true, { days: ALL, start: '09:00', end: '19:00' }, 'Sofa, carpet and water tank cleaning with machines.'],
  ['rasool', 'Ghulam Rasool', '03111111134', ['other'], ['Tiles', 'Masonry', 'Plaster'], 'G-11', ['G-11', 'G-10', 'G-9', 'F-11'], 22, 1500, true, { days: WEEK, start: '08:00', end: '17:00' }, 'Ustad for tiles, plaster and masonry work.'],
  ['yasir', 'Yasir Mehmood', '03111111135', ['other'], ['Welding', 'Glass work'], 'I-10', ['I-10', 'I-8'], 7, 1000, true, { days: WEEK, start: '09:00', end: '19:00' }, 'Gate, grill welding and glass work.'],
];

// Past completed jobs with reviews: [worker, customer, title, category, price, daysAgo, rating, tags, text, lang, workerRating?]
const HISTORY = [
  ['ali', 'usman', 'Switchboard sparking', 'electrician', 1300, 3, 5, ['On time', 'Would hire again'], 'Fixed the switchboard quickly and explained the problem clearly.', 'en', 5],
  ['ali', 'hamza', 'New wiring for 2 rooms', 'electrician', 4500, 8, 4, ['Fair price'], 'Achha kaam kiya. Kuch saamaan khud lena para lekin rate theek tha.', 'roman', 5],
  ['ali', 'nadia', 'Three ceiling fans fitted', 'electrician', 1400, 14, 5, ['Clean work', 'Polite'], 'Fitted three fans in an hour. Very professional.', 'en', 4],
  ['ali', 'ayesha', 'AC not cooling', 'ac_repair', 2500, 21, 5, ['Expert', 'On time'], 'اے سی کی گیس اور ڈرین دونوں ٹھیک کیے، بہت اچھا کام۔', 'ur', 5],
  ['ali', 'sara', 'Tube lights replaced', 'electrician', 900, 40, 5, ['Polite'], 'Neat work, cleaned up after.', 'en', 5],
  ['imran', 'hamza', 'UPS wiring', 'electrician', 2200, 5, 5, ['Expert'], 'UPS ki wiring bilkul sahi ki, ab load share theek hai.', 'roman', 5],
  ['imran', 'sara', 'Breaker tripping', 'electrician', 1100, 30, 4, ['Fair price'], 'Found the faulty breaker. Came a bit late.', 'en', 5],
  ['zubair', 'usman', 'Light fitting', 'electrician', 700, 12, 4, ['Fair price'], 'Simple job done fine.', 'en', 4],
  ['kashif', 'bilalq', 'Meter wiring', 'electrician', 1800, 9, 5, ['Expert'], 'Very knowledgeable, safe work.', 'en', 5],
  ['naveed', 'mehwish', 'Garden lights', 'electrician', 1500, 6, 4, ['Polite'], 'Good work, slightly expensive.', 'en', 5],
  ['bilal', 'nadia', 'AC service', 'ac_repair', 2000, 4, 5, ['On time', 'Clean work'], 'Proper service with pressure wash. Recommended.', 'en', 5],
  ['bilal', 'usman', 'AC gas refill', 'ac_repair', 3500, 16, 4, ['Fair price'], 'Gas refill done, cooling is back.', 'en', 4],
  ['rashid', 'sara', 'Fridge not cooling', 'ac_repair', 1800, 7, null, [], '', 'en', 5],
  ['rashid', 'hamza', 'Freezer repair', 'ac_repair', 2400, 11, 5, ['Expert', 'Would hire again'], 'Rashid sahab ne compressor check kar ke sahi masla bataya.', 'roman', 5],
  ['rashid', 'ayesha', 'AC installation', 'ac_repair', 3000, 19, 5, ['Clean work'], 'Installed neatly with proper drain pipe.', 'en', 5],
  ['rashid', 'nadia', 'Fridge gas', 'ac_repair', 2200, 33, 5, ['On time'], 'فریج کی گیس بھری، وقت پر آئے۔', 'ur', 4],
  ['faisal', 'bilalq', 'AC installation', 'ac_repair', 3200, 10, 5, ['Expert'], 'Installed two ACs in one visit.', 'en', 5],
  ['asif', 'usman', 'Kitchen tap leaking', 'plumber', 900, 2, 5, ['On time', 'Fair price'], 'Tap changed in 20 minutes. Great.', 'en', 5],
  ['asif', 'ayesha', 'Geyser not heating', 'plumber', 1500, 15, 4, ['Expert'], 'Geyser ka thermostat change kiya, ab theek hai.', 'roman', 4],
  ['asif', 'nadia', 'Bathroom leakage', 'plumber', 1200, 25, 5, ['Clean work'], 'غسل خانے کی لیکیج ختم ہو گئی۔ شکریہ', 'ur', 5],
  ['shahid', 'sara', 'Blocked drain', 'plumber', 1000, 18, 4, ['Polite'], 'Cleared the drain, a bit slow.', 'en', 5],
  ['tariq', 'bilalq', 'Water tank fitting', 'plumber', 2500, 13, 5, ['Expert', 'Would hire again'], 'Excellent work on the roof tank.', 'en', 5],
  ['waqas', 'hamza', 'Tap replacement', 'plumber', 600, 9, 3, [], 'Work was ok but came late.', 'en', 4],
  ['riaz', 'nadia', 'Kitchen cabinet doors', 'carpenter', 1600, 6, 5, ['Expert', 'Clean work'], 'Cabinet doors are perfectly aligned now.', 'en', 5],
  ['riaz', 'usman', 'Door lock change', 'carpenter', 800, 20, 5, ['On time'], 'Darwazay ka lock aur kabza dono badal diye.', 'roman', 5],
  ['ghaffar', 'ayesha', 'Wardrobe repair', 'carpenter', 2000, 12, 4, ['Fair price'], 'Good repair job.', 'en', 4],
  ['sajid', 'bilalq', 'Door repair', 'carpenter', 900, 8, 4, ['Polite'], 'Door fixed properly.', 'en', 5],
  ['javed', 'ayesha', 'Room paint', 'painter', 9000, 28, 5, ['Clean work', 'Expert'], 'Beautiful finish, covered all furniture.', 'en', 5],
  ['akram', 'hamza', 'Whitewash', 'painter', 6000, 17, 4, ['Fair price'], 'Safedi achhi hui.', 'roman', 4],
  ['sohail', 'mehwish', 'Wood polish', 'painter', 5000, 12, 5, ['Expert'], 'Doors look new again.', 'en', 5],
  ['nadeem', 'usman', 'Car battery', 'mechanic', 1500, 5, 5, ['On time'], 'Came home and changed the battery. Very helpful.', 'en', 5],
  ['khurram', 'bilalq', 'Bike tuning', 'mechanic', 700, 4, 4, ['Fair price'], 'Bike runs smooth now.', 'en', 4],
  ['arif', 'nadia', 'Brake pads', 'mechanic', 2500, 22, 5, ['Expert'], 'Honest mechanic, showed the old pads.', 'en', 5],
  ['shazia', 'ayesha', 'Deep cleaning', 'cleaner', 3500, 10, 5, ['Clean work', 'Polite'], 'Whole house sparkling. Very trustworthy.', 'en', 5],
  ['rubina', 'hamza', 'Washroom cleaning', 'cleaner', 1500, 7, 4, ['Clean work'], 'Achhi safai ki.', 'roman', 5],
  ['asghar', 'sara', 'Sofa cleaning', 'cleaner', 4000, 26, 5, ['Expert'], 'Sofa looks new. Machine cleaning was great.', 'en', 5],
  ['rasool', 'usman', 'Bathroom tiles', 'other', 7000, 35, 5, ['Expert', 'Would hire again'], 'Ustad ka kaam lajawab hai.', 'roman', 5],
  ['yasir', 'hamza', 'Gate welding', 'other', 2500, 14, 4, ['Fair price'], 'Gate fixed, good welding.', 'en', 4],
];

export async function seedDatabase({ reset = false } = {}) {
  if (reset) for (const c of ['users', 'jobs', 'proposals', 'messages', 'reviews', 'notifications']) await db[c].clear();
  if ((await db.users.count({})) > 0) return false;

  const pinHash = bcrypt.hashSync(DEMO_PIN, 10);
  const now = Date.now();
  const ids = {};
  const users = [];

  CUSTOMERS.forEach((c, i) => {
    ids[c.key] = newId('u_');
    users.push({
      id: ids[c.key],
      role: 'customer',
      phone: c.phone,
      pinHash,
      name: c.name,
      language: 'en',
      avatar: '',
      avatarSeed: 100 + i * 7,
      gender: c.gender,
      location: loc(c.area, c.address || ''),
      profileComplete: true,
      profileMethod: 'manual',
      isDemo: true,
      skills: [],
      subSkills: [],
      experienceYears: 0,
      rate: 0,
      bio: '',
      serviceAreas: [],
      serviceRadiusKm: 0,
      workingHours: null,
      isAvailable: false,
      portfolio: [],
      phoneVerified: true,
      ratingAvg: 0,
      ratingCount: 0,
      completedJobs: 0,
      createdAt: iso(now - 90 * DAY),
    });
  });

  WORKERS.forEach(([key, name, phone, skills, subSkills, area, serviceAreas, years, rate, available, hours, bio, gender], i) => {
    ids[key] = newId('u_');
    users.push({
      id: ids[key],
      role: 'worker',
      phone,
      pinHash,
      name,
      language: key === 'ali' ? 'roman' : 'ur',
      avatar: '',
      avatarSeed: i * 13 + 3,
      gender: gender || 'male',
      location: loc(area),
      profileComplete: true,
      profileMethod: 'voice',
      isDemo: true,
      skills,
      subSkills,
      experienceYears: years,
      rate,
      bio,
      serviceAreas,
      serviceRadiusKm: 8,
      workingHours: hours,
      isAvailable: available,
      portfolio: [1, 2, 3].map((n) => `illustration:${skills[0]}:${n}`),
      phoneVerified: true,
      ratingAvg: 0,
      ratingCount: 0,
      completedJobs: 0,
      createdAt: iso(now - 120 * DAY),
    });
  });
  await db.users.insertMany(users);

  const userByKey = (k) => users.find((u) => u.id === ids[k]);
  const jobs = [];
  const reviews = [];
  const proposals = [];
  const messages = [];

  const makeJob = (customerKey, workerKey, title, category, extra) => {
    const c = userByKey(customerKey);
    return {
      id: newId('j_'),
      customerId: c.id,
      category,
      title,
      description: title,
      descriptionLang: 'en',
      voiceUrl: '',
      images: [],
      location: c.location,
      when: 'scheduled',
      durationHours: 2,
      budget: null,
      ai: null,
      workerId: workerKey ? ids[workerKey] : null,
      cancelReason: '',
      isDemo: true,
      ...extra,
    };
  };

  for (const [w, c, title, category, price, daysAgo, rating, tags, text, lang, workerRating] of HISTORY) {
    const at = now - daysAgo * DAY;
    const job = makeJob(c, w, title, category, {
      scheduledAt: iso(at - 3 * HOUR),
      status: JOB_STATUS.COMPLETED,
      agreedPrice: price,
      completedAt: iso(at),
      timeline: [
        { status: JOB_STATUS.PENDING, at: iso(at - 6 * HOUR), by: ids[c] },
        { status: JOB_STATUS.CONFIRMED, at: iso(at - 5 * HOUR), by: ids[c] },
        { status: JOB_STATUS.COMPLETED, at: iso(at), by: ids[w] },
      ],
      createdAt: iso(at - 6 * HOUR),
      updatedAt: iso(at),
    });
    jobs.push(job);
    proposals.push({
      id: newId('p_'),
      jobId: job.id,
      workerId: ids[w],
      customerId: ids[c],
      status: PROPOSAL_STATUS.SELECTED,
      price,
      priceBy: ids[w],
      priceAgreed: true,
      lastMessageAt: iso(at),
      isDemo: true,
      createdAt: iso(at - 6 * HOUR),
      updatedAt: iso(at),
    });
    if (rating) {
      reviews.push({
        id: newId('r_'),
        jobId: job.id,
        reviewerId: ids[c],
        revieweeId: ids[w],
        direction: 'customer_to_worker',
        rating,
        criteria: null,
        tags,
        text,
        audioUrl: '',
        transcript: '',
        language: lang,
        isDemo: true,
        createdAt: iso(at + HOUR),
      });
    }
    if (workerRating) {
      reviews.push({
        id: newId('r_'),
        jobId: job.id,
        reviewerId: ids[w],
        revieweeId: ids[c],
        direction: 'worker_to_customer',
        rating: workerRating,
        criteria: { behavior: workerRating, communication: workerRating, professionalism: Math.max(3, workerRating - 1), overall: workerRating },
        tags: workerRating >= 5 ? ['Clear instructions', 'Paid on time'] : ['Paid on time'],
        text: '',
        audioUrl: '',
        transcript: '',
        language: 'roman',
        isDemo: true,
        createdAt: iso(at + 2 * HOUR),
      });
    }
  }

  // Active state for the demo:
  // 1) Imran is in the middle of a job right now -> shown as busy / hidden from "now" searches.
  jobs.push(
    makeJob('hamza', 'imran', 'Inverter installation', 'electrician', {
      scheduledAt: iso(now - HOUR),
      status: JOB_STATUS.IN_PROGRESS,
      agreedPrice: 2500,
      startedAt: iso(now - 50 * 60 * 1000),
      timeline: [
        { status: JOB_STATUS.PENDING, at: iso(now - 3 * HOUR), by: ids.hamza },
        { status: JOB_STATUS.CONFIRMED, at: iso(now - 2 * HOUR), by: ids.hamza },
        { status: JOB_STATUS.IN_PROGRESS, at: iso(now - 50 * 60 * 1000), by: ids.imran },
      ],
      createdAt: iso(now - 3 * HOUR),
      updatedAt: iso(now - 50 * 60 * 1000),
    }),
  );

  // 2) Ali has a confirmed job tomorrow at 11:00 (Pakistan time) for Nadia.
  const tomorrow11 = new Date(now + DAY);
  tomorrow11.setUTCHours(6, 0, 0, 0); // 11:00 PKT
  const nadiaJob = makeJob('nadia', 'ali', 'Ceiling fan fitting', 'electrician', {
    description: 'Two ceiling fans need fitting in the bedrooms.',
    scheduledAt: tomorrow11.toISOString(),
    status: JOB_STATUS.CONFIRMED,
    agreedPrice: 1000,
    timeline: [
      { status: JOB_STATUS.PENDING, at: iso(now - 5 * HOUR), by: ids.nadia },
      { status: JOB_STATUS.IN_DISCUSSION, at: iso(now - 4.5 * HOUR), by: ids.ali },
      { status: JOB_STATUS.CONFIRMED, at: iso(now - 4 * HOUR), by: ids.nadia },
    ],
    createdAt: iso(now - 5 * HOUR),
    updatedAt: iso(now - 4 * HOUR),
  });
  jobs.push(nadiaJob);
  const nadiaProposal = {
    id: newId('p_'),
    jobId: nadiaJob.id,
    workerId: ids.ali,
    customerId: ids.nadia,
    status: PROPOSAL_STATUS.SELECTED,
    price: 1000,
    priceBy: ids.ali,
    priceAgreed: true,
    lastMessageAt: iso(now - 4 * HOUR),
    isDemo: true,
    createdAt: iso(now - 5 * HOUR),
    updatedAt: iso(now - 4 * HOUR),
  };
  proposals.push(nadiaProposal);
  messages.push(
    { proposalId: nadiaProposal.id, senderId: null, type: 'system', systemKey: 'request_sent', systemParams: { title: nadiaJob.title }, at: now - 5 * HOUR },
    { proposalId: nadiaProposal.id, senderId: ids.nadia, type: 'text', text: 'Assalam o Alaikum, kal 11 baje aa saktay hain? Do pankhay lagwane hain.', lang: 'roman', at: now - 5 * HOUR + 60000 },
    { proposalId: nadiaProposal.id, senderId: ids.ali, type: 'text', text: 'Ji bilkul. 1000 rupay dono pankhon ke.', lang: 'roman', at: now - 4.6 * HOUR },
    { proposalId: nadiaProposal.id, senderId: ids.ali, type: 'price_offer', amount: 1000, offerStatus: 'accepted', at: now - 4.55 * HOUR },
    { proposalId: nadiaProposal.id, senderId: null, type: 'system', systemKey: 'price_agreed', systemParams: { amount: 1000 }, at: now - 4.2 * HOUR },
    { proposalId: nadiaProposal.id, senderId: null, type: 'system', systemKey: 'booking_confirmed', systemParams: { amount: 1000 }, at: now - 4 * HOUR },
  );

  // 3) Usman has just asked Ali about a switchboard - waiting for Ali to respond.
  const usmanJob = makeJob('usman', null, 'Switchboard sparking', 'electrician', {
    description: 'Kitchen ka switchboard spark kar raha hai, jaldi aa jayen.',
    descriptionLang: 'roman',
    when: 'now',
    scheduledAt: iso(now - 20 * 60 * 1000),
    status: JOB_STATUS.PENDING,
    budget: 1500,
    agreedPrice: null,
    ai: { source: 'keywords', category: 'electrician', urgency: 'high', title: 'Switchboard sparking' },
    timeline: [{ status: JOB_STATUS.PENDING, at: iso(now - 20 * 60 * 1000), by: ids.usman }],
    createdAt: iso(now - 20 * 60 * 1000),
    updatedAt: iso(now - 20 * 60 * 1000),
  });
  jobs.push(usmanJob);
  const usmanProposal = {
    id: newId('p_'),
    jobId: usmanJob.id,
    workerId: ids.ali,
    customerId: ids.usman,
    status: PROPOSAL_STATUS.REQUESTED,
    price: 1500,
    priceBy: ids.usman,
    priceAgreed: false,
    lastMessageAt: iso(now - 18 * 60 * 1000),
    isDemo: true,
    createdAt: iso(now - 19 * 60 * 1000),
    updatedAt: iso(now - 18 * 60 * 1000),
  };
  proposals.push(usmanProposal);
  messages.push(
    { proposalId: usmanProposal.id, senderId: null, type: 'system', systemKey: 'request_sent', systemParams: { title: usmanJob.title, budget: 1500 }, at: now - 19 * 60 * 1000 },
    { proposalId: usmanProposal.id, senderId: ids.usman, type: 'text', text: 'Kitchen ka switchboard spark kar raha hai, jaldi aa jayen. 1500 de dunga.', lang: 'roman', at: now - 18 * 60 * 1000 },
  );

  // Seeded history conversations get a short closing message so the inbox is not empty.
  for (const p of proposals.filter((x) => x.status === PROPOSAL_STATUS.SELECTED && x !== nadiaProposal)) {
    messages.push({ proposalId: p.id, senderId: null, type: 'system', systemKey: 'job_completed', systemParams: { amount: p.price }, at: new Date(p.lastMessageAt).getTime() });
  }

  await db.jobs.insertMany(jobs);
  await db.proposals.insertMany(proposals);
  await db.reviews.insertMany(reviews);
  await db.messages.insertMany(
    messages.map(({ at, ...m }) => ({
      id: newId('m_'),
      text: '',
      lang: '',
      audioUrl: '',
      durationSec: 0,
      transcript: '',
      translation: null,
      imageUrl: '',
      amount: null,
      offerStatus: m.type === 'price_offer' ? 'open' : null,
      systemKey: null,
      systemParams: null,
      readBy: m.senderId ? [m.senderId] : [],
      isDemo: true,
      ...m,
      createdAt: iso(at),
    })),
  );

  // Aggregates derived from the seeded records.
  for (const u of users) {
    const done = jobs.filter((j) => j.status === JOB_STATUS.COMPLETED && (j.workerId === u.id || j.customerId === u.id)).length;
    await db.users.update(u.id, { completedJobs: done });
    await recomputeRating(u.id);
  }
  await db.notifications.insert({
    id: newId('n_'),
    userId: ids.ali,
    type: 'new_request',
    params: { name: 'Usman Tariq', title: usmanJob.title, area: 'G-9' },
    link: `/chat/${usmanProposal.id}`,
    read: false,
    createdAt: iso(now - 19 * 60 * 1000),
  });
  await db.notifications.insert({
    id: newId('n_'),
    userId: ids.sara,
    type: 'please_review',
    params: { title: 'Fridge not cooling' },
    link: `/jobs/${jobs.find((j) => j.title === 'Fridge not cooling').id}/review`,
    read: false,
    createdAt: iso(now - 7 * DAY),
  });
  await db.flush();
  return true;
}
