# Timezone-Safe Date Bucketing — Design

## Root cause

Every "get X for a given day" query follows this pattern:

```js
const startOfDay = new Date(date);
startOfDay.setHours(0, 0, 0, 0);
const endOfDay = new Date(date);
endOfDay.setHours(23, 59, 59, 999);
```

`setHours()` mutates the `Date` using the **JS engine's current local
timezone** (i.e. whatever timezone the device is set to right now). The
resulting UTC window used in the actual DB query therefore shifts
depending on where the device is when the query runs — not where it was
when the row was written.

Example: a row logged at `2026-08-02T06:38:56Z` was authored at 11:38 PM
Pacific on Aug 1. A device now on Central time computing "August 1" builds
a window of roughly `2026-08-01T05:00:00Z` to `2026-08-02T04:59:59Z` (UTC-5
DST offset) — and `06:38:56Z` falls just outside that window, so the row
gets excluded from "August 1" and instead appears under "August 2".

## Fix strategy: store a frozen local-date string at write time

Add a new column, `local_date` (`TEXT`, format `'YYYY-MM-DD'`), to every
table that gets queried "by day". This value is computed **once, at the
moment the row is created**, using the device's timezone *at that moment*,
and is never recomputed later. All "get X for day D" queries then filter by
`local_date = 'D'` — a simple string equality — instead of recomputing a
UTC timestamp window from whatever timezone the querying device happens to
be in.

This is the standard fix for this class of bug: freeze the calendar-day
decision at write time, don't derive it at read time.

### Why not just use the timestamp column with better UTC math?

Storing everything in UTC and having every consumer "just remember to
convert to the right timezone" is fragile and this bug is proof: the
existing code already tries to do local-day math, it just uses the wrong
timezone (current device time) instead of the timezone that mattered
(the timezone at logging time). A frozen string sidesteps timezone math
entirely for the read path — there is no timezone to get wrong once the
string exists.

### Helper

```ts
// mobile/utils/local-date.ts (new file)

/** Returns 'YYYY-MM-DD' for the device's local calendar day, computed
 *  from the given Date using the CURRENT local timezone. Call this only
 *  at the moment of writing a new row - never to recompute on read. */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

## Schema changes

### SQLite (`mobile/services/database.ts`)

Add to the existing migration pattern in `runMigrations()` (see the
`category` column migration on `relationship_persons` around line 344-353
for the established try/catch-duplicate-column pattern used in this file):

```sql
ALTER TABLE events ADD COLUMN local_date TEXT;
ALTER TABLE diary_entries ADD COLUMN local_date TEXT;
ALTER TABLE point_events ADD COLUMN local_date TEXT;

CREATE INDEX IF NOT EXISTS idx_events_local_date ON events(local_date);
CREATE INDEX IF NOT EXISTS idx_diary_entries_local_date ON diary_entries(local_date);
CREATE INDEX IF NOT EXISTS idx_point_events_local_date ON point_events(local_date);
```

Also add the column to the `CREATE TABLE IF NOT EXISTS` statements
directly (lines ~45, ~72, ~312) so fresh installs get it without relying
on the migration.

### Supabase / Postgres (`supabase-schema.sql`)

```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS local_date TEXT;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS local_date TEXT;
ALTER TABLE point_events ADD COLUMN IF NOT EXISTS local_date TEXT;

