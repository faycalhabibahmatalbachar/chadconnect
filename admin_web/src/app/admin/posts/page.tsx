import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/auth';
import { listPosts, setPostStatus } from '@/lib/data/posts';
import { formatDateTime } from '@/lib/format';

function snippet(text: string, maxLen = 140) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}…`;
}

export default async function PostsAdminPage() {
  try {
    await requireAdmin();
  } catch {
    redirect('/login');
  }

  const items = await listPosts(200, 0);

  async function setStatusAction(formData: FormData) {
    'use server';

    const id = Number(formData.get('id'));
    const status = String(formData.get('status') ?? '').trim();

    if (!id) return;
    if (status !== 'published' && status !== 'hidden' && status !== 'deleted') return;

    await setPostStatus(id, status);
    revalidatePath('/admin/posts');
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Posts</h1>
      </header>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Auteur</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Créé</th>
              <th className="px-4 py-3">Contenu</th>
              <th className="px-4 py-3">Média</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-zinc-100 align-top">
                <td className="px-4 py-3 font-mono text-xs">{it.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{it.user_display_name}</div>
                  <div className="text-xs text-zinc-500">user_id={it.user_id}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">{it.status}</span>
                  {it.video_status ? <div className="mt-1 text-xs text-zinc-500">video={it.video_status}</div> : null}
                </td>
                <td className="px-4 py-3">{formatDateTime(it.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="max-w-xl whitespace-pre-wrap">{snippet(it.body)}</div>
                </td>
                <td className="px-4 py-3">
                  {it.media_url ? (
                    <div className="space-y-1">
                      <div className="text-xs">{it.media_kind ?? 'file'}</div>
                      <div className="max-w-xs break-all font-mono text-xs text-zinc-600">{it.media_url}</div>
                    </div>
                  ) : (
                    <span className="text-zinc-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    {it.status === 'hidden' || it.status === 'deleted' ? (
                      <form action={setStatusAction}>
                        <input type="hidden" name="id" value={it.id} />
                        <input type="hidden" name="status" value="published" />
                        <button className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50">Restaurer</button>
                      </form>
                    ) : null}

                    {it.status === 'published' ? (
                      <form action={setStatusAction}>
                        <input type="hidden" name="id" value={it.id} />
                        <input type="hidden" name="status" value="hidden" />
                        <button className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50">Masquer</button>
                      </form>
                    ) : null}

                    {it.status !== 'deleted' ? (
                      <form action={setStatusAction}>
                        <input type="hidden" name="id" value={it.id} />
                        <input type="hidden" name="status" value="deleted" />
                        <button className="rounded-lg bg-rose-600 px-3 py-1.5 text-white">Supprimer</button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
