/**
 * The CFP bot's behaviour around the model, all deterministic code:
 *
 * - handleCfpMessage: a mention or a thread reply in #cfp → who owns the thread, the limits, one
 *   model turn, the public reply, and the private confirmation when the draft is ready.
 * - handleCfpAction: the confirmation's buttons. Submit sends the proposal (never the model).
 * - saveCfpEmail: the private email field, when the Slack profile shows none.
 *
 * The person always comes from the verified Slack payload. Only the person who started a thread
 * can change or send its draft; the store enforces it again in SQL.
 */
import type { LanguageModel } from 'ai';
import { schemas } from '@zurichjs/forms';
import { missingFields } from './fields.ts';
import { CFP_DRAFT_RETENTION_DAYS, CFP_MAX_SUBMISSIONS_PER_DAY, submissionsToday, turnLimit } from './limits.ts';
import { CFP_HELP, isCfpHelp } from './prompt.ts';
import { runCfpTurn } from './run.ts';
import { CFP_ACTIONS, cfpThreadToMessages, confirmationBlocks, emailView, replyBlocks, type CfpSlack } from './slack.ts';
import { OpenDraftExists, type CfpDraft, type CfpOwner, type CfpStore } from './store.ts';
import { escapeMrkdwn } from './text.ts';

type Env = Record<string, string | undefined>;

export interface CfpPhoto {
  bytes: Uint8Array;
  name: string;
  type: string;
}

/** Sends a checked proposal: the host passes it to forwardForm('cfp', …), as the website form does. */
export type SubmitCfpProposal = (p: { data: Record<string, unknown>; photo?: CfpPhoto; slackUserId: string }) => Promise<{ id: string }>;

export interface CfpDeps {
  store: CfpStore;
  slack: CfpSlack;
  /** Created only when a turn needs it, so a missing key does not break the buttons. */
  model: () => LanguageModel;
  submit: SubmitCfpProposal;
  env?: Env;
  now?: () => Date;
  log?: (m: string) => void;
  /** For the Slack photo download. */
  fetch?: typeof fetch;
}

/** One message from Slack, already verified and filtered by slack-cfp-events. */
export interface CfpJob {
  team: string;
  channel: string;
  ts: string;
  threadTs: string;
  user: string;
  text: string;
  /** An @mention (app_mention), not just a reply in a thread. */
  mention: boolean;
}

export const CFP_MESSAGES = {
  received: 'Proposal received. The organisers will be in touch.',
  newThread: 'To propose a talk, mention me in a new message in the channel and I’ll start a thread for it.',
  notYours: 'This thread is someone else’s talk proposal, so only they can change it. To propose your own talk, mention me in a new message in the channel.',
  openElsewhere: 'You already have a talk proposal in progress in another thread here. Carry on there, or ask me there to delete it so you can start again.',
  sending: 'Your proposal is being sent. One moment.',
  tooManyMessages: 'That’s a lot of messages in one hour. Please take a short break and try again later; your draft is kept.',
  busy: 'I can’t take more proposals today. Please try again tomorrow, or use the form at zurichjs.com/cfp.',
  failed: 'Sorry, something went wrong on my side. Your draft is kept; try again in a minute.',
  onlyOwner: 'Only the person who started this proposal can change or send it.',
  gone: 'This proposal is no longer here. Mention me in a new message to start again.',
  keepEditing: 'OK. Tell me in the thread what to change, and I’ll show you the draft again.',
  sent: 'Sent. Thank you!',
} as const;

const owner = (d: { team: string; user: string }): CfpOwner => ({ team: d.team, user: d.user });

