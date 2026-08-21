# Supabase RLS Hardening — Design

## Overview

Fixing this properly requires three things, in order:

1. **Real authentication that Supabase itself knows about** (currently
   nothing plays this role — the custom backend's JWT is invisible to
   Supabase).
2. **An ownership link between rows and authenticated users** (currently
   no table has any such column).
3. **RLS policies that check that ownership link**, replacing the current
   `USING (true)` policies.

Skipping straight to step 3 without steps 1-2 would just mean picking a
new set of rules with nothing real to check them against.

## Decision: use Supabase Auth, retire the custom backend's auth role

Recommended approach: switch to **Supabase Auth** (`supabase.auth.signUp` /
`signInWithPassword`) instead of the current custom Express/JWT backend
login.

Why:
- Supabase Auth integrates directly with RLS via `auth.uid()` inside
  policies — this is the whole point of the feature and is what makes
  step 3 possible without reinventing session verification.
- The custom backend's auth (`backend/src`, deployed on Render) was built
  before this Supabase integration existed and has no relationship to it
  today. Keeping two separate, disconnected auth systems long-term (one
  gatekeeping a login screen, one silently allowing all Supabase access
  regardless) is more confusing and error-prone than consolidating.
- The backend still has a real, separate job — voice transcription,
  OpenAI-based event extraction, sync endpoints — so it isn't being
  deleted, just no longer responsible for login/session identity.

Alternative considered and rejected: keep the custom backend as the
auth authority and have it mint a Supabase-compatible JWT (using
Supabase's JWT secret) for the mobile app to present to Supabase. This
would technically work and avoid a user-facing migration, but it means
maintaining a second, custom-written token-minting path that has to stay
perfectly in sync with Supabase's expectations forever, for no real
benefit over just using Supabase Auth directly. Not recommended unless a
concrete reason to keep the custom backend as the identity source
surfaces later.

## Decision: household-style shared ownership, not single-owner rows

Since both parents need full access to the same child's data, add a
`households` concept rather than a per-user-owns-everything model:

```sql
-- New table
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- New table: which auth.users belong to which household
CREATE TABLE household_members (
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'parent', -- room to grow (e.g. 'caregiver') later
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);
```

`child_profiles` gets a new `household_id` column:

```sql
ALTER TABLE child_profiles ADD COLUMN household_id UUID REFERENCES households(id);
```

Every other table (`events`, `diary_entries`, `photos`, `documents`,
`relationship_persons`, `context_entries`, `insights`, `strategies`,
`conversation_sessions`, `quick_tap_buttons`, `voice_log_corrections`,
`behaviors`, `rewards`, `point_events`) already has `child_profile_id` —
their RLS policies can check household membership by joining through
`child_profiles`, without needing their own `household_id` column:

```sql
CREATE POLICY "household members can access events" ON events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM child_profiles cp
      JOIN household_members hm ON hm.household_id = cp.household_id
      WHERE cp.id = events.child_profile_id
        AND hm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM child_profiles cp
      JOIN household_members hm ON hm.household_id = cp.household_id
      WHERE cp.id = events.child_profile_id
        AND hm.user_id = auth.uid()
    )
  );
```

Repeat this pattern (swap the table/column names) for every other
child-profile-scoped table. `glossary_terms` and `sync_metadata` are not
per-family data (glossary is shared reference content, sync_metadata is
presently unused/generic) — leave those readable by any authenticated
user, or revisit if that's wrong.

## Migration path (avoiding any "data appears gone" moment)

This is the same failure mode flagged repeatedly in
`.kiro/specs/timezone-safe-dates/` — a schema/access change that makes
existing data look empty until a backfill catches up. Sequencing to avoid
that:

1. Ship the `households`/`household_members` tables and `household_id`
   column additively — no RLS policy changes yet. Existing permissive
   policies stay in place during this step, so nothing breaks.
2. Create one household row, and one `household_members` row for each
   parent's Supabase Auth account (see below for how those accounts get
   created).
