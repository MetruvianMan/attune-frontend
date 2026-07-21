# Requirements Document

## Introduction

The Rewards tab is a new feature for the Attune mobile app that provides a lightweight positive reinforcement system for parents of neurodivergent children. The feature helps parents define incentivized behaviors, track point balances, manage redeemable rewards, and maintain a historical ledger of all point activity. The design aligns with Attune's existing visual language: light, friendly, emoji-forward, rounded, and calm. The system reduces daily parent "accounting" by making it easy to log earned points, subtract demerits, redeem rewards, and review point history over time. The Rewards tab starts with the currently selected child and supports child-specific point balances. The feature emphasizes encouragement over punishment, maintains Attune's supportive tone, and provides enough structure to prevent parental disagreement while remaining easy enough to use several times per day.

## Glossary

- **Rewards_System**: The complete subsystem encompassing behaviors, rewards catalog, point tracking, and ledger functionality.
- **Point_Balance**: The current total points accumulated by a Child_Profile, calculated as earned points minus spent points and demerits.
- **Behavior**: A defined action or achievement that earns or subtracts points, containing a title, emoji, point value, category, optional time window, optional limit rules, optional exit criteria, and optional notes.
- **Positive_Behavior**: A Behavior subtype that adds points to the Point_Balance when logged.
- **Demerit_Behavior**: A Behavior subtype that subtracts points from the Point_Balance when logged, visually distinct but not overly punitive.
- **Reward**: A redeemable item from the Rewards_Catalog containing a title, emoji, point cost, optional availability rules, and optional parent approval toggle.
- **Rewards_Catalog**: The collection of all defined Reward items available for redemption by a Child_Profile.
- **Point_Event**: A timestamped record of a point change, containing the related Behavior or Reward, point value (positive or negative), the Child_Profile, timestamp, and the logging Parent.
- **Redemption**: A Point_Event subtype created when a Parent redeems a Reward, deducting points from the Point_Balance.
- **Point_Ledger**: The complete chronological history of all Point_Events for a Child_Profile, supporting filtering by date range and event type.
- **Daily_Summary**: An aggregated view showing points earned, points spent, and net total for a specific date.
- **Time_Window**: An optional time constraint on a Behavior specifying the hours during which the behavior is eligible for points (e.g., "6pm to bedtime").
- **Limit_Rule**: An optional constraint on a Behavior specifying the maximum frequency for earning points (e.g., "once per day", "twice per week").
- **Exit_Criteria**: Optional descriptive text on a Behavior defining the specific conditions that constitute successful completion.
- **Availability_Rule**: An optional constraint on a Reward specifying when the reward can be redeemed (e.g., "weekends only", "after 7 days of positive balance").
- **Parent_Approval_Toggle**: An optional flag on a Reward indicating whether Parent confirmation is required before redemption.
- **Rewards_Tab**: The new bottom tab navigation item providing access to all Rewards_System functionality.
- **Behaviors_View**: The subview where Parents define and manage all Behavior records.
- **Catalog_View**: The subview where Parents define and manage all Reward records in the Rewards_Catalog.
- **Ledger_View**: The subview displaying the Point_Ledger with daily summaries and detailed transaction history.
- **Empty_State**: The initial screen displayed when no Behavior or Reward records exist, prompting setup.
- **Quick_Log**: The rapid logging interaction where selecting a Behavior immediately creates a Point_Event.
- **Undo_Action**: The ability to reverse a recently logged Point_Event within a short time window.

## Requirements

### Requirement 1: Rewards Tab Navigation

**User Story:** As a Parent, I want a new bottom tab called Rewards, so that I can access the point system quickly from the main navigation.

#### Acceptance Criteria

1. THE Attune_App SHALL add a Rewards_Tab to the bottom tab bar with an appropriate icon (🎁, ⭐, or 🏆)
2. WHEN the Parent taps the Rewards_Tab icon, THE Attune_App SHALL navigate to the main Rewards screen within 100ms
3. THE Attune_App SHALL maintain the Rewards_Tab scroll position when switching to other tabs and returning
4. THE Rewards_Tab SHALL display child-specific data filtered to the currently selected Child_Profile
5. WHEN the Parent switches the selected Child_Profile, THE Rewards_Tab SHALL update all displayed data to reflect the newly selected child within 200ms

