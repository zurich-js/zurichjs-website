create table member_retired_subscriptions (
  subscription_id text primary key,
  member_id uuid not null references members(id) on delete cascade
);
create function member_retire_subscription(p_id uuid) returns void language plpgsql as $$
declare
  prior text;
begin
  select stripe_subscription_id into prior from members where id=p_id for update;
  if prior is not null then
    insert into member_retired_subscriptions values (prior,p_id) on conflict do nothing;
    update members set stripe_subscription_id=null where id=p_id;
  end if;
  delete from member_checkout_attempts where member_id=p_id;
end $$;
select member_retire_subscription(id) from members
where payment_mode='manual' and stripe_subscription_id is not null and status in ('imported_manual','resigning')
and exists (select 1 from member_events e where e.member_id=members.id and e.from_status='ended' and e.to_status='imported_manual');
