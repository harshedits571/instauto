import { NextRequest, NextResponse } from 'next/server';
import { getUserAutomations, saveAutomation } from '@/lib/dbService';
import { getServerAutomations, saveServerAutomations } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId') || 'default_creator';
  
  // Try Firestore first
  let automations = await getUserAutomations(userId);
  if (!automations || automations.length === 0) {
    automations = getServerAutomations();
  }

  return NextResponse.json({
    success: true,
    data: automations,
    status: 'success',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const userId = request.nextUrl.searchParams.get('userId') || data.userId || 'default_creator';

    if (Array.isArray(data)) {
      for (const rule of data) {
        await saveAutomation(userId, rule);
      }
      saveServerAutomations(data);
      return NextResponse.json({ success: true, data });
    }

    if (data.id) {
      await saveAutomation(userId, data);
      
      const existing = getServerAutomations();
      const idx = existing.findIndex(a => a.id === data.id);
      if (idx >= 0) existing[idx] = { ...existing[idx], ...data };
      else existing.unshift(data);
      saveServerAutomations(existing);

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: true, message: 'Updated' });
  } catch (err: any) {
    console.error('[API Automations] Error:', err);
    return NextResponse.json({ error: 'Failed to update automations' }, { status: 400 });
  }
}
