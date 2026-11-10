// Mongoose schemas. These also document the shape of every record, which the
// demo file store follows exactly so both stores are interchangeable.
import mongoose from 'mongoose';

const { Schema } = mongoose;
const opts = { versionKey: false, minimize: false };

const LocationSchema = new Schema(
  { area: String, city: String, lat: Number, lng: Number, address: String, source: String },
  { _id: false },
);

const UserSchema = new Schema(
  {
    _id: String,
    role: { type: String, enum: ['customer', 'worker'], required: true },
    phone: { type: String, unique: true, sparse: true },
    pinHash: { type: String },
    name: { type: String, default: '' },
    language: { type: String, enum: ['en', 'ur', 'roman'], default: 'en' },
    avatar: { type: String, default: '' },
    avatarSeed: { type: Number, default: 0 },
    gender: { type: String, default: 'male' },
    location: { type: LocationSchema, default: null },
    profileComplete: { type: Boolean, default: false },
    profileMethod: { type: String, default: '' },
    isDemo: { type: Boolean, default: false },
    // Worker-only fields
    skills: { type: [String], default: [] },
    subSkills: { type: [String], default: [] },
    experienceYears: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    bio: { type: String, default: '' },
    serviceAreas: { type: [String], default: [] },
    serviceRadiusKm: { type: Number, default: 8 },
    workingHours: { type: Schema.Types.Mixed, default: null },
    isAvailable: { type: Boolean, default: false },
    portfolio: { type: [String], default: [] },
    voiceIntro: { type: String, default: '' },
    phoneVerified: { type: Boolean, default: false },
    // Aggregates kept up to date by the review / booking services
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  opts,
);

const JobSchema = new Schema(
  {
    _id: String,
    customerId: { type: String, index: true },
    category: String,
    title: String,
    description: String,
    descriptionLang: String,
    voiceUrl: String,
    voiceDurationSec: Number,
    startedAt: Date,
    completedAt: Date,
    images: { type: [String], default: [] },
    location: { type: LocationSchema, default: null },
    when: { type: String, enum: ['now', 'scheduled'], default: 'now' },
    scheduledAt: Date,
    durationHours: Number,
    budget: Number,
    ai: { type: Schema.Types.Mixed, default: null },
    status: { type: String, index: true },
    workerId: { type: String, default: null, index: true },
    agreedPrice: { type: Number, default: null },
    timeline: { type: [Schema.Types.Mixed], default: [] },
    cancelReason: String,
    isDemo: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  opts,
);

const ProposalSchema = new Schema(
  {
    _id: String,
    jobId: { type: String, index: true },
    workerId: { type: String, index: true },
    customerId: { type: String, index: true },
    status: String,
    price: { type: Number, default: null },
    priceBy: { type: String, default: null },
    priceAgreed: { type: Boolean, default: false },
    lastMessageAt: Date,
    isDemo: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  opts,
);

const MessageSchema = new Schema(
  {
    _id: String,
    proposalId: { type: String, index: true },
    senderId: String,
    type: { type: String, enum: ['text', 'voice', 'image', 'price_offer', 'system'] },
    text: String,
    lang: String,
    audioUrl: String,
    durationSec: Number,
    transcript: String,
    translation: { type: Schema.Types.Mixed, default: null },
    imageUrl: String,
    amount: Number,
    offerStatus: String,
    systemKey: String,
    systemParams: { type: Schema.Types.Mixed, default: null },
    readBy: { type: [String], default: [] },
    isDemo: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  opts,
);

const ReviewSchema = new Schema(
  {
    _id: String,
    jobId: { type: String, index: true },
    reviewerId: String,
    revieweeId: { type: String, index: true },
    direction: { type: String, enum: ['customer_to_worker', 'worker_to_customer'] },
    rating: Number,
    criteria: { type: Schema.Types.Mixed, default: null },
    tags: { type: [String], default: [] },
    text: String,
    audioUrl: String,
    transcript: String,
    language: String,
    isDemo: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  opts,
);
ReviewSchema.index({ jobId: 1, reviewerId: 1 }, { unique: true });

const NotificationSchema = new Schema(
  {
    _id: String,
    userId: { type: String, index: true },
    type: String,
    params: { type: Schema.Types.Mixed, default: {} },
    link: String,
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  opts,
);

export const schemas = {
  users: UserSchema,
  jobs: JobSchema,
  proposals: ProposalSchema,
  messages: MessageSchema,
  reviews: ReviewSchema,
  notifications: NotificationSchema,
};

export const COLLECTIONS = Object.keys(schemas);
