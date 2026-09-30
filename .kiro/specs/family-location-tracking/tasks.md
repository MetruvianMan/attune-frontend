# Implementation Plan: Family Location Tracking

## Overview

This plan implements Family Location Tracking for the Attune mobile app. Tasks build incrementally: models → database layer (SQLite + Supabase) → location-service resolution logic → management/entry screens → Location Calendar view → Location Map view → Insights tab wiring. No test framework exists in this project (confirmed: no jest/vitest configured), so each task's verification step is `tsc --noEmit` plus the manual on-device scenarios listed in design.md's Testing Strategy, run at the checkpoints below - not an automated test suite.

## Tasks

- [ ] 1. Add SavedPlace and LocationPeriod models
  - [ ] 1.1 Create `mobile/models/saved-place.ts`
    - Define `PlaceType` union (`'home' | 'family_visit' | 'vacation' | 'camp_or_school_trip' | 'other'`)
    - Define `SavedPlace` interface: id, childProfileId, name, placeType, regionHint?, latitude?, longitude?, createdAt, updatedAt
    - Define `SavedPlaceInput` interface: childProfileId, name, placeType, regionHint?
    - _Requirements: 1.1, 1.2, 1.7_

  - [ ] 1.2 Create `mobile/models/location-period.ts`
    - Define `HouseholdMember` union (`'child' | 'mom' | 'dad'`)
    - Define `LocationPeriod` interface: id, childProfileId, householdMember, savedPlaceId, startDate, endDate?, createdAt, updatedAt
    - Define `LocationPeriodInput` interface: childProfileId, householdMember, savedPlaceId, startDate, endDate?
    - _Requirements: 2.1, 5.1_

  - [ ] 1.3 Export new models from `mobile/models/index.ts`
    - Add `export *` for both new model files, matching the existing pattern for other models
    - Check for naming collisions with existing exports (the codebase already has one known duplicate `Strategy` export between `insight.ts` and `glossary.ts` - confirm this feature introduces no new collisions)
    - _Requirements: 5.4_

- [ ] 2. Add SavedPlace/LocationPeriod/HouseholdLocationSettings tables to both database services
  - [ ] 2.1 Add SQLite table definitions and migrations in `mobile/services/database.ts`
    - Add `CREATE TABLE IF NOT EXISTS saved_places (...)` per the design.md schema
    - Add `CREATE TABLE IF NOT EXISTS location_periods (...)` per the design.md schema
    - Add `CREATE TABLE IF NOT EXISTS household_location_settings (...)` per the design.md schema
    - Follow the existing migration-safety pattern used for other tables (`CREATE TABLE IF NOT EXISTS`, additive-only columns)
    - _Requirements: 5.2_

  - [ ] 2.2 Implement SavedPlace CRUD in `mobile/services/database.ts` (SQLite)
    - `createSavedPlace(place: SavedPlaceInput & { id, createdAt, updatedAt }): Promise<void>`
    - `getSavedPlace(id: string): Promise<SavedPlace | null>`
    - `getSavedPlacesByProfile(childProfileId: string): Promise<SavedPlace[]>`
    - `updateSavedPlace(id: string, updates: Partial<SavedPlace>): Promise<void>`
    - `deleteSavedPlace(id: string): Promise<void>` - throws/returns a typed error result if referenced by any LocationPeriod or HouseholdLocationSettings row (Property 3)
    - Add `rowToSavedPlace(row: any): SavedPlace` private mapping helper, following the existing `rowToBehavior` convention
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

  - [ ] 2.3 Implement LocationPeriod CRUD in `mobile/services/database.ts` (SQLite)
    - `createLocationPeriod(period: LocationPeriodInput & { id, createdAt, updatedAt }): Promise<void>`
    - `getLocationPeriodsByProfile(childProfileId: string, householdMember?: HouseholdMember): Promise<LocationPeriod[]>`
    - `updateLocationPeriod(id: string, updates: Partial<LocationPeriod>): Promise<void>`
    - `deleteLocationPeriod(id: string): Promise<void>`
    - `getOverlappingLocationPeriods(childProfileId, householdMember, startDate, endDate, excludePeriodId?): Promise<LocationPeriod[]>` - date-range overlap query per design.md
    - Add `rowToLocationPeriod(row: any): LocationPeriod` mapping helper
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 2.4 Implement HouseholdLocationSettings access in `mobile/services/database.ts` (SQLite)
    - `getHouseholdLocationSettings(childProfileId: string): Promise<{ childHomePlaceId?: string; momHomePlaceId?: string; dadHomePlaceId?: string }>`
    - `setHomePlaceId(childProfileId: string, householdMember: HouseholdMember, savedPlaceId: string | null): Promise<void>` - upserts the single settings row per profile
    - _Requirements: 1.4, 2.8, 2.9_

  - [ ] 2.5 Mirror all of 2.1-2.4 in `mobile/services/database-supabase.ts`
    - Same method signatures, implemented as Supabase client calls against equivalent Postgres tables/columns (snake_case columns, matching the existing `createBehavior`/`getBehaviorsByProfile` Supabase pattern)
    - Note in a code comment that the actual Postgres table creation happens via a Supabase migration in the `backend` project (not in this file) - this file only calls the already-existing tables, consistent with how other Supabase-mode tables are handled
    - _Requirements: 5.2, 5.3_

  - [ ] 2.6 Add a Supabase migration for the new tables (in the `backend` project/Supabase dashboard)
    - Create `saved_places`, `location_periods`, `household_location_settings` tables with columns matching design.md's schema, plus RLS policies consistent with existing per-profile-scoped tables (see `.kiro/specs/supabase-rls-hardening/` for the existing RLS convention to follow)
    - _Requirements: 5.2, 5.3_

