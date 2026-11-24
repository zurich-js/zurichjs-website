import { postgresRaffleStore, type RaffleStore } from '@zurichjs/raffle';
import { postgresFeeStore, type FeeStore } from '@zurichjs/sponsorship';
import { membershipDb } from './membership-db.ts';
import type { Env } from './http.ts';

type Stores = { raffles: RaffleStore; fees: FeeStore };
const locks = new WeakMap<RaffleStore, Map<string, Promise<void>>>();

/** Keep the frozen quote, ledger and lifecycle changes in the same database commit. */
export async function raffleTransaction<T>(env: Env, id: string, injected: Partial<Stores>, change: (stores: Stores) => Promise<T>): Promise<T> {
  if (injected.raffles && injected.fees) {
    const { raffles, fees } = injected;
    const queue = locks.get(raffles) ?? new Map<string, Promise<void>>();
    locks.set(raffles, queue);
    const previous = queue.get(id) ?? Promise.resolve();
    const result = previous.then(() => change({ raffles, fees }));
    const tail = result.then(
      () => {},
      () => {},
    );
    queue.set(id, tail);
    try {
      return await result;
    } finally {
      if (queue.get(id) === tail) queue.delete(id);
    }
  }
  const client = await membershipDb(env).connect();
  try {
    await client.query('begin');
    await client.query('select id from raffles where id=$1 for update', [id]);
    const result = await change({ raffles: postgresRaffleStore(client), fees: postgresFeeStore(client) });
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}
