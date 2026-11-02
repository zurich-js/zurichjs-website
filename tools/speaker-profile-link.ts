/**
 * Prints a private profile link for an accepted speaker (valid 30 days).
 *   JWT_SECRET=… pnpm speaker-link <speaker id> [origin]
 * The speaker adds photo, bio, links and topics; it is saved as a draft for
 * an organiser to publish in the Studio.
 */
import { profileLink } from '../apps/web/src/server/profile-token';

const [id, origin = 'https://zurichjs.com'] = process.argv.slice(2);
if (!id || !process.env.JWT_SECRET) {
  console.error('Usage: JWT_SECRET=… pnpm speaker-link <speaker id> [origin]');
  process.exit(1);
}
console.log(profileLink(id, process.env.JWT_SECRET, origin));
