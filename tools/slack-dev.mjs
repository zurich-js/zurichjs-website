#!/usr/bin/env node
// The ZurichJS Bot on your machine (docs/v2/AUTOMATION.md, "Try it locally"): a dev Slack app in
// Socket Mode (slack/manifest.dev.yml) connects out to Slack, so Slack needs no public URL and no
// tunnel. Each event or button press arrives over the socket; this bridge acknowledges it, signs it
// with the dev app's signing secret exactly as Slack signs HTTP requests, and posts it to the local
// site's functions. The functions then run unchanged, as they do on Netlify.
//
//   SLACK_APP_TOKEN=xapp-…  SLACK_SIGNING_SECRET=…  node tools/slack-dev.mjs [http://localhost:4321]
//
// pnpm local starts it by itself when SLACK_APP_TOKEN is in .env or .env.local.
import { createHmac } from 'node:crypto';
import { pathToFileURL } from 'node:url';

/** Slack's v0 signature, as packages/agent/src/slack.ts verifies it. */
export function signSlack(secret, body, ts = Math.floor(Date.now() / 1000)) {
  return { 'x-slack-request-timestamp': String(ts), 'x-slack-signature': `v0=${createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex')}` };
}

/** The HTTP request Slack would have sent for one Socket Mode envelope, or null for kinds we do not handle. */
export function toRequest(envelope, secret) {
  if (envelope.type === 'events_api') {
    const body = JSON.stringify(envelope.payload);
    return { path: '/.netlify/functions/slack-events', body, headers: { 'content-type': 'application/json', ...signSlack(secret, body) } };
  }
  if (envelope.type === 'interactive') {
    const body = `payload=${encodeURIComponent(JSON.stringify(envelope.payload))}`;
    return { path: '/.netlify/functions/slack-interactivity', body, headers: { 'content-type': 'application/x-www-form-urlencoded', ...signSlack(secret, body) } };
  }
  return null;
}

async function connect(appToken, secret, site, log) {
  const res = await fetch('https://slack.com/api/apps.connections.open', { method: 'POST', headers: { authorization: `Bearer ${appToken}` } });
  const open = await res.json();
  if (!open.ok) throw new Error(`apps.connections.open: ${open.error} (is SLACK_APP_TOKEN an app-level token with connections:write, and Socket Mode on?)`);
  const ws = new WebSocket(open.url);
  ws.addEventListener('message', async (msg) => {
    const envelope = JSON.parse(String(msg.data));
    if (envelope.type === 'hello') return log('[slack-dev] connected; mention the dev bot in its channel');
    if (envelope.type === 'disconnect') return ws.close();
    if (envelope.envelope_id) ws.send(JSON.stringify({ envelope_id: envelope.envelope_id }));
    const req = toRequest(envelope, secret);
    if (!req) return;
    try {
      const out = await fetch(new URL(req.path, site), { method: 'POST', headers: req.headers, body: req.body });
      log(`[slack-dev] ${envelope.type}${envelope.payload?.event?.type ? ` ${envelope.payload.event.type}` : ''} → ${out.status}`);
    } catch (err) {
      log(`[slack-dev] could not reach ${site} (${err.message}). Is the site running?`);
    }
  });
  return new Promise((resolve) => ws.addEventListener('close', resolve));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const appToken = process.env.SLACK_APP_TOKEN;
  const secret = process.env.SLACK_SIGNING_SECRET;
  const site = process.argv[2] ?? 'http://localhost:4321';
  if (!appToken?.startsWith('xapp-') || !secret) {
    console.error('Set SLACK_APP_TOKEN (xapp-…, the dev app’s app-level token) and SLACK_SIGNING_SECRET (the dev app’s).');
    process.exit(1);
  }
  // Slack closes sockets now and then (and on deploys); reconnect after a short pause.
  for (;;) {
    await connect(appToken, secret, site, console.log).catch((err) => console.error(`[slack-dev] ${err.message}`));
    await new Promise((r) => setTimeout(r, 3000));
  }
}
