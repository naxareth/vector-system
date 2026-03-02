import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireEnv } from '@/lib/env-guard';

// ---------------------------------------------------------------------------
// Centralized Gemini client for all web portal API routes.
//
// GEMINI_MODEL is the single source of truth for the model string.
// To change the model, update it here — never hardcode model strings
// in individual route files.
//
// 🛡️ SECURITY (Checkpoint #2): API Key Protection
// - The key is loaded via requireEnv() which throws at startup if missing.
// - All route files MUST import from this module instead of creating their
//   own GoogleGenerativeAI instances.
// - GEMINI_API_KEY must NEVER appear in a NEXT_PUBLIC_* variable.
//
// Phase 13 note: when dual-key segregation is implemented, split this into
// geminiBackend (GEMINI_API_KEY_BACKEND) and geminiChat (GEMINI_API_KEY_CHAT)
// to double the effective daily quota from 20 to 40 RPD.
// ---------------------------------------------------------------------------

export const GEMINI_MODEL = 'gemini-2.5-flash';

/** 🛡️ Fails fast if GEMINI_API_KEY is missing — prevents silent empty-key usage */
const GEMINI_API_KEY = requireEnv('GEMINI_API_KEY');

export const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/** Pre-built model instance. Use this directly in route files. */
export const geminiModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });