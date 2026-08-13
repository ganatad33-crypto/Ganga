-- =====================================================================
-- מי אוסף — הרחבה: חיבור בין שני בתים (הסדר עם הורה ממשפחה אחרת)
-- להריץ פעם אחת ב-Supabase → SQL Editor, אחרי schema.sql.
-- =====================================================================

-- שם התצוגה של כל צד, כדי שלא נצטרך לקרוא מהמסמך של הבית השני (RLS
-- לא מרשה את זה בכלל) — כל צד כותב רק את השם שלו לשורת ההזמנה המשותפת
alter table public.invites add column if not exists from_name text;
alter table public.invites add column if not exists to_name   text;
alter table public.invites add column if not exists to_house  uuid references public.houses(id);

-- מימוש הזמנה: מי שמחזיק בקוד יכול לסמן את עצמו כמי שמימש אותה,
-- כל עוד היא לא נוצלה כבר ולא פגה. בלי המדיניות הזאת אין שום דרך
-- לצד המקבל לדווח שהוא קיבל את ההזמנה.
drop policy if exists invites_accept on public.invites;
create policy invites_accept on public.invites for update
  using (used_by is null and expires_at > now())
  with check (used_by = auth.uid());
