import * as Location from 'expo-location';
import { databaseService } from './database';
import { toLocalDateString } from '../utils/local-date';
import { SavedPlace, PlaceType, LocationPeriod, HouseholdMember } from '../models';

// Fixed to exactly 3 household members, matching HouseholdMember's union -
// see Requirement 9.4 (Non-Goals) in
// .kiro/specs/family-location-tracking/requirements.md.
const HOUSEHOLD_MEMBERS: HouseholdMember[] = ['child', 'mom', 'dad'];

export interface DailyLocationEntry {
  householdMember: HouseholdMember;
  /** null only if this member has no Home_Place designated AND no
   * LocationPeriod covers this day (Requirement 2.9) - never a guess. */
  savedPlace: SavedPlace | null;
  /** true if this day resolved via the member's Home_Place default,
   * rather than an explicit LocationPeriod covering this day. */
  isHomePlace: boolean;
}

export interface DailyLocations {
  /** 'YYYY-MM-DD' */
  dateKey: string;
  /** One entry per HouseholdMember (child, mom, dad), always all 3,
   * regardless of whether each one resolved to a place or null. */
  entries: DailyLocationEntry[];
  /** True if the child's resolved SavedPlace this day differs from the
   * child's designated Home_Place (Requirement 3.5). False if they
   * match (including via Home_Place fallback), AND false if the child
   * has no Home_Place designated at all or no place resolved - there's
   * no meaningful "differs from" without a Home_Place to compare
   * against. */
  isTransitionDay: boolean;
  /** Which of 'mom'/'dad' are NOT at the same resolved SavedPlace as the
   * child this day (Requirement 3.4). A member whose own location is
   * unknown (null) is treated as separated rather than silently assumed
   * co-located - this never claims co-location it can't actually
   * confirm. */
  separatedFrom: HouseholdMember[];
}

/**
 * Returns the icon used for a given PlaceType - the single shared mapping
 * used by LocationCalendarView, LocationMapView, and the Today tab
 * location indicator, so all three stay visually consistent and this
 * mapping is defined exactly once (see design.md's Today Tab Location
 * Indicator section).
 */
/**
 * Resolves the icon actually displayed for a SavedPlace - the Parent's
 * customEmoji override if one is set (e.g. "⛰️" for an "Aspen" Vacation
 * place), otherwise falling back to getPlaceTypeIcon's PlaceType default.
 * Every call site that renders a SavedPlace's icon (Calendar day cells,
 * Map pins, the detail sheet, management list/forms) should call this
 * instead of getPlaceTypeIcon directly, so the customEmoji override is
 * never accidentally skipped in just one place.
 */
export function getSavedPlaceIcon(place: SavedPlace): string {
  return place.customEmoji?.trim() || getPlaceTypeIcon(place.placeType);
}

export function getPlaceTypeIcon(placeType: PlaceType): string {
  switch (placeType) {
    case 'home': return '🏠';
    case 'vacation': return '✈️';
    case 'family_visit': return '👵';
    case 'camp_or_school_trip': return '🏕️';
    case 'other': return '📍';
    default: return '📍';
  }
}

/**
 * Icon shown for an ordinary Home_Place day - distinct from
 * getPlaceTypeIcon('home'), which is what a SavedPlace of PlaceType
 * 'home' shows (those happen to be the same emoji today, but
 * getPlaceTypeIcon describes a PlaceType while HOME_ICON describes "this
 * day resolved to the member's designated Home_Place," which are
 * conceptually different things that could diverge later).
 */
export const HOME_ICON = '🏠';

/**
 * Shared "away/transition day" background tint - used by
 * LocationCalendarView's day cells and TodayLocationIndicator, so both
 * surfaces visually agree on what "away from home" looks like rather
 * than each defining their own color (see design.md's Today Tab
 * Location Indicator section: "matching whatever LocationCalendarView's
 * own transition marker ends up being, rather than inventing a second
 * visual language for the same concept").
 */
export const TRANSITION_TINT = 'rgba(242,201,76,0.25)';

/**
 * Enumerates every 'YYYY-MM-DD' date key from start through end
 * (inclusive), both given as 'YYYY-MM-DD' strings. Walks via setDate()
 * day-by-day rather than adding a fixed 24h in milliseconds, so a DST
 * transition within the range can't shift the wall-clock day the way
 * raw millisecond arithmetic would.
 */
function enumerateDateKeys(start: string, end: string): string[] {
  const keys: string[] = [];
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const current = new Date(sy, sm - 1, sd);
  const endDate = new Date(ey, em - 1, ed);

  while (current.getTime() <= endDate.getTime()) {
    keys.push(toLocalDateString(current));
    current.setDate(current.getDate() + 1);
  }

  return keys;
}

