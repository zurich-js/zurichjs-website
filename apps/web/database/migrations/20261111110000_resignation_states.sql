-- Resignations have two states (owner, 10th November 2026): waiting for the board, and
-- confirmed by the board (the membership then ends with the paid period). And a member
-- can undo a resignation while the membership still runs.
--
--   resigned_at                when the member resigned (the status became `resigning`)
--   resignation_confirmed_at   when the board confirmed it; null while it waits
--
-- member_transition keeps both in step with the status: set on becoming `resigning`,
-- kept when the membership ends (the record of how it ended), cleared on any other change
-- (an undo, or joining again later).

alter table members
  add column resigned_at timestamptz,
  add column resignation_confirmed_at timestamptz,
  add constraint resignation_confirmed_after_request check (resignation_confirmed_at is null or resigned_at is not null);

-- Members already resigning: when they resigned, from the audit log.
update members set resigned_at = coalesce(
  (select max(e.at) from member_events e where e.member_id = members.id and e.to_status = 'resigning'),
  updated_at
)
where status = 'resigning';

create or replace function member_transition(
  p_id uuid,
  p_from member_status,
  p_to member_status,
  p_ended_reason member_ended_reason,
  p_actor_kind member_actor_kind,
  p_actor_id text,
  p_payload jsonb default '{}'::jsonb
)
returns members
language plpgsql as $$
declare
  m members;
begin
  update members set status = p_to, ended_reason = p_ended_reason,
    ended_at = case when p_to = 'ended' then now() else null end,
    resigned_at = case when p_to = 'resigning' then now() when p_to = 'ended' then resigned_at else null end,
    resignation_confirmed_at = case when p_to = 'ended' then resignation_confirmed_at else null end
  where id = p_id and status = p_from and anonymised_at is null
  returning * into m;
  if m.id is null then
    perform member_missing_or_anonymised(p_id);
    raise exception 'member_transition_conflict' using errcode = 'P0001';
  end if;
  insert into member_events (member_id, type, from_status, to_status, actor_kind, actor_id, payload)
  values (m.id, 'status_changed', p_from, p_to, p_actor_kind, p_actor_id,
    coalesce(p_payload, '{}'::jsonb) || case when p_ended_reason is null then '{}'::jsonb else jsonb_build_object('reason', p_ended_reason) end);
  return m;
end;
$$;

-- The board confirms a resignation. Only from `resigning`; confirming twice returns the
-- member unchanged (a second click, Slack and the admin area at once).
create function member_confirm_resignation(p_id uuid, p_actor_kind member_actor_kind, p_actor_id text, p_payload jsonb default '{}'::jsonb)
returns members
language plpgsql as $$
declare
  m members;
begin
  select * into m from members where id = p_id and anonymised_at is null for update;
  if m.id is null then
    perform member_missing_or_anonymised(p_id);
  end if;
  if m.status <> 'resigning' then
    raise exception 'member_transition_conflict' using errcode = 'P0001';
  end if;
  if m.resignation_confirmed_at is not null then
    return m;
  end if;
  update members set resignation_confirmed_at = now() where id = p_id returning * into m;
  insert into member_events (member_id, type, actor_kind, actor_id, payload)
  values (m.id, 'resignation_confirmed', p_actor_kind, p_actor_id, coalesce(p_payload, '{}'::jsonb));
  return m;
end;
$$;
