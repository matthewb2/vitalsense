import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL + '/files/';
const IMAGE_BASE_URL = 'https://firm-catherine-mk-solution-5ac59407.koyeb.app/images';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const token = req.headers.get('authorization');
    
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    console.log('[API /files] file:', file ? `File(${file.name}, ${file.size})` : 'null');

    if (!file) {
      return NextResponse.json({ ok: 0, message: '파일이 없습니다.' }, { status: 400 });
    }

    const backendFormData = new FormData();
    backendFormData.append('attach', file);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'client-id': 'vitalsense',
        'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token}`
      },
      body: backendFormData,
    });

    const status = response.status;
    const data = await response.json();
    console.log('[API /files] Backend status:', status);
    console.log('[API /files] Backend response:', data);
    console.log('[API /files] Backend response keys:', Object.keys(data));
    
    if (!response.ok || data.ok === 0) {
      console.error('[API /files] Backend error:', data);
      return NextResponse.json({ 
        ok: 0, 
        message: data.message || '파일 업로드 실패',
        error: data.error 
      }, { status: response.ok ? 400 : response.status });
    }
    
    const backendPath = data.item && data.item[0]?.path ? data.item[0].path : null;
    const filename = data.item && data.item[0]?.name ? data.item[0].name : file.name;
    
    console.log('[API /files] backendPath:', backendPath, 'filename:', filename);
    
    const result = {
      ok: 1,
      url: backendPath || `${IMAGE_BASE_URL}/${filename}`,
      filename: filename,
      path: backendPath || filename
    };
    console.log('[API /files] Result:', result);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('--- [POST /api/files] API Error ---', error);
    return NextResponse.json({ 
      ok: 0, 
      message: '파일 업로드 중 오류가 발생했습니다.',
      error: error.message 
    }, { status: 500 });
  }
}