CREATE INDEX IF NOT EXISTS idx_events_local_date ON events(local_date);
CREATE INDEX IF NOT EXISTS idx_diary_entries_local_date ON diary_entries(local_date);
CREATE INDEX IF NOT EXISTS idx_point_events_local_date ON point_events(local_date);
```

Run this in the Supabase SQL editor directly against the project
(`qkvcwngwatfkhmjhzwvu`). Also update `supabase-schema.sql` in the repo so
it stays the source of truth for fresh Supabase setups.

## Write-path changes (set `local_date` going forward)

Every place that constructs an `Event`, `DiaryEntry`, or `PointEvent` needs
to compute and persist `local_date = toLocalDateString(timestamp)` at
creation time. Known creation call sites:

- `mobile/services/event-service.ts` → `createEvent()`
- `mobile/services/rewards-service.ts` → `logBehavior()`, `redeemReward()`
- `mobile/components/VoiceLogger.tsx` → `handleSave()` (both the diary
  entry and the per-event loop)
- `mobile/app/(tabs)/index.tsx` → `handleQuickTap()`, `handleSaveCustomEvent()`
- `mobile/app/event-form.tsx` → `handleSave()` (manual event create/edit)
- `mobile/app/voice-recording.tsx` → `handleSave()` (legacy/unreachable
  screen — low priority, see Testing Guidance below)

Also update the corresponding `createEvent`/`createDiaryEntry`/
`createPointEvent`/`updateEvent` methods in both `database.ts` and
`database-supabase.ts` to actually write the `local_date` column through
to SQLite/Supabase (mirroring how `severity`, `custom_emoji`, etc. are
already passed through).

## Read-path changes (query by `local_date` instead of recomputed UTC window)

Replace the UTC-window `dateRange` filtering with a direct `local_date`
equality filter at every one of these call sites (this is the full
inventory found via repo-wide search — cross-check against the live repo
before starting, since more may have been added since this doc was
written):

| File | Function | Current pattern |
|---|---|---|
| `mobile/services/event-service.ts` | `getEventsForDate()` (~line 56-61) | `setHours(0,0,0,0)` / `setHours(23,59,59,999)` |
| `mobile/services/database.ts` | `getDailyPointEvents()` (~line 1481-1484) | same |
| `mobile/services/database.ts` | diary entries by date (~line 841-844) | same |
| `mobile/services/database-supabase.ts` | `getDiaryEntriesByDate()` (~line 370-374) | same |
| `mobile/services/database-supabase.ts` | `getDailyPointEvents()` (~line 752-756) | same |
| `mobile/services/rewards-service.ts` | `getLogCountForPeriod()` daily branch (~line 476-479) | same (weekly branch is lower priority - see note below) |
| `mobile/services/rewards-service.ts` | past-date redemption check (~line 269-280) | `toDateString()` comparison + `setHours` |
| `mobile/app/(tabs)/index.tsx` | `loadDataForDate()` (~line 209-213) | same |
| `mobile/components/RewardsTabScreen.tsx` | prior-balance calc (~line 92-94) | same |
| `mobile/app/(rewards-forms)/ledger.tsx` | date grouping (~line 68-71) + header labels (~line 111-117) | `setHours` + `toISOString()` grouping key |
| `mobile/components/VoiceLogger.tsx` | `isToday` check (~line 283) | `toDateString()` comparison |
| `mobile/components/DiaryView.tsx` | today/yesterday labels (~line 28-29) | `toDateString()` comparison |

For each: change the query filter from `timestamp >= start AND timestamp
<= end` to `local_date = ?` where `?` is `toLocalDateString(selectedDate)`
computed using the **currently selected calendar date** (not reconverted
from a stored UTC timestamp).

Note on `toDateString()`/`getDate()`/`getMonth()` comparisons (e.g.
`isToday()` in `index.tsx` line ~259-265, `VoiceLogger` line 283,
`DiaryView` line 28-29): these are used to decide *whether the current
moment is "today"* for UI purposes (like choosing "now" vs "noon" as a
timestamp), not to query historical data. They're lower-risk than the
query-filtering bugs above but should still be reviewed - if the user
travels mid-session, "isToday" can disagree with what was true when they
started the session. Not required for the core fix, but worth a pass.

## Data correction (backfill) for existing rows

New rows will be correct going forward once the write-path fix ships, but
existing rows only have a UTC `timestamp`/`date` column with no reliable
way to know what "local day" the user meant, since the confusion arose from
not knowing the device's timezone at write time in the first place.

Approach:
1. For the large majority of rows (i.e. anything logged from a stable home
   timezone), assume Pacific time and backfill `local_date` via a one-time
   script: `local_date = toLocalDateString` applied with a fixed Pacific
   timezone conversion of the stored UTC timestamp.
2. For the known problem rows identified during the investigation (the
   August 1/2 diary entry + linked events, UTC timestamp
   `2026-08-02T06:38:56Z`), manually verify and correct `local_date` to
   `2026-08-01` after the backfill runs, since the automated Pacific-time
   assumption would also get this one right in this specific case (11:38
   PM Pacific is unambiguously Aug 1) — but double check after backfill
   rather than assume.
3. Cross-reference against the July 22 backup
   (`~/Desktop/Attune/attune-full-backup-2026-07-22.json`) for the June 13
   and July 9/10 rows discussed during the investigation, to confirm their
   backfilled `local_date` matches what the diary content actually
   describes.

This backfill only needs to run once per environment (SQLite dev doesn't
need it unless you want historical dev data corrected too; Supabase Cloud
+ Supabase dev do, since that's where real logged history lives).

## Testing guidance

- Change the simulator/device timezone (iOS Settings → General → Date &
  Time → set manually to a non-Pacific zone) and confirm entries logged
  under Pacific still show up on the correct day.
- Specifically test logging something between 9 PM and midnight in one
  timezone, then switching the device to a timezone 2+ hours ahead, and
  confirm the entry stays on the day it was logged.
- Re-verify the three known-affected dates (June 13, July 9/10, August 1)
  show correct content after the backfill.
- `mobile/app/voice-recording.tsx` appears to be dead code (no navigation
  references found in the codebase as of this writing) — confirm that's
  still true before deciding whether it needs the write-path fix at all.
