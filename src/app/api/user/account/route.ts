import { NextRequest, NextResponse } from 'next/server';
import { getUserInstagramAccount } from '@/lib/dbService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({
      connected: false,
      account: null,
      message: 'No userId provided'
    });
  }

  try {
    const account = await getUserInstagramAccount(userId);
    return NextResponse.json({
      connected: !!account,
      account: account || null
    });
  } catch (err: any) {
    console.error('[API User Account] Error:', err);
    return NextResponse.json({
      connected: false,
      account: null,
      error: err.message
    }, { status: 500 });
  }
}
