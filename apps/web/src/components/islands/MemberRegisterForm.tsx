/**
 * The member register details in the admin area (owner, 19th November 2026): date of birth,
 * street and number, postcode, city and phone. The board backfills them for members who joined
 * before they were asked; every field is optional here. Organisations have no date of birth.
 */
import { useState } from 'preact/hooks';
import { TextField } from '@zurichjs/design/islands/Field';
import { Notice } from '@zurichjs/design/islands/Notice';
import { CONTACT_LABELS, contactFieldError, type ContactField } from '@zurichjs/membership/details';
import type { AdminMember } from '../../server/admin-views.ts';
import { api } from './admin-api.ts';
import { SubmitButton } from './forms/shared.tsx';

type Values = Record<ContactField, string>;

const INPUT: Record<ContactField, { type: string; autoComplete: string; inputMode?: 'numeric' | 'tel' }> = {
  birthDate: { type: 'date', autoComplete: 'off' },
  street: { type: 'text', autoComplete: 'off' },
  postalCode: { type: 'text', autoComplete: 'off', inputMode: 'numeric' },
  city: { type: 'text', autoComplete: 'off' },
  phone: { type: 'tel', autoComplete: 'off', inputMode: 'tel' },
};

export function MemberRegisterForm({ member, onSaved, onSignedOut }: { member: AdminMember; onSaved: (m: AdminMember) => void; onSignedOut: () => void }) {
  const fields: ContactField[] = member.kind === 'organisation' ? ['street', 'postalCode', 'city', 'phone'] : ['birthDate', 'street', 'postalCode', 'city', 'phone'];
  const initial = (): Values => ({
    birthDate: member.birthDate ?? '',
    street: member.street ?? '',
    postalCode: member.postalCode ?? '',
    city: member.city ?? '',
    phone: member.phone ?? '',
  });
  const [f, setF] = useState<Values>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const missing = fields.filter((k) => !member[k]).length;
  const err = (k: ContactField) => (error?.field === k ? error.message : undefined);

  return (
    <section aria-labelledby="h-register" class="flex flex-col gap-3">
      <div class="flex flex-col gap-1">
        <h3 id="h-register" class="m-0 text-card-title font-bold">
          Member register
        </h3>
        <p class="m-0 text-compact text-ink-2">
          {missing ? `${missing} of ${fields.length} details missing. Add what you know; you can leave a field empty.` : 'All details are on record.'}
        </p>
      </div>
      <form
        class="flex flex-col gap-4"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          const local = fields.map((k) => [k, contactFieldError(k, f[k])] as const).find(([, m]) => m);
          if (local) return setError({ field: local[0], message: local[1] });
          setBusy(true);
          setError(null);
          setSaved(false);
          // A network failure rejects: the form must recover and say so, not stay on "Saving…".
          const res = await api<{ member?: AdminMember; field?: string }>(`/api/membership/admin/members/${member.id}`, {
            method: 'PATCH',
            body: JSON.stringify(Object.fromEntries(fields.map((k) => [k, f[k]]))),
          }).catch(() => null);
          setBusy(false);
          if (!res) return setError({ message: 'Could not save the details. Check your connection and try again.' });
          const { status, body } = res;
          if (status === 401) return onSignedOut();
          if (status !== 200 || !body.member) return setError({ field: body.field, message: body.error ?? 'Could not save the details.' });
          setSaved(true);
          onSaved(body.member);
        }}
      >
        <div class="grid grid-cols-auto-sm gap-4">
          {fields.map((k) => (
            <TextField
              key={k}
              label={CONTACT_LABELS[k]}
              name={k}
              {...INPUT[k]}
              value={f[k]}
              // Locked while saving, so nothing typed meanwhile is reported as saved.
              disabled={busy}
              invalid={!!err(k)}
              error={err(k)}
              onInput={(e) => {
                setSaved(false);
                setF((x) => ({ ...x, [k]: (e.target as HTMLInputElement).value }));
              }}
            />
          ))}
        </div>
        {error && !error.field && <Notice tone="danger" live title={error.message} />}
        {saved && <Notice tone="success" live title="Details saved." />}
        <SubmitButton busy={busy} class="self-start">
          {busy ? 'Saving…' : 'Save details'}
        </SubmitButton>
      </form>
    </section>
  );
}