/**
 * Single source of truth for "which SavedPlace was each HouseholdMember
 * at, on each day in range" - used by both LocationCalendarView and
 * LocationMapView (via getPlaceVisitCounts below), so the "which period
 * wins on overlap" and "what happens with no Home_Place" resolution
 * rules live in exactly one place rather than being duplicated the way
 * computeAutoMoodFromEvents currently is between WeatherView and
 * HeatMapView (see design.md's Architecture section).
 *
 * Resolution algorithm for a single day + household member (Requirements
 * 2.8, 2.9; Property 1):
 * 1. Fetch all LocationPeriods for this childProfileId + householdMember
 *    where startDate <= day AND (endDate is null OR endDate >= day).
 * 2. If exactly one matches, use its SavedPlace.
 * 3. If more than one matches (an overlap that was warned about but
 *    saved anyway - Requirement 2.7 warns, does not block), the
 *    most-recently-created LocationPeriod wins.
 * 4. If none match, fall back to that household member's designated
 *    Home_Place (Requirement 2.8); if no Home_Place is designated,
 *    savedPlace is null (Requirement 2.9).
 */
export async function getDailyLocations(
  childProfileId: string,
  dateRange: { start: string; end: string }
): Promise<DailyLocations[]> {
  const [allPeriods, settings, allPlaces] = await Promise.all([
    databaseService.getLocationPeriodsByProfile(childProfileId),
    databaseService.getHouseholdLocationSettings(childProfileId),
    databaseService.getSavedPlacesByProfile(childProfileId),
  ]);

  const placesById = new Map(allPlaces.map((p: SavedPlace) => [p.id, p]));

  const homePlaceIdByMember: Record<HouseholdMember, string | undefined> = {
    child: settings.childHomePlaceId,
    mom: settings.momHomePlaceId,
    dad: settings.dadHomePlaceId,
  };

  // Group periods by household member, sorted most-recently-created
  // first, so "most-recently-created wins on overlap" (step 3 above) is
  // just "take the first match" per day rather than re-sorting per day.
  const periodsByMember: Record<HouseholdMember, LocationPeriod[]> = { child: [], mom: [], dad: [] };
  for (const period of allPeriods) {
    periodsByMember[period.householdMember].push(period);
  }
  for (const member of HOUSEHOLD_MEMBERS) {
    periodsByMember[member].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  const resolveForDay = (member: HouseholdMember, dateKey: string): { savedPlace: SavedPlace | null; isHomePlace: boolean } => {
    const matching = periodsByMember[member].filter(
      (p) => p.startDate <= dateKey && (!p.endDate || p.endDate >= dateKey)
    );

    if (matching.length > 0) {
      // Already sorted most-recently-created first, so the first match
      // is the one that wins per the resolution algorithm's step 3.
      const place = placesById.get(matching[0].savedPlaceId) ?? null;
      return { savedPlace: place, isHomePlace: false };
    }

    const homePlaceId = homePlaceIdByMember[member];
    if (homePlaceId) {
      const place = placesById.get(homePlaceId) ?? null;
      return { savedPlace: place, isHomePlace: true };
    }

    return { savedPlace: null, isHomePlace: false };
  };

  const results: DailyLocations[] = [];

  for (const dateKey of enumerateDateKeys(dateRange.start, dateRange.end)) {
    const entries: DailyLocationEntry[] = HOUSEHOLD_MEMBERS.map((member) => {
      const { savedPlace, isHomePlace } = resolveForDay(member, dateKey);
      return { householdMember: member, savedPlace, isHomePlace };
    });

    const childEntry = entries.find((e) => e.householdMember === 'child')!;

    // Property 5: true only when the child has a designated Home_Place
    // AND today's resolved place differs from it. No Home_Place at all,
    // or no resolved place, means there's nothing to diverge from, so
    // this stays false rather than guessing.
    const childHomePlaceId = homePlaceIdByMember.child;
    const isTransitionDay = !!childHomePlaceId && !!childEntry.savedPlace && childEntry.savedPlace.id !== childHomePlaceId;

    // A parent is "separated" if their resolved place isn't the exact
    // same SavedPlace as the child's today - including when either
    // side's location is unknown (null), since an unknown location is
    // never treated as a confirmed co-location.
    const separatedFrom: HouseholdMember[] = [];
    for (const member of ['mom', 'dad'] as HouseholdMember[]) {
      const entry = entries.find((e) => e.householdMember === member)!;
      const coLocated = childEntry.savedPlace !== null && entry.savedPlace !== null && entry.savedPlace.id === childEntry.savedPlace.id;
      if (!coLocated) {
        separatedFrom.push(member);
      }
    }

    results.push({ dateKey, entries, isTransitionDay, separatedFrom });
  }

  return results;
}

/**
 * Thin single-day convenience wrapper around getDailyLocations, for call
 * sites (the Today tab's location indicator) that only need one day's
 * resolution rather than a whole month grid - avoids making Today either
 * duplicate the resolution algorithm or reach for the month-oriented
 * batch function to answer a single-day question (see design.md's Today
 * Tab Location Indicator section).
 */
export async function getDailyLocationForDay(
  childProfileId: string,
  dateKey: string
): Promise<DailyLocations | undefined> {
  const results = await getDailyLocations(childProfileId, { start: dateKey, end: dateKey });
  return results[0];
}

/**
 * Aggregates the child's resolved location (specifically the child, not
 * mom/dad) by SavedPlace across all recorded history, for the Location
 * Map's pin sizing (Requirement 4.3). "All recorded history" is bounded
 * by the earliest LocationPeriod startDate for the child - if the child
 * has no LocationPeriods at all, there's no meaningful lower bound to
 * aggregate from, so this returns an empty Map (the Map view's own empty
 * state, Requirement 4.7, handles that case in the UI layer rather than
 * this function inventing a date range to scan).
 */
export async function getPlaceVisitCounts(
  childProfileId: string
): Promise<Map<string, { savedPlace: SavedPlace; dayCount: number }>> {
  const childPeriods = await databaseService.getLocationPeriodsByProfile(childProfileId, 'child');
  if (childPeriods.length === 0) {
    return new Map();
  }

  const earliestStart = childPeriods.reduce(
    (min, p) => (p.startDate < min ? p.startDate : min),
    childPeriods[0].startDate
  );
  const today = toLocalDateString(new Date());

  const dailyLocations = await getDailyLocations(childProfileId, { start: earliestStart, end: today });

  const counts = new Map<string, { savedPlace: SavedPlace; dayCount: number }>();
  for (const day of dailyLocations) {
    const childEntry = day.entries.find((e) => e.householdMember === 'child');
    if (!childEntry?.savedPlace) continue;

    const existing = counts.get(childEntry.savedPlace.id);
    if (existing) {
      existing.dayCount += 1;
    } else {
      counts.set(childEntry.savedPlace.id, { savedPlace: childEntry.savedPlace, dayCount: 1 });
    }
  }

  return counts;
}

/**
 * Date-range overlap check for a household member, used to warn (not
 * block) the Parent before saving a new/edited LocationPeriod -
 * Requirement 2.7. Thin passthrough to databaseService's own
 * implementation, kept here so UI code calls location-service for every
 * location-related read rather than reaching into databaseService
 * directly for this one case.
 */
export async function getOverlappingPeriods(
  childProfileId: string,
  householdMember: HouseholdMember,
  startDate: string,
  endDate: string | undefined,
  excludePeriodId?: string
): Promise<LocationPeriod[]> {
  return databaseService.getOverlappingLocationPeriods(childProfileId, householdMember, startDate, endDate, excludePeriodId);
}

/**
 * Resolves a free-text city/region string (e.g. "Aspen") to an
 * approximate lat/long, for the Location Map's pin placement
 * (Requirement 1.7). Runs ONCE at SavedPlace create/edit time, never on
 * every render or tied to app usage - this is a one-shot lookup, not
 * live location tracking (see Requirement 9.3's Non-Goal and
 * app.config.js's expo-location plugin comment for the full privacy
 * reasoning).
 *
 * Returns null (not a thrown error) on failure/no match/denied
 * permission - per design.md's Error Handling table, this is an
 * expected, non-error outcome: the SavedPlace still saves, just without
 * a coordinate, and falls into the Location Map's "Other places"
 * fallback grouping (Requirement 1.7, Requirement 4.6; Property 7).
 *
 * Android requires requesting foreground location permission before
 * Location.geocodeAsync() will resolve anything (iOS does not) - see
 * https://docs.expo.dev/versions/latest/sdk/location/. Requesting it
 * here is a deliberate, user-reviewed tradeoff: this app targets iOS
 * only for now, so this permission prompt in practice will rarely if
 * ever be shown, but the request is included so Android isn't silently
 * broken if the app is ever run there.
 */
export async function geocodeRegionHint(regionHint: string): Promise<{ latitude: number; longitude: number } | null> {
  const trimmed = regionHint.trim();
  if (!trimmed) return null;

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[LocationService] Geocoding skipped: location permission not granted');
      return null;
    }

    const results = await Location.geocodeAsync(trimmed);
    if (results.length === 0) {
      console.log(`[LocationService] Geocoding found no match for "${trimmed}"`);
      return null;
    }

    return { latitude: results[0].latitude, longitude: results[0].longitude };
  } catch (error) {
    console.error('[LocationService] Geocoding failed (non-fatal):', error);
    return null;
  }
}
