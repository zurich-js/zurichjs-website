/** Private profile links for accepted speakers (no Sanity imports, so the CLI stays light). */
import type { Env } from './http';
import { signHs256, verifyHs256 } from './jwt';

export const PROFILE_TOKEN_TYPE = 'speaker-profile';

export function profileLink(speakerId: string, secret: string, origin = 'https://zurichjs.com', days = 30, now = Date.now()) {
  const token = signHs256({ speakerId, type: PROFILE_TOKEN_TYPE, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + days * 86_400 }, secret);
  return `${origin}/speakers/profile?token=${token}`;
}

/** The speaker's public ID from a valid, unexpired profile token; null otherwise. */
export function profileSpeaker(token: string | null, env: Env, now = Date.now()): string | null {
  if (!token || !env.JWT_SECRET) return null;
  const p = verifyHs256(token, env.JWT_SECRET, now);
  return p && p.type === PROFILE_TOKEN_TYPE && typeof p.speakerId === 'string' && p.speakerId ? p.speakerId : null;
}
