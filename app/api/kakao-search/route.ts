import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const page = parseInt(searchParams.get('page') || '1', 10);

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const KAKAO_API_URL = `https://dapi.kakao.com/v2/search/blog?query=${encodeURIComponent(query)}&page=${page}&size=4`;
  const apiKey = process.env.KAKAO_REST_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Kakao API key is not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(KAKAO_API_URL, {
      method: 'GET',
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kakao API Error:', response.status, errorText);
      return NextResponse.json({ error: 'Kakao API request failed' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Kakao API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data from Kakao' }, { status: 500 });
  }
}
