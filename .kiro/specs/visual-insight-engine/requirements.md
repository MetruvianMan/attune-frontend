# Requirements Document

## Introduction

The Visual Insight Engine transforms the Attune app's Timeline tab into a dedicated "Insights" tab containing multiple visual representations of a child's mood, behavioral events, and longitudinal trends. Instead of a flat chronological event list, caregivers see intuitive, at-a-glance visualizations — mood weather strips, heat maps, trend sparklines, and pattern summaries — that surface the output of the existing longitudinal-trend-detector and DayMood data in a visually compelling way. The existing Timeline event list moves into a sub-tab within this new Insights tab.

## Glossary

- **Insights_Tab**: The new top-level tab replacing the current Timeline tab, containing sub-tabs for different visual representations and the event list
- **Mood_Weather_Strip**: A horizontal timeline bar (inspired by Wonder Weeks) that maps DayMood red/amber/green values to weather icons (stormy, cloudy, sunny) across a scrollable date range
- **Heat_Map**: A calendar-style grid where each cell represents one day, colored by mood (red/amber/green) with intensity scaled by event severity count
- **Trend_Sparkline**: A compact line chart showing rolling averages of event frequency or mood over configurable time windows (7-day, 14-day, 30-day)
- **Event_Type_Selector**: A chip/pill-based UI control within the Trends sub-tab that allows caregivers to toggle individual event types (e.g., wet_bed, watched_tv, didnt_eat_dinner) on/off as overlay lines on the sparkline chart
- **Pattern_Summary_Card**: A card that renders the output of the longitudinal-trend-detector (day-of-week patterns, time-of-month clusters) as visual badges and mini-charts
- **Sub_Tab_Navigation**: An in-tab navigation strip allowing the caregiver to switch between visualization views within the Insights tab
- **DayMood_Record**: The existing DayMood model containing autoMood and optional overrideMood for a given date, using MoodColor (red | amber | green)
- **Visualization_Engine**: The rendering module responsible for drawing all visual components using imperative DOM manipulation (no external charting library)

## Requirements

### Requirement 1: Insights Tab with Sub-Tab Navigation

**User Story:** As a caregiver, I want a dedicated Insights tab with sub-tabs for different visualizations, so that I can explore my child's patterns from multiple visual angles in one place.

#### Acceptance Criteria

1. WHEN the caregiver taps the Insights tab, THE Insights_Tab SHALL display a Sub_Tab_Navigation strip with options: "Weather", "Heat Map", "Trends", "Patterns", and "Events"
2. WHEN a sub-tab is selected, THE Insights_Tab SHALL render the corresponding visualization view and hide all other sub-tab views
3. THE Sub_Tab_Navigation SHALL default to the "Weather" sub-tab on first load
4. THE Insights_Tab SHALL replace the existing Timeline tab in the main tab bar, using a chart-style icon and the label "Insights"
5. WHEN the "Events" sub-tab is selected, THE Insights_Tab SHALL render the existing timeline event list with all current filtering and pagination functionality preserved

### Requirement 2: Mood Weather Strip Visualization

**User Story:** As a caregiver, I want to see my child's daily mood history rendered as a weather-icon timeline strip, so that I can instantly recognize stormy periods versus sunny stretches without reading individual entries.

#### Acceptance Criteria

1. THE Mood_Weather_Strip SHALL render one icon per day across a horizontally scrollable strip spanning the most recent 60 days
2. WHEN a DayMood_Record has an effective mood of "red", THE Mood_Weather_Strip SHALL display a storm-cloud icon (⛈️) for that day
3. WHEN a DayMood_Record has an effective mood of "amber", THE Mood_Weather_Strip SHALL display a partly-cloudy icon (⛅) for that day
4. WHEN a DayMood_Record has an effective mood of "green", THE Mood_Weather_Strip SHALL display a sun icon (☀️) for that day
5. WHEN no DayMood_Record exists for a day, THE Mood_Weather_Strip SHALL display a neutral placeholder icon (·) for that day
6. THE Mood_Weather_Strip SHALL group consecutive same-mood days into shaded regions with a background tint matching the mood color (red tint, amber tint, green tint)
7. WHEN the caregiver taps a day on the Mood_Weather_Strip, THE Visualization_Engine SHALL display a tooltip showing the date, mood color, and event count for that day
8. THE Mood_Weather_Strip SHALL auto-scroll to show the most recent days on the right edge upon initial render

### Requirement 3: Heat Map Calendar Visualization

**User Story:** As a caregiver, I want to see a calendar heat map colored by daily mood, so that I can spot weekly and monthly patterns at a glance.

#### Acceptance Criteria

