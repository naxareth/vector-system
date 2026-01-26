import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    // 1. Get the wallet address from the URL (e.g., ?wallet=0x123...)
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ status: 'error', message: 'Wallet address required' }, { status: 400 });
    }

    // 2. Find the user and their credentials
    const user = await prisma.users.findUnique({
      where: { wallet_address: wallet },
      include: {
        verified_credentials: true // <--- This JOINs the tables automatically
      }
    });

    if (!user) {
      return NextResponse.json({ status: 'success', credentials: [] });
    }

    // 3. Return the data
    return NextResponse.json({ 
      status: 'success', 
      credentials: user.verified_credentials 
    });

  } catch (error) {
    console.error('Fetch Creds Error:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}