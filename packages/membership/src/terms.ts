/**
 * The membership terms people accept when they apply (no declaration to sign;
 * owner, 10th November 2026). The terms rest on the bylaws (Statuten, approved
 * at the founding meeting on 23rd May 2025). Each acceptance stores the terms
 * version, so it is always clear which text a member accepted.
 *
 * Change the version whenever the text at `TERMS.path` changes: members who
 * accepted an older version are asked to accept the new one before they can
 * start or switch to automatic payment.
 */
export const TERMS = {
  version: '2026-11-11',
  bylawsVersion: '2025-05-23',
  path: '/membership/terms',
} as const;

export const acceptedCurrent = (acceptedVersion: string | null | undefined) => acceptedVersion === TERMS.version;