1. THE Heat_Map SHALL render a grid of day-cells organized by week (columns) and day-of-week (rows) for the selected month
2. WHEN a DayMood_Record exists for a cell, THE Heat_Map SHALL fill that cell with the corresponding mood color (red: #EB5757, amber: #F2C94C, green: #7FBF9F)
3. WHEN a day has events with severity ratings, THE Heat_Map SHALL scale the cell opacity from 0.4 (low event count) to 1.0 (high event count) to indicate intensity
4. WHEN no DayMood_Record exists for a cell, THE Heat_Map SHALL render the cell with a neutral gray fill (#E0E0E0)
5. THE Heat_Map SHALL provide month navigation arrows allowing the caregiver to move forward and backward through months
6. WHEN the caregiver taps a day-cell, THE Heat_Map SHALL display a popover listing the event types and count for that day

### Requirement 4: Trend Sparkline Visualization with Event Type Selector

**User Story:** As a caregiver, I want to see rolling trend lines for mood and individually-selected event types, so that I can track specific behaviors (bed wetting, TV watching, dinner refusal, etc.) over time and compare them without visual clutter.

#### Acceptance Criteria

1. THE Trend_Sparkline SHALL render a primary line chart showing the 7-day rolling average of daily mood score (green=3, amber=2, red=1) over the past 30 days
2. THE Trend_Sparkline SHALL provide an Event_Type_Selector allowing the caregiver to toggle individual event types on/off as overlay lines on the chart
3. THE Event_Type_Selector SHALL present all available event types as tappable chips/pills, each with its emoji and label, organized by category (behavioral, well-being, activity)
4. WHEN an event type is selected, THE Trend_Sparkline SHALL render an additional line showing the 7-day rolling count of that specific event type, using a distinct color assigned to that type
5. THE Trend_Sparkline SHALL allow up to 3 event types to be overlaid simultaneously; WHEN a 4th is selected, THE Visualization_Engine SHALL display a message asking the caregiver to deselect one first
6. WHEN fewer than 7 days of data exist, THE Trend_Sparkline SHALL display a message indicating insufficient data instead of rendering an incomplete chart
7. THE Trend_Sparkline SHALL label the Y-axis with mood descriptors (Stormy, Mixed, Calm) for the mood line, and a secondary Y-axis with numeric counts for event type lines
8. THE Trend_Sparkline SHALL use color-coded line segments for the mood line: red for values below 1.5, amber for 1.5–2.5, green for above 2.5
9. WHEN the caregiver taps a point on any line, THE Visualization_Engine SHALL display the date and exact values for all visible lines at that data point
10. THE Event_Type_Selector SHALL persist the caregiver's selected event types across tab switches within the same session

### Requirement 5: Pattern Summary Cards

**User Story:** As a caregiver, I want the app's detected longitudinal patterns surfaced as visual summary cards, so that I can understand recurring triggers without reading raw analysis text.

#### Acceptance Criteria

1. THE Pattern_Summary_Card SHALL query the longitudinal-trend-detector results and render each detected day-of-week pattern as a labeled badge showing the day name and dominant event type
2. THE Pattern_Summary_Card SHALL render time-of-month patterns as a split-bar visualization showing first-half versus second-half event distribution
3. WHEN no longitudinal patterns have been detected (fewer than 30 days of data), THE Pattern_Summary_Card SHALL display an encouraging message explaining that patterns will appear after more data is collected
4. THE Pattern_Summary_Card SHALL display the confidence level (high/medium) and data span for each pattern
5. WHEN a pattern involves a sensitive topic (as defined by the longitudinal-trend-detector), THE Pattern_Summary_Card SHALL display the associated communication script in a collapsible section

### Requirement 6: Responsive Rendering Without External Libraries

**User Story:** As a developer, I want all visualizations rendered using imperative DOM manipulation consistent with the existing app architecture, so that no new framework dependencies are introduced.

#### Acceptance Criteria

1. THE Visualization_Engine SHALL render all charts, grids, and strips using native DOM elements (div, span, canvas) and inline CSS without importing any external charting library
2. THE Visualization_Engine SHALL use CSS custom properties defined in the existing :root scope for all colors and spacing
3. THE Visualization_Engine SHALL render within the phone-frame container constraints (375px width) without horizontal overflow on any sub-tab view
4. WHEN the active child profile changes, THE Visualization_Engine SHALL re-render all visible visualizations with the new profile's data

### Requirement 7: Empty and Loading States

**User Story:** As a caregiver, I want clear feedback when visualizations are loading or when there is insufficient data, so that I understand what I am seeing and what to expect.

#### Acceptance Criteria

1. WHEN no child profile is selected, THE Insights_Tab SHALL display a prompt to create or select a profile
2. WHEN a profile is selected but has zero events, THE Insights_Tab SHALL display an onboarding message explaining that visualizations will populate as events are logged
3. WHEN a visualization requires a minimum data threshold that is not met, THE Visualization_Engine SHALL display a specific message stating the threshold (e.g., "7+ days of mood data needed for trends")
4. IF the longitudinal-trend-detector encounters an error, THEN THE Pattern_Summary_Card SHALL display a graceful fallback message instead of crashing the view


## Future Backlog

### Causal Antecedent Analysis (Chat-Based)

**Vision:** Enable the app to answer caregiver questions like "What happened in the days before Tuesday's meltdown?" by analyzing events from prior days that may have contributed to an adverse outcome. This would integrate with the Chat tab, allowing caregivers to ask natural-language questions about patterns leading up to meltdowns, conflicts, or other negative events.

**Key capabilities (not in scope for this spec):**
- Retrospective event correlation: given an adverse event, look back 1–3 days for potential contributing factors (poor sleep, sugar, skipped medication, screen time spikes)
- Chat-based Q&A: "Why was Thursday so bad?" → the system surfaces preceding events and context entries that correlate with the adverse outcome
- Antecedent pattern learning: over time, identify recurring sequences (e.g., "poor sleep + sugar → meltdown next day") and surface them proactively in Pattern Summary Cards
- Proactive hypothesis cards in the Insights tab: when the system detects a likely antecedent pattern with sufficient confidence, it should surface a card (e.g., "We've noticed meltdowns tend to follow days with poor sleep + sugar — this happened 4 of the last 5 times") without the caregiver needing to ask. These would appear in the Patterns sub-tab alongside longitudinal trends, framed as gentle observations rather than definitive claims.