### Requirement 2: Point Balance Display

**User Story:** As a Parent, I want to see my child's current point balance prominently, so that I know how many points they have available.

#### Acceptance Criteria

1. THE Rewards_Tab main screen SHALL display the current Point_Balance for the selected Child_Profile
2. THE Point_Balance SHALL be calculated as the sum of all Point_Event records for the Child_Profile
3. THE Point_Balance display SHALL update within 200ms after any Point_Event is created or deleted
4. THE Point_Balance display SHALL use positive styling (green or cheerful colors) when the balance is positive
5. THE Point_Balance display SHALL use neutral styling when the balance is zero
6. IF the Point_Balance is negative, THEN THE Rewards_Tab SHALL display the negative balance in muted orange or neutral styling without overly punitive visual treatment

### Requirement 3: Daily Point Summary

**User Story:** As a Parent, I want to see points earned and spent today, so that I can track daily progress at a glance.

#### Acceptance Criteria

1. THE Rewards_Tab main screen SHALL display a Daily_Summary showing points earned today, points spent today, and net total for the current day
2. THE Daily_Summary SHALL calculate points earned as the sum of all positive Point_Event records with timestamps on the current date
3. THE Daily_Summary SHALL calculate points spent as the sum of all negative Point_Event records (Demerit_Behavior and Redemption) with timestamps on the current date
4. THE Daily_Summary SHALL calculate net total as points earned minus points spent
5. THE Daily_Summary SHALL update within 200ms after any Point_Event is created or deleted

### Requirement 4: Quick Actions for Points

**User Story:** As a Parent, I want quick action buttons for "Earn Points" and "Redeem Reward", so that I can log points or redeem rewards without navigating through multiple screens.

#### Acceptance Criteria

1. THE Rewards_Tab main screen SHALL display an "Earn Points" button prominently
2. THE Rewards_Tab main screen SHALL display a "Redeem Reward" button prominently
3. WHEN the Parent taps "Earn Points", THE Attune_App SHALL navigate to the Behaviors_View or display a Quick_Log interface showing all Positive_Behavior records
4. WHEN the Parent taps "Redeem Reward", THE Attune_App SHALL navigate to the Catalog_View or display a redemption interface showing all available Reward records
5. THE "Earn Points" and "Redeem Reward" buttons SHALL use rounded styling consistent with Attune's design language

### Requirement 5: Recent Point Activity

**User Story:** As a Parent, I want to see the most recent point activity on the main Rewards screen, so that I can quickly verify recent transactions.

#### Acceptance Criteria

1. THE Rewards_Tab main screen SHALL display the 5 most recent Point_Event records for the selected Child_Profile
2. THE recent activity list SHALL display each Point_Event with its Behavior or Reward title, emoji, point value (with +/- prefix), and timestamp
3. THE recent activity list SHALL display Point_Event records in reverse chronological order (most recent first)
4. WHEN the Parent taps a Point_Event in the recent activity list, THE Attune_App SHALL navigate to the Point_Event detail view
5. THE recent activity list SHALL display a "View Full Ledger" link that navigates to the Ledger_View

### Requirement 6: Behavior Definition and Management

**User Story:** As a Parent, I want to define behaviors that earn or subtract points, so that I can customize the system for my child's specific needs.

#### Acceptance Criteria

1. THE Behaviors_View SHALL allow the Parent to create a new Behavior record
2. WHEN creating a Behavior, THE Parent SHALL specify a title, emoji, point value (positive or negative integer), and category
3. THE Behaviors_View SHALL allow the Parent to optionally specify a Time_Window, Limit_Rule, Exit_Criteria, and notes for each Behavior
4. THE Behaviors_View SHALL visually distinguish Demerit_Behavior records (negative point values) from Positive_Behavior records using muted styling without overly punitive visual treatment
5. THE Behaviors_View SHALL display all Behavior records grouped by category
6. THE Behaviors_View SHALL allow the Parent to edit any field of an existing Behavior record
7. THE Behaviors_View SHALL allow the Parent to delete a Behavior record, removing it from the Behaviors_View but preserving all historical Point_Event records associated with the Behavior
8. THE Behaviors_View SHALL require title, emoji, and point value fields to save a Behavior; all other fields SHALL be optional

