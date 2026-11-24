def rep(p, old, new):
    s=open(p).read()
    assert s.count(old)==1, (p, old[:70])
    open(p,'w').write(s.replace(old,new))
p='src/server/sponsor-stripe.ts'
rep(p,"""/** A plan change waiting for the renewal: { tier, cycle, from }. Null once it took effect. */
export async function pendingChange(subscriptionId: string, deps: StripeDeps): Promise<{ tier: Tier; cycle: Cycle; from: string } | null> {
  const s = await getSub(subscriptionId, deps, true);
  const sched = typeof s.schedule === 'object' ? s.schedule : null;
  const plan = fromLookupKey(sched?.metadata?.plan);
  const from = sched?.phases?.[0]?.end_date;
  if (!sched || !plan || !from) return null;
  // After the switch the schedule stays attached for one more term: not "waiting" any more.
  if (from <= nowUnix(deps) || sched.metadata?.plan === s.items?.data?.[0]?.price?.lookup_key) return null;
  return { ...plan, from: day(from) };
}""","""/** Stripe answered, but with a schedule this code cannot read: what is waiting is unknown. */
export class UnreadableSchedule extends Error {}

/**
 * A plan change waiting for the renewal: { tier, cycle, from }. Null when no schedule is attached,
 * or once its change took effect. An attached schedule that came back unexpanded, or without the
 * plan and date this site writes (scheduleChange), throws UnreadableSchedule.
 */
export async function pendingChange(subscriptionId: string, deps: StripeDeps): Promise<{ tier: Tier; cycle: Cycle; from: string } | null> {
  const s = await getSub(subscriptionId, deps, true);
  if (!s.schedule) return null;
  if (typeof s.schedule === 'string') throw new UnreadableSchedule(`schedule ${s.schedule} of ${subscriptionId} came back unexpanded`);
  const sched = s.schedule;
  // After the switch the schedule stays attached for one more term: not "waiting" any more.
  if (sched.metadata?.plan && sched.metadata.plan === s.items?.data?.[0]?.price?.lookup_key) return null;
  const plan = fromLookupKey(sched.metadata?.plan);
  const from = sched.phases?.[0]?.end_date;
  if (!plan || !from) throw new UnreadableSchedule(`schedule ${sched.id} of ${subscriptionId} has no readable plan or first phase`);
  if (from <= nowUnix(deps)) return null;
  return { ...plan, from: day(from) };
}""")
p='src/pages/api/sponsorship/me.ts'
rep(p,""" *     pendingChangeUnknown (Stripe could not be asked, so pendingChange says nothing),""",""" *     pendingChangeUnknown (Stripe could not be asked, or its schedule could not be read: pendingChange says nothing),""")
rep(p,"""/** A change waiting for the renewal, or `unknown` when Stripe could not be asked: never "none" by mistake. */""",
"""/** A change waiting for the renewal; `unknown` when Stripe failed or answered with a schedule pendingChange cannot read. */""")
print('ok')
