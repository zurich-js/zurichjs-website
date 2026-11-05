/**
 * The Slack content agent from the terminal, for trying it safely:
 *   SANITY_DATASET=v2-preview SANITY_AGENT_TOKEN=… LLM_PROVIDER=… LLM_MODEL=… LLM_API_KEY=… \
 *     pnpm agent "change the venue of the next meetup to Smallpdf, Steinstrasse 21"
 * It writes drafts only, like in Slack, and prints what it changed. Publish in the Studio.
 */
import { modelFromEnv, runTurn, sanityStore } from '@zurichjs/agent';

const request = process.argv.slice(2).join(' ').trim();
if (!request) {
  console.error('Usage: pnpm agent "what should change"');
  process.exit(1);
}
console.log(`Dataset: ${process.env.SANITY_DATASET ?? 'production'} · model: ${process.env.LLM_PROVIDER ?? 'openai'}/${process.env.LLM_MODEL ?? '?'}\n`);
let result: Awaited<ReturnType<typeof runTurn>>;
try {
  result = await runTurn({ model: modelFromEnv(process.env), store: sanityStore(process.env), messages: [{ role: 'user', content: request }] });
} catch (err) {
  console.error(`Could not run the agent: ${(err as Error).message}`);
  process.exit(1);
}
const { text, changes } = result;
console.log(text);
for (const c of changes) {
  console.log(`\n${c.created ? 'New draft' : 'Draft changes'}: ${c.title}${c.slug ? ` (/events/${c.slug})` : ''}`);
  for (const f of c.fields) console.log(`  ${f.field}: ${JSON.stringify(f.before)} → ${JSON.stringify(f.after)}`);
}
if (!changes.length) console.log('\n(no drafts changed)');
