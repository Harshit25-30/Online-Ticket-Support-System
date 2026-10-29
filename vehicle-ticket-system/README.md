# Vehicle Ticket Support System (HTML + CSS + JS + Supabase)

## Setup (5 minutes)
1. `js/config.js` mein already tumhara Supabase URL + anon key hai (agar project badla ho to update karo).
2. Supabase -> **SQL Editor** -> `supabase/setup.sql` ka poora content paste karke **Run**.
3. Supabase -> **Authentication -> Sign In / Providers -> Email** -> **Confirm email = OFF** -> Save.
4. Folder mein terminal kholo: `npx serve` aur diye gaye `localhost` link par kholo
   (ya seedha `index.html` double-click).
5. Sign up karo (security question + answer bharo) = **user** account.
6. Admin banane ke liye: ek aur account sign up karo, phir SQL Editor mein:
   `update public.profiles set role='admin' where email='admin@gmail.com';`
7. (Optional) AI chatbot: `supabase functions deploy chat` aur
   `supabase secrets set ANTHROPIC_API_KEY=...` . Bina iske bhi chatbot ticket lookup + FAQ kar deta hai.

## Features
- **User:** vehicle ticket kharido -> unique Ticket ID (TKT-XXXXXXXX), My tickets, Support request (cancel/refund/etc.), chatbot.
- **Admin:** sab tickets dekho/search karo, status + note badlo, support requests ka reply + status do. Admin ticket **kharid nahi sakta** (database block karta hai).
- **Login:** Show/Hide password, Forgot password (security question se, email/link nahi).
- Rules database (RLS) mein enforce hote hain, sirf UI mein nahi.
