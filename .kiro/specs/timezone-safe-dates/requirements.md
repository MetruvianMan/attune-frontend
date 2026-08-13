# Timezone-Safe Date Bucketing — Requirements

## Background

Attune logs events and diary entries with a UTC timestamp. Every screen that
groups data "by day" (Today tab, diary view, rewards ledger, behavior limit
checks) recomputes the start/end of that day using the **device's current
local timezone at the moment the query runs** — not the timezone the entry
was originally logged in.

This works fine as long as the device's timezone never changes between
logging and viewing. It breaks the moment the phone crosses a timezone
boundary (e.g. traveling), because "day 1" and "day 24" of a UTC timestamp
range are computed differently depending on which timezone the device
happens to be in *right now*.

## Confirmed real-world impact

Verified directly against production Supabase data on 2026-08-02 (see
`scripts/` one-off queries used for the investigation, not checked in):

- A diary entry with UTC timestamp `2026-08-02T06:38:56Z` was logged at
  **11:38 PM Pacific on August 1**, but is **1:38 AM Central on August 2**.
  Viewed from Central time, this entry's content (nanny Gaby, Seafare
  parade, Shake Shack, etc.) appears under August 2, and August 1 looks
  empty even though the user did log that day.
- Two other dates (June 13 and July 9/10, 2026) were investigated from a
  July 22 backup file and showed the same pattern: voice logs made shortly
  before midnight Pacific landed one calendar day later when re-bucketed
  under a different local timezone.

This is a **data misattribution bug**, not data loss — the rows exist and
are intact, they are just displayed under the wrong calendar day when the
viewing device's timezone differs from the logging device's timezone.

## Goals

1. Every event, diary entry, point event, and behavior-log-count check must
   be associated with the calendar day the user intended at the moment of
   logging, permanently — regardless of what timezone the device is in
   later when that data is viewed or queried.
2. Existing rows created before this fix must be corrected so entries that
   were misattributed (like the August 1/2 diary entry above) show up on
   the correct day going forward.
3. The fix must work identically across all three app variants (SQLite
   dev, Supabase dev, Supabase Cloud prod), since they share the same
   `mobile/` codebase.

## Non-goals

- This is not about displaying times in different timezones for the user
  (e.g. "8:44 PM your time" vs "8:44 PM their time"). It's purely about
  which *calendar day* an entry is filed under.
- Not attempting to detect/label timezone changes to the user in the UI.