### Requirement 7: Behavior Limit Rules

**User Story:** As a Parent, I want to set frequency limits on behaviors, so that my child can only earn specific points once per day or a limited number of times.

#### Acceptance Criteria

1. THE Behaviors_View SHALL allow the Parent to specify a Limit_Rule for each Behavior (e.g., "once per day", "twice per week", "unlimited")
2. WHEN a Behavior has a Limit_Rule, THE Attune_App SHALL track how many times the Behavior has been logged within the current limit period
3. WHEN the Parent attempts to log a Behavior that has reached its Limit_Rule, THE Attune_App SHALL display a message indicating the limit has been reached and prevent creating the Point_Event
4. THE Attune_App SHALL reset daily limits at midnight local time
5. THE Attune_App SHALL reset weekly limits at midnight Sunday local time
6. IF no Limit_Rule is specified, THEN THE Attune_App SHALL allow unlimited logging of the Behavior

### Requirement 8: Behavior Time Windows

**User Story:** As a Parent, I want to set time windows for behaviors, so that certain behaviors only earn points during specific hours of the day.

#### Acceptance Criteria

1. THE Behaviors_View SHALL allow the Parent to specify a Time_Window for each Behavior using start and end times
2. WHEN a Behavior has a Time_Window, THE Attune_App SHALL only allow logging the Behavior when the current time falls within the specified Time_Window
3. WHEN the Parent attempts to log a Behavior outside its Time_Window, THE Attune_App SHALL display a message indicating the behavior is not available outside the specified time range and prevent creating the Point_Event
4. IF no Time_Window is specified, THEN THE Attune_App SHALL allow logging the Behavior at any time

### Requirement 9: Behavior Exit Criteria

**User Story:** As a Parent, I want to define clear success criteria for behaviors, so that my child and I have shared understanding of what earns points.

#### Acceptance Criteria

1. THE Behaviors_View SHALL allow the Parent to specify Exit_Criteria text for each Behavior
2. WHEN the Parent views or logs a Behavior with Exit_Criteria, THE Attune_App SHALL display the Exit_Criteria text
3. THE Exit_Criteria field SHALL support up to 500 characters of plain text
4. THE Exit_Criteria field SHALL be optional; behaviors without Exit_Criteria are valid

### Requirement 10: Fast Behavior Logging

**User Story:** As a Parent, I want selecting a behavior to immediately create a point event, so that I can log points in under 2 seconds.

#### Acceptance Criteria

1. WHEN the Parent selects a Positive_Behavior from the Quick_Log interface, THE Attune_App SHALL create a Point_Event with the Behavior's point value and the current timestamp
2. THE Point_Event creation SHALL complete within 500ms
3. THE Attune_App SHALL display a brief confirmation message or animation when the Point_Event is created
4. THE Attune_App SHALL provide an Undo_Action button for 5 seconds after the Point_Event is created
5. WHEN the Parent taps the Undo_Action button, THE Attune_App SHALL delete the Point_Event and restore the previous Point_Balance

### Requirement 11: Demerit Behavior Logging

**User Story:** As a Parent, I want to log demerit behaviors that subtract points, so that I can discourage unwanted behaviors without harsh punishment.

#### Acceptance Criteria

1. WHEN the Parent selects a Demerit_Behavior, THE Attune_App SHALL create a Point_Event with the negative point value and the current timestamp
2. THE Attune_App SHALL display demerit Point_Event records with muted visual styling (not overly punitive)
3. THE Attune_App SHALL allow the Parent to undo a demerit Point_Event within 5 seconds using the Undo_Action
4. THE Attune_App SHALL subtract the absolute value of the Demerit_Behavior point value from the Point_Balance

### Requirement 12: Rewards Catalog Definition

