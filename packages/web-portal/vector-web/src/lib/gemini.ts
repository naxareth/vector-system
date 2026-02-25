import { GoogleGenerativeAI } from '@google/generative-ai';

// ---------------------------------------------------------------------------
// Centralized Gemini client for all web portal API routes.
//
// GEMINI_MODEL is the single source of truth for the model string.
// To change the model, update it here — never hardcode model strings
// in individual route files.
//
// Phase 13 note: when dual-key segregation is implemented, split this into
// geminiBackend (GEMINI_API_KEY_BACKEND) and geminiChat (GEMINI_API_KEY_CHAT)
// to double the effective daily quota from 20 to 40 RPD.
// ---------------------------------------------------------------------------

export const GEMINI_MODEL = 'gemini-2.5-flash-lite';

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/** Pre-built model instance. Use this directly in route files. */
export const geminiModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });