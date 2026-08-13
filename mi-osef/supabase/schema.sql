-- =====================================================================
-- מי אוסף — סכימת בסיס הנתונים
-- להריץ פעם אחת ב־Supabase → SQL Editor.
--
-- עיקרון: הלוז של בית הוא מסמך אחד (houses.doc). הרשאות הקריאה והכתיבה
-- נאכפות ברמת השורה — מי שאינו בן הבית לא מקבל את השורה בכלל, ולכן גם
-- לא יכול לקרוא ממנה שום דבר. שיתוף עם משפחה אחרת נעשה דרך טבלת pacts
-- הנפרדת: שם, ורק שם, נחשף פריט בודד לצד השני.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- בתים
create table if not exists public.houses (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade,
  doc         jsonb not null default '{}'::jsonb,
  last_change text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.house_members (
  house      uuid not null references public.houses(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'full' check (role in ('full','lim','task')),
  created_at timestamptz not null default now(),
  primary key (house, user_id)
);

-- מי שיוצר בית נכנס אליו אוטומטית כבן בית מלא
create or replace function public.house_add_owner() returns trigger
language plpgsql security definer as $$
begin
  insert into public.house_members(house, user_id, role)
  values (new.id, new.owner, 'full')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists trg_house_owner on public.houses;
create trigger trg_house_owner after insert on public.houses
  for each row execute function public.house_add_owner();

-- בדיקת חברות. security definer כדי שהבדיקה עצמה לא תיחסם על ידי RLS.
create or replace function public.is_member(h uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.house_members m
    where m.house = h and m.user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------- הזמנות לבית
create table if not exists public.invites (
  code       text primary key default encode(gen_random_bytes(6),'hex'),
  house      uuid not null references public.houses(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  kind       text not null default 'member' check (kind in ('member','link')),
  expires_at timestamptz not null default now() + interval '14 days',
  used_by    uuid references auth.users(id),
  used_at    timestamptz
);

-- --------------------------------------------- הסדרים בין שני בתים
-- זו הטבלה היחידה שנראית לשני בתים שונים, ובכוונה היא רזה:
-- שמות פרטיים, מקום, שעה ואנשי קשר — בלי כתובת בית ובלי שאר הלוז.
create table if not exists public.pacts (
  id            uuid primary key default gen_random_uuid(),
  house_from    uuid not null references public.houses(id) on delete cascade,
  house_to      uuid not null references public.houses(id) on delete cascade,
  driver_house  uuid not null references public.houses(id) on delete cascade,
  child_names   text[] not null,
  weekday       int  not null check (weekday between 0 and 6),
  at_time       text not null,
  place         text,
  contacts      jsonb not null default '[]'::jsonb,
  status        text not null default 'pending' check (status in ('pending','active','declined')),
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------ בקשות
create table if not exists public.requests (
  id         uuid primary key default gen_random_uuid(),
  house      uuid not null references public.houses(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  body       text not null,
  weekday    int  not null,
  at_time    text not null,
  place      text,
  audience   text not null default 'links' check (audience in ('house','links')),
  status     text not null default 'open' check (status in ('open','taken','closed')),
  taken_by   uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------ מנויי התראות
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  house      uuid references public.houses(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

-- יומן מה כבר נשלח, כדי שתזכורת לא תישלח פעמיים
create table if not exists public.sent_reminders (
  key        text primary key,          -- house|kid|date|time
  sent_at    timestamptz not null default now()
);

-- =====================================================================
-- הרשאות שורה
-- =====================================================================
alter table public.houses             enable row level security;
alter table public.house_members      enable row level security;
alter table public.invites            enable row level security;
alter table public.pacts              enable row level security;
alter table public.requests           enable row level security;
alter table public.push_subscriptions enable row level security;

-- בתים: רק בני הבית
drop policy if exists houses_select on public.houses;
create policy houses_select on public.houses for select using (public.is_member(id));

drop policy if exists houses_update on public.houses;
create policy houses_update on public.houses for update using (public.is_member(id));

drop policy if exists houses_insert on public.houses;
create policy houses_insert on public.houses for insert with check (owner = auth.uid());

-- חברות: רואים את הרשימה של הבית שלך
drop policy if exists members_select on public.house_members;
create policy members_select on public.house_members for select using (public.is_member(house));

drop policy if exists members_insert on public.house_members;
create policy members_insert on public.house_members for insert
  with check (user_id = auth.uid());          -- מצטרפים בעצמכם, דרך הזמנה

-- הזמנות: יוצר ההזמנה רואה אותה; מי שיש בידו את הקוד יכול לממש
drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites for select
  using (public.is_member(house) or used_by = auth.uid());

drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites for insert with check (public.is_member(house));

-- הסדרים: נראים לשני הבתים בלבד
drop policy if exists pacts_select on public.pacts;
create policy pacts_select on public.pacts for select
  using (public.is_member(house_from) or public.is_member(house_to));

drop policy if exists pacts_write on public.pacts;
create policy pacts_write on public.pacts for insert
  with check (public.is_member(house_from) and created_by = auth.uid());

drop policy if exists pacts_update on public.pacts;
create policy pacts_update on public.pacts for update
  using (public.is_member(house_from) or public.is_member(house_to));

-- בקשות: הבית שפרסם, ובתים שיש להם הסדר איתו
drop policy if exists requests_select on public.requests;
create policy requests_select on public.requests for select using (
  public.is_member(house) or (
    audience = 'links' and exists (
      select 1 from public.pacts p
      where (p.house_from = requests.house and public.is_member(p.house_to))
         or (p.house_to   = requests.house and public.is_member(p.house_from))
    )
  )
);

drop policy if exists requests_write on public.requests;
create policy requests_write on public.requests for insert
  with check (public.is_member(house) and created_by = auth.uid());

drop policy if exists requests_update on public.requests;
create policy requests_update on public.requests for update using (
  public.is_member(house) or taken_by = auth.uid() or taken_by is null
);

-- מנויי התראות: כל אחד והמכשירים שלו
drop policy if exists push_all on public.push_subscriptions;
create policy push_all on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- סנכרון חי
-- =====================================================================
alter publication supabase_realtime add table public.houses;
alter publication supabase_realtime add table public.pacts;
alter publication supabase_realtime add table public.requests;

-- חותמת זמן אוטומטית
create or replace function public.touch_updated() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_houses_touch on public.houses;
create trigger trg_houses_touch before update on public.houses
  for each row execute function public.touch_updated();
