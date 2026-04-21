import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL;
const LOGIN_WITH_URL = API_URL + '/users/login/with';
const SIGNUP_OAUTH_URL = API_URL + '/users/signup/oauth';

export async function POST(req: NextRequest) {
  try {
    const { providerAccountId, email, name, image } = await req.json();
    
    console.log('OAuth login request:', { providerAccountId, email, name });
    
    const loginWithResponse = await fetch(LOGIN_WITH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-id': 'vitalsense'
      },
      body: JSON.stringify({
        providerAccountId: providerAccountId,
      }),
    });
    
    let loginData = await loginWithResponse.json();
    console.log('Login/with response:', loginData);
    
    if (loginWithResponse.status === 200 && (loginData.ok || loginData._id)) {
      const userObj = loginData.ok ? loginData.item : loginData;
      const accessToken = loginData.token?.accessToken || loginData.accessToken;
      
      return NextResponse.json({
        ok: true,
        _id: userObj._id,
        email: userObj.email,
        name: userObj.name,
        type: userObj.type,
        image: userObj.image,
        accessToken: accessToken,
        token: { accessToken },
      });
    }
    
    if (loginWithResponse.status === 404) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(loginData, { status: loginWithResponse.status });
  } catch (error) {
    console.error('OAuth login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}