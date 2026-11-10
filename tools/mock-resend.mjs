#!/usr/bin/env node
// A local stand-in for Resend's email API with a mail viewer, for local runs and the Docker setup.
// Nothing is sent anywhere. Point the site at it with RESEND_API_BASE (ignored in production).
//
//   node tools/mock-resend.mjs [port]        (default 4535)
//   RESEND_API_BASE=http://localhost:4535 RESEND_API_KEY=re_local pnpm dev
//
// Endpoints:
//   POST /emails                       Resend's send call (any re_ key); stores the email
//   GET  /                             the mail viewer: every email, newest first
//   GET  /view/:id                     one email: rendered HTML, plain text, attachments
//   GET  /view/:id/html                the HTML alone (for the frame)
//   GET  /view/:id/attachments/:n      an attachment (e.g. the certificate PDF)
//   GET  /api/emails                   all emails as JSON (for tests and scripts)
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const page = (title, body) =>
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>body{font-family:system-ui,sans-serif;margin:0;padding:24px;max-width:1000px}a{color:#000}li{margin:0 0 10px}small{color:#5f626b}pre{white-space:pre-wrap;background:#f6f6f4;padding:16px;border-radius:12px}iframe{width:100%;height:900px;border:1px solid #d9d9dc;border-radius:12px}</style><body>${body}</body></html>`;

/** Starts the mock. Resolves to { url, emails, close }. Port 0 picks a free port. */
export function startMockResend(port = 0) {
  /** @type {{ id: string, at: string, from: string, to: string[], subject: string, html: string, text: string, attachments: { filename: string, content: string }[], idempotencyKey?: string }[]} */
  const emails = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const send = (status, body, type = 'application/json') => {
      res.writeHead(status, { 'content-type': type });
      res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    };
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      if (req.method === 'POST' && url.pathname === '/emails') {
        if (!(req.headers.authorization ?? '').startsWith('Bearer re_')) return send(401, { name: 'validation_error', message: 'API key is invalid (the mock accepts re_ keys)' });
        let body;
        try {
          body = JSON.parse(raw);
        } catch {
          return send(422, { name: 'validation_error', message: 'Invalid JSON' });
        }
        if (!body.to || !body.subject || (!body.html && !body.text)) return send(422, { name: 'validation_error', message: 'to, subject and html or text are required' });
        const key = /** @type {string | undefined} */ (req.headers['idempotency-key']);
        const dup = key && emails.find((e) => e.idempotencyKey === key);
        if (dup) return send(200, { id: dup.id });
        const id = randomBytes(8).toString('hex');
        emails.unshift({
          id,
          at: new Date().toISOString(),
          from: body.from,
          to: [].concat(body.to),
          subject: body.subject,
          html: body.html ?? '',
          text: body.text ?? '',
          attachments: body.attachments ?? [],
          idempotencyKey: key,
        });
        console.log(`[mock-resend] ${[].concat(body.to).join(', ')}: ${body.subject}`);
        return send(200, { id });
      }
      if (req.method === 'GET' && url.pathname === '/api/emails') return send(200, emails);
      if (req.method === 'GET' && url.pathname === '/') {
        const list = emails.length
          ? `<ul>${emails.map((e) => `<li><a href="/view/${e.id}"><b>${esc(e.subject)}</b></a><br><small>to ${esc(e.to.join(', '))}, ${esc(e.at.replace('T', ' ').slice(0, 19))} UTC${e.attachments.length ? `, ${e.attachments.length} attachment(s)` : ''}</small></li>`).join('')}</ul>`
          : '<p>No emails yet. Sign in on the site to get one.</p>';
        return send(200, page('Mail', `<h1>Local mail</h1><p><small>Emails the site sent. Nothing left this machine.</small></p>${list}`), 'text/html; charset=utf-8');
      }
      const view = url.pathname.match(/^\/view\/([0-9a-f]+)(\/html|\/attachments\/(\d+))?$/);
      const e = view && emails.find((x) => x.id === view[1]);
      if (req.method === 'GET' && view && !e) return send(404, 'No such email', 'text/plain');
      if (req.method === 'GET' && e && view?.[2] === '/html') return send(200, e.html || `<pre>${esc(e.text)}</pre>`, 'text/html; charset=utf-8');
      if (req.method === 'GET' && e && view?.[3] !== undefined) {
        const a = e.attachments[Number(view[3])];
        if (!a) return send(404, 'No such attachment', 'text/plain');
        res.writeHead(200, {
          'content-type': a.filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
          'content-disposition': `inline; filename="${a.filename.replace(/"/g, '')}"`,
        });
        return res.end(Buffer.from(a.content, 'base64'));
      }
      if (req.method === 'GET' && e) {
        const atts = e.attachments.map((a, i) => `<li><a href="/view/${e.id}/attachments/${i}">${esc(a.filename)}</a></li>`).join('');
        return send(
          200,
          page(
            e.subject,
            `<p><a href="/">All emails</a></p><h1>${esc(e.subject)}</h1><p><small>From ${esc(e.from)} to ${esc(e.to.join(', '))}</small></p>${atts ? `<h2>Attachments</h2><ul>${atts}</ul>` : ''}<iframe src="/view/${e.id}/html" title="Email"></iframe><h2>Plain text</h2><pre>${esc(e.text)}</pre>`,
          ),
          'text/html; charset=utf-8',
        );
      }
      send(404, { message: `Mock has no ${req.method} ${url.pathname}` });
    });
  });
  return new Promise((resolve) => {
    server.listen(port, process.env.MOCK_HOST ?? '127.0.0.1', () => {
      const address = server.address();
      resolve({
        url: `http://localhost:${typeof address === 'object' && address ? address.port : port}`,
        emails,
        close: () => new Promise((r) => server.close(() => r(undefined))),
      });
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { url } = await startMockResend(Number(process.argv[2] ?? 4535));
  console.log(`Mock Resend on ${url} (RESEND_API_BASE=${url}, any re_ key); mail viewer at ${url}`);
}
