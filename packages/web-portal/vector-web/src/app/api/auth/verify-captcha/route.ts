import { NextResponse } from 'next/server';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token missing' }, { status: 400 });
    }

    const isValid = await verifyTurnstileToken(token);

    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Invalid CAPTCHA' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CAPTCHA route error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}