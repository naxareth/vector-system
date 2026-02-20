import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = body?.code;

    const secret = process.env.REGISTRAR_SECRET_KEY;

    // 1. Defensive Server Check
    if (!secret) {
      console.error("CRITICAL: REGISTRAR_SECRET_KEY is not defined in environment variables.");
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    // 2. Input Validation
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, message: 'Authorization code required' }, { status: 400 });
    }

    // 3. True Timing-Safe Comparison
    // We hash both strings first so they are guaranteed to be the exact same length (a requirement for timingSafeEqual)
    const codeHash = crypto.createHash('sha256').update(code).digest();
    const secretHash = crypto.createHash('sha256').update(secret).digest();

    const isMatch = crypto.timingSafeEqual(codeHash, secretHash);

    if (!isMatch) {
      // Updated message to match the UI's "de-jargonized" copy
      return NextResponse.json({ success: false, message: 'Invalid Authorization Code' }, { status: 401 });
    }

    return NextResponse.json({ success: true, message: 'Verified' });

  } catch (error) {
    console.error("Registrar Verification API Error:", error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}