- [ ] 3. Checkpoint - verify database layer
  - Run `./node_modules/.bin/tsc --noEmit` and fix any type errors.
  - Manually verify (via a temporary debug call or the SBDev console) that creating a SavedPlace and LocationPeriod round-trips correctly in whichever mode (SQLite or Supabase) the current build is configured for.
  - Ask the user if questions arise before proceeding.

- [ ] 4. Implement `location-service.ts` resolution logic
  - [ ] 4.1 Create `mobile/services/location-service.ts`
    - Define `DailyLocationEntry` and `DailyLocations` interfaces per design.md
    - Implement `getDailyLocations(childProfileId, dateRange): Promise<DailyLocations[]>` - the single source of truth for "which place was each household member at, on each day," used by both the Calendar and Map views (Requirement 2.8, 2.9; Property 1)
    - Implement the resolution algorithm exactly as specified in design.md: explicit LocationPeriod match > most-recently-created period on overlap > Home_Place fallback > null if no Home_Place
    - Implement `isTransitionDay` and `separatedFrom` derivation per design.md (Requirement 3.4, 3.5; Property 5)
    - _Requirements: 2.8, 2.9, 3.4, 3.5_

  - [ ] 4.2 Implement `getPlaceVisitCounts(childProfileId): Promise<Map<string, { savedPlace: SavedPlace; dayCount: number }>>`
    - Aggregate `getDailyLocations` results (for the child specifically) by resolved SavedPlace across all recorded history
    - _Requirements: 4.3_

  - [ ] 4.3 Implement geocoding helper for SavedPlace creation/edit
    - `geocodeRegionHint(regionHint: string): Promise<{ latitude: number; longitude: number } | null>` using Expo's `Location.geocodeAsync` (confirm `expo-location` is already a dependency or add it - check `mobile/package.json` first)
    - Called from the SavedPlace create/edit flow (task 5.2), not from any per-render view code
    - Returns `null` (not a thrown error) on failure/no match, per design.md's error-handling table
    - _Requirements: 1.7_

- [ ] 5. Checkpoint - verify location-service
  - Run `./node_modules/.bin/tsc --noEmit`.
  - Manually verify the resolution algorithm against the scenarios in design.md's Testing Strategy: Home_Place fallback, overlapping periods, ongoing period extending to today, no-Home_Place-and-no-period producing `null` rather than a guess.
  - Ask the user if questions arise before proceeding.

- [ ] 6. Build Saved Place management screens
  - [ ] 6.1 Create route group `app/(location-forms)/_layout.tsx`
    - Mirror `app/(rewards-forms)/_layout.tsx`'s Stack setup (no shared context provider needed here unless one is introduced in a later task)
    - _Requirements: 3.8_

  - [ ] 6.2 Create `app/(location-forms)/saved-places-list.tsx`
    - List all SavedPlaces for the active profile (via `useProfile()`, matching the existing pattern in `behaviors-list.tsx`)
    - Show placeType icon/label per place; edit/delete actions per row
    - Show each HouseholdMember's current Home_Place (child/mom/dad) with a picker to reassign it to any existing SavedPlace (Requirement 1.4)
    - Delete action calls `deleteSavedPlace`; on refusal (Property 3), show which LocationPeriods/Home_Place designations reference it (Requirement 1.5)
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

  - [ ] 6.3 Create `app/(location-forms)/saved-place-form.tsx`
    - Fields: name (required), placeType picker (required, 5 options), regionHint (optional free text)
    - On save, call `geocodeRegionHint` if regionHint is set and non-empty, storing the resulting latitude/longitude (or leaving them unset on failure) before calling `createSavedPlace`/`updateSavedPlace`
    - _Requirements: 1.1, 1.2, 1.3, 1.7_

- [ ] 7. Build Location Period management screens
  - [ ] 7.1 Create `app/(location-forms)/location-periods-list.tsx`
    - List LocationPeriods for the active profile, grouped by HouseholdMember or chronologically (design.md leaves this display choice open - pick chronological descending, consistent with how `EventsView` defaults its sort)
    - Show "ongoing" periods distinctly (e.g. no end date shown, an "Ongoing" badge) with a "Close out" action that opens the form pre-filled to add an end date (Requirement 2.4)
    - Edit/delete actions per row
    - _Requirements: 2.3, 2.4, 2.5_

  - [ ] 7.2 Create `app/(location-forms)/location-period-form.tsx`
    - Fields: HouseholdMember picker (child/mom/dad), SavedPlace picker, start date (date picker, allows past dates per Requirement 2.6), end date OR an "ongoing" toggle that hides/clears the end date field
    - Before save, call `getOverlappingLocationPeriods` for the selected household member/date range (excluding the period being edited, if any) and show an inline warning listing the conflicting period(s) if any are found - Parent may still save (Requirement 2.7)
    - _Requirements: 2.1, 2.2, 2.6, 2.7_

- [ ] 8. Checkpoint - verify management screens
  - Run `./node_modules/.bin/tsc --noEmit`.
  - On-device (SBDev): create 2+ SavedPlaces, assign a Home_Place for the child, create an ongoing LocationPeriod, create an overlapping period and confirm the warning appears, close out the ongoing period.
  - Ask the user if questions arise before proceeding.

- [ ] 9. Build the shared day/place detail sheet
  - [ ] 9.1 Create `mobile/components/LocationDetailSheet.tsx`
    - A modal/bottom-sheet component accepting either a single day's `DailyLocations` entry (for Calendar taps) or a `SavedPlace` + list of matching days (for Map pin taps), per design.md's "shared detail-rendering component" decision
    - Renders each HouseholdMember's resolved SavedPlace and PlaceType for the given day(s)
    - _Requirements: 3.6, 4.5_

- [ ] 10. Build LocationCalendarView
  - [ ] 10.1 Create `mobile/components/LocationCalendarView.tsx`
    - Copy the month-grid skeleton structure from `WeatherView.tsx` (month nav header, day-of-week header row, `currentMonth` state, `useFocusEffect` reload, week-row grid) rather than writing a new grid from scratch
    - Replace `WeatherView`'s mood-based `loadMoodDataInternal`/`computeAutoMoodFromEvents` with a call to `location-service.ts`'s `getDailyLocations` for the visible month
    - Render each day cell with: the child's resolved SavedPlace icon/label, a transition-day visual marker when `isTransitionDay` is true (Requirement 3.5), and per-parent co-location/separation indicators (Requirement 3.4)
    - Wire day-tap to open `LocationDetailSheet` with that day's full entry list (Requirement 3.6)
    - Add empty state when no SavedPlace/LocationPeriod data exists for the profile (Requirement 3.7)
    - Add a "Manage Locations" link/button navigating to `saved-places-list.tsx` (Requirement 3.8)
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 11. Checkpoint - verify Location Calendar
  - Run `./node_modules/.bin/tsc --noEmit`.
  - On-device: confirm the calendar renders month data consistent with the LocationPeriods/Home_Place created in the prior checkpoint, transition days are visually distinguished, and tapping a day opens the correct detail sheet.
  - Ask the user if questions arise before proceeding.

