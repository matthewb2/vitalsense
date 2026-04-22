import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL + '/users/';
const LOGIN_URL = process.env.API_URL + '/users/login';
const LOGIN_WITH_URL = process.env.API_URL + '/users/login/with';
const SIGNUP_OAUTH_URL = process.env.API_URL + '/users/signup/oauth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, loginType, googleCode, extra } = body;

    const providerAccountId = googleCode || extra?.providerAccountId;

    if (loginType === 'google' && providerAccountId) {
      console.log('Calling signup oauth:', SIGNUP_OAUTH_URL);
      const response = await fetch(SIGNUP_OAUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': 'vitalsense'
        },
        body: JSON.stringify({
          type: 'user',
          loginType: 'google',
          email: body.email,
          name: body.name,
          image: body.image,
          extra: { providerAccountId },
        }),
      });

      const data = await response.json();
      console.log('Google OAuth signup response:', data);

      if (data.ok || data._id) {
        return NextResponse.json({
          ok: 1,
          item: data.item || data,
          accessToken: data.item?.token?.accessToken || data.token?.accessToken,
          email: data.email || data.item?.email,
          name: data.name || data.item?.name,
          image: data.image || data.item?.image,
        });
      }

      return NextResponse.json({ ok: 0, message: data.message || '구글 회원가입에 실패했습니다.' });
    }

    // Regular login
    if (email && password && !body.name) {
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': 'vitalsense'
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (data.ok) {
        console.log('Login response:', data);
        return NextResponse.json({ 
          ok: 1, 
          item: data.item || data.user,
          accessToken: data.item?.token?.accessToken || data.token?.accessToken
        });
      }
      
      return NextResponse.json({ ok: 0, message: data.message || '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-id': 'vitalsense'
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ ok: 0, message: '오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { _id, ...updateData } = body;

    if (!_id) {
      return NextResponse.json({ ok: 0, message: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    const response = await fetch(`${API_URL}${_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'client-id': 'vitalsense'
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ ok: 0, message: '오류가 발생했습니다.' }, { status: 500 });
  }
}