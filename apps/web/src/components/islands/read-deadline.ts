/**
 * How long an island waits for a read (a GET to the site's API) before it shows its error with
 * Try again. The server's own limits (database 10 s, outbound calls 50 s) end most requests
 * sooner; this covers a connection that never answers. Writes have no such limit: the server
 * may still be saving.
 */
export const READ_DEADLINE_MS = 20_000;