export async function handleCfpMessage(job: CfpJob, deps: CfpDeps): Promise<string> {
  const { store, slack, now = () => new Date() } = deps;
  const say = (text: string, blocks?: unknown[]) => slack.post(job.channel, job.threadTs, text, blocks);
  await store.purge(CFP_DRAFT_RETENTION_DAYS).catch((e: Error) => deps.log?.(`purge failed: ${e.message}`));

  if (job.mention && isCfpHelp(job.text)) {
    await say(CFP_HELP);
    return 'help';
  }

  let draft = await store.byThread({ team: job.team, channel: job.channel, threadTs: job.threadTs });
  if (!draft) {
    if (!job.mention) return 'ignored: not a CFP thread';
    if (job.threadTs !== job.ts) {
      await say(CFP_MESSAGES.newThread);
      return 'no draft in this thread';
    }
    try {
      draft = await store.create({ team: job.team, user: job.user, channel: job.channel, threadTs: job.threadTs });
    } catch (err) {
      if (!(err instanceof OpenDraftExists)) throw err;
      await say(CFP_MESSAGES.openElsewhere);
      return 'open draft elsewhere';
    }
  } else if (draft.user !== job.user || draft.team !== job.team) {
    // Other people may talk in the thread; that is context for the speaker's next turn, never a turn.
    if (job.mention) await say(CFP_MESSAGES.notYours);
    return 'not the owner';
  }
  if (draft.status === 'submitting') {
    await say(CFP_MESSAGES.sending);
    return 'submitting';
  }

  const hit = await turnLimit(store, owner(draft), now(), deps.env);
  if (hit) {
    await say(hit === 'messages' ? CFP_MESSAGES.tooManyMessages : CFP_MESSAGES.busy);
    return `limit: ${hit}`;
  }
  await store.record('message', job.team, job.user);

  const bot = await slack.botUserId();
  const thread = await slack.replies(job.channel, job.threadTs);
  let messages = cfpThreadToMessages(thread, bot, job.user, job.ts);
  if (!messages.length) messages = [{ role: 'user', content: job.text.replace(/<[@#!][^>]*>/g, '').trim() || 'Hi' }];

  let steps = 1;
  try {
    const r = await runCfpTurn({ model: deps.model(), store, draft, messages });
    steps = r.steps;
    const show = r.draft && (r.confirm || r.changed) ? r.draft.fields : undefined;
    // The notification text is escaped like the blocks: the model never posts a mention or a link.
    await say(escapeMrkdwn(r.text), replyBlocks(r.text, show));
    if (r.confirm && r.draft) await showConfirmation(r.draft, deps);
    return r.confirm ? 'confirmation shown' : r.discarded ? 'discarded' : 'replied';
  } finally {
    await store.record('model_call', job.team, null, Math.max(1, Math.min(100, steps))).catch(() => undefined);
  }
}

/** The private confirmation: name and masked email from the Slack profile, photo question, Submit. */
export async function showConfirmation(draft: CfpDraft, deps: CfpDeps, responseUrl?: string): Promise<void> {
  const profile = await deps.slack.profile(draft.user);
  const email = draft.email ?? profile.email;
  const blocks = confirmationBlocks({
    draftId: draft.id,
    fields: draft.fields,
    name: profile.name,
    email,
    emailFromProfile: !draft.email && !!profile.email,
    hasPhoto: profile.photoUrls.length > 0,
    photo: draft.photo,
  });
  const text = 'Check your proposal before you send it. Only you can see this.';
  if (responseUrl) await deps.slack.respond(responseUrl, { replace_original: true, text, blocks });
  else await deps.slack.ephemeral(draft.channel, draft.user, draft.threadTs, text, blocks);
}

/** A button on the private confirmation, from a verified Slack interaction. */
export interface CfpAction {
  team: string;
  user: string;
  channel: string;
  action: string;
  value: string;
  /** The radio button chosen (photo yes/no). */
  selected?: string;
  responseUrl?: string;
  triggerId?: string;
}

export async function handleCfpAction(a: CfpAction, deps: CfpDeps): Promise<string> {
  const { store, slack } = deps;
  const answer = (text: string) => (a.responseUrl ? slack.respond(a.responseUrl, { replace_original: true, text }) : slack.ephemeral(a.channel, a.user, '', text));
  const draft = await store.byId(a.value);
  if (!draft) {
    await answer(CFP_MESSAGES.gone);
    return 'gone';
  }
  if (draft.user !== a.user || draft.team !== a.team) {
    await slack.ephemeral(a.channel, a.user, draft.threadTs, CFP_MESSAGES.onlyOwner);
    return 'not the owner';
  }
  switch (a.action) {
    case CFP_ACTIONS.photo:
      await store.update(draft.id, owner(draft), { photo: a.selected === 'yes' });
      return `photo ${a.selected === 'yes' ? 'yes' : 'no'}`;
    case CFP_ACTIONS.edit:
      await answer(CFP_MESSAGES.keepEditing);
      return 'keep editing';
    case CFP_ACTIONS.email:
      if (a.triggerId) await slack.openView(a.triggerId, emailView({ draftId: draft.id, channel: draft.channel, threadTs: draft.threadTs, responseUrl: a.responseUrl }));
      return 'email field opened';
    case CFP_ACTIONS.submit:
      return submitDraft(draft, a, deps, answer);
    default:
      return 'unknown action';
  }
}

async function submitDraft(draft: CfpDraft, a: CfpAction, deps: CfpDeps, answer: (t: string) => Promise<void>): Promise<string> {
  const { store, slack, now = () => new Date() } = deps;
  const who = owner(draft);
  if ((await submissionsToday(store, who, now())) >= CFP_MAX_SUBMISSIONS_PER_DAY) {
    await answer(`You’ve sent ${CFP_MAX_SUBMISSIONS_PER_DAY} proposals today, the most per day. Your draft is kept; press Submit again tomorrow.`);
    return 'limit: submissions';
  }
  const missing = Object.keys(missingFields(draft.fields));
  if (missing.length) {
    await answer(`The draft is not complete yet (${missing.join(', ')}). Tell me in the thread, and I’ll show it again.`);
    return 'incomplete';
  }
  const claimed = await store.claim(draft.id, who);
  if (!claimed) {
    await answer(CFP_MESSAGES.sending);
    return 'already submitting';
  }
  try {
    const profile = await slack.profile(claimed.user);
    const email = claimed.email ?? profile.email;
    if (!email) {
      await store.release(claimed.id, who);
      if (a.triggerId) await slack.openView(a.triggerId, emailView({ draftId: claimed.id, channel: claimed.channel, threadTs: claimed.threadTs, responseUrl: a.responseUrl }));
      return 'needs email';
    }
    const f = claimed.fields;
    const parsed = schemas.cfp.safeParse({ ...f, name: profile.name, email, ...(f.jobTitle || profile.jobTitle ? { jobTitle: f.jobTitle ?? profile.jobTitle } : {}) });
    if (!parsed.success) {
      await store.release(claimed.id, who);
      const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
      await answer(
        fields.includes('name')
          ? 'Your Slack profile has no name. Add your full name to your Slack profile, then press Submit again.'
          : `Something in the draft needs fixing (${fields.join(', ')}). Tell me in the thread, and I’ll show it again.`,
      );
      return 'invalid';
    }
    const photo = claimed.photo ? await downloadSlackPhoto(profile.photoUrls, deps.fetch ?? fetch, deps.log) : undefined;
    const { id } = await deps.submit({ data: parsed.data, ...(photo ? { photo } : {}), slackUserId: claimed.user });
    await store.record('submission', claimed.team, claimed.user);
    await store.remove(claimed.id, who);
    await slack.post(claimed.channel, claimed.threadTs, CFP_MESSAGES.received);
    await answer(CFP_MESSAGES.sent).catch(() => undefined);
    deps.log?.(`submitted ${id}`);
    return 'submitted';
  } catch (err) {
    await store.release(claimed.id, who).catch(() => undefined);
    deps.log?.(`submit failed: ${(err as Error).message}`);
    await answer(CFP_MESSAGES.failed).catch(() => undefined);
    return 'failed';
  }
}

/** The email typed in the private field. Returns an error message for the field, or null. */
export function cfpEmailError(value: string | undefined): string | null {
  const r = schemas.cfp.shape.email.safeParse(value ?? '');
  return r.success ? null : (r.error.issues[0]?.message ?? 'Enter an email address.');
}

export interface CfpEmailSubmission {
  team: string;
  user: string;
  email: string;
  /** The modal's private_metadata. */
  meta: string;
}

/** Saves the email from the private field and shows the confirmation again, with it masked. */
export async function saveCfpEmail(s: CfpEmailSubmission, deps: CfpDeps): Promise<string> {
  let meta: { draftId?: string; responseUrl?: string };
  try {
    meta = JSON.parse(s.meta) as typeof meta;
  } catch {
    return 'bad metadata';
  }
  const draft = meta.draftId ? await deps.store.byId(meta.draftId) : null;
  if (!draft) return 'gone';
  if (draft.user !== s.user || draft.team !== s.team) return 'not the owner';
  const saved = await deps.store.update(draft.id, owner(draft), { email: s.email.trim() });
  if (!saved) return 'not saved';
  await showConfirmation(saved, deps, meta.responseUrl);
  return 'email saved';
}

/* ---------------------------------------------------------------- the Slack photo */

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const isSlackImageHost = (u: string) => {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && (/(^|\.)slack-edge\.com$/.test(url.hostname) || /(^|\.)slack\.com$/.test(url.hostname));
  } catch {
    return false;
  }
};

/** The first Slack profile photo that is a JPEG, PNG or WebP of at most 5 MB (as on the website form). */
export async function downloadSlackPhoto(urls: string[], fetchImpl: typeof fetch, log?: (m: string) => void): Promise<CfpPhoto | undefined> {
  for (const url of urls.filter(isSlackImageHost)) {
    try {
      const res = await fetchImpl(url);
      const type = (res.headers.get('content-type') ?? '').split(';')[0]!.trim();
      if (!res.ok || !PHOTO_TYPES.includes(type)) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_PHOTO_BYTES) continue;
      return { bytes, type, name: `slack-photo.${type.split('/')[1] === 'jpeg' ? 'jpg' : type.split('/')[1]}` };
    } catch (err) {
      log?.(`photo download failed: ${(err as Error).message}`);
    }
  }
  return undefined;
}
