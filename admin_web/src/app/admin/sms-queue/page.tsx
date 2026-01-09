import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { listSmsQueue, retrySms } from '@/lib/data/sms_queue';

export default async function SmsQueueAdminPage() {
  try {
    await requireAdmin();
  } catch {
    redirect('/login');
  }

  const items = await listSmsQueue(200);

  async function retryAction(formData: FormData) {
    'use server';
    const id = Number(formData.get('id'));
    await retrySms(id);
    revalidatePath('/admin/sms-queue');
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">SMS Queue</h1>
      </header>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Try</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-zinc-100 align-top">
                <td className="px-4 py-3 font-mono text-xs">{it.to_phone}</td>
                <td className="px-4 py-3">
                  <div className="max-w-xl whitespace-pre-wrap">{it.message}</div>
                  {it.last_error ? <div className="mt-1 text-xs text-rose-700">{it.last_error}</div> : null}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">{it.status}</span>
                </td>
                <td className="px-4 py-3">{it.try_count}</td>
                <td className="px-4 py-3">{formatDateTime(it.created_at)}</td>
                <td className="px-4 py-3">
                  {it.status === 'failed' ? (
                    <form action={retryAction}>
                      <input type="hidden" name="id" value={it.id} />
                      <button className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50">Retry</button>
                    </form>
                  ) : (
                    <span className="text-zinc-500">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
