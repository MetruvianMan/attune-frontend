# Supabase RLS Hardening — Requirements

## Background

Supabase's automated security scanner has flagged the `Attune-mobile-prod`
project (`qkvcwngwatfkhmjhzwvu`) with a **critical** issue:

> Table publicly accessible — Anyone with your project URL can read, edit,
> and delete all data in this table because Row-Level Security is not
> enabled. (`rls_disabled_in_public`)

This is accurate. Row-Level Security (RLS) *is* technically enabled on
every table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` runs in
`supabase-schema.sql`), but every table also has a policy that allows
everything, unconditionally:

```sql
CREATE POLICY "Enable all operations for now" ON events FOR ALL USING (true) WITH CHECK (true);
```

This was intentionally permissive scaffolding put in place before any
authentication existed, with a comment saying "we'll refine these later
with proper auth." That "later" is now.

## Confirmed current state (verified 2026-08-19)

- The mobile app connects to Supabase using a hardcoded anon key
  (`mobile/services/supabase.ts`). This key ships inside the app bundle
  and must be treated as effectively public — it can be extracted from
  the compiled app without much effort. This is normal for Supabase's
  anon key *as long as RLS policies actually restrict what that key can
  do*. Right now they don't.
- There is a **second, separate auth system**: a custom backend
  (`backend/`, deployed on Render) with its own email+password JWT login,
  used only to drive the app's login screen
  (`mobile/app/(auth)/login.tsx`, `mobile/services/auth-service.ts`).
  This system is disconnected from Supabase entirely — its JWT is never
  sent to Supabase, and Supabase has no way to know a user logged in
  through it. All actual data reads/writes (events, diary, rewards, child
  profiles, everything) go straight to Supabase via the shared anon key,
  regardless of this login state.
- There is no ownership concept anywhere in the schema. No table has a
  `user_id`, `owner_id`, or `household_id` column. Rows are only scoped by
  `child_profile_id`, which is not tied to any authenticated identity.
- The user and their wife both need concurrent access to the same child's
  data from separate devices/accounts — so the eventual fix needs to
  support shared/household-level access, not "one account owns the data."

## Goals

1. Data in this Supabase project must only be readable/writable by people
   the user has actually authorized (currently: the user and his wife),
   not by anyone who has or extracts the anon key.
2. Real authentication must exist and be connected to Supabase itself, so
   RLS policies can actually check *who* is making a request.
3. Both parents must retain full access to the same child profile(s) after
   the fix — this is not a single-owner model.
4. The migration must not appear to delete or lock the user out of his own
   historical data at any point, even temporarily. (Per this project's
   established risk tolerance — see `.kiro/specs/timezone-safe-dates/` for
   the same concern raised previously.)
5. SBDev and Cloud/prod app variants share this one Supabase project — the
   fix must work correctly for both, and must be tested on a
   non-destructive path before being applied for real.

## Non-goals

- Not building a general-purpose multi-tenant SaaS auth system. This is a
  household app for one family (with room for the two parents, not
  arbitrary strangers signing up and getting isolated data).
- Not redesigning the custom backend's role beyond deciding whether it's
  still needed once Supabase Auth is in place (see design.md).
- Not changing anything about the timezone-safe-dates feature or other
  in-flight schema work; this is purely about access control.
