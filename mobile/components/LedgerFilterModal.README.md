# LedgerFilterModal Component

## Overview
Modal component for filtering ledger entries with filter type selection and date range picker.

## Requirements Covered
- **18.1**: Support filtering by "All Activity", "Points Earned" (behaviors only), "Points Spent" (redemptions only)
- **18.2**: Support date range selection
- **18.5**: Apply and Reset buttons for filter management

## Props

```typescript
interface LedgerFilterModalProps {
  visible: boolean;                    // Modal visibility state
  onClose: () => void;                 // Called when user closes modal
  onApply: (filters: LedgerFilters) => void; // Called when Apply button pressed
  initialFilters?: LedgerFilters;     // Optional initial filter state
}

interface LedgerFilters {
  filterType: 'all' | 'earned' | 'spent';
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
}
```

## Features

### Filter Type Selection
- **All Activity**: Show all point events (default)
- **Points Earned**: Show behaviors only (positive point events)
- **Points Spent**: Show redemptions only (reward purchases)

Each filter type is displayed as a selectable card with:
- Emoji icon
- Label
- Description
- Checkmark indicator when selected

### Date Range Selection
- **Start Date**: Optional "from" date with calendar picker
- **End Date**: Optional "to" date with calendar picker
- Clear buttons (✕) to reset individual dates
- Dates can be left empty to show all time periods
- Platform-specific date picker UI (native for iOS/Android)

### Action Buttons
- **Reset**: Clears all filters back to defaults (All Activity, no date range)
- **Apply Filters**: Confirms selection and calls `onApply` callback

## Usage Example

```tsx
import { LedgerFilterModal, LedgerFilters } from './components/LedgerFilterModal';

function LedgerView() {
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<LedgerFilters>({
    filterType: 'all',
    dateRange: { start: null, end: null },
  });

  const handleApplyFilters = (filters: LedgerFilters) => {
    setCurrentFilters(filters);
    // Apply filters to ledger data...
  };

  return (
    <>
      <Button onPress={() => setFilterModalVisible(true)}>
        Filter ⚙️
      </Button>

      <LedgerFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={currentFilters}
      />
    </>
  );
}
```

## Design Details

### Visual Design
- Modal card with rounded corners and elevation shadow
- Header with title and close button
- Scrollable content area for filters
- Fixed footer with action buttons
- Follows Attune design system (colors, typography, spacing)

### Filter Type Cards
- Card-based selection with visual feedback
- Selected state: blue border, light blue background, checkmark
- Unselected state: subtle border, white background
- Touch feedback with opacity change

### Date Pickers
- Native date picker component (@react-native-community/datetimepicker)
- Formatted date display (e.g., "Jan 15, 2025")
- Placeholder text when no date selected ("Not set")
- Clear buttons appear only when date is set
- Date validation:
  - Start date max = End date (if set) or today
  - End date min = Start date (if set)
  - End date max = Today

### Responsive Behavior
- Modal overlay with semi-transparent backdrop
- Maximum width: 420px (centered on larger screens)
- Maximum height: 85% of screen (scrollable content)
- KeyboardAvoidingView for iOS keyboard management

## Platform Differences

### iOS
- Date picker displays as spinner (inline wheel picker)
- Date picker remains open when selecting (tap to confirm)
- Keyboard avoiding padding behavior

### Android
- Date picker displays as calendar dialog (native modal)
- Date picker closes automatically after selection
- Keyboard avoiding height behavior

## State Management
- Local state for filter values
- Initializes from `initialFilters` prop when modal opens
- Applies filters only when user presses "Apply Filters"
- "Reset" button immediately applies default filters

## Accessibility
- Clear button labels and descriptions
- Touch targets sized appropriately (minimum 32px)
- Semantic grouping of related controls
- Visual feedback for selected states

## Dependencies
- `react-native-paper`: Button component
- `@react-native-community/datetimepicker`: Native date picker
- `../constants/theme`: Attune design tokens

## Integration with LedgerView
This component is designed to work with `LedgerView.tsx` to filter point events:
1. User opens filter modal from LedgerView
2. User selects filter type and/or date range
3. User presses "Apply Filters"
4. LedgerView receives filters via `onApply` callback
5. LedgerView updates displayed events based on filters

The filter modal does not handle data fetching or filtering logic—it only provides the UI for filter selection and communicates the selected filters back to the parent component.
