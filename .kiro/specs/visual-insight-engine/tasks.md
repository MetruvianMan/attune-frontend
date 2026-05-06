# Implementation Plan: Visual Insight Engine

## Overview

Replace the Timeline tab with a new Insights tab containing five sub-views (Weather, Heat Map, Trends, Patterns, Events). Build a pure-function aggregation layer, then implement each visualization using imperative DOM/canvas rendering. Wire everything through the existing app-shell and tab navigation. All code is TypeScript; tests use vitest + fast-check.

## Tasks

- [x] 1. Create the insights aggregator module with pure data functions
  - [x] 1.1 Create `src/ui/insights-aggregator.ts` with `DayAggregate` and `RollingDataPoint` interfaces, `moodToScore` helper, and `buildDayAggregates` function
    - Implement `moodToScore`: green→3, amber→2, red→1
    - Implement `buildDayAggregates`: query DayMood records and events from dataStore for the date range, fill every calendar day (including gaps), return `DayAggregate[]`
    - _Requirements: 2.1, 3.1, 4.1_

  - [x] 1.2 Implement `computeRollingMoodAverage` in `insights-aggregator.ts`
    - Sliding window of size `windowSize` over `DayAggregate[]`
    - Skip null mood scores in the window; return null value if all scores in window are null
    - _Requirements: 4.1_

  - [x] 1.3 Implement `computeRollingEventCount` in `insights-aggregator.ts`
    - Sliding window summing a specific event type's count from `eventCountsByType`
    - _Requirements: 4.4_

  - [x] 1.4 Implement mood-run grouping helper `groupConsecutiveMoods` in `insights-aggregator.ts`
    - Groups consecutive `DayAggregate` entries with the same `effectiveMood` value
    - Adjacent groups must have different moods (or one is null)
    - _Requirements: 2.6_

  - [ ]* 1.5 Write property tests for insights-aggregator (Properties 7, 8, 9)
    - **Property 7: Consecutive same-mood grouping** — every element within a group has the same effective mood, adjacent groups differ
    - **Validates: Requirements 2.6**
    - **Property 8: Rolling mood average computation** — rolling average at index i equals arithmetic mean of non-null mood scores in window [i - windowSize + 1, i]; null if all null
    - **Validates: Requirements 4.1**
    - **Property 9: Rolling event count computation** — rolling count at index i equals sum of that event type's count in window [i - windowSize + 1, i]
    - **Validates: Requirements 4.4**

  - [ ]* 1.6 Write unit tests for insights-aggregator edge cases
    - Test `buildDayAggregates` with empty events, single day, gap days
    - Test rolling average with all-null mood window
    - Test rolling event count with zero occurrences
    - _Requirements: 2.1, 4.1, 4.4_

- [x] 2. Create test generators
  - [x] 2.1 Create `tests/generators/day-aggregate.gen.ts`
    - `arbMoodColor`: produces one of 'red' | 'amber' | 'green'
    - `arbDayAggregate`: produces random DayAggregate with optional null mood, random event counts by type, random severity
    - _Requirements: supports all property tests_

  - [x] 2.2 Verify existing `tests/generators/insight.gen.ts` covers longitudinal trend insights with correlations, patterns, confidence levels, and communication scripts; extend if needed
    - _Requirements: supports Properties 14, 15, 16_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement the Weather sub-view
  - [x] 4.1 Create `src/ui/insights/weather-view.ts` with `renderWeatherView` function
    - Render 60 day-cells in a horizontally scrollable container (40px wide each, flex-shrink: 0)
    - Map mood to weather icon: red→⛈️, amber→⛅, green→☀️, null→·
    - Apply background tint per mood color; group consecutive same-mood days with shared background region (border-radius on first/last of run)
    - Auto-scroll to rightmost (most recent) on initial render
    - Tap a cell to show tooltip with date, mood, and event count
    - Show neutral placeholder strip when no DayMood records exist
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 7.3_

  - [ ]* 4.2 Write property tests for weather-view (Properties 1, 2)
    - **Property 1: Mood-to-weather-icon mapping** — red→⛈️, amber→⛅, green→☀️, null→·
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
    - **Property 2: Weather strip renders exactly 60 day-cells** — for any set of DayMood records, the strip produces exactly 60 day-cell elements
    - **Validates: Requirements 2.1**

  - [ ]* 4.3 Write unit tests for weather-view edge cases
    - Test known 5-day sequence (3 green, 1 red, 1 amber)
    - Test all-null mood strip (60 neutral placeholders)
    - Test tooltip content includes date, mood, event count
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_

