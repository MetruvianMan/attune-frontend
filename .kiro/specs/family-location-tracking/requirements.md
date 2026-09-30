# Requirements Document

## Introduction

The Family Location Tracking feature lets parents record where each family member (the child, and each tracked parent) is located on any given day — home, traveling, visiting family, at camp, etc. — as a Location_Period spanning one or more days. This turns location and physical separation from an unstructured, freeform event tag into structured, queryable data. Two visualizations surface this data on the Insights tab: a Location_Calendar showing daily location/co-location at a glance, and a simpler Location_Map showing each Saved_Place as a pin sized by how often it was visited. This structured data is intended as a foundation for the future Insight Engine to test whether physical transitions or separation from a parent correlate with the child's regulation patterns — but this spec covers only the data model, entry UI, and the two visualizations, not insight generation itself.

## Glossary

- **Household_Member**: A trackable person whose location is recorded — the active Child_Profile, and each tracked parent (e.g. "Mom", "Dad"). Fixed at three Household_Members for the initial version: the child, and two parent roles, not a user-configurable list.
- **Saved_Place**: A reusable, named location a Parent defines once and reuses across many Location_Periods (e.g. "Home - Seattle", "Grandma's House", "Camp Wildwood"), rather than typing a place name freehand each time. Each Saved_Place has a Place_Type.
- **Place_Type**: A category describing the nature of a Saved_Place. Valid values are: Home, Family Visit, Vacation, Camp/School Trip, Other.
- **Location_Period**: A record associating one Household_Member with one Saved_Place across a date range (a start date, and either an end date or "ongoing"). A Household_Member has at most one active Location_Period covering any given calendar day.
- **Home_Place**: The Saved_Place designated as a given Household_Member's default/base location. A Household_Member is considered to be at their Home_Place on any calendar day not covered by another Location_Period.
- **Location_Calendar**: A monthly calendar grid view (matching the visual pattern of the existing Weather and Heat Map views) where each day cell shows, for the child, which Saved_Place they were at and which Household_Members were co-located with them that day.
- **Location_Map**: A non-interactive (no pan/zoom/live tiles) visual view showing every Saved_Place that has at least one Location_Period, each rendered as a pin/marker sized or badged by how many days it was used, positioned according to a static representative coordinate rather than a live map tile provider.
- **Co-location**: The state of two or more Household_Members having an active Location_Period (or Home_Place default) at the same Saved_Place on the same calendar day.

## Requirements

### Requirement 1: Saved Place Management

**User Story:** As a Parent, I want to define a small reusable list of places, so that recording location is a quick selection rather than retyping a place name every time, and so that comparisons like "home days vs. away days" are reliable.

#### Acceptance Criteria

1. THE application SHALL allow the Parent to create a Saved_Place with a name and a Place_Type (Home, Family Visit, Vacation, Camp/School Trip, or Other) for the active Child_Profile.
2. THE application SHALL require the name and Place_Type fields when creating a Saved_Place.
3. THE application SHALL allow the Parent to edit the name and Place_Type of an existing Saved_Place.
4. THE application SHALL allow the Parent to designate exactly one Saved_Place per Household_Member as that Household_Member's Home_Place.
5. WHEN the Parent attempts to delete a Saved_Place that is referenced by one or more Location_Periods, THE application SHALL warn the Parent that existing Location_Periods reference this place before allowing deletion.
6. THE application SHALL allow the Parent to delete a Saved_Place that has no Location_Period references and is not designated as any Household_Member's Home_Place.
7. WHEN the Parent creates a Saved_Place, THE application SHALL optionally accept a city or region name used to derive a static representative coordinate for the Location_Map; IF no coordinate can be derived, THEN THE Location_Map SHALL still display the Saved_Place using a fallback unplaced-pin grouping rather than omitting it.

### Requirement 2: Location Period Entry

**User Story:** As a Parent, I want to record when the child or a parent is at a particular place for a range of days, so that the app has structured data about location and separation instead of unstructured event tags.

#### Acceptance Criteria