3. Backfill `child_profiles.household_id` for the existing child
   profile(s) to point at that household. Verify via a read-only script
   (same dry-run pattern as `scripts/backfill-local-date.js`) before
   writing.
4. Switch the mobile app over to Supabase Auth (sign in on both parents'
   devices, confirm session persists, confirm data still loads under the
   OLD permissive policies first — this isolates "did auth work" from
   "did RLS work" as two separate test steps).
5. Only once both parents can log in via Supabase Auth AND see their data
   under the old permissive policies, replace the `USING (true)` policies
   with the household-membership policies, table by table. Test read
   access immediately after each table's policy is replaced, before
   moving to the next table — if something's wrong, only one table is
   affected and the fix is a single `DROP POLICY` / re-create away.
6. Re-run the Supabase security scanner (or just re-check the dashboard
   alert) to confirm `rls_disabled_in_public` clears for every table.

## SBDev and Cloud/prod share one identity model

SBDev and the Cloud/prod app variant both point at the same Supabase
project (`qkvcwngwatfkhmjhzwvu`) - confirmed during the
timezone-safe-dates work when the schema migration was applied once and
took effect for both. That means they also share one `auth.users` table
and one `household_members` table: a single Supabase Auth account (e.g.
one per parent) works identically across both app variants with no extra
per-variant setup.

Two things this does NOT do automatically, worth remembering during
task 3:
- Each app install (SBDev vs. Prod, and each parent's device) holds its
  own local session - logging in on one doesn't log the others in. Same
  email/password gets entered on each, but that's just re-authenticating
  the same account, not creating a new one.
- Session persistence must actually be enabled (`persistSession: true`,
  `autoRefreshToken: true` in `mobile/services/supabase.ts` - see task
  3.2) or every app variant will keep forcing re-login rather than
  staying signed in between opens.

## Where Supabase Auth accounts come from

Two sub-options, pick one:

- **A: New signup flow in the app itself.** Add real sign-up/sign-in
  screens backed by `supabase.auth.signUp()` / `signInWithPassword()`,
  replacing `mobile/app/(auth)/login.tsx`'s current custom-backend call.
  Both parents create accounts through the app once, then get added to
  the same household via a one-time admin step (either a manual SQL
  insert the first time, or a lightweight "join household with invite
  code" flow if that's worth building).
- **B: Pre-create both accounts directly in the Supabase dashboard**
  (Authentication → Users → Add user), skip building a signup UI for now,
  and only build a sign-*in* screen. Faster to ship, defers signup UX
  until/unless a third person ever needs access.

Recommendation: start with B (it unblocks the RLS fix fastest with the
least new UI surface), and treat A as a follow-up if the household ever
needs to grow.

## What happens to the custom backend

- Its `/api/auth/*` endpoints become unused once the app switches to
  Supabase Auth for login — can be removed in a later cleanup pass, not
  as part of this fix (no need to couple removal with the security fix).
- Its other endpoints (`/api/voice/*`, `/api/conversation/*`,
  `/api/sync/*`) are unaffected — they don't currently do anything with
  Supabase auth/identity, so this fix doesn't change their behavior. If
  the sync endpoints matter going forward, revisit whether they should
  also check Supabase Auth identity - out of scope here since they
  appear to be effectively unused already (see `downloadBehaviors()` in
  `sync-service.ts`, which is a stubbed-out placeholder).

## Testing guidance

- After step 5 (per-table policy swap), test as BOTH parents' accounts,
  not just one — the whole point is confirming shared household access
  still works, not just that access is now restricted.
- Also deliberately test that a request using only the anon key with no
  session (simulating someone who extracted the key from the app bundle
  but never logged in) gets zero rows back from every table. This is the
  actual vulnerability being fixed - confirm it's actually closed, not
  just that legitimate access still works.
- Confirm the existing SBDev/dev flows (backfill scripts, backup/restore
  scripts under `scripts/`) still work under the new policies, since
  those currently connect using the same anon key with no session at all
  - they'll likely need to switch to using the Supabase **service role**
  key instead (server-side/local-only, never shipped in the app, bypasses
  RLS by design) once anon-key access is locked down.
