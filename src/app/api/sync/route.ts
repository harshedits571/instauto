import { NextRequest, NextResponse } from 'next/server';
import { 
  getServerAccount, 
  getServerToken, 
  saveServerAccount, 
  getServerAutomations, 
  saveServerAutomations, 
  getServerLogs 
} from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const account = getServerAccount();
  const token = getServerToken();
  const automations = getServerAutomations();
  const logs = getServerLogs();

  return NextResponse.json({
    connected: !!account && !!token,
    account,
    hasToken: !!token,
    automationsCount: automations.length,
    automations,
    logsCount: logs.length,
    recentLogs: logs.slice(0, 10)
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account, token, automations } = body;

    if (account && token) {
      saveServerAccount(account, token);
    }

    if (Array.isArray(automations) && automations.length > 0) {
      saveServerAutomations(automations);
    }

    return NextResponse.json({
      success: true,
      message: 'Server store synced successfully',
      account: getServerAccount(),
      automations: getServerAutomations()
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