**User Story:** As a Parent, I want to define redeemable rewards with point costs, so that my child has clear goals to work toward.

#### Acceptance Criteria

1. THE Catalog_View SHALL allow the Parent to create a new Reward record
2. WHEN creating a Reward, THE Parent SHALL specify a title, emoji, and point cost (positive integer)
3. THE Catalog_View SHALL allow the Parent to optionally specify Availability_Rule and Parent_Approval_Toggle for each Reward
4. THE Catalog_View SHALL display all Reward records sorted by point cost (lowest to highest)
5. THE Catalog_View SHALL allow the Parent to edit any field of an existing Reward record
6. THE Catalog_View SHALL allow the Parent to delete a Reward record, removing it from the Catalog_View but preserving all historical Redemption records associated with the Reward
7. THE Catalog_View SHALL require title, emoji, and point cost fields to save a Reward; all other fields SHALL be optional

### Requirement 13: Reward Availability Rules

**User Story:** As a Parent, I want to set availability rules on rewards, so that certain rewards are only available at specific times or under specific conditions.

#### Acceptance Criteria

1. THE Catalog_View SHALL allow the Parent to specify an Availability_Rule for each Reward (e.g., "weekends only", "after 7 consecutive positive days", "always available")
2. WHEN a Reward has an Availability_Rule, THE Attune_App SHALL evaluate whether the rule conditions are currently met
3. WHEN the Parent attempts to redeem a Reward with an unmet Availability_Rule, THE Attune_App SHALL display a message indicating why the reward is not currently available and prevent creating the Redemption
4. THE Attune_App SHALL display unavailable Reward records with muted styling in the Catalog_View
5. IF no Availability_Rule is specified, THEN THE Reward SHALL be available for redemption at any time

### Requirement 14: Parent Approval for Redemptions

**User Story:** As a Parent, I want certain rewards to require my approval before redemption, so that my child must ask permission for high-value or special rewards.

#### Acceptance Criteria

1. THE Catalog_View SHALL allow the Parent to enable a Parent_Approval_Toggle for each Reward
2. WHEN the Parent_Approval_Toggle is enabled for a Reward, THE Attune_App SHALL require explicit Parent confirmation before creating the Redemption
3. WHEN the child attempts to redeem a Reward with Parent_Approval_Toggle enabled, THE Attune_App SHALL display a confirmation dialog prompting the Parent to approve or deny the redemption
4. WHEN the Parent approves the redemption, THE Attune_App SHALL create the Redemption and deduct the point cost from the Point_Balance
5. WHEN the Parent denies the redemption, THE Attune_App SHALL cancel the redemption and preserve the current Point_Balance
6. IF the Parent_Approval_Toggle is not enabled, THEN THE Attune_App SHALL create the Redemption immediately when selected

### Requirement 15: Reward Redemption

**User Story:** As a Parent, I want to redeem rewards for my child, so that they can spend accumulated points on items they want.

#### Acceptance Criteria

1. WHEN the Parent selects a Reward from the Catalog_View, THE Attune_App SHALL check whether the current Point_Balance is greater than or equal to the Reward point cost
2. IF the Point_Balance is sufficient, THEN THE Attune_App SHALL create a Redemption with the Reward and the negative point cost
3. IF the Point_Balance is insufficient, THEN THE Attune_App SHALL display a message indicating insufficient points and prevent creating the Redemption
4. THE Redemption SHALL deduct the point cost from the Point_Balance
5. THE Attune_App SHALL display a confirmation message or animation when the Redemption is created
6. THE Attune_App SHALL provide an Undo_Action button for 5 seconds after the Redemption is created

### Requirement 16: Point Event Editing and Deletion

**User Story:** As a Parent, I want to edit or delete point events if I log incorrectly, so that I can maintain accurate records.

#### Acceptance Criteria

