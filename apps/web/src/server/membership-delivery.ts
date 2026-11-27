import { sendMemberEmail } from '@zurichjs/integrations';
import type { MemberStore } from '@zurichjs/membership';
import { sendCertificate, type IssueDeps } from './membership-certificate.ts';
import { membershipSlack, type MembershipSlack } from './membership-slack.ts';

type DeliveryDeps = Omit<IssueDeps, 'actor' | 'template'> & { slack?: MembershipSlack };

export async function deliverMembershipNotices(operation: string, deps: DeliveryDeps, verify?: (store: MemberStore) => Promise<unknown>) {
  const pending = await deps.store.pendingDeliveries(operation);
  const failures: unknown[] = [];
  for (const { key, memberId } of pending) {
    try {
      await deps.store.transaction(async (tx) => {
        if (verify) await verify(tx);
        const member = await tx.get(memberId);
        if (!member) throw new Error('Membership for pending delivery missing.');
        const row = (await tx.pendingDeliveries(operation)).find((item) => item.key === key);
        if (!row) return;
        const { payload } = row;
        switch (payload.kind) {
          case 'board':
            await (deps.slack ?? membershipSlack(deps.env, deps.fetch)).post(payload.text);
            break;
          case 'email':
            if (!(await sendMemberEmail(deps.env, payload, { idempotencyKey: key, log: deps.log, fetch: deps.fetch })).sent) throw new Error('Membership mail unavailable.');
            break;
          case 'certificate': {
            const cert = (await tx.certificates(memberId)).find((item) => item.id === payload.certificateId);
            if (!cert) throw new Error('Certificate for pending delivery missing.');
            if (!(await sendCertificate(member, cert, payload.template, deps)).sent) throw new Error('Certificate mail unavailable.');
            break;
          }
        }
        await tx.delivered(key);
      });
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length) throw new AggregateError(failures, 'Membership notice delivery incomplete.');
}