- [x] 5. Implement the Heat Map sub-view
  - [x] 5.1 Create `src/ui/insights/heatmap-view.ts` with `renderHeatmapView` function
    - Render CSS Grid with 7 rows (Sun–Sat) and week-columns for the displayed month
    - Color cells by mood: red→#EB5757, amber→#F2C94C, green→#7FBF9F, null→#E0E0E0
    - Scale opacity: `0.4 + 0.6 * (eventCount / maxEventCount)`, clamped [0.4, 1.0]
    - Month navigation arrows (prev/next)
    - Tap a cell to show popover with event types and counts
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 5.2 Write property tests for heatmap-view (Properties 3, 4, 5)
    - **Property 3: Mood-to-cell-color mapping** — red→#EB5757, amber→#F2C94C, green→#7FBF9F, null→#E0E0E0
    - **Validates: Requirements 3.2, 3.4**
    - **Property 4: Heat map opacity scaling** — opacity = 0.4 + 0.6 * (count / max), clamped [0.4, 1.0]
    - **Validates: Requirements 3.3**
    - **Property 5: Heat map grid dimensions match calendar** — 7 rows, week-columns = number of calendar weeks containing at least one day of that month
    - **Validates: Requirements 3.1**

  - [ ]* 5.3 Write unit tests for heatmap-view edge cases
    - Test February in a leap year grid dimensions
    - Test month with all-null moods (all gray cells)
    - Test popover content for a day with multiple event types
    - _Requirements: 3.1, 3.4, 3.6_

- [x] 6. Implement the Trends sub-view with Event Type Selector
  - [x] 6.1 Create `src/ui/insights/trends-view.ts` with `renderTrendsView` function
    - Render Event Type Selector as chip/pill buttons grouped by category (Behavioral, Well-being, Activity)
    - Persist selected types in `sessionStorage` under key `attune-insights-selected-types`
    - Enforce max 3 selected types; show inline "Max 3 overlays — deselect one first" message on 4th attempt
    - Show "7+ days of mood data needed for trends" when insufficient data
    - _Requirements: 4.2, 4.3, 4.5, 4.6, 4.10, 7.3_

  - [x] 6.2 Implement canvas sparkline rendering in `trends-view.ts`
    - Create `<canvas>` element (container width × 180px)
    - Draw Y-axis labels: left axis (Stormy/Mixed/Calm), right axis (0–max count)
    - Plot mood rolling-average line with color-coded segments (red < 1.5, amber 1.5–2.5, green > 2.5)
    - Plot overlay lines for selected event types in distinct colors
    - Register tap handler for nearest-point lookup; show tooltip with date and values
    - Fall back to text-based summary if `getContext('2d')` returns null
    - _Requirements: 4.1, 4.4, 4.7, 4.8, 4.9_

  - [ ]* 6.3 Write property tests for trends-view (Properties 10, 11, 12, 13)
    - **Property 10: Event type selection invariant** — selected count never exceeds 3; toggle selected deselects; toggle unselected when <3 adds; toggle unselected when =3 leaves unchanged
    - **Validates: Requirements 4.2, 4.5**
    - **Property 11: Event type selection round-trip via sessionStorage** — serialize 0–3 EventType strings, deserialize produces identical array
    - **Validates: Requirements 4.10**
    - **Property 12: Mood average value to sparkline color segment** — value < 1.5 → red, 1.5–2.5 → amber, > 2.5 → green
    - **Validates: Requirements 4.8**
    - **Property 13: Nearest data point lookup** — for non-empty RollingDataPoint array and tap x within bounds, returns point with closest x-position
    - **Validates: Requirements 4.9**

  - [ ]* 6.4 Write unit tests for trends-view edge cases
    - Test fewer than 7 days shows insufficient data message
    - Test canvas fallback when getContext returns null
    - Test sessionStorage persistence across simulated tab switches
    - _Requirements: 4.6, 4.10_

