# CRM Heskem (הסכם)

מערכת CRM / הצעות מחיר והסכמים — Next.js + Prisma + Supabase.

## פיתוח מקומי

1. העתק משתני סביבה:

```bash
cp .env.example .env
```

2. מלא `DATABASE_URL` ו-`DIRECT_URL` מפרויקט [Supabase](https://supabase.com) (Database → Connection string).

3. התקן והרץ:

```bash
npm install
npm run db:setup
npm run dev
```

פתח [http://localhost:3000](http://localhost:3000).

## העלאה לאוויר (Vercel + GitHub + Supabase + דומיין)

### 1) GitHub

הריפו כבר ב-GitHub:

https://github.com/ibdaapp2020-stack/CRM-HESKEM

### 2) Supabase

1. צור פרויקט ב-[supabase.com](https://supabase.com/dashboard).
2. לך ל-**Project Settings → Database**.
3. העתק:
   - **Connection string → URI (Transaction / pooler, port 6543)** → `DATABASE_URL`  
     הוסף בסוף: `?pgbouncer=true`
   - **Connection string → URI (Session / direct, port 5432)** → `DIRECT_URL`
4. מקומית (או מ-CI) הרץ פעם אחת מול Supabase:

```bash
npm run db:setup
```

### 3) Vercel (פריסה מ-GitHub)

1. היכנס ל-[vercel.com/new](https://vercel.com/new).
2. ייבא את הריפו `ibdaapp2020-stack/CRM-HESKEM`.
3. ב-**Environment Variables** הוסף:

| Name | Value |
|------|--------|
| `DATABASE_URL` | מ-Supabase (pooler + `?pgbouncer=true`) |
| `DIRECT_URL` | מ-Supabase (direct) |
| `AUTH_SECRET` | מחרוזת אקראית ארוכה |
| `AUTH_COOKIE` | `ibda_session` |
| `PAYMENT_PROVIDER` | `sandbox` |
| `WHATSAPP_PROVIDER` | `inbox` |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` (אחרי חיבור דומיין) |

4. Deploy.

### 4) דומיין חדש

1. ב-Vercel: **Project → Settings → Domains** → הוסף את הדומיין.
2. אצל רשם הדומיין הגדר DNS לפי ההוראות של Vercel (בדרך כלל רשומת `A` / `CNAME`).
3. עדכן ב-Vercel את `NEXT_PUBLIC_APP_URL` לכתובת הדומיין הסופית ו-Redeploy.

## סקריפטים

| פקודה | תיאור |
|--------|--------|
| `npm run dev` | שרת פיתוח |
| `npm run build` | בניית פרודקשן |
| `npm run db:push` | סנכרון סכמה ל-DB |
| `npm run db:seed` | נתוני התחלה |
| `npm run db:setup` | push + seed |
