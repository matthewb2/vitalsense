import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';

const API_URL = process.env.API_URL;
const LOGIN_WITH_URL = API_URL + '/users/login/with';
const SIGNUP_OAUTH_URL = API_URL + '/users/signup/oauth';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', req.url));
  }
  
  console.log('OAuth callback with code:', code);
  
  try {
    const session = await getServerSession(authOptions);
    console.log('NextAuth session:', session);
    
    let googleEmail = null;
    let googleName = null;
    let googleImage = null;
    let providerAccountId = null;
    
    if (session?.user) {
      googleEmail = session.user.email;
      googleName = session.user.name;
      googleImage = session.user.image;
      const account = session.user as any;
      providerAccountId = account.providerAccountId || account.sub;
      console.log('Google user info:', { googleEmail, googleName, googleImage, providerAccountId });
    }
    
    if (!providerAccountId) {
      providerAccountId = code;
    }
    
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
    console.log('Login status:', loginWithResponse.status);
    
    let userObj = null;
    let accessToken = null;
    
    if (loginWithResponse.status === 200 && (loginData.ok || loginData._id)) {
      userObj = loginData.ok ? loginData.item : loginData;
      accessToken = loginData.token?.accessToken || loginData.accessToken;
      console.log('Existing user:', userObj);
    }
    else if (loginWithResponse.status === 404) {
      console.log('User not found, trying signup...');
      
      const signupResponse = await fetch(SIGNUP_OAUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': 'vitalsense'
        },
        body: JSON.stringify({
          type: 'user',
          loginType: 'google',
          email: googleEmail,
          name: googleName,
          image: googleImage,
          extra: {
            providerAccountId: providerAccountId,
          },
        }),
      });
      
      const signupData = await signupResponse.json();
      console.log('Signup response:', signupData);
      console.log('Signup status:', signupResponse.status);
      
      if (signupResponse.ok && (signupData.ok || signupData._id)) {
        userObj = signupData.ok ? signupData.item : signupData;
        accessToken = signupData.token?.accessToken || signupData.accessToken;
        console.log('New user created:', userObj);
      } else {
        console.log('Signup failed:', signupData.message);
      }
    }
    
    if (userObj) {
      const userData = {
        _id: userObj._id,
        email: userObj.email || googleEmail,
        name: userObj.name || googleName,
        type: userObj.type,
        image: userObj.image || googleImage,
        loginType: userObj.loginType || 'google',
        accessToken: accessToken,
        token: { accessToken: accessToken },
      };
      
      console.log('Final user data:', userData);
      
      const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
      const redirectUrl = new URL('/login', baseUrl);
      redirectUrl.searchParams.set('oauth', 'success');
      redirectUrl.searchParams.set('user', JSON.stringify(userData));
      
      return NextResponse.redirect(redirectUrl);
    }
    
    return NextResponse.redirect(new URL('/login?error=oauth_failed', req.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_error', req.url));
  }
}