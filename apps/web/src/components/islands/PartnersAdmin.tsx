/**
 * The admin area's Partners section (/admin/partners), inside MembershipAdmin's sign-in and
 * sub-navigation: every sponsor, host and partner the site names, current and past
 * (docs/domains/partners/overview.md). Three views, each with its own address:
 *   /admin/partners             the list, grouped the way the site shows them
 *   /admin/partners?id=<id>     one partner: its two logo files, its hover colour, its details
 *   /admin/partners?add=1       a new partner
 * API: /api/membership/admin/partners. The site is static: a change shows after the next rebuild.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { Checkbox, FileField, SelectField, TextArea, TextField } from '@zurichjs/design/islands/Field';
import { Heading } from '@zurichjs/design/islands/Heading';
import { Tag } from '@zurichjs/design/islands/Tag';
import { cardClass, optionClass, optionInput } from '@zurichjs/design/recipes';
import { PARTNER_KINDS, TIERS, tierInfo, type LogoVariant, type PartnerKind, type Status, type Tier } from '@zurichjs/sponsorship';
import type { PartnerView } from '../../server/partner-admin.ts';
import { api, post } from './admin-api.ts';
import { ChoiceGroup, SubmitButton, TextButton, optional } from './forms/shared.tsx';
import { Notice, STATUS_LABEL, focusHeading, follow, inputChecked, inputValue, type FieldError } from './sponsors-admin/shared.tsx';

const BASE = '/api/membership/admin/partners';
const PAGE = '/admin/partners';
const LOGO_TYPES = 'image/svg+xml,image/png,image/webp';

const KIND_LABEL: Record<PartnerKind, string> = {
  sponsor: 'Sponsor',
  venue: 'Host',
  food: 'Food and drinks',
  community: 'Community',
  conference: 'Conference',
  supporting: 'Supporting partner',
};

type View = { kind: 'list' } | { kind: 'detail'; id: string } | { kind: 'add' };
const hrefFor = (v: View) => (v.kind === 'detail' ? `${PAGE}?id=${encodeURIComponent(v.id)}` : v.kind === 'add' ? `${PAGE}?add=1` : PAGE);
function readView(): View {
  const p = new URLSearchParams(window.location.search);
  const id = p.get('id');
  return id ? { kind: 'detail', id } : p.has('add') ? { kind: 'add' } : { kind: 'list' };
}

export function PartnersAdmin({ onSignedOut }: { onSignedOut: () => void }) {
  const [view, setView] = useState<View>(() => readView());
  const [moved, setMoved] = useState(false);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    const onPop = () => {
      setFlash('');
      setMoved(true);
      setView(readView());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = (v: View, notice = '') => {
    window.history.pushState(null, '', hrefFor(v));
    setFlash(notice);
    setMoved(true);
    setView(v);
  };

  if (view.kind === 'detail') return <PartnerDetail key={view.id} id={view.id} focus={moved} flash={flash} onBack={() => go({ kind: 'list' })} onSignedOut={onSignedOut} />;
  if (view.kind === 'add')
    return (
      <AddPartner
        focus={moved}
        onBack={() => go({ kind: 'list' })}
        onAdded={(id) => go({ kind: 'detail', id }, 'Partner added. Upload their logo next.')}
        onSignedOut={onSignedOut}
      />
    );
  return <PartnerList focus={moved} onOpen={(id) => go({ kind: 'detail', id })} onAdd={() => go({ kind: 'add' })} onSignedOut={onSignedOut} />;
}

/** Moves focus to the view's heading when the reader arrived from another view. */
function useArrival(focus: boolean, ready = true) {
  const heading = useRef<HTMLHeadingElement>(null);
  const arrived = useRef(false);
  useEffect(() => {
    if (!ready || arrived.current) return;
    arrived.current = true;
    if (focus) focusHeading(heading.current);
  }, [ready, focus]);
  return heading;
}

/* ------------------------------------------------------------------ the list */

