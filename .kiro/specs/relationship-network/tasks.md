# Implementation Plan: Relationship Network

## Overview

This plan implements the Relationship Network feature for the Attune app, adding structured relationship management, an interactive radial network visualization, person resolution in the NLP pipeline, and integration with the Insight Engine and Conversation system. Tasks are ordered to build incrementally: model → data layer → service → UI → integrations → final wiring.

## Tasks

- [x] 1. Create RelationshipPerson model and DataStore extensions
  - [x] 1.1 Create the RelationshipPerson model at `src/models/relationship-person.ts`
    - Define `RelationshipCategory` type (`'Family' | 'Friends' | 'Childcare' | 'Professional'`)
    - Define `RelationshipPerson` interface with id, childProfileId, name, category, roleLabel, notes, photoBase64, createdAt, updatedAt
    - Define `RelationshipPersonInput` interface with childProfileId, name, category, optional roleLabel, notes, photoBase64
    - Export all types from `src/models/index.ts`
    - _Requirements: 1.1, 1.2, 1.3, 2.2, 2.5, 8.1_

  - [x] 1.2 Extend the DataStore interface with RelationshipPerson methods
    - Add `saveRelationshipPerson(person: RelationshipPerson): void` to `src/data-store/data-store.ts`
    - Add `getRelationshipPerson(id: string): RelationshipPerson | null`
    - Add `getRelationshipPersons(childProfileId: string): RelationshipPerson[]`
    - Add `deleteRelationshipPerson(id: string): void`
    - Add `serializeRelationshipPerson(person: RelationshipPerson): string`
    - Add `deserializeRelationshipPerson(json: string): RelationshipPerson`
    - _Requirements: 1.3, 1.5, 8.1, 8.2, 8.3, 8.4_

  - [x] 1.3 Implement RelationshipPerson CRUD in InMemoryDataStore
    - Add `private relationshipPersons = new Map<string, RelationshipPerson>()` field
    - Implement `saveRelationshipPerson` — stores person in the Map
    - Implement `getRelationshipPerson` — retrieves by ID or returns null
    - Implement `getRelationshipPersons` — filters by childProfileId
    - Implement `deleteRelationshipPerson` — removes from Map
    - Implement `serializeRelationshipPerson` — JSON.stringify with Date→ISO conversion
    - Implement `deserializeRelationshipPerson` — JSON.parse with validation and Date revival; throw descriptive error on malformed input
    - Extend `persistToLocalStorage()` to include `relationshipPersons` entries
    - Extend `loadFromLocalStorage()` to restore `relationshipPersons` Map (skip malformed records with console.warn)
    - Add cascade deletion of RelationshipPersons in `deleteChildProfile()`
    - _Requirements: 1.3, 1.5, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 1.4 Write property tests for RelationshipPerson CRUD and serialization
    - **Property 1: Create and retrieve round-trip**
    - **Property 2: Role label defaults to category name**
    - **Property 3: Update modifies fields correctly**
    - **Property 4: Delete removes record completely**
    - **Property 5: Photo storage round-trip and replacement**
    - **Property 9: Serialization round-trip**
    - **Property 10: Malformed JSON handled gracefully**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 2.2, 2.3, 8.1, 8.2, 8.3, 8.4, 8.5**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement PersonResolutionService
  - [x] 3.1 Create PersonResolutionService at `src/person-resolution/person-resolution-service.ts`
    - Define `ResolvedPerson` interface (personId, name, category, roleLabel, notes)
    - Define `PersonResolutionResult` interface (resolved: Map<string, ResolvedPerson>, unresolved: string[])
    - Define `PersonResolutionService` interface with `resolve(extractedNames: string[], childProfileId: string): PersonResolutionResult`
    - Implement `PersonResolutionServiceImpl` class that takes a DataStore dependency
    - Implement cascading match algorithm: normalize to lowercase/trimmed → exact name match → exact roleLabel match → partial substring match
    - First match wins (priority: name exact > roleLabel exact > partial)
    - Return unresolved names without error when no match found
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 3.2 Write property tests for PersonResolutionService
    - **Property 7: Person resolution matches correctly**
    - **Property 8: Unmatched names pass through without error**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [x] 4. Implement network layout algorithm
  - [x] 4.1 Create network layout module at `src/ui/network-layout.ts`
    - Define `NetworkNode` interface (id, name, roleLabel, category, photoBase64, x, y, radius)
    - Define `NetworkLayout` interface (centerNode, personNodes, width, height)
    - Implement `computeNetworkLayout(persons, containerWidth, containerHeight): NetworkLayout`
    - Place child at center (width/2, height/2) with radius 28px
    - Assign angular sectors: Family 315°–45°, Friends 45°–135°, Childcare 135°–225°, Professional 225°–315°
    - Distribute persons evenly within their category's angular sector
    - Fixed orbit radius of 100px from center
    - Node radius: Family = 24px, others = 18px
    - Empty sectors keep their angular space (no redistribution)
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.7_

  - [ ]* 4.2 Write property tests for network layout
    - **Property 11: Family nodes are larger than other categories**
    - **Property 12: Layout produces non-overlapping positions**
    - **Property 13: Same-category nodes grouped in same angular sector**
    - **Validates: Requirements 3.3, 3.5, 3.7**

  - [ ]* 4.3 Write unit tests for initials extraction
    - **Property 6: Initials extraction**
    - **Validates: Requirements 2.5**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Relationships view and tab navigation
  - [x] 6.1 Create the Relationships view at `src/ui/relationships-view.ts`
    - Define `RelationshipsViewDeps` interface (dataStore, activeChildProfileId, onDataChange)
    - Implement `renderRelationshipsView(container, deps)` following existing view patterns
    - Implement empty state: placeholder with "Add your first person" prompt when no persons exist
    - Implement network view: SVG radial graph using `computeNetworkLayout`, render nodes with photos/initials, names, role labels, category colors, connecting lines to center
    - Implement `getInitials(name)` helper: split on whitespace, take first char of each word, uppercase, limit to 2
    - Implement detail view: shown on node tap, displays full person info (photo, name, category, roleLabel, notes) with edit/delete actions
    - Implement add/edit form: name input, category picker (4 options), role label input, notes textarea, photo upload (accept JPEG/PNG), save/cancel buttons
    - Implement delete confirmation dialog before removing a person
    - Implement photo deletion (revert to initials placeholder)
    - Apply category colors: Family=#7FBF9F, Friends=#4A90E2, Childcare=#F2C94C, Professional=#9b8ec4
    - "Add Person" floating button visible in network view
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.3_

  - [x] 6.2 Add Relationships tab to index.html and wire in app-shell.ts
    - Add `<div class="tab-page" id="page-relationships">` to `index.html` between existing tab pages
    - Add Relationships tab button to the tab bar in `index.html` (icon: 🤝, label: "People")
    - Import `renderRelationshipsView` in `app-shell.ts`
    - Add rendering call in `renderAllViews()` for the relationships container
    - Pass dataStore, activeChildProfileId getter, and persistState as deps
    - _Requirements: 4.1, 4.2, 4.4_

  - [ ]* 6.3 Write unit tests for Relationships view
    - Test empty state rendering when no persons exist
    - Test tab navigation shows correct view
    - Test category color mapping returns distinct colors
    - Test node tap shows detail view
    - Test confirmation dialog shown before delete
    - Test photo format validation accepts JPEG/PNG only
    - Test photo deletion reverts to placeholder
    - _Requirements: 1.6, 2.1, 2.4, 3.8, 4.1, 4.2_

