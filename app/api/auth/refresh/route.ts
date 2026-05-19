import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL + '/auth/refresh';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization');
    
    const body = await req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({ ok: 0, message: 'refreshToken이 필요합니다.' }, { status: 400 });
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'client-id': 'vitalsense',
        'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    console.log('[API /auth/refresh] Backend response:', data);
    
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