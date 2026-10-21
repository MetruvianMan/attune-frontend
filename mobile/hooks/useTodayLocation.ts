import { useEffect, useState } from 'react';
import { databaseService } from '../services/database';
import { getDailyLocationForDay, getSavedPlaceIcon, HOME_ICON } from '../services/location-service';

export interface AbsentParent {
  label: 'M' | 'D';
  /** The absent parent's OWN resolved place, e.g. "Lindy's House" -
   * null if even their own location is unresolved. */
  placeName: string | null;
  /** That place's icon (customEmoji override or PlaceType default, via
   * getSavedPlaceIcon) - shown after the name, e.g. "Lindy's House 👵".
   * null whenever placeName is null (nothing to attach an icon to). */
  placeIcon: string | null;
}

export interface ResolvedTodayLocation {
  placeName: string;
  icon: string;
  isTransitionDay: boolean;
  /** Only the parents who are NOT co-located with the child today - a
   * present parent adds nothing worth showing. Empty array when both
   * parents are present - the ordinary, most common day. */
  absentParents: AbsentParent[];
}

/**
 * True when today's resolved location is worth a full, dedicated row
 * (the child is away from their Home_Place, or at least one parent is
 * separated from the child) - false on the ordinary day where everyone
 * is simply home, which the Today tab instead folds into the compact
 * inline chip next to the date row (see TodayLocationChip). Shared here
 * so index.tsx's layout decision and the full-row component's own
 * render-or-not check never disagree about what counts as "normal."
 */
export function hasLocationAnomaly(resolved: ResolvedTodayLocation | null): boolean {
  return !!resolved && (resolved.isTransitionDay || resolved.absentParents.length > 0);
}

/**
 * Resolves the child's location for a single logging day, shared by the
 * Today tab's two location surfaces (the compact "🏠 Home" chip shown
 * inline on ordinary days, and the full-row TodayLocationIndicator shown
 * only on an anomalous day - see hasLocationAnomaly). Extracted out of
 * TodayLocationIndicator (which used to fetch this itself) so the parent
 * screen can see the resolved state too and decide which of the two
 * surfaces to render, without fetching it twice.
 *
 * Privacy default: `hasAnySavedPlace` stays false (and `resolved` stays
 * null) entirely unless the profile has at least one SavedPlace
 * configured - checked via a lightweight getSavedPlacesByProfile count
 * on every prop change, not inferred from a null getDailyLocationForDay
 * result (a profile could have a Home_Place designated but this specific
 * day still resolve to null for some other reason - handled separately
 * below).
 *
 * `childProfileId` may be null (e.g. while the active profile is still
 * loading) - the hook simply resolves to `{ hasAnySavedPlace: false,
 * resolved: null }` in that case, same as "no SavedPlace configured."
 */
export function useTodayLocation(childProfileId: string | null, dateKey: string) {
  const [resolved, setResolved] = useState<ResolvedTodayLocation | null>(null);
  // Separate from `resolved === null` - distinguishes "profile has no
  // SavedPlace at all" (never show anything, ever) from "this specific
  // day resolved to null" (also show nothing, but for a different
  // reason) from "still loading" (also show nothing, to avoid a flash
  // of content before the opt-in check resolves).
  const [hasAnySavedPlace, setHasAnySavedPlace] = useState(false);

  useEffect(() => {
    if (!childProfileId) {
      setHasAnySavedPlace(false);
      setResolved(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const places = await databaseService.getSavedPlacesByProfile(childProfileId);
        if (cancelled) return;

        if (places.length === 0) {
          setHasAnySavedPlace(false);
          setResolved(null);
          return;
        }
        setHasAnySavedPlace(true);

        const day = await getDailyLocationForDay(childProfileId, dateKey);
        if (cancelled) return;

        const childEntry = day?.entries.find((e) => e.householdMember === 'child');
        if (!childEntry?.savedPlace) {
          setResolved(null);
          return;
        }

        const absentParents: AbsentParent[] = (['mom', 'dad'] as const)
          .filter((member) => day!.separatedFrom.includes(member))
          .map((member) => {
            const entry = day!.entries.find((e) => e.householdMember === member);
            return {
              label: member === 'mom' ? 'M' : 'D',
              placeName: entry?.savedPlace?.name ?? null,
              placeIcon: entry?.savedPlace ? getSavedPlaceIcon(entry.savedPlace) : null,
            };
          });

        setResolved({
          placeName: childEntry.savedPlace.name,
          icon: day!.isTransitionDay ? getSavedPlaceIcon(childEntry.savedPlace) : HOME_ICON,
          isTransitionDay: day!.isTransitionDay,
          absentParents,
        });
      } catch (error) {
        console.error('[useTodayLocation] Failed to load location:', error);
        if (!cancelled) {
          setResolved(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [childProfileId, dateKey]);

  return { hasAnySavedPlace, resolved };
}
