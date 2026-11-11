#!/usr/bin/env node
// The ZurichJS Slack bots on your machine (docs/v2/AUTOMATION.md, "Try it locally"): a dev Slack app
// in Socket Mode connects out to Slack, so Slack needs no public URL and no tunnel. Each event or
// button press arrives over the socket; this bridge acknowledges it, signs it with the dev app's
// signing secret exactly as Slack signs HTTP requests, and posts it to the local site's functions.
// The functions then run unchanged, as they do on Netlify.
//
//   SLACK_APP_TOKEN=xapp-…  SLACK_SIGNING_SECRET=…  node tools/slack-dev.mjs [http://localhost:4321]
//
// The CFP bot's dev app (slack/manifest.cfp.dev.yml) works the same way, to the slack-cfp-*
// functions, when SLACK_CFP_APP_TOKEN and SLACK_CFP_SIGNING_SECRET are set. Either app, or both.
//
// pnpm local starts it by itself when SLACK_APP_TOKEN or SLACK_CFP_APP_TOKEN is in .env or .env.local.
import { createHmac } from 'node:crypto';
import { pathToFileURL } from 'node:url';

/** Slack's v0 signature, as packages/agent/src/signatures.ts verifies it. */
export function signSlack(secret, body, ts = Math.floor(Date.now() / 1000)) {
  return { 'x-slack-request-timestamp': String(ts), 'x-slack-signature': `v0=${createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex')}` };
}

/** The two apps: the organisers' ZurichJS Bot and the ZurichJS CFP bot, each with its own functions. */
export const APPS = {
  agent: { name: 'ZurichJS Bot (dev)', token: 'SLACK_APP_TOKEN', secret: 'SLACK_SIGNING_SECRET', prefix: 'slack' },
  cfp: { name: 'ZurichJS CFP (dev)', token: 'SLACK_CFP_APP_TOKEN', secret: 'SLACK_CFP_SIGNING_SECRET', prefix: 'slack-cfp' },
};

/** The HTTP request Slack would have sent for one Socket Mode envelope, or null for kinds we do not handle. */
export function toRequest(envelope, secret, prefix = APPS.agent.prefix) {
  if (envelope.type === 'events_api') {
    const body = JSON.stringify(envelope.payload);
    return { path: `/.netlify/functions/${prefix}-events`, body, headers: { 'content-type': 'application/json', ...signSlack(secret, body) } };
  }
  if (envelope.type === 'interactive') {
    const body = `payload=${encodeURIComponent(JSON.stringify(envelope.payload))}`;
    return {
      path: `/.netlify/functions/${prefix}-interactivity`,
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded', ...signSlack(secret, body) },
    };
  }
  return null;
}

async function connect(app, appToken, secret, site, log) {
  const res = await fetch('https://slack.com/api/apps.connections.open', { method: 'POST', headers: { authorization: `Bearer ${appToken}` } });
  const open = await res.json();
  if (!open.ok) throw new Error(`apps.connections.open: ${open.error} (is ${app.token} an app-level token with connections:write, and Socket Mode on?)`);
  const ws = new WebSocket(open.url);
  ws.addEventListener('message', async (msg) => {
    const envelope = JSON.parse(String(msg.data));
    if (envelope.type === 'hello') return log(`[slack-dev] ${app.name} connected; mention it in its channel`);
    if (envelope.type === 'disconnect') return ws.close();
    if (envelope.envelope_id) ws.send(JSON.stringify({ envelope_id: envelope.envelope_id }));
    const req = toRequest(envelope, secret, app.prefix);
    if (!req) return;
    try {
      const out = await fetch(new URL(req.path, site), { method: 'POST', headers: req.headers, body: req.body });
      log(`[slack-dev] ${app.prefix} ${envelope.type}${envelope.payload?.event?.type ? ` ${envelope.payload.event.type}` : ''} → ${out.status}`);
    } catch (err) {
      log(`[slack-dev] could not reach ${site} (${err.message}). Is the site running?`);
    }
  });
  return new Promise((resolve) => ws.addEventListener('close', resolve));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const site = process.argv[2] ?? 'http://localhost:4321';
  const apps = Object.values(APPS).filter((a) => process.env[a.token]);
  if (!apps.length) {
    console.error('Set SLACK_APP_TOKEN (the ZurichJS Bot dev app) or SLACK_CFP_APP_TOKEN (the ZurichJS CFP dev app): an app-level token, xapp-….');
    process.exit(1);
  }
  for (const a of apps) {
    if (!process.env[a.token]?.startsWith('xapp-') || !process.env[a.secret]) {
      console.error(`Set ${a.token} (xapp-…, the dev app’s app-level token) and ${a.secret} (the dev app’s signing secret).`);
      process.exit(1);
    }
  }
  // Slack closes sockets now and then (and on deploys); reconnect after a short pause.
  await Promise.all(
    apps.map(async (a) => {
      for (;;) {
        await connect(a, process.env[a.token], process.env[a.secret], site, console.log).catch((err) => console.error(`[slack-dev] ${a.prefix}: ${err.message}`));
        await new Promise((r) => setTimeout(r, 3000));
      }
    }),
  );
}