1. WHEN the Parent views a Point_Event detail, THE Attune_App SHALL display an edit button and a delete button
2. WHEN the Parent taps the edit button, THE Attune_App SHALL allow editing the timestamp and notes fields
3. WHEN the Parent saves edits to a Point_Event, THE Attune_App SHALL update the Point_Event record and recalculate the Point_Balance
4. WHEN the Parent taps the delete button, THE Attune_App SHALL display a confirmation dialog
5. WHEN the Parent confirms deletion, THE Attune_App SHALL delete the Point_Event record and recalculate the Point_Balance
6. THE Attune_App SHALL NOT allow editing the Behavior, Reward, or point value fields of an existing Point_Event to maintain ledger integrity

### Requirement 17: Point Ledger and Calendar View

**User Story:** As a Parent, I want to see a calendar view showing points earned and spent each day, so that I can review patterns over time.

#### Acceptance Criteria

1. THE Ledger_View SHALL display a calendar interface showing all days with Point_Event records
2. FOR each day with Point_Event records, THE Ledger_View SHALL display a Daily_Summary showing points earned, points spent, and net total
3. THE Ledger_View SHALL allow the Parent to navigate between months using previous and next buttons
4. WHEN the Parent taps a day in the calendar, THE Attune_App SHALL display the detailed ledger for that day showing all Point_Event records
5. THE detailed ledger SHALL display each Point_Event with its Behavior or Reward title, emoji, point value, and timestamp
6. THE Ledger_View SHALL display days with net positive points in green styling
7. THE Ledger_View SHALL display days with net negative points in muted orange or neutral styling
8. THE Ledger_View SHALL display days with zero net points in neutral styling

### Requirement 18: Redemption History

**User Story:** As a Parent, I want to see all past redemptions, so that I can track what rewards have been used.

#### Acceptance Criteria

1. THE Ledger_View SHALL provide a filter option to show only Redemption records
2. WHEN the Redemption filter is applied, THE Ledger_View SHALL display all Redemption records in reverse chronological order
3. THE Redemption history SHALL display each Redemption with the Reward title, emoji, point cost, and timestamp
4. THE Redemption history SHALL display the Parent who approved the Redemption (if applicable)
5. THE Ledger_View SHALL allow the Parent to switch between "All Activity", "Points Earned", and "Points Spent" filter views

### Requirement 19: Empty State Guidance

**User Story:** As a Parent, I want clear guidance when I first open the Rewards tab, so that I know how to set up the system.

#### Acceptance Criteria

1. WHEN the Parent first accesses the Rewards_Tab and no Behavior or Reward records exist, THE Attune_App SHALL display an Empty_State screen
2. THE Empty_State SHALL display welcoming text explaining the Rewards system purpose
3. THE Empty_State SHALL provide prominent buttons to "Add First Behavior" and "Add First Reward"
4. WHEN the Parent taps "Add First Behavior", THE Attune_App SHALL navigate to the Behavior creation screen
5. WHEN the Parent taps "Add First Reward", THE Attune_App SHALL navigate to the Reward creation screen
6. THE Empty_State SHALL use Attune's supportive, nonjudgmental tone and emoji-forward design

### Requirement 20: Multi-Child Point Balance Isolation

**User Story:** As a Parent, I want separate point balances for each child, so that siblings don't share points or interfere with each other's rewards.

#### Acceptance Criteria

1. THE Rewards_System SHALL maintain separate Point_Balance calculations for each Child_Profile
2. THE Rewards_System SHALL associate each Behavior record with a specific Child_Profile
3. THE Rewards_System SHALL associate each Reward record with a specific Child_Profile
4. THE Rewards_System SHALL associate each Point_Event record with a specific Child_Profile
5. WHEN the Parent switches the selected Child_Profile, THE Rewards_Tab SHALL display only Behavior, Reward, Point_Event, and Point_Balance data for the selected child
6. THE Attune_App SHALL NOT allow creating Point_Event records using Behavior or Reward records from a different Child_Profile

### Requirement 21: Rewards Data Serialization

**User Story:** As a developer, I want all Rewards system data to be reliably serialized and deserialized, so that data persists correctly across sessions.

#### Acceptance Criteria

1. THE Attune_App SHALL serialize each Behavior record (including title, emoji, point value, category, Time_Window, Limit_Rule, Exit_Criteria, notes, and Child_Profile reference) to a JSON representation for local storage
2. THE Attune_App SHALL serialize each Reward record (including title, emoji, point cost, Availability_Rule, Parent_Approval_Toggle, and Child_Profile reference) to a JSON representation for local storage
3. THE Attune_App SHALL serialize each Point_Event record (including related Behavior or Reward reference, point value, Child_Profile reference, timestamp, and logging Parent) to a JSON representation for local storage
4. FOR ALL valid Behavior objects, serializing to JSON then deserializing back SHALL produce an equivalent Behavior object (round-trip property)
5. FOR ALL valid Reward objects, serializing to JSON then deserializing back SHALL produce an equivalent Reward object (round-trip property)
6. FOR ALL valid Point_Event objects, serializing to JSON then deserializing back SHALL produce an equivalent Point_Event object (round-trip property)
7. IF the Attune_App encounters a malformed Behavior, Reward, or Point_Event JSON during deserialization, THEN THE Attune_App SHALL skip the malformed record, log a warning, and continue loading remaining records

### Requirement 22: Rewards Sync Support

**User Story:** As a Parent, I want my rewards data to sync between devices, so that both parents see the same point balances and can log points from either phone.

#### Acceptance Criteria

1. THE Sync_Service SHALL upload all Behavior, Reward, and Point_Event records in the Sync_Queue to the Backend_API
2. THE Sync_Service SHALL download all Behavior, Reward, and Point_Event records from the Backend_API during sync
3. WHEN the Sync_Service downloads Rewards_System changes, THE Sync_Service SHALL update the Local_Store and recalculate the Point_Balance
4. THE Sync_Service SHALL resolve conflicts in Rewards_System records using last-write-wins strategy
5. THE Attune_App SHALL display accurate Point_Balance after sync completes

### Requirement 23: Behavior and Reward Categories

**User Story:** As a Parent, I want to organize behaviors by category, so that I can group related behaviors together.

#### Acceptance Criteria

1. THE Behaviors_View SHALL allow the Parent to specify a category for each Behavior (e.g., "Self-care", "Kindness", "Responsibility", "School")
2. THE Behaviors_View SHALL display Behavior records grouped by category
3. THE Behaviors_View SHALL allow the Parent to create custom category names
4. THE Behaviors_View SHALL provide default category suggestions based on common parenting use cases
5. THE category field SHALL be optional; behaviors without a category SHALL display in an "Uncategorized" group

### Requirement 24: Visual Design Alignment

**User Story:** As a Parent, I want the Rewards tab to look and feel like the rest of Attune, so that the experience is cohesive and familiar.

#### Acceptance Criteria

1. THE Rewards_Tab SHALL use rounded cards consistent with Attune's existing Today tab design
2. THE Rewards_Tab SHALL use soft shadows and spacious layouts consistent with Attune's design language
3. THE Rewards_Tab SHALL display emoji badges prominently for all Behavior and Reward records
4. THE Rewards_Tab SHALL use green or cheerful positive styling for earned points and Point_Balance displays
5. THE Rewards_Tab SHALL use blue or neutral styling for Reward displays
6. THE Rewards_Tab SHALL use muted orange or neutral styling sparingly for Demerit_Behavior displays, avoiding harsh or punitive visual treatment
7. THE Rewards_Tab SHALL use consistent typography, spacing, and interaction patterns with Attune's existing tabs

### Requirement 25: Supportive Tone and Language

**User Story:** As a Parent, I want the Rewards tab to feel encouraging and supportive, so that it aligns with Attune's caregiver-support mission.

#### Acceptance Criteria

1. THE Rewards_Tab SHALL use supportive, nonjudgmental language in all labels, prompts, and empty states
2. THE Rewards_Tab SHALL avoid language that emphasizes punishment, surveillance, or behaviorist framing
3. THE Rewards_Tab SHALL use language that emphasizes positive reinforcement and clarity (e.g., "Earned points" rather than "Good behavior points")
4. THE Rewards_Tab empty states and guidance SHALL use Attune's warm, parent-friendly tone
5. THE Attune_App SHALL use neutral language for Demerit_Behavior records (e.g., "Needs work" rather than "Bad behavior")
