# Phase 2 — Supabase setup (manual configuration)

This guide lists everything you must configure outside the repo before auth and persistence work end-to-end.

## 1. Create a Supabase project

1. Create a project at [https://supabase.com](https://supabase.com).
2. Copy:
   - Project URL → `EXPO_PUBLIC_SUPABASE_URL`
   - Publishable / anon key → `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Put them in `mobile/.env` (see `mobile/.env.example`).
4. Never put the **service role** key in the mobile app.

## 2. Apply database migrations

From a machine with the [Supabase CLI](https://supabase.com/docs/guides/cli) linked to your project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or run the SQL files in order in the SQL editor:

1. `supabase/migrations/20261012220000_phase2_schema.sql`
2. `supabase/migrations/20261012220100_phase2_rls.sql`
3. `supabase/migrations/20261013045812_phase2_function_hardening.sql`

## 3. Enable Auth providers

### Anonymous sign-ins

Auth → Providers → Anonymous → Enable.

### Email OTP / magic link

Auth → Providers → Email → Enable.

Guest upgrades call `updateUser({ email })`, which sends the **Change email address** template. New sign-ins use the Magic Link template. Put `{{ .Token }}` in both templates so the app can accept the code. This project’s email OTP length is 8.

Add redirect URLs before confirmation links can reopen the app:

- `fiveminmindfulness://**`
- Expo Go / dev URLs as needed (`exp://...`)

If an email already belongs to an account, the app keeps the guest session and does not merge data. Sign out of that guest session, then sign in with the existing account. Check-ins stay on the guest user.

### Manual identity linking (required for guest upgrades)

Auth → Settings → enable **Manual linking** so anonymous users can attach email/OAuth without creating a second user.

Without this, upgrading a guest may create a different user id and guest data will not transfer.

### Google

1. Google Cloud Console → OAuth client IDs (Web + iOS/Android as needed).
2. Supabase Auth → Google → enable, paste Client ID / Secret.
3. Authorized redirect URI from Supabase dashboard.
4. App scheme redirect: `fiveminmindfulness://`

### Apple

1. Apple Developer → Identifiers → enable Sign in with Apple for `com.fiveminmindfulness.app`.
2. Create Services ID / key as required by Supabase Apple docs.
3. Supabase Auth → Apple → enable with Services ID, Secret, Team ID, Key ID.
4. iOS uses native `expo-apple-authentication`. A guest session links that Apple identity onto the same user. A signed-out Apple sign-in uses `signInWithIdToken`.

## 4. Deep links

- App scheme: `fiveminmindfulness` (`mobile/app.config.ts`)
- iOS: configure associated domains when using HTTPS magic links
- Android: intent filter for `fiveminmindfulness` is already declared

## 5. Account deletion Edge Function

```bash
supabase functions deploy delete-account --use-api
```

Hosted Edge Functions receive `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Do not put the service role key in the mobile app.

The function verifies the caller JWT and deletes **that** user only. A user id in the request body is ignored.

## 6. RLS verification

Run `supabase/tests/rls_verification.sql` and the manual JWT checks described in that file.

## 7. Session storage note

The mobile client persists sessions with Expo SQLite `localStorage` (current Expo + Supabase guidance). `expo-secure-store` remains installed for future hardening; full session JSON can exceed SecureStore size limits on some devices.

## 8. Run the app

```bash
cd mobile
cp .env.example .env   # fill values
npm install
npx expo start
```
