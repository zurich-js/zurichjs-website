-- Talk proposals written with the ZurichJS CFP bot in Slack (docs/v2/CFP-BOT.md).
-- A draft lives here, not in Sanity, until the person presses Submit; then it is deleted.
-- Unfinished drafts are deleted after 14 days without activity (CFP_DRAFT_RETENTION_DAYS in
-- packages/agent/src/cfp/limits.ts). One open draft per person, one draft per thread.
create table cfp_drafts (
  id uuid primary key default gen_random_uuid(),
  slack_team_id text not null check (length(slack_team_id) between 1 and 40),
  slack_user_id text not null check (length(slack_user_id) between 1 and 40),
  slack_channel_id text not null check (length(slack_channel_id) between 1 and 40),
  slack_thread_ts text not null check (length(slack_thread_ts) between 1 and 40),
  -- title, abstract, format, level, topics, jobTitle, bio, firstTalk (schemas.cfp field names)
  fields jsonb not null default '{}'::jsonb check (jsonb_typeof(fields) = 'object'),
  -- only when the Slack profile shows no email: typed by the person in a private Slack modal
  contact_email text check (contact_email is null or length(contact_email) <= 320),
  -- "Use your Slack photo on your speaker page?": null until they answer
  photo_consent boolean,
  status text not null default 'draft' check (status in ('draft', 'submitting')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slack_team_id, slack_user_id),
  unique (slack_team_id, slack_channel_id, slack_thread_ts)
);

create index cfp_drafts_updated_at_idx on cfp_drafts (updated_at);

-- Rate limits that hold across serverless instances: messages per person per hour,
-- submissions per person per day, and model calls per day for everyone. Rows older than
-- two days are deleted with the expired drafts.
create table cfp_usage (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('message', 'submission', 'model_call')),
  slack_team_id text not null check (length(slack_team_id) between 1 and 40),
  slack_user_id text check (slack_user_id is null or length(slack_user_id) between 1 and 40),
  amount integer not null default 1 check (amount between 1 and 100),
  at timestamptz not null default now()
);

create index cfp_usage_kind_at_idx on cfp_usage (kind, at desc);
create index cfp_usage_user_idx on cfp_usage (slack_team_id, slack_user_id, kind, at desc);
