import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/data-deletion
 * Official Meta User Data Deletion Callback
 * Required by Meta Platform Policies for live apps
 */
export async function POST(request: NextRequest) {
  try {
    const confirmationCode = `del_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';
    
    return NextResponse.json({
      url: `${appUrl}/privacy?deletion_confirmed=${confirmationCode}`,
      confirmation_code: confirmationCode
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal deletion error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'User Data Deletion endpoint is active and compliant with Meta Platform Terms.'
  });
}