- [x] 7. Integrate PersonResolution with NLP Pipeline and event capture
  - [x] 7.1 Wire PersonResolutionService into the event capture flow
    - After `extractEventData` returns persons, call `PersonResolutionService.resolve()` with the extracted names and active childProfileId
    - Store resolved person IDs as `"id:<uuid>"` strings in `Event.persons`
    - Store unresolved names as raw strings (backward compatible)
    - Instantiate PersonResolutionServiceImpl in `app-shell.ts` and pass to event capture system
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 7.2 Enhance Insight Engine with relationship context
    - In `analyzeCorrelations`, check for `"id:"` prefix in event person references
    - Look up RelationshipPerson from DataStore for resolved IDs
    - Include `name (roleLabel)` in narrative generation prompts
    - Group person-related patterns by category for weighted analysis in `buildSupportingSignals`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.3 Enhance Conversation System with relationship context
    - In `answerQuery`, run PersonResolutionService on the query text before calling `interpretQuery`
    - Include resolved person context (category, role, notes) in the prompt to `generateConversationalResponse`
    - When query is about a specific person, filter events by that person's ID (`"id:<uuid>"`)
    - Use full Relationship_Network context for general relationship/social pattern queries
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 7.4 Write integration tests for NLP → PersonResolution → Event storage flow
    - Test that extracted names are resolved to person IDs in stored events
    - Test that unresolved names pass through as raw strings
    - Test InsightEngine uses resolved person context in narratives
    - Test ConversationSystem resolves names and enriches responses
    - Test profile switch refreshes relationship data
    - Test cascade deletion removes persons when profile deleted
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (fast-check, 100 iterations minimum)
- Unit tests validate specific examples and edge cases (vitest)
- The project uses TypeScript with vitest for testing and fast-check for property-based tests
- Test files go in `tests/unit/` directory
