import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { sendCustomAuthEmail } from '@/lib/emailService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, type, displayName } = body;

    if (!email || !type) {
      return NextResponse.json(
        { error: 'Email and type (verification or password_reset) are required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Determine the base URL (prioritize request origin, then env var, then fallback)
    const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://instauto-nine.vercel.app';

    let actionUrl = '';

    if (type === 'verification') {
      // 1. Generate secure Firebase verification link with Firebase Admin SDK
      const rawFirebaseLink = await adminAuth.generateEmailVerificationLink(cleanEmail, {
        url: `${origin}/login?verified=true`
      });

      // Extract the secure one-time oobCode from the Firebase link
      const urlObj = new URL(rawFirebaseLink);
      const oobCode = urlObj.searchParams.get('oobCode') || '';

      // Construct your 100% custom URL on your own website domain
      actionUrl = `${origin}/auth/action?mode=verifyEmail&oobCode=${encodeURIComponent(oobCode)}`;
    } else if (type === 'password_reset') {
      // 2. Generate secure Firebase password reset link
      const rawResetLink = await adminAuth.generatePasswordResetLink(cleanEmail, {
        url: `${origin}/login`
      });

      const urlObj = new URL(rawResetLink);
      const oobCode = urlObj.searchParams.get('oobCode') || '';

      actionUrl = `${origin}/auth/action?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`;
    } else {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    // 3. Dispatch the email using Resend
    const sendResult = await sendCustomAuthEmail({
      to: cleanEmail,
      type: type,
      displayName: displayName,
      actionUrl: actionUrl
    });

    if (!sendResult.success) {
      console.warn('[Custom Email API] Resend send warning:', sendResult.error);
      return NextResponse.json({ 
        success: false, 
        error: sendResult.error,
        actionUrl: actionUrl // Returned for development/testing convenience
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${type === 'verification' ? 'Verification' : 'Password reset'} email sent successfully via Resend`,
      actionUrl: actionUrl
    });
  } catch (error: any) {
    console.error('[Custom Email API Exception]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate and send custom email' },
      { status: 500 }
    );
  }
}
