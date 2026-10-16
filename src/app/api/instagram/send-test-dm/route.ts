import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { recipientId, messageText, linkUrl, linkButtonText, accessToken } = await request.json();

    if (!accessToken || !recipientId) {
      return NextResponse.json(
        { error: 'accessToken and recipientId are required' },
        { status: 400 }
      );
    }

    const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(accessToken)}`;

    let messagePayload: Record<string, unknown>;

    if (linkUrl && linkButtonText) {
      messagePayload = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: messageText || 'Here is your requested link:',
            buttons: [
              {
                type: 'web_url',
                url: linkUrl,
                title: linkButtonText
              }
            ]
          }
        }
      };
    } else {
      messagePayload = {
        text: messageText || 'Hello from InstaAuto! Your automated connection is working.'
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: messagePayload
      })
    });

    const data = await res.json();

    if (data.error) {
      return NextResponse.json({
        error: data.error.message,
        details: data.error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      messageId: data.message_id,
      recipientId: data.recipient_id
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to send test message';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
