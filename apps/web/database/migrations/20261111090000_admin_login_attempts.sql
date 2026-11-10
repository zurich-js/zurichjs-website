-- Failed sign-ins to the membership admin area (/admin/memberships), per client IP,
-- so the attempt limit holds across serverless instances. Rows older than a day are
-- removed by the login route; nothing here identifies a member.
create table admin_login_attempts (
  id bigint generated always as identity primary key,
  ip text not null check (length(ip) between 1 and 100),
  at timestamptz not null default now()
);

create index admin_login_attempts_ip_at_idx on admin_login_attempts (ip, at desc);
