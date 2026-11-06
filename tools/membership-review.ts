/**
 * Posts the Slack review card (Approve / Reject) for membership requests that
 * are waiting, e.g. when the card could not be posted at the time. Each run
 * posts new cards: an older card for the same request still works, and the
 * second decision is refused.
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… SLACK_AGENT_BOT_TOKEN=… SLACK_MEMBERSHIP_CHANNEL_ID=… \
 *     pnpm membership:review            # lists the waiting requests, posts nothing
 *     pnpm membership:review --post     # posts a card for each
 *     pnpm membership:review <id> --post
 */
import { supabaseStore } from '@zurichjs/membership';
import { membershipSlack, postReviewCard } from '../apps/web/src/server/membership-review.ts';

const args = process.argv.slice(2);
const post = args.includes('--post');
const ids = args.filter((a) => !a.startsWith('--'));

let store: ReturnType<typeof supabaseStore>;
try {
  store = supabaseStore(process.env);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
const waiting = ids.length ? (await Promise.all(ids.map((id) => store.get(id)))).filter((m) => m?.status === 'applied') : await store.byStatus('applied');
if (!waiting.length) {
  console.log('No membership requests are waiting.');
  process.exit(0);
}
for (const m of waiting)
  console.log(`  ${m!.id}  ${m!.name}${m!.organisationName ? ` (${m!.organisationName})` : ''}, ${m!.level} ${m!.cycle}, since ${m!.createdAt.slice(0, 10)}`);
if (!post) {
  console.log(`\n${waiting.length} waiting. Add --post to post their review cards to Slack.`);
  process.exit(0);
}
const slack = membershipSlack(process.env);
let failed = 0;
// The applicant's message was never stored (it went to the first card only).
for (const m of waiting) if (!(await postReviewCard(m!, undefined, { env: process.env, slack, log: console.error }))) failed++;
console.log(`${waiting.length - failed} card${waiting.length - failed === 1 ? '' : 's'} posted${failed ? `, ${failed} failed` : ''}.`);
process.exit(failed ? 1 : 0);
