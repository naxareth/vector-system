import { NextResponse } from 'next/server';
import dns from 'dns/promises';

// Common disposable / throwaway email domains to block
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwam.com',
  'trashmail.com', 'maildrop.cc', 'sharklasers.com', 'guerrillamailblock.com',
  'grr.la', 'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de',
  'guerrillamail.net', 'guerrillamail.org', 'spam4.me', 'yopmail.com',
  'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf', 'nospam.ze.tc',
  'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf',
  'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf', 'dispostable.com',
  'fakeinbox.com', 'mailnull.com', 'spamgourmet.com', 'trashmail.at',
  'trashmail.io', 'trashmail.me', 'trashmail.net', 'trashmail.org',
  'spambox.us', 'spamfree24.org', 'spamgap.com', 'tempinbox.com',
  'tempr.email', 'discard.email', 'cfl.fr', 'get2mail.fr',
  'jetable.com', 'jetable.net', 'jetable.org', 'nospamfor.us',
  'mail-temporaire.fr', 'throwam.com', '33mail.com', 'filzmail.com',
  'hmamail.com', 'incognitomail.org', 'mailexpire.com', 'spammotel.com',
  'tempmailo.com', 'mailtemp.info', 'emailtemporaire.fr', 'getairmail.com',
  'mailnew.com', 'mailscrap.com', 'notmailinator.com', 'spamherelots.com',
]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email: string = (body?.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required.' }, { status: 400 });
    }

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: 'Please enter a valid email address.' }, { status: 400 });
    }

    const domain = email.split('@')[1];

    // Block disposable domains
    if (DISPOSABLE_DOMAINS.has(domain)) {
      return NextResponse.json({
        success: false,
        message: 'Temporary or disposable email addresses are not allowed. Please use a real email address.',
      }, { status: 400 });
    }

    // Check MX records — if no MX records exist, the domain cannot receive email
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'This email domain does not appear to exist or cannot receive emails. Please check and try again.',
        }, { status: 400 });
      }
    } catch {
      // DNS lookup failed — domain doesn't exist or can't receive mail
      return NextResponse.json({
        success: false,
        message: 'This email domain does not appear to exist. Please use a real email address.',
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Email domain is valid.' });

  } catch (error) {
    console.error('Email validation error:', error);
    return NextResponse.json({ success: false, message: 'Could not validate email. Please try again.' }, { status: 500 });
  }
}
