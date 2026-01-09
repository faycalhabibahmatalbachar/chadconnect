import { redirect } from 'next/navigation';

import { createAdminSession, getAdminUserByUsername, getSessionUser, setSessionCookie, verifyPassword } from '@/lib/auth';

export default async function LoginPage() {
  const admin = await getAdminUserByUsername('admin');
  const sessionUser = await getSessionUser();

  if (!admin || !admin.password_hash) {
    redirect('/setup');
  }

  if (sessionUser) {
    redirect('/admin');
  }

  async function loginAction(formData: FormData) {
    'use server';

    const username = String(formData.get('username') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    const user = await getAdminUserByUsername(username);

    if (!user || !user.password_hash) {
      return;
    }

    if (user.role !== 'admin' && user.role !== 'moderator') {
      return;
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return;
    }

    const token = await createAdminSession(user.id);
    await setSessionCookie(token);

    redirect('/admin');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-6">
      <h1 className="text-2xl font-semibold">Connexion</h1>
      <p className="mt-2 text-sm text-zinc-600">Accès Admin/Modérateur.</p>

      <form action={loginAction} className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Utilisateur</label>
          <input name="username" defaultValue="admin" className="w-full rounded-lg border border-zinc-200 px-3 py-2" />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Mot de passe</label>
          <input name="password" type="password" className="w-full rounded-lg border border-zinc-200 px-3 py-2" required />
        </div>

        <button className="w-full rounded-lg bg-black px-4 py-2 text-white">Se connecter</button>
      </form>
    </main>
  );
}
