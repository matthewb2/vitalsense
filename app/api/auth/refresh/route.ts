import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL + '/auth/refresh';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ ok: 0, message: 'Refresh token is required' }, { status: 400 });
    }

    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'client-id': 'vitalsense',
        'Authorization': authHeader,
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('--- [POST /api/auth/refresh] API Error ---', error);
    return NextResponse.json({ 
      ok: 0, 
      message: '토큰 갱신 중 오류가 발생했습니다.',
      error: error.message 
    }, { status: 500 });
  }
}
