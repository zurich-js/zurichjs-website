/**
 * The talk fields a CFP draft holds, checked against the website form's schema (`schemas.cfp` in
 * packages/forms), so a Slack proposal is exactly what /cfp would have sent. Name and email are not
 * draft fields: they come from the Slack profile at submit time and never reach the model.
 */
import { MAX_TOPICS, TALK_LENGTHS, TALK_LEVELS, TALK_TOPICS, schemas } from '@zurichjs/forms';

export interface CfpFields {
  title?: string;
  /** What people will learn: the abstract on the website form. */
  abstract?: string;
  /** `Lightning` (10 minutes) or `Standard` (full talk, 20 minutes). */
  format?: (typeof TALK_LENGTHS)[number]['value'];
  level?: (typeof TALK_LEVELS)[number]['value'];
  topics?: (typeof TALK_TOPICS)[number][];
  jobTitle?: string;
  bio?: string;
  /** Their first talk ever: organisers offer help preparing. */
  firstTalk?: boolean;
}

/** The fields the model may set, in the order the bot asks for them. */
export const REQUIRED_FIELDS = ['title', 'abstract', 'format', 'level', 'topics'] as const;
export const OPTIONAL_FIELDS = ['jobTitle', 'bio', 'firstTalk'] as const;
export type CfpField = (typeof REQUIRED_FIELDS)[number] | (typeof OPTIONAL_FIELDS)[number];

const shape = schemas.cfp.shape;

/** Validates one field with the website's rule. Returns the form's own message on failure. */
export function fieldError(field: CfpField, value: unknown): string | null {
  if (field === 'firstTalk') return typeof value === 'boolean' ? null : 'Say yes or no.';
  const r = shape[field].safeParse(value);
  return r.success ? null : (r.error.issues[0]?.message ?? 'Invalid');
}

/** The required fields still missing or invalid, with the website form's messages. */
export function missingFields(f: CfpFields): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of REQUIRED_FIELDS) {
    const err = fieldError(k, f[k]);
    if (err) out[k] = err;
  }
  return out;
}

export const formatLabel = (v: CfpFields['format']) => {
  const l = TALK_LENGTHS.find((x) => x.value === v);
  return l ? `${l.label} (${l.hint})` : undefined;
};
export const levelLabel = (v: CfpFields['level']) => TALK_LEVELS.find((x) => x.value === v)?.label;

export { MAX_TOPICS, TALK_LENGTHS, TALK_LEVELS, TALK_TOPICS };
