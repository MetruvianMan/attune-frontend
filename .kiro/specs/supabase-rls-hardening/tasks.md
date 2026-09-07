# Supabase RLS Hardening — Tasks

Do these roughly in order. Each top-level item is independently testable.
See design.md for the full rationale behind this sequencing - the goal is
that data never appears to vanish or become inaccessible mid-migration.

- [x] 1. Household schema (additive only, no access changes yet)
  - [x] 1.1 Create `households` and `household_members` tables in
        `supabase-schema.sql` and apply to live Supabase
  - [x] 1.2 Add `household_id` column to `child_profiles`
  - [x] 1.3 Create one household row for this family (name: "Passberger")
  - [x] 1.4 Backfill `child_profiles.household_id` for existing profile(s)
        - dry-run/verify first, same pattern as
          `scripts/backfill-local-date.js` - see
          `scripts/backfill-household-id.js`. Robbie's profile
          (id=profile-1780169301356) backfilled to household
          id=c4aef77c-07a0-4894-a334-8cf6faa63b33. Verified 0 rows
          remain with household_id IS NULL.

- [x] 2. Create real Supabase Auth accounts
  - [x] 2.1 Decide sign-up path: pre-create both parents' accounts via
        Supabase dashboard (recommended starting point - see design.md
        option B) vs. build an in-app sign-up flow (option A)
        - Chose dashboard-created accounts (option B). Also decided:
          separate accounts per parent (not shared credentials), so
          future household_members rows can attribute changes to a
          specific person - relevant if a nanny/caregiver is ever added.
  - [x] 2.2 Create both parents' accounts
        - Rob: c846cab7-82a2-434a-9bbb-c65cabb085d1
        - Maley: a0989b3f-d68a-4ad6-8856-009b6bd5ed5e
  - [x] 2.3 Insert `household_members` rows linking both accounts to the
        household from task 1
        - Both rows inserted with role='parent', household_id
          c4aef77c-07a0-4894-a334-8cf6faa63b33. Verified via read-only
          query - both rows present.

- [ ] 3. Switch the mobile app to Supabase Auth
  - [ ] 3.1 Replace `mobile/app/(auth)/login.tsx`'s call to the custom
        backend with `supabase.auth.signInWithPassword()`
  - [ ] 3.2 Update `mobile/services/supabase.ts` client config for
        session persistence (`persistSession: true`,
        `autoRefreshToken: true` - currently both false)
  - [ ] 3.3 Update `mobile/hooks/useAuth.ts` / `AuthContext` to read
        session state from Supabase instead of the custom
        `auth-service.ts` token flow
  - [ ] 3.4 Test login on both parents' devices/accounts. Confirm data
        still loads normally - this step runs BEFORE any RLS policy
        changes, so it isolates "auth works" from "RLS works" as
        separate checks

- [ ] 4. Replace permissive RLS policies with household-scoped policies
  - [ ] 4.1 Pick one low-risk table first (e.g. `quick_tap_buttons`) to
        validate the policy pattern end-to-end before touching
        higher-stakes tables
  - [ ] 4.2 Replace that table's `USING (true) WITH CHECK (true)` policy
        with the household-membership policy (see design.md for the
        exact SQL pattern)
  - [ ] 4.3 Test immediately: both parents' accounts can still read/write
        that table; a request with no session gets zero rows
  - [ ] 4.4 Repeat 4.2-4.3 for every remaining child-profile-scoped table:
        `events`, `diary_entries`, `photos`, `documents`,
        `relationship_persons`, `context_entries`, `insights`,
        `strategies`, `conversation_sessions`, `voice_log_corrections`,
        `behaviors`, `rewards`, `point_events`
  - [ ] 4.5 Replace `child_profiles`' own policy with a direct
        `household_members` check (no join needed, it has
        `household_id` directly)
  - [ ] 4.6 Decide policy for `glossary_terms` (shared reference data -
        likely fine to leave world-readable) and `sync_metadata`
        (check what actually uses this before deciding)

- [ ] 5. Update local/dev scripts that bypass user auth entirely
  - [ ] 5.1 Identify every script under `scripts/` that talks to
        Supabase directly (e.g. `backfill-local-date.js`,
        `backup-supabase.js`, `restore-supabase.js`)
  - [ ] 5.2 Switch them from the anon key to the Supabase **service
        role** key (never shipped in the app - store in `.env`,
        confirm it's gitignored)
  - [ ] 5.3 Re-run each script once against the live project post-RLS to
        confirm they still work

- [ ] 6. Verify the vulnerability is actually closed
  - [ ] 6.1 Confirm Supabase's dashboard alert / security scanner no
        longer flags `rls_disabled_in_public` for any table
  - [ ] 6.2 Manually test: a request using only the anon key with no
        session returns zero rows from every table (this is the actual
        fix being verified, not just that legitimate access still works)
  - [ ] 6.3 Re-test both parents' full app flows end-to-end (Today tab,
        diary, rewards, insights) on real devices

- [ ] 7. Cleanup (optional, can be a separate later session)
  - [ ] 7.1 Remove now-unused `/api/auth/*` endpoints from `backend/src`
  - [ ] 7.2 Remove `mobile/services/auth-service.ts` and the custom JWT
        storage in `SecureStore` once nothing references them
  - [ ] 7.3 Decide whether `backend/`'s other endpoints (voice, sync)
        still have a purpose, or if `sync-service.ts`'s stubbed-out
        download methods should be removed too
