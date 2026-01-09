import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/auth';
import { approveInstitution, listInstitutions, rejectInstitution } from '@/lib/data/institutions';
import { formatDateTime } from '@/lib/format';

export default async function InstitutionsAdminPage() {
  let user;
  try {
    user = await requireAdmin();
  } catch {
    redirect('/login');
  }

  const items = await listInstitutions();

  async function approveAction(formData: FormData) {
    'use server';
    const id = Number(formData.get('id'));
    await approveInstitution(id, user.id);
    revalidatePath('/admin/institutions');
  }

  async function rejectAction(formData: FormData) {
    'use server';
    const id = Number(formData.get('id'));
    const reason = String(formData.get('reason') ?? '').trim();
    await rejectInstitution(id, user.id, reason.length ? reason : null);
    revalidatePath('/admin/institutions');
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Établissements</h1>
      </header>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Ville</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Créé</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-zinc-100">
                <td className="px-4 py-3 font-medium">{it.name}</td>
                <td className="px-4 py-3">{it.city}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">{it.validation_status}</span>
                </td>
                <td className="px-4 py-3">{formatDateTime(it.created_at)}</td>
                <td className="px-4 py-3">
                  {it.validation_status === 'pending' ? (
                    <div className="flex flex-col gap-2">
                      <form action={approveAction}>
                        <input type="hidden" name="id" value={it.id} />
                        <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white">Approuver</button>
                      </form>

                      <form action={rejectAction} className="flex flex-col gap-2">
                        <input type="hidden" name="id" value={it.id} />
                        <input
                          name="reason"
                          placeholder="Raison (optionnel)"
                          className="w-full rounded-lg border border-zinc-200 px-3 py-1.5"
                        />
                        <button className="rounded-lg bg-rose-600 px-3 py-1.5 text-white">Refuser</button>
                      </form>
                    </div>
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
