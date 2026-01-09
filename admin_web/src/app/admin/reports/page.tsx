import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/auth';
import { setPostStatus } from '@/lib/data/posts';
import { listReports, setCommentStatus, setReportStatus, setUserStatus } from '@/lib/data/reports';
import { formatDateTime } from '@/lib/format';

function snippet(text: string | null | undefined, maxLen = 140) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return '-';
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}…`;
}

export default async function ReportsAdminPage() {
  try {
    await requireAdmin();
  } catch {
    redirect('/login');
  }

  const items = await listReports(200, 0);

  async function setReportStatusAction(formData: FormData) {
    'use server';

    const id = Number(formData.get('id'));
    const status = String(formData.get('status') ?? '').trim();

    if (!id) return;
    if (status !== 'open' && status !== 'resolved' && status !== 'rejected') return;

    await setReportStatus(id, status);
    revalidatePath('/admin/reports');
  }

  async function setTargetAction(formData: FormData) {
    'use server';

    const targetType = String(formData.get('target_type') ?? '').trim();
    const targetId = Number(formData.get('target_id'));
    const status = String(formData.get('status') ?? '').trim();

    if (!targetId) return;

    if (targetType === 'post') {
      if (status !== 'published' && status !== 'hidden' && status !== 'deleted') return;
      await setPostStatus(targetId, status);
      revalidatePath('/admin/reports');
      return;
    }

    if (targetType === 'comment') {
      if (status !== 'published' && status !== 'hidden' && status !== 'deleted') return;
      await setCommentStatus(targetId, status);
      revalidatePath('/admin/reports');
      return;
    }

    if (targetType === 'user') {
      if (status !== 'active' && status !== 'suspended' && status !== 'deleted') return;
      await setUserStatus(targetId, status);
      revalidatePath('/admin/reports');
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Signalements</h1>
      </header>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Reporter</th>
              <th className="px-4 py-3">Cible</th>
              <th className="px-4 py-3">Raison</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Créé</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-zinc-100 align-top">
                <td className="px-4 py-3 font-mono text-xs">{it.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{it.reporter_display_name}</div>
                  <div className="text-xs text-zinc-500">user_id={it.reporter_user_id}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-mono text-xs">
                    {it.target_type}:{it.target_id}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-zinc-700">
                    {it.target_type === 'post' ? (
                      <>
                        <div>post_status={it.post_status ?? '-'}</div>
                        <div className="max-w-xl whitespace-pre-wrap">{snippet(it.post_body)}</div>
                      </>
                    ) : null}
                    {it.target_type === 'comment' ? (
                      <>
                        <div>comment_status={it.comment_status ?? '-'}</div>
                        <div className="max-w-xl whitespace-pre-wrap">{snippet(it.comment_body)}</div>
                      </>
                    ) : null}
                    {it.target_type === 'user' ? (
                      <>
                        <div>{it.target_user_display_name ?? '-'}</div>
                        <div>user_status={it.target_user_status ?? '-'}</div>
                      </>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{it.reason}</div>
                  {it.details ? <div className="mt-1 max-w-xl whitespace-pre-wrap text-xs text-zinc-600">{it.details}</div> : null}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">{it.status}</span>
                </td>
                <td className="px-4 py-3">{formatDateTime(it.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    {it.status === 'open' ? (
                      <>
                        <form action={setReportStatusAction}>
                          <input type="hidden" name="id" value={it.id} />
                          <input type="hidden" name="status" value="resolved" />
                          <button className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50">Résoudre</button>
                        </form>

                        <form action={setReportStatusAction}>
                          <input type="hidden" name="id" value={it.id} />
                          <input type="hidden" name="status" value="rejected" />
                          <button className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50">Rejeter</button>
                        </form>
                      </>
                    ) : null}

                    {it.target_type === 'post' && it.post_status ? (
                      <div className="mt-2 space-y-2 border-t border-zinc-100 pt-2">
                        {it.post_status !== 'hidden' ? (
                          <form action={setTargetAction}>
                            <input type="hidden" name="target_type" value="post" />
                            <input type="hidden" name="target_id" value={it.target_id} />
                            <input type="hidden" name="status" value="hidden" />
                            <button className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50">Masquer le post</button>
                          </form>
                        ) : (
                          <form action={setTargetAction}>
                            <input type="hidden" name="target_type" value="post" />
                            <input type="hidden" name="target_id" value={it.target_id} />
                            <input type="hidden" name="status" value="published" />
                            <button className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50">Republier</button>
                          </form>
                        )}
                      </div>
                    ) : null}

                    {it.target_type === 'comment' && it.comment_status ? (
                      <div className="mt-2 space-y-2 border-t border-zinc-100 pt-2">
                        {it.comment_status !== 'hidden' ? (
                          <form action={setTargetAction}>
                            <input type="hidden" name="target_type" value="comment" />
                            <input type="hidden" name="target_id" value={it.target_id} />
                            <input type="hidden" name="status" value="hidden" />
                            <button className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50">Masquer le commentaire</button>
                          </form>
                        ) : (
                          <form action={setTargetAction}>
                            <input type="hidden" name="target_type" value="comment" />
                            <input type="hidden" name="target_id" value={it.target_id} />
                            <input type="hidden" name="status" value="published" />
                            <button className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50">Republier</button>
                          </form>
                        )}
                      </div>
                    ) : null}

                    {it.target_type === 'user' && it.target_user_status ? (
                      <div className="mt-2 space-y-2 border-t border-zinc-100 pt-2">
                        {it.target_user_status !== 'suspended' ? (
                          <form action={setTargetAction}>
                            <input type="hidden" name="target_type" value="user" />
                            <input type="hidden" name="target_id" value={it.target_id} />
                            <input type="hidden" name="status" value="suspended" />
                            <button className="rounded-lg bg-rose-600 px-3 py-1.5 text-white">Suspendre</button>
                          </form>
                        ) : (
                          <form action={setTargetAction}>
                            <input type="hidden" name="target_type" value="user" />
                            <input type="hidden" name="target_id" value={it.target_id} />
                            <input type="hidden" name="status" value="active" />
                            <button className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50">Réactiver</button>
                          </form>
                        )}
                      </div>
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
