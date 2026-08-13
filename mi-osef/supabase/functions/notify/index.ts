/* =====================================================================
   מי אוסף — שליחת התראות
   ---------------------------------------------------------------------
   רצה כל חמש דקות (Supabase → Database → Cron) ועושה שני דברים:

   1. תזכורות לפני איסוף. הפונקציה קוראת את הלוז של כל בית, מחשבת לכל
      תחנה של היום את שעת התזכורת, ושולחת למי שאחראי. התזמון נעשה כאן
      ולא במכשיר — כדי שההתראה תגיע גם אם הטלפון היה כבוי או שהאפליקציה
      נסגרה.

   2. התראה על תחנה שנשארה בלי אחראי. שעה וחצי לפני הזמן, אם עדיין אין
      מי שאוסף, כל בני הבית מקבלים התראה. זו ההתראה החשובה ביותר
      באפליקציה, ולכן היא נשלחת גם למי שהשתיק את שאר ההתראות.

   פריסה:
     supabase functions deploy notify --no-verify-jwt
     supabase secrets set VAPID_PUBLIC=... VAPID_PRIVATE=... VAPID_SUBJECT=mailto:you@example.com
   ===================================================================== */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC')  ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

/* ---------- זמן מקומי בישראל ---------- */
const TZ = 'Asia/Jerusalem';
function nowParts() {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short'
  }).formatToParts(new Date());
  const g = (t: string) => f.find(p => p.type === t)?.value ?? '';
  const days: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  return {
    iso: `${g('year')}-${g('month')}-${g('day')}`,
    hm: `${g('hour')}:${g('minute')}`,
    weekday: days[g('weekday')] ?? 0
  };
}
const toMin = (t: string) => {
  const [h, m] = String(t || '0:0').split(':').map(Number);
  return h * 60 + m;
};

type Station = { kid: string; kidName: string; t: string; who: string | null; what: string; where: string };

/* בונה את תחנות היום מתוך מסמך הבית — אותה לוגיקה שבאפליקציה */
function stationsToday(doc: any, weekday: number, iso: string): Station[] {
  const out: Station[] = [];
  for (const kid of doc.kids ?? []) {
    const over = doc.over?.[iso]?.[kid.id];
    const base = doc.pick?.[kid.id]?.[weekday];
    const c = over ?? base;
    if (!c) continue;
    out.push({ kid: kid.id, kidName: kid.name, t: c.t || '13:20', who: c.who ?? null,
               what: `איסוף ${kid.name}`, where: kid.school ?? '' });
  }
  for (const e of doc.events ?? []) {
    if (e.iso !== iso) continue;
    const kid = (doc.kids ?? []).find((k: any) => k.id === e.kid);
    out.push({ kid: e.kid, kidName: kid?.name ?? '', t: e.t, who: e.who ?? null,
               what: e.title, where: e.place ?? '' });
  }
  for (const p of doc.pacts ?? []) {
    if (p.st !== 'active' || p.day !== weekday) continue;
    out.push({ kid: '', kidName: (p.kids ?? []).join(' ו'), t: p.t, who: p.driver,
               what: `איסוף לפי הסדר`, where: p.place ?? '' });
  }
  return out;
}

async function send(subs: any[], payload: unknown) {
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      );
    } catch (err: any) {
      /* מנוי שפג — מנקים אותו כדי שלא ננסה שוב */
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      }
    }
  }));
}

/* שולחים פעם אחת בלבד לכל תחנה */
async function once(key: string): Promise<boolean> {
  const { error } = await db.from('sent_reminders').insert({ key });
  return !error;                       /* התנגשות מפתח = כבר נשלח */
}

Deno.serve(async () => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response('חסרים מפתחות VAPID', { status: 500 });
  }
  const { iso, hm, weekday } = nowParts();
  const now = toMin(hm);
  const { data: houses } = await db.from('houses').select('id,doc');
  let sent = 0;

  for (const house of houses ?? []) {
    const doc = house.doc as any;
    if (!doc?.kids) continue;

    const { data: subs } = await db.from('push_subscriptions').select('*').eq('house', house.id);
    if (!subs?.length) continue;

    const prefs   = doc.prefs ?? {};
    const remind  = prefs.remind ?? 120;
    const allowed = (k: string) => prefs.push?.[k] !== false;

    for (const st of stationsToday(doc, weekday, iso)) {
      const due = toMin(st.t);

      /* 1. תזכורת לאחראי */
      if (st.who && allowed('remind')) {
        const at = due - remind;
        if (at <= now && now < at + 5) {
          const member = (doc.members ?? []).find((m: any) => m.id === st.who);
          const mine   = subs.filter((s) => s.user_id === st.who);
          if (member && mine.length && await once(`${house.id}|${st.kid}|${iso}|${st.t}|r`)) {
            await send(mine, {
              title: `${st.t} · ${st.what}`,
              body:  `אתה אוסף את ${st.kidName}${st.where ? ' · ' + st.where : ''}`,
              tag:   `remind-${iso}-${st.t}`, kind: 'remind'
            });
            sent++;
          }
        }
      }

      /* 2. תחנה בלי אחראי — שעה וחצי לפני, לכל הבית */
      if (!st.who && allowed('gap')) {
        const at = due - 90;
        if (at <= now && now < at + 5 && await once(`${house.id}|${st.kid}|${iso}|${st.t}|g`)) {
          await send(subs, {
            title: `אין מי שאוסף את ${st.kidName}`,
            body:  `${st.t} · ${st.what}${st.where ? ' · ' + st.where : ''} — צריך מישהו`,
            tag:   `gap-${iso}-${st.t}`, kind: 'gap'
          });
          sent++;
        }
      }
    }
  }

  return Response.json({ ok: true, at: `${iso} ${hm}`, sent });
});
