import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const igAccountId = searchParams.get('igAccountId');
    const accessToken = searchParams.get('accessToken');

    if (!igAccountId || !accessToken) {
      return NextResponse.json(
        { error: 'igAccountId and accessToken are required' },
        { status: 400 }
      );
    }

    const url = `https://graph.facebook.com/v21.0/${igAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,comments_count,like_count,timestamp&limit=15&access_token=${encodeURIComponent(accessToken)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    const rawMedia = data.data || [];
    const reels = rawMedia.map((m: {
      id: string;
      caption?: string;
      media_type: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink?: string;
      comments_count?: number;
      like_count?: number;
    }) => ({
      id: m.id,
      title: m.caption ? (m.caption.length > 60 ? m.caption.substring(0, 57) + '...' : m.caption) : 'Instagram Post',
      thumbnail: m.thumbnail_url || m.media_url || '',
      permalink: m.permalink || '',
      commentsCount: m.comments_count || 0,
      likesCount: m.like_count || 0,
      mediaType: m.media_type
    }));

    return NextResponse.json({ success: true, reels });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch Instagram reels';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
