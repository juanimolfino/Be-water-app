-- Run this in Supabase SQL editor after applying Drizzle migrations.
-- App writes that require elevated privileges should use SUPABASE_SERVICE_ROLE_KEY server-side only.

alter table users enable row level security;
alter table credits enable row level security;
alter table subscriptions enable row level security;
alter table jobs enable row level security;
alter table transactions enable row level security;
alter table dive_centers enable row level security;
alter table activities enable row level security;
alter table sales enable row level security;

create policy "users can read own profile"
on users for select
using (auth.uid() = auth_user_id);

create policy "users can read own credits"
on credits for select
using (
  user_id in (select id from users where auth_user_id = auth.uid())
);

create policy "users can read own subscriptions"
on subscriptions for select
using (
  user_id in (select id from users where auth_user_id = auth.uid())
);

create policy "users can read own jobs"
on jobs for select
using (
  user_id in (select id from users where auth_user_id = auth.uid())
);

create policy "users can read own transactions"
on transactions for select
using (
  user_id in (select id from users where auth_user_id = auth.uid())
);

-- Dive Water tenant tables. App routes enforce role/tenant checks server-side using the
-- service role connection (see lib/db/index.ts), so these policies are defense-in-depth
-- for any future direct client access via the Supabase anon/authenticated key.

create policy "members can read own dive center"
on dive_centers for select
using (
  id in (select dive_center_id from users where auth_user_id = auth.uid())
  or owner_user_id in (select id from users where auth_user_id = auth.uid())
);

create policy "members can read own center activities"
on activities for select
using (
  dive_center_id in (select dive_center_id from users where auth_user_id = auth.uid())
);

create policy "members can read own center sales"
on sales for select
using (
  dive_center_id in (select dive_center_id from users where auth_user_id = auth.uid())
);
