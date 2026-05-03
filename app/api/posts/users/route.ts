import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL + '/posts/users';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization');
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const keyword = searchParams.get('keyword');
    const custom = searchParams.get('custom');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const sort = searchParams.get('sort');

    const queryParams = new URLSearchParams();
    if (type) queryParams.append('type', type);
    if (keyword) queryParams.append('keyword', keyword);
    if (custom) queryParams.append('custom', custom);
    if (page) queryParams.append('page', page);
    if (limit) queryParams.append('limit', limit);
    if (sort) queryParams.append('sort', sort);

    const queryString = queryParams.toString();
    const url = queryString ? `${API_URL}?${queryString}` : API_URL;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'client-id': 'vitalsense',
        'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token}`
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('--- [GET /posts/users] API Error ---', error);
    return NextResponse.json({ 
      ok: 0, 
      message: '데이터를 불러오지 못했습니다.',
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization');
    const body = await req.json();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-id': 'vitalsense',
        'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('--- [POST /posts/users] API Error ---', error);
    return NextResponse.json({ 
      ok: 0, 
      message: '서버 통신 중 오류가 발생했습니다.',
      error: error.message 
    }, { status: 500 });
  }
}