# BehaviorFormModal Component

A comprehensive form modal for creating and editing behavior records in the Rewards Tab.

## Features

### Required Fields
- **Title**: Text input for behavior name (e.g., "Cleaned room", "Homework done")
- **Emoji**: Visual identifier with integrated emoji picker
- **Point Value**: Numeric input (positive for rewards, negative for demerits)
- **Category**: Dropdown with suggestions + custom option

### Optional Fields
- **Time Window**: Restrict when behavior can be logged (start/end time in HH:MM format)
- **Limit Rule**: Frequency constraints (unlimited, daily, weekly + max count)
- **Exit Criteria**: Clear success criteria text (up to 500 characters)
- **Notes**: Additional details

## Props

```typescript
interface BehaviorFormModalProps {
  visible: boolean;              // Controls modal visibility
  onClose: () => void;           // Called when modal should close
  behavior?: Behavior | null;    // Pass existing behavior for edit mode, null/undefined for create
  childProfileId: string;        // Required child profile ID
}
```

## Usage

### Create Mode
```tsx
import { BehaviorFormModal } from './BehaviorFormModal';
import { useRewards } from '../contexts/RewardsContext';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);
  const { selectedChildProfileId } = useRewards();

  return (
    <>
      <Button onPress={() => setShowModal(true)}>Add Behavior</Button>
      
      <BehaviorFormModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        behavior={null}
        childProfileId={selectedChildProfileId}
      />
    </>
  );
}
```

### Edit Mode
```tsx
function MyComponent() {
  const [showModal, setShowModal] = useState(false);
  const [selectedBehavior, setSelectedBehavior] = useState(null);
  const { selectedChildProfileId } = useRewards();

  const handleEdit = (behavior) => {
    setSelectedBehavior(behavior);
    setShowModal(true);
  };

  return (
    <>
      {behaviors.map(behavior => (
        <TouchableOpacity key={behavior.id} onPress={() => handleEdit(behavior)}>
          <Text>{behavior.title}</Text>
        </TouchableOpacity>
      ))}
      
      <BehaviorFormModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        behavior={selectedBehavior}
        childProfileId={selectedChildProfileId}
      />
    </>
  );
}
```

## Validation

The form validates the following:

- **Title**: Required, non-empty string
- **Emoji**: Required, non-empty string
- **Point Value**: Required, valid number (can be negative)
- **Category**: Required (from dropdown or custom input)
- **Time Window**: HH:MM format if provided
- **Limit Max Count**: Positive number if frequency is not "unlimited"
- **Exit Criteria**: Max 500 characters

Validation errors are displayed inline below each field.

## Integration with RewardsContext

The component automatically:
- Calls `createBehavior()` for new behaviors
- Calls `updateBehavior()` for existing behaviors
- Displays loading state during save
- Shows error messages from context if save fails

## Visual Design

- Follows Attune's rounded, friendly design language
- Uses soft colors and spacious layouts
- Emoji picker with categorized grid
- Toggle switches for optional features
- Clear section headers and labels

## Category Suggestions

Default categories provided:
- Self-Care
- Kindness
- Responsibility
- School
- Chores
- Social
- Health
- Needs Work (for demerits)
- Custom... (allows free text entry)

## Emoji Picker

Simplified emoji picker with three categories:
- **Common**: Stars, hearts, achievements
- **Activities**: Daily tasks, hobbies, food
- **Demerits**: Warning symbols, negative indicators

## Requirements Covered

- 6.2: Create/edit behavior with required fields
- 6.3: Optional fields (time window, limit rule, exit criteria, notes)
- 6.6: Edit any field of existing behavior
- 6.8: Require title, emoji, and point value
- 7.1: Specify limit rule (unlimited, daily, weekly + max count)
- 8.1: Specify time window (start/end time in HH:MM format)
- 9.1: Specify exit criteria (up to 500 chars)
- 9.2: Optional exit criteria field
- 9.3: Support emoji picker integration
- 9.4: Display exit criteria when viewing behavior
- 23.1: Specify category for each behavior
- 23.3: Create custom category names

## Accessibility

- All inputs have proper labels
- Error messages announced by screen readers
- Touch targets meet minimum 44x44pt size
- Color contrast meets WCAG AA standards

## Performance

- Form state managed locally (no unnecessary context updates)
- Validation runs only on save attempt
- Emoji picker virtualized for smooth scrolling
