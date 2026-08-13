# Timezone-Safe Date Bucketing — Tasks

Do these roughly in order. Each top-level item is independently testable.

- [ ] 1. Add `toLocalDateString()` helper
  - [ ] 1.1 Create `mobile/utils/local-date.ts` with the helper from design.md
  - [ ] 1.2 Add a quick unit test (or manual REPL check) confirming it
        returns the calendar day matching the device's current timezone,
        not UTC

- [ ] 2. Schema: add `local_date` column
  - [ ] 2.1 SQLite: add `local_date TEXT` to `events`, `diary_entries`,
        `point_events` `CREATE TABLE` statements in `database.ts`
  - [ ] 2.2 SQLite: add matching `ALTER TABLE ... ADD COLUMN local_date`
        migrations in `runMigrations()`, following the existing
        try/catch-duplicate-column pattern
  - [ ] 2.3 SQLite: add indexes on `local_date` for all three tables
  - [ ] 2.4 Supabase: run the equivalent `ALTER TABLE ... ADD COLUMN IF
        NOT EXISTS local_date TEXT` + index statements directly against
        the Supabase project via SQL editor
  - [ ] 2.5 Update `supabase-schema.sql` in the repo to match, so it's the
        source of truth for any future fresh Supabase setup

- [ ] 3. Write path: persist `local_date` on every create
  - [ ] 3.1 `mobile/services/event-service.ts` → `createEvent()`
  - [ ] 3.2 `mobile/services/rewards-service.ts` → `logBehavior()`,
        `redeemReward()`
  - [ ] 3.3 `mobile/components/VoiceLogger.tsx` → `handleSave()` (diary
        entry + per-event loop)
  - [ ] 3.4 `mobile/app/(tabs)/index.tsx` → `handleQuickTap()`,
        `handleSaveCustomEvent()`
  - [ ] 3.5 `mobile/app/event-form.tsx` → `handleSave()`
  - [ ] 3.6 `mobile/services/database.ts` → thread `local_date` through
        `createEvent`, `createDiaryEntry`, `createPointEvent`,
        `updateEvent` (and their UPDATE equivalents, in case an edit
        changes the timestamp)
  - [ ] 3.7 `mobile/services/database-supabase.ts` → same as 3.6 for the
        Supabase-backed methods
  - [ ] 3.8 Decide whether to bother with `mobile/app/voice-recording.tsx`
        (confirm it's still dead/unreachable first)

- [ ] 4. Read path: query by `local_date` instead of recomputed UTC window
  - [ ] 4.1 `mobile/services/event-service.ts` → `getEventsForDate()`
  - [ ] 4.2 `mobile/services/database.ts` → diary-by-date query,
        `getDailyPointEvents()`
  - [ ] 4.3 `mobile/services/database-supabase.ts` →
        `getDiaryEntriesByDate()`, `getDailyPointEvents()`
  - [ ] 4.4 `mobile/services/rewards-service.ts` →
        `getLogCountForPeriod()` daily branch, past-date redemption check
  - [ ] 4.5 `mobile/app/(tabs)/index.tsx` → `loadDataForDate()`
  - [ ] 4.6 `mobile/components/RewardsTabScreen.tsx` → prior-balance calc
  - [ ] 4.7 `mobile/app/(rewards-forms)/ledger.tsx` → date grouping +
        header labels
  - [ ] 4.8 Re-grep the codebase for `setHours(0, 0, 0, 0)` and
        `setHours(23, 59, 59, 999)` before considering this done, in case
        new call sites were added since this doc was written

- [ ] 5. Lower-priority "is this today" UI checks (optional pass)
  - [ ] 5.1 `mobile/app/(tabs)/index.tsx` → `isToday()`
  - [ ] 5.2 `mobile/components/VoiceLogger.tsx` → `isToday` check in
        `handleSave()`
  - [ ] 5.3 `mobile/components/DiaryView.tsx` → today/yesterday labels

- [ ] 6. Backfill existing data
  - [ ] 6.1 Write a one-time script (Node, using the existing
        `@supabase/supabase-js` pattern from `scripts/backup-supabase.js`)
        that reads all rows missing `local_date` and sets it via
        `toLocalDateString` assuming Pacific time
  - [ ] 6.2 Run it against Supabase Cloud + Supabase dev
  - [ ] 6.3 Manually verify the known-affected rows end up correct:
        - August 1/2 diary entry (`timestamp = 2026-08-02T06:38:56Z` UTC)
          should land on `local_date = '2026-08-01'`
        - June 13 voice log (`timestamp = 2026-06-14T06:57:35Z` UTC)
          should land on `local_date = '2026-06-13'`
        - July 9/10 - there are two separate voice logs near this
          boundary (`2026-07-10T04:27:41Z` and `2026-07-11T06:44:45Z`
          UTC); confirm each lands on the day its content actually
          describes, cross-referencing against the July 22 backup file
  - [ ] 6.4 Decide whether SQLite dev data needs backfilling too (only
        matters if you care about historical dev-app data)

- [ ] 7. Test
  - [ ] 7.1 Change device timezone, log something, confirm it shows on
        the correct day under both the original and a different timezone
  - [ ] 7.2 Log something between ~10 PM and midnight in one timezone,
        switch device to a zone 2+ hours ahead, confirm no shift
  - [ ] 7.3 Re-check June 13, July 9/10, and August 1 in the app (SBDev
        and/or Cloud) after backfill and confirm content now appears on
        the right day
  - [ ] 7.4 Spot check rewards ledger and behavior daily-limit logic
        still work correctly (these read `local_date` too now)
