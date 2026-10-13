# Phase 2 — Supabase setup (manual configuration)

This guide lists everything you must configure outside the repo before auth and persistence work end-to-end.

## 1. Create a Supabase project

1. Create a project at [https://supabase.com](https://supabase.com).
2. Copy:
   - Project URL → `EXPO_PUBLIC_SUPABASE_URL`
   - Publishable / anon key → `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Put them in `mobile/.env` (see `mobile/.env.example`).
4. Never put the **service role** key in the mobile app.

## 2. Install the Supabase CLI

`supabase: command not found` means the CLI is not on your PATH. Install it before `login`, `link`, `db push`, or `functions deploy`.

macOS:

```bash
brew install supabase/tap/supabase
```

Linux: download the `.deb` or `.tar.gz` for your architecture from the [CLI releases](https://github.com/supabase/cli/releases) and install it. This repo’s Cloud Agent bootstrap (`scripts/cloud-install.sh`) installs Linux amd64 **v2.120.0** into `/usr/local/bin` when `supabase` is missing.

Check:

```bash
supabase --version
```

## 3. Apply database migrations

From a machine with the CLI linked to your project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or run the SQL files in order in the SQL editor:

1. `supabase/migrations/20261012220000_phase2_schema.sql`
2. `supabase/migrations/20261012220100_phase2_rls.sql`

## 4. Enable Auth providers

### Anonymous sign-ins

Auth → Providers → Anonymous → Enable.

### Email OTP / magic link

Auth → Providers → Email → Enable.

Recommended for mobile:

- Prefer OTP codes (template includes `{{ .Token }}`)
- Confirm email settings as needed for your project
- Add redirect URLs:
  - `fiveminmindfulness://**`
  - Expo Go / dev URLs as needed (`exp://...`)

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
4. iOS uses native `expo-apple-authentication` + `signInWithIdToken`.

## 5. Deep links

- App scheme: `fiveminmindfulness` (`mobile/app.config.ts`)
- iOS: configure associated domains when using HTTPS magic links
- Android: intent filter for `fiveminmindfulness` is already declared

## 6. Account deletion Edge Function

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase functions deploy delete-account
```

The function verifies the caller JWT and deletes **that** user only. It never accepts a user id from the client body.

## 7. RLS verification

Run `supabase/tests/rls_verification.sql` and the manual JWT checks described in that file.

## 8. Session storage note

The mobile client persists sessions with Expo SQLite `localStorage` (current Expo + Supabase guidance). `expo-secure-store` remains installed for future hardening; full session JSON can exceed SecureStore size limits on some devices.

## 9. Run the app

```bash
cd mobile
cp .env.example .env   # fill values
npm install
npx expo start
```
