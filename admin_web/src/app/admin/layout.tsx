import Link from 'next/link';
import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await requireAdmin();
  } catch {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex max-w-6xl gap-6 p-6">
        <aside className="w-64 shrink-0 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-500">Connecté</div>
          <div className="mt-1 font-semibold">{user.display_name}</div>

          <nav className="mt-6 space-y-1">
            <Link className="block rounded-lg px-3 py-2 hover:bg-zinc-100" href="/admin/institutions">
              Établissements
            </Link>
            <Link className="block rounded-lg px-3 py-2 hover:bg-zinc-100" href="/admin/posts">
              Posts
            </Link>
            <Link className="block rounded-lg px-3 py-2 hover:bg-zinc-100" href="/admin/reports">
              Signalements
            </Link>
            <Link className="block rounded-lg px-3 py-2 hover:bg-zinc-100" href="/admin/sms-queue">
              SMS Queue
            </Link>
          </nav>

          <div className="mt-6 border-t border-zinc-200 pt-4">
            <Link className="block rounded-lg px-3 py-2 text-red-600 hover:bg-zinc-100" href="/logout">
              Déconnexion
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
