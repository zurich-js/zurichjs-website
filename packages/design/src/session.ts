/**
 * Whether this browser has a signed-in member, for the header's action ("Account"
 * instead of "Submit a talk"). Pages are static and the session cookie is httpOnly,
 * so the account page records what /api/membership/me answered, and the header
 * reads it. Only a hint for the label: the account page itself always asks the server.
 */
const KEY = 'zurichjs:signed-in';

export function setSignedIn(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked (private mode, site data off): the header keeps its default action.
  }
  // The header on this page follows at once (Header.astro shows the label from html[data-signed-in]).
  document.documentElement.toggleAttribute('data-signed-in', on);
  document.querySelectorAll<HTMLAnchorElement>('[data-header-cta]').forEach((a) => (a.href = on ? '/membership/account' : '/cfp'));
}

export function isSignedIn(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
