# Account deletion

## Flow

1. User taps **Delete my account** on Profile.
2. Mobile app calls Edge Function `delete-account` with the user’s JWT.
3. Function authenticates the caller via `auth.getUser()`.
4. Function deletes that user’s rows (listening history, meditations, check-ins, preferences, profile).
5. Function attempts to remove `meditation-audio/{userId}/…` objects if the bucket exists.
6. Function calls `auth.admin.deleteUser(callerId)` with the **service role** key.
7. Mobile client signs out and returns to Welcome.

## Security rules

- The client never sends a target user id.
- The service role key exists only in Edge Function secrets.
- Partial storage failures do not block auth user deletion when tables are already cleared.

## Deploy

Install the CLI first if `supabase` is not on your PATH. See `docs/PHASE2_SUPABASE_SETUP.md`.

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase functions deploy delete-account
```

## Manual test (development account only)

1. Create an anonymous session and save a check-in.
2. Confirm the check-in exists in `daily_checkins`.
3. Delete the account from Profile.
4. Confirm:
   - Auth user is gone
   - Related rows are gone
   - App session is cleared
