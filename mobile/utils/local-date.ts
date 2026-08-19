/**
 * Timezone-safe local date helper.
 *
 * Background: every "get X for day D" query in this app used to recompute
 * the day's start/end boundary using the device's CURRENT local timezone at
 * query time. That works fine until the device crosses a timezone boundary
 * between logging and viewing (e.g. traveling) - a row logged at 11:38 PM
 * Pacific on Aug 1 is 1:38 AM Central on Aug 2, so viewing it from a
 * different timezone than it was logged in silently reassigns it to the
 * wrong calendar day.
 *
 * The fix: freeze the calendar-day decision at write time by computing and
 * storing a `local_date` string ('YYYY-MM-DD') using the device's timezone
 * at the moment of creation, then querying by that frozen string instead of
 * recomputing a UTC window later. See
 * .kiro/specs/timezone-safe-dates/{requirements,design}.md for the full
 * writeup.
 */

/**
 * Returns 'YYYY-MM-DD' for the given Date's local calendar day, computed
 * using the CURRENT local timezone (i.e. whatever timezone the device is
 * set to right now, at the moment this function runs).
 *
 * Call this only at the moment of writing a new row (or when the user
 * explicitly picks/confirms a calendar date in the UI) - never to
 * recompute the "day" of a timestamp that was written earlier, since the
 * device's timezone may have changed since then. That's exactly the bug
 * this file exists to avoid reintroducing.
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
