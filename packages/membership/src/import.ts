/**
 * Existing members from the manual process (signed on paper, paid by hand).
 * The CSV has one row per member, with a header row:
 *
 *   kind,name,organisation,email,level,cycle,category,joined_at,paid_until,notes
 *
 * kind: person | organisation (empty = person). level: basic | supporter.
 * cycle: quarterly | yearly. category: passive | active
 * (empty = passive). Dates are YYYY-MM-DD; paid_until is required.
 * Rows become `imported_manual` members paying by hand. Before they can switch
 * to automatic payment they accept the current membership terms in the portal.
 */
import { isCycle, isLevel } from './levels.ts';
import { normaliseEmail } from './store.ts';
import type { Category, MemberKind, NewMember } from './types.ts';

export const IMPORT_COLUMNS = ['kind', 'name', 'organisation', 'email', 'level', 'cycle', 'category', 'joined_at', 'paid_until', 'notes'] as const;

export interface ImportRow {
  line: number;
  member: NewMember;
}

export interface ImportProblem {
  line: number;
  message: string;
}

/** RFC 4180 CSV: commas, double quotes, "" inside quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
const isEmail = (s: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s);

/** Parses and checks the whole file. Nothing is imported unless `problems` is empty. */
export function parseImport(text: string): { rows: ImportRow[]; problems: ImportProblem[] } {
  const [header, ...lines] = parseCsv(text);
  const problems: ImportProblem[] = [];
  if (!header) return { rows: [], problems: [{ line: 1, message: 'The file is empty.' }] };
  const cols = header.map((h) => h.trim().toLowerCase());
  const missing = IMPORT_COLUMNS.filter((c) => !cols.includes(c));
  if (missing.length) return { rows: [], problems: [{ line: 1, message: `Missing columns: ${missing.join(', ')}.` }] };

  const rows: ImportRow[] = [];
  const seen = new Map<string, number>();
  lines.forEach((cells, i) => {
    const line = i + 2;
    const get = (c: (typeof IMPORT_COLUMNS)[number]) => (cells[cols.indexOf(c)] ?? '').trim();
    const bad = (message: string) => problems.push({ line, message });
    const before = problems.length;

    const kind = (get('kind') || 'person') as MemberKind;
    if (kind !== 'person' && kind !== 'organisation') bad(`kind must be person or organisation, not "${get('kind')}".`);
    const name = get('name');
    if (!name) bad('name is empty.');
    const organisation = get('organisation') || null;
    if (kind === 'organisation' && !organisation) bad('An organisation needs its name in organisation.');
    const email = normaliseEmail(get('email'));
    if (!isEmail(email)) bad(`email "${get('email')}" is not an email address.`);
    else if (seen.has(email)) bad(`${email} is already on line ${seen.get(email)}.`);
    else seen.set(email, line);
    const level = get('level').toLowerCase();
    if (!isLevel(level)) bad(`level must be basic or supporter, not "${get('level')}".`);
    const cycle = get('cycle').toLowerCase();
    if (!isCycle(cycle)) bad(`cycle must be quarterly or yearly, not "${get('cycle')}".`);
    const category = (get('category').toLowerCase() || 'passive') as Category;
    if (category !== 'passive' && category !== 'active') bad(`category must be passive or active, not "${get('category')}".`);
    const joinedAt = get('joined_at') || null;
    if (joinedAt && !isDate(joinedAt)) bad(`joined_at "${joinedAt}" is not a date like 2025-05-23.`);
    const paidUntil = get('paid_until');
    if (!paidUntil) bad('paid_until is empty: say until when they have paid.');
    else if (!isDate(paidUntil)) bad(`paid_until "${paidUntil}" is not a date like 2026-12-31.`);
    if (joinedAt && paidUntil && isDate(joinedAt) && isDate(paidUntil) && paidUntil < joinedAt) bad('paid_until is before joined_at.');

    if (problems.length > before) return;
    rows.push({
      line,
      member: {
        kind,
        name,
        organisationName: organisation,
        email,
        level: level as NewMember['level'],
        cycle: cycle as NewMember['cycle'],
        category,
        status: 'imported_manual',
        source: 'imported',
        joinedAt,
        paidUntil,
        paymentMode: 'manual',
        notes: get('notes') || null,
      },
    });
  });
  return { rows, problems };
}
