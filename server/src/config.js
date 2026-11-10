import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, '..');

dotenv.config({ path: path.join(SERVER_ROOT, '.env') });

export const config = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET || 'roshan-rozgar-dev-secret',
  mongoUri: process.env.MONGODB_URI || '',
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'claude-opus-5-5',
  groqKey: process.env.GROQ_API_KEY || '',
  groqSttModel: process.env.GROQ_STT_MODEL || 'whisper-large-v3',
  groqLlmModel: process.env.GROQ_LLM_MODEL || 'openai/gpt-oss-120b',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  dataDir: path.join(SERVER_ROOT, 'data'),
  uploadsDir: path.join(SERVER_ROOT, 'uploads'),
  clientDist: path.resolve(SERVER_ROOT, '..', 'client', 'dist'),
};

if (!process.env.JWT_SECRET) {
  console.warn('[config] JWT_SECRET not set - using a development secret.');
}
