import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) return new Response('Missing url', { status: 400 });

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    const filename = url.split('/').pop()?.split('?')[0] || 'image.jpg';

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response('Failed to fetch image', { status: 500 });
  }
}
