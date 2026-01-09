import { NextResponse } from 'next/server';

import { env } from './env';

export function setSessionCookieOnResponse(res: NextResponse, token: string): NextResponse {
  res.cookies.set(env.ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
  });
  return res;
}

export function clearSessionCookieOnResponse(res: NextResponse): NextResponse {
  res.cookies.set(env.ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 0,
  });
  return res;
}
