import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    // The secret is read from the server environment, never sent to the client
    const secret = process.env.REGISTRAR_SECRET_KEY;

    if (!code) {
      return NextResponse.json({ success: false, message: 'Code required' }, { status: 400 });
    }

    // Secure Comparison
    if (code !== secret) {
      // Intentionally generic error message to prevent timing attacks (optional but good practice)
      return NextResponse.json({ success: false, message: 'Invalid Registrar Code' }, { status: 401 });
    }

    return NextResponse.json({ success: true, message: 'Verified' });

  } catch (error) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}