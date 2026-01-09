import { redirect } from 'next/navigation';

import { getAdminUserByUsername, getSessionUser } from '../lib/auth';

export default async function Home() {
  const admin = await getAdminUserByUsername('admin');
  const sessionUser = await getSessionUser();

  if (!admin || !admin.password_hash) {
    redirect('/setup');
  }

  if (!sessionUser) {
    redirect('/login');
  }

  redirect('/admin');
}
