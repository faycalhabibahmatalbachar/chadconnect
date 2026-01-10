import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { deleteAdminSession } from '@/lib/auth';
import { env } from '@/lib/env';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.ADMIN_COOKIE_NAME)?.value;

  if (token) {
    await deleteAdminSession(token);
  }

  const res = NextResponse.redirect(new URL('/login', request.url));
  res.cookies.set(env.ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return res;
}