- [x] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement the Patterns sub-view
  - [x] 8.1 Create `src/ui/insights/patterns-view.ts` with `renderPatternsView` function
    - Query longitudinal-trend-detector results (via `dataStore.getInsights`)
    - Render day-of-week patterns as labeled badges (day name + dominant event type)
    - Render time-of-month patterns as split-bar visualization (first-half vs second-half proportional widths)
    - Display confidence level and data span for each pattern
    - Render communication scripts in collapsible sections for sensitive topics
    - Show encouraging message when fewer than 30 days of data
    - Catch detector errors and show graceful fallback message
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.3, 7.4_

  - [ ]* 8.2 Write property tests for patterns-view (Properties 14, 15, 16)
    - **Property 14: Pattern card contains label, confidence, and data span** — for any Insight with correlations, output contains pattern description, confidence level, and formatted date span
    - **Validates: Requirements 5.1, 5.4**
    - **Property 15: Time-of-month split-bar ratio** — for first-half count f and second-half count s where f+s>0, bar widths proportional to f/(f+s) and s/(f+s)
    - **Validates: Requirements 5.2**
    - **Property 16: Sensitive topic communication scripts rendered** — for any Insight with communicationScripts, output includes each script's topic and text
    - **Validates: Requirements 5.5**

  - [ ]* 8.3 Write unit tests for patterns-view edge cases
    - Test error handling when detector throws
    - Test empty patterns (< 30 days) shows encouraging message
    - Test collapsible script section toggles
    - _Requirements: 5.3, 5.5, 7.3, 7.4_

- [x] 9. Create the top-level Insights view with sub-tab navigation
  - [x] 9.1 Create `src/ui/insights-view.ts` with `renderInsightsView` function and `InsightsViewDeps` interface
    - Render horizontal pill strip with sub-tabs: Weather, Heat Map, Trends, Patterns, Events
    - Default to Weather sub-tab on first load
    - Show/hide sub-view containers on pill click; lazy-render each sub-view on first activation
    - Delegate to `renderWeatherView`, `renderHeatmapView`, `renderTrendsView`, `renderPatternsView`, and existing `renderTimelineView` for Events
    - Show "No profile selected" placeholder when no active child profile
    - Show onboarding message when profile has zero events
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 7.1, 7.2_

  - [ ]* 9.2 Write property test for sub-tab navigation (Property 17)
    - **Property 17: Sub-tab selection shows exactly one view** — for any sub-tab name from {Weather, Heat Map, Trends, Patterns, Events}, exactly one container is visible and four are hidden
    - **Validates: Requirements 1.2**

  - [ ]* 9.3 Write unit tests for insights-view (Property 6 and integration)
    - **Property 6: Day detail display contains date, mood, and event counts** — for any DayAggregate with non-null mood and events, tooltip content contains formatted date, mood color, and event count
    - **Validates: Requirements 2.7, 3.6**
    - Test default sub-tab is Weather on first load
    - Test no-profile placeholder renders correctly
    - _Requirements: 1.2, 1.3, 7.1_

- [x] 10. Wire Insights tab into app-shell and index.html
  - [x] 10.1 Update `index.html`: replace `page-timeline` div with `page-insights`, update tab button icon to chart icon (📊) and label to "Insights"
    - _Requirements: 1.4_

  - [x] 10.2 Update `src/ui/app-shell.ts`: import `renderInsightsView` instead of `renderTimelineView`, wire to `#page-insights` container with correct deps
    - Pass `dataStore`, `eventCaptureSystem`, `contextEngine`, `activeChildProfileId` as `InsightsViewDeps`
    - _Requirements: 1.4, 6.4_

- [x] 11. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–17)
- Unit tests validate specific examples and edge cases
- All visualizations use imperative DOM manipulation and CSS custom properties — no external charting libraries (Requirement 6)