1. THE application SHALL allow the Parent to create a Location_Period by selecting a Household_Member, a Saved_Place, a start date, and either an end date or "ongoing."
2. WHEN the Parent creates a Location_Period with "ongoing" selected, THE application SHALL treat every calendar day from the start date through the present day as covered by that Location_Period until the Parent closes it out with an end date.
3. THE application SHALL allow the Parent to edit the Saved_Place, start date, and end date of an existing Location_Period.
4. THE application SHALL allow the Parent to close out an "ongoing" Location_Period by setting an end date.
5. THE application SHALL allow the Parent to delete a Location_Period.
6. THE application SHALL allow the Parent to create a Location_Period with a start date in the past, to support backfilling location history after the fact.
7. IF a new or edited Location_Period's date range overlaps an existing Location_Period for the same Household_Member, THEN THE application SHALL warn the Parent of the overlap before allowing the save to proceed.
8. WHEN a calendar day for a given Household_Member is not covered by any Location_Period, THE application SHALL treat that Household_Member as located at their Home_Place on that day.
9. IF a Household_Member has no designated Home_Place, THEN THE application SHALL treat any day not covered by a Location_Period as having an unknown location for that Household_Member, rather than defaulting to any specific Saved_Place.

### Requirement 3: Location Calendar View

**User Story:** As a Parent, I want to see a month calendar of where the child was and who was with them, so that I can quickly spot travel stretches and transition days and relate them to how the child's days went.

#### Acceptance Criteria

1. THE application SHALL add a "Location" view to the existing Insights tab view selector, alongside the existing Weather, Heat Map, Diary, and Events views.
2. THE Location_Calendar SHALL render as a monthly grid consistent with the existing Weather and Heat Map views' month navigation and layout.
3. FOR EACH calendar day, THE Location_Calendar SHALL display the child's Saved_Place for that day (via an active Location_Period or their Home_Place default).
4. FOR EACH calendar day, THE Location_Calendar SHALL visually indicate which Household_Members were Co-located with the child that day and which, if any, were separated.
5. WHEN the child's Saved_Place differs from their Home_Place on a given day, THE Location_Calendar SHALL visually distinguish that day (e.g. as a "transition" or "away" day) from ordinary Home_Place days.
6. WHEN the Parent taps a day in the Location_Calendar, THE application SHALL display that day's full location detail: the Saved_Place and Place_Type for each Household_Member.
7. WHEN no Location_Period data exists for the active Child_Profile, THE Location_Calendar SHALL display an empty state prompting the Parent to set up Saved_Places and a Home_Place.
8. THE Location_Calendar SHALL provide a "Manage Locations" action that navigates to Saved_Place and Location_Period management screens.

### Requirement 4: Location Map View

**User Story:** As a Parent, I want to see a simple map-like view of the places my child has been, so that I can see at a glance where he spends time relative to home, without needing an interactive live map.

#### Acceptance Criteria

1. THE application SHALL add a "Map" view to the Insights tab's Location view, presented as a sub-view or toggle alongside the Location_Calendar rather than a separate top-level Insights tab entry.
2. THE Location_Map SHALL render every Saved_Place that has at least one Location_Period as a pin or marker, without requiring pan, zoom, or a live map tile provider.
3. THE Location_Map SHALL size or badge each Saved_Place's pin according to the number of days it has been used across all Location_Periods for the active Child_Profile.
4. THE Location_Map SHALL visually distinguish a Household_Member's Home_Place pin from other Saved_Place pins.
5. WHEN the Parent taps a Saved_Place pin on the Location_Map, THE application SHALL display the list of days the child was at that place, consistent with the day-level detail available from the Location_Calendar.
6. WHEN a Saved_Place has no derivable coordinate (see Requirement 1.7), THE Location_Map SHALL display it in a distinct "other places" grouping rather than omitting it from the view.
7. WHEN no Location_Period data exists for the active Child_Profile, THE Location_Map SHALL display an empty state consistent with the Location_Calendar's empty state.

### Requirement 5: Data Model and Timezone-Safe Date Handling

**User Story:** As a developer, I want Location_Period data stored and queried using the app's existing timezone-safe local-date convention, so that day-level location data lines up correctly with Event data when both are eventually analyzed together.

#### Acceptance Criteria

