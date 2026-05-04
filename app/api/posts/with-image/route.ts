import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL + '/posts/with-image';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization');
    
    const formData = await req.formData();
    const postBlob = formData.get('post') as Blob;
    const file = formData.get('file') as File | null;

    const postData = JSON.parse(await postBlob.text());
    
    console.log('[API] postData:', postData);
    console.log('[API] file:', file ? `File(${file.size})` : 'null');

    const backendFormData = new FormData();
    backendFormData.append('post', new Blob([JSON.stringify(postData)], { type: 'application/json' }));
    
    if (file) {
      backendFormData.append('file', file);
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'client-id': 'vitalsense',
        'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token}`
      },
      body: backendFormData,
    });

    const data = await response.json();
    console.log('[API] Backend response:', data);
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('--- [POST /posts/with-image] API Error ---', error);
    return NextResponse.json({ 
      ok: 0, 
      message: '서버 통신 중 오류가 발생했습니다.',
      error: error.message 
    }, { status: 500 });
  }
}