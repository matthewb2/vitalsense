import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL + '/posts/';

export async function POST(req: NextRequest) {
  // 디버깅을 위한 요청 정보 저장
  const debugInfo: any = { stage: 'init' };
  
  try {
    const token = req.headers.get('authorization');
    const body = await req.json();

    debugInfo.stage = 'requesting_backend';
    debugInfo.url = API_URL;
    debugInfo.hasToken = !!token;
    debugInfo.body = body;

    console.log('--- [POST] Backend Request ---');
    console.log('Target URL:', API_URL);
    console.log('Authorization:', token ? 'Present' : 'Missing');
    console.log('Request body:', body);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-id': 'vitalsense',
        'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });

    debugInfo.status = response.status;
    const data = await response.json();

    return NextResponse.json({
      ...data,
      _debug: debugInfo
    });

  } catch (error: any) {
    console.error('--- [POST] API Error ---', error);
    return NextResponse.json({ 
      ok: 0, 
      message: '서버 통신 중 오류가 발생했습니다.',
      error: error.message, // 브라우저 콘솔 출력용
      _debug: debugInfo
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization');
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    console.log(`--- [GET] Type: ${type} ---`);

    if (!type) {
      return NextResponse.json({ ok: 0, message: 'type 파라미터가 필요합니다.' }, { status: 400 });
    }

    const response = await fetch(`${API_URL}?type=${type}&sort=_id,-1`, {
      method: 'GET',
      headers: {
        'client-id': 'vitalsense',
        'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token}`
      },
    });

    const data = await response.json();
    
    // 로그 출력 후 데이터 반환
    console.log('Backend Response Status:', response.status);
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('--- [GET] API Error ---', error);
    return NextResponse.json({ 
      ok: 0, 
      message: '데이터를 불러오지 못했습니다.',
      error: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get('authorization');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: 0, message: 'ID가 필요합니다.' }, { status: 400 });
    }

    const response = await fetch(`${API_URL}${id}`, {
      method: 'DELETE',
      headers: {
        'client-id': 'vitalsense',
        'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token}`
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('--- [DELETE] API Error ---', error);
    return NextResponse.json({ ok: 0, message: '삭제 실패' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get('authorization');
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ ok: 0, message: 'ID가 필요합니다.' }, { status: 400 });
    }

    const response = await fetch(`${API_URL}${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'client-id': 'vitalsense',
        'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token}`
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('--- [PATCH] API Error ---', error);
    return NextResponse.json({ ok: 0, message: '수정 실패' }, { status: 500 });
  }
}