1. THE application SHALL store each Location_Period's start date and end date (when present) as 'YYYY-MM-DD' local-date strings, consistent with the existing local_date convention used for Events (see mobile/utils/local-date.ts).
2. THE application SHALL persist Saved_Place, Location_Period, and Home_Place designation records to the same backend (Supabase in Supabase-mode builds, local SQLite in SQLite-mode builds) used for other child-profile-scoped data, following the existing dual-database-service pattern.
3. THE application SHALL scope all Saved_Place and Location_Period records to a Child_Profile, consistent with the existing per-profile data isolation used by Events, Behaviors, and Rewards.
4. FOR ALL valid Saved_Place and Location_Period records, serializing to JSON then deserializing back SHALL produce an equivalent object (round-trip property).

### Requirement 7: Today Tab Location Indicator

**User Story:** As a Parent, I want to see at a glance where the child is right on the Today tab, so that I don't need to switch to Insights just to recall today's location.

#### Acceptance Criteria

1. WHEN the active Child_Profile has at least one Saved_Place configured (a designated Home_Place, or at least one Location_Period), THE Today tab SHALL display a small location indicator showing the child's resolved Saved_Place name and a Place_Type icon for the currently selected logging date.
2. WHEN the active Child_Profile has no Saved_Place and no Location_Period data configured at all, THE Today tab SHALL NOT display any location indicator. This is a deliberate privacy/safety default: the indicator only ever appears for a Parent who has actively opted in by setting up at least one Saved_Place, never by default.
3. THE Today tab location indicator SHALL show the child's Home_Place on an ordinary day (e.g. "Home 🏠"), not only on away/transition days — the indicator is always visible once location data exists, showing whichever Saved_Place the day actually resolved to.
4. THE Today tab location indicator SHALL use the same Place_Type icon mapping as the Location_Calendar (🏠 Home, ✈️ Vacation, 👵 Family Visit, 🏕️ Camp/School Trip, 📍 Other).
5. WHEN the child's resolved Saved_Place for the selected date differs from their Home_Place (isTransitionDay), THE Today tab location indicator SHALL visually distinguish that day from an ordinary Home_Place day (e.g. accent styling), consistent with the Location_Calendar's transition-day treatment.
6. WHEN the child's location for the selected date resolves to null (no Home_Place designated and no covering Location_Period), THE Today tab SHALL NOT display a location indicator for that date, consistent with Requirement 2.9's "unknown, not a guess" handling.
7. THE Today tab location indicator SHALL reflect the currently selected logging date shown on the Today tab (which may differ from the real-world current date, per the Today tab's existing date-navigation behavior), not always "today."
8. WHEN the Parent taps the Today tab location indicator, THE application SHALL navigate to the Location view within the Insights tab.

### Requirement 8: Glossary Migration into Insights Tab

**User Story:** As a Parent, I want fewer top-level tabs to scan through, so that navigating the app feels less cluttered as more views (like Location) are added.

#### Acceptance Criteria

1. THE application SHALL add a "Glossary" view to the existing Insights tab view selector, alongside Weather, Heat Map, Diary, Events, and Location.
2. THE Glossary view within Insights SHALL preserve its existing category pill filters (General, Autism, ADHD, School & Services, Sensory, and an "All" option) as a nested pill row shown only while the Glossary view is the active Insights view, following the same nested-pill-row pattern used for the Location view's Calendar/Map sub-toggle.
3. THE application SHALL remove the standalone Glossary entry from the bottom tab bar once its functionality is available inside Insights.
4. THE Glossary view's existing functionality (seeding default terms on first load, searching/filtering by category, and navigating to a term's detail screen) SHALL be preserved unchanged after migration into Insights.

### Requirement 9: Non-Goals

The following are explicitly out of scope for this spec, to be addressed by a future Insight Engine spec if pursued:

1. Automated detection of correlations between Location_Period data and Event data (e.g. "transition days had more meltdowns").
2. Real, interactive map rendering (pan, zoom, live map tiles, precise geocoding accuracy).
3. Location tracking via device GPS/background location services — all Location_Period data is manually entered by the Parent.
4. Support for Household_Members beyond the child and two parent roles (e.g. siblings, extended family) in this initial version.
