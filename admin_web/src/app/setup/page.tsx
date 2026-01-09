import { redirect } from 'next/navigation';

import { createAdminSession, getAdminUserByUsername, setPasswordForUser, setSessionCookie } from '@/lib/auth';

export default async function SetupPage() {
  const admin = await getAdminUserByUsername('admin');

  if (!admin) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold">Setup</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Aucun utilisateur <span className="font-mono">admin</span> trouvé. Importe d’abord <span className="font-mono">database/seed.sql</span>.
        </p>
      </main>
    );
  }

  if (admin.password_hash) {
    redirect('/login');
  }

  async function setupAction(formData: FormData) {
    'use server';

    const password = String(formData.get('password') ?? '');
    const confirm = String(formData.get('confirm') ?? '');

    if (password.length < 8) {
      return;
    }

    if (password !== confirm) {
      return;
    }

    await setPasswordForUser(admin.id, password);
    const token = await createAdminSession(admin.id);
    await setSessionCookie(token);

    redirect('/admin');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-6">
      <h1 className="text-2xl font-semibold">Setup Admin</h1>
      <p className="mt-2 text-sm text-zinc-600">Définis le mot de passe initial pour l’utilisateur admin.</p>

      <form action={setupAction} className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Mot de passe (min 8)</label>
          <input name="password" type="password" className="w-full rounded-lg border border-zinc-200 px-3 py-2" required minLength={8} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Confirmer</label>
          <input name="confirm" type="password" className="w-full rounded-lg border border-zinc-200 px-3 py-2" required minLength={8} />
        </div>

        <button className="w-full rounded-lg bg-black px-4 py-2 text-white">Enregistrer</button>
      </form>
    </main>
  );
}