- [ ] 12. Build LocationMapView
  - [ ] 12.1 Create `mobile/components/LocationMapView.tsx`
    - Fetch `getPlaceVisitCounts` for the active profile
    - Render each SavedPlace with a coordinate as a positioned pin (linear lat/long projection onto the view's bounding box, per design.md - no map tile library), sized by `dayCount` using a clamped-linear scale
    - Render each SavedPlace without a coordinate in a separate "Other places" list section below the pin layout (Requirement 4.6; Property 7)
    - Visually distinguish each HouseholdMember's Home_Place pin (Requirement 4.4)
    - Wire pin-tap (and "Other places" row-tap) to open `LocationDetailSheet` filtered to that place's day list (Requirement 4.5)
    - Add empty state consistent with LocationCalendarView's empty state (Requirement 4.7)
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 13. Checkpoint - verify Location Map
  - Run `./node_modules/.bin/tsc --noEmit`.
  - On-device: confirm pins render sized proportionally to visit count, Home_Place is visually distinct, a SavedPlace created with an unresolvable regionHint appears in "Other places" rather than being dropped, and tapping a pin opens the correct detail sheet.
  - Ask the user if questions arise before proceeding.

- [ ] 14. Wire Location views into the Insights tab
  - [ ] 14.1 Add a 5th `TabType` value (`'location'`) to `app/(tabs)/insights.tsx`
    - Add a "📍 Location" tab button alongside the existing Weather/Heat Map/Diary/Events buttons, following the exact existing `TouchableOpacity`/`tabActive`/`tabText` pattern
    - _Requirements: 3.1_

  - [ ] 14.2 Add a Calendar/Map sub-toggle within the Location tab
    - Per design.md Requirement 4.1, Map is a sub-view/toggle within Location, not a separate top-level Insights tab - add local state (e.g. `locationSubView: 'calendar' | 'map'`) and a small toggle control rendered only when the Location tab is active
    - Render `LocationCalendarView` or `LocationMapView` based on that sub-state, passing `activeProfile.id`
    - _Requirements: 4.1_

  - [ ] 14.3 Support deep-linking into the Location view from outside Insights
    - Read an optional `view` query param (via `useLocalSearchParams`) on mount/focus and, if present and valid (`'location'`), set `activeTab` accordingly - this is what the Today tab indicator's tap action (task 16.3) navigates through
    - _Requirements: 7.8_

- [ ] 15. Checkpoint - verify Location Insights wiring
  - Run `./node_modules/.bin/tsc --noEmit`.
  - On-device: confirm the Location pill appears in Insights, the Calendar/Map sub-toggle works, and navigating to `/(tabs)/insights?view=location` directly opens Insights with Location active.
  - Ask the user if questions arise before proceeding.

- [ ] 16. Build the Today tab location indicator
  - [ ] 16.1 Add `getPlaceTypeIcon(placeType: PlaceType): string` and `getDailyLocationForDay(childProfileId, dateKey): Promise<DailyLocations | undefined>` to `mobile/services/location-service.ts`
    - `getPlaceTypeIcon` is the single shared icon mapping (🏠/✈️/👵/🏕️/📍) used by `LocationCalendarView`, `LocationMapView`, and the Today indicator - implement once here, have all three call it rather than each defining its own copy
    - `getDailyLocationForDay` is a thin wrapper around `getDailyLocations` for a single-day range, returning that day's entry (or `undefined`)
    - _Requirements: 7.4_

  - [ ] 16.2 Create `mobile/components/TodayLocationIndicator.tsx`
    - Props: `childProfileId: string`, `dateKey: string` (the Today tab's currently selected date, in 'YYYY-MM-DD' form)
    - On mount/prop change: check `getSavedPlacesByProfile(childProfileId)` - render `null` immediately if empty (Requirement 7.2), otherwise call `getDailyLocationForDay`
    - If the child's resolved entry has `savedPlace: null`, render `null` (Requirement 7.6)
    - Otherwise render the place name + `getPlaceTypeIcon` icon, with transition-day accent styling when `isTransitionDay` is true (Requirement 7.5), matching whatever visual treatment `LocationCalendarView` (task 10) ends up using for the same concept
    - Wrap in a `TouchableOpacity` navigating to `/(tabs)/insights?view=location` on tap (Requirement 7.8)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ] 16.3 Render `TodayLocationIndicator` in `app/(tabs)/index.tsx`
    - Place it below the date picker row and above the mood strip (per design.md's suggested slot), passing `childProfileId` and the currently selected date converted to a 'YYYY-MM-DD' key (reuse `toLocalDateString`/existing date-key helpers already used elsewhere in this file rather than a new ad-hoc conversion)
    - Must re-render when `selectedDate` changes (Requirement 7.7) - passing `dateKey` as a prop rather than letting the indicator read `selectedDate` from a shared context is what makes this automatic via normal prop-change re-rendering
    - _Requirements: 7.7_

- [ ] 17. Checkpoint - verify Today tab indicator
  - Run `./node_modules/.bin/tsc --noEmit`.
  - On-device: verify the three manual scenarios in design.md's Testing Strategy for this piece (no data → nothing shown; Home_Place day → shown; transition day → shown with accent styling; date navigation updates it; tap navigates to Insights Location view).
  - Ask the user if questions arise before proceeding.

- [ ] 18. Migrate Glossary into the Insights tab
  - [ ] 18.1 Create `mobile/components/GlossaryView.tsx` from `app/(tabs)/glossary.tsx`
    - Move the category state, `loadTerms`/seeding logic, category pill row, and term list/search body into this new component, taking no navigation-specific props (matching `WeatherView`/`HeatMapView`/etc.'s existing "view component" shape)
    - Preserve the existing category pills (including the "All" option) and term-detail navigation (`router.push`) exactly as they behave today
    - _Requirements: 8.2, 8.4_

  - [ ] 18.2 Add a 6th `TabType` value (`'glossary'`) to `app/(tabs)/insights.tsx`
    - Add a "📖 Glossary" tab button alongside Weather/Heat Map/Diary/Events/Location
    - Render `GlossaryView`'s nested category pill row only while `activeTab === 'glossary'`, using the same nested-pill-row visual convention introduced for Location's Calendar/Map toggle (task 14.2)
    - _Requirements: 8.1, 8.2_

  - [ ] 18.3 Remove the standalone Glossary tab
    - Delete `app/(tabs)/glossary.tsx`
    - Remove the `<Tabs.Screen name="glossary" .../>` entry from `app/(tabs)/_layout.tsx`
    - _Requirements: 8.3_

- [ ] 19. Checkpoint - verify Glossary migration
  - Run `./node_modules/.bin/tsc --noEmit`.
  - On-device: confirm the Glossary tab is gone from the bottom tab bar, the Glossary pill inside Insights reproduces identical behavior (seeding, category filters, search, term-detail navigation), and no broken references to the old `/(tabs)/glossary` route remain (`grep -r "tabs)/glossary"` across the mobile app).
  - Ask the user if questions arise before proceeding.

- [ ] 20. Final checkpoint
  - Run `./node_modules/.bin/tsc --noEmit` across the whole project one more time.
  - Walk through every manual scenario listed in design.md's Testing Strategy end-to-end on-device.
  - Confirm no unrelated files were modified (`git status --short`) before committing.
  - Ask the user if questions arise; do not commit without explicit confirmation, per this project's established git workflow.

## Notes

- No test framework is configured in this project - every task's verification is `tsc --noEmit` plus the manual on-device scenarios called out at each checkpoint, not an automated test suite. If a framework is introduced later, the Correctness Properties in design.md map directly onto test cases for `location-service.ts` and the two views.
- Tasks are ordered so that each layer (models → database → service → management UI → visualizations → tab wiring) is independently verifiable before the next layer depends on it.
- Follow this project's existing git conventions: commit only when explicitly asked, stage specific files rather than `git add -A`, and keep this feature's commits separate from unrelated concurrent work.