/** The groups of the list, in the order of the site's attention: who pays and hosts today, then partners, then the past. */
const GROUPS: { title: string; intro: string; has: (p: PartnerView) => boolean }[] = [
  { title: 'Current sponsors', intro: 'In colour on the home page, sized by tier.', has: (p) => !p.delisted && p.current && p.kinds.includes('sponsor') },
  { title: 'Current hosts', intro: 'In colour on the home page, next to the sponsors.', has: (p) => !p.delisted && p.current && p.kinds.includes('venue') },
  { title: 'Current partners', intro: 'Community, conference and supporting partners: the first moving row.', has: (p) => !p.delisted && p.current },
  { title: 'Past', intro: 'Everyone who supported ZurichJS before: the second moving row.', has: (p) => !p.delisted },
  { title: 'Not shown', intro: 'Withdrawn from promotion. Kept so a past event can still name them.', has: () => true },
];

function PartnerList({ focus, onOpen, onAdd, onSignedOut }: { focus: boolean; onOpen: (id: string) => void; onAdd: () => void; onSignedOut: () => void }) {
  const [partners, setPartners] = useState<PartnerView[] | null>(null);
  const [error, setError] = useState('');
  const heading = useArrival(focus);

  useEffect(() => {
    void api<{ partners: PartnerView[] }>(BASE).then(({ status, body }) => {
      if (status === 401) return onSignedOut();
      if (status !== 200) return setError(body.error ?? 'Could not load the partners.');
      setPartners(body.partners);
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once
  }, []);

  // Each partner is listed once, in the first group that has it.
  const rest = [...(partners ?? [])];
  const groups = GROUPS.map((g) => {
    const mine = rest.filter(g.has);
    for (const p of mine) rest.splice(rest.indexOf(p), 1);
    return { ...g, partners: mine };
  }).filter((g) => g.partners.length > 0);

  return (
    <section aria-labelledby="h-partners" class="flex flex-col gap-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <Heading id="h-partners" size="subsection" focus={heading} class="scroll-mt-6">
          Partners
        </Heading>
        <Button variant="primary" grow href={`${PAGE}?add=1`} external={false} onClick={(e) => follow(e, onAdd)}>
          Add a partner
        </Button>
      </div>
      <p class="m-0 max-w-reading text-compact text-ink-2">
        Every sponsor, host and partner the site names, with their logos. A running sponsorship (under Sponsors) decides who is a current sponsor and at which tier; everything else
        is set here. The site follows a few minutes after a change.
      </p>
      {error && <Notice kind="error">{error}</Notice>}
      {!partners && !error && <p class="m-0 text-body text-ink-2">Loading the partners…</p>}
      {partners?.length === 0 && <p class="m-0 text-body text-ink-2">No partners yet. The site shows the built-in list until the first one is added.</p>}
      {groups.map((g) => (
        <section key={g.title} class="flex flex-col gap-3" aria-label={g.title}>
          <div class="flex flex-col gap-1">
            <Heading as="h3" size="card">
              {g.title} ({g.partners.length})
            </Heading>
            <p class="m-0 text-compact text-ink-2">{g.intro}</p>
          </div>
          <ul class="m-0 grid list-none grid-cols-auto-sm gap-3 p-0">
            {g.partners.map((p) => (
              <li key={p.id} class={cardClass('outline', 'sm')}>
                <LogoBox logo={p.logos.colour} name={p.name} />
                <TextButton
                  size="body"
                  href={`${PAGE}?id=${encodeURIComponent(p.id)}`}
                  external={false}
                  class="self-start break-words"
                  onClick={(e) => follow(e, () => onOpen(p.id))}
                >
                  {p.name}
                </TextButton>
                <span class="flex flex-wrap gap-1.5">
                  {p.kinds.map((k) => (
                    <Tag key={k}>{KIND_LABEL[k]}</Tag>
                  ))}
                  {p.tier && <Tag tone="black">{tierInfo(p.tier).name}</Tag>}
                  {!p.logos.colour && <Tag tone="danger">No logo</Tag>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

type LogoFile = NonNullable<PartnerView['logos']['colour']>;

/** A logo on white, as the site's sponsor cells show it; the name when there is no file. */
function LogoBox({ logo, name }: { logo: LogoFile | null; name: string }) {
  return (
    <div class="flex h-28 items-center justify-center rounded-card border border-grey-frame bg-white p-4">
      {logo ? <img src={logo.src} alt="" class="block max-h-full max-w-full object-contain" /> : <span class="text-center text-compact font-bold">{name}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ one partner */

interface Detail {
  partner: PartnerView;
  sponsorships: { id: string; companyName: string; status: Status; tierName: string }[];
}

function PartnerDetail({ id, focus, flash, onBack, onSignedOut }: { id: string; focus: boolean; flash: string; onBack: () => void; onSignedOut: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const heading = useArrival(focus, !!d);

  useEffect(() => {
    void api<Detail>(`${BASE}/${encodeURIComponent(id)}`).then(({ status, body }) => {
      if (status === 401) return onSignedOut();
      if (status !== 200) return setError(body.error ?? 'Could not load the partner.');
      setD(body);
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once per partner (the view is keyed by id)
  }, []);

  const back = (
    <TextButton href={PAGE} external={false} class="self-start" onClick={(e) => follow(e, onBack)}>
      All partners
    </TextButton>
  );
  if (error)
    return (
      <div class="flex flex-col gap-4">
        {back}
        <Notice kind="error">{error}</Notice>
      </div>
    );
  if (!d) return <p class="m-0 text-body text-ink-2">Loading the partner…</p>;
  const p = d.partner;
  const set = (partner: PartnerView) => setD({ ...d, partner });
  const running = d.sponsorships.filter((s) => s.status === 'active' || s.status === 'past_due' || s.status === 'ending');

  return (
    <article class="flex flex-col gap-10">
      <div class="flex flex-col gap-3">
        {back}
        <Heading size="subsection" focus={heading} class="scroll-mt-6 break-words">
          {p.name}
        </Heading>
        <span class="flex flex-wrap gap-1.5">
          {p.delisted ? (
            <Tag tone="danger">Not shown</Tag>
          ) : (
            <Tag tone={p.current || running.length > 0 ? 'black' : 'grey'}>{p.current || running.length > 0 ? 'Current' : 'Past'}</Tag>
          )}
          {p.kinds.map((k) => (
            <Tag key={k}>{KIND_LABEL[k]}</Tag>
          ))}
        </span>
        {flash && <Notice kind="done">{flash}</Notice>}
      </div>

      <Logos partner={p} onChanged={set} onSignedOut={onSignedOut} />

      {d.sponsorships.length > 0 && (
        <section aria-labelledby="h-partner-sponsorships" class="flex flex-col gap-3">
          <Heading as="h3" size="card" id="h-partner-sponsorships">
            Sponsorships
          </Heading>
          <p class="m-0 max-w-reading text-compact text-ink-2">
            While one is running, it makes them a current sponsor at its tier, whatever is set below. When the last one has ended, they become a past sponsor.
          </p>
          <ul class="m-0 flex list-none flex-col gap-2 p-0">
            {d.sponsorships.map((s) => (
              <li key={s.id} class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <TextButton size="body" href={`/admin/sponsors?id=${encodeURIComponent(s.id)}`} external={false}>
                  {s.companyName}
                </TextButton>
                <span class="text-compact text-ink-2">
                  {s.tierName}, {STATUS_LABEL[s.status].toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <EditPartner partner={p} hasRunning={running.length > 0} onSaved={set} onSignedOut={onSignedOut} />
    </article>
  );
}

/* ------------------------------------------------------------------ logos and the hover colour */

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;
const HEX = /^#[0-9a-f]{6}$/i;
/** Relative luminance of #rrggbb, as LogoTile does: a white logo on a dark colour, a black one on a light colour. */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

const VARIANTS: { key: LogoVariant; title: string; hint: string }[] = [
  { key: 'colour', title: 'Colour logo', hint: 'The logo as they want it shown: the sponsor and host cells, event pages.' },
  {
    key: 'mono',
    title: 'One-colour logo',
    hint: 'Optional. A single-colour version on a transparent background, for the moving rows and for the hover colour. Without it the colour logo is drawn in one colour by a filter.',
  },
];

function Logos({ partner: p, onChanged, onSignedOut }: { partner: PartnerView; onChanged: (p: PartnerView) => void; onSignedOut: () => void }) {
  const [busy, setBusy] = useState<LogoVariant | 'colour-value' | null>(null);
  const [error, setError] = useState<FieldError>(null);
  const [done, setDone] = useState('');
  const [bg, setBg] = useState(p.logoBackground ?? '');
  const [picker, setPicker] = useState(0);

  const finish = (status: number, body: { partner?: PartnerView; error?: string; field?: string }, field: string, said: string) => {
    setBusy(null);
    if (status === 401) return onSignedOut();
    if (status !== 200 || !body.partner) return setError({ field: body.field ?? field, message: body.error ?? 'Could not save that.' });
    setPicker((n) => n + 1);
    setDone(said);
    onChanged(body.partner);
  };
  const start = (what: LogoVariant | 'colour-value') => {
    setBusy(what);
    setError(null);
    setDone('');
  };
  const upload = async (variant: LogoVariant, file: File | null) => {
    if (!file || busy) return;
    start(variant);
    const data = new FormData();
    data.set('file', file);
    const { status, body } = await api<{ partner: PartnerView }>(`${BASE}/${encodeURIComponent(p.id)}/logos/${variant}`, { method: 'POST', body: data });
    finish(status, body, variant, 'Logo saved. The site shows it after the next rebuild.');
  };
  const remove = async (variant: LogoVariant) => {
    if (busy) return;
    start(variant);
    const { status, body } = await api<{ partner: PartnerView }>(`${BASE}/${encodeURIComponent(p.id)}/logos/${variant}`, { method: 'DELETE' });
    finish(status, body, variant, 'Logo removed.');
  };
  const saveColour = async (value: string) => {
    if (busy) return;
    start('colour-value');
    const { status, body } = await post<{ partner: PartnerView }>(`${BASE}/${encodeURIComponent(p.id)}`, { logoBackground: value.trim() || null });
    if (status === 200 && body.partner) setBg(body.partner.logoBackground ?? '');
    finish(status, body, 'logoBackground', value.trim() ? 'Hover colour saved.' : 'Hover colour removed.');
  };

  const err = (field: string) => (error?.field === field ? error.message : undefined);
  const hover = HEX.test(bg.trim()) ? bg.trim().toLowerCase() : null;
  const colour = p.logos.colour;
  const mono = p.logos.mono ?? colour;

  return (
    <section aria-labelledby="h-partner-logos" class="flex flex-col gap-6">
      <div class="flex flex-col gap-1">
        <Heading as="h3" size="card" id="h-partner-logos">
          Logos and hover colour
        </Heading>
        <p class="m-0 max-w-reading text-compact text-ink-2">SVG, PNG or WebP, up to 2 MB each. A new file replaces the one before.</p>
      </div>
      {done && <Notice kind="done">{done}</Notice>}

      <div class="grid grid-cols-auto-sm gap-4">
        {VARIANTS.map((v) => {
          const logo = p.logos[v.key];
          return (
            <div key={v.key} class={cardClass('outline', 'md')}>
              <div class="flex h-28 items-center justify-center rounded-card border border-grey-frame bg-white p-4">
                {logo ? (
                  <img src={logo.src} alt={`${v.title} of ${p.name}`} class="block max-h-full max-w-full object-contain" />
                ) : (
                  <span class="text-compact text-grey-text">None</span>
                )}
              </div>
              <FileField
                key={`${v.key}-${picker}`}
                label={v.title}
                hint={v.hint}
                button={logo ? 'Replace the file' : 'Choose a file'}
                accept={LOGO_TYPES}
                fileName={busy === v.key ? 'Saving…' : logo ? `${logo.filename}, ${kb(logo.bytes)}` : null}
                disabled={!!busy}
                invalid={!!err(v.key)}
                error={err(v.key)}
                onFile={(f) => void upload(v.key, f)}
              />
              {logo && (
                <TextButton class="self-start" disabled={!!busy} onClick={() => void remove(v.key)}>
                  Remove
                </TextButton>
              )}
            </div>
          );
        })}
      </div>

      <form
        class={cardClass('outline', 'md', 'max-w-form')}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void saveColour(bg);
        }}
      >
        <TextField
          label={optional('Hover colour')}
          hint="The colour their cell turns when someone points at it, as a # and six hex digits. The logo is then drawn in one colour on it. Leave it empty for a white cell that keeps the colour logo."
          name="logoBackground"
          placeholder="#rrggbb"
          value={bg}
          invalid={!!err('logoBackground')}
          error={err('logoBackground')}
          onInput={(e) => setBg(inputValue(e))}
        />
        <TextField label="Or pick one" name="logoBackgroundPicker" type="color" {...(hover ? { value: hover } : {})} onInput={(e) => setBg(inputValue(e))} />
        <div class="flex flex-wrap gap-3">
          <SubmitButton busy={busy === 'colour-value'} grow>
            {busy === 'colour-value' ? 'Saving…' : 'Save hover colour'}
          </SubmitButton>
          {p.logoBackground && (
            <Button variant="secondary" grow disabled={!!busy} onClick={() => void saveColour('')}>
              Remove the colour
            </Button>
          )}
        </div>
      </form>

      {colour && (
        <div class="flex flex-col gap-3">
          <Heading as="h4" size="card">
            How it looks
          </Heading>
          <div class="grid max-w-wide grid-cols-auto-sm gap-3">
            <Preview caption="Sponsor or host cell">
              <div class="flex h-28 items-center justify-center rounded-card border border-grey-frame bg-white p-4">
                <img src={colour.src} alt="" class="block max-h-full max-w-full object-contain" />
              </div>
            </Preview>
            <Preview caption={hover ? `The same cell on hover (${hover})` : 'On hover: no change (no hover colour)'}>
              {/* eslint-disable-next-line no-restricted-syntax -- the hover colour is the partner's own, typed here, as a CSS custom property */}
              <div class="flex h-28 items-center justify-center rounded-card border border-grey-frame bg-(--logo-bg) p-4" style={{ '--logo-bg': hover ?? 'var(--color-white)' }}>
                <img
                  src={hover ? mono!.src : colour.src}
                  alt=""
                  class={
                    hover
                      ? luminance(hover) > 0.5
                        ? 'block max-h-full max-w-full object-contain brightness-0'
                        : 'block max-h-full max-w-full object-contain brightness-0 invert'
                      : 'block max-h-full max-w-full object-contain'
                  }
                />
              </div>
            </Preview>
            <Preview caption="In a moving row (partners, past supporters)">
              <div class="flex h-28 items-center justify-center rounded-card border border-grey-frame bg-white p-4">
                <img src={mono!.src} alt="" class="block max-h-full max-w-full object-contain opacity-50 brightness-0" />
              </div>
            </Preview>
          </div>
        </div>
      )}
    </section>
  );
}

function Preview({ caption, children }: { caption: string; children: ComponentChildren }) {
  return (
    <figure class="m-0 flex flex-col gap-1.5">
      {children}
      <figcaption class="text-meta text-grey-text">{caption}</figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ details */

interface Form {
  id: string;
  name: string;
  url: string;
  kinds: PartnerKind[];
  tier: '' | Tier;
  current: boolean;
  delisted: boolean;
  description: string;
  blurb: string;
  allowReferrer: boolean;
}
const formOf = (p?: PartnerView): Form => ({
  id: p?.id ?? '',
  name: p?.name ?? '',
  url: p?.url ?? '',
  kinds: p?.kinds ?? ['sponsor'],
  tier: p?.tier ?? '',
  current: p?.current ?? false,
  delisted: p?.delisted ?? false,
  description: p?.description ?? '',
  blurb: p?.blurb ?? '',
  allowReferrer: p?.allowReferrer ?? false,
});
const payload = ({ id: _id, ...f }: Form) => ({ ...f, tier: f.tier || null });

function Fields({
  f,
  set,
  err,
  hasRunning,
  isNew,
}: {
  f: Form;
  set: (patch: Partial<Form>) => void;
  err: (field: string) => string | undefined;
  hasRunning?: boolean;
  isNew?: boolean;
}) {
  const sponsor = f.kinds.includes('sponsor');
  return (
    <>
      <div class="grid grid-cols-auto-sm gap-4">
        <TextField label="Name" name="name" value={f.name} invalid={!!err('name')} error={err('name')} onInput={(e) => set({ name: inputValue(e) })} />
        <TextField
          label={optional('Website')}
          name="url"
          type="url"
          placeholder="https://"
          hint="Where their logo links to."
          value={f.url}
          invalid={!!err('url')}
          error={err('url')}
          onInput={(e) => set({ url: inputValue(e) })}
        />
        {isNew && (
          <TextField
            label={optional('Id')}
            name="id"
            hint="Lowercase letters, numbers and hyphens. Made from the name when empty. It cannot be changed later."
            value={f.id}
            invalid={!!err('id')}
            error={err('id')}
            onInput={(e) => set({ id: inputValue(e) })}
          />
        )}
      </div>
      <ChoiceGroup legend="What they are to ZurichJS" error={err('kinds')} class="flex flex-wrap gap-2">
        {PARTNER_KINDS.map((k) => (
          <label key={k} class={optionClass(!!err('kinds'))}>
            <input
              type="checkbox"
              value={k}
              checked={f.kinds.includes(k)}
              onChange={() => set({ kinds: f.kinds.includes(k) ? f.kinds.filter((x) => x !== k) : [...f.kinds, k] })}
              class={optionInput}
            />
            <span>{KIND_LABEL[k]}</span>
          </label>
        ))}
      </ChoiceGroup>
      {sponsor && (
        <SelectField
          label={optional('Sponsorship tier')}
          name="tier"
          hint={
            hasRunning
              ? 'Their running sponsorship decides the tier on the site. This one is only used without it.'
              : 'Sets the size of their cell. A running sponsorship (under Sponsors) decides it instead.'
          }
          value={f.tier}
          invalid={!!err('tier')}
          error={err('tier')}
          class="max-w-form"
          onChange={(e) => set({ tier: inputValue(e) as Form['tier'] })}
        >
          <option value="">No tier</option>
          {TIERS.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </SelectField>
      )}
      <Checkbox
        label={
          hasRunning ? 'Current (their running sponsorship makes them current anyway)' : 'Current: they support ZurichJS today. Without it they are thanked as a past supporter.'
        }
        checked={f.current}
        onChange={(e) => set({ current: inputChecked(e) })}
      />
      <Checkbox
        label="Do not show them anywhere (withdrawn from promotion). A past event they hosted still names them."
        checked={f.delisted}
        onChange={(e) => set({ delisted: inputChecked(e) })}
      />
      <TextField
        label={optional('In a few words')}
        name="description"
        hint="For example: IT recruitment in Switzerland."
        value={f.description}
        invalid={!!err('description')}
        error={err('description')}
        onInput={(e) => set({ description: inputValue(e) })}
      />
      {sponsor && (
        <>
          <TextArea
            label={optional('In their own words')}
            hint="A few sentences, shown with tiered sponsors on the partners page."
            rows={3}
            value={f.blurb}
            invalid={!!err('blurb')}
            error={err('blurb')}
            onInput={(e) => set({ blurb: inputValue(e) })}
          />
          <Checkbox
            label="They asked to see referrals: links to their site say where the visitor came from."
            checked={f.allowReferrer}
            onChange={(e) => set({ allowReferrer: inputChecked(e) })}
          />
        </>
      )}
    </>
  );
}

const FIELDS = ['id', 'name', 'url', 'kinds', 'tier', 'description', 'blurb'];

function EditPartner({ partner: p, hasRunning, onSaved, onSignedOut }: { partner: PartnerView; hasRunning: boolean; onSaved: (p: PartnerView) => void; onSignedOut: () => void }) {
  const [f, setF] = useState(() => formOf(p));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  const [done, setDone] = useState('');
  const err = (field: string) => (error?.field === field ? error.message : undefined);

  return (
    <section aria-labelledby="h-partner-details" class="flex flex-col gap-4">
      <Heading as="h3" size="card" id="h-partner-details">
        Details
      </Heading>
      <form
        class={cardClass('outline', 'lg')}
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(null);
          setDone('');
          const { status, body } = await post<{ partner: PartnerView }>(`${BASE}/${encodeURIComponent(p.id)}`, payload(f));
          setBusy(false);
          if (status === 401) return onSignedOut();
          if (status !== 200 || !body.partner) return setError({ field: body.field, message: body.error ?? 'Could not save the partner.' });
          setDone('Saved. The site follows after the next rebuild.');
          onSaved(body.partner);
        }}
      >
        <Fields f={f} set={(patch) => setF((x) => ({ ...x, ...patch }))} err={err} hasRunning={hasRunning} />
        <p class="m-0 text-meta text-grey-text">Id: {p.id}</p>
        {error && !FIELDS.includes(error.field ?? '') && <Notice kind="error">{error.message}</Notice>}
        {done && <Notice kind="done">{done}</Notice>}
        <SubmitButton busy={busy} grow class="self-start">
          {busy ? 'Saving…' : 'Save details'}
        </SubmitButton>
      </form>
    </section>
  );
}

function AddPartner({ focus, onBack, onAdded, onSignedOut }: { focus: boolean; onBack: () => void; onAdded: (id: string) => void; onSignedOut: () => void }) {
  const [f, setF] = useState(() => formOf());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  const heading = useArrival(focus);
  const err = (field: string) => (error?.field === field ? error.message : undefined);

  return (
    <section aria-labelledby="h-add-partner" class="flex flex-col gap-6">
      <TextButton href={PAGE} external={false} class="self-start" onClick={(e) => follow(e, onBack)}>
        All partners
      </TextButton>
      <Heading id="h-add-partner" size="subsection" focus={heading} class="scroll-mt-6">
        Add a partner
      </Heading>
      <form
        class={cardClass('outline', 'lg')}
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(null);
          const { status, body } = await post<{ partner: PartnerView }>(BASE, { ...payload(f), ...(f.id.trim() ? { id: f.id.trim() } : {}) });
          setBusy(false);
          if (status === 401) return onSignedOut();
          if (status !== 200 || !body.partner) return setError({ field: body.field, message: body.error ?? 'Could not add the partner.' });
          onAdded(body.partner.id);
        }}
      >
        <Fields f={f} set={(patch) => setF((x) => ({ ...x, ...patch }))} err={err} isNew />
        {error && !FIELDS.includes(error.field ?? '') && <Notice kind="error">{error.message}</Notice>}
        <div class="flex flex-wrap gap-3">
          <SubmitButton busy={busy} grow>
            {busy ? 'Adding…' : 'Add partner'}
          </SubmitButton>
          <Button variant="secondary" grow href={PAGE} external={false} onClick={(e) => follow(e, onBack)}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}
